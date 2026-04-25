import { useState, useEffect } from "react";
import { useSession } from "../../hooks/useHistory";
import AssetSidebar from "./AssetSidebar";
import AssetDetailPane from "./AssetDetailPane";
import NodeGraphThumbnail from "./NodeGraphThumbnail";
import { Menu, X } from "lucide-react";

interface HistoryPageProps {
  sessionId: string | null;
}

function SkeletonHistoryPage() {
  return (
    <div className="flex h-full flex-col md:flex-row">
      {/* Sidebar skeleton */}
      <div className="w-full md:w-[280px] min-w-0 bg-cabinet-paper border-r border-cabinet-border flex flex-col h-full animate-pulse">
        <div className="px-4 py-3">
          <div className="h-4 w-24 bg-cabinet-itemBg rounded" />
        </div>
        <div className="border-b border-cabinet-border" />
        <div className="flex-1 px-4 py-4 space-y-4">
          <div className="h-3 w-16 bg-cabinet-itemBg rounded" />
          <div className="h-10 bg-cabinet-itemBg rounded" />
          <div className="h-10 bg-cabinet-itemBg rounded" />
          <div className="h-3 w-16 bg-cabinet-itemBg rounded mt-4" />
          <div className="h-10 bg-cabinet-itemBg rounded" />
        </div>
      </div>

      {/* Detail pane skeleton */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-cabinet-paper animate-pulse">
        <div className="px-4 md:px-8 pt-6 pb-2 flex-shrink-0 space-y-3">
          <div className="h-4 w-48 bg-cabinet-itemBg rounded" />
          <div className="h-6 w-72 bg-cabinet-itemBg rounded" />
        </div>
        <div className="flex-1 px-4 md:px-8 py-4">
          <div className="w-full h-[180px] md:h-[240px] bg-cabinet-itemBg rounded" />
        </div>
      </div>
    </div>
  );
}

export default function HistoryPage({ sessionId }: HistoryPageProps) {
  const { session, loading, error, refetch } = useSession(sessionId);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Auto-select first asset when session loads
  useEffect(() => {
    if (session && selectedAssetId === null) {
      const firstImage = session.assets.find((a) => a.kind === "generated");
      if (firstImage) {
        setSelectedAssetId(firstImage.id);
        return;
      }
      const firstFile = session.assets.find((a) => a.kind === "upload");
      if (firstFile) {
        setSelectedAssetId(firstFile.id);
        return;
      }
      const firstNode = session.nodes[0];
      if (firstNode) {
        setSelectedAssetId(firstNode.id);
        return;
      }
      const firstMsg = session.chatMessages[0];
      if (firstMsg) {
        setSelectedAssetId(firstMsg.id);
      }
    }
  }, [session, selectedAssetId]);

  if (loading && !session) {
    return <SkeletonHistoryPage />;
  }

  return (
    <div className="flex h-full flex-col md:flex-row relative">
      {/* Mobile sidebar toggle */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="md:hidden absolute top-3 left-3 z-30 w-9 h-9 flex items-center justify-center rounded bg-cabinet-paper border border-cabinet-border shadow-sm"
        aria-label="Open sidebar"
      >
        <Menu size={18} className="text-cabinet-ink" />
      </button>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/20"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative w-[280px] bg-cabinet-paper h-full shadow-lg">
            <div className="flex items-center justify-between px-4 py-3 border-b border-cabinet-border">
              <span className="text-sm font-medium text-cabinet-ink">Session Assets</span>
              <button
                onClick={() => setSidebarOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded hover:bg-cabinet-itemBg"
                aria-label="Close sidebar"
              >
                <X size={18} className="text-cabinet-ink" />
              </button>
            </div>
            <AssetSidebar
              session={session}
              selectedAssetId={selectedAssetId}
              onSelectAsset={(id) => {
                setSelectedAssetId(id);
                setSidebarOpen(false);
              }}
            />
          </div>
        </div>
      )}

      {/* Left sidebar - desktop */}
      <div className="hidden md:block w-[280px] min-w-[280px] bg-cabinet-paper border-r border-cabinet-border flex flex-col h-full">
        <AssetSidebar
          session={session}
          selectedAssetId={selectedAssetId}
          onSelectAsset={setSelectedAssetId}
        />
      </div>

      {/* Right pane */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-cabinet-paper">
        {/* Error banner */}
        {error && (
          <div className="px-4 md:px-6 py-3 bg-red-50 border-b border-red-100 flex items-center justify-between flex-shrink-0">
            <span className="text-sm text-red-600">{error}</span>
            <button
              onClick={refetch}
              className="text-sm text-red-700 font-medium hover:underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Session header */}
        {session && (
          <div className="px-4 md:px-8 pt-6 pb-2 flex-shrink-0">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-xl md:text-2xl font-medium text-cabinet-ink leading-tight">
                  {session.title || "Untitled Session"}
                </h1>
                <div className="flex items-center gap-3 mt-2 text-[13px] font-mono text-cabinet-inkMuted flex-wrap">
                  <span>{new Date(session.createdAt).toLocaleString()}</span>
                  <span>·</span>
                  <span>{session.nodeCount} nodes</span>
                  <span>·</span>
                  <span>{session.assetCount} assets</span>
                </div>
              </div>
              <a
                href={`/?session=${session.id}`}
                className="inline-flex items-center px-4 py-2 bg-cabinet-ink text-cabinet-paper text-sm font-medium rounded hover:bg-cabinet-ink2 transition-colors flex-shrink-0"
              >
                Open in Canvas
              </a>
            </div>
          </div>
        )}

        {/* Node graph thumbnail */}
        {session && (
          <div className="px-4 md:px-8 py-4 flex-shrink-0">
            <div className="h-[180px] md:h-[240px]">
              <NodeGraphThumbnail nodes={session.nodes} links={session.links} />
            </div>
          </div>
        )}

        {/* Asset detail pane */}
        <div className="flex-1 min-h-0">
          <AssetDetailPane session={session} selectedAssetId={selectedAssetId} />
        </div>
      </div>
    </div>
  );
}
