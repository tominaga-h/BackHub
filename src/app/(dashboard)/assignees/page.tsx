"use client";

import { useMemo } from "react";
import { AssigneeSection } from "@/components/issues/AssigneeSection";
import { Button } from "@/components/ui/button";
import { useProjectData } from "@/contexts/ProjectDataContext";
import type { Assignee, IssueWithProject } from "@/types";

/**
 * 担当者ビューのメインページ。
 * 全プロジェクトの課題を担当者ごとにグルーピングして表示する。
 */
export default function AssigneesPage() {
  const { projects, activeStatuses, activeProjects, statusColorMap, activeAssignees } = useProjectData();

  // 全プロジェクトの課題を担当者ごとにグルーピングし、担当者名でソート
  const groupedByAssignee = useMemo(() => {
    const map = new Map<
      string,
      { assignee: Assignee | null; issues: IssueWithProject[] }
    >();

    projects
      .filter((project) => activeProjects.has(project.name))
      .forEach((project) => {
      project.issues
        // グローバルステータスフィルターを適用
        .filter((issue) => activeStatuses.has(issue.status))
        .forEach((issue) => {
          // 担当者未設定の課題は "unassigned" キーでグルーピング
          const key = issue.assignee?.id?.toString() ?? "unassigned";
          if (!map.has(key)) {
            map.set(key, { assignee: issue.assignee, issues: [] });
          }
          // 課題にプロジェクト情報を付加して IssueWithProject 型にする
          map.get(key)!.issues.push({
            ...issue,
            projectName: project.name,
            projectKey: project.projectKey,
          });
        });
    });

    // 未担当を末尾に、それ以外は日本語ロケールで名前順ソート
    return Array.from(map.values()).sort((a, b) => {
      if (!a.assignee) return 1;
      if (!b.assignee) return -1;
      return a.assignee.name.localeCompare(b.assignee.name, "ja");
    });
  }, [projects, activeStatuses, activeProjects]);

  // サイドバーで選択された担当者のみを表示対象にする
  const visibleGroups = useMemo(
    () =>
      groupedByAssignee.filter((g) => {
        const key = g.assignee?.id?.toString() ?? "unassigned";
        return activeAssignees.has(key);
      }),
    [groupedByAssignee, activeAssignees],
  );

  const totalIssues = projects.reduce((sum, p) => sum + p.issues.length, 0);
  const filteredIssues = visibleGroups.reduce(
    (sum, g) => sum + g.issues.length,
    0,
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
    <div data-component="AssigneesPage">
      <div className="space-y-6">
        {visibleGroups.map((group) => (
          <AssigneeSection
            key={group.assignee?.id ?? "unassigned"}
            assignee={group.assignee}
            issues={group.issues}
            statusColorMap={statusColorMap}
            onRemarksChange={handleRemarksChange}
          />
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between text-sm text-gray-500">
        <p>
          Showing {filteredIssues} of {totalIssues} issues across{" "}
          {visibleGroups.length} assignees
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
    </div>
  );
}
