"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ProjectSection } from "@/components/issues/ProjectSection";
import { ProjectSettingsSidebar } from "@/components/filters/ProjectSettingsSidebar";
import { Button } from "@/components/ui/button";
import { useProjectData } from "@/contexts/ProjectDataContext";
import { UNSET_MILESTONE } from "@/types";
import type { ProjectFilters } from "@/types";

/**
 * プロジェクトの設定情報からデフォルトのフィルター状態を生成する。
 * 初期状態では全ての担当者・課題種別・マイルストーンが選択された状態になる。
 * @param project - プロジェクトの設定情報
 * @param activeStatuses - 現在グローバルで有効なステータスの Set
 * @returns 初期フィルター状態
 */
function buildDefaultFilters(
  project: { settings: { assignees: { name: string }[]; issueTypes: { name: string }[]; milestones: { name: string }[] } },
  activeStatuses: Set<string>,
): ProjectFilters {
  return {
    statuses: new Set(activeStatuses),
    assignees: new Set(project.settings.assignees.map((a) => a.name)),
    issueTypes: new Set(project.settings.issueTypes.map((t) => t.name)),
    // UNSET_MILESTONE: マイルストーン未設定の課題もデフォルトで表示対象に含める
    milestones: new Set([UNSET_MILESTONE, ...project.settings.milestones.map((m) => m.name)]),
  };
}

/**
 * 課題がプロジェクト固有フィルター条件に一致するかを判定する。
 * 全条件（ステータス、担当者、課題種別、マイルストーン）の AND 条件で評価する。
 * @param issue - 判定対象の課題
 * @param filters - 適用中のフィルター
 * @returns フィルター条件に一致する場合 true
 */
function matchesProjectFilters(
  issue: { status: string; assignee: { name: string } | null; issueType: string; milestones: string[] },
  filters: ProjectFilters,
): boolean {
  const statusMatch = filters.statuses.has(issue.status);
  // 担当者未設定の課題はフィルターに関係なく表示する
  const assigneeMatch = issue.assignee
    ? filters.assignees.has(issue.assignee.name)
    : true;
  const typeMatch = filters.issueTypes.has(issue.issueType);
  // マイルストーン未設定の課題は UNSET_MILESTONE の選択状態で判定
  const milestoneMatch =
    issue.milestones.length === 0
      ? filters.milestones.has(UNSET_MILESTONE)
      : issue.milestones.some((m) => filters.milestones.has(m));
  return statusMatch && assigneeMatch && typeMatch && milestoneMatch;
}

/**
 * プロジェクトビューのメインページ。
 * 各プロジェクトのセクションを一覧表示し、プロジェクト固有フィルターのサイドバーを提供する。
 */
export default function ProjectsPage() {
  const { projects, activeStatuses, activeAssignees } = useProjectData();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  /** プロジェクトIDごとの個別フィルター状態を管理 */
  const [filtersMap, setFiltersMap] = useState<Record<string, ProjectFilters>>({});

  // グローバルステータスフィルターの変更をプロジェクト個別フィルターに反映する
  useEffect(() => {
    if (projects.length === 0 || activeStatuses.size === 0) return;
    setFiltersMap((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const p of projects) {
        if (!next[p.id]) {
          // 未初期化のプロジェクトにはデフォルトフィルターを設定
          next[p.id] = buildDefaultFilters(p, activeStatuses);
          changed = true;
        } else {
          // 既存フィルターのステータス部分のみグローバルと同期する
          const current = next[p.id].statuses;
          const isSame =
            current.size === activeStatuses.size &&
            [...activeStatuses].every((s) => current.has(s));
          if (!isSame) {
            next[p.id] = { ...next[p.id], statuses: new Set(activeStatuses) };
            changed = true;
          }
        }
      }
      // 不要な再レンダリングを避けるため、変更がなければ前回の参照をそのまま返す
      return changed ? next : prev;
    });
  }, [projects, activeStatuses]);

  const activeProject = projects.find((p) => p.id === activeProjectId);
  const activeSettings = activeProject?.settings ?? null;
  const activeFilters = activeProjectId ? filtersMap[activeProjectId] : undefined;

  const totalIssues = projects.reduce((sum, p) => sum + p.issues.length, 0);

  const filteredIssues = useMemo(
    () =>
      projects.reduce((sum, p) => {
        const pf = filtersMap[p.id];
        return (
          sum +
          p.issues.filter((i) => {
            if (pf && !matchesProjectFilters(i, pf)) return false;
            // グローバル Human フィルターによる担当者絞り込み
            if (activeAssignees.size > 0) {
              const humanMatch = i.assignee
                ? activeAssignees.has(i.assignee.id.toString())
                : activeAssignees.has("unassigned");
              if (!humanMatch) return false;
            }
            return true;
          }).length
        );
      }, 0),
    [projects, filtersMap, activeAssignees],
  );

  /**
   * プロジェクト設定サイドバーを開く。
   * @param projectId - 設定を開く対象のプロジェクトID
   */
  const handleOpenSettings = (projectId: string) => {
    setActiveProjectId(projectId);
    setSidebarOpen(true);
  };

  /**
   * プロジェクト設定サイドバーで「適用」を押した時にフィルターを更新する。
   * @param filters - 新しいフィルター状態
   */
  const handleApplyFilters = useCallback(
    (filters: ProjectFilters) => {
      if (!activeProjectId) return;
      setFiltersMap((prev) => ({ ...prev, [activeProjectId]: filters }));
    },
    [activeProjectId],
  );

  /**
   * 課題の備考欄が編集された時のハンドラ。
   * @param issueId - 課題ID（課題キー）
   * @param remarks - 新しい備考テキスト
   */
  const handleRemarksChange = (issueId: string, remarks: string) => {
    // TODO: Supabase 導入後に DB 保存処理に置き換え
    console.log("remarks changed:", issueId, remarks);
  };

  return (
    <div data-component="ProjectsPage">
      <div className="space-y-6">
        {projects.map((project) => (
          <ProjectSection
            key={project.id}
            project={project}
            onOpenSettings={handleOpenSettings}
            projectFilters={filtersMap[project.id]}
            globalActiveAssignees={activeAssignees}
            onRemarksChange={handleRemarksChange}
          />
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between text-sm text-gray-500">
        <p>
          Showing {filteredIssues} of {totalIssues} issues across{" "}
          {projects.length} projects
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled>
            Previous
          </Button>
          <Button variant="outline" size="sm" disabled>
            Next
          </Button>
        </div>
      </div>

      <ProjectSettingsSidebar
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
        projectName={activeProject?.name}
        settings={activeSettings}
        currentFilters={activeFilters}
        onApply={handleApplyFilters}
        issues={activeProject?.issues}
      />
    </div>
  );
}
