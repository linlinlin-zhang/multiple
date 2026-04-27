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

const ACTIVE_BG = "#0070cc";
const ACTIVE_TEXT = "#ffffff";

export default function FolderTab({
  label,
  tabId: _tabId,
  active,
  zIndex,
  overlap = true,
  onClick,
  inactiveColor = "#ffffff",
  inactiveText = "#000000",
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
        relative text-[14px] font-medium tracking-[0]
        flex items-center justify-center
        select-none cursor-pointer flex-shrink-0 truncate max-w-[150px]
        ${bouncing ? "animate-tab-bounce" : ""}
      `}
      style={{
        zIndex,
        backgroundColor: bgColor,
        color: textColor,
        clipPath: "none",
        borderRadius: "999px",
        border: active ? "1px solid #0070cc" : "1px solid #f3f3f3",
        boxShadow: active ? "0 0 0 2px #ffffff, 0 0 0 4px #0070cc" : "0 5px 9px rgba(0,0,0,0.06)",
        marginLeft: overlap ? "8px" : "0",
        paddingLeft: "24px",
        paddingRight: "24px",
        transition: "background-color 0.15s ease, color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease",
        transform: active ? "translateY(0)" : "translateY(4px)",
        height: "40px",
      }}
      title={label}
    >
      {label}
    </button>
  );
}
