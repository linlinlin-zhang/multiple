import { BookOpen, History, Home, LayoutDashboard, Settings, FolderOpen, X } from "lucide-react";
import type { ReactNode } from "react";
import { useI18n } from "@/lib/i18n";

type ActivePage = "workbench" | "history" | "home" | "settings" | "library" | "guide";

interface NavigationItem {
  key: string;
  labelKey: string;
  href: string;
  icon: ReactNode;
  active: ActivePage;
}

interface AppNavigationProps {
  activePage: ActivePage;
  open: boolean;
  onClose: () => void;
}

const historyHref = "/history/";
const settingsHref = "/history/?view=settings";
const guideHref = "/history/?view=guide";

export default function AppNavigation({ activePage, open, onClose }: AppNavigationProps) {
  const { t } = useI18n();
  if (!open) return null;

  const items: NavigationItem[] = [
    { key: "home", labelKey: "nav.home", href: "/", icon: <Home size={18} />, active: "home" },
    { key: "workbench", labelKey: "nav.workbench", href: "/app.html", icon: <LayoutDashboard size={18} />, active: "workbench" },
    { key: "library", labelKey: "nav.materialLibrary", href: "/history/?view=library", icon: <FolderOpen size={18} />, active: "library" },
    { key: "history", labelKey: "nav.history", href: historyHref, icon: <History size={18} />, active: "history" },
    { key: "guide", labelKey: "nav.guide", href: guideHref, icon: <BookOpen size={18} />, active: "guide" },
    { key: "settings", labelKey: "nav.settings", href: settingsHref, icon: <Settings size={18} />, active: "settings" },
  ];

  return (
    <div className="fixed inset-0 z-[80]">
      <button
        type="button"
        className="absolute inset-0 bg-black/20"
        onClick={onClose}
        aria-label={t("nav.close")}
      />
      <aside
        className="absolute left-0 top-0 flex h-full w-[280px] max-w-[86vw] flex-col bg-cabinet-black px-5 py-5 text-cabinet-paper shadow-[18px_0_42px_rgba(0,0,0,0.18)]"
        aria-label={t("nav.label")}
      >
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-cabinet-paper hover:bg-white/12"
            aria-label={t("nav.close")}
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-3 border-b border-white/14 pb-4">
          <div className="text-[22px] font-light leading-tight tracking-[0]">{t("nav.product")}</div>
        </div>

        <nav className="mt-4 grid gap-2" aria-label={t("nav.pages")}>
          {items.map((item) => {
            const active = activePage === item.active;
            return (
              <a
                key={item.key}
                href={item.href}
                className={`grid min-h-11 grid-cols-[30px_1fr] items-center gap-3 rounded-full px-3 py-2 text-[15px] transition-colors ${
                  active ? "bg-cabinet-blue text-cabinet-paper" : "text-white/82 hover:bg-white/12 hover:text-cabinet-paper"
                }`}
              >
                <span className={`flex h-7 w-7 items-center justify-center rounded-full ${active ? "bg-white/22" : "bg-white/12"}`}>
                  {item.icon}
                </span>
                <span>{t(item.labelKey)}</span>
              </a>
            );
          })}
        </nav>
      </aside>
    </div>
  );
}
