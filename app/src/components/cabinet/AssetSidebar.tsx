import { Image, FileText, ExternalLink, MessageSquare } from "lucide-react";
import Sidebar from "./Sidebar";
import type { SessionDetail, Asset, Node } from "@/types";

interface AssetSidebarProps {
  session: SessionDetail | null;
  selectedAssetId: string | null;
  onSelectAsset: (id: string) => void;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function getAssetIcon(assetType: "image" | "file" | "link" | "chat"): React.ReactNode {
  switch (assetType) {
    case "image":
      return <Image size={16} className="text-cabinet-blue" />;
    case "file":
      return <FileText size={16} className="text-cabinet-blue" />;
    case "link":
      return <ExternalLink size={16} className="text-cabinet-blue" />;
    case "chat":
      return <MessageSquare size={16} className="text-cabinet-blue" />;
    default:
      return null;
  }
}

interface SidebarItemData {
  id: string;
  title: string;
  summary: string;
  groupLabel?: string;
  icon?: React.ReactNode;
}

function transformSessionToItems(session: SessionDetail): SidebarItemData[] {
  const items: SidebarItemData[] = [];

  // Images group (generated assets)
  const images = session.assets.filter((a: Asset) => a.kind === "generated");
  for (const asset of images) {
    items.push({
      id: asset.id,
      title: asset.fileName || "Generated Image",
      summary: `${asset.mimeType} · ${formatBytes(asset.fileSize)}`,
      groupLabel: "Images",
      icon: getAssetIcon("image"),
    });
  }

  // Files group (uploaded assets)
  const files = session.assets.filter((a: Asset) => a.kind === "upload");
  for (const asset of files) {
    const isText =
      asset.mimeType.startsWith("text/") ||
      asset.mimeType === "application/pdf" ||
      asset.mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      asset.mimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    items.push({
      id: asset.id,
      title: isText ? asset.fileName || "Document" : asset.fileName || "Uploaded File",
      summary: `${asset.mimeType} · ${formatBytes(asset.fileSize)}`,
      groupLabel: "Files",
      icon: getAssetIcon("file"),
    });
  }

  // Links group (source nodes with sourceUrl)
  const linkNodes = session.nodes.filter(
    (n: Node) => n.type === "source" && n.data?.sourceUrl && typeof n.data.sourceUrl === "string"
  );
  for (const node of linkNodes) {
    const url = node.data.sourceUrl as string;
    let domain = "Web Link";
    try {
      domain = new URL(url).hostname;
    } catch {
      // fallback to "Web Link"
    }
    items.push({
      id: node.id,
      title: domain,
      summary: url.length > 60 ? url.slice(0, 60) + "..." : url,
      groupLabel: "Links",
      icon: getAssetIcon("link"),
    });
  }

  // Chat group (up to 20 messages)
  const messages = session.chatMessages.slice(0, 20);
  for (const msg of messages) {
    const content = msg.content;
    items.push({
      id: msg.id,
      title: msg.role === "user" ? "You" : "AI",
      summary: content.length > 80 ? content.slice(0, 80) + "..." : content,
      groupLabel: "Chat",
      icon: getAssetIcon("chat"),
    });
  }

  return items;
}

export default function AssetSidebar({ session, selectedAssetId, onSelectAsset }: AssetSidebarProps) {
  const items = session ? transformSessionToItems(session) : [];

  return (
    <Sidebar
      title="Session Assets"
      items={items}
      selectedId={selectedAssetId}
      onSelect={onSelectAsset}
    />
  );
}
