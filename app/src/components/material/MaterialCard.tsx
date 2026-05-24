import { useState } from "react";
import { Download, RotateCcw, Star, Trash2 } from "lucide-react";
import type { MaterialItem } from "@/types";
import { useI18n } from "@/lib/i18n";
import FileIcon from "./FileIcon";

interface MaterialCardProps {
  item: MaterialItem;
  onDelete: (id: string) => void;
  onRename: (id: string, fileName: string) => Promise<void> | void;
  onToggleFavorite: (id: string, favorited: boolean) => Promise<void> | void;
  onRestore: (id: string) => Promise<void> | void;
  onPreview?: (id: string) => void;
}

function isImageMime(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

function isVideoMime(mimeType: string): boolean {
  return mimeType.startsWith("video/");
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MaterialCard({ item, onDelete, onRename, onToggleFavorite, onRestore, onPreview }: MaterialCardProps) {
  const { t } = useI18n();
  const isImage = isImageMime(item.mimeType);
  const isVideo = isVideoMime(item.mimeType);
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(item.fileName);

  const commitRename = async () => {
    const next = draftName.trim();
    if (!next) {
      setDraftName(item.fileName);
      setEditing(false);
      return;
    }
    if (next !== item.fileName) {
      await onRename(item.id, next);
    }
    setEditing(false);
  };

  const favorited = Boolean(item.favorited);
  const isSystem = item.source === "system";
  const isHidden = Boolean(item.hidden);

  return (
    <div
      className="group border border-cabinet-border bg-cabinet-paper rounded-lg overflow-hidden hover:shadow-sm transition-shadow cursor-pointer"
      aria-label={item.fileName}
      onClick={() => onPreview?.(item.id)}
    >
      <div className="relative aspect-square overflow-hidden bg-cabinet-bg">
        {isImage ? (
          <img
            src={`/api/materials/${item.id}/file`}
            alt={item.fileName}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : isVideo ? (
          <video
            src={`/api/materials/${item.id}/file`}
            className="w-full h-full object-cover"
            muted
            playsInline
            preload="metadata"
          />
        ) : (
          <FileIcon mimeType={item.mimeType} fileName={item.fileName} />
        )}
        <div className="absolute top-2 left-2 flex items-center gap-1.5">
          <a
            href={`/api/materials/${item.id}/file?download=1`}
            download={item.fileName}
            onClick={(e) => e.stopPropagation()}
            className="flex h-7 w-7 items-center justify-center rounded bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
            aria-label={t("library.download")}
            title={t("library.download")}
          >
            <Download size={14} />
          </a>
          {!isSystem && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); void onToggleFavorite(item.id, !favorited); }}
              className={`flex h-7 w-7 items-center justify-center rounded transition-opacity hover:bg-black/70 ${
                favorited
                  ? "bg-amber-400/90 text-white opacity-100"
                  : "bg-black/50 text-white opacity-0 group-hover:opacity-100"
              }`}
              aria-label={favorited ? t("library.unfavorite") : t("library.favorite")}
              aria-pressed={favorited}
              title={favorited ? t("library.unfavorite") : t("library.favorite")}
            >
              <Star size={14} fill={favorited ? "currentColor" : "none"} />
            </button>
          )}
        </div>
        <div className="absolute right-2 top-2 flex items-center gap-1.5">
          <span className="rounded bg-black/55 px-2 py-1 text-[11px] font-medium text-white">
            {isSystem ? t("source.system") : t("source.user")}
          </span>
          {isHidden ? (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); void onRestore(item.id); }}
              className="flex h-7 w-7 items-center justify-center rounded bg-black/50 text-white opacity-100 transition-opacity hover:bg-black/70"
              aria-label={t("library.restore")}
              title={t("library.restore")}
            >
              <RotateCcw size={14} />
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
              className="flex h-7 w-7 items-center justify-center rounded bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
              aria-label={isSystem ? t("library.hideSystem") : t("library.delete")}
              title={isSystem ? t("library.hideSystem") : t("library.delete")}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
      <div className="px-3 py-2">
        {editing ? (
          <input
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void commitRename();
              }
              if (event.key === "Escape") {
                event.preventDefault();
                setDraftName(item.fileName);
                setEditing(false);
              }
            }}
            onBlur={() => void commitRename()}
            className="w-full rounded border border-cabinet-blue bg-cabinet-paper px-2 py-1 text-sm font-medium text-cabinet-ink outline-none"
            autoFocus
          />
        ) : (
          <div
            className="text-sm font-medium text-cabinet-ink truncate cursor-text"
            onDoubleClick={(event) => {
              if (isSystem) return;
              event.stopPropagation();
              setDraftName(item.fileName);
              setEditing(true);
            }}
            title={isSystem ? item.fileName : t("library.rename")}
          >
            {item.fileName}
          </div>
        )}
        <div className="text-xs text-cabinet-inkMuted mt-1 truncate">
          {formatFileSize(item.fileSize)} · {new Date(item.addedAt).toLocaleDateString()}
          {isHidden ? ` · ${t("source.hidden")}` : ""}
        </div>
      </div>
    </div>
  );
}
