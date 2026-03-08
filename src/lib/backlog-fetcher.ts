import type { Backlog, Entity } from "backlog-js";

export type RawProjectData = {
  project: {
    id: number;
    projectKey: string;
    name: string;
  };
  statuses: Entity.Project.ProjectStatus[];
  issueTypes: Entity.Issue.IssueType[];
  versions: Entity.Project.Version[];
  categories: Entity.Project.Category[];
  users: Entity.User.User[];
  issues: Entity.Issue.Issue[];
  userAvatars: Record<number, string>;
  icon?: string;
};

export async function fetchImageAsDataUri(
  url: string,
): Promise<string | undefined> {
  try {
    const res = await fetch(url);
    if (!res.ok) return undefined;
    const contentType = res.headers.get("content-type") ?? "image/png";
    const buf = Buffer.from(await res.arrayBuffer());
    return `data:${contentType};base64,${buf.toString("base64")}`;
  } catch {
    return undefined;
  }
}

export async function fetchProjectIcon(
  host: string,
  apiKey: string,
  projectIdOrKey: string | number,
): Promise<string | undefined> {
  return fetchImageAsDataUri(
    `https://${host}/api/v2/projects/${projectIdOrKey}/image?apiKey=${apiKey}`,
  );
}

export async function fetchUserAvatars(
  host: string,
  apiKey: string,
  userIds: number[],
  concurrency = 3,
): Promise<Record<number, string>> {
  const avatars: Record<number, string> = {};
  for (let i = 0; i < userIds.length; i += concurrency) {
    const batch = userIds.slice(i, i + concurrency);
    const results = await Promise.allSettled(
      batch.map(async (id) => {
        const uri = await fetchImageAsDataUri(
          `https://${host}/api/v2/users/${id}/icon?apiKey=${apiKey}`,
        );
        return { id, uri };
      }),
    );
    for (const r of results) {
      if (r.status === "fulfilled" && r.value.uri) {
        avatars[r.value.id] = r.value.uri;
      }
    }
  }
  return avatars;
}

export async function fetchRawProjectData(
  backlog: Backlog,
  host: string,
  apiKey: string,
  projectKey: string,
  createdSince: string,
): Promise<RawProjectData> {
  const projectInfo = await backlog.getProject(projectKey);

  const [statuses, issueTypes, versions, categories, users, issues, icon] =
    await Promise.all([
      backlog.getProjectStatuses(projectKey),
      backlog.getIssueTypes(projectKey),
      backlog.getVersions(projectKey),
      backlog.getCategories(projectKey),
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

  const userAvatars = await fetchUserAvatars(
    host,
    apiKey,
    users.map((u) => u.id),
  );

  return {
    project: {
      id: projectInfo.id,
      projectKey: projectInfo.projectKey,
      name: projectInfo.name,
    },
    statuses,
    issueTypes,
    versions,
    categories,
    users,
    issues,
    userAvatars,
    icon,
  };
}
