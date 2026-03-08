import { NextResponse } from "next/server";
import {
  createBacklogClient,
  getBacklogHost,
  getProjectKeys,
} from "@/lib/backlog-client";
import type { Project, Assignee, Issue, Status } from "@/types";

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-green-100 text-green-700",
  "bg-purple-100 text-purple-700",
  "bg-orange-100 text-orange-700",
  "bg-pink-100 text-pink-700",
  "bg-teal-100 text-teal-700",
  "bg-indigo-100 text-indigo-700",
  "bg-red-100 text-red-700",
];

function toAssignee(user: { id: number; name: string }): Assignee {
  const name = user.name;
  const parts = name.split(/\s+/);
  const initials =
    parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();
  const avatarColor = AVATAR_COLORS[user.id % AVATAR_COLORS.length];
  const avatarUrl = `/api/backlog/users/${user.id}/icon`;
  return { id: user.id, name, initials, avatarColor, avatarUrl };
}

async function fetchUserIconAsDataUri(
  host: string,
  apiKey: string,
  userId: number,
): Promise<{ id: number; dataUri: string }> {
  const url = `https://${host}/api/v2/users/${userId}/icon?apiKey=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const contentType = res.headers.get("content-type") ?? "image/png";
  const buf = Buffer.from(await res.arrayBuffer());
  return { id: userId, dataUri: `data:${contentType};base64,${buf.toString("base64")}` };
}

async function fetchIconsBatched(
  host: string,
  apiKey: string,
  userIds: number[],
  concurrency: number = 5,
): Promise<Map<number, string>> {
  const iconMap = new Map<number, string>();
  for (let i = 0; i < userIds.length; i += concurrency) {
    const batch = userIds.slice(i, i + concurrency);
    const results = await Promise.allSettled(
      batch.map((id) => fetchUserIconAsDataUri(host, apiKey, id)),
    );
    for (const result of results) {
      if (result.status === "fulfilled") {
        iconMap.set(result.value.id, result.value.dataUri);
      }
    }
  }
  return iconMap;
}

function applyIcons(projects: Project[], iconMap: Map<number, string>) {
  for (const project of projects) {
    for (const issue of project.issues) {
      if (issue.assignee && iconMap.has(issue.assignee.id)) {
        issue.assignee.avatarUrl = iconMap.get(issue.assignee.id);
      }
    }
    for (const assignee of project.settings.assignees) {
      if (iconMap.has(assignee.id)) {
        assignee.avatarUrl = iconMap.get(assignee.id);
      }
    }
  }
}

async function fetchProjectIcon(
  host: string,
  apiKey: string,
  projectIdOrKey: string | number,
): Promise<string | undefined> {
  try {
    const url = `https://${host}/api/v2/projects/${projectIdOrKey}/image?apiKey=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) return undefined;
    const contentType = res.headers.get("content-type") ?? "image/png";
    const buf = Buffer.from(await res.arrayBuffer());
    return `data:${contentType};base64,${buf.toString("base64")}`;
  } catch {
    return undefined;
  }
}

async function fetchProjectData(
  backlog: ReturnType<typeof createBacklogClient>,
  host: string,
  apiKey: string,
  projectKey: string,
  createdSince: string,
): Promise<Project> {
  const projectInfo = await backlog.getProject(projectKey);

  const [statuses, issueTypes, versions, users, issues, icon] = await Promise.all([
    backlog.getProjectStatuses(projectKey),
    backlog.getIssueTypes(projectKey),
    backlog.getVersions(projectKey),
    backlog.getProjectUsers(projectKey),
    backlog.getIssues({
      projectId: [projectInfo.id],
      count: 100,
      sort: "updated",
      order: "desc",
      createdSince,
    }),
    fetchProjectIcon(host, apiKey, projectKey),
  ]);

  const assigneeMap = new Map<number, Assignee>();
  for (const u of users) {
    assigneeMap.set(u.id, toAssignee(u));
  }

  const mappedStatuses: Status[] = statuses.map((s) => ({
    id: s.id,
    name: s.name,
    color: s.color,
  }));

  const mappedIssues: Issue[] = issues.map((issue) => ({
    id: issue.issueKey,
    title: issue.summary,
    assignee: issue.assignee
      ? (assigneeMap.get(issue.assignee.id) ?? toAssignee(issue.assignee))
      : null,
    status: issue.status.name,
    statusColor: issue.status.color,
    issueType: issue.issueType.name,
    issueTypeColor: issue.issueType.color,
    milestones: (issue.milestone ?? []).map((m: { name: string }) => m.name),
    priority: issue.priority.name,
    remarks: "",
    url: `https://${host}/view/${issue.issueKey}`,
    created: issue.created,
    updated: issue.updated,
  }));

  return {
    id: String(projectInfo.id),
    projectKey: projectInfo.projectKey,
    name: projectInfo.name,
    icon,
    issues: mappedIssues,
    settings: {
      statuses: mappedStatuses,
      assignees: Array.from(assigneeMap.values()),
      issueTypes: issueTypes.map((t) => ({
        id: t.id,
        name: t.name,
        color: t.color,
      })),
      milestones: versions.map((v) => ({
        id: v.id,
        name: v.name,
        archived: v.archived,
      })),
    },
  };
}

export async function GET() {
  try {
    const backlog = createBacklogClient();
    const host = getBacklogHost();
    const projectKeys = getProjectKeys();
    const apiKey = process.env.BACKLOG_API_KEY;
    if (!apiKey) throw new Error("BACKLOG_API_KEY must be set");

    const since = new Date();
    since.setMonth(since.getMonth() - 3);
    const createdSince = since.toISOString().split("T")[0];

    const results = await Promise.allSettled(
      projectKeys.map((key) =>
        fetchProjectData(backlog, host, apiKey, key, createdSince),
      ),
    );

    const projects: Project[] = [];
    const errors: string[] = [];

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === "fulfilled") {
        projects.push(result.value);
      } else {
        const key = projectKeys[i];
        console.error(`Failed to fetch project ${key}:`, result.reason);
        errors.push(`${key}: ${result.reason?.message ?? "Unknown error"}`);
      }
    }

    // TODO: 429エラー回避のため一時的にアイコン取得を無効化
    // const uniqueUserIds = new Set<number>();
    // for (const p of projects) {
    //   for (const a of p.settings.assignees) uniqueUserIds.add(a.id);
    //   for (const i of p.issues) {
    //     if (i.assignee) uniqueUserIds.add(i.assignee.id);
    //   }
    // }

    // const iconMap = await fetchIconsBatched(host, apiKey, Array.from(uniqueUserIds));
    // applyIcons(projects, iconMap);

    return NextResponse.json({ projects, errors });
  } catch (error) {
    console.error("Failed to fetch Backlog data:", error);
    return NextResponse.json(
      { error: "Failed to fetch Backlog data" },
      { status: 500 },
    );
  }
}
