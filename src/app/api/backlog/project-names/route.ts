import { NextResponse } from "next/server";
import { createBacklogClient } from "@/lib/backlog-client";
import { createClient } from "@/lib/supabase/server";
import { getUserBacklogSettings } from "@/lib/settings";

// Backlog API 呼び出しを含むため、既定 10 秒では不足する可能性に備えて余裕を持たせる。
export const maxDuration = 30;

/** レスポンスで返すプロジェクト情報（key と表示名のみ） */
type ProjectName = {
  projectKey: string;
  name: string;
};

/**
 * ログインユーザーの Backlog 設定で、スペースの全プロジェクトの
 * projectKey と表示名の一覧を返すエンドポイント。
 *
 * 未同期プロジェクトは projects テーブルに行が無く表示名を持たないため、
 * ダッシュボードの「読み込み中」画面で名前を表示する用途で使う。
 * 設定画面用の `/api/settings/backlog-projects` は spaceUrl/apiKey をボディで
 * 受け取る前提のため流用せず、サーバー側で設定を解決するこのエンドポイントを使う。
 * @returns プロジェクト名一覧、または設定未完了時の needsSetup フラグ
 */
export async function GET() {
  try {
    // 認証チェック
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // DB保存のユーザー設定を取得する
    const settings = await getUserBacklogSettings(user.id);

    // Backlog 設定が未完了なら env にフォールバックせず needsSetup を返す
    if (!settings.spaceUrl || !settings.apiKey) {
      return NextResponse.json({ projects: [], needsSetup: true });
    }

    const backlog = createBacklogClient(settings.spaceUrl, settings.apiKey);
    const projects = await backlog.getProjects();

    const result: ProjectName[] = projects.map((p) => ({
      projectKey: p.projectKey,
      name: p.name,
    }));

    return NextResponse.json({ projects: result });
  } catch (error) {
    console.error("Failed to fetch Backlog project names:", error);
    return NextResponse.json(
      { error: "Failed to fetch project names" },
      { status: 500 },
    );
  }
}
