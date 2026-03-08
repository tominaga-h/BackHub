import type { Backlog, Entity } from "backlog-js";

/** Backlog APIから取得した1プロジェクト分の生データ一式 */
export type RawProjectData = {
  project: {
    id: number;
    projectKey: string;
    name: string;
  };
  statuses: Entity.Project.ProjectStatus[];
  issueTypes: Entity.Issue.IssueType[];
  versions: Entity.Project.Version[];
  categories: Entity.Project.Category[];
  users: Entity.User.User[];
  issues: Entity.Issue.Issue[];
  userAvatars: Record<number, string>;
  icon?: string;
};

/**
 * 指定URLの画像を取得し、Data URI（base64形式）に変換する。
 * 取得失敗時はエラーを投げずに undefined を返す。
 * @param url - 画像のURL
 * @returns "data:<contentType>;base64,..." 形式の文字列、または undefined
 */
export async function fetchImageAsDataUri(
  url: string,
): Promise<string | undefined> {
  try {
    const res = await fetch(url);
    if (!res.ok) return undefined;
    // Content-Type が取得できない場合は PNG として扱う
    const contentType = res.headers.get("content-type") ?? "image/png";
    const buf = Buffer.from(await res.arrayBuffer());
    return `data:${contentType};base64,${buf.toString("base64")}`;
  } catch {
    return undefined;
  }
}

/**
 * Backlog APIからプロジェクトアイコンを取得し、Data URI形式で返す。
 * @param host - Backlogホスト名（例: "example.backlog.com"）
 * @param apiKey - Backlog APIキー
 * @param projectIdOrKey - プロジェクトIDまたはプロジェクトキー
 * @returns アイコンのData URI、または undefined
 */
export async function fetchProjectIcon(
  host: string,
  apiKey: string,
  projectIdOrKey: string | number,
): Promise<string | undefined> {
  return fetchImageAsDataUri(
    `https://${host}/api/v2/projects/${projectIdOrKey}/image?apiKey=${apiKey}`,
  );
}

/**
 * 複数ユーザーのアバター画像を並行取得し、Data URI形式で返す。
 * API負荷軽減のため、concurrency で指定したバッチサイズで分割して直列実行する。
 * @param host - Backlogホスト名
 * @param apiKey - Backlog APIキー
 * @param userIds - 取得対象のユーザーID配列
 * @param concurrency - 同時取得数（デフォルト: 3）
 * @returns ユーザーID → Data URI のマップ（取得失敗したユーザーは含まれない）
 */
export async function fetchUserAvatars(
  host: string,
  apiKey: string,
  userIds: number[],
  concurrency = 3,
): Promise<Record<number, string>> {
  const avatars: Record<number, string> = {};
  // バッチ単位で並行リクエストし、バッチ間は直列処理でレート制限を回避
  for (let i = 0; i < userIds.length; i += concurrency) {
    const batch = userIds.slice(i, i + concurrency);
    const results = await Promise.allSettled(
      batch.map(async (id) => {
        const uri = await fetchImageAsDataUri(
          `https://${host}/api/v2/users/${id}/icon?apiKey=${apiKey}`,
        );
        return { id, uri };
      }),
    );
    for (const r of results) {
      // 失敗したリクエストは無視し、成功分のみ収集
      if (r.status === "fulfilled" && r.value.uri) {
        avatars[r.value.id] = r.value.uri;
      }
    }
  }
  return avatars;
}

/**
 * 1プロジェクト分のBacklogデータ（ステータス、課題種別、バージョン、カテゴリ、
 * ユーザー、課題、アイコン、アバター）を一括取得する。
 * @param backlog - Backlog APIクライアント
 * @param host - Backlogホスト名
 * @param apiKey - Backlog APIキー
 * @param projectKey - 対象プロジェクトキー（例: "PROJ1"）
 * @param createdSince - 課題の作成日下限（ISO 8601形式、例: "2026-01-01"）
 * @returns プロジェクトの全生データ
 */
export async function fetchRawProjectData(
  backlog: Backlog,
  host: string,
  apiKey: string,
  projectKey: string,
  createdSince: string,
): Promise<RawProjectData> {
  const projectInfo = await backlog.getProject(projectKey);

  // プロジェクトに紐づく各種マスタデータと課題を並行取得
  const [statuses, issueTypes, versions, categories, users, issues, icon] =
    await Promise.all([
      backlog.getProjectStatuses(projectKey),
      backlog.getIssueTypes(projectKey),
      backlog.getVersions(projectKey),
      backlog.getCategories(projectKey),
      backlog.getProjectUsers(projectKey),
      backlog.getIssues({
        projectId: [projectInfo.id],
        count: 100,           // Backlog APIの1リクエスト上限
        sort: "updated",
        order: "desc",
        createdSince,
      }),
      fetchProjectIcon(host, apiKey, projectKey),
    ]);

  // アバターはユーザー一覧取得後に依存するため、別途取得
  const userAvatars = await fetchUserAvatars(
    host,
    apiKey,
    users.map((u) => u.id),
  );

  return {
    project: {
      id: projectInfo.id,
      projectKey: projectInfo.projectKey,
      name: projectInfo.name,
    },
    statuses,
    issueTypes,
    versions,
    categories,
    users,
    issues,
    userAvatars,
    icon,
  };
}
