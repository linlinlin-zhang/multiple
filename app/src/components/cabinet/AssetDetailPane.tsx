import { useState, useEffect } from "react";
import { File, ExternalLink } from "lucide-react";
import { buildAssetUrl } from "../../hooks/useHistory";
import type { SessionDetail, Asset, Node, ChatMessage } from "@/types";

interface AssetDetailPaneProps {
  session: SessionDetail | null;
  selectedAssetId: string | null;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function MetadataGrid({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-4">
      {rows.map((row) => (
        <div key={row.label}>
          <div className="text-[13px] text-cabinet-inkMuted">{row.label}</div>
          <div className="text-[14px] text-cabinet-ink break-all">{row.value}</div>
        </div>
      ))}
    </div>
  );
}

function ImageAssetDetail({ asset, nodes }: { asset: Asset; nodes?: Node[] }) {
  const url = buildAssetUrl(asset.hash, asset.kind);
  const title = asset.fileName || "Generated Image";
  const matchingNode = nodes?.find((n) => n.data?.imageHash === asset.hash);
  const explanation = matchingNode?.data?.explanation as string | undefined;
  return (
    <div className="flex flex-col h-full overflow-y-auto cabinet-scrollbar px-8 pb-12">
      <img
        src={url}
        alt={title}
        loading="lazy"
        className="max-w-full rounded-[19px] border border-cabinet-border shadow-[0_8px_16px_rgba(0,0,0,0.08)]"
      />
      <MetadataGrid
        rows={[
          { label: "File name", value: asset.fileName || "—" },
          { label: "MIME type", value: asset.mimeType },
          { label: "Size", value: formatBytes(asset.fileSize) },
          { label: "Hash", value: `${asset.hash.slice(0, 16)}...` },
          { label: "Created", value: new Date(asset.createdAt).toLocaleString() },
        ]}
      />
      {explanation && (
        <div className="mt-4 p-4 bg-cabinet-bg rounded-3xl border border-cabinet-border">
          <p className="text-xs font-medium text-cabinet-inkMuted mb-1">AI 讲解</p>
          <p className="text-sm text-cabinet-ink leading-relaxed">{explanation}</p>
        </div>
      )}
    </div>
  );
}

function FileAssetDetail({ asset }: { asset: Asset }) {
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!asset.mimeType.startsWith("text/")) return;
    let cancelled = false;
    fetch(`/api/assets/${asset.hash}?kind=upload`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load file");
        return res.text();
      })
      .then((text) => {
        if (!cancelled) setPreview(text.slice(0, 2000));
      })
      .catch(() => {
        if (!cancelled) setPreview(null);
      });
    return () => { cancelled = true; };
  }, [asset.hash, asset.mimeType]);

  return (
    <div className="flex flex-col h-full overflow-y-auto cabinet-scrollbar px-8 pb-12">
      <div className="flex flex-col items-center justify-center py-12">
        <File size={64} className="text-cabinet-inkMuted" />
        <div className="text-[15px] text-cabinet-ink mt-4 font-medium">
          {asset.fileName || "Uploaded File"}
        </div>
      </div>
      <MetadataGrid
        rows={[
          { label: "File name", value: asset.fileName || "—" },
          { label: "MIME type", value: asset.mimeType },
          { label: "Size", value: formatBytes(asset.fileSize) },
          { label: "Hash", value: `${asset.hash.slice(0, 16)}...` },
          { label: "Created", value: new Date(asset.createdAt).toLocaleString() },
        ]}
      />
      {preview !== null && (
        <div className="mt-4">
          <div className="text-[13px] text-cabinet-inkMuted mb-1">Preview</div>
          <pre className="text-[13px] text-cabinet-ink bg-cabinet-bg rounded-2xl border border-cabinet-border p-4 max-h-[300px] overflow-auto whitespace-pre-wrap break-all">
            {preview}
          </pre>
        </div>
      )}
    </div>
  );
}

function LinkAssetDetail({ node }: { node: Node }) {
  const url = node.data?.option?.referenceUrl as string | undefined;
  const description = node.data?.option?.description as string | undefined;
  const title = node.data?.option?.title as string | undefined;
  const summary = node.data?.summary as string | undefined;
  return (
    <div className="flex flex-col h-full overflow-y-auto cabinet-scrollbar px-8 pb-12">
      <div className="flex flex-col items-center justify-center py-12">
        <ExternalLink size={64} className="text-cabinet-inkMuted" />
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[15px] text-cabinet-blue mt-4 font-medium hover:underline break-all text-center"
          >
            {url}
          </a>
        )}
      </div>
      {title && (
        <div className="mt-4">
          <div className="text-[13px] text-cabinet-inkMuted">Title</div>
          <div className="text-[14px] text-cabinet-ink mt-1">{title}</div>
        </div>
      )}
      {description && (
        <div className="mt-4">
          <div className="text-[13px] text-cabinet-inkMuted">Description</div>
          <div className="text-[14px] text-cabinet-ink mt-1">{description}</div>
        </div>
      )}
      {summary && (
        <div className="mt-4 p-4 bg-cabinet-bg rounded-3xl border border-cabinet-border">
          <p className="text-xs font-medium text-cabinet-inkMuted mb-1">AI Summary</p>
          <p className="text-sm text-cabinet-ink leading-relaxed">{summary}</p>
        </div>
      )}
    </div>
  );
}

function ChatAssetDetail({ msg }: { msg: ChatMessage }) {
  return (
    <div className="flex flex-col h-full overflow-y-auto cabinet-scrollbar px-8 pb-12">
      <div className="flex items-center gap-2 mt-4">
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
            msg.role === "user"
              ? "bg-cabinet-itemBg text-cabinet-ink"
              : "bg-cabinet-blue text-cabinet-paper"
          }`}
        >
          {msg.role === "user" ? "You" : "AI"}
        </span>
        <span className="text-[13px] text-cabinet-inkMuted">
          {new Date(msg.createdAt).toLocaleString()}
        </span>
      </div>
      <div className="text-[15px] text-cabinet-ink leading-[1.7] whitespace-pre-wrap mt-4">
        {msg.content}
      </div>
    </div>
  );
}

export default function AssetDetailPane({ session, selectedAssetId }: AssetDetailPaneProps) {
  if (!selectedAssetId) {
    return (
      <div className="flex-1 bg-cabinet-paper flex flex-col h-full overflow-hidden items-center justify-center">
        <span className="text-sm text-cabinet-inkMuted">
          Select an asset from the sidebar to view details.
        </span>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex-1 bg-cabinet-paper flex flex-col h-full overflow-hidden items-center justify-center">
        <span className="text-sm text-cabinet-inkMuted">Loading session...</span>
      </div>
    );
  }

  // Look up in assets
  const asset = session.assets.find((a: Asset) => a.id === selectedAssetId);
  if (asset) {
    if (asset.kind === "generated") {
      return (
        <div className="flex-1 bg-cabinet-paper flex flex-col h-full overflow-hidden">
          <ImageAssetDetail asset={asset} nodes={session.nodes} />
        </div>
      );
    }
    return (
      <div className="flex-1 bg-cabinet-paper flex flex-col h-full overflow-hidden">
        <FileAssetDetail asset={asset} />
      </div>
    );
  }

  // Look up in nodes (links)
  const node = session.nodes.find((n: Node) => n.id === selectedAssetId);
  if (node) {
    return (
      <div className="flex-1 bg-cabinet-paper flex flex-col h-full overflow-hidden">
        <LinkAssetDetail node={node} />
      </div>
    );
  }

  // Look up in chat messages
  const msg = session.chatMessages.find((m: ChatMessage) => m.id === selectedAssetId);
  if (msg) {
    return (
      <div className="flex-1 bg-cabinet-paper flex flex-col h-full overflow-hidden">
        <ChatAssetDetail msg={msg} />
      </div>
    );
  }

  return (
    <div className="flex-1 bg-cabinet-paper flex flex-col h-full overflow-hidden items-center justify-center">
      <span className="text-sm text-cabinet-inkMuted">Asset not found.</span>
    </div>
  );
}
