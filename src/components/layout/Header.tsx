"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Search, Settings, LogOut, FolderKanban, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/browser";
import type { User } from "@supabase/supabase-js";

/** ユーザー表示名からイニシャル（最大2文字）を生成する */
function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/**
 * アプリケーションヘッダー。
 * ロゴ、検索バー、設定ボタン、認証ユーザー情報、ログアウトを表示する。
 */
export function Header() {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));

    // 認証状態変更を購読し、リアルタイムでUIに反映する
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
    router.push("/login");
  }, [supabase.auth, router]);

  // OAuthメタデータからユーザー情報を取得
  const displayName =
    user?.user_metadata?.full_name ??
    user?.user_metadata?.name ??
    user?.user_metadata?.user_name ??
    user?.email ??
    "User";
  const avatarUrl = user?.user_metadata?.avatar_url;

  return (
    <header
      data-component="Header"
      className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4"
    >
      {/* Left: Logo・Links */}
      <div className="flex">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-backhub">
            <img src="/logo.svg" alt="BackHub" width="32" height="32" />
          </div>
          <span className="text-xl font-bold tracking-tight text-gray-800">
            Back<span className="text-backhub">Hub</span>
          </span>
        </div>
        {/* Nav Links */}
        <nav className="flex items-center gap-1 pl-3">
          <Link
            href="/projects"
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
              pathname.startsWith("/projects")
                ? "font-semibold text-backhub"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <FolderKanban className="h-4 w-4" />
            Projects
          </Link>
          <Link
            href="/assignees"
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
              pathname.startsWith("/assignees")
                ? "font-semibold text-backhub"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Users className="h-4 w-4" />
            Assignees
          </Link>
          <Link
            href="/settings"
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
              pathname.startsWith("/settings")
                ? "font-semibold text-backhub"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Settings className="h-5 w-5" />
            Settings
          </Link>
        </nav>
      </div>

      {/* Right: Actions + User */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
            <AvatarFallback className="bg-amber-100 text-sm font-medium text-amber-700">
              {getInitials(displayName)}
            </AvatarFallback>
          </Avatar>
          <div className="text-right">
            <p className="text-sm font-medium leading-tight text-gray-800">
              {displayName}
            </p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="text-gray-500 transition-colors hover:text-gray-700"
          title="ログアウト"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
