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
  return { id: user.id, name, initials, avatarColor };
}

async function fetchProjectData(
  backlog: ReturnType<typeof createBacklogClient>,
  host: string,
  projectKey: string,
  createdSince: string,
): Promise<Project> {
  const projectInfo = await backlog.getProject(projectKey);

  const [statuses, issueTypes, versions, users, issues] = await Promise.all([
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
    priority: issue.priority.name,
    remarks: "",
    url: `https://${host}/view/${issue.issueKey}`,
  }));

  return {
    id: String(projectInfo.id),
    projectKey: projectInfo.projectKey,
    name: projectInfo.name,
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

    const since = new Date();
    since.setMonth(since.getMonth() - 3);
    const createdSince = since.toISOString().split("T")[0];

    const results = await Promise.allSettled(
      projectKeys.map((key) =>
        fetchProjectData(backlog, host, key, createdSince),
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

    return NextResponse.json({ projects, errors });
  } catch (error) {
    console.error("Failed to fetch Backlog data:", error);
    return NextResponse.json(
      { error: "Failed to fetch Backlog data" },
      { status: 500 },
    );
  }
}
