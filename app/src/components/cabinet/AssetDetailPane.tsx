import { useState, useEffect } from "react";
import { File, ExternalLink, Sparkles, Image as ImageIcon } from "lucide-react";
import { buildAssetUrl } from "../../hooks/useHistory";
import { useI18n } from "@/lib/i18n";
import type { SessionDetail, Asset, Node, ChatMessage } from "@/types";

interface AssetDetailPaneProps {
  session: SessionDetail | null;
  selectedAssetId: string | null;
  emptyMessage?: string;
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
  const { t } = useI18n();
  const url = buildAssetUrl(asset.hash, asset.kind);
  const title = asset.fileName || t("asset.generatedImage");
  const matchingNode = nodes?.find((n) => n.data?.imageHash === asset.hash);
  const explanation = matchingNode?.data?.explanation as string | undefined;
  return (
    <div className="flex flex-col px-8 pb-12">
      <img
        src={url}
        alt={title}
        loading="lazy"
        className="max-w-full rounded-[19px] border border-cabinet-border shadow-[0_8px_16px_rgba(0,0,0,0.08)]"
      />
      <MetadataGrid
        rows={[
          { label: t("detail.fileName"), value: asset.fileName || "—" },
          { label: t("detail.mimeType"), value: asset.mimeType },
          { label: t("detail.size"), value: formatBytes(asset.fileSize) },
          { label: t("detail.hash"), value: `${asset.hash.slice(0, 16)}...` },
          { label: t("detail.created"), value: new Date(asset.createdAt).toLocaleString() },
        ]}
      />
      {explanation && (
        <div className="mt-4 p-4 bg-cabinet-bg rounded-3xl border border-cabinet-border">
          <p className="text-xs font-medium text-cabinet-inkMuted mb-1">{t("detail.explanation")}</p>
          <p className="text-sm text-cabinet-ink leading-relaxed">{explanation}</p>
        </div>
      )}
    </div>
  );
}

function FileAssetDetail({ asset }: { asset: Asset }) {
  const { t } = useI18n();
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
    <div className="flex flex-col px-8 pb-12">
      <div className="flex flex-col items-center justify-center py-12">
        <File size={64} className="text-cabinet-inkMuted" />
        <div className="text-[15px] text-cabinet-ink mt-4 font-medium">
          {asset.fileName || t("asset.uploadedFile")}
        </div>
      </div>
      <MetadataGrid
        rows={[
          { label: t("detail.fileName"), value: asset.fileName || "—" },
          { label: t("detail.mimeType"), value: asset.mimeType },
          { label: t("detail.size"), value: formatBytes(asset.fileSize) },
          { label: t("detail.hash"), value: `${asset.hash.slice(0, 16)}...` },
          { label: t("detail.created"), value: new Date(asset.createdAt).toLocaleString() },
        ]}
      />
      {preview !== null && (
        <div className="mt-4">
          <div className="text-[13px] text-cabinet-inkMuted mb-1">{t("detail.preview")}</div>
          <pre className="text-[13px] text-cabinet-ink bg-cabinet-bg rounded-2xl border border-cabinet-border p-4 max-h-[300px] overflow-auto whitespace-pre-wrap break-all">
            {preview}
          </pre>
        </div>
      )}
    </div>
  );
}

function LinkAssetDetail({ node }: { node: Node }) {
  const { t } = useI18n();
  const url = node.data?.sourceUrl as string | undefined;
  const description = node.data?.option?.description as string | undefined;
  const title = node.data?.fileName as string | undefined;
  const summary = node.data?.summary as string | undefined;
  return (
    <div className="flex flex-col px-8 pb-12">
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
          <div className="text-[13px] text-cabinet-inkMuted">{t("detail.title")}</div>
          <div className="text-[14px] text-cabinet-ink mt-1">{title}</div>
        </div>
      )}
      {description && (
        <div className="mt-4">
          <div className="text-[13px] text-cabinet-inkMuted">{t("detail.description")}</div>
          <div className="text-[14px] text-cabinet-ink mt-1">{description}</div>
        </div>
      )}
      {summary && (
        <div className="mt-4 p-4 bg-cabinet-bg rounded-3xl border border-cabinet-border">
          <p className="text-xs font-medium text-cabinet-inkMuted mb-1">{t("detail.aiSummary")}</p>
          <p className="text-sm text-cabinet-ink leading-relaxed">{summary}</p>
        </div>
      )}
    </div>
  );
}

function TextNodeDetail({ node }: { node: Node }) {
  const { t } = useI18n();
  const title = (node.data?.fileName as string | undefined) || t("asset.document");
  const sourceText = String(node.data?.sourceText || "");
  return (
    <div className="flex flex-col px-8 pb-12">
      <div className="flex flex-col items-center justify-center py-10">
        <File size={64} className="text-cabinet-inkMuted" />
        <div className="text-[15px] text-cabinet-ink mt-4 font-medium text-center">
          {title}
        </div>
      </div>
      {sourceText && (
        <div className="mt-2">
          <div className="text-[13px] text-cabinet-inkMuted mb-1">{t("detail.preview")}</div>
          <pre className="text-[14px] text-cabinet-ink bg-cabinet-bg rounded-2xl border border-cabinet-border p-4 max-h-[420px] overflow-auto whitespace-pre-wrap break-words">
            {sourceText.slice(0, 6000)}
          </pre>
        </div>
      )}
    </div>
  );
}

function ReferenceList({ references, label }: { references: Array<{ title?: string; url?: string; description?: string; type?: string }>; label: string }) {
  if (!references?.length) return null;
  return (
    <div className="mt-6">
      <div className="text-[13px] font-medium text-cabinet-inkMuted mb-2">{label}</div>
      <ul className="space-y-2">
        {references.map((ref, idx) => {
          const url = typeof ref?.url === "string" ? ref.url : "";
          const title = String(ref?.title || url || "Reference");
          const description = ref?.description ? String(ref.description) : "";
          return (
            <li
              key={`${url}-${idx}`}
              className="rounded-2xl border border-cabinet-border bg-cabinet-bg px-4 py-3"
            >
              <div className="flex items-start gap-2">
                {ref?.type === "image"
                  ? <ImageIcon size={16} className="text-cabinet-blue mt-0.5 flex-shrink-0" />
                  : <ExternalLink size={16} className="text-cabinet-blue mt-0.5 flex-shrink-0" />}
                <div className="min-w-0 flex-1">
                  {url ? (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[14px] font-medium text-cabinet-blue hover:underline break-all"
                    >
                      {title}
                    </a>
                  ) : (
                    <div className="text-[14px] font-medium text-cabinet-ink break-all">{title}</div>
                  )}
                  {description && (
                    <div className="text-[13px] text-cabinet-inkMuted mt-1 break-words">{description}</div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function OptionNodeDetail({ node }: { node: Node }) {
  const { t } = useI18n();
  const option = node.data?.option || {};
  const title = String(option.title || node.data?.title || t("history.deepThinkGroup"));
  const description = String(option.description || node.data?.description || "");
  const tone = option.tone ? String(option.tone) : null;
  const prompt = option.prompt ? String(option.prompt) : "";
  const references = Array.isArray(option.references) ? option.references : (Array.isArray(node.data?.references) ? node.data.references : []);
  const isDeepThink = option.layoutHint === "deep-think";

  return (
    <div className="flex flex-col px-8 pb-12">
      <div className="flex items-center gap-3 pt-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cabinet-blue/10">
          <Sparkles size={20} className="text-cabinet-blue" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-[20px] font-medium text-cabinet-ink leading-tight break-words">{title}</h2>
          {tone && (
            <div className="text-[12px] text-cabinet-inkMuted mt-1">
              {isDeepThink ? `${t("history.deepThinkGroup")} · ${tone}` : tone}
            </div>
          )}
        </div>
      </div>
      {description && (
        <p className="mt-5 text-[15px] text-cabinet-ink leading-[1.7] whitespace-pre-wrap break-words">
          {description}
        </p>
      )}
      <ReferenceList references={references} label={t("history.references")} />
      {prompt && prompt !== description && (
        <div className="mt-6">
          <div className="text-[13px] font-medium text-cabinet-inkMuted mb-2">{t("detail.prompt")}</div>
          <pre className="text-[14px] text-cabinet-ink bg-cabinet-bg rounded-2xl border border-cabinet-border p-4 whitespace-pre-wrap break-words">
            {prompt}
          </pre>
        </div>
      )}
    </div>
  );
}

function SourceCardDetail({ node }: { node: Node }) {
  const { t } = useI18n();
  const card = node.data?.sourceCard || {};
  const title = String(card.title || card.fileName || node.data?.fileName || t("asset.uploadedFile"));
  const summary = String(card.summary || node.data?.summary || "");
  const sourceUrl = String(card.sourceUrl || node.data?.sourceUrl || "");
  const remoteImageUrl = typeof card.imageUrl === "string" ? card.imageUrl : (typeof node.data?.imageUrl === "string" ? node.data.imageUrl : "");
  const imageHash = typeof card.imageHash === "string" ? card.imageHash : (typeof node.data?.imageHash === "string" ? node.data.imageHash : "");
  const localImageUrl = imageHash && /^[a-f0-9]{64}$/i.test(imageHash) ? `/api/assets/${imageHash}?kind=upload` : "";
  const imageUrl = localImageUrl || remoteImageUrl;
  const sourceText = String(card.sourceText || node.data?.sourceText || "");

  return (
    <div className="flex flex-col px-8 pb-12">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={title}
          loading="lazy"
          className="max-w-full rounded-[19px] border border-cabinet-border shadow-[0_8px_16px_rgba(0,0,0,0.08)] mt-2"
        />
      ) : (
        <div className="flex flex-col items-center justify-center py-10">
          <File size={64} className="text-cabinet-inkMuted" />
        </div>
      )}
      <h2 className="text-[18px] font-medium text-cabinet-ink leading-tight mt-5 break-words">{title}</h2>
      {summary && (
        <p className="mt-2 text-[14px] text-cabinet-ink leading-[1.7] whitespace-pre-wrap break-words">
          {summary}
        </p>
      )}
      {sourceUrl && (
        <div className="mt-4 flex items-start gap-2">
          <ExternalLink size={16} className="text-cabinet-blue mt-1 flex-shrink-0" />
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[14px] text-cabinet-blue hover:underline break-all"
          >
            {sourceUrl}
          </a>
        </div>
      )}
      {sourceText && (
        <div className="mt-4">
          <div className="text-[13px] text-cabinet-inkMuted mb-1">{t("detail.preview")}</div>
          <pre className="text-[14px] text-cabinet-ink bg-cabinet-bg rounded-2xl border border-cabinet-border p-4 max-h-[420px] overflow-auto whitespace-pre-wrap break-words">
            {sourceText.slice(0, 6000)}
          </pre>
        </div>
      )}
    </div>
  );
}

function ChatAssetDetail({ msg }: { msg: ChatMessage }) {
  const { t } = useI18n();
  const thinkingContent = typeof msg.thinkingContent === "string" ? msg.thinkingContent.trim() : "";
  const references = Array.isArray(msg.references) ? msg.references : [];
  return (
    <div className="flex flex-col px-8 pb-12">
      <div className="flex items-center gap-2 mt-4">
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
            msg.role === "user"
              ? "bg-cabinet-itemBg text-cabinet-ink"
              : "bg-cabinet-blue text-cabinet-paper"
          }`}
        >
          {msg.role === "user" ? t("detail.you") : t("detail.ai")}
        </span>
        <span className="text-[13px] text-cabinet-inkMuted">
          {new Date(msg.createdAt).toLocaleString()}
        </span>
      </div>
      {thinkingContent && (
        <details className="mt-3 rounded-2xl border border-cabinet-border bg-cabinet-bg px-4 py-3">
          <summary className="text-[13px] font-medium text-cabinet-inkMuted cursor-pointer select-none flex items-center gap-2">
            <Sparkles size={14} className="text-cabinet-blue" />
            {t("history.thinkingTrace")}
          </summary>
          <pre className="text-[13px] text-cabinet-ink leading-relaxed mt-3 whitespace-pre-wrap break-words font-sans">
            {thinkingContent}
          </pre>
        </details>
      )}
      <div className="text-[15px] text-cabinet-ink leading-[1.7] whitespace-pre-wrap mt-4">
        {msg.content}
      </div>
      <ReferenceList references={references} label={t("history.references")} />
    </div>
  );
}

export default function AssetDetailPane({ session, selectedAssetId, emptyMessage }: AssetDetailPaneProps) {
  const { t } = useI18n();
  if (!selectedAssetId) {
    return (
      <div className="bg-cabinet-paper flex flex-col items-center justify-center min-h-[200px] py-12">
        <span className="text-sm text-cabinet-inkMuted">
          {emptyMessage || t("detail.selectAsset")}
        </span>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="bg-cabinet-paper flex flex-col items-center justify-center min-h-[200px] py-12">
        <span className="text-sm text-cabinet-inkMuted">{t("detail.loadingSession")}</span>
      </div>
    );
  }

  // Look up in assets
  const asset = session.assets.find((a: Asset) => a.id === selectedAssetId);
  if (asset) {
    if (asset.kind === "generated") {
      return (
        <div className="bg-cabinet-paper">
          <ImageAssetDetail asset={asset} nodes={session.nodes} />
        </div>
      );
    }
    return (
      <div className="bg-cabinet-paper">
        <FileAssetDetail asset={asset} />
      </div>
    );
  }

  // Look up in nodes (links)
  const node = session.nodes.find((n: Node) => n.id === selectedAssetId);
  if (node) {
    if (node.type === "source-card") {
      return (
        <div className="bg-cabinet-paper">
          <SourceCardDetail node={node} />
        </div>
      );
    }
    if (node.type === "option") {
      return (
        <div className="bg-cabinet-paper">
          <OptionNodeDetail node={node} />
        </div>
      );
    }
    return (
      <div className="bg-cabinet-paper">
        {node.data?.sourceUrl ? <LinkAssetDetail node={node} /> : <TextNodeDetail node={node} />}
      </div>
    );
  }

  // Look up in chat messages
  const msg = session.chatMessages.find((m: ChatMessage) => m.id === selectedAssetId);
  if (msg) {
    return (
      <div className="bg-cabinet-paper">
        <ChatAssetDetail msg={msg} />
      </div>
    );
  }

  return (
    <div className="bg-cabinet-paper flex flex-col items-center justify-center min-h-[200px] py-12">
      <span className="text-sm text-cabinet-inkMuted">{t("detail.assetNotFound")}</span>
    </div>
  );
}
