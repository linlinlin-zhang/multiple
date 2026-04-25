import { useState, useEffect } from "react";
import { useSession } from "../../hooks/useHistory";
import AssetSidebar from "./AssetSidebar";
import AssetDetailPane from "./AssetDetailPane";
import NodeGraphThumbnail from "./NodeGraphThumbnail";

interface HistoryPageProps {
  sessionId: string | null;
}

function SkeletonHistoryPage() {
  return (
    <div className="flex h-full">
      {/* Sidebar skeleton */}
      <div className="w-[280px] min-w-[280px] bg-cabinet-paper border-r border-cabinet-border flex flex-col h-full animate-pulse">
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
        <div className="px-8 pt-6 pb-2 flex-shrink-0 space-y-3">
          <div className="h-4 w-48 bg-cabinet-itemBg rounded" />
          <div className="h-6 w-72 bg-cabinet-itemBg rounded" />
        </div>
        <div className="flex-1 px-8 py-4">
          <div className="w-full h-[240px] bg-cabinet-itemBg rounded" />
        </div>
      </div>
    </div>
  );
}

export default function HistoryPage({ sessionId }: HistoryPageProps) {
  const { session, loading, error, refetch } = useSession(sessionId);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

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
    <div className="flex h-full">
      {/* Left sidebar */}
      <AssetSidebar
        session={session}
        selectedAssetId={selectedAssetId}
        onSelectAsset={setSelectedAssetId}
      />

      {/* Right pane */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-cabinet-paper">
        {/* Error banner */}
        {error && (
          <div className="px-6 py-3 bg-red-50 border-b border-red-100 flex items-center justify-between flex-shrink-0">
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
          <div className="px-8 pt-6 pb-2 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-medium text-cabinet-ink leading-tight">
                  {session.title || "Untitled Session"}
                </h1>
                <div className="flex items-center gap-3 mt-2 text-[13px] font-mono text-cabinet-inkMuted">
                  <span>{new Date(session.createdAt).toLocaleString()}</span>
                  <span>·</span>
                  <span>{session.nodeCount} nodes</span>
                  <span>·</span>
                  <span>{session.assetCount} assets</span>
                </div>
              </div>
              <a
                href={`/?session=${session.id}`}
                className="inline-flex items-center px-4 py-2 bg-cabinet-ink text-cabinet-paper text-sm font-medium rounded hover:bg-cabinet-ink2 transition-colors"
              >
                Open in Canvas
              </a>
            </div>
          </div>
        )}

        {/* Node graph thumbnail */}
        {session && (
          <div className="px-8 py-4 flex-shrink-0">
            <NodeGraphThumbnail nodes={session.nodes} links={session.links} />
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
