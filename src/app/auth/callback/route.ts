import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * OAuth PKCE フローのコールバックエンドポイント。
 * Supabase が返す認可コードをセッションに交換し、ダッシュボードへリダイレクトする。
 * コードが無い場合やセッション交換に失敗した場合は /login へリダイレクトする。
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/projects";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // 認証失敗時はログインページへ戻す
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
