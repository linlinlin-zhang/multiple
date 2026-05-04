import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import AppNavigation from "@/components/AppNavigation";
import { useI18n, type Lang } from "@/lib/i18n";

type ApiRole = "analysis" | "chat" | "image" | "asr" | "realtime" | "deepthink";
type RoleOptionValue = string | number | boolean;

interface RoleSettings {
  endpoint: string;
  model: string;
  apiKey: string;
  temperature: number;
  options: Record<string, RoleOptionValue>;
}

type SettingsPayload = Record<ApiRole, RoleSettings> & {
  theme?: "light" | "dark";
  language?: Lang;
};

const roles: ApiRole[] = ["analysis", "chat", "image", "asr", "realtime", "deepthink"];

const emptyRole: RoleSettings = {
  endpoint: "",
  model: "",
  apiKey: "",
  temperature: 0.7,
  options: {},
};

interface OptionField {
  key: string;
  type: "text" | "number" | "textarea" | "checkbox" | "select";
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  options?: Array<[string, string]>;
}

const optionFields: Record<ApiRole, OptionField[]> = {
  analysis: [
    { key: "top_p", type: "number", min: 0.01, max: 1, step: 0.01 },
    { key: "max_tokens", type: "number", min: 1, step: 1 },
    { key: "enableWebSearch", type: "checkbox" },
    { key: "jsonObjectResponse", type: "checkbox" },
  ],
  chat: [
    { key: "top_p", type: "number", min: 0.01, max: 1, step: 0.01 },
    { key: "max_tokens", type: "number", min: 1, step: 1 },
    { key: "enableWebSearch", type: "checkbox" },
    { key: "enableWebExtractor", type: "checkbox" },
    { key: "enableCodeInterpreter", type: "checkbox" },
    { key: "enableCanvasTools", type: "checkbox" },
    { key: "enablePreviousResponse", type: "checkbox" },
  ],
  image: [
    { key: "size", type: "text", placeholder: "2048*2048" },
    { key: "n", type: "number", min: 1, max: 6, step: 1 },
    { key: "negative_prompt", type: "textarea" },
    { key: "prompt_extend", type: "checkbox" },
    { key: "watermark", type: "checkbox" },
    { key: "seed", type: "number", min: 0, max: 2147483647, step: 1 },
    { key: "useReferenceImage", type: "checkbox" },
  ],
  asr: [
    { key: "targetLanguage", type: "select", options: [["auto", "Auto"], ["zh", "中文"], ["en", "English"]] },
    { key: "chunkMs", type: "number", min: 600, max: 6000, step: 100 },
  ],
  realtime: [
    { key: "voice", type: "text", placeholder: "Ethan" },
    { key: "outputAudio", type: "checkbox" },
    { key: "enableSearch", type: "checkbox" },
    { key: "smoothOutput", type: "select", options: [["auto", "Auto"], ["true", "On"], ["false", "Off"]] },
    { key: "transcriptionModel", type: "text", placeholder: "qwen3-asr-flash-realtime" },
    { key: "chunkMs", type: "number", min: 800, max: 8000, step: 100 },
    { key: "silenceThreshold", type: "number", min: 0.001, max: 0.08, step: 0.001 },
    { key: "top_p", type: "number", min: 0.01, max: 1, step: 0.01 },
  ],
  deepthink: [
    { key: "top_p", type: "number", min: 0.01, max: 1, step: 0.01 },
    { key: "max_tokens", type: "number", min: 1, step: 1 },
    { key: "sourceCardMode", type: "select", options: [["list", "List"], ["cards", "Cards"], ["off", "Off"]] },
    { key: "maxCanvasCards", type: "number", min: 1, max: 20, step: 1 },
    { key: "maxReferenceCards", type: "number", min: 0, max: 20, step: 1 },
    { key: "liveCanvasCards", type: "number", min: 0, max: 20, step: 1 },
    { key: "outputFormat", type: "text", placeholder: "model_summary_report" },
    { key: "incrementalOutput", type: "checkbox" },
  ],
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
    options: input.options && typeof input.options === "object" ? (input.options as Record<string, RoleOptionValue>) : {},
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
    deepthink: { ...emptyRole },
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
          deepthink: normalizeRole(data.deepthink),
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

  const updateRole = (field: Exclude<keyof RoleSettings, "options">, value: string | number) => {
    setSettings((prev) => ({
      ...prev,
      [activeRole]: {
        ...prev[activeRole],
        [field]: value,
      },
    }));
  };

  const updateOption = (key: string, value: RoleOptionValue | "") => {
    setSettings((prev) => {
      const nextOptions = { ...prev[activeRole].options };
      if (value === "") {
        delete nextOptions[key];
      } else {
        nextOptions[key] = value;
      }
      return {
        ...prev,
        [activeRole]: {
          ...prev[activeRole],
          options: nextOptions,
        },
      };
    });
  };

  const optionValue = (field: OptionField) => {
    const value = current.options[field.key];
    if (field.key === "smoothOutput") {
      if (value === true) return "true";
      if (value === false) return "false";
      return "auto";
    }
    if (field.key === "sourceCardMode") {
      return ["list", "cards", "off"].includes(String(value)) ? String(value) : "list";
    }
    if (field.key === "targetLanguage") {
      return ["auto", "zh", "en"].includes(String(value)) ? String(value) : "auto";
    }
    return value === undefined || value === null ? "" : String(value);
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

              <div className="grid gap-4 border-t border-cabinet-border pt-4">
                <div>
                  <div className="text-xs font-medium text-cabinet-ink">{t("settings.advanced")}</div>
                </div>
                {optionFields[activeRole].map((field) => (
                  <label
                    key={field.key}
                    className={`grid gap-2 text-sm text-cabinet-inkMuted ${
                      field.type === "checkbox" ? "grid-cols-[1fr_auto] items-center" : ""
                    }`}
                  >
                    <span>{t(`settings.option.${field.key}`)}</span>
                    {field.type === "checkbox" ? (
                      <input
                        type="checkbox"
                        checked={Boolean(current.options[field.key])}
                        onChange={(event) => updateOption(field.key, event.target.checked)}
                        className="h-5 w-5 accent-cabinet-blue"
                      />
                    ) : field.type === "select" ? (
                      <select
                        value={optionValue(field)}
                        onChange={(event) => {
                          const raw = event.target.value;
                          updateOption(field.key, field.key === "smoothOutput" ? (raw === "true" ? true : raw === "false" ? false : "auto") : raw);
                        }}
                        className="h-11 border border-cabinet-border bg-cabinet-paper px-3 text-cabinet-ink outline-none focus:ring-2 focus:ring-cabinet-blue"
                      >
                        {(field.options || []).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    ) : field.type === "textarea" ? (
                      <textarea
                        value={optionValue(field)}
                        onChange={(event) => updateOption(field.key, event.target.value)}
                        className="min-h-[84px] resize-y border border-cabinet-border bg-cabinet-paper px-3 py-2 text-cabinet-ink outline-none focus:ring-2 focus:ring-cabinet-blue"
                      />
                    ) : (
                      <input
                        type={field.type}
                        min={field.min}
                        max={field.max}
                        step={field.step}
                        value={optionValue(field)}
                        onChange={(event) => updateOption(field.key, field.type === "number" ? (event.target.value === "" ? "" : Number(event.target.value)) : event.target.value)}
                        className="h-11 border border-cabinet-border bg-cabinet-paper px-3 text-cabinet-ink outline-none focus:ring-2 focus:ring-cabinet-blue"
                        placeholder={field.placeholder}
                      />
                    )}
                    {t(`settings.hint.${field.key}`) !== `settings.hint.${field.key}` && (
                      <span className={field.type === "checkbox" ? "col-span-2 text-xs leading-5 text-cabinet-inkMuted" : "text-xs leading-5 text-cabinet-inkMuted"}>
                        {t(`settings.hint.${field.key}`)}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>
            {status && <div className="mt-4 text-sm text-cabinet-inkMuted">{status}</div>}
          </section>
        </div>
      </main>
    </div>
  );
}
