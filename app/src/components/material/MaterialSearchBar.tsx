import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";

interface MaterialSearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export default function MaterialSearchBar({ value, onChange }: MaterialSearchBarProps) {
  const { t } = useI18n();

  return (
    <div className="relative flex-1 max-w-sm">
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-cabinet-inkMuted pointer-events-none" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t("library.searchPlaceholder")}
        aria-label={t("library.search")}
        className="h-10 pl-9 pr-8 bg-cabinet-paper border-cabinet-border"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center text-cabinet-inkMuted hover:text-cabinet-ink"
          aria-label={t("library.clearSearch")}
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
