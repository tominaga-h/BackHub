"use client";

import { useState } from "react";
import { ArrowUp, SlidersHorizontal, User } from "lucide-react";
import type { Assignee } from "@/types";

export type StatusOption = {
  name: string;
  color: string;
};

type GlobalFilterBarProps = {
  projectNames: string[];
  onProjectSelect?: (projectName: string | null) => void;
  statusOptions: StatusOption[];
  activeStatuses: Set<string>;
  onStatusChange: (statuses: Set<string>) => void;
  showProjectFilter?: boolean;
  showAssigneeFilter?: boolean;
  assigneeFilterOptions?: Assignee[];
  hasUnassigned?: boolean;
  onAssigneeSelect?: (assigneeId: string) => void;
};

export function GlobalFilterBar({
  projectNames,
  onProjectSelect,
  statusOptions,
  activeStatuses,
  onStatusChange,
  showProjectFilter = true,
  showAssigneeFilter = false,
  assigneeFilterOptions,
  hasUnassigned,
  onAssigneeSelect,
}: GlobalFilterBarProps) {
  const [activeProject, setActiveProject] = useState("All Projects");

  const toggleStatus = (status: string) => {
    const next = new Set(activeStatuses);
    if (next.has(status)) {
      next.delete(status);
    } else {
      next.add(status);
    }
    onStatusChange(next);
  };

  const allStatusesActive =
    statusOptions.length > 0 &&
    statusOptions.every((s) => activeStatuses.has(s.name));

  const tabs = [...projectNames];

  return (
    <div data-component="GlobalFilterBar" className="sticky top-0 z-30 m-4 my-3 rounded-xl bg-white p-3 shadow-md">
      <div className="mb-2 flex items-center gap-2 border-b border-gray-200 px-1 pb-2">
        <SlidersHorizontal className="h-4 w-4 text-backhub" />
        <span className="text-sm font-semibold tracking-wide text-gray-700">
          Filters
        </span>
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        >
          <ArrowUp className="h-3.5 w-3.5" />
          TOPへ戻る
        </button>
      </div>
      <div className="px-6 pb-3">
        <div className="flex flex-col gap-y-2">
          {/* Project Tabs */}
          {showProjectFilter && (
            <div className="flex flex-wrap items-center gap-1">
              <span className="mr-2 text-xs font-medium uppercase tracking-wider text-gray-500">
                Project
              </span>
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveProject(tab);
                    onProjectSelect?.(tab === "All Projects" ? null : tab);
                  }}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    activeProject === tab
                      ? "bg-backhub text-white"
                      : "text-gray-600 bg-gray-100 hover:bg-gray-300"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          )}
          {showAssigneeFilter && assigneeFilterOptions && (
            <div className="flex flex-wrap items-center gap-1">
              <span className="mr-2 text-xs font-medium uppercase tracking-wider text-gray-500">
                Human
              </span>
              {assigneeFilterOptions.map((a) => (
                <button
                  key={a.id}
                  onClick={() => onAssigneeSelect?.(a.id.toString())}
                  className="inline-flex items-center gap-1.5 rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-300"
                >
                  {a.avatarUrl ? (
                    <img
                      src={a.avatarUrl}
                      alt={a.name}
                      className="h-5 w-5 rounded-full object-cover"
                    />
                  ) : (
                    <span
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
                      style={{ backgroundColor: a.avatarColor }}
                    >
                      {a.initials}
                    </span>
                  )}
                  {a.name}
                </button>
              ))}
              {hasUnassigned && (
                <button
                  onClick={() => onAssigneeSelect?.("unassigned")}
                  className="inline-flex items-center gap-1.5 rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-300"
                >
                  <User className="h-4 w-4 text-gray-400" />
                  未割当
                </button>
              )}
            </div>
          )}
          {/* Status Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs font-medium uppercase tracking-wider text-gray-500">
              Status
            </span>
            <button
              onClick={() =>
                onStatusChange(new Set(statusOptions.map((s) => s.name)))
              }
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                allStatusesActive
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              All
            </button>
            {statusOptions.map((status) => {
              const isActive = activeStatuses.has(status.name);
              return (
                <button
                  key={status.name}
                  onClick={() => toggleStatus(status.name)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    isActive
                      ? "border-current bg-opacity-15 text-gray-800"
                      : "border-gray-200 bg-gray-100 text-gray-400"
                  }`}
                  style={
                    isActive
                      ? { backgroundColor: status.color, color: "white", fontWeight: "bold" }
                      : undefined
                  }
                >
                  {status.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
