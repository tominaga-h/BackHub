"use client";

import { Header } from "@/components/layout/Header";

/**
 * 設定ページ用レイアウト。
 * ダッシュボードとは異なり、Header のみ表示し、
 * GlobalFilterBar や ProjectDataProvider は不要。
 */
export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div data-component="SettingsLayout" className="flex min-h-screen flex-col bg-[#f5f7f9]">
      <Header />
      <main className="flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
