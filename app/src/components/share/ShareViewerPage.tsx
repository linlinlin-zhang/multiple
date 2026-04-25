import { useState, useEffect } from "react";
import NodeGraphThumbnail from "../cabinet/NodeGraphThumbnail";
import { buildAssetUrl } from "../../hooks/useHistory";

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
    data: any;
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
      <div className="min-h-screen bg-cabinet-bg text-cabinet-text font-sans flex flex-col items-center justify-center">
        <div className="w-6 h-6 border-2 border-cabinet-border border-t-cabinet-accent rounded-full animate-spin mb-3" />
        <p className="text-sm text-cabinet-muted">加载分享内容...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-cabinet-bg text-cabinet-text font-sans flex flex-col items-center justify-center px-4">
        <p className="text-red-600 mb-4">无法加载分享内容：{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-white border border-cabinet-border rounded-lg text-sm hover:bg-cabinet-bg transition-colors"
        >
          重试
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-cabinet-bg text-cabinet-text font-sans flex items-center justify-center">
        <p className="text-cabinet-muted">无法加载分享内容。</p>
      </div>
    );
  }

  const snapshot = data.snapshot;
  const hasContent = snapshot.nodes.length > 0 || snapshot.assets.length > 0;

  return (
    <div className="min-h-screen bg-cabinet-bg text-cabinet-text font-sans">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur border-b border-cabinet-border px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">{snapshot.title || "未命名会话"}</h1>
        <span className="text-sm text-cabinet-muted">
          分享于 {new Date(data.createdAt).toLocaleString("zh-CN")}
        </span>
      </header>

      {/* Main */}
      <main className="max-w-[1200px] mx-auto px-4 md:px-8 py-6 space-y-6">
        {!hasContent ? (
          <div className="bg-white rounded-xl border border-cabinet-border p-8 text-center">
            <p className="text-cabinet-muted">该会话没有可展示的内容。</p>
          </div>
        ) : (
          <>
            {/* Node Graph Thumbnail */}
            <div className="bg-white rounded-xl border border-cabinet-border p-4 shadow-sm">
              <h2 className="text-sm font-medium text-cabinet-muted mb-3">节点图概览</h2>
              <NodeGraphThumbnail nodes={snapshot.nodes as any} links={snapshot.links as any} />
            </div>

            {/* Assets Grid */}
            {snapshot.assets.length > 0 && (
              <div className="bg-white rounded-xl border border-cabinet-border p-4 shadow-sm">
                <h2 className="text-sm font-medium text-cabinet-muted mb-3">素材</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {snapshot.assets.map((asset, idx) => (
                    <div
                      key={`${asset.hash}-${idx}`}
                      className="bg-white rounded-lg border border-cabinet-border overflow-hidden shadow-sm"
                    >
                      <img
                        src={buildAssetUrl(asset.hash, asset.kind)}
                        loading="lazy"
                        alt={asset.fileName || asset.hash.slice(0, 8)}
                        className="w-full h-32 object-cover"
                      />
                      <div className="p-2 flex items-center justify-between">
                        <span className="text-xs text-cabinet-muted truncate max-w-[70%]">
                          {asset.fileName || asset.hash.slice(0, 12)}
                        </span>
                        <span className="text-[10px] text-cabinet-muted">
                          {formatBytes(asset.fileSize)}
                        </span>
                      </div>
                      <div className="px-2 pb-2">
                        <span
                          className={`inline-block text-[10px] px-1.5 py-0.5 rounded ${
                            asset.kind === "upload"
                              ? "bg-blue-50 text-blue-700"
                              : "bg-purple-50 text-purple-700"
                          }`}
                        >
                          {asset.kind === "upload" ? "原图" : "生成图"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Chat Messages */}
            {snapshot.chatMessages.length > 0 && (
              <div className="bg-white rounded-xl border border-cabinet-border p-4 shadow-sm">
                <h2 className="text-sm font-medium text-cabinet-muted mb-3">对话记录</h2>
                <div className="space-y-3">
                  {snapshot.chatMessages.map((msg, idx) => (
                    <div key={idx} className="flex gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium shrink-0 ${
                          msg.role === "user"
                            ? "bg-gray-100 text-gray-700"
                            : "bg-green-50 text-green-700"
                        }`}
                      >
                        {msg.role === "user" ? "用户" : "AI"}
                      </div>
                      <div
                        className={`p-3 rounded-lg text-sm whitespace-pre-wrap flex-1 ${
                          msg.role === "user" ? "bg-gray-50" : "bg-green-50/50"
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
