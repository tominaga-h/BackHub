import { createServiceClient } from "@/lib/supabase";
import type { RawProjectData } from "@/lib/backlog-fetcher";
import type { TablesInsert } from "@/types/database";

/** 同期対象の課題情報（新規追加 or 既存更新を type で区別） */
export type SyncIssueItem = {
  type: "new" | "updated";
  issueKey: string;
  summary: string;
};

/** 同期処理の結果を表す型 */
export type SyncResult = {
  projectKey: string;
  status: "success" | "error";
  error?: string;
  data: {
    count: number;
    issues: SyncIssueItem[];
  };
};

/**
 * Backlog APIから取得した生データをSupabaseデータベースに同期する。
 * FK（外部キー）制約を考慮し、以下の順序で投入する:
 *   1. projects → 2. members → 3. マスタ（statuses等） → 4. project_members → 5. issues
 * エラー発生時はロールバックせず、エラー情報を含む SyncResult を返す。
 * @param rawData - Backlog APIから取得した1プロジェクト分の生データ
 * @returns 同期結果（成功/失敗、件数、エラー情報）
 */
export async function syncProjectToDatabase(
  rawData: RawProjectData,
): Promise<SyncResult> {
  const db = createServiceClient();
  const { project, statuses, issueTypes, versions, categories, users, issues, userAvatars } =
    rawData;

  try {
    // 1. projects（他テーブルが参照するため最初に投入）
    await upsertProject(db, project, rawData.icon);

    // 2. members（FKを持たない独立テーブルなので先に投入）
    if (users.length > 0) {
      await upsertMembers(db, users, userAvatars);
    }

    // 3. プロジェクト依存マスタ（projects の FK を参照するため projects の後に投入）
    if (statuses.length > 0) await upsertStatuses(db, project.id, statuses);
    if (issueTypes.length > 0) await upsertIssueTypes(db, project.id, issueTypes);
    if (versions.length > 0) await upsertMilestones(db, project.id, versions);
    if (categories.length > 0) await upsertCategories(db, project.id, categories);

    // 4. project_members（全件洗い替え: delete → insert）
    await syncProjectMembers(db, project.id, users);

    // 5. issues → 親課題ID設定 → 中間テーブル（マイルストーン・カテゴリ）
    //    parent_issue_id は課題自体が全件 upsert された後でないと
    //    FK制約で参照先が存在しない可能性があるため、第2パスで設定する
    let syncedIssues: SyncIssueItem[] = [];
    if (issues.length > 0) {
      syncedIssues = await upsertIssues(db, issues);
      await updateParentIssueIds(db, issues);
      await syncIssueMilestones(db, issues);
      await syncIssueCategories(db, issues);
    }

    return {
      projectKey: project.projectKey,
      status: "success",
      data: {
        count: issues.length,
        issues: syncedIssues,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`Sync failed for ${project.projectKey}:`, message);
    return {
      projectKey: project.projectKey,
      status: "error",
      error: message,
      data: { count: 0, issues: [] },
    };
  }
}

/** createServiceClient の戻り値型のエイリアス（各関数の引数型として使用） */
type SupabaseClient = ReturnType<typeof createServiceClient>;

/**
 * プロジェクト情報をDBにupsertする。
 * @param db - Supabaseクライアント
 * @param project - Backlogから取得したプロジェクト基本情報
 * @param icon - プロジェクトアイコンのData URI（未取得時は undefined）
 */
async function upsertProject(
  db: SupabaseClient,
  project: RawProjectData["project"],
  icon: string | undefined,
) {
  const { error } = await db.from("projects").upsert(
    {
      id: project.id,
      project_key: project.projectKey,
      name: project.name,
      icon_url: icon ?? null,
      synced_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (error) throw new Error(`projects: ${error.message}`);
}

/**
 * メンバー情報をDBにupsertする。
 * アバター画像は新たに取得できた場合はそれを使い、取得できなかった場合はDB上の既存値を維持する。
 * @param db - Supabaseクライアント
 * @param users - Backlogから取得したユーザー一覧
 * @param userAvatars - 今回取得したアバター画像のマップ（ユーザーID → Data URI）
 */
async function upsertMembers(
  db: SupabaseClient,
  users: RawProjectData["users"],
  userAvatars: RawProjectData["userAvatars"],
) {
  const userIds = users.map((u) => u.id);
  // 既存のアバターURLを取得しておき、新規取得できなかった場合のフォールバックに使う
  const { data: existing } = await db
    .from("members")
    .select("id, avatar_url")
    .in("id", userIds);
  const existingAvatars: Record<number, string | null> = Object.fromEntries(
    (existing ?? []).map((m) => [m.id, m.avatar_url]),
  );

  const rows: TablesInsert<"members">[] = users.map((u) => ({
    id: u.id,
    backlog_user_id: u.userId,
    name: u.name,
    mail_address: u.mailAddress || null,
    role_type: u.roleType,
    // 優先順位: 今回取得したアバター > DB既存のアバター > null
    avatar_url: userAvatars[u.id] ?? existingAvatars[u.id] ?? null,
  }));
  const { error } = await db
    .from("members")
    .upsert(rows, { onConflict: "id" });
  if (error) throw new Error(`members: ${error.message}`);
}

/**
 * プロジェクトのステータス一覧をDBにupsertする。
 * 複合主キー (project_id, id) で競合判定する。
 * @param db - Supabaseクライアント
 * @param projectId - プロジェクトID
 * @param statuses - Backlogから取得したステータス一覧
 */
async function upsertStatuses(
  db: SupabaseClient,
  projectId: number,
  statuses: RawProjectData["statuses"],
) {
  const rows: TablesInsert<"statuses">[] = statuses.map((s) => ({
    id: s.id,
    project_id: projectId,
    name: s.name,
    color: s.color,
    display_order: s.displayOrder,
  }));
  const { error } = await db
    .from("statuses")
    .upsert(rows, { onConflict: "project_id, id" });
  if (error) throw new Error(`statuses: ${error.message}`);
}

/**
 * プロジェクトの課題種別一覧をDBにupsertする。
 * 複合主キー (project_id, id) で競合判定する。
 * @param db - Supabaseクライアント
 * @param projectId - プロジェクトID
 * @param issueTypes - Backlogから取得した課題種別一覧
 */
async function upsertIssueTypes(
  db: SupabaseClient,
  projectId: number,
  issueTypes: RawProjectData["issueTypes"],
) {
  const rows: TablesInsert<"issue_types">[] = issueTypes.map((t) => ({
    id: t.id,
    project_id: projectId,
    name: t.name,
    color: t.color,
    display_order: t.displayOrder,
  }));
  const { error } = await db
    .from("issue_types")
    .upsert(rows, { onConflict: "project_id, id" });
  if (error) throw new Error(`issue_types: ${error.message}`);
}

/**
 * プロジェクトのマイルストーン（バージョン）一覧をDBにupsertする。
 * Backlog APIでは "version" だが、DB上は "milestones" テーブルに格納する。
 * @param db - Supabaseクライアント
 * @param projectId - プロジェクトID
 * @param versions - Backlogから取得したバージョン（マイルストーン）一覧
 */
async function upsertMilestones(
  db: SupabaseClient,
  projectId: number,
  versions: RawProjectData["versions"],
) {
  const rows: TablesInsert<"milestones">[] = versions.map((v) => ({
    id: v.id,
    project_id: projectId,
    name: v.name,
    description: v.description ?? null,
    start_date: v.startDate ?? null,
    release_due_date: v.releaseDueDate ?? null,
    archived: v.archived,
    display_order: v.displayOrder,
  }));
  const { error } = await db
    .from("milestones")
    .upsert(rows, { onConflict: "id" });
  if (error) throw new Error(`milestones: ${error.message}`);
}

/**
 * プロジェクトのカテゴリ一覧をDBにupsertする。
 * @param db - Supabaseクライアント
 * @param projectId - プロジェクトID
 * @param categories - Backlogから取得したカテゴリ一覧
 */
async function upsertCategories(
  db: SupabaseClient,
  projectId: number,
  categories: RawProjectData["categories"],
) {
  const rows: TablesInsert<"categories">[] = categories.map((c) => ({
    id: c.id,
    project_id: projectId,
    name: c.name,
    display_order: c.displayOrder,
  }));
  const { error } = await db
    .from("categories")
    .upsert(rows, { onConflict: "id" });
  if (error) throw new Error(`categories: ${error.message}`);
}

/**
 * プロジェクトとメンバーの紐付けを全件洗い替え（delete → insert）する。
 * upsert ではなく洗い替え方式を採用しているのは、プロジェクトから外れたメンバーを
 * 確実に除去するため。
 * @param db - Supabaseクライアント
 * @param projectId - プロジェクトID
 * @param users - 現在プロジェクトに所属するユーザー一覧
 */
async function syncProjectMembers(
  db: SupabaseClient,
  projectId: number,
  users: RawProjectData["users"],
) {
  await db.from("project_members").delete().eq("project_id", projectId);

  if (users.length === 0) return;

  const rows: TablesInsert<"project_members">[] = users.map((u) => ({
    project_id: projectId,
    member_id: u.id,
  }));
  const { error } = await db.from("project_members").insert(rows);
  if (error) throw new Error(`project_members: ${error.message}`);
}

/**
 * 課題一覧をDBにupsertし、新規追加・更新された課題の一覧を返す。
 * upsert 前にDBの既存IDを照会し、新規 (new) と既存更新 (updated) を区別する。
 * parent_issue_id はこの時点では null で投入し、updateParentIssueIds で後から設定する。
 * @param db - Supabaseクライアント
 * @param issues - Backlogから取得した課題一覧
 * @returns 各課題の type("new"|"updated"), issueKey, summary の配列
 */
async function upsertIssues(
  db: SupabaseClient,
  issues: RawProjectData["issues"],
): Promise<SyncIssueItem[]> {
  // upsert 前に既存IDを照会して、新規追加分と更新分を後で区別する
  const issueIds = issues.map((i) => i.id);
  const { data: existing } = await db
    .from("issues")
    .select("id")
    .in("id", issueIds);
  const existingIds = new Set((existing ?? []).map((e) => e.id));

  const now = new Date().toISOString();
  // Backlog APIのレスポンス構造（ネストしたオブジェクト）をフラットなDBカラムにマッピング
  const rows: TablesInsert<"issues">[] = issues.map((i) => ({
    id: i.id,
    project_id: i.projectId,
    issue_key: i.issueKey,
    key_id: i.keyId,
    summary: i.summary,
    description: i.description || null,
    issue_type_id: i.issueType.id,
    status_id: i.status.id,
    priority_id: i.priority.id,
    priority_name: i.priority.name,
    assignee_id: i.assignee?.id ?? null,
    // 親課題IDは第2パスで設定するため、ここでは null を入れる
    parent_issue_id: null,
    start_date: i.startDate ?? null,
    due_date: i.dueDate ?? null,
    estimated_hours: i.estimatedHours ?? null,
    actual_hours: i.actualHours ?? null,
    created_user_id: i.createdUser.id,
    backlog_created_at: i.created,
    backlog_updated_at: i.updated,
    synced_at: now,
  }));
  const { error } = await db
    .from("issues")
    .upsert(rows, { onConflict: "id" });
  if (error) throw new Error(`issues: ${error.message}`);

  // 既存IDの有無で new / updated を区別して返す
  const newItems: SyncIssueItem[] = issues
    .filter((i) => !existingIds.has(i.id))
    .map((i) => ({ type: "new" as const, issueKey: i.issueKey, summary: i.summary }));
  const updatedItems: SyncIssueItem[] = issues
    .filter((i) => existingIds.has(i.id))
    .map((i) => ({ type: "updated" as const, issueKey: i.issueKey, summary: i.summary }));
  return [...newItems, ...updatedItems];
}

/**
 * 課題の親子関係（parent_issue_id）を設定する第2パス。
 * 親課題が同一バッチに含まれる場合のFK制約違反を避けるため、
 * 全課題をupsertした後に別途 update する。
 * 親課題がDB上に存在しない場合（過去データ未同期等）は警告を出して続行する。
 * @param db - Supabaseクライアント
 * @param issues - Backlogから取得した課題一覧
 */
async function updateParentIssueIds(
  db: SupabaseClient,
  issues: RawProjectData["issues"],
) {
  const withParent = issues.filter((i) => i.parentIssueId);
  for (const issue of withParent) {
    const { error } = await db
      .from("issues")
      .update({ parent_issue_id: issue.parentIssueId! })
      .eq("id", issue.id);
    if (error) {
      // 親課題がDB上に存在しない場合等はエラーにせず警告のみ出して続行
      console.warn(
        `Could not set parent_issue_id for issue ${issue.id}: ${error.message}`,
      );
    }
  }
}

/**
 * 課題とマイルストーンの中間テーブルを全件洗い替え（delete → insert）する。
 * @param db - Supabaseクライアント
 * @param issues - Backlogから取得した課題一覧
 */
async function syncIssueMilestones(
  db: SupabaseClient,
  issues: RawProjectData["issues"],
) {
  const issueIds = issues.map((i) => i.id);
  await db.from("issue_milestones").delete().in("issue_id", issueIds);

  // 課題×マイルストーンの多対多を展開してフラットな行配列にする
  const rows: TablesInsert<"issue_milestones">[] = [];
  for (const issue of issues) {
    for (const ms of issue.milestone ?? []) {
      rows.push({ issue_id: issue.id, milestone_id: ms.id });
    }
  }
  if (rows.length === 0) return;

  const { error } = await db.from("issue_milestones").insert(rows);
  if (error) throw new Error(`issue_milestones: ${error.message}`);
}

/**
 * 課題とカテゴリの中間テーブルを全件洗い替え（delete → insert）する。
 * @param db - Supabaseクライアント
 * @param issues - Backlogから取得した課題一覧
 */
async function syncIssueCategories(
  db: SupabaseClient,
  issues: RawProjectData["issues"],
) {
  const issueIds = issues.map((i) => i.id);
  await db.from("issue_categories").delete().in("issue_id", issueIds);

  // 課題×カテゴリの多対多を展開してフラットな行配列にする
  const rows: TablesInsert<"issue_categories">[] = [];
  for (const issue of issues) {
    for (const cat of issue.category ?? []) {
      rows.push({ issue_id: issue.id, category_id: cat.id });
    }
  }
  if (rows.length === 0) return;

  const { error } = await db.from("issue_categories").insert(rows);
  if (error) throw new Error(`issue_categories: ${error.message}`);
}
