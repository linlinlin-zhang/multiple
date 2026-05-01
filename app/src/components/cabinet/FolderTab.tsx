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
        clipPath: "polygon(12% 0, 88% 0, 100% 100%, 0 100%)",
        border: active ? "1px solid #0070cc" : "1px solid #f3f3f3",
        boxShadow: active ? "0 -1px 0 #0070cc inset" : "0 8px 14px rgba(0,0,0,0.05)",
        marginLeft: overlap ? "-12px" : "0",
        paddingLeft: "34px",
        paddingRight: "34px",
        transition: "background-color 0.15s ease, color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease",
        transform: active ? "translateY(0)" : "translateY(4px)",
        height: "52px",
        minWidth: "150px",
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
