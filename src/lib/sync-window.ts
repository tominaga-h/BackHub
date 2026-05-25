/**
 * 差分同期で使う「いつ以降の更新を取得するか」の起点日を計算する純粋関数。
 *
 * 最後に同期した日時（ISO 8601）から 1 日減算し、yyyy-mm-dd 形式に丸めて返す。
 * 前日まで遡るのは境界の取りこぼしを防ぐため。
 * - Backlog の updatedSince は日付単位（時刻を持たない）ため、同期時刻当日を起点にすると
 *   その日の同期後に発生した更新を取り逃す恐れがある。
 * - 前日に丸めて重複取得しても upsert は冪等なので、同じ課題を再取得するだけで害はない。
 * UTC 基準（toISOString）で丸めるのは sync/route.ts の formatDate と整形を揃えるため。
 *
 * 空文字や日付として解釈できない値が渡されたときは throw せず空文字を返す。
 * 呼び出し側（ProjectDataContext）はこの空文字を「初回扱い = days:30」へフォールバックする。
 *
 * @param syncedAtIso - 最後に同期した日時（ISO 8601 文字列）。未同期や不正値は空文字を返す。
 * @returns yyyy-mm-dd 形式の起点日。不正値のときは空文字 ""。
 * @example
 * computeUpdatedSince("2026-05-21T09:30:00.000Z"); // "2026-05-20"
 * computeUpdatedSince("2026-01-01T00:00:00.000Z"); // "2025-12-31"（年初境界）
 * computeUpdatedSince("");                          // ""（不正値）
 */
export function computeUpdatedSince(syncedAtIso: string): string {
  // 空文字・null 相当・日付として解釈できない値は空文字を返す（throw しない）
  if (!syncedAtIso || Number.isNaN(Date.parse(syncedAtIso))) {
    return "";
  }
  const d = new Date(syncedAtIso);
  // 1 日減算（前日に丸める）
  d.setDate(d.getDate() - 1);
  // yyyy-mm-dd へ整形（sync/route.ts の formatDate と同じ整形）
  return d.toISOString().split("T")[0];
}
