import { createServiceClient } from "@/lib/supabase";
import type { RawProjectData } from "@/lib/backlog-fetcher";
import type { TablesInsert } from "@/types/database";

export type SyncResult = {
  projectKey: string;
  issueCount: number;
  memberCount: number;
  status: "success" | "error";
  error?: string;
};

export async function syncProjectToDatabase(
  rawData: RawProjectData,
): Promise<SyncResult> {
  const db = createServiceClient();
  const { project, statuses, issueTypes, versions, categories, users, issues, userAvatars } =
    rawData;

  try {
    // 1. projects
    await upsertProject(db, project, rawData.icon);

    // 2. members (FK なし、先に投入)
    if (users.length > 0) {
      await upsertMembers(db, users, userAvatars);
    }

    // 3. プロジェクト依存マスタ
    if (statuses.length > 0) await upsertStatuses(db, project.id, statuses);
    if (issueTypes.length > 0) await upsertIssueTypes(db, project.id, issueTypes);
    if (versions.length > 0) await upsertMilestones(db, project.id, versions);
    if (categories.length > 0) await upsertCategories(db, project.id, categories);

    // 4. project_members (delete → insert)
    await syncProjectMembers(db, project.id, users);

    // 5. issues (parent_issue_id は第2パスで設定)
    if (issues.length > 0) {
      await upsertIssues(db, issues);
      await updateParentIssueIds(db, issues);
      await syncIssueMilestones(db, issues);
      await syncIssueCategories(db, issues);
    }

    return {
      projectKey: project.projectKey,
      issueCount: issues.length,
      memberCount: users.length,
      status: "success",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`Sync failed for ${project.projectKey}:`, message);
    return {
      projectKey: project.projectKey,
      issueCount: 0,
      memberCount: 0,
      status: "error",
      error: message,
    };
  }
}

type SupabaseClient = ReturnType<typeof createServiceClient>;

async function upsertProject(
  db: SupabaseClient,
  project: RawProjectData["project"],
  icon: string | undefined,
) {
  const { error } = await db.from("projects").upsert(
    {
      id: project.id,
      project_key: project.projectKey,
      name: project.name,
      icon_url: icon ?? null,
      synced_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (error) throw new Error(`projects: ${error.message}`);
}

async function upsertMembers(
  db: SupabaseClient,
  users: RawProjectData["users"],
  userAvatars: RawProjectData["userAvatars"],
) {
  const userIds = users.map((u) => u.id);
  const { data: existing } = await db
    .from("members")
    .select("id, avatar_url")
    .in("id", userIds);
  const existingAvatars: Record<number, string | null> = Object.fromEntries(
    (existing ?? []).map((m) => [m.id, m.avatar_url]),
  );

  const rows: TablesInsert<"members">[] = users.map((u) => ({
    id: u.id,
    backlog_user_id: u.userId,
    name: u.name,
    mail_address: u.mailAddress || null,
    role_type: u.roleType,
    avatar_url: userAvatars[u.id] ?? existingAvatars[u.id] ?? null,
  }));
  const { error } = await db
    .from("members")
    .upsert(rows, { onConflict: "id" });
  if (error) throw new Error(`members: ${error.message}`);
}

async function upsertStatuses(
  db: SupabaseClient,
  projectId: number,
  statuses: RawProjectData["statuses"],
) {
  const rows: TablesInsert<"statuses">[] = statuses.map((s) => ({
    id: s.id,
    project_id: projectId,
    name: s.name,
    color: s.color,
    display_order: s.displayOrder,
  }));
  const { error } = await db
    .from("statuses")
    .upsert(rows, { onConflict: "project_id, id" });
  if (error) throw new Error(`statuses: ${error.message}`);
}

async function upsertIssueTypes(
  db: SupabaseClient,
  projectId: number,
  issueTypes: RawProjectData["issueTypes"],
) {
  const rows: TablesInsert<"issue_types">[] = issueTypes.map((t) => ({
    id: t.id,
    project_id: projectId,
    name: t.name,
    color: t.color,
    display_order: t.displayOrder,
  }));
  const { error } = await db
    .from("issue_types")
    .upsert(rows, { onConflict: "project_id, id" });
  if (error) throw new Error(`issue_types: ${error.message}`);
}

async function upsertMilestones(
  db: SupabaseClient,
  projectId: number,
  versions: RawProjectData["versions"],
) {
  const rows: TablesInsert<"milestones">[] = versions.map((v) => ({
    id: v.id,
    project_id: projectId,
    name: v.name,
    description: v.description ?? null,
    start_date: v.startDate ?? null,
    release_due_date: v.releaseDueDate ?? null,
    archived: v.archived,
    display_order: v.displayOrder,
  }));
  const { error } = await db
    .from("milestones")
    .upsert(rows, { onConflict: "id" });
  if (error) throw new Error(`milestones: ${error.message}`);
}

async function upsertCategories(
  db: SupabaseClient,
  projectId: number,
  categories: RawProjectData["categories"],
) {
  const rows: TablesInsert<"categories">[] = categories.map((c) => ({
    id: c.id,
    project_id: projectId,
    name: c.name,
    display_order: c.displayOrder,
  }));
  const { error } = await db
    .from("categories")
    .upsert(rows, { onConflict: "id" });
  if (error) throw new Error(`categories: ${error.message}`);
}

async function syncProjectMembers(
  db: SupabaseClient,
  projectId: number,
  users: RawProjectData["users"],
) {
  await db.from("project_members").delete().eq("project_id", projectId);

  if (users.length === 0) return;

  const rows: TablesInsert<"project_members">[] = users.map((u) => ({
    project_id: projectId,
    member_id: u.id,
  }));
  const { error } = await db.from("project_members").insert(rows);
  if (error) throw new Error(`project_members: ${error.message}`);
}

async function upsertIssues(
  db: SupabaseClient,
  issues: RawProjectData["issues"],
) {
  const now = new Date().toISOString();
  const rows: TablesInsert<"issues">[] = issues.map((i) => ({
    id: i.id,
    project_id: i.projectId,
    issue_key: i.issueKey,
    key_id: i.keyId,
    summary: i.summary,
    description: i.description || null,
    issue_type_id: i.issueType.id,
    status_id: i.status.id,
    priority_id: i.priority.id,
    priority_name: i.priority.name,
    assignee_id: i.assignee?.id ?? null,
    parent_issue_id: null,
    start_date: i.startDate ?? null,
    due_date: i.dueDate ?? null,
    estimated_hours: i.estimatedHours ?? null,
    actual_hours: i.actualHours ?? null,
    created_user_id: i.createdUser.id,
    backlog_created_at: i.created,
    backlog_updated_at: i.updated,
    synced_at: now,
  }));
  const { error } = await db
    .from("issues")
    .upsert(rows, { onConflict: "id" });
  if (error) throw new Error(`issues: ${error.message}`);
}

async function updateParentIssueIds(
  db: SupabaseClient,
  issues: RawProjectData["issues"],
) {
  const withParent = issues.filter((i) => i.parentIssueId);
  for (const issue of withParent) {
    const { error } = await db
      .from("issues")
      .update({ parent_issue_id: issue.parentIssueId! })
      .eq("id", issue.id);
    if (error) {
      console.warn(
        `Could not set parent_issue_id for issue ${issue.id}: ${error.message}`,
      );
    }
  }
}

async function syncIssueMilestones(
  db: SupabaseClient,
  issues: RawProjectData["issues"],
) {
  const issueIds = issues.map((i) => i.id);
  await db.from("issue_milestones").delete().in("issue_id", issueIds);

  const rows: TablesInsert<"issue_milestones">[] = [];
  for (const issue of issues) {
    for (const ms of issue.milestone ?? []) {
      rows.push({ issue_id: issue.id, milestone_id: ms.id });
    }
  }
  if (rows.length === 0) return;

  const { error } = await db.from("issue_milestones").insert(rows);
  if (error) throw new Error(`issue_milestones: ${error.message}`);
}

async function syncIssueCategories(
  db: SupabaseClient,
  issues: RawProjectData["issues"],
) {
  const issueIds = issues.map((i) => i.id);
  await db.from("issue_categories").delete().in("issue_id", issueIds);

  const rows: TablesInsert<"issue_categories">[] = [];
  for (const issue of issues) {
    for (const cat of issue.category ?? []) {
      rows.push({ issue_id: issue.id, category_id: cat.id });
    }
  }
  if (rows.length === 0) return;

  const { error } = await db.from("issue_categories").insert(rows);
  if (error) throw new Error(`issue_categories: ${error.message}`);
}
