import { NextResponse } from "next/server";
import {
  createBacklogClient,
  getBacklogHost,
  getProjectKeys,
} from "@/lib/backlog-client";
import { fetchRawProjectData } from "@/lib/backlog-fetcher";
import { syncProjectToDatabase, type SyncResult } from "@/lib/backlog-sync";

/**
 * Backlog APIから全対象プロジェクトのデータを取得し、Supabaseに同期するエンドポイント。
 * 直近3ヶ月分の課題を対象とし、プロジェクト単位で並行取得→直列同期する。
 * 一部プロジェクトが失敗しても他は成功として返す（207 Multi-Status）。
 * @returns 各プロジェクトの同期結果配列
 */
export async function POST() {
  try {
    const backlog = createBacklogClient();
    const host = getBacklogHost();
    const projectKeys = getProjectKeys();
    const apiKey = process.env.BACKLOG_API_KEY;
    if (!apiKey) throw new Error("BACKLOG_API_KEY must be set");

    // 直近3ヶ月分を取得対象とする
    const since = new Date();
    since.setMonth(since.getMonth() - 3);
    // Backlog APIの createdSince は "YYYY-MM-DD" 形式を期待するため日付部分のみ切り出し
    const createdSince = since.toISOString().split("T")[0];

    // 全プロジェクトのデータを並行取得（個別の失敗は他に影響しない）
    const fetchResults = await Promise.allSettled(
      projectKeys.map((key) =>
        fetchRawProjectData(backlog, host, apiKey, key, createdSince),
      ),
    );

    const results: SyncResult[] = [];

    // 取得成功分のみDB同期を実行し、失敗分はエラー結果を記録
    for (let i = 0; i < fetchResults.length; i++) {
      const result = fetchResults[i];
      if (result.status === "fulfilled") {
        const syncResult = await syncProjectToDatabase(result.value);
        results.push(syncResult);
      } else {
        const key = projectKeys[i];
        console.error(`Failed to fetch project ${key}:`, result.reason);
        results.push({
          projectKey: key,
          issueCount: 0,
          memberCount: 0,
          status: "error",
          error: result.reason?.message ?? "Failed to fetch from Backlog API",
        });
      }
    }

    // 1つでもエラーがあれば 207（Multi-Status）、全成功なら 200 を返す
    const hasError = results.some((r) => r.status === "error");
    return NextResponse.json({ results }, { status: hasError ? 207 : 200 });
  } catch (error) {
    console.error("Sync failed:", error);
    return NextResponse.json(
      { error: "Sync failed" },
      { status: 500 },
    );
  }
}
