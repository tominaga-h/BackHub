"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Assignee, Project } from "@/types";
import type { StatusOption } from "@/components/filters/GlobalFilterBar";

/** ステータスでフィルタリングされた後の担当者選択肢 */
type FilteredAssigneeOptions = {
  assignees: Assignee[];
  hasUnassigned: boolean;
};

/** ProjectDataContext が提供する値の型定義 */
type ProjectDataContextValue = {
  projects: Project[];
  loading: boolean;
  error: string | null;
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
  const [activeStatuses, setActiveStatuses] = useState<Set<string>>(new Set());
  const [activeProjects, setActiveProjects] = useState<Set<string>>(new Set());
  const [activeAssignees, setActiveAssignees] = useState<Set<string>>(new Set());

  // 初回マウント時にプロジェクトデータを取得し、初期フィルター状態を設定する
  useEffect(() => {
    fetch("/api/backlog/projects")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then((data: { projects: Project[]; errors?: string[] }) => {
        setProjects(data.projects);
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
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

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
    [projects, loading, error, activeStatuses, activeProjects, statusOptions, projectNames, statusColorMap, assigneeOptions, filteredAssigneeOptions, activeAssignees],
  );

  return (
    <ProjectDataContext.Provider value={value}>
      {children}
    </ProjectDataContext.Provider>
  );
}
