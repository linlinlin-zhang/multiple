import { createContext, createElement, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

export type Lang = "zh" | "en";

const dictionaries: Record<Lang, Record<string, string>> = {
  zh: {
    "app.title": "ORYZAE / History",
    "sidebar.sessions": "历史会话",
    "sidebar.assets": "资源",
    "sidebar.create": "新建",
    "detail.generatedImage": "生成图片",
    "detail.source": "来源",
    "detail.uploadedAt": "上传时间",
    "detail.generatedAt": "生成时间",
    "detail.explanation": "AI 讲解",
    "detail.noExplanation": "暂无讲解",
    "detail.prompt": "提示词",
    "detail.noPrompt": "暂无提示词",
    "detail.copy": "复制",
    "detail.download": "下载",
    "detail.close": "关闭",
    "share.title": "分享会话",
    "share.copyLink": "复制链接",
    "share.copied": "已复制",
    "share.expires": "有效期",
    "share.viewOnly": "只读视图",
    "folder.notes": "笔记",
    "folder.projects": "项目",
    "folder.archive": "归档",
    "history.loading": "加载中...",
    "history.error": "加载失败",
    "history.retry": "重试",
    "history.empty": "暂无会话",
    "history.nodeCount": "节点",
    "history.assetCount": "资源",
    "history.record": "历史记录",
    "history.noSessions": "暂无历史会话",
    "history.folderHint": "选择一次历史记录，查看它的输出文件夹",
    "history.tabImages": "图片",
    "history.tabWeb": "网页",
    "history.tabDocuments": "文档",
    "history.outputContents": "输出内容",
    "history.noOutputsInFolder": "该文件夹暂无输出内容",
    "history.openOutputs": "打开输出内容",
    "history.lastEdited": "最后编辑",
    "history.textSources": "文本来源",
    "settings.darkMode": "深色模式",
    "settings.language": "语言",
    "lang.zh": "中文",
    "lang.en": "English",
    "asset.images": "Images",
    "asset.files": "Files",
    "asset.links": "Links",
    "asset.chat": "Chat",
    "asset.generatedImage": "Generated Image",
    "asset.uploadedFile": "Uploaded File",
    "asset.document": "Document",
    "asset.webLink": "Web Link",
    "detail.fileName": "File name",
    "detail.mimeType": "MIME type",
    "detail.size": "Size",
    "detail.hash": "Hash",
    "detail.created": "Created",
    "detail.preview": "Preview",
    "detail.title": "Title",
    "detail.description": "Description",
    "detail.aiSummary": "AI Summary",
    "detail.you": "You",
    "detail.ai": "AI",
    "detail.selectAsset": "Select an asset from the sidebar to view details.",
    "detail.loadingSession": "Loading session...",
    "detail.assetNotFound": "Asset not found.",
    "share.loading": "正在加载分享内容...",
    "share.loadFailed": "无法加载分享内容：",
    "share.retry": "重试",
    "share.noContent": "这个会话还没有可展示的内容。",
    "share.nodeOverview": "节点图概览",
    "share.assets": "素材",
    "share.chatRecord": "对话记录",
    "share.upload": "原图",
    "share.generated": "生成图",
    "share.me": "我",
    "share.ai": "AI",
    "share.sharedAt": "分享于",
    "history.more": "更多",
    "settings.lightMode": "切换亮色模式",
    "session.unnamed": "未命名会话",
    "cabinet.openInCanvas": "Open in Canvas",
    "cabinet.hideHistory": "隐藏历史记录",
    "cabinet.showHistory": "显示历史记录",
    "cabinet.closeSidebar": "Close sidebar",
    "cabinet.noSessions": "No sessions"
  },
  en: {
    "app.title": "ORYZAE / History",
    "sidebar.sessions": "Sessions",
    "sidebar.assets": "Assets",
    "sidebar.create": "New",
    "detail.generatedImage": "Generated Image",
    "detail.source": "Source",
    "detail.uploadedAt": "Uploaded",
    "detail.generatedAt": "Generated",
    "detail.explanation": "AI Explanation",
    "detail.noExplanation": "No explanation",
    "detail.prompt": "Prompt",
    "detail.noPrompt": "No prompt",
    "detail.copy": "Copy",
    "detail.download": "Download",
    "detail.close": "Close",
    "share.title": "Shared Session",
    "share.copyLink": "Copy Link",
    "share.copied": "Copied",
    "share.expires": "Expires",
    "share.viewOnly": "View-only",
    "folder.notes": "Notes",
    "folder.projects": "Projects",
    "folder.archive": "Archive",
    "history.loading": "Loading...",
    "history.error": "Failed to load",
    "history.retry": "Retry",
    "history.empty": "No sessions",
    "history.nodeCount": "Nodes",
    "history.assetCount": "Assets",
    "history.record": "History",
    "history.noSessions": "No sessions",
    "history.folderHint": "Select a history record to browse its output folders",
    "history.tabImages": "Images",
    "history.tabWeb": "Web",
    "history.tabDocuments": "Documents",
    "history.outputContents": "Outputs",
    "history.noOutputsInFolder": "No outputs in this folder",
    "history.openOutputs": "Open outputs",
    "history.lastEdited": "Last edited",
    "history.textSources": "Text sources",
    "settings.darkMode": "Dark Mode",
    "settings.language": "Language",
    "lang.zh": "中文",
    "lang.en": "English",
    "asset.images": "Images",
    "asset.files": "Files",
    "asset.links": "Links",
    "asset.chat": "Chat",
    "asset.generatedImage": "Generated Image",
    "asset.uploadedFile": "Uploaded File",
    "asset.document": "Document",
    "asset.webLink": "Web Link",
    "detail.fileName": "File name",
    "detail.mimeType": "MIME type",
    "detail.size": "Size",
    "detail.hash": "Hash",
    "detail.created": "Created",
    "detail.preview": "Preview",
    "detail.title": "Title",
    "detail.description": "Description",
    "detail.aiSummary": "AI Summary",
    "detail.you": "You",
    "detail.ai": "AI",
    "detail.selectAsset": "Select an asset from the sidebar to view details.",
    "detail.loadingSession": "Loading session...",
    "detail.assetNotFound": "Asset not found.",
    "share.loading": "Loading shared content...",
    "share.loadFailed": "Failed to load shared content: ",
    "share.retry": "Retry",
    "share.noContent": "This session has no content to display.",
    "share.nodeOverview": "Node Overview",
    "share.assets": "Assets",
    "share.chatRecord": "Chat Record",
    "share.upload": "Upload",
    "share.generated": "Generated",
    "share.me": "Me",
    "share.ai": "AI",
    "share.sharedAt": "Shared at",
    "history.more": "More",
    "settings.lightMode": "Switch to light mode",
    "session.unnamed": "Untitled Session",
    "cabinet.openInCanvas": "Open in Canvas",
    "cabinet.hideHistory": "Hide history",
    "cabinet.showHistory": "Show history",
    "cabinet.closeSidebar": "Close sidebar",
    "cabinet.noSessions": "No sessions"
  }
};

function getDict(lang: Lang) {
  return dictionaries[lang] || dictionaries.zh;
}

interface I18nContextValue {
  lang: Lang;
  t: (key: string, vars?: Record<string, string | number>) => string;
  setLang: (lang: Lang) => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children, initialLang = "zh" }: { children: ReactNode; initialLang?: Lang }) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    document.documentElement.setAttribute("lang", next === "zh" ? "zh-CN" : "en");
    localStorage.setItem("oryzae-lang", next);
  }, []);

  const t = useCallback(
    (key: string, vars: Record<string, string | number> = {}) => {
      const dict = getDict(lang);
      let text = dict[key] || getDict("zh")[key] || key;
      for (const [k, v] of Object.entries(vars)) {
        text = text.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
      }
      return text;
    },
    [lang]
  );

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === "oryzae-lang") {
        const next = e.newValue as Lang;
        if (next === "zh" || next === "en") {
          setLangState(next);
          document.documentElement.setAttribute("lang", next === "zh" ? "zh-CN" : "en");
        }
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return createElement(I18nContext.Provider, { value: { lang, t, setLang } }, children);
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
