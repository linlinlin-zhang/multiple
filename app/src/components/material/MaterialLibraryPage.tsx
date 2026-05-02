import { useState, useCallback, useRef } from "react";
import { Menu, Upload } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useMaterials } from "@/hooks/useMaterials";
import AppNavigation from "@/components/AppNavigation";
import MaterialGrid from "./MaterialGrid";
import MaterialSearchBar from "./MaterialSearchBar";
import MaterialSortSelect from "./MaterialSortSelect";
import MaterialEmptyState from "./MaterialEmptyState";
import { Button } from "@/components/ui/button";
import type { MaterialSort } from "@/types";
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
  const [navigationOpen, setNavigationOpen] = useState(false);
  const { items, total, loading, error, refetch } = useMaterials(searchQuery, sort);

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
                <h1 className="text-xl font-medium text-cabinet-ink tracking-[0]">{t("library.title")}</h1>
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
              <MaterialEmptyState isSearch={!!searchQuery.trim()} />
            ) : (
              <MaterialGrid items={items} onDelete={handleDelete} onRename={handleRename} />
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
    </div>
  );
}
