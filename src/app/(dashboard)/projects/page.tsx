"use client";

import { useMemo, useState } from "react";
import { ProjectSection } from "@/components/issues/ProjectSection";
import { ProjectSettingsSidebar } from "@/components/filters/ProjectSettingsSidebar";
import { Button } from "@/components/ui/button";
import { useProjectData } from "@/contexts/ProjectDataContext";

export default function ProjectsPage() {
  const { projects, activeStatuses } = useProjectData();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  const activeSettings =
    projects.find((p) => p.id === activeProjectId)?.settings ?? null;

  const totalIssues = projects.reduce((sum, p) => sum + p.issues.length, 0);

  const filteredIssues = useMemo(
    () =>
      projects.reduce(
        (sum, p) =>
          sum + p.issues.filter((i) => activeStatuses.has(i.status)).length,
        0,
      ),
    [projects, activeStatuses],
  );

  const handleOpenSettings = (projectId: string) => {
    setActiveProjectId(projectId);
    setSidebarOpen(true);
  };

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
        settings={activeSettings}
      />
    </div>
  );
}
