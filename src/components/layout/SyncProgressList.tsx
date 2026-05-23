import { Check, Circle, Loader2, AlertTriangle } from "lucide-react";
import type { SyncItem, SyncItemStatus } from "@/contexts/ProjectDataContext";

/** 各同期状態に対応するアイコン・色・ラベルの定義（TSX 外でデータ定義） */
const STATUS_PRESENTATION: Record<
  SyncItemStatus,
  { label: string; textClass: string }
> = {
  pending: { label: "待機中", textClass: "text-gray-400" },
  syncing: { label: "読み込み中", textClass: "text-backhub" },
  done: { label: "完了", textClass: "text-gray-600" },
  error: { label: "失敗", textClass: "text-red-600" },
};

/**
 * 同期状態に応じたアイコンを返す。
 * @param status - プロジェクトの同期状態
 */
function StatusIcon({ status }: { status: SyncItemStatus }) {
  if (status === "done") {
    return <Check className="h-4 w-4 text-green-600" />;
  }
  if (status === "syncing") {
    return <Loader2 className="h-4 w-4 animate-spin text-backhub" />;
  }
  if (status === "error") {
    return <AlertTriangle className="h-4 w-4 text-red-600" />;
  }
  // pending
  return <Circle className="h-4 w-4 text-gray-300" />;
}

/**
 * 未同期プロジェクトの同期進捗を一覧表示するコンポーネント。
 * 各プロジェクトを「待機中 / 読み込み中 / 完了 / 失敗」のアイコン付きで並べ、
 * いまどのプロジェクトを読み込んでいるかを可視化する。
 * @param items - 各プロジェクトの進捗
 */
export function SyncProgressList({ items }: { items: SyncItem[] }) {
  return (
    <ul data-component="SyncProgressList" className="space-y-2 text-left">
      {items.map((item) => {
        const presentation = STATUS_PRESENTATION[item.status];
        return (
          <li
            key={item.key}
            className="flex items-center gap-3 text-sm"
          >
            <StatusIcon status={item.status} />
            <span
              className={`flex-1 ${
                item.status === "syncing"
                  ? "font-medium text-gray-900"
                  : "text-gray-700"
              }`}
            >
              {item.name}
              <span className="ml-1 text-xs text-gray-400">({item.key})</span>
            </span>
            <span className={`text-xs ${presentation.textClass}`}>
              {presentation.label}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
