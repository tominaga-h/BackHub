export type IssueStatus = "OPEN" | "IN PROGRESS" | "CLOSED";

export type Assignee = {
  name: string;
  initials: string;
  avatarColor: string;
};

export type Issue = {
  id: string;
  title: string;
  assignee: Assignee;
  status: IssueStatus;
  remarks: string;
};

export type IssueType = {
  name: string;
  color: string;
};

export type Milestone = {
  name: string;
};

export type ProjectSettings = {
  assignees: Assignee[];
  issueTypes: IssueType[];
  milestones: Milestone[];
};

export type Project = {
  id: string;
  name: string;
  issues: Issue[];
  settings: ProjectSettings;
};
