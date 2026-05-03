import type { MaterialItem } from "@/types";
import MaterialCard from "./MaterialCard";

interface MaterialGridProps {
  items: MaterialItem[];
  onDelete: (id: string) => void;
  onRename: (id: string, fileName: string) => Promise<void> | void;
  onToggleFavorite: (id: string, favorited: boolean) => Promise<void> | void;
  onPreview?: (id: string) => void;
}

export default function MaterialGrid({ items, onDelete, onRename, onToggleFavorite, onPreview }: MaterialGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
      {items.map((item) => (
        <MaterialCard
          key={item.id}
          item={item}
          onDelete={onDelete}
          onRename={onRename}
          onToggleFavorite={onToggleFavorite}
          onPreview={onPreview}
        />
      ))}
    </div>
  );
}
