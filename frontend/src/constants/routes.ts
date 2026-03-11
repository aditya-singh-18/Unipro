// src/constants/routes.ts

export interface AppRoute {
  path: string;
  label: string;        // Sidebar label
  pageTitle: string;    // Topbar title
}

export const APP_ROUTES: AppRoute[] = [
  {
    path: "/dashboard",
    label: "Dashboard",
    pageTitle: "Dashboard",
  },
  {
    path: "/project-ideas",
    label: "Project Ideas",
    pageTitle: "Project Ideas",
  },
  {
    path: "/my-project",
    label: "My Project",
    pageTitle: "My Project",
  },
  {
    path: "/team",
    label: "Team & Collaboration",
    pageTitle: "Team & Collaboration",
  },
  {
    path: "/progress-tracker",
    label: "Progress Tracker",
    pageTitle: "Progress Tracker",
  },
  {
    path: "/meetings",
    label: "Meetings",
    pageTitle: "Meetings",
  },
  {
    path: "/feedback",
    label: "Feedback & Marks",
    pageTitle: "Feedback & Marks",
  },
  {
    path: "/ai-suggestions",
    label: "AI Suggestions",
    pageTitle: "AI Suggestions",
  },
  {
    path: "/settings",
    label: "Settings",
    pageTitle: "Settings",
  },
];
