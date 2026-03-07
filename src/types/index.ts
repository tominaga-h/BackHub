export type Status = {
  id: number;
  name: string;
  color: string;
};

export type Assignee = {
  id: number;
  name: string;
  initials: string;
  avatarColor: string;
  avatarUrl?: string;
};

export type Issue = {
  id: string;
  title: string;
  assignee: Assignee | null;
  status: string;
  statusColor: string;
  issueType: string;
  issueTypeColor: string;
  milestones: string[];
  priority: string;
  remarks: string;
  url: string;
};

export type IssueType = {
  id: number;
  name: string;
  color: string;
};

export type Milestone = {
  id: number;
  name: string;
  archived: boolean;
};

export type ProjectSettings = {
  statuses: Status[];
  assignees: Assignee[];
  issueTypes: IssueType[];
  milestones: Milestone[];
};

export type Project = {
  id: string;
  projectKey: string;
  name: string;
  issues: Issue[];
  settings: ProjectSettings;
};

export type ProjectFilters = {
  assignees: Set<string>;
  issueTypes: Set<string>;
  milestones: Set<string>;
};

export type IssueWithProject = Issue & {
  projectName: string;
  projectKey: string;
};
