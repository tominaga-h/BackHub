import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

/**
 * 課題の備考欄を保存（upsert）する PATCH エンドポイント。
 *
 * リクエストボディ:
 *   - issueKey: 課題キー（例: "PROJ-123"）
 *   - content:  備考テキスト
 *
 * issue_remarks テーブルの issue_id には UNIQUE 制約があるため、
 * 既存レコードがあれば content を更新、なければ新規挿入する。
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      issueKey?: string;
      content?: string;
    };

    const { issueKey, content } = body;

    if (!issueKey || content === undefined) {
      return NextResponse.json(
        { error: "issueKey and content are required" },
        { status: 400 },
      );
    }

    const db = createServiceClient();

    // フロントエンドの Issue.id は issue_key（文字列）なので、
    // DB の整数 id に変換する必要がある
    const { data: issue, error: issueError } = await db
      .from("issues")
      .select("id")
      .eq("issue_key", issueKey)
      .single();

    if (issueError || !issue) {
      return NextResponse.json(
        { error: `Issue not found: ${issueKey}` },
        { status: 404 },
      );
    }

    // issue_id の UNIQUE 制約を利用して upsert（存在すれば更新、なければ挿入）
    const { error: upsertError } = await db
      .from("issue_remarks")
      .upsert(
        { issue_id: issue.id, content },
        { onConflict: "issue_id" },
      );

    if (upsertError) {
      console.error("Failed to upsert issue_remarks:", upsertError);
      return NextResponse.json(
        { error: "Failed to save remarks" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unexpected error in PATCH /api/issues/remarks:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
