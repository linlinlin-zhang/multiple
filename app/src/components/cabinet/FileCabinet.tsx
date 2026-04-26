import { useState, useEffect } from "react";
import FolderTab from "./FolderTab";
import { useHistory } from "../../hooks/useHistory";
import HistoryPage from "./HistoryPage";
import { Menu, X, Clock, Sun, Moon } from "lucide-react";

const INACTIVE_COLORS = [
  { bg: "#ffffff", text: "#000000" },
  { bg: "#f5f7fa", text: "#000000" },
  { bg: "#000000", text: "#ffffff" },
];

const MAX_VISIBLE_TABS = 5;

function SkeletonTabs() {
  return (
    <div className="flex items-end pl-4 md:pl-6 overflow-x-auto">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="relative text-[14px] font-medium tracking-[0] flex items-center justify-center select-none animate-pulse flex-shrink-0"
          style={{
            zIndex: i,
            backgroundColor: "#f5f7fa",
            clipPath: "none",
            borderRadius: "999px",
            marginLeft: i > 1 ? "8px" : "0",
            paddingLeft: "24px",
            paddingRight: "24px",
            height: "40px",
            width: "120px",
            transform: "translateY(3px)",
          }}
        />
      ))}
    </div>
  );
}

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

export default function FileCabinet() {
  const { sessions, loading, error } = useHistory(20, 0, false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [showMoreSidebar, setShowMoreSidebar] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(getInitialTheme);

  useEffect(() => {
    if (activeSessionId === null && sessions.length > 0) {
      setActiveSessionId(sessions[0].id);
    }
  }, [sessions, activeSessionId]);

  // Cross-tab theme sync via storage events
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === "oryzae-theme") {
        const t = e.newValue;
        if (t === "light" || t === "dark") {
          document.documentElement.setAttribute("data-theme", t);
          setTheme(t);
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

  const visibleSessions = sessions.slice(0, MAX_VISIBLE_TABS);
  const hasMore = sessions.length > MAX_VISIBLE_TABS;

  const handleSessionSelect = (id: string) => {
    setActiveSessionId(id);
    setShowMoreSidebar(false);
  };

  const toggleMoreSidebar = () => {
    setShowMoreSidebar((prev) => !prev);
  };

  return (
    <div className="h-screen overflow-hidden bg-cabinet-bg flex justify-center pt-4 md:pt-8 px-4">
      {/* Mobile overlay for more sidebar */}
      {showMoreSidebar && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/20"
            onClick={() => setShowMoreSidebar(false)}
          />
          <div className="relative w-[280px] bg-cabinet-paper h-full shadow-lg flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-cabinet-border">
              <span className="text-sm font-medium text-cabinet-ink">历史记录</span>
              <button
                onClick={() => setShowMoreSidebar(false)}
                className="w-8 h-8 flex items-center justify-center rounded hover:bg-cabinet-itemBg"
                aria-label="Close sidebar"
              >
                <X size={18} className="text-cabinet-ink" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto cabinet-scrollbar">
              {sessions.length === 0 ? (
                <div className="px-4 py-6 text-sm text-cabinet-inkMuted text-center">
                  暂无历史会话
                </div>
              ) : (
                sessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => handleSessionSelect(session.id)}
                    className={`w-full text-left px-4 py-3 relative transition-colors ${
                      activeSessionId === session.id
                        ? "bg-cabinet-itemBg"
                        : "hover:bg-cabinet-itemBg"
                    }`}
                  >
                    {activeSessionId === session.id && (
                      <div className="absolute left-0 top-2 bottom-2 w-[3px] bg-cabinet-blue rounded-r-full" />
                    )}
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-cabinet-inkMuted flex-shrink-0" />
                      <div className="text-sm font-medium text-cabinet-ink truncate leading-tight">
                        {session.title || "未命名会话"}
                      </div>
                    </div>
                    <div className="text-xs text-cabinet-ink2 truncate mt-1 leading-tight">
                      {new Date(session.createdAt).toLocaleString()} · {session.nodeCount} nodes
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col w-full max-w-full md:max-w-[1100px]">
        {/* Tab bar with toggle */}
        {loading && sessions.length === 0 ? (
          <SkeletonTabs />
        ) : (
          <div className="flex items-end gap-2">
            <button
              onClick={toggleMoreSidebar}
              className={`w-10 h-10 flex items-center justify-center rounded-lg border flex-shrink-0 transition-colors mb-[3px] ${
                showMoreSidebar
                  ? "bg-cabinet-blue text-cabinet-paper border-cabinet-blue"
                  : "bg-cabinet-paper text-cabinet-ink border-cabinet-border hover:bg-cabinet-itemBg"
              }`}
              title={showMoreSidebar ? "隐藏历史记录" : "显示历史记录"}
              aria-label={showMoreSidebar ? "Hide history sidebar" : "Show history sidebar"}
            >
              <Menu size={18} />
            </button>
            <div className="flex items-end overflow-x-auto flex-1">
              {sessions.length === 0 ? (
                <FolderTab
                  label="No sessions"
                  tabId="none"
                  active={false}
                  zIndex={1}
                  overlap={false}
                  onClick={() => {}}
                />
              ) : (
                <>
                  {visibleSessions.map((session, index) => {
                    const palette = INACTIVE_COLORS[index % 3];
                    return (
                      <FolderTab
                        key={session.id}
                        label={session.title || "未命名会话"}
                        tabId={session.id}
                        active={activeSessionId === session.id}
                        zIndex={index + 1}
                        overlap={index > 0}
                        onClick={() => handleSessionSelect(session.id)}
                        inactiveColor={palette.bg}
                        inactiveText={palette.text}
                      />
                    );
                  })}
                  {hasMore && (
                    <FolderTab
                      label={`更多 (${sessions.length - MAX_VISIBLE_TABS})`}
                      tabId="more"
                      active={showMoreSidebar}
                      zIndex={MAX_VISIBLE_TABS + 1}
                      overlap={true}
                      onClick={toggleMoreSidebar}
                      inactiveColor="#ffffff"
                      inactiveText="#000000"
                    />
                  )}
                </>
              )}
            </div>
            <button
              onClick={handleToggleTheme}
              className="w-10 h-10 flex items-center justify-center rounded-lg border flex-shrink-0 transition-colors mb-[3px] bg-cabinet-paper text-cabinet-ink border-cabinet-border hover:bg-cabinet-itemBg"
              title={theme === "dark" ? "切换亮色模式" : "切换深色模式"}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
              {sessions.length === 0 ? (
                <FolderTab
                  label="No sessions"
                  tabId="none"
                  active={false}
                  zIndex={1}
                  overlap={false}
                  onClick={() => {}}
                />
              ) : (
                <>
                  {visibleSessions.map((session, index) => {
                    const palette = INACTIVE_COLORS[index % 3];
                    return (
                      <FolderTab
                        key={session.id}
                        label={session.title || "未命名会话"}
                        tabId={session.id}
                        active={activeSessionId === session.id}
                        zIndex={index + 1}
                        overlap={index > 0}
                        onClick={() => handleSessionSelect(session.id)}
                        inactiveColor={palette.bg}
                        inactiveText={palette.text}
                      />
                    );
                  })}
                  {hasMore && (
                    <FolderTab
                      label={`更多 (${sessions.length - MAX_VISIBLE_TABS})`}
                      tabId="more"
                      active={showMoreSidebar}
                      zIndex={MAX_VISIBLE_TABS + 1}
                      overlap={true}
                      onClick={toggleMoreSidebar}
                      inactiveColor="#ffffff"
                      inactiveText="#000000"
                    />
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="px-6 py-2 text-sm text-[#d53b00] bg-cabinet-paper border border-cabinet-border rounded-3xl mt-1">
            Error loading sessions: {error}
          </div>
        )}

        {/* Content */}
        <div
          className="flex relative shadow-[0_18px_42px_rgba(0,0,0,0.08)] overflow-hidden"
          style={{ height: "calc(100vh - 104px)", borderRadius: "24px", zIndex: 5 }}
        >
          {/* Desktop more sidebar */}
          {showMoreSidebar && (
            <div className="hidden md:flex w-[260px] min-w-[260px] flex-col bg-cabinet-paper border border-cabinet-border border-r-0">
              <div className="flex items-center justify-between px-4 py-3 border-b border-cabinet-border">
                <span className="text-sm font-medium text-cabinet-ink">历史记录</span>
                <button
                  onClick={() => setShowMoreSidebar(false)}
                  className="w-8 h-8 flex items-center justify-center rounded hover:bg-cabinet-itemBg"
                  aria-label="Close sidebar"
                >
                  <X size={18} className="text-cabinet-ink" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto cabinet-scrollbar">
                {sessions.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-cabinet-inkMuted text-center">
                    暂无历史会话
                  </div>
                ) : (
                  sessions.map((session) => (
                    <button
                      key={session.id}
                      onClick={() => handleSessionSelect(session.id)}
                      className={`w-full text-left px-4 py-3 relative transition-colors ${
                        activeSessionId === session.id
                          ? "bg-cabinet-itemBg"
                          : "hover:bg-cabinet-itemBg"
                      }`}
                    >
                      {activeSessionId === session.id && (
                        <div className="absolute left-0 top-2 bottom-2 w-[3px] bg-cabinet-blue rounded-r-full" />
                      )}
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-cabinet-inkMuted flex-shrink-0" />
                        <div className="text-sm font-medium text-cabinet-ink truncate leading-tight">
                          {session.title || "未命名会话"}
                        </div>
                      </div>
                      <div className="text-xs text-cabinet-ink2 truncate mt-1 leading-tight">
                        {new Date(session.createdAt).toLocaleString()} · {session.nodeCount} nodes
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          <div className="flex-1 bg-cabinet-paper relative overflow-hidden">
            {loading && sessions.length === 0 ? (
              <Spinner />
            ) : sessions.length === 0 && !loading ? (
              <div className="flex items-center justify-center h-full text-cabinet-inkMuted text-base">
                暂无历史会话
              </div>
            ) : (
              <HistoryPage sessionId={activeSessionId} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
