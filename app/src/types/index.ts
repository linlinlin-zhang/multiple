export interface HistorySession {
  id: string;
  title: string;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
  nodeCount: number;
  assetCount: number;
}

export type OutputKind = "image" | "video" | "web" | "document" | "chat";

export interface ReferenceItem {
  title?: string;
  url?: string;
  description?: string;
  type?: string;
}

export interface CanvasContent {
  url?: string;
  title?: string;
  description?: string;
  mainContent?: string;
  markdown?: string;
  text?: string;
  body?: string;
  content?: string;
  summary?: string;
  sections?: unknown[];
  steps?: unknown[];
  items?: unknown[];
  metrics?: unknown[];
  quotes?: unknown[];
  columns?: unknown[];
  rows?: unknown[];
  [key: string]: unknown;
}

export interface CanvasOption {
  title?: string;
  description?: string;
  prompt?: string;
  tone?: string;
  layoutHint?: string;
  nodeType?: string;
  references?: ReferenceItem[];
  content?: CanvasContent;
  [key: string]: unknown;
}

export interface SourceCardData {
  imageUrl?: string;
  imageHash?: string;
  fileName?: string;
  title?: string;
  summary?: string;
  sourceUrl?: string;
  sourceText?: string;
  references?: ReferenceItem[];
  [key: string]: unknown;
}

export interface NodeData {
  sourceType?: string;
  sourceUrl?: string;
  sourceText?: string;
  fileName?: string;
  imageHash?: string;
  imageUrl?: string;
  title?: string;
  summary?: string;
  description?: string;
  explanation?: string;
  references?: ReferenceItem[];
  option?: CanvasOption;
  sourceCard?: SourceCardData;
  [key: string]: unknown;
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
  data: NodeData; // sourceType: "image" | "text" | "url"; fileName; sourceUrl; sourceText; etc.
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

// Upload assets may have non-image mimeTypes, e.g., application/pdf, text/plain

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: string;
  content: string;
  createdAt: string;
  thinkingContent?: string | null;
  references?: Array<{ title?: string; url?: string; description?: string; type?: string }> | null;
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
  assetType: "image" | "video" | "link" | "file" | "chat";
  data: unknown;
}

export interface MaterialItem {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  hash: string;
  filePath: string;
  favorited: boolean;
  addedAt: string;
  updatedAt: string;
}

export type MaterialSort = "date" | "added" | "name" | "size";

export interface MaterialsResponse {
  ok: boolean;
  items: MaterialItem[];
  total: number;
}
