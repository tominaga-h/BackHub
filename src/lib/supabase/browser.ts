import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

/**
 * クライアントコンポーネント用のSupabaseクライアントを生成する。
 * Cookieベースのセッション管理を行い、認証状態を自動的に維持する。
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
