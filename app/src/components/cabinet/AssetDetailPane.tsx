import { useState, useEffect } from "react";
import { File, ExternalLink, Sparkles, Image as ImageIcon, Video } from "lucide-react";
import { buildAssetUrl } from "../../hooks/useHistory";
import { useI18n } from "@/lib/i18n";
import MarkdownContent from "./MarkdownContent";
import type { SessionDetail, Asset, Node, ChatMessage, CanvasContent } from "@/types";

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

function firstText(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function looksLikeUrl(value: string) {
  return /^https?:\/\//i.test(value.trim());
}

function urlHost(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function readableTitle(...values: unknown[]) {
  const candidates = values.filter((value): value is string => typeof value === "string" && value.trim().length > 0).map((value) => value.trim());
  const title = candidates.find((value) => !looksLikeUrl(value));
  if (title) return title;
  return candidates[0] ? urlHost(candidates[0]) : "";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function webReferences(node: Node) {
  const refs = node.data?.option?.references || node.data?.references || node.data?.sourceCard?.references;
  return Array.isArray(refs) ? refs : [];
}

function webContentText(content: CanvasContent | null | undefined) {
  if (!content || typeof content !== "object") return "";
  return firstText(content.mainContent, content.markdown, content.text, content.body, content.content, content.summary, content.description);
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
          <MarkdownContent content={explanation} className="text-sm" />
        </div>
      )}
    </div>
  );
}

function VideoAssetDetail({ asset, nodes }: { asset: Asset; nodes?: Node[] }) {
  const { t } = useI18n();
  const url = buildAssetUrl(asset.hash, asset.kind);
  const title = asset.fileName || t("asset.generatedVideo");
  const matchingNode = nodes?.find((n) => n.data?.videoHash === asset.hash);
  const explanation = matchingNode?.data?.explanation as string | undefined;
  return (
    <div className="flex flex-col px-8 pb-12">
      <video
        src={url}
        controls
        playsInline
        preload="metadata"
        className="max-w-full rounded-[19px] border border-cabinet-border shadow-[0_8px_16px_rgba(0,0,0,0.08)] bg-black"
      />
      <h2 className="text-[18px] font-medium text-cabinet-ink leading-tight mt-5 break-words">{title}</h2>
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
          <p className="text-xs font-medium text-cabinet-inkMuted mb-1">{t("detail.prompt")}</p>
          <MarkdownContent content={explanation} className="text-sm" />
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
          <div className="max-h-[360px] overflow-auto rounded-2xl border border-cabinet-border bg-cabinet-bg p-4">
            <MarkdownContent content={preview} />
          </div>
        </div>
      )}
    </div>
  );
}

function LinkAssetDetail({ node }: { node: Node }) {
  const { t } = useI18n();
  const refs = webReferences(node);
  const firstRef = refs.find((ref: { url?: string }) => typeof ref?.url === "string" && ref.url);
  const content = node.data?.option?.content && typeof node.data.option.content === "object" ? node.data.option.content : {};
  const url = firstText(content.url, node.data?.sourceUrl, node.data?.sourceCard?.sourceUrl, firstRef?.url);
  const title = readableTitle(content.title, node.data?.option?.title, node.data?.sourceCard?.title, node.data?.fileName, firstRef?.title, url);
  const description = firstText(content.description, node.data?.option?.description, node.data?.sourceCard?.summary, firstRef?.description, node.data?.summary);
  const mainContent = firstText(webContentText(content), node.data?.sourceCard?.sourceText, node.data?.sourceText, description);
  return (
    <div className="flex flex-col px-8 pb-12">
      <div className="flex items-start gap-4 pt-2">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-cabinet-blue/10">
          <ExternalLink size={22} className="text-cabinet-blue" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-[22px] font-medium text-cabinet-ink leading-tight break-words">{title || t("asset.webLink")}</h2>
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 block text-[14px] text-cabinet-blue hover:underline break-all"
            >
              {url}
            </a>
          )}
        </div>
      </div>
      {description && description !== mainContent && (
        <div className="mt-6 rounded-3xl border border-cabinet-border bg-cabinet-bg px-5 py-4">
          <div className="text-[13px] font-medium text-cabinet-inkMuted mb-2">{t("detail.webSummary")}</div>
          <MarkdownContent content={description} />
        </div>
      )}
      {mainContent && (
        <div className="mt-6">
          <div className="text-[13px] font-medium text-cabinet-inkMuted mb-2">{t("detail.webMainContent")}</div>
          <MarkdownContent content={mainContent} maxLength={12000} className="rounded-3xl border border-cabinet-border bg-cabinet-paper p-5" />
        </div>
      )}
      <ReferenceList references={refs} label={t("history.references")} />
      {!mainContent && !description && url && (
        <div className="mt-6 rounded-3xl border border-cabinet-border bg-cabinet-bg px-5 py-4">
          <MarkdownContent content={url} />
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
          <div className="max-h-[520px] overflow-auto rounded-2xl border border-cabinet-border bg-cabinet-bg p-4">
            <MarkdownContent content={sourceText} maxLength={12000} />
          </div>
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
                    <MarkdownContent content={description} className="mt-1 text-[13px] text-cabinet-inkMuted" />
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

function optionContentPreview(content: CanvasContent | null): string {
  if (!content || typeof content !== "object") return "";
  const direct = String(content.mainContent || content.markdown || content.text || content.body || content.content || content.summary || content.description || "").trim();
  if (direct) return direct;
  if (Array.isArray(content.sections)) {
    return content.sections
      .map((section) => {
        const record = asRecord(section);
        return [`## ${record.title || ""}`.trim(), String(record.body || record.text || "").trim()].filter(Boolean).join("\n\n");
      })
      .filter(Boolean)
      .join("\n\n");
  }
  if (Array.isArray(content.steps)) {
    return content.steps
      .map((step, index: number) => {
        const record = asRecord(step);
        const label = String(record.title || record.name || (typeof step === "string" ? step : "")).trim();
        return `${index + 1}. ${label}${record.description ? `\n   ${String(record.description).trim()}` : ""}`;
      })
      .join("\n");
  }
  if (Array.isArray(content.items)) {
    return content.items
      .map((item) => {
        const record = asRecord(item);
        const label = String(record.text || record.title || record.label || (typeof item === "string" ? item : "")).trim();
        return `- ${label}${record.description ? ` — ${String(record.description).trim()}` : ""}`;
      })
      .join("\n");
  }
  if (Array.isArray(content.metrics)) {
    return content.metrics
      .map((item) => {
        const record = asRecord(item);
        return `- ${String(record.label || "").trim()}: ${String(record.value || "").trim()}${record.note ? ` — ${String(record.note).trim()}` : ""}`;
      })
      .join("\n");
  }
  if (Array.isArray(content.quotes)) {
    return content.quotes
      .map((item) => {
        const record = asRecord(item);
        const text = String(record.text || record.quote || (typeof item === "string" ? item : "")).trim();
        return `> ${text}${record.source ? `\n— ${String(record.source).trim()}` : ""}`;
      })
      .join("\n\n");
  }
  if (Array.isArray(content.columns) && Array.isArray(content.rows)) {
    const columns = content.columns.map((column) => String(column || "").trim());
    const rows = content.rows.slice(0, 80).map((row) => {
      if (Array.isArray(row)) return row.map((cell) => String(cell ?? "").trim());
      const record = asRecord(row);
      return columns.map((column: string) => String(record[column] ?? record[column.toLowerCase()] ?? "").trim());
    });
    return [
      `| ${columns.join(" | ")} |`,
      `| ${columns.map(() => "---").join(" | ")} |`,
      ...rows.map((row: string[]) => `| ${row.join(" | ")} |`)
    ].join("\n");
  }
  try {
    return JSON.stringify(content, null, 2);
  } catch {
    return "";
  }
}

function OptionNodeDetail({ node }: { node: Node }) {
  const { t } = useI18n();
  const option = node.data?.option || {};
  const references = Array.isArray(option.references) ? option.references : (Array.isArray(node.data?.references) ? node.data.references : []);
  const firstWebRef = references.find((ref: { url?: string }) => typeof ref?.url === "string" && ref.url);
  const content = option.content && typeof option.content === "object" ? option.content : null;
  const isWeb = Boolean(firstWebRef || content?.url || option.nodeType === "link");
  const title = isWeb
    ? readableTitle(content?.title, option.title, node.data?.title, firstWebRef?.title, content?.url, firstWebRef?.url, t("asset.webLink"))
    : String(option.title || node.data?.title || t("history.deepThinkGroup"));
  const description = isWeb
    ? firstText(content?.description, option.description, node.data?.description, firstWebRef?.description)
    : String(option.description || node.data?.description || "");
  const tone = option.tone ? String(option.tone) : null;
  const prompt = option.prompt ? String(option.prompt) : "";
  const contentText = firstText(optionContentPreview(content), isWeb ? description : "");
  const isDeepThink = option.layoutHint === "deep-think";
  const webUrl = firstText(content?.url, firstWebRef?.url);

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
        <MarkdownContent content={description} className="mt-5" />
      )}
      {isWeb && webUrl && (
        <div className="mt-4 flex items-start gap-2">
          <ExternalLink size={16} className="text-cabinet-blue mt-1 flex-shrink-0" />
          <a
            href={webUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[14px] text-cabinet-blue hover:underline break-all"
          >
            {webUrl}
          </a>
        </div>
      )}
      <ReferenceList references={references} label={t("history.references")} />
      {contentText && contentText !== description && contentText !== prompt && (
        <div className="mt-6">
          <div className="text-[13px] font-medium text-cabinet-inkMuted mb-2">{isWeb ? t("detail.webMainContent") : t("detail.preview")}</div>
          <div className="max-h-[620px] overflow-auto rounded-2xl border border-cabinet-border bg-cabinet-bg p-4">
            <MarkdownContent content={contentText} maxLength={12000} />
          </div>
        </div>
      )}
      {prompt && prompt !== description && (
        <div className="mt-6">
          <div className="text-[13px] font-medium text-cabinet-inkMuted mb-2">{t("detail.prompt")}</div>
          <div className="rounded-2xl border border-cabinet-border bg-cabinet-bg p-4">
            <MarkdownContent content={prompt} />
          </div>
        </div>
      )}
    </div>
  );
}

function SourceCardDetail({ node }: { node: Node }) {
  const { t } = useI18n();
  const card = node.data?.sourceCard || {};
  const sourceUrl = firstText(card.sourceUrl, node.data?.sourceUrl);
  const title = readableTitle(card.title, card.fileName, node.data?.fileName, sourceUrl, t("asset.uploadedFile"));
  const summary = firstText(card.summary, node.data?.summary);
  const sourceVideoHash = firstText(card.sourceVideoHash, card.videoHash, node.data?.sourceVideoHash);
  const sourceVideoUrl = firstText(card.sourceVideoUrl, card.videoUrl, node.data?.sourceVideoUrl);
  const videoUrl = sourceVideoHash ? `/api/assets/${sourceVideoHash}?kind=upload` : sourceVideoUrl;
  const remoteImageUrl = typeof card.imageUrl === "string" ? card.imageUrl : (typeof node.data?.imageUrl === "string" ? node.data.imageUrl : "");
  const imageHash = typeof card.imageHash === "string" ? card.imageHash : (typeof node.data?.imageHash === "string" ? node.data.imageHash : "");
  const localImageUrl = imageHash && /^[a-f0-9]{64}$/i.test(imageHash) ? `/api/assets/${imageHash}?kind=upload` : "";
  const imageUrl = localImageUrl || remoteImageUrl;
  const sourceText = firstText(card.mainContent, card.markdown, card.sourceText, node.data?.sourceText);
  const refs = webReferences(node);

  return (
    <div className="flex flex-col px-8 pb-12">
      {videoUrl ? (
        <video
          src={videoUrl}
          controls
          playsInline
          preload="metadata"
          className="max-w-full rounded-[19px] border border-cabinet-border shadow-[0_8px_16px_rgba(0,0,0,0.08)] bg-black mt-2"
        />
      ) : imageUrl ? (
        <img
          src={imageUrl}
          alt={title}
          loading="lazy"
          className="max-w-full rounded-[19px] border border-cabinet-border shadow-[0_8px_16px_rgba(0,0,0,0.08)] mt-2"
        />
      ) : (
        <div className="flex flex-col items-center justify-center py-10">
          {card.sourceType === "video" ? <Video size={64} className="text-cabinet-inkMuted" /> : <File size={64} className="text-cabinet-inkMuted" />}
        </div>
      )}
      <h2 className="text-[18px] font-medium text-cabinet-ink leading-tight mt-5 break-words">{title}</h2>
      {summary && (
        <MarkdownContent content={summary} className="mt-2 text-[14px]" />
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
          <div className="text-[13px] text-cabinet-inkMuted mb-1">{sourceUrl ? t("detail.webMainContent") : t("detail.preview")}</div>
          <div className="max-h-[620px] overflow-auto rounded-2xl border border-cabinet-border bg-cabinet-bg p-4">
            <MarkdownContent content={sourceText} maxLength={12000} />
          </div>
        </div>
      )}
      <ReferenceList references={refs} label={t("history.references")} />
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
          <MarkdownContent content={thinkingContent} className="mt-3 text-[13px]" />
        </details>
      )}
      <MarkdownContent content={msg.content} className="mt-4" />
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
    if (asset.mimeType.startsWith("video/")) {
      return (
        <div className="bg-cabinet-paper">
          <VideoAssetDetail asset={asset} nodes={session.nodes} />
        </div>
      );
    }
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
