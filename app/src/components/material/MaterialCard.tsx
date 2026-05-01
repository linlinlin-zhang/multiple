import { Trash2 } from "lucide-react";
import type { MaterialItem } from "@/types";
import { useI18n } from "@/lib/i18n";
import FileIcon from "./FileIcon";

interface MaterialCardProps {
  item: MaterialItem;
  onDelete: (id: string) => void;
}

function isImageMime(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MaterialCard({ item, onDelete }: MaterialCardProps) {
  const { t } = useI18n();
  const isImage = isImageMime(item.mimeType);

  return (
    <div
      className="group border border-cabinet-border bg-cabinet-paper rounded-lg overflow-hidden hover:shadow-sm transition-shadow"
      aria-label={item.fileName}
    >
      <div className="relative aspect-square overflow-hidden bg-cabinet-bg">
        {isImage ? (
          <img
            src={`/api/materials/${item.id}/file`}
            alt={item.fileName}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <FileIcon mimeType={item.mimeType} fileName={item.fileName} />
        )}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
          className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
          aria-label={t("library.delete")}
        >
          <Trash2 size={14} />
        </button>
      </div>
      <div className="px-3 py-2">
        <div className="text-sm font-medium text-cabinet-ink truncate">
          {item.fileName}
        </div>
        <div className="text-xs text-cabinet-inkMuted mt-1">
          {formatFileSize(item.fileSize)} · {new Date(item.addedAt).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}
