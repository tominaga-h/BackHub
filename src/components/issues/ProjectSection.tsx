"use client";

import { useMemo, useState, useCallback } from "react";
import {
  Settings,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  LayoutGrid,
} from "lucide-react";
import type { Project, Issue } from "@/types";

type SortKey = "id" | "title" | "assignee" | "issueType" | "status" | "remarks";
type SortDirection = "asc" | "desc";

type ColumnDef = {
  key: SortKey;
  label: string;
  width: string;
};

const COLUMNS: readonly ColumnDef[] = [
  { key: "issueType", label: "Type", width: "w-[120px]" },
  { key: "id", label: "ID", width: "w-[300px]" },
  { key: "title", label: "Issue Title", width: "" },
  { key: "assignee", label: "Assignee", width: "w-[150px]" },
  { key: "status", label: "Status", width: "w-[150px]" },
  { key: "remarks", label: "Remarks", width: "w-[300px]" },
] as const;

function ColorBadge({ name, color }: { name: string; color: string }) {
  return (
    <span
      data-component="ColorBadge"
      className="inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold text-white"
      style={{ backgroundColor: color }}
    >
      {name}
    </span>
  );
}

type ProjectSectionProps = {
  project: Project;
  onOpenSettings: (projectId: string) => void;
  activeStatuses: Set<string>;
};

export function ProjectSection({
  project,
  onOpenSettings,
  activeStatuses,
}: ProjectSectionProps) {
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const handleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) {
        setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(key);
        setSortDirection("asc");
      }
    },
    [sortKey],
  );

  const filteredIssues = useMemo(() => {
    return project.issues.filter((issue) => activeStatuses.has(issue.status));
  }, [project.issues, activeStatuses]);

  const sortedIssues = useMemo(() => {
    if (!sortKey) return filteredIssues;

    const getValue = (issue: Issue): string => {
      switch (sortKey) {
        case "assignee":
          return issue.assignee?.name ?? "";
        case "id":
        case "title":
        case "issueType":
        case "status":
        case "remarks":
          return issue[sortKey];
        default:
          return "";
      }
    };

    return [...filteredIssues].sort((a, b) => {
      const aVal = getValue(a);
      const bVal = getValue(b);
      const cmp = aVal.localeCompare(bVal, "ja");
      return sortDirection === "asc" ? cmp : -cmp;
    });
  }, [filteredIssues, sortKey, sortDirection]);

  const statusColorMap = useMemo(() => {
    const map = new Map<string, string>();
    project.settings.statuses.forEach((s) => map.set(s.name, s.color));
    return map;
  }, [project.settings.statuses]);

  return (
    <div
      data-component="ProjectSection"
      id={`project-${project.name.toLowerCase().replace(/\s+/g, "-")}`}
      className="overflow-hidden rounded-lg border border-gray-200 bg-white"
    >
      {/* Project Header */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-5 w-5 text-gray-500" />
          <h2 className="text-base font-bold text-gray-800">{project.name}</h2>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onOpenSettings(project.id)}
            className="text-gray-400 hover:text-gray-600"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Issue Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="border-b border-gray-200">
              {COLUMNS.map((col) => {
                const isActive = sortKey === col.key;
                const SortIcon = isActive
                  ? sortDirection === "asc"
                    ? ArrowUp
                    : ArrowDown
                  : ArrowUpDown;
                return (
                  <th
                    key={col.key}
                    className={`${col.width} cursor-pointer select-none px-4 py-2.5 text-left text-xs font-semibold uppercase text-gray-500 hover:text-gray-700`}
                    onClick={() => handleSort(col.key)}
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      <SortIcon
                        className={`h-3.5 w-3.5 ${isActive ? "text-gray-700" : "text-gray-400"}`}
                      />
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sortedIssues.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-sm text-gray-400"
                >
                  No matching issues
                </td>
              </tr>
            ) : (
              sortedIssues.map((issue) => (
                <tr
                  key={issue.id}
                  className="cursor-pointer border-b border-gray-100 last:border-b-0 hover:bg-gray-50"
                  onClick={() => window.open(issue.url, "_blank")}
                >
                  <td className="px-4 py-3">
                    <ColorBadge
                      name={issue.issueType}
                      color={issue.issueTypeColor}
                    />
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-600">
                    {issue.id}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-800">
                    {issue.title}
                  </td>
                  <td className="px-4 py-3">
                    {issue.assignee ? (
                      <div className="flex items-center gap-2">
                        {issue.assignee.avatarUrl && (
                          <img
                            src={issue.assignee.avatarUrl}
                            alt={issue.assignee.name}
                            className="hidden h-7 w-7 shrink-0 rounded-full object-cover"
                            onLoad={(e) => e.currentTarget.classList.remove("hidden")}
                          />
                        )}
                        <span className="truncate text-sm text-gray-700">
                          {issue.assignee.name}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">Unassigned</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <ColorBadge
                      name={issue.status}
                      color={
                        statusColorMap.get(issue.status) ?? issue.statusColor
                      }
                    />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {issue.remarks}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
