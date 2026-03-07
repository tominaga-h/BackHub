"use client";

import { useMemo, useState } from "react";
import { Header } from "@/components/layout/Header";
import { GlobalFilterBar } from "@/components/filters/GlobalFilterBar";
import { ProjectSection } from "@/components/issues/ProjectSection";
import { ProjectSettingsSidebar } from "@/components/filters/ProjectSettingsSidebar";
import { Button } from "@/components/ui/button";
import { mockProjects } from "@/lib/mock-data";
import type { IssueStatus } from "@/types";

const STATUS_LABEL_TO_DATA: Record<string, IssueStatus> = {
  Open: "OPEN",
  "In Progress": "IN PROGRESS",
  Closed: "CLOSED",
};

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeStatuses, setActiveStatuses] = useState<Set<string>>(
    () => new Set(["Open", "In Progress"])
  );

  const activeSettings =
    mockProjects.find((p) => p.id === activeProjectId)?.settings ?? null;

  const filteredDataStatuses = useMemo(
    () => new Set([...activeStatuses].map((s) => STATUS_LABEL_TO_DATA[s]).filter(Boolean)),
    [activeStatuses]
  );

  const totalIssues = mockProjects.reduce(
    (sum, p) => sum + p.issues.length,
    0
  );

  const filteredIssues = useMemo(
    () =>
      mockProjects.reduce(
        (sum, p) =>
          sum + p.issues.filter((i) => filteredDataStatuses.has(i.status)).length,
        0
      ),
    [filteredDataStatuses]
  );

  const handleProjectSelect = (projectName: string | null) => {
    if (!projectName) return;
    const id = `project-${projectName.toLowerCase().replace(/\s+/g, '-')}`;
    const target = document.getElementById(id);
    if (!target) return;

    const filterBar = document.querySelector<HTMLElement>('[data-component="GlobalFilterBar"]');
    const offset = filterBar ? filterBar.offsetHeight + 12 : 24;
    const top = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: 'smooth' });
  };

  const handleOpenSettings = (projectId: string) => {
    setActiveProjectId(projectId);
    setSidebarOpen(true);
  };

  return (
    <div data-component="Home" className="flex min-h-screen flex-col bg-[#f5f7f9]">
      <Header />
      <GlobalFilterBar
        projectNames={mockProjects.map((p) => p.name)}
        onProjectSelect={handleProjectSelect}
        activeStatuses={activeStatuses}
        onStatusChange={setActiveStatuses}
      />

      <main className="flex-1 px-6 pb-6">
        <div className="space-y-6">
          {mockProjects.map((project) => (
            <ProjectSection
              key={project.id}
              project={project}
              onOpenSettings={handleOpenSettings}
              activeStatuses={activeStatuses}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-between text-sm text-gray-500">
          <p>
            Showing {filteredIssues} of {totalIssues} issues across{" "}
            {mockProjects.length} projects
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
      </main>

      <ProjectSettingsSidebar
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
        settings={activeSettings}
      />
    </div>
  );
}
