"use client";

import { useEffect, useState } from "react";
import { Settings } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import type { ProjectFilters, ProjectSettings } from "@/types";

type ProjectSettingsSidebarProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectName?: string;
  settings: ProjectSettings | null;
  currentFilters?: ProjectFilters;
  onApply?: (filters: ProjectFilters) => void;
};

export function ProjectSettingsSidebar({
  open,
  onOpenChange,
  projectName,
  settings,
  currentFilters,
  onApply,
}: ProjectSettingsSidebarProps) {
  const [selectedAssignees, setSelectedAssignees] = useState<Set<string>>(
    new Set(),
  );
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [selectedMilestones, setSelectedMilestones] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    if (!open) return;
    if (currentFilters) {
      setSelectedAssignees(new Set(currentFilters.assignees));
      setSelectedTypes(new Set(currentFilters.issueTypes));
      setSelectedMilestones(new Set(currentFilters.milestones));
    } else if (settings) {
      setSelectedAssignees(
        new Set(settings.assignees.map((a) => a.name)),
      );
      setSelectedTypes(new Set(settings.issueTypes.map((t) => t.name)));
      setSelectedMilestones(
        new Set(settings.milestones.map((m) => m.name)),
      );
    }
  }, [open, currentFilters, settings]);

  const toggle = (
    setter: React.Dispatch<React.SetStateAction<Set<string>>>,
    value: string,
  ) => {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      return next;
    });
  };

  const handleApply = () => {
    onApply?.({
      assignees: new Set(selectedAssignees),
      issueTypes: new Set(selectedTypes),
      milestones: new Set(selectedMilestones),
    });
    onOpenChange(false);
  };

  if (!settings) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        data-component="ProjectSettingsSidebar"
        className="w-[300px] overflow-y-auto sm:w-[300px] p-5"
      >
        <SheetHeader className="p-0">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Settings className="h-5 w-5 text-gray-500" />
            Project Settings
          </SheetTitle>
        </SheetHeader>

        {projectName && (
          <p className="mt-4 text-sm font-bold text-gray-800">{projectName}</p>
        )}

        <div className="mt-4 space-y-6">
          {/* Assignees */}
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-orange-600">
              Assignees
            </h3>
            <div className="space-y-2.5">
              {settings.assignees.map((assignee) => (
                <label
                  key={assignee.name}
                  className="flex cursor-pointer items-center gap-2"
                >
                  <Checkbox
                    checked={selectedAssignees.has(assignee.name)}
                    onCheckedChange={() =>
                      toggle(setSelectedAssignees, assignee.name)
                    }
                  />
                  <span className="text-sm text-gray-700">
                    {assignee.name}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Issue Types */}
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-orange-600">
              Issue Types
            </h3>
            <div className="space-y-2.5">
              {settings.issueTypes.map((type) => (
                <label
                  key={type.name}
                  className="flex cursor-pointer items-center gap-2"
                >
                  <Checkbox
                    checked={selectedTypes.has(type.name)}
                    onCheckedChange={() =>
                      toggle(setSelectedTypes, type.name)
                    }
                  />
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: type.color }}
                  />
                  <span className="text-sm text-gray-700">{type.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Milestones */}
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-orange-600">
              Milestones
            </h3>
            <div className="space-y-2.5">
              {settings.milestones.map((milestone) => (
                <label
                  key={milestone.name}
                  className="flex cursor-pointer items-center gap-2"
                >
                  <Checkbox
                    checked={selectedMilestones.has(milestone.name)}
                    onCheckedChange={() =>
                      toggle(setSelectedMilestones, milestone.name)
                    }
                  />
                  <span className="text-sm text-gray-700">
                    {milestone.name}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Update Filters Button */}
        <div className="mt-8">
          <Button
            className="w-full bg-backhub text-white hover:bg-backhub-hover p-5 font-bold"
            onClick={handleApply}
          >
            Update Filters
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
