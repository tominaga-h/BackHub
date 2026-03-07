"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ProjectSection } from "@/components/issues/ProjectSection";
import { ProjectSettingsSidebar } from "@/components/filters/ProjectSettingsSidebar";
import { Button } from "@/components/ui/button";
import { useProjectData } from "@/contexts/ProjectDataContext";
import type { ProjectFilters } from "@/types";

function buildDefaultFilters(
  project: { settings: { assignees: { name: string }[]; issueTypes: { name: string }[]; milestones: { name: string }[] } },
): ProjectFilters {
  return {
    assignees: new Set(project.settings.assignees.map((a) => a.name)),
    issueTypes: new Set(project.settings.issueTypes.map((t) => t.name)),
    milestones: new Set(project.settings.milestones.map((m) => m.name)),
  };
}

function matchesProjectFilters(
  issue: { assignee: { name: string } | null; issueType: string; milestones: string[] },
  filters: ProjectFilters,
): boolean {
  const assigneeMatch = issue.assignee
    ? filters.assignees.has(issue.assignee.name)
    : true;
  const typeMatch = filters.issueTypes.has(issue.issueType);
  const milestoneMatch =
    issue.milestones.length === 0 ||
    issue.milestones.some((m) => filters.milestones.has(m));
  return assigneeMatch && typeMatch && milestoneMatch;
}

export default function ProjectsPage() {
  const { projects, activeStatuses } = useProjectData();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [filtersMap, setFiltersMap] = useState<Record<string, ProjectFilters>>({});

  useEffect(() => {
    if (projects.length === 0) return;
    setFiltersMap((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const p of projects) {
        if (!next[p.id]) {
          next[p.id] = buildDefaultFilters(p);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [projects]);

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
          p.issues.filter(
            (i) =>
              activeStatuses.has(i.status) &&
              (!pf || matchesProjectFilters(i, pf)),
          ).length
        );
      }, 0),
    [projects, activeStatuses, filtersMap],
  );

  const handleOpenSettings = (projectId: string) => {
    setActiveProjectId(projectId);
    setSidebarOpen(true);
  };

  const handleApplyFilters = useCallback(
    (filters: ProjectFilters) => {
      if (!activeProjectId) return;
      setFiltersMap((prev) => ({ ...prev, [activeProjectId]: filters }));
    },
    [activeProjectId],
  );

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
            activeStatuses={activeStatuses}
            projectFilters={filtersMap[project.id]}
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
      />
    </div>
  );
}
