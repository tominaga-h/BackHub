"use client";

import { Settings, Download, ArrowUpDown, LayoutGrid } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Project, IssueStatus } from "@/types";

function StatusBadge({ status }: { status: IssueStatus }) {
  const styles: Record<IssueStatus, string> = {
    OPEN: "border-green-500 bg-green-50 text-green-700",
    "IN PROGRESS": "border-orange-500 bg-orange-50 text-orange-700",
    CLOSED: "border-gray-400 bg-gray-50 text-gray-600",
  };

  return (
    <span
      className={`inline-block whitespace-nowrap rounded border px-2 py-0.5 text-xs font-semibold uppercase ${styles[status]}`}
    >
      {status}
    </span>
  );
}

type ProjectSectionProps = {
  project: Project;
  onOpenSettings: (projectId: string) => void;
};

export function ProjectSection({
  project,
  onOpenSettings,
}: ProjectSectionProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
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
          <button className="text-gray-400 hover:text-gray-600">
            <Download className="h-5 w-5" />
          </button>
          <button className="text-gray-400 hover:text-gray-600">
            <ArrowUpDown className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Issue Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="w-[80px] px-4 py-2.5 text-left text-xs font-semibold uppercase text-gray-500">
                ID
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase text-gray-500">
                Issue Title
              </th>
              <th className="w-[150px] px-4 py-2.5 text-left text-xs font-semibold uppercase text-gray-500">
                Assignee
              </th>
              <th className="w-[120px] px-4 py-2.5 text-left text-xs font-semibold uppercase text-gray-500">
                Status
              </th>
              <th className="w-[220px] px-4 py-2.5 text-left text-xs font-semibold uppercase text-gray-500">
                Remarks
              </th>
            </tr>
          </thead>
          <tbody>
            {project.issues.map((issue) => (
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
