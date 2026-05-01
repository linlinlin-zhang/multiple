import { useState, useEffect, type ReactNode } from "react";

interface FolderTabProps {
  label: string;
  tabId: string;
  active: boolean;
  zIndex: number;
  overlap?: boolean;
  onClick: () => void;
  inactiveColor?: string;
  inactiveText?: string;
  icon?: ReactNode;
}

const ACTIVE_BG = "#0070cc";
const ACTIVE_TEXT = "#ffffff";

export default function FolderTab({
  label,
  tabId,
  active,
  zIndex,
  overlap = true,
  onClick,
  inactiveColor = "#ffffff",
  inactiveText = "#000000",
  icon,
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
        select-none cursor-pointer flex-shrink-0 truncate
        ${bouncing ? "animate-tab-bounce" : ""}
      `}
      style={{
        zIndex,
        backgroundColor: bgColor,
        color: textColor,
        clipPath: "none",
        border: active ? "1px solid #0070cc" : "1px solid #f3f3f3",
        borderRadius: "0",
        boxShadow: active ? "0 -2px 0 #005ea8 inset" : "none",
        marginLeft: overlap ? "0" : "0",
        paddingLeft: "28px",
        paddingRight: "28px",
        transition: "background-color 0.15s ease, color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease",
        transform: "translateY(0)",
        height: "56px",
        minWidth: "138px",
      }}
      title={label}
      data-tab-id={tabId}
    >
      <span className="flex items-center gap-2 min-w-0">
        {icon && <span className="flex h-4 w-4 items-center justify-center flex-shrink-0">{icon}</span>}
        <span className="truncate">{label}</span>
      </span>
    </button>
  );
}
