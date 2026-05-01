import { Plus } from "lucide-react";
import type { ReactNode } from "react";
import SidebarItem from "./SidebarItem";

interface SidebarItemData {
  id: string;
  title: string;
  summary: string;
  groupLabel?: string;
  icon?: ReactNode;
}

interface SidebarProps {
  title: string;
  items: SidebarItemData[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate?: () => void;
  emptyMessage?: string;
  className?: string;
}

export default function Sidebar({
  title,
  items,
  selectedId,
  onSelect,
  onCreate,
  emptyMessage = "No items",
  className = "",
}: SidebarProps) {
  // Group items by groupLabel
  const grouped = items.reduce<Record<string, SidebarItemData[]>>((acc, item) => {
    const label = item.groupLabel || "Other";
    if (!acc[label]) acc[label] = [];
    acc[label].push(item);
    return acc;
  }, {});

  // Preserve order of first appearance
  const groupOrder = items
    .map((item) => item.groupLabel || "Other")
    .filter((label, index, arr) => arr.indexOf(label) === index);

  return (
    <div className={`bg-cabinet-paper border-r border-cabinet-border flex flex-col h-full ${className || "w-[280px] min-w-[280px]"}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm font-medium text-cabinet-ink">{title}</span>
        {onCreate && (
          <button
            onClick={onCreate}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-cabinet-itemBg transition-colors"
            title="Create new"
          >
            <Plus size={14} className="text-cabinet-ink2" />
          </button>
        )}
      </div>

      {/* Divider */}
      <div className="border-b border-cabinet-border" />

      {/* Items */}
      <div className="flex-1 overflow-y-auto cabinet-scrollbar">
        {items.length === 0 ? (
          <div className="px-4 py-6 text-sm text-cabinet-inkMuted">{emptyMessage}</div>
        ) : (
          groupOrder.map((groupLabel) => (
            <div key={groupLabel}>
              {/* Group label */}
              <div className="px-4 pt-4 pb-2">
                <span className="text-[12px] font-medium text-cabinet-inkMuted tracking-[0]">
                  {groupLabel}
                </span>
              </div>
              {/* Items in group */}
              {grouped[groupLabel]?.map((item) => (
                <SidebarItem
                  key={item.id}
                  title={item.title}
                  summary={item.summary}
                  selected={selectedId === item.id}
                  onClick={() => onSelect(item.id)}
                  icon={item.icon}
                />
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
