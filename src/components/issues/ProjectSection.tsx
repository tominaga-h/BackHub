"use client";

import { useMemo, useState, useCallback } from "react";
import {
  Settings,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  LayoutGrid,
  Pencil,
} from "lucide-react";
import { UNSET_MILESTONE } from "@/types";
import type { Project, Issue, ProjectFilters } from "@/types";

type SortKey = "id" | "title" | "assignee" | "issueType" | "status" | "created" | "updated" | "milestone" | "remarks";
type SortDirection = "asc" | "desc";

type ColumnDef = {
  key: SortKey;
  label: string;
  width: string;
};

const COLUMNS: readonly ColumnDef[] = [
  { key: "issueType", label: "種別", width: "w-[100px]" },
  { key: "id", label: "キー", width: "w-[200px]" },
  { key: "title", label: "件名", width: "w-[800px]" },
  { key: "assignee", label: "担当者", width: "w-[150px]" },
  { key: "status", label: "状態", width: "w-[130px]" },
  { key: "created", label: "登録日", width: "w-[130px]" },
  { key: "updated", label: "更新日", width: "w-[130px]" },
  { key: "milestone", label: "マイルストーン", width: "w-[180px]" },
  { key: "remarks", label: "備考", width: "w-[300px]" },
] as const;

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

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
  projectFilters?: ProjectFilters;
  onRemarksChange?: (issueId: string, remarks: string) => void;
};

export function ProjectSection({
  project,
  onOpenSettings,
  projectFilters,
  onRemarksChange,
}: ProjectSectionProps) {
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [editingIssueId, setEditingIssueId] = useState<string | null>(null);
  const [remarksMap, setRemarksMap] = useState<Record<string, string>>({});

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
    return project.issues.filter((issue) => {
      if (!projectFilters) return true;
      const statusMatch = projectFilters.statuses.has(issue.status);
      const assigneeMatch = issue.assignee
        ? projectFilters.assignees.has(issue.assignee.name)
        : true;
      const typeMatch = projectFilters.issueTypes.has(issue.issueType);
      const milestoneMatch =
        issue.milestones.length === 0
          ? projectFilters.milestones.has(UNSET_MILESTONE)
          : issue.milestones.some((m) => projectFilters.milestones.has(m));
      return statusMatch && assigneeMatch && typeMatch && milestoneMatch;
    });
  }, [project.issues, projectFilters]);

  const sortedIssues = useMemo(() => {
    if (!sortKey) return filteredIssues;

    const getValue = (issue: Issue): string => {
      switch (sortKey) {
        case "assignee":
          return issue.assignee?.name ?? "";
        case "milestone":
          return issue.milestones.join(", ");
        case "id":
        case "title":
        case "issueType":
        case "status":
        case "created":
        case "updated":
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
      className="overflow-clip rounded-lg border border-gray-200 bg-white"
    >
      {/* Project Header */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-5 w-5 text-gray-500" />
          <h2 className="text-base font-bold text-gray-800">{project.name}</h2>
          <span className="text-sm text-gray-400">({filteredIssues.length})</span>
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
      <div className="overflow-x-scroll">
        <table className="w-full min-w-[1560px] table-fixed">
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
                  colSpan={COLUMNS.length}
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
                    {formatDate(issue.created)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatDate(issue.updated)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {issue.milestones.join(", ")}
                  </td>
                  <td
                    className="px-4 py-3 text-sm text-gray-500"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {editingIssueId === issue.id ? (
                      <input
                        type="text"
                        autoFocus
                        className="w-full rounded border border-gray-300 px-2 py-1 text-sm text-gray-700 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                        defaultValue={remarksMap[issue.id] ?? issue.remarks}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const value = e.currentTarget.value;
                            setRemarksMap((prev) => ({ ...prev, [issue.id]: value }));
                            onRemarksChange?.(issue.id, value);
                            setEditingIssueId(null);
                          }
                          if (e.key === "Escape") {
                            setEditingIssueId(null);
                          }
                        }}
                      />
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          className="shrink-0 text-gray-400 hover:text-gray-600"
                          onClick={() => setEditingIssueId(issue.id)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <span>{remarksMap[issue.id] ?? issue.remarks}</span>
                      </div>
                    )}
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
