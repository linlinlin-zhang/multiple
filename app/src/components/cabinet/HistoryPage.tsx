import { useMemo, useState } from "react";
import { useSession } from "../../hooks/useHistory";
import AssetSidebar from "./AssetSidebar";
import AssetDetailPane from "./AssetDetailPane";
import NodeGraphThumbnail from "./NodeGraphThumbnail";
import { useI18n } from "@/lib/i18n";
import { Menu, X } from "lucide-react";
import type { Asset, OutputKind, SessionDetail } from "@/types";

interface HistoryPageProps {
  sessionId: string | null;
  outputKind: OutputKind;
}

function SkeletonHistoryPage() {
  return (
    <div className="flex h-full">
      <div className="hidden md:flex w-[300px] min-w-[300px] bg-cabinet-paper border-r border-cabinet-border flex-col h-full animate-pulse">
        <div className="px-5 py-5">
          <div className="h-4 w-24 bg-cabinet-itemBg rounded" />
        </div>
        <div className="border-b border-cabinet-border" />
        <div className="flex-1 px-4 py-4 space-y-4">
          <div className="h-3 w-16 bg-cabinet-itemBg rounded" />
          <div className="h-12 bg-cabinet-itemBg rounded" />
          <div className="h-12 bg-cabinet-itemBg rounded" />
        </div>
      </div>
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-cabinet-paper animate-pulse">
        <div className="px-5 md:px-9 pt-7 pb-4 flex-shrink-0 space-y-3">
          <div className="h-4 w-48 bg-cabinet-itemBg rounded" />
          <div className="h-8 w-80 max-w-full bg-cabinet-itemBg rounded" />
        </div>
        <div className="px-5 md:px-9 py-4">
          <div className="w-full h-[180px] md:h-[240px] bg-cabinet-itemBg rounded-[24px]" />
        </div>
      </div>
    </div>
  );
}

function isImageAsset(asset: Asset) {
  return asset.kind === "generated" || asset.mimeType.startsWith("image/");
}

function isDocumentAsset(asset: Asset) {
  return asset.kind === "upload" && !isImageAsset(asset);
}

function nodeImageUrl(node: SessionDetail["nodes"][number]): string | null {
  const direct = node.data?.imageUrl;
  if (typeof direct === "string" && direct) return direct;
  const card = node.data?.sourceCard?.imageUrl;
  if (typeof card === "string" && card) return card;
  const hash = node.data?.imageHash || node.data?.sourceCard?.imageHash;
  return typeof hash === "string" && hash ? hash : null;
}

function nodeWebUrl(node: SessionDetail["nodes"][number]): string | null {
  const contentUrl = node.data?.option?.content?.url;
  if (typeof contentUrl === "string" && contentUrl) return contentUrl;
  const direct = node.data?.sourceUrl;
  if (typeof direct === "string" && direct) return direct;
  const card = node.data?.sourceCard?.sourceUrl;
  if (typeof card === "string" && card) return card;
  const refs = node.data?.option?.references || node.data?.references || node.data?.sourceCard?.references;
  if (Array.isArray(refs)) {
    const first = refs.find((ref: { url?: string }) => typeof ref?.url === "string" && ref.url);
    if (first?.url) return first.url;
  }
  return null;
}

function isDeepThinkDocumentNode(node: SessionDetail["nodes"][number]) {
  if (node.type !== "option") return false;
  if (node.data?.option?.layoutHint !== "deep-think") return false;
  const refs = node.data?.option?.references || node.data?.references || [];
  return !Array.isArray(refs) || refs.length === 0 || !refs.some((ref: { url?: string }) => ref?.url);
}

function outputIdsForKind(session: SessionDetail | null, outputKind: OutputKind) {
  if (!session) return null;
  if (outputKind === "image") {
    const referencedHashes = new Set(session.assets.map((asset) => asset.hash));
    return [
      ...session.assets.filter(isImageAsset).map((asset) => asset.id),
      ...session.nodes
        .filter((node) => {
          if (node.type !== "source-card") return false;
          if (!nodeImageUrl(node)) return false;
          const hash = node.data?.imageHash || node.data?.sourceCard?.imageHash;
          return !(typeof hash === "string" && referencedHashes.has(hash));
        })
        .map((node) => node.id)
    ];
  }
  if (outputKind === "web") {
    return session.nodes.filter((node) => nodeWebUrl(node)).map((node) => node.id);
  }
  if (outputKind === "chat") {
    return session.chatMessages.map((message) => message.id);
  }
  return (
    [
      ...session.assets.filter(isDocumentAsset).map((asset) => asset.id),
      ...session.nodes
        .filter((node) => (node.type === "source" && node.data?.sourceType === "text") || isDeepThinkDocumentNode(node))
        .map((node) => node.id)
    ]
  );
}

function getFirstOutputId(session: SessionDetail | null, outputKind: OutputKind) {
  return outputIdsForKind(session, outputKind)?.[0] ?? null;
}

function isOutputIdForKind(session: SessionDetail | null, outputKind: OutputKind, id: string | null) {
  if (!id) return false;
  return Boolean(outputIdsForKind(session, outputKind)?.includes(id));
}

export default function HistoryPage({ sessionId, outputKind }: HistoryPageProps) {
  const { session, loading, error, refetch } = useSession(sessionId);
  const [selectedAssetIdIntent, setSelectedAssetIdIntent] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { t } = useI18n();
  const nodeCount = session?.nodeCount ?? session?.nodes.length ?? 0;
  const assetCount = session?.assetCount ?? session?.assets.length ?? 0;

  const firstOutputId = useMemo(() => getFirstOutputId(session, outputKind), [session, outputKind]);
  const selectedAssetId = isOutputIdForKind(session, outputKind, selectedAssetIdIntent)
    ? selectedAssetIdIntent
    : firstOutputId;
  const showBlueprint = Boolean(session && selectedAssetId && selectedAssetId === firstOutputId);

  if (loading && !session) {
    return <SkeletonHistoryPage />;
  }

  return (
    <div className="flex h-full flex-col md:flex-row relative">
      <button
        onClick={() => setSidebarOpen(true)}
        className="md:hidden absolute top-4 left-4 z-30 w-10 h-10 flex items-center justify-center rounded-full bg-cabinet-paper border border-cabinet-border shadow-[0_8px_16px_rgba(0,0,0,0.08)]"
        aria-label={t("history.openOutputs")}
      >
        <Menu size={18} className="text-cabinet-ink" />
      </button>

      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/20"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative w-[300px] bg-cabinet-paper h-full shadow-lg">
            <div className="flex items-center justify-between px-4 py-3 border-b border-cabinet-border">
              <span className="text-sm font-medium text-cabinet-ink">{t("history.outputContents")}</span>
              <button
                onClick={() => setSidebarOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded hover:bg-cabinet-itemBg"
                aria-label={t("cabinet.closeSidebar")}
              >
                <X size={18} className="text-cabinet-ink" />
              </button>
            </div>
            <AssetSidebar
              session={session}
              outputKind={outputKind}
              selectedAssetId={selectedAssetId}
              onSelectAsset={(id) => {
                setSelectedAssetIdIntent(id);
                setSidebarOpen(false);
              }}
            />
          </div>
        </div>
      )}

      <div className="hidden md:flex w-[300px] min-w-[300px] bg-cabinet-paper border-r border-cabinet-border flex-col h-full">
        <AssetSidebar
          session={session}
          outputKind={outputKind}
          selectedAssetId={selectedAssetId}
          onSelectAsset={setSelectedAssetIdIntent}
        />
      </div>

      <div className="flex-1 flex flex-col h-full overflow-y-auto cabinet-scrollbar bg-cabinet-paper">
        {error && (
          <div className="px-5 md:px-9 py-3 bg-cabinet-paper border-b border-cabinet-border flex items-center justify-between flex-shrink-0 sticky top-0 z-10">
            <span className="text-sm text-[#d53b00]">{error}</span>
            <button
              onClick={refetch}
              className="text-sm text-cabinet-blue font-medium hover:underline"
            >
              {t("history.retry")}
            </button>
          </div>
        )}

        {session && (
          <div className="px-5 md:px-9 pt-7 pb-3">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-[13px] text-cabinet-inkMuted mb-3">
                  {t("history.lastEdited")} {new Date(session.updatedAt || session.createdAt).toLocaleString()}
                </div>
                <h1 className="text-2xl md:text-[34px] font-medium text-cabinet-ink leading-tight tracking-[0] truncate">
                  {session.title || t("session.unnamed")}
                </h1>
                <div className="flex items-center gap-3 mt-3 text-[13px] md:text-[14px] text-cabinet-inkMuted flex-wrap">
                  <span>{new Date(session.createdAt).toLocaleString()}</span>
                  <span>·</span>
                  <span>{nodeCount} {t("history.nodeCount")}</span>
                  <span>·</span>
                  <span>{assetCount} {t("history.assetCount")}</span>
                </div>
              </div>
              <a
                href={`/?session=${session.id}`}
                className="inline-flex items-center px-5 py-2 bg-cabinet-blue text-cabinet-paper text-sm font-medium rounded-full hover:bg-cabinet-cyan transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cabinet-blue focus-visible:ring-offset-2 flex-shrink-0"
              >
                {t("cabinet.openInCanvas")}
              </a>
            </div>
          </div>
        )}

        {showBlueprint && session && (
          <div className="px-5 md:px-9 py-4">
            <div className="h-[180px] md:h-[245px] rounded-[24px] overflow-hidden bg-cabinet-bg">
              <NodeGraphThumbnail nodes={session.nodes} links={session.links} />
            </div>
          </div>
        )}

        <AssetDetailPane
          session={session}
          selectedAssetId={selectedAssetId}
          emptyMessage={t("history.noOutputsInFolder")}
        />
      </div>
    </div>
  );
}
