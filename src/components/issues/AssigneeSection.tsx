"use client";

import { useMemo, useState, useCallback, useRef } from "react";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  User,
  Pencil,
} from "lucide-react";
import type { Assignee, IssueWithProject } from "@/types";

type SortKey = "id" | "title" | "project" | "issueType" | "status" | "created" | "updated" | "milestone" | "remarks";
type SortDirection = "asc" | "desc";

type ColumnDef = {
  key: SortKey;
  label: string;
  width: string;
};

const COLUMNS: readonly ColumnDef[] = [
  { key: "project", label: "プロジェクト", width: "w-[250px]" },
  { key: "issueType", label: "種別", width: "w-[100px]" },
  { key: "id", label: "キー", width: "w-[250px]" },
  { key: "title", label: "件名", width: "w-[500px]" },
  { key: "status", label: "状態", width: "w-[130px]" },
  { key: "created", label: "登録日", width: "w-[130px]" },
  { key: "updated", label: "更新日", width: "w-[130px]" },
  { key: "milestone", label: "マイルストーン", width: "w-[180px]" },
  { key: "remarks", label: "備考", width: "w-[300px]" },
] as const;

/**
 * ISO 8601形式の日付文字列を "YYYY/MM/DD" 形式にフォーマットする。
 * @param iso - ISO 8601形式の日付文字列
 * @returns "YYYY/MM/DD" 形式の文字列
 */
function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * 指定した色を背景色とするラベルバッジ。ステータスや課題種別の表示に使用する。
 * @param name - バッジに表示するテキスト
 * @param color - 背景色（CSS color値）
 */
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

type AssigneeSectionProps = {
  assignee: Assignee | null;
  issues: IssueWithProject[];
  statusColorMap: Map<string, string>;
  onRemarksChange?: (issueId: string, remarks: string) => void;
};

/**
 * 担当者ビューにおける1人分の担当者セクション。
 * 担当者のアバター・名前をヘッダーに表示し、その担当者に紐づく課題をテーブルで一覧する。
 * カラムヘッダークリックでソート、備考欄のインライン編集に対応する。
 * @param assignee - 担当者情報（null の場合は「未割当」として表示）
 * @param issues - この担当者に紐づく課題一覧（プロジェクト情報付き）
 * @param statusColorMap - ステータス名 → 色のマップ
 * @param onRemarksChange - 備考変更時のコールバック
 */
export function AssigneeSection({
  assignee,
  issues,
  statusColorMap,
  onRemarksChange,
}: AssigneeSectionProps) {
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [editingIssueId, setEditingIssueId] = useState<string | null>(null);
  /** ローカルで編集された備考のキャッシュ（issueId → テキスト） */
  const [remarksMap, setRemarksMap] = useState<Record<string, string>>({});
  /** Escape 押下時に onBlur での保存をスキップするためのフラグ */
  const cancelledRef = useRef(false);

  /**
   * カラムヘッダークリック時のソート切り替え。
   * 同じカラムをクリックすると昇順/降順をトグル、別カラムなら昇順にリセットする。
   * @param key - ソート対象のカラムキー
   */
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

  /** ソートキーに基づいて課題を並び替えた配列（ソート未指定時は元の順序を維持） */
  const sortedIssues = useMemo(() => {
    if (!sortKey) return issues;

    // 各課題からソート対象の文字列値を取得するヘルパー
    const getValue = (issue: IssueWithProject): string => {
      switch (sortKey) {
        case "project":
          return issue.projectName;
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

    return [...issues].sort((a, b) => {
      const aVal = getValue(a);
      const bVal = getValue(b);
      const cmp = aVal.localeCompare(bVal, "ja");
      return sortDirection === "asc" ? cmp : -cmp;
    });
  }, [issues, sortKey, sortDirection]);

  const assigneeLabel = assignee?.name ?? "未割当";
  const sectionId = `assignee-${assignee?.id ?? "unassigned"}`;

  return (
    <div
      data-component="AssigneeSection"
      id={sectionId}
      className="overflow-clip rounded-lg border border-gray-200 bg-white"
    >
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3">
        <div className="flex items-center gap-2">
          {assignee?.avatarUrl ? (
            <img
              src={assignee.avatarUrl}
              alt={assignee.name}
              className="h-6 w-6 rounded-full object-cover"
            />
          ) : (
            <User className="h-5 w-5 text-gray-500" />
          )}
          <h2 className="text-base font-bold text-gray-800">{assigneeLabel}</h2>
          <span className="inline-block text-sm text-gray-400 border rounded-lg border-gray-200 px-2 py-1">{issues.length} {issues.length > 2 ? "issues" : "issue"}</span>
        </div>
      </div>

      <div className="overflow-x-scroll">
        <table className="w-full min-w-[1690px] table-fixed">
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
                    <span className="truncate text-sm text-gray-700">
                      {issue.projectName}
                    </span>
                  </td>
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
                            cancelledRef.current = true;
                            setEditingIssueId(null);
                          }
                        }}
                        onBlur={(e) => {
                          if (cancelledRef.current) {
                            cancelledRef.current = false;
                            return;
                          }
                          const value = e.currentTarget.value;
                          setRemarksMap((prev) => ({ ...prev, [issue.id]: value }));
                          onRemarksChange?.(issue.id, value);
                          setEditingIssueId(null);
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
