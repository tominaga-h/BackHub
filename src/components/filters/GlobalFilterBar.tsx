"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUp, LayoutGrid, SlidersHorizontal, User, Users } from "lucide-react";
import type { Assignee } from "@/types";

const GROUPED_BY_OPTIONS = [
  { href: "/projects", label: "プロジェクト", icon: LayoutGrid },
  { href: "/assignees", label: "担当者", icon: Users },
] as const;

export type StatusOption = {
  name: string;
  color: string;
};

type GlobalFilterBarProps = {
  projectNames: string[];
  onProjectSelect?: (projectName: string | null) => void;
  statusOptions: StatusOption[];
  activeStatuses: Set<string>;
  onStatusChange: (statuses: Set<string>) => void;
  showProjectFilter?: boolean;
  showProjectToggleFilter?: boolean;
  projectFilterOptions?: string[];
  activeProjects?: Set<string>;
  onProjectFilterChange?: (projects: Set<string>) => void;
  showAssigneeFilter?: boolean;
  assigneeFilterOptions?: Assignee[];
  hasUnassigned?: boolean;
  onAssigneeSelect?: (assigneeId: string) => void;
  /** Human トグルフィルターを表示するか（プロジェクトビュー用） */
  showHumanToggleFilter?: boolean;
  /** トグル対象の担当者リスト */
  humanToggleOptions?: Assignee[];
  /** 現在表示対象の担当者 ID の Set */
  activeHumans?: Set<string>;
  /** 「未割当」トグルボタンを表示するか */
  hasUnassignedHuman?: boolean;
  /** Human トグル変更時のコールバック */
  onHumanToggleChange?: (humans: Set<string>) => void;
};

/**
 * 画面上部に固定表示されるグローバルフィルターバー。
 * プロジェクト切り替えタブ、担当者ショートカット、ステータスフィルターを提供する。
 * プロジェクトビュー時はプロジェクトタブ、担当者ビュー時は担当者ショートカットを表示する。
 * @param projectNames - プロジェクト名一覧（タブ表示用）
 * @param onProjectSelect - プロジェクト選択時のコールバック
 * @param statusOptions - ステータス選択肢一覧
 * @param activeStatuses - 現在有効なステータスの Set
 * @param onStatusChange - ステータス変更時のコールバック
 * @param showProjectFilter - プロジェクトタブを表示するか（プロジェクトビュー用）
 * @param showProjectToggleFilter - プロジェクトトグルフィルターを表示するか（担当者ビュー用）
 * @param projectFilterOptions - プロジェクトトグルフィルターの選択肢
 * @param activeProjects - 現在有効なプロジェクトの Set
 * @param onProjectFilterChange - プロジェクトフィルター変更時のコールバック
 * @param showAssigneeFilter - 担当者ショートカットを表示するか
 * @param assigneeFilterOptions - 担当者ショートカットの選択肢
 * @param hasUnassigned - 「未割当」ショートカットを表示するか
 * @param onAssigneeSelect - 担当者ショートカットクリック時のコールバック
 * @param showHumanToggleFilter - Human トグルフィルターを表示するか（プロジェクトビュー用）
 * @param humanToggleOptions - トグル対象の担当者リスト
 * @param activeHumans - 現在表示対象の担当者 ID の Set
 * @param hasUnassignedHuman - 「未割当」トグルボタンを表示するか
 * @param onHumanToggleChange - Human トグル変更時のコールバック
 */
export function GlobalFilterBar({
  projectNames,
  onProjectSelect,
  statusOptions,
  activeStatuses,
  onStatusChange,
  showProjectFilter = true,
  showProjectToggleFilter = false,
  projectFilterOptions,
  activeProjects,
  onProjectFilterChange,
  showAssigneeFilter = false,
  assigneeFilterOptions,
  hasUnassigned,
  onAssigneeSelect,
  showHumanToggleFilter = false,
  humanToggleOptions,
  activeHumans,
  hasUnassignedHuman,
  onHumanToggleChange,
}: GlobalFilterBarProps) {
  const pathname = usePathname();
  const [activeProject, setActiveProject] = useState("All Projects");

  /**
   * ステータスボタンの個別トグル。
   * @param status - トグル対象のステータス名
   */
  const toggleStatus = (status: string) => {
    const next = new Set(activeStatuses);
    if (next.has(status)) {
      next.delete(status);
    } else {
      next.add(status);
    }
    onStatusChange(next);
  };

  /**
   * プロジェクトボタンの個別トグル。
   * @param projectName - トグル対象のプロジェクト名
   */
  const toggleProject = (projectName: string) => {
    if (!activeProjects || !onProjectFilterChange) return;
    const next = new Set(activeProjects);
    if (next.has(projectName)) {
      next.delete(projectName);
    } else {
      next.add(projectName);
    }
    onProjectFilterChange(next);
  };

  /**
   * 担当者トグルボタンの個別トグル。
   * @param humanId - トグル対象の担当者ID（文字列）
   */
  const toggleHuman = (humanId: string) => {
    if (!activeHumans || !onHumanToggleChange) return;
    const next = new Set(activeHumans);
    if (next.has(humanId)) {
      next.delete(humanId);
    } else {
      next.add(humanId);
    }
    onHumanToggleChange(next);
  };

  const allProjectsActive =
    !!projectFilterOptions &&
    projectFilterOptions.length > 0 &&
    !!activeProjects &&
    projectFilterOptions.every((p) => activeProjects.has(p));

  /** Human トグルフィルターの全選択状態を判定 */
  const allHumansActive =
    !!humanToggleOptions &&
    humanToggleOptions.length > 0 &&
    !!activeHumans &&
    humanToggleOptions.every((a) => activeHumans.has(a.id.toString())) &&
    (!hasUnassignedHuman || activeHumans.has("unassigned"));

  const allStatusesActive =
    statusOptions.length > 0 &&
    statusOptions.every((s) => activeStatuses.has(s.name));

  const tabs = [...projectNames];

  return (
    <div data-component="GlobalFilterBar" className="sticky top-0 z-30 m-4 my-3 rounded-xl bg-white p-3 shadow-md">
      {/* Filters ヘッダー */}
      <div className="mb-2 flex items-center gap-2 border-b border-gray-200 px-1 pb-2">
        <SlidersHorizontal className="h-4 w-4 text-backhub" />
        <span className="text-sm font-semibold tracking-wide text-gray-700">
          Filters
        </span>
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        >
          <ArrowUp className="h-3.5 w-3.5" />
          TOPへ戻る
        </button>
      </div>
      <div className="px-6 pb-3">
        <div className="flex flex-col gap-y-2">
          {/* Grouped By: 画面切り替えナビゲーション */}
          <div className="flex flex-wrap items-center gap-1">
            <span className="mr-2 text-xs font-medium uppercase tracking-wider text-gray-500">
              Grouped By
            </span>
            {GROUPED_BY_OPTIONS.map((tab) => {
              const isActive = pathname === tab.href;
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-backhub text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-300"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </Link>
              );
            })}
          </div>
          {/* Project Tabs */}
          {showProjectFilter && (
            <div className="flex flex-wrap items-center gap-1">
              <span className="mr-2 text-xs font-medium uppercase tracking-wider text-gray-500">
                Project
              </span>
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveProject(tab);
                    onProjectSelect?.(tab === "All Projects" ? null : tab);
                  }}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    activeProject === tab
                      ? "bg-backhub text-white"
                      : "text-gray-600 bg-gray-100 hover:bg-gray-300"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          )}
          {/* Project Toggle Filters（担当者ビュー専用） */}
          {showProjectToggleFilter && projectFilterOptions && activeProjects && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-xs font-medium uppercase tracking-wider text-gray-500">
                Project
              </span>
              <button
                onClick={() =>
                  onProjectFilterChange?.(new Set(projectFilterOptions))
                }
                className={`rounded-sm px-3 py-1 text-xs font-semibold transition-colors ${
                  allProjectsActive
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                All
              </button>
              {projectFilterOptions.map((name) => {
                const isActive = activeProjects.has(name);
                return (
                  <button
                    key={name}
                    onClick={() => toggleProject(name)}
                    className={`rounded-sm px-3 py-1 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-backhub font-bold text-white"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          )}
          {/* Human Shortcuts（担当者ビュー専用：スクロール用ショートカット） */}
          {showAssigneeFilter && assigneeFilterOptions && (
            <div className="flex flex-wrap items-center gap-1">
              <span className="mr-2 text-xs font-medium uppercase tracking-wider text-gray-500">
                Human
              </span>
              {assigneeFilterOptions.map((a) => (
                <button
                  key={a.id}
                  onClick={() => onAssigneeSelect?.(a.id.toString())}
                  className="inline-flex items-center gap-1.5 rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-300"
                >
                  {a.avatarUrl ? (
                    <img
                      src={a.avatarUrl}
                      alt={a.name}
                      className="h-5 w-5 rounded-full object-cover"
                    />
                  ) : (
                    <span
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
                      style={{ backgroundColor: a.avatarColor }}
                    >
                      {a.initials}
                    </span>
                  )}
                  {a.name}
                </button>
              ))}
              {hasUnassigned && (
                <button
                  onClick={() => onAssigneeSelect?.("unassigned")}
                  className="inline-flex items-center gap-1.5 rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-300"
                >
                  <User className="h-4 w-4 text-gray-400" />
                  未割当
                </button>
              )}
            </div>
          )}
          {/* Human Toggle Filters（プロジェクトビュー専用：担当者の表示/非表示トグル） */}
          {showHumanToggleFilter && humanToggleOptions && activeHumans && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-xs font-medium uppercase tracking-wider text-gray-500">
                Human
              </span>
              <button
                onClick={() => {
                  const all = new Set(humanToggleOptions.map((a) => a.id.toString()));
                  if (hasUnassignedHuman) all.add("unassigned");
                  onHumanToggleChange?.(all);
                }}
                className={`rounded-sm px-3 py-1 text-xs font-semibold transition-colors ${
                  allHumansActive
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                All
              </button>
              {humanToggleOptions.map((a) => {
                const isActive = activeHumans.has(a.id.toString());
                return (
                  <button
                    key={a.id}
                    onClick={() => toggleHuman(a.id.toString())}
                    className={`inline-flex items-center gap-1.5 rounded-sm px-3 py-1 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-backhub font-bold text-white"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {a.avatarUrl ? (
                      <img
                        src={a.avatarUrl}
                        alt={a.name}
                        className="h-5 w-5 rounded-full object-cover"
                      />
                    ) : (
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
                          isActive ? "text-white" : "text-white"
                        }`}
                        style={{ backgroundColor: a.avatarColor }}
                      >
                        {a.initials}
                      </span>
                    )}
                    {a.name}
                  </button>
                );
              })}
              {hasUnassignedHuman && (
                <button
                  onClick={() => toggleHuman("unassigned")}
                  className={`inline-flex items-center gap-1.5 rounded-sm px-3 py-1 text-xs font-medium transition-colors ${
                    activeHumans.has("unassigned")
                      ? "bg-backhub font-bold text-white"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  <User className={`h-4 w-4 ${activeHumans.has("unassigned") ? "text-white" : "text-gray-400"}`} />
                  未割当
                </button>
              )}
            </div>
          )}
          {/* Status Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs font-medium uppercase tracking-wider text-gray-500">
              Status
            </span>
            <button
              onClick={() =>
                onStatusChange(new Set(statusOptions.map((s) => s.name)))
              }
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                allStatusesActive
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              All
            </button>
            {statusOptions.map((status) => {
              const isActive = activeStatuses.has(status.name);
              return (
                <button
                  key={status.name}
                  onClick={() => toggleStatus(status.name)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    isActive
                      ? "border-current bg-opacity-15 text-gray-800"
                      : "border-gray-200 bg-gray-100 text-gray-400"
                  }`}
                  style={
                    isActive
                      ? { backgroundColor: status.color, color: "white", fontWeight: "bold" }
                      : undefined
                  }
                >
                  {status.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
