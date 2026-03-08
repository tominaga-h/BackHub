"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Users } from "lucide-react";

const TABS = [
  { href: "/projects", label: "プロジェクトごと", icon: LayoutGrid },
  { href: "/assignees", label: "担当者ごと", icon: Users },
] as const;

/**
 * プロジェクトビュー / 担当者ビューを切り替えるタブナビゲーション。
 * 現在のパスに基づいてアクティブタブをハイライトする。
 */
export function ViewTabs() {
  const pathname = usePathname();

  return (
    <div data-component="ViewTabs" className="p-6">
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map((tab) => {
          const isActive = pathname === tab.href;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "border-backhub text-backhub"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
