import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import AppNavigation from "@/components/AppNavigation";
import { useI18n, type Lang } from "@/lib/i18n";

type ApiRole = "analysis" | "chat" | "image" | "asr" | "realtime";

interface RoleSettings {
  endpoint: string;
  model: string;
  apiKey: string;
  temperature: number;
}

type SettingsPayload = Record<ApiRole, RoleSettings> & {
  theme?: "light" | "dark";
  language?: Lang;
};

const roles: ApiRole[] = ["analysis", "chat", "image", "asr", "realtime"];

const emptyRole: RoleSettings = {
  endpoint: "",
  model: "",
  apiKey: "",
  temperature: 0.7,
};

function getInitialTheme(): "light" | "dark" {
  const attr = document.documentElement.getAttribute("data-theme");
  return attr === "dark" ? "dark" : "light";
}

function normalizeRole(value: unknown): RoleSettings {
  if (!value || typeof value !== "object") return { ...emptyRole };
  const input = value as Partial<RoleSettings>;
  return {
    endpoint: input.endpoint || "",
    model: input.model || "",
    apiKey: input.apiKey || "",
    temperature: typeof input.temperature === "number" ? input.temperature : 0.7,
  };
}

export default function SettingsPage() {
  const { lang, setLang, t } = useI18n();
  const [navOpen, setNavOpen] = useState(false);
  const [activeRole, setActiveRole] = useState<ApiRole>("analysis");
  const [theme, setTheme] = useState<"light" | "dark">(getInitialTheme);
  const [settings, setSettings] = useState<Record<ApiRole, RoleSettings>>({
    analysis: { ...emptyRole },
    chat: { ...emptyRole },
    image: { ...emptyRole },
    asr: { ...emptyRole, temperature: 0 },
    realtime: { ...emptyRole },
  });
  const [status, setStatus] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data: Partial<SettingsPayload>) => {
        if (cancelled) return;
        setSettings({
          analysis: normalizeRole(data.analysis),
          chat: normalizeRole(data.chat),
          image: normalizeRole(data.image),
          asr: normalizeRole(data.asr),
          realtime: normalizeRole(data.realtime),
        });
        if (data.theme === "light" || data.theme === "dark") {
          setTheme(data.theme);
          document.documentElement.setAttribute("data-theme", data.theme);
          localStorage.setItem("oryzae-theme", data.theme);
        }
        if (data.language === "zh" || data.language === "en") {
          setLang(data.language);
        }
      })
      .catch(() => setStatus(t("settings.loadFailed")));
    return () => {
      cancelled = true;
    };
  }, [setLang, t]);

  const current = settings[activeRole];

  const updateRole = (field: keyof RoleSettings, value: string | number) => {
    setSettings((prev) => ({
      ...prev,
      [activeRole]: {
        ...prev[activeRole],
        [field]: value,
      },
    }));
  };

  const saveTheme = async (nextTheme: "light" | "dark") => {
    setTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    localStorage.setItem("oryzae-theme", nextTheme);
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: nextTheme }),
    });
  };

  const saveLanguage = async (nextLang: Lang) => {
    setLang(nextLang);
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: nextLang }),
    });
  };

  const saveApiSettings = async () => {
    setStatus(t("settings.saving"));
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [activeRole]: settings[activeRole] }),
      });
      if (!res.ok) throw new Error(await res.text());
      setStatus(t("settings.saved"));
    } catch (error) {
      setStatus(`${t("settings.saveFailed")}: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return (
    <div className="min-h-screen bg-cabinet-bg p-3 text-cabinet-ink md:p-7">
      <AppNavigation activePage="settings" open={navOpen} onClose={() => setNavOpen(false)} />
      <main className="mx-auto min-h-[calc(100vh-1.5rem)] max-w-[1160px] overflow-hidden rounded-[18px] border border-cabinet-border bg-cabinet-paper shadow-[0_22px_48px_rgba(0,0,0,0.08)] md:min-h-[calc(100vh-3.5rem)]">
        <header className="flex h-16 items-center gap-4 border-b border-cabinet-border px-5">
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded hover:bg-cabinet-itemBg"
            aria-label={t("nav.open")}
          >
            <Menu size={20} />
          </button>
          <div>
            <div className="text-xs text-cabinet-inkMuted">ORYZAE</div>
            <h1 className="text-xl font-medium tracking-[0]">{t("settings.pageTitle")}</h1>
          </div>
        </header>

        <div className="grid gap-8 p-5 md:grid-cols-[300px_1fr] md:p-8">
          <section className="space-y-4">
            <div className="border border-cabinet-border bg-cabinet-itemBg p-4">
              <h2 className="text-sm font-medium">{t("settings.appearance")}</h2>
              <label className="mt-4 flex items-center justify-between gap-4 text-sm text-cabinet-inkMuted">
                <span>{t("settings.darkMode")}</span>
                <input
                  type="checkbox"
                  checked={theme === "dark"}
                  onChange={(event) => saveTheme(event.target.checked ? "dark" : "light").catch(() => setStatus(t("settings.saveFailed")))}
                  className="h-5 w-5 accent-cabinet-blue"
                />
              </label>
              <label className="mt-4 grid gap-2 text-sm text-cabinet-inkMuted">
                <span>{t("settings.language")}</span>
                <select
                  value={lang}
                  onChange={(event) => saveLanguage(event.target.value as Lang).catch(() => setStatus(t("settings.saveFailed")))}
                  className="h-10 border border-cabinet-border bg-cabinet-paper px-3 text-sm text-cabinet-ink"
                >
                  <option value="zh">{t("lang.zh")}</option>
                  <option value="en">{t("lang.en")}</option>
                </select>
              </label>
            </div>
            <div className="border border-cabinet-border bg-cabinet-itemBg p-4">
              <h2 className="text-sm font-medium">{t("settings.apiGroups")}</h2>
              <div className="mt-3 grid gap-2">
                {roles.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setActiveRole(role)}
                    className={`h-10 px-3 text-left text-sm transition-colors ${
                      activeRole === role ? "bg-cabinet-blue text-cabinet-paper" : "bg-cabinet-paper text-cabinet-ink hover:bg-white"
                    }`}
                  >
                    {t(`settings.${role}`)}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="border border-cabinet-border p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cabinet-border pb-4">
              <div>
                <div className="text-xs text-cabinet-inkMuted">{t("settings.apiSettings")}</div>
                <h2 className="text-2xl font-medium tracking-[0]">{t(`settings.${activeRole}`)}</h2>
              </div>
              <button type="button" onClick={saveApiSettings} className="h-10 bg-cabinet-blue px-5 text-sm font-medium text-cabinet-paper hover:bg-cabinet-cyan">
                {t("settings.save")}
              </button>
            </div>

            <div className="mt-5 grid gap-4">
              <label className="grid gap-2 text-sm text-cabinet-inkMuted">
                <span>API Endpoint</span>
                <input
                  value={current.endpoint}
                  onChange={(event) => updateRole("endpoint", event.target.value)}
                  className="h-11 border border-cabinet-border bg-cabinet-paper px-3 text-cabinet-ink outline-none focus:ring-2 focus:ring-cabinet-blue"
                  placeholder="https://api.example.com/v1"
                />
              </label>
              <label className="grid gap-2 text-sm text-cabinet-inkMuted">
                <span>Model</span>
                <input
                  value={current.model}
                  onChange={(event) => updateRole("model", event.target.value)}
                  className="h-11 border border-cabinet-border bg-cabinet-paper px-3 text-cabinet-ink outline-none focus:ring-2 focus:ring-cabinet-blue"
                  placeholder="model-name"
                />
              </label>
              <label className="grid gap-2 text-sm text-cabinet-inkMuted">
                <span>API Key</span>
                <input
                  type="password"
                  value={current.apiKey}
                  onChange={(event) => updateRole("apiKey", event.target.value)}
                  className="h-11 border border-cabinet-border bg-cabinet-paper px-3 text-cabinet-ink outline-none focus:ring-2 focus:ring-cabinet-blue"
                  placeholder="sk-..."
                />
              </label>
              <label className="grid gap-2 text-sm text-cabinet-inkMuted">
                <span>Temperature</span>
                <input
                  type="number"
                  min="0"
                  max="2"
                  step="0.1"
                  value={current.temperature}
                  onChange={(event) => updateRole("temperature", Number(event.target.value))}
                  className="h-11 border border-cabinet-border bg-cabinet-paper px-3 text-cabinet-ink outline-none focus:ring-2 focus:ring-cabinet-blue"
                />
              </label>
            </div>
            {status && <div className="mt-4 text-sm text-cabinet-inkMuted">{status}</div>}
          </section>
        </div>
      </main>
    </div>
  );
}
