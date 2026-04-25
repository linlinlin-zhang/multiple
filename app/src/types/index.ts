export interface Note {
  id: string;
  title: string;
  summary: string;
  content: string;
  timestamp: string;
  groupLabel: string;
  lastEdited: string;
}

export interface Project {
  id: string;
  name: string;
  status: "ACTIVE" | "COMPLETED";
  description: string;
  techStack: string[];
  link?: string;
  milestones: { date: string; label: string }[];
  lastEdited: string;
  groupLabel: string;
}

export interface ArchiveItem {
  id: string;
  title: string;
  content: string;
  archivedDate: string;
  originalType: "note" | "project";
  year: string;
  groupLabel: string;
}

export type TabId = "notes" | "projects" | "archive";
