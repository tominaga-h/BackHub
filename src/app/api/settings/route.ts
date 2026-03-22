import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase";

/** PUT リクエストボディの型 */
type SettingsUpdateBody = {
  spaceUrl?: string | null;
  apiKey?: string | null;
  projectKeys?: string[];
};

/**
 * 認証済みユーザーのBacklog連携設定を取得する。
 * profiles から spaceUrl / apiKey を、user_project_keys からプロジェクトキー一覧を返す。
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = createServiceClient();

    const [profileRes, projectKeysRes] = await Promise.all([
      db
        .from("profiles")
        .select("backlog_space_url, backlog_api_key")
        .eq("id", user.id)
        .maybeSingle(),
      db
        .from("user_project_keys")
        .select("project_key")
        .eq("user_id", user.id)
        .order("created_at"),
    ]);

    if (profileRes.error) {
      throw new Error(`profiles: ${profileRes.error.message}`);
    }

    // プロファイルが未作成の場合は自動生成する
    if (!profileRes.data) {
      const displayName =
        user.user_metadata?.full_name ??
        user.user_metadata?.name ??
        user.email ??
        "User";
      const avatarUrl = user.user_metadata?.avatar_url ?? null;

      const { error: insertError } = await db.from("profiles").insert({
        id: user.id,
        display_name: displayName,
        avatar_url: avatarUrl,
      });

      if (insertError) {
        throw new Error(`profiles insert: ${insertError.message}`);
      }

      return NextResponse.json({
        spaceUrl: null,
        apiKey: null,
        projectKeys: [],
      });
    }

    return NextResponse.json({
      spaceUrl: profileRes.data.backlog_space_url,
      apiKey: profileRes.data.backlog_api_key,
      projectKeys: (projectKeysRes.data ?? []).map((r) => r.project_key),
    });
  } catch (error) {
    console.error("Failed to fetch settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 },
    );
  }
}

/**
 * 認証済みユーザーのBacklog連携設定を更新する。
 * profiles の spaceUrl / apiKey を更新し、
 * user_project_keys は全削除→再挿入で洗い替えする。
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: SettingsUpdateBody = await request.json();
    const db = createServiceClient();

    // profiles の更新（spaceUrl / apiKey）
    const updateData: Record<string, string | null> = {};
    if (body.spaceUrl !== undefined) {
      updateData.backlog_space_url = body.spaceUrl;
    }
    if (body.apiKey !== undefined) {
      updateData.backlog_api_key = body.apiKey;
    }

    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await db
        .from("profiles")
        .update(updateData)
        .eq("id", user.id);
      if (updateError) {
        throw new Error(`profiles update: ${updateError.message}`);
      }
    }

    // user_project_keys の洗い替え（DELETE → INSERT）
    if (body.projectKeys !== undefined) {
      const { error: deleteError } = await db
        .from("user_project_keys")
        .delete()
        .eq("user_id", user.id);
      if (deleteError) {
        throw new Error(`project_keys delete: ${deleteError.message}`);
      }

      if (body.projectKeys.length > 0) {
        const rows = body.projectKeys.map((key) => ({
          user_id: user.id,
          project_key: key,
        }));
        const { error: insertError } = await db
          .from("user_project_keys")
          .insert(rows);
        if (insertError) {
          throw new Error(`project_keys insert: ${insertError.message}`);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 },
    );
  }
}
