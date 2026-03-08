"use client";

import { User } from "lucide-react";
import type { Assignee } from "@/types";

type AssigneeSidebarProps = {
  assigneeOptions: Assignee[];
  hasUnassigned: boolean;
  activeAssignees: Set<string>;
  onAssigneeChange: (assignees: Set<string>) => void;
};

export function AssigneeSidebar({
  assigneeOptions,
  hasUnassigned,
  activeAssignees,
  onAssigneeChange,
}: AssigneeSidebarProps) {
  const allKeys = [
    ...assigneeOptions.map((a) => a.id.toString()),
    ...(hasUnassigned ? ["unassigned"] : []),
  ];

  const allChecked =
    assigneeOptions.length > 0 && allKeys.every((k) => activeAssignees.has(k));

  const toggleAll = () => {
    onAssigneeChange(allChecked ? new Set<string>() : new Set(allKeys));
  };

  const toggle = (key: string) => {
    const next = new Set(activeAssignees);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    onAssigneeChange(next);
  };

  return (
    <aside
      data-component="AssigneeSidebar"
      className="sticky top-0 h-screen w-64 shrink-0 overflow-y-auto border-r border-t border-gray-200 bg-white"
    >
      <div className="px-5 pb-6 pt-5">
        <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-gray-500">
          Assignees
        </h3>

        <label className="mb-3 flex cursor-pointer items-center gap-3 border-b border-gray-100 pb-3">
          <input
            type="checkbox"
            checked={allChecked}
            onChange={toggleAll}
            className="h-4 w-4 shrink-0 cursor-pointer rounded border-gray-300 text-backhub accent-backhub"
          />
          <span className="text-sm font-semibold text-gray-700">
            All
          </span>
        </label>

        <ul className="space-y-1">
          {assigneeOptions.map((assignee) => {
            const key = assignee.id.toString();
            const checked = activeAssignees.has(key);
            return (
              <li key={key}>
                <label className="flex cursor-pointer items-center gap-3 rounded-md px-1 py-1.5 transition-colors hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(key)}
                    className="h-4 w-4 shrink-0 cursor-pointer rounded border-gray-300 text-backhub accent-backhub"
                  />
                  {assignee.avatarUrl ? (
                    <img
                      src={assignee.avatarUrl}
                      alt={assignee.name}
                      className="h-6 w-6 rounded-full object-cover"
                    />
                  ) : (
                    <span
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                      style={{ backgroundColor: assignee.avatarColor }}
                    >
                      {assignee.initials}
                    </span>
                  )}
                  <span className="truncate text-sm text-gray-700">
                    {assignee.name}
                  </span>
                </label>
              </li>
            );
          })}

          {hasUnassigned && (
            <li>
              <label className="flex cursor-pointer items-center gap-3 rounded-md px-1 py-1.5 transition-colors hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={activeAssignees.has("unassigned")}
                  onChange={() => toggle("unassigned")}
                  className="h-4 w-4 shrink-0 cursor-pointer rounded border-gray-300 text-backhub accent-backhub"
                />
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-400 text-white">
                  <User className="h-3.5 w-3.5" />
                </span>
                <span className="truncate text-sm text-gray-700">未割当</span>
              </label>
            </li>
          )}
        </ul>
      </div>
    </aside>
  );
}
