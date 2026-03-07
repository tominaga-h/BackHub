import type { Project } from "@/types";

const assignees = {
  alex: { name: "Alex Johnson", initials: "AJ", avatarColor: "bg-blue-100 text-blue-700" },
  sam: { name: "Sam Wilson", initials: "SW", avatarColor: "bg-green-100 text-green-700" },
  jordan: { name: "Jordan Lee", initials: "JL", avatarColor: "bg-purple-100 text-purple-700" },
};

export const mockProjects: Project[] = [
  {
    id: "project-a",
    name: "Project A",
    issues: [
      {
        id: "ISSUE-101",
        title: "Setup database environment for the upcoming enterprise architecture scaling project",
        assignee: assignees.alex,
        status: "OPEN",
        remarks: "Awaiting credentials from server admin",
      },
      {
        id: "ISSUE-102",
        title: "API Integration - Auth Module: Implement OAuth2 with multi-factor authentication and role-based access control",
        assignee: assignees.sam,
        status: "IN PROGRESS",
        remarks: "Working on JWT logic and refresh tokens",
      },
    ],
    settings: {
      assignees: [assignees.alex, assignees.sam, assignees.jordan],
      issueTypes: [
        { name: "Bug", color: "#ef4444" },
        { name: "Task", color: "#3b82f6" },
        { name: "Request", color: "#22c55e" },
      ],
      milestones: [
        { name: "v1.0 Release" },
        { name: "Q3 Features" },
        { name: "Legacy Support" },
      ],
    },
  },
  {
    id: "project-b",
    name: "Project B",
    issues: [
      {
        id: "ISSUE-201",
        title: "Mobile responsiveness fixes for the main landing page and secondary navigation menus across all breakpoints",
        assignee: assignees.sam,
        status: "CLOSED",
        remarks: "Completed on Friday as requested",
      },
    ],
    settings: {
      assignees: [assignees.sam, assignees.jordan],
      issueTypes: [
        { name: "Bug", color: "#ef4444" },
        { name: "Task", color: "#3b82f6" },
      ],
      milestones: [
        { name: "v1.0 Release" },
        { name: "Q3 Features" },
      ],
    },
  },
];
