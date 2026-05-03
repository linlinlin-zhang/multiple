import { useState, useCallback, useRef, useEffect } from "react";
import { Menu, Star, Upload, X, Download } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useMaterials } from "@/hooks/useMaterials";
import AppNavigation from "@/components/AppNavigation";
import MaterialGrid from "./MaterialGrid";
import MaterialSearchBar from "./MaterialSearchBar";
import MaterialSortSelect from "./MaterialSortSelect";
import MaterialEmptyState from "./MaterialEmptyState";
import FileIcon from "./FileIcon";
import { Button } from "@/components/ui/button";
import type { MaterialSort, MaterialItem } from "@/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const ACCEPTED_TYPES = [
  "image/png", "image/jpeg", "image/webp", "image/gif",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "video/mp4", "video/webm",
].join(",");

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-cabinet-border bg-cabinet-paper overflow-hidden animate-pulse">
          <div className="aspect-square bg-cabinet-bg" />
          <div className="px-3 py-2 space-y-2">
            <div className="h-4 w-3/4 bg-cabinet-itemBg rounded" />
            <div className="h-3 w-1/2 bg-cabinet-itemBg rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function MaterialLibraryPage() {
  const { t } = useI18n();
  const [searchQuery, setSearchQuery] = useState("");
  const [sort, setSort] = useState<MaterialSort>("added");
  const [favoritedOnly, setFavoritedOnly] = useState(false);
  const [navigationOpen, setNavigationOpen] = useState(false);
  const { items, total, loading, error, refetch } = useMaterials(searchQuery, sort, favoritedOnly);

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewItemId, setPreviewItemId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const previewItem = previewItemId ? items.find((i) => i.id === previewItemId) || null : null;

  const handleDelete = useCallback((id: string) => {
    const item = items.find(i => i.id === id);
    if (item) {
      setDeleteTarget({ id: item.id, name: item.fileName });
    }
  }, [items]);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/materials/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setDeleteTarget(null);
      refetch();
    } catch (err) {
      console.error("Delete failed:", err);
      alert(t("library.deleteFailed"));
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, refetch, t]);

  const handleRename = useCallback(async (id: string, fileName: string) => {
    try {
      const res = await fetch(`/api/materials/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      refetch();
    } catch (err) {
      console.error("Rename failed:", err);
      alert(t("library.renameFailed"));
    }
  }, [refetch, t]);

  const handleToggleFavorite = useCallback(async (id: string, favorited: boolean) => {
    try {
      const res = await fetch(`/api/materials/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ favorited }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      refetch();
    } catch (err) {
      console.error("Favorite toggle failed:", err);
      alert(t("library.favoriteFailed"));
    }
  }, [refetch, t]);

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });

      const res = await fetch("/api/materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          dataUrl,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `HTTP ${res.status}`);
      }

      refetch();
    } catch (err) {
      console.error("Upload failed:", err);
      alert(t("library.uploadFailed"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [refetch, t]);

  const handlePreview = useCallback((id: string) => {
    setPreviewItemId(id);
  }, []);

  const closePreview = useCallback(() => {
    setPreviewItemId(null);
  }, []);

  return (
    <div className="h-screen overflow-hidden bg-cabinet-bg p-3 md:p-7">
      <AppNavigation activePage="library" open={navigationOpen} onClose={() => setNavigationOpen(false)} />

      <div className="mx-auto flex h-full max-w-[1760px] overflow-hidden rounded-[18px] border border-cabinet-border bg-cabinet-paper shadow-[0_22px_48px_rgba(0,0,0,0.08)]">
        <div className="flex min-w-0 flex-1 flex-col h-full">
          {/* Header */}
          <div className="flex-shrink-0 px-5 md:px-9 pt-7 pb-4">
            <div className="flex items-center gap-3 mb-4">
              <button
                type="button"
                onClick={() => setNavigationOpen(true)}
                className="flex h-9 w-9 items-center justify-center rounded hover:bg-cabinet-itemBg"
                aria-label={t("nav.open")}
              >
                <Menu size={19} className="text-cabinet-ink2" />
              </button>
              <div className="flex-1">
                <h1 className="text-xl font-medium text-cabinet-ink tracking-[0]">
                  {favoritedOnly ? t("library.favorites") : t("library.title")}
                </h1>
                <p className="text-[13px] text-cabinet-inkMuted mt-0.5">{t("library.subtitle")}</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_TYPES}
                onChange={handleUpload}
                className="hidden"
                aria-hidden="true"
              />
              <Button
                size="sm"
                variant={favoritedOnly ? "default" : "outline"}
                onClick={() => setFavoritedOnly((v) => !v)}
                className="gap-1.5"
                aria-pressed={favoritedOnly}
                title={favoritedOnly ? t("library.favoritesAll") : t("library.favorites")}
              >
                <Star size={15} fill={favoritedOnly ? "currentColor" : "none"} />
                {favoritedOnly ? t("library.favoritesAll") : t("library.favorites")}
              </Button>
              <Button
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="gap-1.5"
              >
                <Upload size={15} />
                {uploading ? t("library.uploading") : t("library.upload")}
              </Button>
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-3">
              <MaterialSearchBar value={searchQuery} onChange={setSearchQuery} />
              <div className="flex items-center gap-2">
                <span className="text-xs text-cabinet-inkMuted hidden sm:inline">{t("library.sortBy")}</span>
                <MaterialSortSelect value={sort} onChange={setSort} />
              </div>
            </div>

            {/* Item count */}
            {!loading && !error && (
              <div className="mt-3 text-[13px] text-cabinet-inkMuted">
                {t("library.itemCount", { count: total })}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-h-0 overflow-y-auto px-5 md:px-9 pb-6">
            {error && (
              <div className="mb-4 px-5 py-2 text-sm text-[#d53b00] bg-cabinet-paper border border-cabinet-border flex items-center justify-between" role="alert">
                <span>{t("library.loadError")}: {error}</span>
                <button onClick={refetch} className="text-sm text-cabinet-blue font-medium hover:underline">
                  {t("library.retry")}
                </button>
              </div>
            )}

            {loading && items.length === 0 ? (
              <SkeletonGrid />
            ) : items.length === 0 ? (
              <MaterialEmptyState isSearch={!!searchQuery.trim()} isFavoritesView={favoritedOnly} />
            ) : (
              <MaterialGrid
                items={items}
                onDelete={handleDelete}
                onRename={handleRename}
                onToggleFavorite={handleToggleFavorite}
                onPreview={handlePreview}
              />
            )}
          </div>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("library.deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("library.deleteConfirmDesc", { name: deleteTarget?.name || "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t("detail.close")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "..." : t("library.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Preview Modal */}
      {previewItemId && (
        <MaterialPreviewModal
          items={items}
          previewItem={previewItem}
          previewItemId={previewItemId}
          onSelect={setPreviewItemId}
          onClose={closePreview}
        />
      )}
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isTextMime(mimeType: string): boolean {
  return (
    mimeType === "text/plain" ||
    mimeType === "text/markdown" ||
    mimeType === "application/json"
  );
}

interface MaterialPreviewModalProps {
  items: MaterialItem[];
  previewItem: MaterialItem | null;
  previewItemId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}

function MaterialPreviewModal({ items, previewItem, previewItemId, onSelect, onClose }: MaterialPreviewModalProps) {
  const { t } = useI18n();
  const [textContent, setTextContent] = useState<string | null>(null);
  const [textError, setTextError] = useState<string | null>(null);

  useEffect(() => {
    if (!previewItem || !isTextMime(previewItem.mimeType)) {
      setTextContent(null);
      setTextError(null);
      return;
    }

    let cancelled = false;
    setTextContent(null);
    setTextError(null);

    fetch(`/api/materials/${previewItem.id}/file`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        if (!cancelled) setTextContent(text.slice(0, 10000));
      })
      .catch((err) => {
        if (!cancelled) setTextError(err instanceof Error ? err.message : String(err));
      });

    return () => {
      cancelled = true;
    };
  }, [previewItem]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex bg-black/80"
      onClick={(e) => {
        if (e.currentTarget === e.target) onClose();
      }}
    >
      {/* Left thumbnail strip */}
      <div className="flex-shrink-0 w-[88px] h-full overflow-y-auto bg-black/40 border-r border-white/10 py-2 space-y-2 px-1.5">
        {items.map((item) => {
          const isImage = item.mimeType.startsWith("image/");
          const selected = item.id === previewItemId;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={`w-full aspect-square rounded overflow-hidden border-2 transition-colors ${
                selected ? "border-blue-500" : "border-transparent hover:border-white/30"
              }`}
              aria-label={item.fileName}
              title={item.fileName}
            >
              {isImage ? (
                <img
                  src={`/api/materials/${item.id}/file`}
                  alt={item.fileName}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full bg-cabinet-paper flex items-center justify-center">
                  <FileIcon mimeType={item.mimeType} fileName={item.fileName} />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Right content pane */}
      <div className="flex-1 min-w-0 h-full flex flex-col">
        {/* Close button */}
        <div className="flex-shrink-0 flex items-center justify-end px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            aria-label={t("detail.close")}
            title={t("detail.close")}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-auto px-4 pb-4">
          {previewItem ? (
            <PreviewContent
              item={previewItem}
              textContent={textContent}
              textError={textError}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-white/60 text-sm">
              {t("library.itemNotFound")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PreviewContent({
  item,
  textContent,
  textError,
}: {
  item: MaterialItem;
  textContent: string | null;
  textError: string | null;
}) {
  const { t } = useI18n();

  if (item.mimeType.startsWith("image/")) {
    return (
      <div className="flex h-full items-center justify-center">
        <img
          src={`/api/materials/${item.id}/file`}
          alt={item.fileName}
          className="max-w-full max-h-full object-contain"
        />
      </div>
    );
  }

  if (item.mimeType === "application/pdf") {
    return (
      <iframe
        src={`/api/materials/${item.id}/file`}
        title={item.fileName}
        className="w-full h-full border-0 rounded"
      />
    );
  }

  if (isTextMime(item.mimeType)) {
    if (textError) {
      return (
        <div className="flex h-full items-center justify-center text-white/60 text-sm">
          {t("library.loadError")}: {textError}
        </div>
      );
    }
    if (textContent === null) {
      return (
        <div className="flex h-full items-center justify-center text-white/60 text-sm">
          {t("library.loading")}
        </div>
      );
    }
    return (
      <pre className="w-full h-full overflow-auto bg-black/30 text-white/90 text-sm p-4 rounded whitespace-pre-wrap break-words">
        {textContent}
      </pre>
    );
  }

  // Fallback for docx, pptx, video, and others
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-white">
      <div className="scale-150">
        <FileIcon mimeType={item.mimeType} fileName={item.fileName} />
      </div>
      <div className="text-center space-y-1">
        <div className="text-lg font-medium">{item.fileName}</div>
        <div className="text-sm text-white/60">
          {formatFileSize(item.fileSize)} · {item.mimeType}
        </div>
        <div className="text-sm text-white/60">
          {new Date(item.addedAt).toLocaleDateString()}
        </div>
      </div>
      <a
        href={`/api/materials/${item.id}/file?download=1`}
        download={item.fileName}
        className="inline-flex items-center gap-2 rounded bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20 transition-colors"
      >
        <Download size={16} />
        {t("library.download")}
      </a>
    </div>
  );
}
