import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import FolderTab from "./FolderTab";
import { useHistory } from "../../hooks/useHistory";
import HistoryPage from "./HistoryPage";
import AppNavigation from "@/components/AppNavigation";
import { useI18n } from "@/lib/i18n";
import { Clock, FileText, Globe2, Image, Menu, MessageSquare, RotateCcw, Search, Trash2, Upload, Video, X } from "lucide-react";
import type { HistorySession, OutputKind, SourceFilter } from "@/types";

const OUTPUT_TABS: { kind: OutputKind; labelKey: string; icon: ReactNode }[] = [
  { kind: "image", labelKey: "history.tabImages", icon: <Image size={16} /> },
  { kind: "video", labelKey: "history.tabVideos", icon: <Video size={16} /> },
  { kind: "web", labelKey: "history.tabWeb", icon: <Globe2 size={16} /> },
  { kind: "document", labelKey: "history.tabDocuments", icon: <FileText size={16} /> },
  { kind: "chat", labelKey: "history.tabChat", icon: <MessageSquare size={16} /> },
];

function Spinner() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-2 border-cabinet-border border-t-cabinet-ink rounded-full animate-spin" />
    </div>
  );
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result || "");
      resolve(value.includes(",") ? value.split(",")[1] : value);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function isZipFile(file: File) {
  return /\.zip$/i.test(file.name) || /zip|octet-stream/i.test(file.type || "");
}

async function previewImportFile(file: File) {
  const res = isZipFile(file)
    ? await fetch("/api/import/preview", {
        method: "POST",
        headers: { "Content-Type": file.type || "application/zip" },
        body: file
      })
    : await fetch("/api/import/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: await file.text()
      });
  const data = await res.json();
  if (!res.ok || !data?.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data;
}

async function batchPackageFromFile(file: File) {
  if (isZipFile(file)) {
    return { name: file.name, archiveBase64: await fileToBase64(file) };
  }
  return { name: file.name, payload: JSON.parse(await file.text()) };
}

function SourceSegment({
  value,
  onChange,
}: {
  value: SourceFilter;
  onChange: (value: SourceFilter) => void;
}) {
  const { t } = useI18n();
  const options: SourceFilter[] = ["all", "user", "system"];
  return (
    <div className="mt-4 flex h-9 overflow-hidden rounded border border-cabinet-border bg-cabinet-paper">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={`flex-1 px-3 text-xs font-medium transition-colors ${
            value === option ? "bg-cabinet-ink text-cabinet-paper" : "text-cabinet-inkMuted hover:bg-cabinet-itemBg"
          }`}
        >
          {t(`source.${option}`)}
        </button>
      ))}
    </div>
  );
}

interface SessionListProps {
  sessions: HistorySession[];
  activeSessionId: string | null;
  loading: boolean;
  searchQuery: string;
  searchOpen: boolean;
  searchInputId: string;
  onSearchChange: (value: string) => void;
  onSearchOpenChange: (open: boolean) => void;
  onOpenNavigation: () => void;
  onImportClick: () => void;
  onSelect: (id: string) => void;
  onRename: (id: string, title: string) => Promise<void> | void;
  onDelete: (id: string, title: string) => Promise<void> | void;
  onRestore: (id: string) => Promise<void> | void;
  sourceFilter: SourceFilter;
  onSourceFilterChange: (value: SourceFilter) => void;
  importing: boolean;
}

function SessionList({
  sessions,
  activeSessionId,
  loading,
  searchQuery,
  searchOpen,
  searchInputId,
  onSearchChange,
  onSearchOpenChange,
  onOpenNavigation,
  onImportClick,
  onSelect,
  onRename,
  onDelete,
  onRestore,
  sourceFilter,
  onSourceFilterChange,
  importing,
}: SessionListProps) {
  const { t } = useI18n();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");

  useEffect(() => {
    if (searchOpen) {
      searchInputRef.current?.focus();
    }
  }, [searchOpen]);

  return (
    <div className="flex h-full flex-col bg-cabinet-itemBg">
      <div className="flex h-[68px] items-center justify-between px-6 flex-shrink-0">
        <button
          type="button"
          onClick={onOpenNavigation}
          className="flex h-9 w-9 items-center justify-center rounded hover:bg-cabinet-paper"
          aria-label={t("nav.open")}
          title={t("nav.open")}
        >
          <Menu size={19} className="text-cabinet-ink2" />
        </button>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onImportClick}
            disabled={importing}
            className="flex h-9 w-9 items-center justify-center rounded hover:bg-cabinet-paper disabled:opacity-50"
            aria-label={t("history.import")}
            title={t("history.import")}
          >
            <Upload size={18} className="text-cabinet-ink2" />
          </button>
          <button
            type="button"
            onClick={() => onSearchOpenChange(!searchOpen)}
            className={`flex h-9 w-9 items-center justify-center rounded hover:bg-cabinet-paper ${
              searchOpen ? "bg-cabinet-paper" : ""
            }`}
            aria-controls={searchInputId}
            aria-expanded={searchOpen}
            aria-label={t("history.search")}
            title={t("history.search")}
          >
            <Search size={18} className="text-cabinet-ink2" />
          </button>
        </div>
      </div>

      <div className="px-6 pb-4 flex-shrink-0">
        <div className="text-xl font-medium text-cabinet-ink tracking-[0]">{t("history.record")}</div>
        <div className="mt-1 text-[13px] text-cabinet-inkMuted">{t("history.folderHint")}</div>
        {searchOpen && (
          <label className="mt-4 flex h-10 items-center gap-2 border border-cabinet-border bg-cabinet-paper px-3">
            <Search size={16} className="text-cabinet-inkMuted flex-shrink-0" />
            <input
              id={searchInputId}
              ref={searchInputRef}
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={t("history.searchPlaceholder")}
              className="min-w-0 flex-1 bg-transparent text-sm text-cabinet-ink outline-none placeholder:text-cabinet-inkMuted"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="flex h-6 w-6 items-center justify-center text-cabinet-inkMuted hover:text-cabinet-ink"
                aria-label={t("history.clearSearch")}
                title={t("history.clearSearch")}
              >
                <X size={14} />
              </button>
            )}
          </label>
        )}
        <SourceSegment value={sourceFilter} onChange={onSourceFilterChange} />
      </div>

      <div className="flex-1 overflow-y-auto cabinet-scrollbar pb-4">
        {loading && sessions.length === 0 ? (
          <div className="space-y-3 px-4">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-[74px] rounded bg-cabinet-paper/70 animate-pulse" />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="px-6 py-4 text-sm text-cabinet-inkMuted">
            {searchQuery ? t("history.noSearchResults") : t("history.noSessions")}
          </div>
        ) : (
          sessions.map((session) => {
            const active = activeSessionId === session.id;
            const editing = editingId === session.id;
            const isSystem = session.source === "system";
            const isHidden = Boolean(session.hidden);
            const commitRename = async () => {
              const next = draftTitle.trim();
              setEditingId(null);
              if (!isSystem && next && next !== session.title) {
                await onRename(session.id, next);
              }
            };
            return (
              <button
                key={session.id}
                onClick={() => onSelect(session.id)}
                className={`group relative w-full text-left px-6 py-4 transition-colors ${
                  active ? "bg-cabinet-paper" : "hover:bg-cabinet-paper/70"
                }`}
              >
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (isHidden) void onRestore(session.id);
                    else void onDelete(session.id, session.title || t("session.unnamed"));
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      event.stopPropagation();
                      if (isHidden) void onRestore(session.id);
                      else void onDelete(session.id, session.title || t("session.unnamed"));
                    }
                  }}
                  className={`absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-cabinet-paper text-cabinet-inkMuted shadow-sm ring-1 ring-cabinet-border transition group-hover:opacity-100 focus:opacity-100 ${
                    isHidden ? "opacity-100 hover:text-cabinet-blue" : "opacity-0 hover:text-[#d53b00]"
                  }`}
                  aria-label={isHidden ? t("history.restore") : (isSystem ? t("history.hideSystem") : t("history.delete"))}
                  title={isHidden ? t("history.restore") : (isSystem ? t("history.hideSystem") : t("history.delete"))}
                >
                  {isHidden ? <RotateCcw size={14} /> : <Trash2 size={14} />}
                </span>
                {active && <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-cabinet-ink" />}
                <div className="flex items-start gap-3">
                  <Clock size={17} className="mt-[2px] text-cabinet-inkMuted flex-shrink-0" />
                  <div className="min-w-0">
                    {editing ? (
                      <input
                        value={draftTitle}
                        onChange={(event) => setDraftTitle(event.target.value)}
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            void commitRename();
                          }
                          if (event.key === "Escape") {
                            event.preventDefault();
                            setEditingId(null);
                          }
                        }}
                        onBlur={() => void commitRename()}
                        className="w-full rounded border border-cabinet-blue bg-cabinet-paper px-2 py-1 text-[15px] font-medium text-cabinet-ink outline-none"
                        autoFocus
                      />
                    ) : (
                      <div
                        className="text-[15px] font-medium text-cabinet-ink truncate cursor-text"
                        onDoubleClick={(event) => {
                          if (isSystem) return;
                          event.stopPropagation();
                          setDraftTitle(session.title || "");
                          setEditingId(session.id);
                        }}
                        title={isSystem ? session.title : t("history.rename")}
                      >
                        {session.title || t("session.unnamed")}
                      </div>
                    )}
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="rounded border border-cabinet-border bg-cabinet-paper px-1.5 py-0.5 text-[11px] text-cabinet-inkMuted">
                        {isSystem ? t("source.system") : t("source.user")}
                      </span>
                      {isHidden && (
                        <span className="rounded border border-cabinet-border bg-cabinet-paper px-1.5 py-0.5 text-[11px] text-cabinet-inkMuted">
                          {t("source.hidden")}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-[13px] text-cabinet-inkMuted truncate">
                      {new Date(session.updatedAt || session.createdAt).toLocaleString()}
                    </div>
                    <div className="mt-1 text-[12px] text-cabinet-inkMuted truncate">
                      {session.nodeCount} {t("history.nodeCount")} · {session.assetCount} {t("history.assetCount")}
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function FileCabinet() {
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const { sessions, loading, error, refetch } = useHistory(null, 0, false, sourceFilter, sourceFilter === "system");
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeOutputKind, setActiveOutputKind] = useState<OutputKind>("image");
  const [mobileSessionsOpen, setMobileSessionsOpen] = useState(false);
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);
  const { t } = useI18n();
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredSessions = normalizedSearch
    ? sessions.filter((session) => {
        const haystack = [
          session.title,
          new Date(session.createdAt).toLocaleString(),
          new Date(session.updatedAt || session.createdAt).toLocaleString(),
          `${session.nodeCount}`,
          `${session.assetCount}`,
        ].join(" ").toLowerCase();
        return haystack.includes(normalizedSearch);
      })
    : sessions;
  const resolvedActiveSessionId =
    activeSessionId && filteredSessions.some((session) => session.id === activeSessionId)
      ? activeSessionId
      : filteredSessions[0]?.id ?? null;

  const handleSessionSelect = (id: string) => {
    setActiveSessionId(id);
    setMobileSessionsOpen(false);
  };

  const handleSessionRename = async (id: string, title: string) => {
    try {
      const response = await fetch(`/api/sessions/${id}/title`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title })
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || response.statusText);
      }
      await refetch();
    } catch (renameError) {
      console.error("Failed to rename session", renameError);
      alert(t("history.renameFailed"));
    }
  };

  const handleSessionDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/sessions/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || response.statusText);
      }
      if (activeSessionId === id) setActiveSessionId(null);
      await refetch();
    } catch (deleteError) {
      console.error("Failed to delete session", deleteError);
      alert(t("history.deleteFailed"));
    }
  };

  const handleSessionRestore = async (id: string) => {
    try {
      const response = await fetch(`/api/sessions/${id}/restore`, { method: "POST" });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || response.statusText);
      }
      await refetch();
    } catch (restoreError) {
      console.error("Failed to restore session", restoreError);
      alert(t("history.restoreFailed"));
    }
  };

  const handleImportFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setImporting(true);
    try {
      const previews = [];
      for (const file of files.slice(0, 20)) {
        previews.push({ fileName: file.name, preview: await previewImportFile(file) });
      }
      const lines = previews.map(({ fileName, preview }) => {
        const conflictText = preview.conflicts?.length ? `, ${t("history.importConflicts", { count: preview.conflicts.length })}` : "";
        return `${fileName}: ${preview.title} · ${preview.nodeCount} ${t("history.nodeCount")} · ${preview.assetCount} ${t("history.assetCount")}${conflictText}`;
      });
      const confirmed = window.confirm(`${t("history.importPreviewTitle")}\n\n${lines.join("\n")}\n\n${t("history.importPreviewConfirm")}`);
      if (!confirmed) return;

      const packages = [];
      for (const file of files.slice(0, 20)) {
        packages.push(await batchPackageFromFile(file));
      }
      const response = await fetch("/api/import/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packages, conflictStrategy: "rename" })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || response.statusText);
      if (data.failedCount) {
        const failed = data.results?.filter((item: { ok?: boolean }) => !item.ok).map((item: { name?: string; error?: string }) => `${item.name}: ${item.error}`).join("\n");
        alert(`${t("history.importPartialFailed")}\n${failed || ""}`);
      }
      const firstImported = data.results?.find((item: { ok?: boolean; sessionId?: string }) => item.ok && item.sessionId);
      if (firstImported?.sessionId) setActiveSessionId(firstImported.sessionId);
      await refetch();
    } catch (importError) {
      console.error("Import failed", importError);
      alert(t("history.importFailed") + (importError instanceof Error ? `: ${importError.message}` : ""));
    } finally {
      setImporting(false);
      if (importInputRef.current) importInputRef.current.value = "";
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-cabinet-bg p-3 md:p-7">
      <AppNavigation activePage="history" open={navigationOpen} onClose={() => setNavigationOpen(false)} />
      <input
        ref={importInputRef}
        type="file"
        multiple
        accept=".zip,.json,application/zip,application/x-zip-compressed,application/json"
        className="hidden"
        onChange={handleImportFiles}
        aria-hidden="true"
      />
      {mobileSessionsOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/20"
            onClick={() => setMobileSessionsOpen(false)}
          />
          <div className="relative w-[320px] max-w-[84vw] bg-cabinet-itemBg h-full shadow-lg flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-cabinet-border">
              <span className="text-sm font-medium text-cabinet-ink">{t("history.record")}</span>
              <button
                onClick={() => setMobileSessionsOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded hover:bg-cabinet-paper"
                aria-label={t("cabinet.closeSidebar")}
              >
                <X size={18} className="text-cabinet-ink" />
              </button>
            </div>
            <SessionList
              sessions={filteredSessions}
              activeSessionId={resolvedActiveSessionId}
              loading={loading}
              searchQuery={searchQuery}
              searchOpen={searchOpen}
              searchInputId="history-search-input-mobile"
              onSearchChange={setSearchQuery}
              onSearchOpenChange={setSearchOpen}
              onOpenNavigation={() => setNavigationOpen(true)}
              onImportClick={() => importInputRef.current?.click()}
              onSelect={handleSessionSelect}
              onRename={handleSessionRename}
              onDelete={handleSessionDelete}
              onRestore={handleSessionRestore}
              sourceFilter={sourceFilter}
              onSourceFilterChange={setSourceFilter}
              importing={importing}
            />
          </div>
        </div>
      )}

      <div className="mx-auto flex h-full max-w-[1760px] overflow-hidden rounded-[18px] border border-cabinet-border bg-cabinet-paper shadow-[0_22px_48px_rgba(0,0,0,0.08)]">
        <aside className="hidden lg:flex w-[320px] min-w-[320px] flex-col border-r border-cabinet-border bg-cabinet-itemBg">
          <SessionList
            sessions={filteredSessions}
            activeSessionId={resolvedActiveSessionId}
            loading={loading}
            searchQuery={searchQuery}
            searchOpen={searchOpen}
            searchInputId="history-search-input-desktop"
            onSearchChange={setSearchQuery}
            onSearchOpenChange={setSearchOpen}
            onOpenNavigation={() => setNavigationOpen(true)}
            onImportClick={() => importInputRef.current?.click()}
            onSelect={handleSessionSelect}
            onRename={handleSessionRename}
            onDelete={handleSessionDelete}
            onRestore={handleSessionRestore}
            sourceFilter={sourceFilter}
            onSourceFilterChange={setSourceFilter}
            importing={importing}
          />
        </aside>

        <section className="flex min-w-0 flex-1 flex-col bg-cabinet-bg">
          <div className="flex h-14 items-stretch gap-0 flex-shrink-0">
            <button
              onClick={() => setMobileSessionsOpen(true)}
              className="lg:hidden w-12 flex items-center justify-center bg-cabinet-paper text-cabinet-ink border-r border-cabinet-border"
              aria-label={t("cabinet.showHistory")}
            >
              <Menu size={19} />
            </button>
            <div className="flex items-stretch overflow-x-auto no-scrollbar">
              {OUTPUT_TABS.map((tab, index) => (
                <FolderTab
                  key={tab.kind}
                  label={t(tab.labelKey)}
                  tabId={tab.kind}
                  active={activeOutputKind === tab.kind}
                  zIndex={OUTPUT_TABS.length - index}
                  overlap={false}
                  onClick={() => setActiveOutputKind(tab.kind)}
                  inactiveColor="#ffffff"
                  inactiveText="#000000"
                  icon={tab.icon}
                />
              ))}
            </div>
            <div className="flex-1" />
          </div>

          {error && (
            <div className="mx-3 md:mx-8 mb-2 px-5 py-2 text-sm text-[#d53b00] bg-cabinet-paper border border-cabinet-border">
              {t("history.error")}: {error}
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-hidden bg-cabinet-paper">
            {loading && sessions.length === 0 ? (
              <Spinner />
            ) : filteredSessions.length === 0 && !loading ? (
              <div className="flex items-center justify-center h-full text-cabinet-inkMuted text-base">
                {searchQuery ? t("history.noSearchResults") : t("history.noSessions")}
              </div>
            ) : (
              <HistoryPage sessionId={resolvedActiveSessionId} outputKind={activeOutputKind} />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
