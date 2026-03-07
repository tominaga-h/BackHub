"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { GlobalFilterBar } from "@/components/filters/GlobalFilterBar";
import { ProjectSection } from "@/components/issues/ProjectSection";
import { ProjectSettingsSidebar } from "@/components/filters/ProjectSettingsSidebar";
import { Button } from "@/components/ui/button";
import { mockProjects } from "@/lib/mock-data";

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  const activeSettings =
    mockProjects.find((p) => p.id === activeProjectId)?.settings ?? null;

  const totalIssues = mockProjects.reduce(
    (sum, p) => sum + p.issues.length,
    0
  );

  const handleProjectSelect = (projectName: string | null) => {
    if (!projectName) return;
    const id = `project-${projectName.toLowerCase().replace(/\s+/g, '-')}`;
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleOpenSettings = (projectId: string) => {
    setActiveProjectId(projectId);
    setSidebarOpen(true);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#f5f7f9]">
      <Header />
      <GlobalFilterBar projectNames={mockProjects.map((p) => p.name)} onProjectSelect={handleProjectSelect} />

      <main className="flex-1 px-6 pb-6">
        <div className="space-y-6">
          {mockProjects.map((project) => (
            <ProjectSection
              key={project.id}
              project={project}
              onOpenSettings={handleOpenSettings}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-between text-sm text-gray-500">
          <p>
            Showing {totalIssues} of {totalIssues} issues across{" "}
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
