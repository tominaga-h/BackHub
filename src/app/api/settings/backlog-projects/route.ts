import { NextRequest, NextResponse } from "next/server";
import { Backlog } from "backlog-js";
import { createClient } from "@/lib/supabase/server";

/** リクエストボディの型 */
type FetchProjectsBody = {
  spaceUrl: string;
  apiKey: string;
};

/** レスポンスで返すプロジェクト情報 */
type BacklogProjectInfo = {
  id: number;
  projectKey: string;
  name: string;
};

/**
 * 指定された Backlog スペースURL + APIキーで、
 * そのスペースに存在する全プロジェクト一覧を返す。
 * 設定画面の「同期するプロジェクト」チェックボックスの選択肢生成に使用する。
 */
export async function POST(request: NextRequest) {
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

    const body: FetchProjectsBody = await request.json();

    if (!body.spaceUrl || !body.apiKey) {
      return NextResponse.json(
        { error: "spaceUrl and apiKey are required" },
        { status: 400 },
      );
    }

    // スペースURLからホスト名を抽出して Backlog クライアントを生成
    let host: string;
    try {
      host = new URL(body.spaceUrl).hostname;
    } catch {
      return NextResponse.json(
        { error: "Invalid spaceUrl format" },
        { status: 400 },
      );
    }

    const backlog = new Backlog({ host, apiKey: body.apiKey });
    const projects = await backlog.getProjects();

    const result: BacklogProjectInfo[] = projects.map((p) => ({
      id: p.id,
      projectKey: p.projectKey,
      name: p.name,
    }));

    return NextResponse.json({ projects: result });
  } catch (error) {
    console.error("Failed to fetch Backlog projects:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch projects";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
