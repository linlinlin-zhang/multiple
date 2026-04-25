import { useState, useEffect } from "react";
import FolderTab from "./FolderTab";
import { useHistory } from "../../hooks/useHistory";
import HistoryPage from "./HistoryPage";

const INACTIVE_COLORS = [
  { bg: "#e5ddd4", text: "#1a1a1a" },
  { bg: "#a0a098", text: "#1a1a1a" },
  { bg: "#5a6a7a", text: "#f0ece4" },
];

function SkeletonTabs() {
  return (
    <div className="flex items-end pl-4 md:pl-6 overflow-x-auto">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="relative text-[14px] font-medium tracking-[0.02em] flex items-center justify-center select-none animate-pulse flex-shrink-0"
          style={{
            zIndex: i,
            backgroundColor: "#d8cfc4",
            clipPath: "polygon(5% 0%, 95% 0%, 100% 100%, 0% 100%)",
            borderRadius: "5px 5px 0 0",
            marginLeft: i > 1 ? "-22px" : "0",
            paddingLeft: "32px",
            paddingRight: "32px",
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

export default function FileCabinet() {
  const { sessions, loading, error } = useHistory(20, 0, false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (activeSessionId === null && sessions.length > 0) {
      setActiveSessionId(sessions[0].id);
    }
  }, [sessions, activeSessionId]);

  return (
    <div className="min-h-screen bg-cabinet-bg flex justify-center pt-4 md:pt-10 px-4">
      <div className="w-full max-w-full md:max-w-[1100px]">
        {/* Tab Bar */}
        {loading && sessions.length === 0 ? (
          <SkeletonTabs />
        ) : (
          <div className="flex items-end pl-4 md:pl-6 overflow-x-auto">
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
              sessions.map((session, index) => {
                const palette = INACTIVE_COLORS[index % 3];
                return (
                  <FolderTab
                    key={session.id}
                    label={session.title || "未命名会话"}
                    tabId={session.id}
                    active={activeSessionId === session.id}
                    zIndex={index + 1}
                    overlap={index > 0}
                    onClick={() => setActiveSessionId(session.id)}
                    inactiveColor={palette.bg}
                    inactiveText={palette.text}
                  />
                );
              })
            )}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="px-6 py-2 text-sm text-red-600 bg-red-50 rounded mt-1">
            Error loading sessions: {error}
          </div>
        )}

        {/* Content */}
        <div
          className="bg-cabinet-paper relative"
          style={{
            height: "calc(100vh - 80px)",
            borderRadius: "0 4px 4px 4px",
            zIndex: 5,
          }}
        >
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
  );
}
