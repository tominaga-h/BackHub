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

type FilteredAssigneeOptions = {
  assignees: Assignee[];
  hasUnassigned: boolean;
};

type ProjectDataContextValue = {
  projects: Project[];
  loading: boolean;
  error: string | null;
  activeStatuses: Set<string>;
  setActiveStatuses: (statuses: Set<string>) => void;
  statusOptions: StatusOption[];
  projectNames: string[];
  statusColorMap: Map<string, string>;
  assigneeOptions: Assignee[];
  filteredAssigneeOptions: FilteredAssigneeOptions;
  activeAssignees: Set<string>;
  setActiveAssignees: (assignees: Set<string>) => void;
};

const ProjectDataContext = createContext<ProjectDataContextValue | null>(null);

export function useProjectData() {
  const ctx = useContext(ProjectDataContext);
  if (!ctx) {
    throw new Error("useProjectData must be used within ProjectDataProvider");
  }
  return ctx;
}

export function ProjectDataProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeStatuses, setActiveStatuses] = useState<Set<string>>(new Set());
  const [activeAssignees, setActiveAssignees] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/backlog/projects")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then((data: { projects: Project[]; errors?: string[] }) => {
        setProjects(data.projects);
        const allStatuses = new Set<string>();
        const closedNames = new Set<string>();
        data.projects.forEach((p) =>
          p.settings.statuses.forEach((s) => {
            allStatuses.add(s.name);
            if (s.id === 4) closedNames.add(s.name);
          }),
        );
        closedNames.forEach((name) => allStatuses.delete(name));
        setActiveStatuses(allStatuses);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const statusOptions = useMemo(() => {
    const seen = new Map<string, string>();
    projects.forEach((p) =>
      p.settings.statuses.forEach((s) => {
        if (!seen.has(s.name)) seen.set(s.name, s.color);
      }),
    );
    return Array.from(seen.entries()).map(([name, color]) => ({ name, color }));
  }, [projects]);

  const projectNames = useMemo(() => projects.map((p) => p.name), [projects]);

  const statusColorMap = useMemo(() => {
    const map = new Map<string, string>();
    projects.forEach((p) =>
      p.settings.statuses.forEach((s) => map.set(s.name, s.color)),
    );
    return map;
  }, [projects]);

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

  const filteredAssigneeOptions = useMemo<FilteredAssigneeOptions>(() => {
    const seen = new Map<number, Assignee>();
    let hasUnassigned = false;
    projects.forEach((p) =>
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
  }, [projects, activeStatuses]);

  useEffect(() => {
    if (assigneeOptions.length === 0) return;
    setActiveAssignees((prev) => {
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
      statusOptions,
      projectNames,
      statusColorMap,
      assigneeOptions,
      filteredAssigneeOptions,
      activeAssignees,
      setActiveAssignees,
    }),
    [projects, loading, error, activeStatuses, statusOptions, projectNames, statusColorMap, assigneeOptions, filteredAssigneeOptions, activeAssignees],
  );

  return (
    <ProjectDataContext.Provider value={value}>
      {children}
    </ProjectDataContext.Provider>
  );
}
