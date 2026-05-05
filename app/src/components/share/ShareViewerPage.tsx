import { useEffect, useState } from "react";
import NodeGraphThumbnail from "../cabinet/NodeGraphThumbnail";
import { buildAssetUrl } from "../../hooks/useHistory";
import { useI18n } from "@/lib/i18n";
import type { NodeData } from "@/types";

interface ShareSnapshot {
  title: string;
  isDemo: boolean;
  createdAt: string;
  viewState: { x: number; y: number; scale: number } | null;
  nodes: Array<{
    nodeId: string;
    type: string;
    x: number;
    y: number;
    width: number;
    height: number;
    data: NodeData;
    collapsed: boolean;
  }>;
  links: Array<{
    fromNodeId: string;
    toNodeId: string;
    kind: string;
  }>;
  assets: Array<{
    hash: string;
    kind: "upload" | "generated";
    mimeType: string;
    fileSize: number;
    fileName: string | null;
  }>;
  chatMessages: Array<{
    role: string;
    content: string;
  }>;
}

interface ShareResponse {
  ok: boolean;
  token: string;
  createdAt: string;
  expiresAt: string | null;
  snapshot: ShareSnapshot;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export default function ShareViewerPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ShareResponse | null>(null);
  const { t } = useI18n();

  const token = window.location.pathname.split("/").pop() || "";

  useEffect(() => {
    let cancelled = false;

    async function fetchShare() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/share/${token}`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `HTTP ${res.status}`);
        }
        const json = await res.json();
        if (!json.ok) {
          throw new Error(json.error || "Failed to load share");
        }
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchShare();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-cabinet-bg text-cabinet-ink font-sans flex flex-col items-center justify-center">
        <div className="w-7 h-7 border-2 border-cabinet-border border-t-cabinet-blue rounded-full animate-spin mb-3" />
        <p className="text-sm text-cabinet-inkMuted">{t("share.loading")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-cabinet-bg text-cabinet-ink font-sans flex flex-col items-center justify-center px-4">
        <p className="text-[#d53b00] mb-4">{t("share.loadFailed")}{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-5 py-2 bg-cabinet-blue text-white rounded-full text-sm hover:bg-cabinet-cyan hover:scale-110 transition-transform"
        >
          {t("share.retry")}
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-cabinet-bg text-cabinet-ink font-sans flex items-center justify-center">
        <p className="text-cabinet-inkMuted">{t("share.loadFailed")}</p>
      </div>
    );
  }

  const snapshot = data.snapshot;
  const hasContent = snapshot.nodes.length > 0 || snapshot.assets.length > 0;

  return (
    <div className="min-h-screen bg-cabinet-bg text-cabinet-ink font-sans">
      <header className="bg-black text-white px-6 py-5 flex items-center justify-between gap-4">
        <h1 className="text-xl md:text-2xl font-light leading-tight">
          {snapshot.title || t("session.unnamed")}
        </h1>
        <span className="text-sm text-white/70">
          {t("share.sharedAt")} {new Date(data.createdAt).toLocaleString()}
        </span>
      </header>

      <main className="max-w-[1200px] mx-auto px-4 md:px-8 py-8 space-y-6">
        {!hasContent ? (
          <div className="bg-white rounded-3xl border border-cabinet-border p-8 text-center shadow-[0_8px_16px_rgba(0,0,0,0.08)]">
            <p className="text-cabinet-inkMuted">{t("share.noContent")}</p>
          </div>
        ) : (
          <>
            <section className="bg-white rounded-3xl border border-cabinet-border p-5 shadow-[0_8px_16px_rgba(0,0,0,0.08)]">
              <h2 className="text-base font-medium text-cabinet-ink mb-4">{t("share.nodeOverview")}</h2>
              <NodeGraphThumbnail nodes={snapshot.nodes} links={snapshot.links} />
            </section>

            {snapshot.assets.length > 0 && (
              <section className="bg-white rounded-3xl border border-cabinet-border p-5 shadow-[0_8px_16px_rgba(0,0,0,0.08)]">
                <h2 className="text-base font-medium text-cabinet-ink mb-4">{t("share.assets")}</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {snapshot.assets.map((asset, idx) => (
                    <div
                      key={`${asset.hash}-${idx}`}
                      className="bg-white rounded-3xl border border-cabinet-border overflow-hidden shadow-[0_5px_9px_rgba(0,0,0,0.06)]"
                    >
                      <img
                        src={buildAssetUrl(asset.hash, asset.kind)}
                        loading="lazy"
                        alt={asset.fileName || asset.hash.slice(0, 8)}
                        className="w-full h-32 object-cover"
                      />
                      <div className="p-3 flex items-center justify-between gap-2">
                        <span className="text-xs text-cabinet-inkMuted truncate">
                          {asset.fileName || asset.hash.slice(0, 12)}
                        </span>
                        <span className="text-[11px] text-cabinet-inkMuted shrink-0">
                          {formatBytes(asset.fileSize)}
                        </span>
                      </div>
                      <div className="px-3 pb-3">
                        <span className="inline-block text-[11px] px-2 py-1 rounded-full bg-cabinet-bg text-cabinet-blue">
                          {asset.kind === "upload" ? t("share.upload") : t("share.generated")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {snapshot.chatMessages.length > 0 && (
              <section className="bg-white rounded-3xl border border-cabinet-border p-5 shadow-[0_8px_16px_rgba(0,0,0,0.08)]">
                <h2 className="text-base font-medium text-cabinet-ink mb-4">{t("share.chatRecord")}</h2>
                <div className="space-y-3">
                  {snapshot.chatMessages.map((msg, idx) => (
                    <div key={idx} className="flex gap-3">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-medium shrink-0 ${
                          msg.role === "user"
                            ? "bg-cabinet-bg text-cabinet-ink"
                            : "bg-cabinet-blue text-white"
                        }`}
                      >
                        {msg.role === "user" ? t("share.me") : t("share.ai")}
                      </div>
                      <div className="p-4 rounded-3xl text-sm whitespace-pre-wrap flex-1 bg-cabinet-bg text-cabinet-ink leading-relaxed">
                        {msg.content}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
