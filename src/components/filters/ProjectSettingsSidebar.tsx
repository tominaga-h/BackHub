"use client";

import { useEffect, useMemo, useState } from "react";
import { Settings } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { UNSET_MILESTONE } from "@/types";
import type { Issue, ProjectFilters, ProjectSettings } from "@/types";

type ProjectSettingsSidebarProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectName?: string;
  settings: ProjectSettings | null;
  currentFilters?: ProjectFilters;
  onApply?: (filters: ProjectFilters) => void;
  issues?: Issue[];
};

/**
 * プロジェクト固有フィルターの設定サイドバー（右側からスライドイン）。
 * ステータス、担当者、課題種別、マイルストーンのチェックボックスフィルターを提供する。
 * 各フィルター項目の横には、選択中のステータスに基づく該当課題数を表示する。
 * @param open - サイドバーの開閉状態
 * @param onOpenChange - 開閉状態変更時のコールバック
 * @param projectName - 対象プロジェクト名
 * @param settings - プロジェクトの設定（ステータス一覧、担当者一覧等）
 * @param currentFilters - 現在適用中のフィルター状態
 * @param onApply - 「Update Setting」ボタン押下時のコールバック
 * @param issues - 対象プロジェクトの課題一覧（件数カウントに使用）
 */
export function ProjectSettingsSidebar({
  open,
  onOpenChange,
  projectName,
  settings,
  currentFilters,
  onApply,
  issues = [],
}: ProjectSettingsSidebarProps) {
  const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(
    new Set(),
  );
  const [selectedAssignees, setSelectedAssignees] = useState<Set<string>>(
    new Set(),
  );
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [selectedMilestones, setSelectedMilestones] = useState<Set<string>>(
    new Set(),
  );

  // サイドバーが開いた時に、現在のフィルター状態をローカルstateに復元する
  useEffect(() => {
    if (!open) return;
    if (currentFilters) {
      // 既にフィルターが適用済みならその値を復元
      setSelectedStatuses(new Set(currentFilters.statuses));
      setSelectedAssignees(new Set(currentFilters.assignees));
      setSelectedTypes(new Set(currentFilters.issueTypes));
      setSelectedMilestones(new Set(currentFilters.milestones));
    } else if (settings) {
      // フィルター未設定の場合は全選択をデフォルトにする
      setSelectedStatuses(
        new Set(settings.statuses.map((s) => s.name)),
      );
      setSelectedAssignees(
        new Set(settings.assignees.map((a) => a.name)),
      );
      setSelectedTypes(new Set(settings.issueTypes.map((t) => t.name)));
      setSelectedMilestones(
        new Set([UNSET_MILESTONE, ...settings.milestones.map((m) => m.name)]),
      );
    }
  }, [open, currentFilters, settings]);

  /** 選択中のステータスに該当する課題のみに絞り込んだリスト（件数カウントのベース） */
  const statusFilteredIssues = useMemo(
    () => issues.filter((issue) => selectedStatuses.has(issue.status)),
    [issues, selectedStatuses],
  );

  /** 担当者名 → 該当課題数のマップ */
  const assigneeIssueCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const issue of statusFilteredIssues) {
      const name = issue.assignee?.name;
      if (name) {
        counts.set(name, (counts.get(name) ?? 0) + 1);
      }
    }
    return counts;
  }, [statusFilteredIssues]);

  /** 選択中ステータスの課題に1件以上紐づく担当者のみを表示対象にする */
  const visibleAssignees = useMemo(
    () => settings?.assignees.filter((a) => assigneeIssueCounts.has(a.name)) ?? [],
    [settings?.assignees, assigneeIssueCounts],
  );

  /** 課題種別名 → 該当課題数のマップ */
  const issueTypeIssueCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const issue of statusFilteredIssues) {
      counts.set(issue.issueType, (counts.get(issue.issueType) ?? 0) + 1);
    }
    return counts;
  }, [statusFilteredIssues]);

  /** マイルストーン名 → 該当課題数のマップ（未設定は UNSET_MILESTONE キーでカウント） */
  const milestoneIssueCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const issue of statusFilteredIssues) {
      if (issue.milestones.length === 0) {
        counts.set(UNSET_MILESTONE, (counts.get(UNSET_MILESTONE) ?? 0) + 1);
      } else {
        for (const m of issue.milestones) {
          counts.set(m, (counts.get(m) ?? 0) + 1);
        }
      }
    }
    return counts;
  }, [statusFilteredIssues]);

  /**
   * Set<string> のステート更新用の汎用トグル関数。
   * 指定した値が Set に含まれていれば削除、なければ追加する。
   * @param setter - 更新対象のステートセッター
   * @param value - トグルする値
   */
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

  /**
   * 「Update Setting」ボタン押下時にフィルターを適用してサイドバーを閉じる。
   */
  const handleApply = () => {
    onApply?.({
      statuses: new Set(selectedStatuses),
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
          <p className="mt-4 text-sm font-bold text-gray-800 border-b bordery-gray-200 pb-3">{projectName}</p>
        )}

        <div className="mt-4 space-y-6">
          {/* Statuses */}
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-orange-600">
              Status
            </h3>
            <div className="space-y-2.5">
              {settings.statuses.map((status) => (
                <label
                  key={status.name}
                  className="flex cursor-pointer items-center gap-2"
                >
                  <Checkbox
                    checked={selectedStatuses.has(status.name)}
                    onCheckedChange={() =>
                      toggle(setSelectedStatuses, status.name)
                    }
                  />
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: status.color }}
                  />
                  <span className="text-sm text-gray-700">{status.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Assignees */}
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-orange-600">
              Assignees
            </h3>
            <div className="space-y-2.5">
              {visibleAssignees.length === 0 ? (
                <p className="text-xs text-gray-400">No assignees for selected statuses</p>
              ) : (
                visibleAssignees.map((assignee) => (
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
                      <span className="ml-1 text-gray-400">({assigneeIssueCounts.get(assignee.name) ?? 0})</span>
                    </span>
                  </label>
                ))
              )}
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
                  <span className="text-sm text-gray-700">
                    {type.name}
                    <span className="ml-1 text-gray-400">({issueTypeIssueCounts.get(type.name) ?? 0})</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Milestones */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-orange-600">
                Milestones
              </h3>
              {selectedMilestones.size > 0 && (
                <button
                  type="button"
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                  onClick={() => setSelectedMilestones(new Set())}
                >
                  Clear
                </button>
              )}
            </div>
            <div className="space-y-2.5">
              <label className="flex cursor-pointer items-center gap-2">
                <Checkbox
                  checked={selectedMilestones.has(UNSET_MILESTONE)}
                  onCheckedChange={() =>
                    toggle(setSelectedMilestones, UNSET_MILESTONE)
                  }
                />
                <span className="text-sm text-gray-500 italic">
                  未登録
                  <span className="ml-1 text-gray-400">({milestoneIssueCounts.get(UNSET_MILESTONE) ?? 0})</span>
                </span>
              </label>
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
                    <span className="ml-1 text-gray-400">({milestoneIssueCounts.get(milestone.name) ?? 0})</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Update Setting Button */}
        <div className="mt-8">
          <Button
            className="w-full bg-backhub text-white hover:bg-backhub-hover p-5 font-bold"
            onClick={handleApply}
          >
            Update Setting
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
