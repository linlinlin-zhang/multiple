import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/lib/i18n";
import type { MaterialSort } from "@/types";

interface MaterialSortSelectProps {
  value: MaterialSort;
  onChange: (value: MaterialSort) => void;
}

const SORT_OPTIONS: { value: MaterialSort; labelKey: string }[] = [
  { value: "date", labelKey: "library.sort.date" },
  { value: "added", labelKey: "library.sort.added" },
  { value: "name", labelKey: "library.sort.name" },
  { value: "size", labelKey: "library.sort.size" },
];

export default function MaterialSortSelect({ value, onChange }: MaterialSortSelectProps) {
  const { t } = useI18n();

  return (
    <Select value={value} onValueChange={(v) => onChange(v as MaterialSort)}>
      <SelectTrigger className="h-9 w-[140px] bg-cabinet-paper border-cabinet-border" aria-label={t("library.sortBy")}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {SORT_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {t(option.labelKey)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
