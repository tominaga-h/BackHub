"use client";

import { useMemo } from "react";
import { AssigneeSection } from "@/components/issues/AssigneeSection";
import { Button } from "@/components/ui/button";
import { useProjectData } from "@/contexts/ProjectDataContext";
import type { Assignee, IssueWithProject } from "@/types";

export default function AssigneesPage() {
  const { projects, activeStatuses, statusColorMap, activeAssignees } = useProjectData();

  const groupedByAssignee = useMemo(() => {
    const map = new Map<
      string,
      { assignee: Assignee | null; issues: IssueWithProject[] }
    >();

    projects.forEach((project) => {
      project.issues
        .filter((issue) => activeStatuses.has(issue.status))
        .forEach((issue) => {
          const key = issue.assignee?.id?.toString() ?? "unassigned";
          if (!map.has(key)) {
            map.set(key, { assignee: issue.assignee, issues: [] });
          }
          map.get(key)!.issues.push({
            ...issue,
            projectName: project.name,
            projectKey: project.projectKey,
          });
        });
    });

    return Array.from(map.values()).sort((a, b) => {
      if (!a.assignee) return 1;
      if (!b.assignee) return -1;
      return a.assignee.name.localeCompare(b.assignee.name, "ja");
    });
  }, [projects, activeStatuses]);

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
