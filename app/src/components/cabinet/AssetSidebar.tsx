import { FileText, Globe2, Image, MessageSquare, Sparkles } from "lucide-react";
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

function nodeImageUrl(node: Node): string | null {
  const direct = node.data?.imageUrl;
  if (typeof direct === "string" && direct) return direct;
  const card = node.data?.sourceCard?.imageUrl;
  if (typeof card === "string" && card) return card;
  const hash = node.data?.imageHash || node.data?.sourceCard?.imageHash;
  if (typeof hash === "string" && /^[a-f0-9]{64}$/i.test(hash)) {
    return `/api/assets/${hash}?kind=upload`;
  }
  return null;
}

function nodeWebUrl(node: Node): string | null {
  const direct = node.data?.sourceUrl;
  if (typeof direct === "string" && direct) return direct;
  const card = node.data?.sourceCard?.sourceUrl;
  if (typeof card === "string" && card) return card;
  const refs = node.data?.option?.references || node.data?.references;
  if (Array.isArray(refs)) {
    const first = refs.find((r: { url?: string }) => typeof r?.url === "string" && r.url);
    if (first) return first.url as string;
  }
  return null;
}

function imageItems(session: SessionDetail, t: (key: string) => string): OutputSidebarItem[] {
  const fromAssets = session.assets.filter(isImageAsset).map((asset) => ({
    id: asset.id,
    title: asset.fileName || (asset.kind === "generated" ? t("asset.generatedImage") : t("asset.uploadedFile")),
    summary: `${asset.mimeType} · ${formatBytes(asset.fileSize)}`,
    groupLabel: t("history.tabImages"),
    icon: <Image size={16} className="text-cabinet-blue" />,
  }));

  const referencedHashes = new Set(session.assets.map((a) => a.hash));
  const fromNodes = session.nodes
    .filter((node) => {
      if (node.type !== "source-card") return false;
      const url = nodeImageUrl(node);
      if (!url) return false;
      const hash = node.data?.imageHash || node.data?.sourceCard?.imageHash;
      if (typeof hash === "string" && referencedHashes.has(hash)) return false;
      return true;
    })
    .map((node) => {
      const card = node.data?.sourceCard || {};
      const title = String(card.fileName || card.title || node.data?.fileName || t("asset.generatedImage"));
      const summary = String(card.summary || card.sourceUrl || node.data?.summary || t("history.imageReference"));
      return {
        id: node.id,
        title,
        summary: summarizeText(summary),
        groupLabel: t("history.imageRefGroup"),
        icon: <Image size={16} className="text-cabinet-blue" />,
      };
    });

  return [...fromAssets, ...fromNodes];
}

function webItems(session: SessionDetail, t: (key: string) => string): OutputSidebarItem[] {
  const items: OutputSidebarItem[] = [];
  for (const node of session.nodes) {
    const url = nodeWebUrl(node);
    if (!url) continue;
    const title =
      (node.data?.sourceCard?.title as string | undefined) ||
      (node.data?.option?.title as string | undefined) ||
      (node.data?.title as string | undefined) ||
      titleFromUrl(url, t("asset.webLink"));
    const description =
      (node.data?.sourceCard?.summary as string | undefined) ||
      (node.data?.option?.description as string | undefined) ||
      url;
    const isDeepThink = node.data?.option?.layoutHint === "deep-think";
    items.push({
      id: node.id,
      title: summarizeText(String(title), 60),
      summary: summarizeText(String(description), 90),
      groupLabel: isDeepThink ? t("history.deepThinkGroup") : t("history.tabWeb"),
      icon: isDeepThink
        ? <Sparkles size={16} className="text-cabinet-blue" />
        : <Globe2 size={16} className="text-cabinet-blue" />,
    });
  }
  return items;
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

  const deepThinkNotes = session.nodes
    .filter((node: Node) => {
      if (node.type !== "option") return false;
      if (node.data?.option?.layoutHint !== "deep-think") return false;
      const refs = node.data?.option?.references || node.data?.references || [];
      return !Array.isArray(refs) || refs.length === 0 || !refs.some((r: { url?: string }) => r?.url);
    })
    .map((node) => ({
      id: node.id,
      title: String(node.data?.option?.title || node.data?.title || t("history.deepThinkGroup")),
      summary: summarizeText(String(node.data?.option?.description || node.data?.description || "")),
      groupLabel: t("history.deepThinkGroup"),
      icon: <Sparkles size={16} className="text-cabinet-blue" />,
    }));

  return [...files, ...textSources, ...deepThinkNotes];
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
