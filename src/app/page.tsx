"use client";

import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/layout/Header";
import { GlobalFilterBar } from "@/components/filters/GlobalFilterBar";
import { ProjectSection } from "@/components/issues/ProjectSection";
import { ProjectSettingsSidebar } from "@/components/filters/ProjectSettingsSidebar";
import { Button } from "@/components/ui/button";
import type { Project } from "@/types";

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeStatuses, setActiveStatuses] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/backlog/projects")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then((data: { projects: Project[]; errors?: string[] }) => {
        setProjects(data.projects);
        const allStatuses = new Set<string>();
        data.projects.forEach((p) =>
          p.settings.statuses.forEach((s) => allStatuses.add(s.name)),
        );
        setActiveStatuses(allStatuses);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const statusOptions = useMemo(() => {
    const seen = new Map<string, string>();
    projects.forEach((p) =>
      p.settings.statuses.forEach((s) => {
        if (!seen.has(s.name)) seen.set(s.name, s.color);
      }),
    );
    return Array.from(seen.entries()).map(([name, color]) => ({ name, color }));
  }, [projects]);

  const activeSettings =
    projects.find((p) => p.id === activeProjectId)?.settings ?? null;

  const totalIssues = projects.reduce(
    (sum, p) => sum + p.issues.length,
    0,
  );

  const filteredIssues = useMemo(
    () =>
      projects.reduce(
        (sum, p) =>
          sum + p.issues.filter((i) => activeStatuses.has(i.status)).length,
        0,
      ),
    [projects, activeStatuses],
  );

  const handleProjectSelect = (projectName: string | null) => {
    if (!projectName) return;
    const id = `project-${projectName.toLowerCase().replace(/\s+/g, "-")}`;
    const target = document.getElementById(id);
    if (!target) return;

    const filterBar = document.querySelector<HTMLElement>(
      '[data-component="GlobalFilterBar"]',
    );
    const offset = filterBar ? filterBar.offsetHeight + 12 : 24;
    const top = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: "smooth" });
  };

  const handleOpenSettings = (projectId: string) => {
    setActiveProjectId(projectId);
    setSidebarOpen(true);
  };

  if (loading) {
    return (
      <div data-component="Home" className="flex min-h-screen flex-col bg-[#f5f7f9]">
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
      <div data-component="Home" className="flex min-h-screen flex-col bg-[#f5f7f9]">
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
    <div data-component="Home" className="flex min-h-screen flex-col bg-[#f5f7f9]">
      <Header />
      <GlobalFilterBar
        projectNames={projects.map((p) => p.name)}
        onProjectSelect={handleProjectSelect}
        statusOptions={statusOptions}
        activeStatuses={activeStatuses}
        onStatusChange={setActiveStatuses}
      />

      <main className="flex-1 px-6 pb-6">
        <div className="space-y-6">
          {projects.map((project) => (
            <ProjectSection
              key={project.id}
              project={project}
              onOpenSettings={handleOpenSettings}
              activeStatuses={activeStatuses}
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
      </main>

      <ProjectSettingsSidebar
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
        settings={activeSettings}
      />
    </div>
  );
}
