import { useState, useEffect } from "react";

interface FolderTabProps {
  label: string;
  tabId: string;
  active: boolean;
  zIndex: number;
  overlap?: boolean;
  onClick: () => void;
  inactiveColor?: string;
  inactiveText?: string;
}

const ACTIVE_BG = "#f0ece4";
const ACTIVE_TEXT = "#1a1a1a";

export default function FolderTab({
  label,
  tabId: _tabId,
  active,
  zIndex,
  overlap = true,
  onClick,
  inactiveColor = "#d8cfc4",
  inactiveText = "#1a1a1a",
}: FolderTabProps) {
  const [bouncing, setBouncing] = useState(false);

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

  const bgColor = active ? ACTIVE_BG : inactiveColor;
  const textColor = active ? ACTIVE_TEXT : inactiveText;

  return (
    <button
      onClick={handleClick}
      className={`
        relative text-[14px] font-medium tracking-[0.02em]
        flex items-center justify-center
        select-none cursor-pointer flex-shrink-0 truncate max-w-[120px]
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
      title={label}
    >
      {label}
    </button>
  );
}
