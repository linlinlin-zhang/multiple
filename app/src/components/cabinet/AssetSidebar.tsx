import { FileText, Globe2, Image, MessageSquare } from "lucide-react";
import type { ReactNode } from "react";
import Sidebar from "./Sidebar";
import { useI18n } from "@/lib/i18n";
import type { SessionDetail, Asset, Node, ChatMessage, OutputKind } from "@/types";

interface AssetSidebarProps {
  session: SessionDetail | null;
  outputKind: OutputKind;
  selectedAssetId: string | null;
  onSelectAsset: (id: string) => void;
}

interface OutputSidebarItem {
  id: string;
  title: string;
  summary: string;
  groupLabel?: string;
  icon?: ReactNode;
}

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function isImageAsset(asset: Asset) {
  return asset.kind === "generated" || asset.mimeType.startsWith("image/");
}

function isDocumentAsset(asset: Asset) {
  return asset.kind === "upload" && !isImageAsset(asset);
}

function titleFromUrl(url: string, fallback: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return fallback;
  }
}

function summarizeText(value: string, max = 82) {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max)}...` : clean;
}

function imageItems(session: SessionDetail, t: (key: string) => string): OutputSidebarItem[] {
  return session.assets.filter(isImageAsset).map((asset) => ({
    id: asset.id,
    title: asset.fileName || (asset.kind === "generated" ? t("asset.generatedImage") : t("asset.uploadedFile")),
    summary: `${asset.mimeType} · ${formatBytes(asset.fileSize)}`,
    groupLabel: t("history.tabImages"),
    icon: <Image size={16} className="text-cabinet-blue" />,
  }));
}

function webItems(session: SessionDetail, t: (key: string) => string): OutputSidebarItem[] {
  return session.nodes
    .filter((node: Node) => typeof node.data?.sourceUrl === "string" && node.data.sourceUrl)
    .map((node) => {
      const url = String(node.data.sourceUrl);
      return {
        id: node.id,
        title: titleFromUrl(url, t("asset.webLink")),
        summary: url.length > 76 ? `${url.slice(0, 76)}...` : url,
        groupLabel: t("history.tabWeb"),
        icon: <Globe2 size={16} className="text-cabinet-blue" />,
      };
    });
}

function documentItems(session: SessionDetail, t: (key: string) => string): OutputSidebarItem[] {
  const files = session.assets.filter(isDocumentAsset).map((asset) => ({
    id: asset.id,
    title: asset.fileName || t("asset.document"),
    summary: `${asset.mimeType} · ${formatBytes(asset.fileSize)}`,
    groupLabel: t("asset.files"),
    icon: <FileText size={16} className="text-cabinet-blue" />,
  }));

  const textSources = session.nodes
    .filter((node: Node) => node.type === "source" && node.data?.sourceType === "text")
    .map((node) => ({
      id: node.id,
      title: (node.data?.fileName as string | undefined) || t("asset.document"),
      summary: summarizeText(String(node.data?.sourceText || t("asset.document"))),
      groupLabel: t("history.textSources"),
      icon: <FileText size={16} className="text-cabinet-blue" />,
    }));

  return [...files, ...textSources];
}

function chatItems(session: SessionDetail, t: (key: string) => string): OutputSidebarItem[] {
  return session.chatMessages.slice(0, 80).map((msg: ChatMessage) => ({
    id: msg.id,
    title: msg.role === "user" ? t("detail.you") : t("detail.ai"),
    summary: summarizeText(msg.content),
    groupLabel: t("share.chatRecord"),
    icon: <MessageSquare size={16} className="text-cabinet-blue" />,
  }));
}

function buildOutputItems(
  session: SessionDetail | null,
  outputKind: OutputKind,
  t: (key: string) => string
): OutputSidebarItem[] {
  if (!session) return [];
  if (outputKind === "image") return imageItems(session, t);
  if (outputKind === "web") return webItems(session, t);
  if (outputKind === "chat") return chatItems(session, t);
  return documentItems(session, t);
}

export default function AssetSidebar({ session, outputKind, selectedAssetId, onSelectAsset }: AssetSidebarProps) {
  const { t } = useI18n();
  const items = buildOutputItems(session, outputKind, t);

  return (
    <Sidebar
      title={t("history.outputContents")}
      items={items}
      selectedId={selectedAssetId}
      onSelect={onSelectAsset}
      emptyMessage={t("history.noOutputsInFolder")}
      className="w-full min-w-0"
    />
  );
}
