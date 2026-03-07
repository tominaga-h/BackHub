"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

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
};

export function GlobalFilterBar({
  projectNames,
  onProjectSelect,
  statusOptions,
  activeStatuses,
  onStatusChange,
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

  const allActive =
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
      </div>
      <div className="px-6 pb-3">
        <div className="flex flex-col gap-y-2">
          {/* Project Tabs */}
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
          {/* Status Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="mr-1 text-xs font-medium uppercase tracking-wider text-gray-500">
              Status
            </span>
            <button
              onClick={() =>
                onStatusChange(new Set(statusOptions.map((s) => s.name)))
              }
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                allActive
                  ? "bg-blue-600 text-white"
                  : "bg-blue-50 text-blue-700 hover:bg-blue-100"
              }`}
            >
              All
            </button>
            <div className="mx-1 h-4 w-px bg-gray-200" />
            {statusOptions.map((status) => (
              <label
                key={status.name}
                className="flex cursor-pointer items-center gap-1.5"
              >
                <Checkbox
                  checked={activeStatuses.has(status.name)}
                  onCheckedChange={() => toggleStatus(status.name)}
                />
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: status.color }}
                />
                <span className="text-sm text-gray-700">{status.name}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
