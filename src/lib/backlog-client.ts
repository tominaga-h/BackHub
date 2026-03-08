import { Backlog } from "backlog-js";

/**
 * 環境変数からBacklog APIクライアントを生成する。
 * BACKLOG_SPACE_URL と BACKLOG_API_KEY が未設定の場合はエラーをスローする。
 * @returns Backlog APIクライアントインスタンス
 */
export function createBacklogClient(): Backlog {
  const spaceUrl = process.env.BACKLOG_SPACE_URL;
  const apiKey = process.env.BACKLOG_API_KEY;

  if (!spaceUrl || !apiKey) {
    throw new Error("BACKLOG_SPACE_URL and BACKLOG_API_KEY must be set");
  }

  // スペースURLからホスト名のみを抽出（例: "example.backlog.com"）
  const host = new URL(spaceUrl).hostname;
  return new Backlog({ host, apiKey });
}

/**
 * 環境変数 BACKLOG_SPACE_URL からBacklogのホスト名を取得する。
 * @returns Backlogのホスト名（例: "example.backlog.com"）
 */
export function getBacklogHost(): string {
  const spaceUrl = process.env.BACKLOG_SPACE_URL;
  if (!spaceUrl) throw new Error("BACKLOG_SPACE_URL must be set");
  return new URL(spaceUrl).hostname;
}

/**
 * 環境変数 BACKLOG_PROJECT_KEYS からカンマ区切りのプロジェクトキー一覧を取得する。
 * @returns プロジェクトキーの配列（例: ["PROJ1", "PROJ2"]）
 */
export function getProjectKeys(): string[] {
  const keys = process.env.BACKLOG_PROJECT_KEYS;
  if (!keys) throw new Error("BACKLOG_PROJECT_KEYS must be set");
  return keys.split(",").map((k) => k.trim()).filter(Boolean);
}
