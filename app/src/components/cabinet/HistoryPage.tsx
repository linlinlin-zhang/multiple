import { useState, useEffect } from "react";
import { ExternalLink, Image, MessageSquare, FileText, Link2 } from "lucide-react";
import { useSession, buildAssetUrl } from "../../hooks/useHistory";
import type { SessionDetail, Asset, Node, ChatMessage } from "@/types";
import Sidebar from "./Sidebar";
import ContentArea from "./ContentArea";

interface HistoryPageProps {
  sessionId: string | null;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function buildSidebarItems(session: SessionDetail) {
  const items: Array<{
    id: string;
    title: string;
    summary: string;
    groupLabel: string;
    icon: React.ReactNode;
    data: any;
  }> = [];

  // Upload source image
  const uploadAsset = session.assets.find((a) => a.kind === "upload");
  if (uploadAsset) {
    items.push({
      id: `upload-${uploadAsset.hash}`,
      title: uploadAsset.fileName || "上传原图",
      summary: "原始上传图片",
      groupLabel: "素材",
      icon: <Image size={14} />,
      data: uploadAsset,
    });
  }

  // Generated images
  const generatedAssets = session.assets.filter((a) => a.kind === "generated");
  for (const asset of generatedAssets) {
    items.push({
      id: `generated-${asset.hash}`,
      title: asset.fileName || "生成图",
      summary: "AI 生成图片",
      groupLabel: "素材",
      icon: <Image size={14} />,
      data: asset,
    });
  }

  // Chat messages
  for (const msg of session.chatMessages.slice(-10)) {
    items.push({
      id: `chat-${msg.id}`,
      title: msg.role === "user" ? "用户" : "AI",
      summary: msg.content.slice(0, 60) + (msg.content.length > 60 ? "..." : ""),
      groupLabel: "对话",
      icon: <MessageSquare size={14} />,
      data: msg,
    });
  }

  // Analysis summary as a file-like item
  const analysisNode = session.nodes.find((n) => n.type === "analysis");
  if (analysisNode?.data?.summary) {
    items.push({
      id: `analysis-${session.id}`,
      title: "图像分析",
      summary: analysisNode.data.summary.slice(0, 60),
      groupLabel: "分析",
      icon: <FileText size={14} />,
      data: analysisNode.data,
    });
  }

  return items;
}

function renderAssetDetail(asset: Asset): string {
  const lines: string[] = [];
  lines.push(`文件: ${asset.fileName || "未命名"}`);
  lines.push(`类型: ${asset.kind === "upload" ? "上传原图" : "生成图片"}`);
  lines.push(`格式: ${asset.mimeType}`);
  lines.push(`大小: ${(asset.fileSize / 1024).toFixed(1)} KB`);
  lines.push(`"`);
  lines.push(`![图片](${buildAssetUrl(asset.hash, asset.kind)})`);
  return lines.join("\n");
}

function renderChatDetail(msg: ChatMessage): string {
  return `${msg.role === "user" ? "用户" : "AI"}:\n${msg.content}`;
}

function renderAnalysisDetail(data: any): string {
  const lines: string[] = [];
  lines.push("摘要:");
  lines.push(data.summary || "无摘要");
  if (data.detectedSubjects?.length) {
    lines.push("");
    lines.push("识别主体:");
    for (const s of data.detectedSubjects) {
      lines.push(`- ${s}`);
    }
  }
  if (data.moodKeywords?.length) {
    lines.push("");
    lines.push("氛围关键词:");
    for (const k of data.moodKeywords) {
      lines.push(`- ${k}`);
    }
  }
  return lines.join("\n");
}

function renderNodeOverview(nodes: Node[]): string {
  const lines: string[] = [];
  lines.push("节点概览:");
  lines.push("");
  const sourceNode = nodes.find((n) => n.type === "source");
  const analysisNode = nodes.find((n) => n.type === "analysis");
  const optionNodes = nodes.filter((n) => n.type === "option" || n.type === "generated");

  if (sourceNode) lines.push("- 源图节点");
  if (analysisNode) lines.push("- 分析节点");
  for (const n of optionNodes) {
    const title = n.data?.option?.title || n.nodeId;
    lines.push(`- ${title}${n.type === "generated" ? " (已生成)" : ""}`);
  }
  return lines.join("\n");
}

export default function HistoryPage({ sessionId }: HistoryPageProps) {
  const { session, loading, error } = useSession(sessionId);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  useEffect(() => {
    setSelectedItemId(null);
  }, [sessionId]);

  if (!sessionId) {
    return (
      <div className="flex items-center justify-center h-full text-cabinet-inkMuted text-base">
        选择一个会话查看详情
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-cabinet-border border-t-cabinet-ink rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="flex items-center justify-center h-full text-red-600 text-base">
        加载会话失败: {error || "未知错误"}
      </div>
    );
  }

  const sidebarItems = buildSidebarItems(session);
  const selectedItem = sidebarItems.find((i) => i.id === selectedItemId);

  let content = "";
  let title = session.title || "未命名会话";
  let timestamp = formatDate(session.updatedAt);

  if (selectedItem) {
    if (selectedItem.data?.kind) {
      content = renderAssetDetail(selectedItem.data as Asset);
      title = selectedItem.title;
      timestamp = formatDate(selectedItem.data.createdAt);
    } else if (selectedItem.data?.role) {
      content = renderChatDetail(selectedItem.data as ChatMessage);
      title = selectedItem.title;
      timestamp = "";
    } else if (selectedItem.data?.summary) {
      content = renderAnalysisDetail(selectedItem.data);
      title = "图像分析";
      timestamp = "";
    }
  } else {
    content = renderNodeOverview(session.nodes);
  }

  return (
    <div className="flex h-full">
      <Sidebar
        title="会话内容"
        items={sidebarItems.map((i) => ({
          id: i.id,
          title: i.title,
          summary: i.summary,
          groupLabel: i.groupLabel,
          icon: i.icon,
        }))}
        selectedId={selectedItemId}
        onSelect={setSelectedItemId}
      />
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="px-6 pt-4 pb-2 flex-shrink-0 flex items-center justify-between">
          <div>
            <span className="text-[13px] font-mono text-cabinet-inkMuted">
              {timestamp}
            </span>
            <h1 className="text-2xl font-medium text-cabinet-ink mt-1 leading-tight">
              {title}
            </h1>
          </div>
          <a
            href={`/?session=${sessionId}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-cabinet-ink text-cabinet-paper rounded text-sm font-medium hover:bg-cabinet-ink2 transition-colors"
            title="在画布中打开此会话"
          >
            <ExternalLink size={14} />
            在画布中打开
          </a>
        </div>
        <div className="flex-1 overflow-y-auto cabinet-scrollbar px-8 pb-12">
          <ContentArea title={title} timestamp={timestamp} content={content} />
        </div>
      </div>
    </div>
  );
}
