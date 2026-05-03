import { FolderOpen, Star } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface MaterialEmptyStateProps {
  isSearch: boolean;
  isFavoritesView?: boolean;
}

export default function MaterialEmptyState({ isSearch, isFavoritesView = false }: MaterialEmptyStateProps) {
  const { t } = useI18n();

  let titleKey = "library.empty";
  let hintKey: string | null = "library.emptyHint";
  let Icon = FolderOpen;

  if (isSearch) {
    titleKey = "library.noResults";
    hintKey = null;
  } else if (isFavoritesView) {
    titleKey = "library.emptyFavorites";
    hintKey = "library.emptyFavoritesHint";
    Icon = Star;
  }

  return (
    <div className="flex flex-col items-center justify-center h-full py-16">
      <Icon size={48} className="text-cabinet-inkMuted mb-4" />
      <h2 className="text-xl font-medium text-cabinet-ink">{t(titleKey)}</h2>
      {hintKey && (
        <p className="text-sm text-cabinet-inkMuted mt-2 text-center max-w-sm">
          {t(hintKey)}
        </p>
      )}
    </div>
  );
}
