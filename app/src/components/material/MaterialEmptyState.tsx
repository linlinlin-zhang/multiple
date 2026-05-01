import { FolderOpen } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface MaterialEmptyStateProps {
  isSearch: boolean;
}

export default function MaterialEmptyState({ isSearch }: MaterialEmptyStateProps) {
  const { t } = useI18n();

  return (
    <div className="flex flex-col items-center justify-center h-full py-16">
      <FolderOpen size={48} className="text-cabinet-inkMuted mb-4" />
      <h2 className="text-xl font-medium text-cabinet-ink">
        {isSearch ? t("library.noResults") : t("library.empty")}
      </h2>
      {!isSearch && (
        <p className="text-sm text-cabinet-inkMuted mt-2 text-center max-w-sm">
          {t("library.emptyHint")}
        </p>
      )}
    </div>
  );
}
