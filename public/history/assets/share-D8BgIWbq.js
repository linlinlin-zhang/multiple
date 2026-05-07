import { r as reactExports, u as useI18n, j as jsxRuntimeExports, N as NodeGraphThumbnail, b as buildAssetUrl, f as clientExports, I as I18nProvider } from "./NodeGraphThumbnail-CqhtW_dA.js";
function formatBytes(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}
function ShareViewerPage() {
  const [loading, setLoading] = reactExports.useState(true);
  const [error, setError] = reactExports.useState(null);
  const [data, setData] = reactExports.useState(null);
  const { t } = useI18n();
  const token = window.location.pathname.split("/").pop() || "";
  reactExports.useEffect(() => {
    let cancelled = false;
    async function fetchShare() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/share/${token}`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `HTTP ${res.status}`);
        }
        const json = await res.json();
        if (!json.ok) {
          throw new Error(json.error || "Failed to load share");
        }
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchShare();
    return () => {
      cancelled = true;
    };
  }, [token]);
  if (loading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/share/ShareViewerPage.tsx:94:7", className: "min-h-screen bg-cabinet-bg text-cabinet-ink font-sans flex flex-col items-center justify-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/share/ShareViewerPage.tsx:95:9", className: "w-7 h-7 border-2 border-cabinet-border border-t-cabinet-blue rounded-full animate-spin mb-3" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { "code-path": "src/components/share/ShareViewerPage.tsx:96:9", className: "text-sm text-cabinet-inkMuted", children: t("share.loading") })
    ] });
  }
  if (error) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/share/ShareViewerPage.tsx:103:7", className: "min-h-screen bg-cabinet-bg text-cabinet-ink font-sans flex flex-col items-center justify-center px-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { "code-path": "src/components/share/ShareViewerPage.tsx:104:9", className: "text-[#d53b00] mb-4", children: [
        t("share.loadFailed"),
        error
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          "code-path": "src/components/share/ShareViewerPage.tsx:105:9",
          onClick: () => window.location.reload(),
          className: "px-5 py-2 bg-cabinet-blue text-white rounded-full text-sm hover:bg-cabinet-cyan hover:scale-110 transition-transform",
          children: t("share.retry")
        }
      )
    ] });
  }
  if (!data) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/share/ShareViewerPage.tsx:117:7", className: "min-h-screen bg-cabinet-bg text-cabinet-ink font-sans flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { "code-path": "src/components/share/ShareViewerPage.tsx:118:9", className: "text-cabinet-inkMuted", children: t("share.loadFailed") }) });
  }
  const snapshot = data.snapshot;
  const hasContent = snapshot.nodes.length > 0 || snapshot.assets.length > 0;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/share/ShareViewerPage.tsx:127:5", className: "min-h-screen bg-cabinet-bg text-cabinet-ink font-sans", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { "code-path": "src/components/share/ShareViewerPage.tsx:128:7", className: "bg-black text-white px-6 py-5 flex items-center justify-between gap-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { "code-path": "src/components/share/ShareViewerPage.tsx:129:9", className: "text-xl md:text-2xl font-light leading-tight", children: snapshot.title || t("session.unnamed") }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { "code-path": "src/components/share/ShareViewerPage.tsx:132:9", className: "text-sm text-white/70", children: [
        t("share.sharedAt"),
        " ",
        new Date(data.createdAt).toLocaleString()
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("main", { "code-path": "src/components/share/ShareViewerPage.tsx:137:7", className: "max-w-[1200px] mx-auto px-4 md:px-8 py-8 space-y-6", children: !hasContent ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/share/ShareViewerPage.tsx:139:11", className: "bg-white rounded-3xl border border-cabinet-border p-8 text-center shadow-[0_8px_16px_rgba(0,0,0,0.08)]", children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { "code-path": "src/components/share/ShareViewerPage.tsx:140:13", className: "text-cabinet-inkMuted", children: t("share.noContent") }) }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { "code-path": "src/components/share/ShareViewerPage.tsx:144:13", className: "bg-white rounded-3xl border border-cabinet-border p-5 shadow-[0_8px_16px_rgba(0,0,0,0.08)]", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { "code-path": "src/components/share/ShareViewerPage.tsx:145:15", className: "text-base font-medium text-cabinet-ink mb-4", children: t("share.nodeOverview") }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(NodeGraphThumbnail, { "code-path": "src/components/share/ShareViewerPage.tsx:146:15", nodes: snapshot.nodes, links: snapshot.links })
      ] }),
      snapshot.assets.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { "code-path": "src/components/share/ShareViewerPage.tsx:150:15", className: "bg-white rounded-3xl border border-cabinet-border p-5 shadow-[0_8px_16px_rgba(0,0,0,0.08)]", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { "code-path": "src/components/share/ShareViewerPage.tsx:151:17", className: "text-base font-medium text-cabinet-ink mb-4", children: t("share.assets") }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/share/ShareViewerPage.tsx:152:17", className: "grid grid-cols-2 md:grid-cols-4 gap-4", children: snapshot.assets.map((asset, idx) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            "code-path": "src/components/share/ShareViewerPage.tsx:154:21",
            className: "bg-white rounded-3xl border border-cabinet-border overflow-hidden shadow-[0_5px_9px_rgba(0,0,0,0.06)]",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "img",
                {
                  "code-path": "src/components/share/ShareViewerPage.tsx:158:23",
                  src: buildAssetUrl(asset.hash, asset.kind),
                  loading: "lazy",
                  alt: asset.fileName || asset.hash.slice(0, 8),
                  className: "w-full h-32 object-cover"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/share/ShareViewerPage.tsx:164:23", className: "p-3 flex items-center justify-between gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "code-path": "src/components/share/ShareViewerPage.tsx:165:25", className: "text-xs text-cabinet-inkMuted truncate", children: asset.fileName || asset.hash.slice(0, 12) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "code-path": "src/components/share/ShareViewerPage.tsx:168:25", className: "text-[11px] text-cabinet-inkMuted shrink-0", children: formatBytes(asset.fileSize) })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/share/ShareViewerPage.tsx:172:23", className: "px-3 pb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "code-path": "src/components/share/ShareViewerPage.tsx:173:25", className: "inline-block text-[11px] px-2 py-1 rounded-full bg-cabinet-bg text-cabinet-blue", children: asset.kind === "upload" ? t("share.upload") : t("share.generated") }) })
            ]
          },
          `${asset.hash}-${idx}`
        )) })
      ] }),
      snapshot.chatMessages.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { "code-path": "src/components/share/ShareViewerPage.tsx:184:15", className: "bg-white rounded-3xl border border-cabinet-border p-5 shadow-[0_8px_16px_rgba(0,0,0,0.08)]", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { "code-path": "src/components/share/ShareViewerPage.tsx:185:17", className: "text-base font-medium text-cabinet-ink mb-4", children: t("share.chatRecord") }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/share/ShareViewerPage.tsx:186:17", className: "space-y-3", children: snapshot.chatMessages.map((msg, idx) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/share/ShareViewerPage.tsx:188:21", className: "flex gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "div",
            {
              "code-path": "src/components/share/ShareViewerPage.tsx:189:23",
              className: `w-9 h-9 rounded-full flex items-center justify-center text-xs font-medium shrink-0 ${msg.role === "user" ? "bg-cabinet-bg text-cabinet-ink" : "bg-cabinet-blue text-white"}`,
              children: msg.role === "user" ? t("share.me") : t("share.ai")
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/share/ShareViewerPage.tsx:198:23", className: "p-4 rounded-3xl text-sm whitespace-pre-wrap flex-1 bg-cabinet-bg text-cabinet-ink leading-relaxed", children: msg.content })
        ] }, idx)) })
      ] })
    ] }) })
  ] });
}
const savedLang = localStorage.getItem("thoughtgrid-lang") ?? localStorage.getItem("oryzae-lang");
clientExports.createRoot(document.getElementById("root")).render(
  /* @__PURE__ */ jsxRuntimeExports.jsx(reactExports.StrictMode, { "code-path": "src/share-main.tsx:10:3", children: /* @__PURE__ */ jsxRuntimeExports.jsx(I18nProvider, { "code-path": "src/share-main.tsx:11:5", initialLang: savedLang || "zh", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ShareViewerPage, { "code-path": "src/share-main.tsx:12:7" }) }) })
);
