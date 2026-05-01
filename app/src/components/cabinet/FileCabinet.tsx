import { useEffect, useState, type ReactNode } from "react";
import FolderTab from "./FolderTab";
import { useHistory } from "../../hooks/useHistory";
import HistoryPage from "./HistoryPage";
import { useI18n } from "@/lib/i18n";
import { Clock, FileText, Globe2, Image, Menu, Moon, Search, Sun, X } from "lucide-react";
import type { HistorySession, OutputKind } from "@/types";

const OUTPUT_TABS: { kind: OutputKind; labelKey: string; icon: ReactNode }[] = [
  { kind: "image", labelKey: "history.tabImages", icon: <Image size={16} /> },
  { kind: "web", labelKey: "history.tabWeb", icon: <Globe2 size={16} /> },
  { kind: "document", labelKey: "history.tabDocuments", icon: <FileText size={16} /> },
];

function Spinner() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-2 border-cabinet-border border-t-cabinet-ink rounded-full animate-spin" />
    </div>
  );
}

function getInitialTheme(): "light" | "dark" {
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "dark" || attr === "light") return attr;
  return "light";
}

async function persistTheme(theme: "light" | "dark") {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("oryzae-theme", theme);
  try {
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme }),
    });
  } catch (e) {
    console.error("Failed to persist theme", e);
  }
}

interface SessionListProps {
  sessions: HistorySession[];
  activeSessionId: string | null;
  loading: boolean;
  searchQuery: string;
  searchInputId: string;
  onSearchChange: (value: string) => void;
  onSelect: (id: string) => void;
}

function SessionList({
  sessions,
  activeSessionId,
  loading,
  searchQuery,
  searchInputId,
  onSearchChange,
  onSelect,
}: SessionListProps) {
  const { t } = useI18n();

  return (
    <div className="flex h-full flex-col bg-cabinet-itemBg">
      <div className="flex h-[68px] items-center justify-between px-6 flex-shrink-0">
        <Menu size={19} className="text-cabinet-ink2" />
        <button
          type="button"
          onClick={() => document.getElementById(searchInputId)?.focus()}
          className="flex h-9 w-9 items-center justify-center rounded hover:bg-cabinet-paper"
          aria-label={t("history.search")}
          title={t("history.search")}
        >
          <Search size={18} className="text-cabinet-ink2" />
        </button>
      </div>

      <div className="px-6 pb-4 flex-shrink-0">
        <div className="text-xl font-medium text-cabinet-ink tracking-[0]">{t("history.record")}</div>
        <div className="mt-1 text-[13px] text-cabinet-inkMuted">{t("history.folderHint")}</div>
        <label className="mt-4 flex h-10 items-center gap-2 border border-cabinet-border bg-cabinet-paper px-3">
          <Search size={16} className="text-cabinet-inkMuted flex-shrink-0" />
          <input
            id={searchInputId}
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
            return (
              <button
                key={session.id}
                onClick={() => onSelect(session.id)}
                className={`relative w-full text-left px-6 py-4 transition-colors ${
                  active ? "bg-cabinet-paper" : "hover:bg-cabinet-paper/70"
                }`}
              >
                {active && <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-cabinet-ink" />}
                <div className="flex items-start gap-3">
                  <Clock size={17} className="mt-[2px] text-cabinet-inkMuted flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[15px] font-medium text-cabinet-ink truncate">
                      {session.title || t("session.unnamed")}
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
  const { sessions, loading, error } = useHistory(50, 0, false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeOutputKind, setActiveOutputKind] = useState<OutputKind>("image");
  const [mobileSessionsOpen, setMobileSessionsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">(getInitialTheme);
  const { lang, setLang, t } = useI18n();
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

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === "oryzae-theme") {
        const next = e.newValue;
        if (next === "light" || next === "dark") {
          document.documentElement.setAttribute("data-theme", next);
          setTheme(next);
        }
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const handleToggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    persistTheme(next);
  };

  const handleSessionSelect = (id: string) => {
    setActiveSessionId(id);
    setMobileSessionsOpen(false);
  };

  return (
    <div className="h-screen overflow-hidden bg-cabinet-bg p-3 md:p-7">
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
              searchInputId="history-search-input-mobile"
              onSearchChange={setSearchQuery}
              onSelect={handleSessionSelect}
            />
          </div>
        </div>
      )}

      <div className="mx-auto flex h-full max-w-[1760px] overflow-hidden rounded-[24px] border border-cabinet-border bg-cabinet-paper shadow-[0_22px_48px_rgba(0,0,0,0.08)]">
        <aside className="hidden lg:flex w-[320px] min-w-[320px] flex-col border-r border-cabinet-border bg-cabinet-itemBg">
          <SessionList
            sessions={filteredSessions}
            activeSessionId={resolvedActiveSessionId}
            loading={loading}
            searchQuery={searchQuery}
            searchInputId="history-search-input-desktop"
            onSearchChange={setSearchQuery}
            onSelect={handleSessionSelect}
          />
          <div className="flex items-center gap-2 border-t border-cabinet-border p-4">
            <button
              onClick={handleToggleTheme}
              className="w-10 h-10 flex items-center justify-center rounded border bg-cabinet-paper text-cabinet-ink border-cabinet-border hover:bg-cabinet-itemBg"
              title={theme === "dark" ? t("settings.lightMode") : t("settings.darkMode")}
              aria-label={theme === "dark" ? t("settings.lightMode") : t("settings.darkMode")}
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <select
              value={lang}
              onChange={(e) => {
                const next = e.target.value as "zh" | "en";
                setLang(next);
                fetch("/api/settings", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ language: next })
                }).catch(console.error);
              }}
              className="h-10 min-w-0 flex-1 rounded border bg-cabinet-paper px-3 text-sm text-cabinet-ink border-cabinet-border hover:bg-cabinet-itemBg"
              aria-label={t("settings.language")}
            >
              <option value="zh">{t("lang.zh")}</option>
              <option value="en">{t("lang.en")}</option>
            </select>
          </div>
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
