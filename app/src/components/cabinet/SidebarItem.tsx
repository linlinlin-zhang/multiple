interface SidebarItemProps {
  title: string;
  summary: string;
  selected: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
}

export default function SidebarItem({ title, summary, selected, onClick, icon }: SidebarItemProps) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left px-4 py-3 relative
        transition-colors duration-0
        ${selected ? "bg-cabinet-itemBg" : "hover:bg-cabinet-itemBg"}
      `}
    >
      {selected && (
        <div
          className="absolute left-0 top-2 bottom-2 w-[3px] bg-cabinet-blue rounded-r-full"
        />
      )}
      <div className="flex items-center gap-2">
        {icon && <span className="flex-shrink-0 w-4 h-4 flex items-center justify-center">{icon}</span>}
        <div className="text-sm font-medium text-cabinet-ink truncate leading-tight">
          {title}
        </div>
      </div>
      <div className="text-xs text-cabinet-ink2 truncate mt-1 leading-tight">
        {summary}
      </div>
    </button>
  );
}
