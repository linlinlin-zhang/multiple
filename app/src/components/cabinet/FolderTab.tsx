import { useState, useEffect } from "react";
import type { TabId } from "@/types";

interface FolderTabProps {
  label: string;
  tabId: TabId;
  active: boolean;
  zIndex: number;
  overlap?: boolean;
  onClick: () => void;
}

const tabConfig: Record<
  TabId,
  { inactiveColor: string; inactiveText: string }
> = {
  notes: {
    inactiveColor: "#d8cfc4",
    inactiveText: "#1a1a1a",
  },
  projects: {
    inactiveColor: "#a8a098",
    inactiveText: "#1a1a1a",
  },
  archive: {
    inactiveColor: "#6a7a8a",
    inactiveText: "#f0ece4",
  },
};

const ACTIVE_BG = "#f0ece4";
const ACTIVE_TEXT = "#1a1a1a";

export default function FolderTab({
  label,
  tabId,
  active,
  zIndex,
  overlap = true,
  onClick,
}: FolderTabProps) {
  const [bouncing, setBouncing] = useState(false);
  const config = tabConfig[tabId];

  const handleClick = () => {
    if (!active) {
      setBouncing(true);
      onClick();
    }
  };

  useEffect(() => {
    if (bouncing) {
      const timer = setTimeout(() => setBouncing(false), 350);
      return () => clearTimeout(timer);
    }
  }, [bouncing]);

  const bgColor = active ? ACTIVE_BG : config.inactiveColor;
  const textColor = active ? ACTIVE_TEXT : config.inactiveText;

  return (
    <button
      onClick={handleClick}
      className={`
        relative text-[14px] font-medium tracking-[0.02em]
        flex items-center justify-center
        select-none cursor-pointer
        ${bouncing ? "animate-tab-bounce" : ""}
      `}
      style={{
        zIndex,
        backgroundColor: bgColor,
        color: textColor,
        clipPath: "polygon(5% 0%, 95% 0%, 100% 100%, 0% 100%)",
        borderRadius: "5px 5px 0 0",
        marginLeft: overlap ? "-22px" : "0",
        paddingLeft: "32px",
        paddingRight: "32px",
        transition: "background-color 0.15s ease, color 0.15s ease",
        transform: active ? "translateY(0)" : "translateY(3px)",
        height: "40px",
      }}
    >
      {label}
    </button>
  );
}
