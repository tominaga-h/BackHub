import { NextRequest, NextResponse } from "next/server";
import {
  createBacklogClient,
  getBacklogHost,
  getProjectKeys,
} from "@/lib/backlog-client";
import {
  fetchRawProjectData,
  type IssueFilterOptions,
} from "@/lib/backlog-fetcher";
import { syncProjectToDatabase, type SyncResult } from "@/lib/backlog-sync";

/** リクエストボディの型定義 */
type SyncRequestBody = {
  months?: number;
  days?: number;
  from_date?: string;
  to_date?: string;
  today?: boolean;
  date_type?: "created" | "updated";
};

/** yyyy-mm-dd 形式の日付文字列かどうかを検証する */
function isValidDateString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

/**
 * 日付を "YYYY-MM-DD" 形式の文字列に変換する。
 * Backlog API の日付パラメータはこの形式を期待する。
 */
function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * リクエストボディのバリデーションを行い、IssueFilterOptions を生成する。
 * 期間指定パラメータ（months / days / from_date+to_date / today）は排他で、いずれか1つが必須。
 * date_type で日付基準（作成日 or 更新日）を切り替えられる。
 * @returns IssueFilterOptions または エラーメッセージ
 */
function buildIssueFilter(
  body: SyncRequestBody,
): { filter: IssueFilterOptions } | { error: string } {
  const { months, days, from_date, to_date, today, date_type } = body;

  // date_type のバリデーション
  if (date_type !== undefined && date_type !== "created" && date_type !== "updated") {
    return { error: "date_type must be \"created\" or \"updated\"" };
  }

  // 排他チェック: 指定されている期間パラメータの数をカウント
  const modeCount = [
    months !== undefined,
    days !== undefined,
    from_date !== undefined || to_date !== undefined,
    today === true,
  ].filter(Boolean).length;

  if (modeCount === 0) {
    return { error: "One of months, days, from_date+to_date, or today is required" };
  }
  if (modeCount > 1) {
    return { error: "months, days, from_date+to_date, and today are mutually exclusive" };
  }

  let since: string | undefined;
  let until: string | undefined;
  // months のデフォルトは created、それ以外は updated
  let resolvedDateType: "created" | "updated";

  if (months !== undefined) {
    if (!Number.isInteger(months) || months <= 0) {
      return { error: "months must be a positive integer" };
    }
    const d = new Date();
    d.setMonth(d.getMonth() - months);
    since = formatDate(d);
    resolvedDateType = date_type ?? "created";
  } else if (days !== undefined) {
    if (!Number.isInteger(days) || days <= 0) {
      return { error: "days must be a positive integer" };
    }
    const d = new Date();
    d.setDate(d.getDate() - days);
    since = formatDate(d);
    resolvedDateType = date_type ?? "updated";
  } else if (from_date !== undefined || to_date !== undefined) {
    if (!from_date || !to_date) {
      return { error: "Both from_date and to_date are required" };
    }
    if (!isValidDateString(from_date)) {
      return { error: "from_date must be in yyyy-mm-dd format" };
    }
    if (!isValidDateString(to_date)) {
      return { error: "to_date must be in yyyy-mm-dd format" };
    }
    if (from_date > to_date) {
      return { error: "from_date must be before or equal to to_date" };
    }
    since = from_date;
    until = to_date;
    resolvedDateType = date_type ?? "updated";
  } else {
    // today === true
    since = formatDate(new Date());
    resolvedDateType = date_type ?? "updated";
  }

  // date_type に応じて Backlog API のパラメータ名を切り替え
  const filter: IssueFilterOptions =
    resolvedDateType === "created"
      ? { createdSince: since, createdUntil: until }
      : { updatedSince: since, updatedUntil: until };

  return { filter };
}

/**
 * Backlog APIから全対象プロジェクトのデータを取得し、Supabaseに同期するエンドポイント。
 * リクエストボディで取得期間と日付基準を指定する。
 * プロジェクト単位で並行取得→直列同期し、一部失敗しても他は成功として返す（207 Multi-Status）。
 *
 * @example
 * // 直近3ヶ月分（作成日基準）
 * POST /api/backlog/sync  { "months": 3 }
 *
 * // 直近7日間の更新分
 * POST /api/backlog/sync  { "days": 7 }
 *
 * // 期間指定（更新日基準）
 * POST /api/backlog/sync  { "from_date": "2026-01-01", "to_date": "2026-03-10" }
 *
 * // 本日更新分
 * POST /api/backlog/sync  { "today": true }
 *
 * // date_type で基準を明示的に切り替え
 * POST /api/backlog/sync  { "days": 7, "date_type": "created" }
 */
export async function POST(request: NextRequest) {
  try {
    // リクエストボディの解析（空ボディの場合は空オブジェクトとして扱う）
    let body: SyncRequestBody = {};
    try {
      body = await request.json();
    } catch {
      // JSON パース失敗 = ボディなし → バリデーションで 400 になる
    }

    // パラメータバリデーション & IssueFilterOptions の生成
    const result = buildIssueFilter(body);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    const issueFilter = result.filter;

    const backlog = createBacklogClient();
    const host = getBacklogHost();
    const projectKeys = getProjectKeys();
    const apiKey = process.env.BACKLOG_API_KEY;
    if (!apiKey) throw new Error("BACKLOG_API_KEY must be set");

    // 全プロジェクトのデータを並行取得（個別の失敗は他に影響しない）
    const fetchResults = await Promise.allSettled(
      projectKeys.map((key) =>
        fetchRawProjectData(backlog, host, apiKey, key, issueFilter),
      ),
    );

    const results: SyncResult[] = [];

    // 取得成功分のみDB同期を実行し、失敗分はエラー結果を記録
    for (let i = 0; i < fetchResults.length; i++) {
      const fetchResult = fetchResults[i];
      if (fetchResult.status === "fulfilled") {
        const syncResult = await syncProjectToDatabase(fetchResult.value);
        results.push(syncResult);
      } else {
        const key = projectKeys[i];
        console.error(`Failed to fetch project ${key}:`, fetchResult.reason);
        results.push({
          projectKey: key,
          issueCount: 0,
          memberCount: 0,
          status: "error",
          error: fetchResult.reason?.message ?? "Failed to fetch from Backlog API",
          newIssues: [],
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
