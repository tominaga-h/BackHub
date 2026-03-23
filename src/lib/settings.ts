import { createServiceClient } from "@/lib/supabase";

/** ユーザーのBacklog連携設定 */
export type UserBacklogSettings = {
  spaceUrl: string | null;
  apiKey: string | null;
  projectKeys: string[];
};

/**
 * 指定ユーザーのBacklog連携設定をDBから取得する。
 * profiles テーブルから spaceUrl / apiKey を、
 * user_project_keys テーブルからプロジェクトキー一覧を取得する。
 * @param userId - Supabase Auth のユーザーID
 * @returns ユーザーのBacklog連携設定
 */
export async function getUserBacklogSettings(
  userId: string,
): Promise<UserBacklogSettings> {
  const db = createServiceClient();

  const [profileRes, projectKeysRes] = await Promise.all([
    db
      .from("profiles")
      .select("backlog_space_url, backlog_api_key")
      .eq("id", userId)
      .maybeSingle(),
    db
      .from("user_project_keys")
      .select("project_key")
      .eq("user_id", userId)
      .order("created_at"),
  ]);

  if (profileRes.error) {
    throw new Error(`Failed to fetch profile: ${profileRes.error.message}`);
  }

  return {
    spaceUrl: profileRes.data?.backlog_space_url ?? null,
    apiKey: profileRes.data?.backlog_api_key ?? null,
    projectKeys: (projectKeysRes.data ?? []).map((row) => row.project_key),
  };
}
