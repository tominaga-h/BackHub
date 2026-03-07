"use client";

import { useMemo, useState, useCallback } from "react";
import { Settings, Download, ArrowUpDown, ArrowUp, ArrowDown, LayoutGrid } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Project, Issue, IssueStatus } from "@/types";

type SortKey = "id" | "title" | "assignee" | "status" | "remarks";
type SortDirection = "asc" | "desc";

const STATUS_LABEL_TO_DATA: Record<string, IssueStatus> = {
  Open: "OPEN",
  "In Progress": "IN PROGRESS",
  Closed: "CLOSED",
};

function StatusBadge({ status }: { status: IssueStatus }) {
  const styles: Record<IssueStatus, string> = {
    OPEN: "border-green-500 bg-green-50 text-green-700",
    "IN PROGRESS": "border-orange-500 bg-orange-50 text-orange-700",
    CLOSED: "border-gray-400 bg-gray-50 text-gray-600",
  };

  return (
    <span
      data-component="StatusBadge"
      className={`inline-block whitespace-nowrap rounded border px-2 py-0.5 text-xs font-semibold uppercase ${styles[status]}`}
    >
      {status}
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

  const handleSort = useCallback((key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  }, [sortKey]);

  const filteredIssues = useMemo(() => {
    const dataStatuses = new Set(
      [...activeStatuses].map((s) => STATUS_LABEL_TO_DATA[s]).filter(Boolean)
    );
    return project.issues.filter((issue) => dataStatuses.has(issue.status));
  }, [project.issues, activeStatuses]);

  const sortedIssues = useMemo(() => {
    if (!sortKey) return filteredIssues;

    const getValue = (issue: Issue): string => {
      switch (sortKey) {
        case "assignee":
          return issue.assignee.name;
        default:
          return issue[sortKey];
      }
    };

    return [...filteredIssues].sort((a, b) => {
      const aVal = getValue(a);
      const bVal = getValue(b);
      const cmp = aVal.localeCompare(bVal, "ja");
      return sortDirection === "asc" ? cmp : -cmp;
    });
  }, [filteredIssues, sortKey, sortDirection]);

  return (
    <div data-component="ProjectSection" id={`project-${project.name.toLowerCase().replace(/\s+/g, '-')}`} className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      {/* Project Header */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-5 w-5 text-gray-500" />
          <h2 className="text-base font-bold text-gray-800">
            {project.name}
          </h2>
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
              {([
                { key: "id" as SortKey, label: "ID", width: "w-[80px]" },
                { key: "title" as SortKey, label: "Issue Title", width: "" },
                { key: "assignee" as SortKey, label: "Assignee", width: "w-[150px]" },
                { key: "status" as SortKey, label: "Status", width: "w-[120px]" },
                { key: "remarks" as SortKey, label: "Remarks", width: "w-[220px]" },
              ]).map((col) => {
                const isActive = sortKey === col.key;
                const SortIcon = isActive
                  ? sortDirection === "asc" ? ArrowUp : ArrowDown
                  : ArrowUpDown;
                return (
                  <th
                    key={col.key}
                    className={`${col.width} cursor-pointer select-none px-4 py-2.5 text-left text-xs font-semibold uppercase text-gray-500 hover:text-gray-700`}
                    onClick={() => handleSort(col.key)}
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      <SortIcon className={`h-3.5 w-3.5 ${isActive ? "text-gray-700" : "text-gray-400"}`} />
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sortedIssues.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">
                  No matching issues
                </td>
              </tr>
            ) : (
              sortedIssues.map((issue) => (
                <tr
                  key={issue.id}
                  className="cursor-pointer border-b border-gray-100 last:border-b-0 hover:bg-gray-50"
                  onClick={() => window.open("#", "_blank")}
                >
                  <td className="px-4 py-3 text-sm font-medium text-gray-600">
                    {issue.id}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-800">
                    {issue.title}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7 shrink-0">
                        <AvatarFallback
                          className={`text-xs font-medium ${issue.assignee.avatarColor}`}
                        >
                          {issue.assignee.initials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate text-sm text-gray-700">
                        {issue.assignee.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={issue.status} />
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
