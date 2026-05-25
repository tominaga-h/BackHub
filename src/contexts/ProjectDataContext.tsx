"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Assignee, Project } from "@/types";
import type { StatusOption } from "@/components/filters/GlobalFilterBar";
import { computeUpdatedSince } from "@/lib/sync-window";

/** ステータスでフィルタリングされた後の担当者選択肢 */
type FilteredAssigneeOptions = {
  assignees: Assignee[];
  hasUnassigned: boolean;
};

/** 未同期プロジェクトの同期状態 */
export type SyncItemStatus = "pending" | "syncing" | "done" | "error";

/** 「読み込み中」画面で 1 プロジェクトの進捗を表す要素 */
export type SyncItem = {
  /** プロジェクトキー（例: DSK_DEV） */
  key: string;
  /** 表示名（Backlog から解決。取得失敗時は key をフォールバック） */
  name: string;
  /** 同期状態 */
  status: SyncItemStatus;
};

/** /api/backlog/projects のレスポンス型 */
type ProjectsResponse = {
  projects: Project[];
  errors?: string[];
  needsSetup?: boolean;
  unsyncedProjectKeys?: string[];
};

/** /api/backlog/project-names のレスポンス型 */
type ProjectNamesResponse = {
  projects?: { projectKey: string; name: string }[];
  needsSetup?: boolean;
};

/** ProjectDataContext が提供する値の型定義 */
type ProjectDataContextValue = {
  projects: Project[];
  loading: boolean;
  error: string | null;
  /** Backlog設定（URL/APIキー/プロジェクト）が未構成の場合 true */
  needsSetup: boolean;
  /** 未同期プロジェクトキー（projects テーブルに行が無いキー） */
  unsyncedProjectKeys: string[];
  /** 未同期プロジェクトを逐次同期している最中かどうか */
  syncing: boolean;
  /** 初回ロード完了後、差分同期サイクルが未完了の間 true（進捗画面を維持するためのフラグ） */
  syncPending: boolean;
  /** 「読み込み中」画面で表示する各プロジェクトの進捗 */
  syncItems: SyncItem[];
  activeStatuses: Set<string>;
  setActiveStatuses: (statuses: Set<string>) => void;
  activeProjects: Set<string>;
  setActiveProjects: (projects: Set<string>) => void;
  statusOptions: StatusOption[];
  projectNames: string[];
  statusColorMap: Map<string, string>;
  assigneeOptions: Assignee[];
  filteredAssigneeOptions: FilteredAssigneeOptions;
  activeAssignees: Set<string>;
  setActiveAssignees: (assignees: Set<string>) => void;
};

const ProjectDataContext = createContext<ProjectDataContextValue | null>(null);

/**
 * ProjectDataContext から値を取得するカスタムフック。
 * ProjectDataProvider の外で使用するとエラーをスローする。
 * @returns コンテキスト値（プロジェクトデータ、フィルター状態等）
 */
export function useProjectData() {
  const ctx = useContext(ProjectDataContext);
  if (!ctx) {
    throw new Error("useProjectData must be used within ProjectDataProvider");
  }
  return ctx;
}

/**
 * プロジェクトデータの取得・管理を行うコンテキストプロバイダー。
 * マウント時に /api/backlog/projects からデータを取得し、各種フィルター状態を管理する。
 * @param children - 子コンポーネント
 */
export function ProjectDataProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [unsyncedProjectKeys, setUnsyncedProjectKeys] = useState<string[]>([]);
  const [syncing, setSyncing] = useState(false);
  // 初回ロード完了〜差分同期サイクル完了までの間 true。
  // この間は進捗画面を出し続け、通常画面が一瞬描画されるのを防ぐ。
  const [syncPending, setSyncPending] = useState(false);
  const [syncItems, setSyncItems] = useState<SyncItem[]>([]);
  // 逐次同期が実行中かどうかを同期的に判定するためのフラグ。
  // syncing(state) を effect の依存配列に入れると setSyncing で再実行が走り
  // 多重起動するため、起動制御は再レンダリングを伴わない ref で行う。
  const syncRunningRef = useRef(false);
  // 差分同期サイクルを 1 マウントにつき 1 回だけ走らせるためのフラグ。
  const syncDoneRef = useRef(false);
  // 同期対象キーの決定に使う最新プロジェクト一覧を ref で保持する。
  // effect の依存配列に projects を入れると無限ループになるため ref から読む。
  const latestProjectsRef = useRef<Project[]>([]);
  const [activeStatuses, setActiveStatuses] = useState<Set<string>>(new Set());
  const [activeProjects, setActiveProjects] = useState<Set<string>>(new Set());
  const [activeAssignees, setActiveAssignees] = useState<Set<string>>(new Set());

  /**
   * /api/backlog/projects からプロジェクトデータを取得し、
   * projects / needsSetup / unsyncedProjectKeys と初期フィルター状態を更新する。
   * 初回マウント時と、未同期プロジェクトの同期完了後の再取得の両方から呼ぶ。
   */
  const loadProjects = useCallback(async () => {
    const res = await fetch("/api/backlog/projects");
    if (!res.ok) throw new Error("Failed to fetch");
    const data: ProjectsResponse = await res.json();

    setNeedsSetup(data.needsSetup === true);
    setProjects(data.projects);
    // 同期対象キーの決定に使うため、最新のプロジェクト一覧を ref にも保持する
    latestProjectsRef.current = data.projects;
    setUnsyncedProjectKeys(data.unsyncedProjectKeys ?? []);

    // 全プロジェクトのステータスを集約
    const allStatuses = new Set<string>();
    const closedNames = new Set<string>();
    data.projects.forEach((p) =>
      p.settings.statuses.forEach((s) => {
        allStatuses.add(s.name);
        // Backlog のステータス id=4 は「完了（Closed）」を示す
        // 初期状態では完了ステータスを非表示にする
        if (s.id === 4) closedNames.add(s.name);
      }),
    );
    closedNames.forEach((name) => allStatuses.delete(name));
    setActiveStatuses(allStatuses);
    // 初期状態では全プロジェクトを表示対象にする
    setActiveProjects(new Set(data.projects.map((p) => p.name)));
  }, []);

  // 初回マウント時にプロジェクトデータを取得し、初期フィルター状態を設定する
  useEffect(() => {
    loadProjects()
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to fetch"),
      )
      .finally(() => {
        // ロード完了と同時に同期待ちフラグを立て、同期 effect が走り切るまで
        // 進捗画面を維持する（通常画面が一瞬出るのを防ぐ）。
        setSyncPending(true);
        setLoading(false);
      });
  }, [loadProjects]);

  // 初回ロード完了後、ダッシュボード読込みのたびに 1 プロジェクトずつ逐次同期する。
  // 同期済みプロジェクトは差分同期（前回同期日の前日以降の更新分）、未同期プロジェクトは
  // 直近 30 日分を取得する。Vercel Hobby の関数上限（60秒）に収めるため直列で実行する。
  //
  // 中断（cancelled）方式は採らない。同期処理はサーバー側で完結する副作用であり、
  // クリーンアップで途中中断すると StrictMode の二重マウントや設定画面からの
  // クライアント遷移で「実行中フラグだけ立って処理は中断」という状態が残り、
  // 永遠にローディングが終わらなくなる。一度始めたら最後まで走り切らせる。
  //
  // 依存配列に projects / unsyncedProjectKeys を入れない。これらは同期完了後の
  // loadProjects() で更新され、依存に含めると再実行 → 無限ループになる。
  // 同期対象は state ではなく ref（latestProjectsRef）から読み、起動は
  // syncDoneRef / syncRunningRef で「1 マウント 1 サイクル」に制限する。
  useEffect(() => {
    // 初回ロード中・設定未完了・このマウントで同期済み・実行中のいずれかなら何もしない
    if (loading || needsSetup || syncDoneRef.current || syncRunningRef.current) {
      return;
    }

    syncRunningRef.current = true;

    // 同期対象キー＝（同期済みプロジェクトのキー）∪（未同期キー）を重複排除して作る。
    // syncedAt の解決のため、同期済みプロジェクトは key → project のマップも持つ。
    const syncedProjects = latestProjectsRef.current;
    const projectByKey = new Map<string, Project>(
      syncedProjects.map((p) => [p.projectKey, p]),
    );
    const keysToSync: string[] = [];
    const seen = new Set<string>();
    for (const p of syncedProjects) {
      if (!seen.has(p.projectKey)) {
        seen.add(p.projectKey);
        keysToSync.push(p.projectKey);
      }
    }
    for (const key of unsyncedProjectKeys) {
      if (!seen.has(key)) {
        seen.add(key);
        keysToSync.push(key);
      }
    }

    // 同期対象が 1 件も無い場合は同期処理をスキップする。
    // この場合も後段の finally で syncDoneRef を立て syncPending を下ろし、
    // 進捗画面から通常画面へ遷移させる。
    const hasTargets = keysToSync.length > 0;

    const syncSequentially = async () => {
      if (!hasTargets) return;
      setSyncing(true);

      // 表示名の解決（key → name マップ）。
      // 同期済みプロジェクトは projects から名前を持つのでそれを使う。
      // 未同期プロジェクトのみ projects テーブルに行が無く名前を持たないため、
      // /api/backlog/project-names で別途解決する。
      const nameMap: Record<string, string> = {};
      for (const p of syncedProjects) {
        nameMap[p.projectKey] = p.name;
      }
      const hasUnsynced = unsyncedProjectKeys.some((k) => !nameMap[k]);
      if (hasUnsynced) {
        try {
          const res = await fetch("/api/backlog/project-names");
          if (res.ok) {
            const data: ProjectNamesResponse = await res.json();
            (data.projects ?? []).forEach((p) => {
              // 既に同期済みプロジェクト名がある場合は上書きしない
              if (!nameMap[p.projectKey]) nameMap[p.projectKey] = p.name;
            });
          }
        } catch (err) {
          // 名前解決の失敗は致命的ではない。key をフォールバック表示にする
          console.error("Failed to resolve project names:", err);
        }
      }

      // 進捗一覧を「待機中」で初期化する
      const initialItems: SyncItem[] = keysToSync.map((key) => ({
        key,
        name: nameMap[key] ?? key,
        status: "pending",
      }));
      setSyncItems(initialItems);

      // 1 プロジェクトずつ順番に同期する
      for (const key of keysToSync) {
        // 対象を「同期中」に更新
        setSyncItems((items) =>
          items.map((item) =>
            item.key === key ? { ...item, status: "syncing" } : item,
          ),
        );

        // リクエストボディを決定する。
        // 同期済みかつ syncedAt が有効 → 差分同期（updated_since = 前日）。
        // 未同期 or syncedAt が無効（null/空/不正） → 直近 30 日分（days:30）。
        const project = projectByKey.get(key);
        let requestBody: Record<string, unknown> = { projectKey: key, days: 30 };
        if (project && project.syncedAt) {
          const updatedSince = computeUpdatedSince(project.syncedAt);
          if (updatedSince) {
            requestBody = { projectKey: key, updated_since: updatedSince };
          }
        }

        let ok = false;
        try {
          const res = await fetch("/api/backlog/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
          });
          ok = res.ok;
          if (!ok) {
            console.error(`Sync failed for ${key}: HTTP ${res.status}`);
          }
        } catch (err) {
          // 個別の失敗は握りつぶし、残りのプロジェクトの同期を続行する
          console.error(`Sync failed for ${key}:`, err);
        }

        // 成否を一覧に反映する
        setSyncItems((items) =>
          items.map((item) =>
            item.key === key
              ? { ...item, status: ok ? "done" : "error" }
              : item,
          ),
        );
      }

      // 同期完了後、最新のプロジェクトデータを再取得する。
      try {
        await loadProjects();
      } catch (err) {
        console.error("Failed to reload projects after sync:", err);
      }
    };

    void syncSequentially().finally(() => {
      // 成功・失敗いずれでも実行中フラグと UI 状態を必ず戻す。
      // syncDoneRef を立てて 1 マウント 1 サイクルに制限し、無限ループを防ぐ。
      syncRunningRef.current = false;
      setSyncing(false);
      syncDoneRef.current = true;
      setSyncPending(false);
    });
    // unsyncedProjectKeys / projects は依存に含めない。これらは同期後の loadProjects() で
    // 更新され、依存に入れると再実行 → 無限ループになる。対象キーは ref から読む。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, needsSetup, loadProjects]);

  /** 全プロジェクトのステータスを重複排除した選択肢一覧 */
  const statusOptions = useMemo(() => {
    const seen = new Map<string, string>();
    projects.forEach((p) =>
      p.settings.statuses.forEach((s) => {
        if (!seen.has(s.name)) seen.set(s.name, s.color);
      }),
    );
    return Array.from(seen.entries()).map(([name, color]) => ({ name, color }));
  }, [projects]);

  /** 全プロジェクト名の配列 */
  const projectNames = useMemo(() => projects.map((p) => p.name), [projects]);

  /** ステータス名 → 色のルックアップマップ（全プロジェクト横断） */
  const statusColorMap = useMemo(() => {
    const map = new Map<string, string>();
    projects.forEach((p) =>
      p.settings.statuses.forEach((s) => map.set(s.name, s.color)),
    );
    return map;
  }, [projects]);

  /** 全プロジェクトの担当者を重複排除・日本語名順ソートした一覧 */
  const assigneeOptions = useMemo(() => {
    const seen = new Map<number, Assignee>();
    projects.forEach((p) =>
      p.settings.assignees.forEach((a) => {
        if (!seen.has(a.id)) seen.set(a.id, a);
      }),
    );
    return Array.from(seen.values()).sort((a, b) =>
      a.name.localeCompare(b.name, "ja"),
    );
  }, [projects]);

  /**
   * 現在のステータスフィルターで絞り込んだ課題に登場する担当者のみを抽出する。
   * ステータスフィルターを変更すると、関連しない担当者は選択肢から消える。
   */
  const filteredAssigneeOptions = useMemo<FilteredAssigneeOptions>(() => {
    const seen = new Map<number, Assignee>();
    let hasUnassigned = false;
    projects
      .filter((p) => activeProjects.has(p.name))
      .forEach((p) =>
        p.issues
          .filter((issue) => activeStatuses.has(issue.status))
          .forEach((issue) => {
            if (issue.assignee) {
              if (!seen.has(issue.assignee.id))
                seen.set(issue.assignee.id, issue.assignee);
            } else {
              hasUnassigned = true;
            }
          }),
      );
    const assignees = Array.from(seen.values()).sort((a, b) =>
      a.name.localeCompare(b.name, "ja"),
    );
    return { assignees, hasUnassigned };
  }, [projects, activeStatuses, activeProjects]);

  // 担当者一覧が初めて読み込まれた時に、全担当者（＋未割当）を初期選択状態にする
  useEffect(() => {
    if (assigneeOptions.length === 0) return;
    setActiveAssignees((prev) => {
      // 既に選択状態がある場合は上書きしない（ユーザーが手動で変更した場合を考慮）
      if (prev.size > 0) return prev;
      const all = new Set(assigneeOptions.map((a) => a.id.toString()));
      all.add("unassigned");
      return all;
    });
  }, [assigneeOptions]);

  const value = useMemo<ProjectDataContextValue>(
    () => ({
      projects,
      loading,
      error,
      needsSetup,
      unsyncedProjectKeys,
      syncing,
      syncPending,
      syncItems,
      activeStatuses,
      setActiveStatuses,
      activeProjects,
      setActiveProjects,
      statusOptions,
      projectNames,
      statusColorMap,
      assigneeOptions,
      filteredAssigneeOptions,
      activeAssignees,
      setActiveAssignees,
    }),
    [projects, loading, error, needsSetup, unsyncedProjectKeys, syncing, syncPending, syncItems, activeStatuses, activeProjects, statusOptions, projectNames, statusColorMap, assigneeOptions, filteredAssigneeOptions, activeAssignees],
  );

  return (
    <ProjectDataContext.Provider value={value}>
      {children}
    </ProjectDataContext.Provider>
  );
}
