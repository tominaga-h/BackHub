import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/middleware";

/** 認証チェックをスキップするパスのプレフィックス */
const PUBLIC_PATHS = ["/login", "/auth/callback", "/api/"];

/** 静的アセットのパスパターン */
const STATIC_PATHS = ["/_next/", "/favicon.ico", "/logo.svg"];

/**
 * 全リクエストでSupabaseセッションをリフレッシュし、
 * 未認証ユーザーを /login にリダイレクトするミドルウェア。
 * 認証済みユーザーが /login にアクセスした場合は /projects へリダイレクトする。
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 静的アセットはスキップ
  if (STATIC_PATHS.some((p) => pathname.startsWith(p))) {
    return;
  }

  const { supabase, response } = await createClient(request);

  // セッションのリフレッシュ（期限切れトークンの自動更新）
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  // 未認証ユーザーが保護ルートにアクセスした場合 → /login へリダイレクト
  if (!user && !isPublicPath) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirectTo", pathname);
    return Response.redirect(loginUrl);
  }

  // 認証済みユーザーが /login にアクセスした場合 → /projects へリダイレクト
  if (user && pathname === "/login") {
    const projectsUrl = request.nextUrl.clone();
    projectsUrl.pathname = "/projects";
    return Response.redirect(projectsUrl);
  }

  return response;
}

export const config = {
  matcher: [
    // Next.js の内部ルート・静的ファイルを除外し、それ以外の全パスにマッチ
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
