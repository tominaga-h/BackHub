import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { getBacklogHost } from "@/lib/backlog-client";
import type { Project, Assignee, Issue, Status } from "@/types";

/** アバター画像がないメンバーに適用するTailwindカラーパレット（IDで循環割り当て） */
const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-green-100 text-green-700",
  "bg-purple-100 text-purple-700",
  "bg-orange-100 text-orange-700",
  "bg-pink-100 text-pink-700",
  "bg-teal-100 text-teal-700",
  "bg-indigo-100 text-indigo-700",
  "bg-red-100 text-red-700",
];

/**
 * DBのメンバー行をフロントエンド用の Assignee 型に変換する。
 * イニシャルは名前がスペース区切りの場合は姓名の頭文字、そうでなければ先頭2文字を使用する。
 * @param member - DBから取得したメンバー情報
 * @returns フロントエンド用の Assignee オブジェクト
 */
function toAssignee(member: {
  id: number;
  name: string;
  avatar_url: string | null;
}): Assignee {
  const name = member.name;
  // 空白で分割してイニシャルを生成（例: "山田 太郎" → "山太"）
  const parts = name.split(/\s+/);
  const initials =
    parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();
  // メンバーIDの剰余で色を決定的に割り当て（同一メンバーは常に同じ色になる）
  const avatarColor = AVATAR_COLORS[member.id % AVATAR_COLORS.length];
  return {
    id: member.id,
    name,
    initials,
    avatarColor,
    avatarUrl: member.avatar_url ?? undefined,
  };
}

type DbClient = ReturnType<typeof createServiceClient>;

/**
 * 1プロジェクト分のデータ（ステータス、課題種別、マイルストーン、メンバー、課題）を
 * DBから読み込み、フロントエンド用の Project 型に変換する。
 * Supabaseのリレーション取得機能を活用し、5つのクエリを並行実行する。
 * @param db - Supabaseクライアント
 * @param projectRow - projectsテーブルの行データ
 * @param host - Backlogホスト名（課題URLの生成に使用）
 * @returns フロントエンド用の Project オブジェクト
 */
async function loadProjectFromDb(
  db: DbClient,
  projectRow: {
    id: number;
    project_key: string;
    name: string;
    icon_url: string | null;
  },
  host: string,
): Promise<Project> {
  const projectId = projectRow.id;

  // プロジェクトに紐づく各種データを並行取得
  const [statusesRes, issueTypesRes, milestonesRes, membersRes, issuesRes] =
    await Promise.all([
      db
        .from("statuses")
        .select("id, name, color")
        .eq("project_id", projectId)
        .order("display_order"),
      db
        .from("issue_types")
        .select("id, name, color")
        .eq("project_id", projectId)
        .order("display_order"),
      db
        .from("milestones")
        .select("id, name, archived")
        .eq("project_id", projectId)
        .order("display_order"),
      // project_members 経由で members テーブルを結合取得
      db
        .from("project_members")
        .select("members(id, name, avatar_url)")
        .eq("project_id", projectId),
      // issues テーブルからリレーション先を一括で結合取得
      // members!issues_assignee_id_fkey: 複数FK列があるため明示的にFK名を指定
      db
        .from("issues")
        .select(
          `
          id, issue_key, summary, priority_name, backlog_created_at, backlog_updated_at,
          statuses(name, color),
          issue_types(name, color),
          members!issues_assignee_id_fkey(id, name, avatar_url),
          issue_milestones(milestones(name)),
          issue_remarks(content)
        `,
        )
        .eq("project_id", projectId)
        .order("backlog_updated_at", { ascending: false }),
    ]);

  if (statusesRes.error)
    throw new Error(`statuses: ${statusesRes.error.message}`);
  if (issueTypesRes.error)
    throw new Error(`issue_types: ${issueTypesRes.error.message}`);
  if (milestonesRes.error)
    throw new Error(`milestones: ${milestonesRes.error.message}`);
  if (membersRes.error)
    throw new Error(`members: ${membersRes.error.message}`);
  if (issuesRes.error) throw new Error(`issues: ${issuesRes.error.message}`);

  // メンバーIDから Assignee へのルックアップマップを構築
  const assigneeMap = new Map<number, Assignee>();
  for (const pm of membersRes.data) {
    // Supabaseのリレーション取得結果はネストしたオブジェクトだが、
    // 型推論が正確でないため unknown 経由でキャストする
    const m = pm.members as unknown as {
      id: number;
      name: string;
      avatar_url: string | null;
    } | null;
    if (m) {
      assigneeMap.set(m.id, toAssignee(m));
    }
  }

  const mappedStatuses: Status[] = statusesRes.data.map((s) => ({
    id: s.id,
    name: s.name,
    color: s.color,
  }));

  // DBの課題データをフロントエンド用の Issue 型にマッピング
  const mappedIssues: Issue[] = issuesRes.data.map((issue) => {
    // リレーション結合結果を適切な型にキャスト（Supabaseの型推論の制約を補う）
    const memberRow = issue.members as unknown as {
      id: number;
      name: string;
      avatar_url: string | null;
    } | null;
    // assigneeMap に存在すればそれを使い、なければ新規生成（プロジェクト外メンバーの場合）
    const assignee = memberRow
      ? (assigneeMap.get(memberRow.id) ?? toAssignee(memberRow))
      : null;

    // 中間テーブル経由のマイルストーン名を文字列配列に展開
    const milestoneEntries = issue.issue_milestones as unknown as Array<{
      milestones: { name: string } | null;
    }>;
    const milestones = (milestoneEntries ?? [])
      .map((im) => im.milestones?.name)
      .filter((n): n is string => Boolean(n));

    // issue_remarks は1課題に対して0〜1件を想定（先頭のみ取得）
    const remarkEntries = issue.issue_remarks as unknown as Array<{
      content: string;
    }>;
    const remarks =
      Array.isArray(remarkEntries) && remarkEntries.length > 0
        ? remarkEntries[0].content
        : "";

    const statusRow = issue.statuses as unknown as {
      name: string;
      color: string;
    } | null;
    const issueTypeRow = issue.issue_types as unknown as {
      name: string;
      color: string;
    } | null;

    return {
      id: issue.issue_key,
      title: issue.summary,
      assignee,
      status: statusRow?.name ?? "",
      statusColor: statusRow?.color ?? "",
      issueType: issueTypeRow?.name ?? "",
      issueTypeColor: issueTypeRow?.color ?? "",
      milestones,
      priority: issue.priority_name,
      remarks,
      url: `https://${host}/view/${issue.issue_key}`,
      created: issue.backlog_created_at,
      updated: issue.backlog_updated_at,
    };
  });

  return {
    id: String(projectRow.id),
    projectKey: projectRow.project_key,
    name: projectRow.name,
    icon: projectRow.icon_url ?? undefined,
    issues: mappedIssues,
    settings: {
      statuses: mappedStatuses,
      assignees: Array.from(assigneeMap.values()),
      issueTypes: issueTypesRes.data.map((t) => ({
        id: t.id,
        name: t.name,
        color: t.color,
      })),
      milestones: milestonesRes.data.map((v) => ({
        id: v.id,
        name: v.name,
        archived: v.archived,
      })),
    },
  };
}

/**
 * DBに同期済みの全プロジェクトデータをフロントエンド用の形式で返すエンドポイント。
 * 各プロジェクトの読み込みは並行で行い、一部が失敗しても成功分は返す。
 * @returns プロジェクト一覧とエラー情報
 */
export async function GET() {
  try {
    const db = createServiceClient();
    const host = getBacklogHost();

    const { data: projectRows, error: projectsError } = await db
      .from("projects")
      .select("id, project_key, name, icon_url")
      .order("project_key");

    if (projectsError)
      throw new Error(`projects: ${projectsError.message}`);
    if (!projectRows || projectRows.length === 0) {
      return NextResponse.json({ projects: [], errors: [] });
    }

    // 全プロジェクトを並行読み込み（個別の失敗は他に影響しない）
    const results = await Promise.allSettled(
      projectRows.map((row) => loadProjectFromDb(db, row, host)),
    );

    const projects: Project[] = [];
    const errors: string[] = [];

    // Promise.allSettled の結果をインデックスで projectRows と突合して振り分け
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === "fulfilled") {
        projects.push(result.value);
      } else {
        const key = projectRows[i].project_key;
        console.error(`Failed to load project ${key} from DB:`, result.reason);
        errors.push(`${key}: ${result.reason?.message ?? "Unknown error"}`);
      }
    }

    return NextResponse.json({ projects, errors });
  } catch (error) {
    console.error("Failed to load data from DB:", error);
    return NextResponse.json(
      { error: "Failed to load data from database" },
      { status: 500 },
    );
  }
}
