import { useEffect, useMemo, useState } from "react";
import { useSession } from "../../hooks/useHistory";
import AssetSidebar from "./AssetSidebar";
import AssetDetailPane from "./AssetDetailPane";
import NodeGraphThumbnail from "./NodeGraphThumbnail";
import { useI18n } from "@/lib/i18n";
import { Copy, Download, Share2, Trash2, Menu, X } from "lucide-react";
import type { Asset, OutputKind, SessionDetail } from "@/types";

interface HistoryPageProps {
  sessionId: string | null;
  outputKind: OutputKind;
}

interface ExportPreview {
  title: string;
  nodeCount: number;
  linkCount: number;
  assetCount: number;
  chatMessageCount: number;
  estimatedAssetBytes: number;
  warnings?: Array<{ type: string; count?: number; message?: string }>;
}

interface ShareLink {
  token: string;
  type: "session" | "image";
  shareUrl: string;
  createdAt: string;
  expiresAt: string | null;
  accessCount: number;
  lastAccessedAt: string | null;
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
  return asset.mimeType.startsWith("image/");
}

function isVideoAsset(asset: Asset) {
  return asset.mimeType.startsWith("video/");
}

function isDocumentAsset(asset: Asset) {
  return asset.kind === "upload" && !isImageAsset(asset) && !isVideoAsset(asset);
}

function nodeImageUrl(node: SessionDetail["nodes"][number]): string | null {
  const direct = node.data?.imageUrl;
  if (typeof direct === "string" && direct) return direct;
  const card = node.data?.sourceCard?.imageUrl;
  if (typeof card === "string" && card) return card;
  const hash = node.data?.imageHash || node.data?.sourceCard?.imageHash;
  if (typeof hash === "string" && /^[a-f0-9]{64}$/i.test(hash)) {
    const kind = node.type === "generated" ? "generated" : "upload";
    return `/api/assets/${hash}?kind=${kind}`;
  }
  return typeof hash === "string" && hash ? hash : null;
}

function nodeVideoUrl(node: SessionDetail["nodes"][number]): string | null {
  const direct = node.data?.videoUrl;
  if (typeof direct === "string" && direct) return direct;
  const card = node.data?.sourceCard?.sourceVideoUrl || node.data?.sourceCard?.videoUrl;
  if (typeof card === "string" && card) return card;
  const hash = node.data?.videoHash || node.data?.sourceVideoHash || node.data?.sourceCard?.sourceVideoHash || node.data?.sourceCard?.videoHash;
  if (typeof hash === "string" && /^[a-f0-9]{64}$/i.test(hash)) {
    const kind = node.type === "generated" ? "generated" : "upload";
    return `/api/assets/${hash}?kind=${kind}`;
  }
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
  if (outputKind === "video") {
    const referencedHashes = new Set(session.assets.map((asset) => asset.hash));
    return [
      ...session.assets.filter(isVideoAsset).map((asset) => asset.id),
      ...session.nodes
        .filter((node) => {
          if (node.type !== "source-card") return false;
          if (!nodeVideoUrl(node)) return false;
          const hash = node.data?.sourceVideoHash || node.data?.sourceCard?.sourceVideoHash || node.data?.sourceCard?.videoHash;
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

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isOutputIdForKind(session: SessionDetail | null, outputKind: OutputKind, id: string | null) {
  if (!id) return false;
  return Boolean(outputIdsForKind(session, outputKind)?.includes(id));
}

export default function HistoryPage({ sessionId, outputKind }: HistoryPageProps) {
  const { session, loading, error, refetch } = useSession(sessionId);
  const [selectedAssetIdIntent, setSelectedAssetIdIntent] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [exportPreview, setExportPreview] = useState<ExportPreview | null>(null);
  const [shares, setShares] = useState<ShareLink[]>([]);
  const [shareExpiry, setShareExpiry] = useState("30");
  const [shareBusy, setShareBusy] = useState(false);
  const { t } = useI18n();
  const nodeCount = session?.nodeCount ?? session?.nodes.length ?? 0;
  const assetCount = session?.assetCount ?? session?.assets.length ?? 0;

  const firstOutputId = useMemo(() => getFirstOutputId(session, outputKind), [session, outputKind]);
  const selectedAssetId = isOutputIdForKind(session, outputKind, selectedAssetIdIntent)
    ? selectedAssetIdIntent
    : firstOutputId;
  const showBlueprint = Boolean(session && selectedAssetId && selectedAssetId === firstOutputId);
  const canManageShares = Boolean(session && session.source !== "system" && !session.hidden);

  useEffect(() => {
    setExportPreview(null);
    setShares([]);
    if (!session?.id) return;
    let cancelled = false;

    fetch(`/api/sessions/${session.id}/export/preview`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
        if (!cancelled) setExportPreview(data);
      })
      .catch(() => {
        if (!cancelled) setExportPreview(null);
      });

    if (session.source !== "system") {
      fetch(`/api/sessions/${session.id}/shares`)
        .then(async (res) => {
          const data = await res.json();
          if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
          if (!cancelled) setShares(data.shares || []);
        })
        .catch(() => {
          if (!cancelled) setShares([]);
        });
    }

    return () => {
      cancelled = true;
    };
  }, [session?.id, session?.source]);

  const refreshShares = async () => {
    if (!session?.id || !canManageShares) return;
    const res = await fetch(`/api/sessions/${session.id}/shares`);
    const data = await res.json();
    if (res.ok) setShares(data.shares || []);
  };

  const createShare = async () => {
    if (!session?.id || !canManageShares) return;
    setShareBusy(true);
    try {
      const expiresInDays = shareExpiry === "never" ? null : Number(shareExpiry);
      const res = await fetch(`/api/sessions/${session.id}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expiresInDays })
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      const fullUrl = `${window.location.origin}${data.shareUrl}`;
      await navigator.clipboard?.writeText(fullUrl).catch(() => undefined);
      await refreshShares();
    } catch (shareError) {
      console.error("Create share failed", shareError);
      alert(t("share.createFailed"));
    } finally {
      setShareBusy(false);
    }
  };

  const deleteShare = async (token: string) => {
    if (!canManageShares) return;
    try {
      const res = await fetch(`/api/share/${token}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await refreshShares();
    } catch (shareError) {
      console.error("Delete share failed", shareError);
      alert(t("share.deleteFailed"));
    }
  };

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
                  <span>·</span>
                  <span>{session.source === "system" ? t("source.system") : t("source.user")}</span>
                </div>
              </div>
              <a
                href={`/app.html?session=${session.id}`}
                className="inline-flex items-center px-5 py-2 bg-cabinet-blue text-cabinet-paper text-sm font-medium rounded-full hover:bg-cabinet-cyan transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cabinet-blue focus-visible:ring-offset-2 flex-shrink-0"
              >
                {t("cabinet.openInCanvas")}
              </a>
            </div>
            <div className="mt-5 rounded-lg border border-cabinet-border bg-cabinet-itemBg/55 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={`/api/sessions/${session.id}/export`}
                  className="inline-flex h-8 items-center gap-1.5 rounded border border-cabinet-border bg-cabinet-paper px-3 text-xs font-medium text-cabinet-ink hover:bg-cabinet-bg"
                >
                  <Download size={14} />
                  {t("history.export")}
                </a>
                <span className="text-xs text-cabinet-inkMuted">
                  {exportPreview
                    ? t("history.exportPreviewStats", {
                        nodes: exportPreview.nodeCount,
                        assets: exportPreview.assetCount,
                        chats: exportPreview.chatMessageCount,
                        size: formatBytes(exportPreview.estimatedAssetBytes)
                      })
                    : t("history.exportPreviewLoading")}
                </span>
                <div className="flex-1" />
                {canManageShares && (
                  <>
                    <select
                      value={shareExpiry}
                      onChange={(event) => setShareExpiry(event.target.value)}
                      className="h-8 rounded border border-cabinet-border bg-cabinet-paper px-2 text-xs text-cabinet-ink outline-none"
                      aria-label={t("share.expires")}
                    >
                      <option value="7">{t("share.expiry7")}</option>
                      <option value="30">{t("share.expiry30")}</option>
                      <option value="90">{t("share.expiry90")}</option>
                      <option value="never">{t("share.expiryNever")}</option>
                    </select>
                    <button
                      type="button"
                      onClick={createShare}
                      disabled={shareBusy}
                      className="inline-flex h-8 items-center gap-1.5 rounded bg-cabinet-ink px-3 text-xs font-medium text-cabinet-paper hover:bg-cabinet-ink2 disabled:opacity-50"
                    >
                      <Share2 size={14} />
                      {shareBusy ? t("share.creating") : t("share.create")}
                    </button>
                  </>
                )}
              </div>
              {canManageShares && shares.length > 0 && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-xs font-medium text-cabinet-ink">
                    {t("share.links")} ({shares.length})
                  </summary>
                  <div className="mt-2 space-y-2">
                    {shares.map((share) => {
                      const fullUrl = `${window.location.origin}${share.shareUrl}`;
                      return (
                        <div key={share.token} className="flex flex-wrap items-center gap-2 rounded border border-cabinet-border bg-cabinet-paper px-3 py-2 text-xs text-cabinet-inkMuted">
                          <span className="font-medium text-cabinet-ink">{share.type === "image" ? t("share.imageType") : t("share.sessionType")}</span>
                          <span>{t("share.visits", { count: share.accessCount || 0 })}</span>
                          <span>{share.expiresAt ? `${t("share.expires")} ${new Date(share.expiresAt).toLocaleDateString()}` : t("share.expiryNever")}</span>
                          {share.lastAccessedAt && <span>{t("share.lastAccessed")} {new Date(share.lastAccessedAt).toLocaleString()}</span>}
                          <div className="flex-1 min-w-[120px] truncate text-cabinet-inkMuted">{fullUrl}</div>
                          <button
                            type="button"
                            onClick={() => navigator.clipboard?.writeText(fullUrl)}
                            className="flex h-7 w-7 items-center justify-center rounded hover:bg-cabinet-itemBg"
                            aria-label={t("share.copyLink")}
                            title={t("share.copyLink")}
                          >
                            <Copy size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => void deleteShare(share.token)}
                            className="flex h-7 w-7 items-center justify-center rounded hover:bg-cabinet-itemBg hover:text-[#d53b00]"
                            aria-label={t("share.delete")}
                            title={t("share.delete")}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </details>
              )}
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
