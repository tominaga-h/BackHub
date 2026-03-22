import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * 認証不要のクライアントサイド用Supabaseクライアント（匿名キー使用）。
 * 認証が必要な場合は supabase/browser.ts の createClient() を使用すること。
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

/**
 * サーバーサイド用のSupabaseクライアントを生成する。
 * Service Role Keyを使用するため、RLS（Row Level Security）をバイパスできる。
 * セッション管理は不要なため autoRefreshToken / persistSession を無効化している。
 * BFF（API Routes）からのバッチ書き込み操作で使用する。
 * @returns Service Role権限を持つSupabaseクライアント
 */
export function createServiceClient() {
  const url = process.env.SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  return createClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
