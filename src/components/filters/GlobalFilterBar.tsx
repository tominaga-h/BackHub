"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

export const STATUS_OPTIONS = ["Open", "In Progress", "Closed"] as const;

const STATUS_PRESETS = [
  {
    label: "All",
    statuses: [...STATUS_OPTIONS],
    isActive: (active: Set<string>) =>
      STATUS_OPTIONS.every((s) => active.has(s)),
    activeClass: "bg-blue-600 text-white",
    inactiveClass: "bg-blue-50 text-blue-700 hover:bg-blue-100",
  },
  {
    label: "Not Completed",
    statuses: STATUS_OPTIONS.filter((s) => s !== "Closed") as string[],
    isActive: (active: Set<string>) =>
      active.has("Open") && active.has("In Progress") && !active.has("Closed"),
    activeClass: "bg-orange-500 text-white",
    inactiveClass: "bg-orange-50 text-orange-700 hover:bg-orange-100",
  },
] as const;

type GlobalFilterBarProps = {
  projectNames: string[];
  onProjectSelect?: (projectName: string | null) => void;
  activeStatuses: Set<string>;
  onStatusChange: (statuses: Set<string>) => void;
};

export function GlobalFilterBar({
  projectNames,
  onProjectSelect,
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

  const tabs = ["All Projects", ...projectNames];

  return (
    <div data-component="GlobalFilterBar" className="flex items-center justify-between px-6 py-3">
      <div className="flex items-center gap-6">
        {/* Project Tabs */}
        <div className="flex items-center gap-1">
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
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-3 border-l border-gray-200 pl-6">
          <span className="mr-1 text-xs font-medium uppercase tracking-wider text-gray-500">
            Status
          </span>

          {/* Preset Buttons */}
          <div className="flex items-center gap-1.5">
            {STATUS_PRESETS.map((preset) => {
              const active = preset.isActive(activeStatuses);
              return (
                <button
                  key={preset.label}
                  onClick={() => onStatusChange(new Set(preset.statuses))}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                    active ? preset.activeClass : preset.inactiveClass
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          <div className="mx-1 h-4 w-px bg-gray-200" />

          {STATUS_OPTIONS.map((status) => (
            <label
              key={status}
              className="flex cursor-pointer items-center gap-1.5"
            >
              <Checkbox
                checked={activeStatuses.has(status)}
                onCheckedChange={() => toggleStatus(status)}
              />
              <span className="text-sm text-gray-700">{status}</span>
            </label>
          ))}
        </div>
      </div>

      {/* New Issue Button */}
      <Button className="bg-backhub text-white hover:bg-backhub-hover">
        <Plus className="mr-1 h-4 w-4" />
        New Issue
      </Button>
    </div>
  );
}
