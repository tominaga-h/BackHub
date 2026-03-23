import { Backlog } from "backlog-js";

/**
 * Backlog APIクライアントを生成する。
 * 引数が指定されていればそれを使い、未指定なら環境変数にフォールバックする。
 * @param spaceUrl - BacklogスペースURL（省略時は BACKLOG_SPACE_URL を参照）
 * @param apiKey - Backlog APIキー（省略時は BACKLOG_API_KEY を参照）
 * @returns Backlog APIクライアントインスタンス
 */
export function createBacklogClient(
  spaceUrl?: string,
  apiKey?: string,
): Backlog {
  const resolvedUrl = spaceUrl || process.env.BACKLOG_SPACE_URL;
  const resolvedKey = apiKey || process.env.BACKLOG_API_KEY;

  if (!resolvedUrl || !resolvedKey) {
    throw new Error(
      "Backlog spaceUrl and apiKey are required (via argument or env)",
    );
  }

  const host = new URL(resolvedUrl).hostname;
  return new Backlog({ host, apiKey: resolvedKey });
}

/**
 * BacklogスペースURLからホスト名を取得する。
 * 引数が指定されていればそれを使い、未指定なら環境変数にフォールバックする。
 * @param spaceUrl - BacklogスペースURL（省略時は BACKLOG_SPACE_URL を参照）
 * @returns Backlogのホスト名（例: "example.backlog.com"）
 */
export function getBacklogHost(spaceUrl?: string): string {
  const resolvedUrl = spaceUrl || process.env.BACKLOG_SPACE_URL;
  if (!resolvedUrl) {
    throw new Error("Backlog spaceUrl is required (via argument or env)");
  }
  return new URL(resolvedUrl).hostname;
}

/**
 * 同期対象のプロジェクトキー一覧を取得する。
 * 引数が指定されていればそれを使い、未指定なら環境変数にフォールバックする。
 * @param projectKeys - プロジェクトキー配列（省略時は BACKLOG_PROJECT_KEYS を参照）
 * @returns プロジェクトキーの配列（例: ["PROJ1", "PROJ2"]）
 */
export function getProjectKeys(projectKeys?: string[]): string[] {
  if (projectKeys && projectKeys.length > 0) {
    return projectKeys;
  }
  const keys = process.env.BACKLOG_PROJECT_KEYS;
  if (!keys) throw new Error("Backlog projectKeys are required (via argument or env)");
  return keys.split(",").map((k) => k.trim()).filter(Boolean);
}
