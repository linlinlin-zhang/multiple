export interface HistorySession {
  id: string;
  title: string;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
  nodeCount: number;
  assetCount: number;
}

export interface Node {
  id: string;
  sessionId: string;
  nodeId: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  data: any;
  collapsed: boolean;
  createdAt: string;
}

export interface Link {
  id: string;
  sessionId: string;
  fromNodeId: string;
  toNodeId: string;
  kind: string;
  createdAt: string;
}

export interface Asset {
  id: string;
  sessionId: string;
  hash: string;
  kind: "upload" | "generated";
  mimeType: string;
  fileSize: number;
  fileName: string | null;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: string;
  content: string;
  createdAt: string;
}

export interface SessionDetail extends HistorySession {
  viewState: object | null;
  nodes: Node[];
  links: Link[];
  assets: Asset[];
  chatMessages: ChatMessage[];
}

export interface SidebarAssetItem {
  id: string;
  title: string;
  summary: string;
  groupLabel: string;
  assetType: "image" | "link" | "file" | "chat";
  data: any;
}
