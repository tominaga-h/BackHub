import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * Supabaseとの接続状態を確認するヘルスチェックエンドポイント。
 * projectsテーブルから最大5件取得し、接続成功/失敗を返す。
 * @returns 接続結果とプロジェクト件数
 */
export async function GET() {
  const { data, error, status } = await supabase
    .from("projects")
    .select("id, project_key, name")
    .limit(5);

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message, status },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    message: "Supabase connection successful",
    projectCount: data.length,
    projects: data,
  });
}
