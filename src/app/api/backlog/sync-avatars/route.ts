import { NextResponse } from "next/server";
import { getBacklogHost } from "@/lib/backlog-client";
import { fetchUserAvatars } from "@/lib/backlog-fetcher";
import { createServiceClient } from "@/lib/supabase";

/**
 * アバター画像が未取得のメンバーに対して、Backlog APIからアバターを取得しDBを更新するエンドポイント。
 * avatar_url が null のメンバーのみが対象となる。
 * @returns 更新件数・対象総数・スキップ件数
 */
export async function POST() {
  try {
    const host = getBacklogHost();
    const apiKey = process.env.BACKLOG_API_KEY;
    if (!apiKey) throw new Error("BACKLOG_API_KEY must be set");

    const db = createServiceClient();

    // アバター未取得のメンバーのみを対象とする
    const { data: members, error: selectError } = await db
      .from("members")
      .select("id")
      .is("avatar_url", null);

    if (selectError) throw new Error(`select members: ${selectError.message}`);
    if (!members || members.length === 0) {
      return NextResponse.json({ updated: 0, message: "No members missing avatars" });
    }

    const memberIds = members.map((m) => m.id);
    const avatars = await fetchUserAvatars(host, apiKey, memberIds);

    // 取得できたアバターを1件ずつDBに反映（失敗しても他メンバーの更新は続行）
    let updated = 0;
    for (const [id, uri] of Object.entries(avatars)) {
      const { error } = await db
        .from("members")
        .update({ avatar_url: uri })
        // Object.entries のキーは string 型になるため Number に変換
        .eq("id", Number(id));
      if (error) {
        console.warn(`Failed to update avatar for member ${id}: ${error.message}`);
      } else {
        updated++;
      }
    }

    return NextResponse.json({
      updated,
      total: memberIds.length,
      // Backlog APIからアバター取得に失敗したメンバー数
      skipped: memberIds.length - Object.keys(avatars).length,
    });
  } catch (error) {
    console.error("sync-avatars failed:", error);
    return NextResponse.json(
      { error: "Failed to sync avatars" },
      { status: 500 },
    );
  }
}
