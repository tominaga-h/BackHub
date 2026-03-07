"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { GlobalFilterBar } from "@/components/filters/GlobalFilterBar";
import { ViewTabs } from "@/components/layout/ViewTabs";
import { AssigneeSidebar } from "@/components/filters/AssigneeSidebar";
import { ProjectDataProvider, useProjectData } from "@/contexts/ProjectDataContext";

function DashboardShell({ children }: { children: React.ReactNode }) {
  const {
    loading, error, projectNames, statusOptions, activeStatuses, setActiveStatuses,
    filteredAssigneeOptions, activeAssignees, setActiveAssignees,
  } = useProjectData();
  const pathname = usePathname();
  const isAssigneesView = pathname === "/assignees";

  const scrollToElement = (elementId: string) => {
    const target = document.getElementById(elementId);
    if (!target) return;

    const filterBar = document.querySelector<HTMLElement>(
      '[data-component="GlobalFilterBar"]',
    );
    const offset = filterBar ? filterBar.offsetHeight + 12 : 24;
    const top = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: "smooth" });
  };

  const handleProjectSelect = (projectName: string | null) => {
    if (!projectName) return;
    scrollToElement(`project-${projectName.toLowerCase().replace(/\s+/g, "-")}`);
  };

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
        showAssigneeFilter={isAssigneesView}
        assigneeFilterOptions={filteredAssigneeOptions.assignees.filter(a => activeAssignees.has(a.id.toString()))}
        hasUnassigned={filteredAssigneeOptions.hasUnassigned && activeAssignees.has("unassigned")}
        onAssigneeSelect={handleAssigneeSelect}
      />
      <ViewTabs />
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
