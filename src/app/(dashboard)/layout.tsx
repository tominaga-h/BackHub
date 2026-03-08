"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { GlobalFilterBar } from "@/components/filters/GlobalFilterBar";
import { ViewTabs } from "@/components/layout/ViewTabs";
import { AssigneeSidebar } from "@/components/filters/AssigneeSidebar";
import { ProjectDataProvider, useProjectData } from "@/contexts/ProjectDataContext";

/**
 * ダッシュボードの内部レイアウト。
 * ProjectDataContext からデータを取得し、Header / GlobalFilterBar / ViewTabs を配置する。
 * ローディング・エラー状態の表示もこのコンポーネントが担当する。
 * @param children - ページコンテンツ（projects または assignees ページ）
 */
function DashboardShell({ children }: { children: React.ReactNode }) {
  const {
    loading, error, projectNames, statusOptions, activeStatuses, setActiveStatuses,
    activeProjects, setActiveProjects,
    filteredAssigneeOptions, activeAssignees, setActiveAssignees,
  } = useProjectData();
  const pathname = usePathname();
  const isAssigneesView = pathname === "/assignees";

  /**
   * 指定IDの要素までスムーズスクロールする。
   * GlobalFilterBar の高さ分をオフセットとして考慮する。
   * @param elementId - スクロール先のDOM要素ID
   */
  const scrollToElement = (elementId: string) => {
    const target = document.getElementById(elementId);
    if (!target) return;

    // sticky なフィルターバーに隠れないよう、その高さ+余白分だけオフセットする
    const filterBar = document.querySelector<HTMLElement>(
      '[data-component="GlobalFilterBar"]',
    );
    const offset = filterBar ? filterBar.offsetHeight + 12 : 24;
    const top = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: "smooth" });
  };

  /**
   * プロジェクト名選択時にそのセクションまでスクロールする。
   * @param projectName - 選択されたプロジェクト名
   */
  const handleProjectSelect = (projectName: string | null) => {
    if (!projectName) return;
    // DOM id は小文字・ハイフン区切りに正規化されている
    scrollToElement(`project-${projectName.toLowerCase().replace(/\s+/g, "-")}`);
  };

  /**
   * 担当者ID選択時にそのセクションまでスクロールする。
   * @param assigneeId - 選択された担当者ID（文字列形式）
   */
  const handleAssigneeSelect = (assigneeId: string) => {
    scrollToElement(`assignee-${assigneeId}`);
  };

  if (loading) {
    return (
      <div data-component="DashboardLayout" className="flex min-h-screen flex-col bg-[#f5f7f9]">
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-backhub" />
            <p className="mt-4 text-sm text-gray-500">
              Loading projects from Backlog...
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div data-component="DashboardLayout" className="flex min-h-screen flex-col bg-[#f5f7f9]">
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <p className="font-medium text-red-600">Failed to load data</p>
            <p className="mt-1 text-sm text-gray-500">{error}</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div data-component="DashboardLayout" className="flex min-h-screen flex-col bg-[#f5f7f9]">
      <Header />
      <GlobalFilterBar
        projectNames={projectNames}
        onProjectSelect={handleProjectSelect}
        statusOptions={statusOptions}
        activeStatuses={activeStatuses}
        onStatusChange={setActiveStatuses}
        showProjectFilter={!isAssigneesView}
        showProjectToggleFilter={isAssigneesView}
        projectFilterOptions={projectNames}
        activeProjects={activeProjects}
        onProjectFilterChange={setActiveProjects}
        showAssigneeFilter={isAssigneesView}
        assigneeFilterOptions={filteredAssigneeOptions.assignees.filter(a => activeAssignees.has(a.id.toString()))}
        hasUnassigned={filteredAssigneeOptions.hasUnassigned && activeAssignees.has("unassigned")}
        onAssigneeSelect={handleAssigneeSelect}
      />
      {/* プロジェクトビュー/担当者ビューの切り替えタブ */}
      <ViewTabs />
      {/* 担当者ビューではサイドバーを表示、プロジェクトビューではサイドバーなし */}
      {isAssigneesView ? (
        <div className="flex flex-1">
          <AssigneeSidebar
            assigneeOptions={filteredAssigneeOptions.assignees}
            hasUnassigned={filteredAssigneeOptions.hasUnassigned}
            activeAssignees={activeAssignees}
            onAssigneeChange={setActiveAssignees}
          />
          <main className="min-w-0 flex-1 px-6 pb-6 pt-4">{children}</main>
        </div>
      ) : (
        <main className="flex-1 px-6 pb-6 pt-4">{children}</main>
      )}
    </div>
  );
}

/**
 * ダッシュボード用レイアウト。
 * ProjectDataProvider でデータコンテキストを提供し、DashboardShell で共通UIを描画する。
 * @param children - ページコンテンツ
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProjectDataProvider>
      <DashboardShell>{children}</DashboardShell>
    </ProjectDataProvider>
  );
}
