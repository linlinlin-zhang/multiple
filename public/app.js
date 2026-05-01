const viewport = document.querySelector("#viewport");
const board = document.querySelector("#board");
const linkLayer = document.querySelector("#linkLayer");
const fileInput = document.querySelector("#fileInput");
const sourcePreview = document.querySelector("#sourcePreview");
const emptyState = document.querySelector("#emptyState");
const sourceName = document.querySelector("#sourceName");
const sourceNode = document.querySelector("#sourceNode");
const analysisNode = document.querySelector("#analysisNode");
const analysisSummary = document.querySelector("#analysisSummary");
const keywordList = document.querySelector("#keywordList");
const researchButton = document.querySelector("#researchButton");
const modeBadge = document.querySelector("#modeBadge");
const statusText = document.querySelector("#statusText");
const statusDot = document.querySelector(".status-dot");
const counts = document.querySelector("#counts");
const optionTemplate = document.querySelector("#optionTemplate");
const chatForm = document.querySelector("#chatForm");
const chatInput = document.querySelector("#chatInput");
const chatMessages = document.querySelector("#chatMessages");
const commandMenu = document.querySelector("#commandMenu");
const chatNewButton = document.querySelector("#chatNewButton");
const chatHistoryButton = document.querySelector("#chatHistoryButton");
const chatCloseButton = document.querySelector("#chatCloseButton");
const chatSidebarToggle = document.querySelector("#chatSidebarToggle");
const chatConversationPanel = document.querySelector("#chatConversationPanel");
const chatConversationList = document.querySelector("#chatConversationList");
const chatGenerateButton = document.querySelector("#chatGenerateButton");
const chatVoiceActions = document.querySelector(".chat-voice-actions");
const chatAsrButton = document.querySelector("#chatAsrButton");
const chatRealtimeButton = document.querySelector("#chatRealtimeButton");
const chatAsrReview = document.querySelector("#chatAsrReview");
const chatAsrRejectButton = document.querySelector("#chatAsrRejectButton");
const chatAsrAcceptButton = document.querySelector("#chatAsrAcceptButton");
const navToggle = document.querySelector("#navToggle");
const urlInput = document.querySelector("#urlInput");
const urlAnalyzeButton = document.querySelector("#urlAnalyzeButton");

const settingsPanel = document.querySelector("#settingsPanel");
const settingsBtn = document.querySelector("#settingsBtn");
const closeSettingsPanel = document.querySelector("#closeSettingsPanel");
const settingsForm = document.querySelector("#settingsForm");
const settingsResetBtn = document.querySelector("#settingsResetBtn");
const settingsTabs = document.querySelectorAll(".settings-tab");
const settingsEndpoint = document.querySelector("#settingsEndpoint");
const settingsModel = document.querySelector("#settingsModel");
const settingsApiKey = document.querySelector("#settingsApiKey");
const settingsTemperature = document.querySelector("#settingsTemperature");

const imageViewerModal = document.querySelector("#imageViewerModal");
const viewerImage = document.querySelector("#viewerImage");
const viewerTitle = document.querySelector("#viewerTitle");
const viewerExplanation = document.querySelector("#viewerExplanation");

const viewerRegenerate = document.querySelector("#viewerRegenerate");
const viewerModify = document.querySelector("#viewerModify");
const viewerDownload = document.querySelector("#viewerDownload");
const imageShareButton = document.querySelector("#imageShareButton");
const viewerModifyPanel = document.querySelector("#viewerModifyPanel");
const viewerPromptInput = document.querySelector("#viewerPromptInput");
const viewerSubmitModify = document.querySelector("#viewerSubmitModify");
const viewerCancelModify = document.querySelector("#viewerCancelModify");

const referenceModal = document.querySelector("#referenceModal");
const referenceList = document.querySelector(".reference-list");

const state = {
  sourceImage: null,
  sourceImageHash: null,
  sourceType: "image",         // "image" | "text" | "url"
  sourceText: null,            // for txt/md/json
  sourceDataUrl: null,         // for docx/pdf/pptx
  sourceUrl: null,             // for url sources
  fileName: "",
  latestAnalysis: null,
  chatMessages: [],
  chatThreads: [],
  activeChatThreadId: null,
  nodes: new Map(),
  links: [],
  collapsed: new Set(),        // full collapse (double-click)
  selectiveHidden: new Set(),  // selective hide (single-click / auto-collapse)
  generatedCount: 0,
  selectedNodeId: null,
  thinkingMode: "no-thinking",
  view: {
    x: 0,
    y: 0,
    scale: 0.86
  }
};

const settingsCache = {
  currentRole: "analysis",
  analysis: { endpoint: "", model: "", apiKey: "", temperature: 0.7 },
  chat: { endpoint: "", model: "", apiKey: "", temperature: 0.7 },
  image: { endpoint: "", model: "", apiKey: "", temperature: 0.7 },
  asr: { endpoint: "", model: "", apiKey: "", temperature: 0 },
  realtime: { endpoint: "", model: "", apiKey: "", temperature: 0.7 }
};

const voiceState = {
  asrSessionId: 0,
  asrRecorder: null,
  asrStream: null,
  asrBaseText: "",
  asrTranscript: "",
  asrBusy: false,
  realtimeSessionId: 0,
  realtimeRecorder: null,
  realtimeStream: null,
  realtimeBusy: false
};

let currentSessionId = null;
let autoSaveTimer = null;
let lastSavedStateHash = "";
let currentViewerNodeId = null;
let activeCommandIndex = 0;
let currentHealthMode = "checking";

const optionPositions = [
  { x: 850, y: 112, tilt: -1.5 },
  { x: 1300, y: 232, tilt: 1.2 },
  { x: 700, y: 792, tilt: 1.4 },
  { x: 1135, y: 835, tilt: -0.8 },
  { x: 1600, y: 612, tilt: 1.8 },
  { x: 1520, y: 1032, tilt: -1.1 }
];

const i18n = {
  zh: {
    "nav.workbench": "工作界面",
    "nav.history": "历史浏览器",
    "nav.home": "主页",
    "nav.sessions": "历史会话",
    "nav.settings": "设置",
    "command.menu": "工作台命令",
    "command.hint": "输入 / 选择工作台工具",
    "command.save": "保存会话",
    "command.saveDesc": "把当前画布保存到历史记录",
    "command.export": "导出会话",
    "command.exportDesc": "下载当前会话 JSON",
    "command.import": "导入会话",
    "command.importDesc": "从 JSON 文件恢复会话",
    "command.sessions": "历史会话",
    "command.sessionsDesc": "打开工作台内的会话列表",
    "command.fit": "重置视图",
    "command.fitDesc": "让画布回到初始视角",
    "command.zoomIn": "放大",
    "command.zoomInDesc": "放大当前画布",
    "command.zoomOut": "缩小",
    "command.zoomOutDesc": "缩小当前画布",
    "command.arrange": "一键整理",
    "command.arrangeDesc": "自动整理当前画布节点",
    "command.history": "历史浏览器",
    "command.historyDesc": "打开完整历史记录页面",
    "command.settings": "设置",
    "command.settingsDesc": "打开全局设置和 API 设置",
    "settings.title": "API 设置",
    "settings.analysis": "分析",
    "settings.chat": "对话",
    "settings.image": "成图",
    "settings.asr": "语音输入",
    "settings.realtime": "实时语音",
    "settings.endpoint": "API Endpoint",
    "settings.model": "Model",
    "settings.apiKey": "API Key",
    "settings.temperature": "Temperature",
    "settings.save": "保存",
    "settings.reset": "重置",
    "settings.darkMode": "深色模式",
    "settings.language": "语言",
    "source.uploadPrompt": "上传图片或文档",
    "source.uploadHint": "选择图片、Word、PDF、PPT 或 TXT，生成分支方向",
    "source.analyze": "分析",
    "research.button": "研究",
    "research.analyze": "分析",
    "research.explore": "探索",
    "research.analyzeTooltip": "调用 no-thinking 模式，快速视觉分析",
    "research.exploreTooltip": "调用 thinking 模式，深入分析并搜集相关资料",
    "research.cannotResearch": "该卡片无法进行研究",
    "research.exploring": "探索中...",
    "research.exploreComplete": "探索完成",
    "source.urlPlaceholder": "https://...",
    "source.analyzeUrl": "分析链接",
    "chat.placeholder": "输入方向、约束，或 / 命令",
    "chat.panelTitle": "对话",
    "chat.newConversation": "新建对话",
    "chat.historyConversations": "历史对话",
    "chat.conversationListEmpty": "暂无历史对话",
    "chat.conversationUntitled": "新对话 {index}",
    "chat.conversationMessages": "{count} 条消息",
    "chat.closePanel": "关闭对话区域",
    "chat.openPanel": "打开对话区域",
    "chat.placeholderWithSelection": "对 {title} 继续探索…",
    "chat.placeholderWithCard": "与 '{title}' 对话...",
    "chat.contextIndicator": "对话上下文：{title}",
    "chat.noMessages": "还没有对话。输入方向、约束，或按 / 选择工作台命令。",
    "chat.roleUser": "You",
    "chat.roleAssistant": "AI",
    "chat.selectCardFirst": "请先双击选中一张卡片",
    "chat.send": "发送",
    "chat.generate": "生成",
    "voice.asr": "语音转文字",
    "voice.asrListening": "正在听写...",
    "voice.asrTranscribing": "正在转写...",
    "voice.asrAccept": "保留转写",
    "voice.asrReject": "删除转写",
    "voice.realtime": "实时语音控制",
    "voice.realtimeStop": "结束实时语音控制",
    "voice.realtimeListening": "实时语音控制中...",
    "voice.unsupported": "当前浏览器不支持录音。",
    "voice.permissionDenied": "无法访问麦克风，请检查浏览器权限。",
    "voice.asrNotConfigured": "ASR API 未配置。",
    "voice.realtimeNotConfigured": "实时语音 API 未配置。",
    "chat.emptyPrompt": "请输入方向描述",
    "chat.attach": "上传图片或文本文件",
    "chat.generatedCannotGenerate": "生成图节点无法继续生成方向",
    "thinking.mode": "思考模式",
    "thinking.thinking": "思考",
    "thinking.fast": "快速",
    "status.ready": "Ready",
    "status.busy": "Busy",
    "status.saved": "已保存",
    "status.saving": "保存中...",
    "status.error": "保存失败",
    "counts.label": "方向 {options} / 成图 {generated}",
    "option.generate": "生成这张图",
    "analysis.title": "图像理解",
    "analysis.eyebrow": "MODEL READ",
    "analysis.titleImage": "图像理解",
    "analysis.titleText": "文档理解",
    "analysis.titleUrl": "链接理解",
    "analysis.eyebrowImage": "IMAGE READ",
    "analysis.eyebrowText": "DOCUMENT READ",
    "analysis.eyebrowUrl": "LINK READ",
    "analysis.defaultSummary": "已完成内容理解。",
    "session.panelTitle": "历史会话",
    "session.close": "关闭",
    "session.export": "导出会话",
    "session.import": "导入会话",
    "session.save": "保存会话",
    "session.fit": "重置视图",
    "session.zoomOut": "缩小",
    "session.zoomIn": "放大",
    "session.arrange": "一键整理",
    "health.checking": "checking",
    "health.demo": "demo",
    "health.api": "api",
    "health.mixed": "mixed",
    "chat.systemContext": "你是这个画布式图片生成应用里的创意对话助手。你的任务是帮助用户理解当前图片、比较分支方向、提出新的生成建议，或把用户的想法整理成可执行的视觉方向。回答用中文，保持简洁，通常 1-3 句。不要假装已经生成了新图片；如果用户想生成，请建议他点击方向节点或说明你会如何改提示词。",
    "chat.systemRole": "你是 Kimi K2.6 no thinking 模式下的创意对话助手。回答简洁、直接、可执行。",
    "chat.selectedCardContext": "当前用户正在与画布上的以下卡片对话：\n类型：{type}\n标题：{title}\n内容摘要：{summary}",
    "chat.selectedCardPrompt": "提示词：{prompt}",
    "analysis.systemPrompt": "你是一个视觉创意导演，正在为一个画布式图片生成应用分析用户上传的图片。请快速理解图片内容、主体、氛围、可延展的叙事方向，并给出 5 个不同的成图方向。这些方向会作为画布上的分支节点展示，用户点击后会调用成图模型。请只返回严格 JSON，不要 Markdown，不要代码块。",
    "generate.systemPrompt": "请基于参考图生成一张新图，保留原图最重要的主体、颜色关系或视觉记忆点，但不要只是复制。成图方向：{title}\n\n方向说明：{description}\n\n详细提示词：{prompt}\n\n输出应是一张完整、可独立展示的图片；构图清晰；不要添加水印、UI 截图边框或说明文字。",
    "explain.systemContext": "你是一位视觉创意评论助手，正在为画布式图片生成应用中的每张生成图撰写简短的内容讲解。用户会看到：原图分析摘要、选中的创作方向、以及实际发给成图模型的提示词。你的任务是用 1-2 句话（30-60 字）描述这张生成图在视觉上做了什么、保留了什么、改变了什么。语气专业、简洁、有画面感。不要重复提示词原文，要提炼成观众能感知的视觉描述。",
    "explain.systemRole": "你是 Kimi K2.6 no thinking 模式下的视觉创意评论助手。讲解要短、有画面感、不提技术细节。",
    "generated.download": "下载",
    "generated.regenerate": "重生成",
    "generated.result": "生成结果",
    "viewer.title": "图片详情",
    "viewer.close": "关闭",
    "viewer.regenerate": "重生成",
    "viewer.modify": "修改",
    "viewer.download": "下载",
    "viewer.confirmModify": "确认修改",
    "viewer.cancelModify": "取消",
    "viewer.promptPlaceholder": "输入自定义提示词...",
    "viewer.share": "分享",
    "viewer.shareInProgress": "生成分享链接中...",
    "viewer.shareCopied": "分享链接已复制到剪贴板",
    "viewer.shareFailed": "分享链接生成失败",
    "collapse.expand": "展开 {count} 个后续节点",
    "collapse.collapse": "收起 {count} 个后续节点",
    "collapse.noChildren": "没有后续节点",
    "save.auto": "自动保存中...",
    "save.inProgress": "保存中...",
    "save.failed": "保存失败",
    "save.savedAt": "已保存 {time}",
    "save.alertFirst": "请先保存会话后再导出。",
    "save.exportFailed": "导出失败：",
    "save.importFailed": "导入失败：",
    "file.unsupported": "暂不支持该文件类型，请上传图片或文本文件。",
    "file.readError": "文件读取失败：",
    "image.error": "图片读取失败",
    "image.chooseFile": "请选择图片文件",
    "session.unnamed": "未命名会话",
    "session.exploration": "的探索",
    "node.delete": "删除",
    "node.cannotDeleteSource": "初始卡片不可删除",
    "node.cannotDeleteWithChildren": "该卡片有子节点，不可删除",
    "reference.title": "参考资料",
    "reference.empty": "暂无参考资料"
  },
  en: {
    "nav.workbench": "Workbench",
    "nav.history": "History",
    "nav.home": "Home",
    "nav.sessions": "Sessions",
    "nav.settings": "Settings",
    "command.menu": "Workbench commands",
    "command.hint": "Type / to choose a workbench tool",
    "command.save": "Save session",
    "command.saveDesc": "Save this canvas to history",
    "command.export": "Export session",
    "command.exportDesc": "Download the current session JSON",
    "command.import": "Import session",
    "command.importDesc": "Restore a session from JSON",
    "command.sessions": "Sessions",
    "command.sessionsDesc": "Open the in-workbench session list",
    "command.fit": "Reset view",
    "command.fitDesc": "Return the canvas to the default view",
    "command.zoomIn": "Zoom in",
    "command.zoomInDesc": "Zoom into the canvas",
    "command.zoomOut": "Zoom out",
    "command.zoomOutDesc": "Zoom out of the canvas",
    "command.arrange": "Arrange canvas",
    "command.arrangeDesc": "Automatically tidy current canvas nodes",
    "command.history": "History browser",
    "command.historyDesc": "Open the full history page",
    "command.settings": "Settings",
    "command.settingsDesc": "Open global and API settings",
    "settings.title": "API Settings",
    "settings.analysis": "Analysis",
    "settings.chat": "Chat",
    "settings.image": "Image",
    "settings.asr": "Voice Input",
    "settings.realtime": "Realtime Voice",
    "settings.endpoint": "API Endpoint",
    "settings.model": "Model",
    "settings.apiKey": "API Key",
    "settings.temperature": "Temperature",
    "settings.save": "Save",
    "settings.reset": "Reset",
    "settings.darkMode": "Dark Mode",
    "settings.language": "Language",
    "source.uploadPrompt": "Upload image or document",
    "source.uploadHint": "Select image, Word, PDF, PPT or TXT to generate branches",
    "source.analyze": "Analyze",
    "research.button": "Research",
    "research.analyze": "Analyze",
    "research.explore": "Explore",
    "research.analyzeTooltip": "Call no-thinking mode for quick visual analysis",
    "research.exploreTooltip": "Call thinking mode for deep analysis and research",
    "research.cannotResearch": "This card cannot be researched",
    "research.exploring": "Exploring...",
    "research.exploreComplete": "Explore complete",
    "source.urlPlaceholder": "https://...",
    "source.analyzeUrl": "Analyze Link",
    "chat.placeholder": "Direction, constraint, or / command",
    "chat.panelTitle": "Chat",
    "chat.newConversation": "New chat",
    "chat.historyConversations": "Chat history",
    "chat.conversationListEmpty": "No chat history",
    "chat.conversationUntitled": "New chat {index}",
    "chat.conversationMessages": "{count} messages",
    "chat.closePanel": "Close chat panel",
    "chat.openPanel": "Open chat panel",
    "chat.placeholderWithSelection": "Explore {title}…",
    "chat.placeholderWithCard": "Chat with '{title}'...",
    "chat.contextIndicator": "Context: {title}",
    "chat.noMessages": "No messages yet. Enter a direction, constraint, or press / for workbench commands.",
    "chat.roleUser": "You",
    "chat.roleAssistant": "AI",
    "chat.selectCardFirst": "Please double-click a card to select it first",
    "chat.send": "Send",
    "chat.generate": "Generate",
    "voice.asr": "Speech to text",
    "voice.asrListening": "Listening...",
    "voice.asrTranscribing": "Transcribing...",
    "voice.asrAccept": "Keep transcript",
    "voice.asrReject": "Delete transcript",
    "voice.realtime": "Realtime voice control",
    "voice.realtimeStop": "Stop realtime voice control",
    "voice.realtimeListening": "Realtime voice control active...",
    "voice.unsupported": "This browser does not support recording.",
    "voice.permissionDenied": "Could not access the microphone. Check browser permissions.",
    "voice.asrNotConfigured": "ASR API is not configured.",
    "voice.realtimeNotConfigured": "Realtime voice API is not configured.",
    "chat.emptyPrompt": "Please enter a direction description",
    "chat.attach": "Upload image or text file",
    "chat.generatedCannotGenerate": "Generated image nodes cannot spawn new directions",
    "thinking.mode": "Thinking Mode",
    "thinking.thinking": "Thinking",
    "thinking.fast": "Fast",
    "status.ready": "Ready",
    "status.busy": "Busy",
    "status.saved": "Saved",
    "status.saving": "Saving...",
    "status.error": "Save failed",
    "counts.label": "Options {options} / Generated {generated}",
    "option.generate": "Generate this image",
    "analysis.title": "Image Understanding",
    "analysis.eyebrow": "MODEL READ",
    "analysis.titleImage": "Image Understanding",
    "analysis.titleText": "Document Understanding",
    "analysis.titleUrl": "Link Understanding",
    "analysis.eyebrowImage": "IMAGE READ",
    "analysis.eyebrowText": "DOCUMENT READ",
    "analysis.eyebrowUrl": "LINK READ",
    "analysis.defaultSummary": "Content understanding completed.",
    "session.panelTitle": "Sessions",
    "session.close": "Close",
    "session.export": "Export",
    "session.import": "Import",
    "session.save": "Save",
    "session.fit": "Reset View",
    "session.zoomOut": "Zoom Out",
    "session.zoomIn": "Zoom In",
    "session.arrange": "Arrange Canvas",
    "health.checking": "checking",
    "health.demo": "demo",
    "health.api": "api",
    "health.mixed": "mixed",
    "chat.systemContext": "You are the creative dialogue assistant in this canvas-based image generation app. Your task is to help users understand the current image, compare branch directions, propose new generation ideas, or organize user thoughts into executable visual directions. Answer in English, keep it concise, usually 1-3 sentences. Do not pretend to have generated a new image; if the user wants to generate, suggest clicking a direction node or explain how you would modify the prompt.",
    "chat.systemRole": "You are the Kimi K2.6 no-thinking creative dialogue assistant. Answers are concise, direct, and actionable.",
    "chat.selectedCardContext": "The user is currently chatting about the following card on the canvas:\nType: {type}\nTitle: {title}\nSummary: {summary}",
    "chat.selectedCardPrompt": "Prompt: {prompt}",
    "analysis.systemPrompt": "You are a visual creative director analyzing user-uploaded images for a canvas-based image generation app. Quickly understand the image content, subjects, atmosphere, and extensible narrative directions, then provide 5 different image generation directions. These directions will be displayed as branch nodes on the canvas; users click them to invoke the image generation model. Return strict JSON only, no Markdown, no code blocks.",
    "generate.systemPrompt": "Generate a new image based on the reference image, preserving the most important subjects, color relationships, or visual memory points, but do not simply copy. Direction: {title}\n\nDescription: {description}\n\nDetailed prompt: {prompt}\n\nOutput should be a complete, standalone image; clear composition; no watermarks, UI screenshot borders, or explanatory text.",
    "explain.systemContext": "You are a visual creative commentary assistant writing short descriptions for each generated image in a canvas-based image generation app. The user sees: original image analysis summary, selected creative direction, and the actual prompt sent to the image generation model. Your task is to describe in 1-2 sentences (30-60 words) what this generated image did visually, what it preserved, and what it changed. Tone: professional, concise, evocative. Do not repeat the prompt verbatim; distill it into a description the viewer can perceive.",
    "explain.systemRole": "You are the Kimi K2.6 no-thinking visual creative commentary assistant. Descriptions are short, evocative, and avoid technical details.",
    "generated.download": "Download",
    "generated.regenerate": "Regenerate",
    "generated.result": "Generated Result",
    "viewer.title": "Image Details",
    "viewer.close": "Close",
    "viewer.regenerate": "Regenerate",
    "viewer.modify": "Modify",
    "viewer.download": "Download",
    "viewer.confirmModify": "Confirm",
    "viewer.cancelModify": "Cancel",
    "viewer.promptPlaceholder": "Enter custom prompt...",
    "viewer.share": "Share",
    "viewer.shareInProgress": "Generating share link...",
    "viewer.shareCopied": "Share link copied to clipboard",
    "viewer.shareFailed": "Failed to generate share link",
    "collapse.expand": "Expand {count} downstream nodes",
    "collapse.collapse": "Collapse {count} downstream nodes",
    "collapse.noChildren": "No downstream nodes",
    "save.auto": "Auto-saving...",
    "save.inProgress": "Saving...",
    "save.failed": "Save failed",
    "save.savedAt": "Saved {time}",
    "save.alertFirst": "Please save the session before exporting.",
    "save.exportFailed": "Export failed: ",
    "save.importFailed": "Import failed: ",
    "file.unsupported": "Unsupported file type. Please upload an image or text file.",
    "file.readError": "File read failed: ",
    "image.error": "Image read failed",
    "image.chooseFile": "Please select an image file",
    "session.unnamed": "Untitled Session",
    "session.exploration": " Exploration",
    "node.delete": "Delete",
    "node.cannotDeleteSource": "Source card cannot be deleted",
    "node.cannotDeleteWithChildren": "Cannot delete a card with children",
    "reference.title": "References",
    "reference.empty": "No references available"
  }
};

let currentLang = "zh";

function t(key, vars = {}) {
  const dict = i18n[currentLang] || i18n.zh;
  let text = dict[key] || i18n.zh[key] || key;
  for (const [k, v] of Object.entries(vars)) {
    text = text.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
  }
  return text;
}

function setLanguage(lang) {
  if (lang !== "zh" && lang !== "en") return;
  currentLang = lang;
  document.documentElement.setAttribute("lang", lang === "zh" ? "zh-CN" : "en");
  localStorage.setItem("oryzae-lang", lang);
  renderAllText();
}

async function loadLanguage() {
  try {
    const res = await fetch("/api/settings");
    const data = await res.json();
    if (data.language === "zh" || data.language === "en") {
      setLanguage(data.language);
    }
  } catch (e) {
    console.error("Failed to load language", e);
  }
}

async function saveLanguage(lang) {
  setLanguage(lang);
  try {
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: lang })
    });
  } catch (e) {
    console.error("Failed to save language", e);
  }
}

function renderAllText() {
  const navLabels = {
    "nav.workbench": ".nav-link[href='/'] .nav-label",
    "nav.history": ".nav-link[href='/history/'] .nav-label",
    "nav.home": ".nav-link[href='/home.html'] .nav-label",
    "nav.settings": ".nav-link[href='/history/?view=settings'] .nav-label"
  };
  for (const [key, selector] of Object.entries(navLabels)) {
    const el = document.querySelector(selector);
    if (el) el.textContent = t(key);
  }

  const emptyStateStrong = document.querySelector("#emptyState strong");
  if (emptyStateStrong) emptyStateStrong.textContent = t("source.uploadPrompt");
  const emptyStateSpan = document.querySelector("#emptyState span");
  if (emptyStateSpan) emptyStateSpan.textContent = t("source.uploadHint");
  const researchBtn = document.querySelector("#researchButton");
  if (researchBtn) researchBtn.textContent = t("research.button");

  document.querySelectorAll(".research-option").forEach((opt) => {
    const label = opt.querySelector(".option-label");
    const tooltip = opt.querySelector(".option-tooltip");
    const mode = opt.dataset.mode;
    if (label && mode === "analyze") label.textContent = t("research.analyze");
    if (label && mode === "explore") label.textContent = t("research.explore");
    if (tooltip && mode === "analyze") tooltip.textContent = t("research.analyzeTooltip");
    if (tooltip && mode === "explore") tooltip.textContent = t("research.exploreTooltip");
  });
  const urlIn = document.querySelector("#urlInput");
  if (urlIn) urlIn.placeholder = t("source.urlPlaceholder");
  const urlAnalyzeBtn = document.querySelector("#urlAnalyzeButton");
  if (urlAnalyzeBtn) urlAnalyzeBtn.textContent = t("source.analyzeUrl");

  const chatIn = document.querySelector("#chatInput");
  if (chatIn) {
    const hasSelection = state.selectedNodeId !== null;
    if (hasSelection) {
      const node = state.nodes.get(state.selectedNodeId);
      const title = node?.option?.title || node?.id || "";
      chatIn.placeholder = t("chat.placeholderWithCard", { title: title.slice(0, 20) });
    } else {
      chatIn.placeholder = t("chat.placeholder");
    }
  }
  if (chatNewButton) {
    chatNewButton.title = t("chat.newConversation");
    chatNewButton.setAttribute("aria-label", t("chat.newConversation"));
  }
  if (chatHistoryButton) {
    chatHistoryButton.title = t("chat.historyConversations");
    chatHistoryButton.setAttribute("aria-label", t("chat.historyConversations"));
  }
  if (chatCloseButton) {
    chatCloseButton.title = t("chat.closePanel");
    chatCloseButton.setAttribute("aria-label", t("chat.closePanel"));
  }
  if (chatSidebarToggle) {
    chatSidebarToggle.title = t("chat.openPanel");
    chatSidebarToggle.setAttribute("aria-label", t("chat.openPanel"));
  }
  const chatGenerate = document.querySelector("#chatGenerateButton");
  if (chatGenerate) chatGenerate.textContent = t("chat.generate");
  const chatAttach = document.querySelector("#chatAttachButton");
  if (chatAttach) {
    chatAttach.title = t("chat.attach");
    chatAttach.setAttribute("aria-label", t("chat.attach"));
  }
  const asrBtn = document.querySelector("#chatAsrButton");
  if (asrBtn) {
    asrBtn.title = t("voice.asr");
    asrBtn.setAttribute("aria-label", t("voice.asr"));
  }
  const realtimeBtn = document.querySelector("#chatRealtimeButton");
  if (realtimeBtn) {
    updateChatPrimaryButtonMode();
  }
  const asrRejectBtn = document.querySelector("#chatAsrRejectButton");
  if (asrRejectBtn) {
    asrRejectBtn.title = t("voice.asrReject");
    asrRejectBtn.setAttribute("aria-label", t("voice.asrReject"));
  }
  const asrAcceptBtn = document.querySelector("#chatAsrAcceptButton");
  if (asrAcceptBtn) {
    asrAcceptBtn.title = t("voice.asrAccept");
    asrAcceptBtn.setAttribute("aria-label", t("voice.asrAccept"));
  }

  const settingsPanelTitle = document.querySelector(".settings-panel-header span");
  if (settingsPanelTitle) settingsPanelTitle.textContent = t("settings.title");
  const settingsTabEls = document.querySelectorAll(".settings-tab");
  settingsTabEls.forEach(tab => {
    const role = tab.dataset.role;
    if (role === "analysis") tab.textContent = t("settings.analysis");
    if (role === "chat") tab.textContent = t("settings.chat");
    if (role === "image") tab.textContent = t("settings.image");
    if (role === "asr") tab.textContent = t("settings.asr");
    if (role === "realtime") tab.textContent = t("settings.realtime");
  });
  const settingsLabels = document.querySelectorAll(".settings-form label span");
  if (settingsLabels[0]) settingsLabels[0].textContent = t("settings.endpoint");
  if (settingsLabels[1]) settingsLabels[1].textContent = t("settings.model");
  if (settingsLabels[2]) settingsLabels[2].textContent = t("settings.apiKey");
  if (settingsLabels[3]) settingsLabels[3].textContent = t("settings.temperature");
  const saveBtn = document.querySelector("#settingsForm .primary-button");
  if (saveBtn) saveBtn.textContent = t("settings.save");
  const resetBtn = document.querySelector("#settingsResetBtn");
  if (resetBtn) resetBtn.textContent = t("settings.reset");
  const darkModeLabel = document.querySelector(".settings-toggle-row span");
  if (darkModeLabel) darkModeLabel.textContent = t("settings.darkMode");
  const langLabel = document.querySelector(".settings-language-row span");
  if (langLabel) langLabel.textContent = t("settings.language");
  renderCommandMenu();

  const sessionPanelHeader = document.querySelector(".session-panel-header span");
  if (sessionPanelHeader) sessionPanelHeader.textContent = t("session.panelTitle");
  const closeSessionPanel = document.querySelector("#closeSessionPanel");
  if (closeSessionPanel) closeSessionPanel.setAttribute("aria-label", t("session.close"));

  const btnTitles = {
    "session.export": "#exportBtn",
    "session.import": "#importBtn",
    "session.save": "#saveButton",
    "session.fit": "#fitButton",
    "session.zoomOut": "#zoomOutButton",
    "session.zoomIn": "#zoomInButton",
    "session.arrange": "#arrangeButton"
  };
  for (const [key, selector] of Object.entries(btnTitles)) {
    const el = document.querySelector(selector);
    if (el) el.title = t(key);
  }

  const analysisEyebrow = document.querySelector("#analysisNode .eyebrow");
  if (analysisEyebrow) analysisEyebrow.textContent = t("analysis.eyebrow");
  const analysisTitle = document.querySelector("#analysisNode h2");
  if (analysisTitle && !analysisTitle.querySelector(".node-title-input")) {
    // only update if not currently editing
    const titles = { image: t("analysis.titleImage"), text: t("analysis.titleText"), url: t("analysis.titleUrl") };
    analysisTitle.textContent = titles[state.sourceType] || t("analysis.title");
  }

  if (imageViewerModal) imageViewerModal.setAttribute("aria-label", t("viewer.title"));
  const closeImageViewerBtn = document.querySelector("#closeImageViewer");
  if (closeImageViewerBtn) closeImageViewerBtn.setAttribute("aria-label", t("viewer.close"));

  if (viewerRegenerate) viewerRegenerate.textContent = t("viewer.regenerate");
  if (viewerModify) viewerModify.textContent = t("viewer.modify");
  if (viewerDownload) viewerDownload.textContent = t("viewer.download");
  if (imageShareButton) imageShareButton.setAttribute("title", t("viewer.share"));
  if (viewerSubmitModify) viewerSubmitModify.textContent = t("viewer.confirmModify");
  if (viewerCancelModify) viewerCancelModify.textContent = t("viewer.cancelModify");
  if (viewerPromptInput) viewerPromptInput.placeholder = t("viewer.promptPlaceholder");

  const optionTmpl = document.querySelector("#optionTemplate");
  if (optionTmpl) {
    const genBtn = optionTmpl.content.querySelector(".generate-button");
    if (genBtn) genBtn.textContent = t("option.generate");
  }

  updateStatusText();
  updateCounts();
  updateCollapseControls();
  updateThinkingToggleUI();
  renderChatContextIndicator();
  renderChatMessages();
  renderChatConversationList();
}

function updateStatusText() {
  const statusTextEl = document.querySelector("#statusText");
  if (!statusTextEl) return;
  const current = statusTextEl.textContent;
  const keyMap = {
    "Ready": "status.ready",
    "Busy": "status.busy",
    "Saved": "status.saved",
    "Saving...": "status.saving",
    "Save failed": "status.error",
    "已保存": "status.saved",
    "保存中...": "status.saving",
    "保存失败": "status.error"
  };
  const key = keyMap[current] || "status.ready";
  statusTextEl.textContent = t(key);
}

init().catch(console.error);

async function init() {
  restoreNavState();
  restoreChatSidebarState();
  registerNode("source", sourceNode, { x: 96, y: 88, width: 318, height: 326 });
  registerNode("analysis", analysisNode, { x: 452, y: 96, width: 318, height: 220 });

  makeDraggable(sourceNode, "source");
  makeDraggable(analysisNode, "analysis");
  wireControls();
  updateBoardTransform();
  checkHealth();
  setStatus("Ready", "ready");
  await loadSettings();
  await loadTheme();
  await loadLanguage();
  loadThinkingMode();
  hydrateChatThreads();
  updateChatPrimaryButtonMode();

  const urlParams = new URLSearchParams(window.location.search);
  const resumeSessionId = urlParams.get("session");
  if (resumeSessionId) {
    try {
      await loadSession(resumeSessionId);
    } catch {
      const url = new URL(window.location.href);
      url.searchParams.delete("session");
      window.history.replaceState({}, "", url);
    }
  }
}

function getWorkbenchCommands() {
  return [
    { id: "save", icon: "S", label: t("command.save"), description: t("command.saveDesc") },
    { id: "export", icon: "E", label: t("command.export"), description: t("command.exportDesc") },
    { id: "import", icon: "I", label: t("command.import"), description: t("command.importDesc") },
    { id: "sessions", icon: "L", label: t("command.sessions"), description: t("command.sessionsDesc") },
    { id: "fit", icon: "F", label: t("command.fit"), description: t("command.fitDesc") },
    { id: "zoom-in", icon: "+", label: t("command.zoomIn"), description: t("command.zoomInDesc") },
    { id: "zoom-out", icon: "-", label: t("command.zoomOut"), description: t("command.zoomOutDesc") },
    { id: "arrange", icon: "A", label: t("command.arrange"), description: t("command.arrangeDesc") },
    { id: "history", icon: "H", label: t("command.history"), description: t("command.historyDesc") },
    { id: "settings", icon: "C", label: t("command.settings"), description: t("command.settingsDesc") }
  ];
}

function getFilteredCommands() {
  const query = (chatInput?.value || "").trim().replace(/^\//, "").toLowerCase();
  const commands = getWorkbenchCommands();
  if (!query) return commands;
  return commands.filter((command) => `${command.label} ${command.description} ${command.id}`.toLowerCase().includes(query));
}

function renderCommandMenu() {
  if (!commandMenu) return;
  const commands = getFilteredCommands();
  commandMenu.innerHTML = "";
  if (!commands.length) {
    const empty = document.createElement("div");
    empty.className = "command-empty";
    empty.textContent = t("command.hint");
    commandMenu.appendChild(empty);
    return;
  }

  activeCommandIndex = Math.min(activeCommandIndex, commands.length - 1);
  commands.forEach((command, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `command-item${index === activeCommandIndex ? " is-active" : ""}`;
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", String(index === activeCommandIndex));

    const icon = document.createElement("span");
    icon.className = "command-icon";
    icon.textContent = command.icon;
    const copy = document.createElement("span");
    copy.className = "command-copy";
    const title = document.createElement("span");
    title.className = "command-title";
    title.textContent = command.label;
    const description = document.createElement("span");
    description.className = "command-description";
    description.textContent = command.description;
    copy.append(title, description);
    button.append(icon, copy);

    button.addEventListener("mouseenter", () => {
      activeCommandIndex = index;
      renderCommandMenu();
    });
    button.addEventListener("click", () => executeWorkbenchCommand(command.id));
    commandMenu.appendChild(button);
  });
}

function openCommandMenu() {
  if (!commandMenu) return;
  activeCommandIndex = 0;
  commandMenu.classList.remove("hidden");
  renderCommandMenu();
}

function closeCommandMenu() {
  commandMenu?.classList.add("hidden");
}

function syncCommandMenu() {
  if (!chatInput || !commandMenu) return;
  if (chatInput.value.trim().startsWith("/")) {
    commandMenu.classList.remove("hidden");
    renderCommandMenu();
  } else {
    closeCommandMenu();
  }
}

function openSessionPanel() {
  const panel = document.querySelector("#sessionPanel");
  if (!panel) return;
  panel.classList.remove("hidden");
  renderSessionList();
}

async function exportCurrentSession() {
  if (!currentSessionId) {
    alert(t("save.alertFirst"));
    return;
  }
  try {
    const res = await fetch(`/api/sessions/${currentSessionId}/export`);
    if (!res.ok) throw new Error(await res.text());
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const disposition = res.headers.get("Content-Disposition") || "";
    const match = /filename="([^"]+)"/.exec(disposition);
    a.download = match ? match[1] : `session_${currentSessionId.slice(0, 8)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    alert(t("save.exportFailed") + (err instanceof Error ? err.message : String(err)));
  }
}

function importSessionFile() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json,application/json";
  input.onchange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Import failed");
      window.location.href = `/?session=${data.sessionId}`;
    } catch (err) {
      alert(t("save.importFailed") + (err instanceof Error ? err.message : String(err)));
    }
  };
  input.click();
}

async function executeWorkbenchCommand(commandId) {
  closeCommandMenu();
  if (chatInput) chatInput.value = "";

  if (commandId === "save") return saveSession();
  if (commandId === "export") return exportCurrentSession();
  if (commandId === "import") return importSessionFile();
  if (commandId === "sessions") return openSessionPanel();
  if (commandId === "fit") return resetView();
  if (commandId === "zoom-in") return zoomBy(0.08);
  if (commandId === "zoom-out") return zoomBy(-0.08);
  if (commandId === "arrange") return arrangeCanvasLayout();
  if (commandId === "history") {
    window.location.href = "/history/";
    return;
  }
  if (commandId === "settings") {
    window.location.href = "/history/?view=settings";
  }
}

function wireControls() {
  fileInput.addEventListener("change", handleFile);
  // Research dropdown wiring
  const researchDropdownWrapper = document.querySelector(".research-dropdown-wrapper");
  if (researchDropdownWrapper) {
    researchDropdownWrapper.addEventListener("mouseenter", () => {
      researchDropdownWrapper.classList.add("is-open");
    });
    researchDropdownWrapper.addEventListener("mouseleave", () => {
      researchDropdownWrapper.classList.remove("is-open");
    });
  }

  document.querySelectorAll(".research-option").forEach((option) => {
    option.addEventListener("click", () => {
      const mode = option.dataset.mode;
      if (mode === "analyze") {
        handleAnalyze("analyze");
      } else if (mode === "explore") {
        handleExplore();
      }
      researchDropdownWrapper?.classList.remove("is-open");
    });
  });
  chatForm.addEventListener("submit", handleChatSubmit);
  chatInput?.addEventListener("keydown", (event) => {
    const commandMenuOpen = commandMenu && !commandMenu.classList.contains("hidden");
    if (commandMenuOpen) {
      const commands = getFilteredCommands();
      if (event.key === "ArrowDown") {
        event.preventDefault();
        activeCommandIndex = (activeCommandIndex + 1) % Math.max(commands.length, 1);
        renderCommandMenu();
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        activeCommandIndex = (activeCommandIndex - 1 + Math.max(commands.length, 1)) % Math.max(commands.length, 1);
        renderCommandMenu();
        return;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        const command = commands[activeCommandIndex];
        if (command) executeWorkbenchCommand(command.id);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        closeCommandMenu();
        return;
      }
    }
    if (event.key === "Enter" && !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      chatForm?.requestSubmit();
      return;
    }
    if (chatInput.disabled && event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      showSelectionToast();
    }
  });
  chatInput?.addEventListener("input", () => {
    syncCommandMenu();
    updateChatPrimaryButtonMode();
  });
  chatInput?.addEventListener("focus", () => {
    if (chatInput.disabled) {
      showSelectionToast();
    } else if (chatInput.value.trim().startsWith("/")) {
      openCommandMenu();
    }
  });
  navToggle?.addEventListener("click", toggleNav);
  chatNewButton?.addEventListener("click", startNewChat);
  chatHistoryButton?.addEventListener("click", toggleChatConversationPanel);
  chatCloseButton?.addEventListener("click", () => setChatSidebarOpen(false));
  chatSidebarToggle?.addEventListener("click", () => {
    setChatSidebarOpen(true);
    chatInput?.focus();
  });

  // Source tabs (file / url)
  document.querySelectorAll(".source-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.tab;
      document.querySelectorAll(".source-tab").forEach(t => t.classList.toggle("active", t === tab));
      document.querySelector(".upload-target").classList.toggle("hidden", target !== "file");
      document.querySelector(".url-input-panel").classList.toggle("hidden", target !== "url");
    });
  });

  // URL input wiring
  urlInput?.addEventListener("input", () => {
    if (urlAnalyzeButton) urlAnalyzeButton.disabled = !urlInput.value.trim();
  });
  urlAnalyzeButton?.addEventListener("click", analyzeUrl);

  document.querySelector("#zoomInButton")?.addEventListener("click", () => zoomBy(0.08));
  document.querySelector("#zoomOutButton")?.addEventListener("click", () => zoomBy(-0.08));
  document.querySelector("#fitButton")?.addEventListener("click", resetView);
  document.querySelector("#saveButton")?.addEventListener("click", () => saveSession());
  document.querySelector("#arrangeButton")?.addEventListener("click", arrangeCanvasLayout);

  document.querySelector("#chatAttachButton")?.addEventListener("click", handleAttachClick);
  chatAsrButton?.addEventListener("click", toggleAsrDictation);
  chatAsrRejectButton?.addEventListener("click", rejectAsrTranscript);
  chatAsrAcceptButton?.addEventListener("click", acceptAsrTranscript);
  chatRealtimeButton?.addEventListener("click", handleChatPrimaryAction);
  document.querySelector("#chatGenerateButton")?.addEventListener("click", (event) => {
    event.preventDefault();
    generateDirectionFromDialog();
  });

  // Thinking mode toggle wiring
  document.querySelectorAll(".thinking-option").forEach((btn) => {
    btn.addEventListener("click", () => {
      setThinkingMode(btn.dataset.mode);
    });
  });

  document.querySelector("#exportBtn")?.addEventListener("click", exportCurrentSession);
  document.querySelector("#importBtn")?.addEventListener("click", importSessionFile);

  document.querySelector("#historyToggle")?.addEventListener("click", () => {
    const panel = document.querySelector("#sessionPanel");
    if (panel) {
      const isHidden = panel.classList.contains("hidden");
      panel.classList.toggle("hidden", !isHidden);
      if (isHidden) renderSessionList();
    }
  });

  document.querySelector("#closeSessionPanel")?.addEventListener("click", () => {
    document.querySelector("#sessionPanel")?.classList.add("hidden");
  });

  // Settings panel wiring
  settingsBtn?.addEventListener("click", () => {
    settingsPanel?.classList.toggle("hidden");
    populateSettingsForm();
  });
  closeSettingsPanel?.addEventListener("click", () => {
    settingsPanel?.classList.add("hidden");
  });
  settingsTabs?.forEach(tab => {
    tab.addEventListener("click", () => {
      settingsTabs.forEach(t => t.classList.toggle("active", t === tab));
      settingsCache.currentRole = tab.dataset.role || "analysis";
      populateSettingsForm();
    });
  });
  settingsForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const role = settingsCache.currentRole;
    const payload = {
      [role]: {
        endpoint: settingsEndpoint?.value?.trim() || "",
        model: settingsModel?.value?.trim() || "",
        apiKey: settingsApiKey?.value?.trim() || "",
        temperature: Number(settingsTemperature?.value ?? 0.7)
      }
    };
    try {
      const data = await putJson("/api/settings", payload);
      if (data[role]) {
        settingsCache[role] = data[role];
      }
      showSaveConfirmation(t("status.saved"));
      checkHealth();
    } catch (err) {
      showSaveConfirmation(t("status.error") + "：" + (err instanceof Error ? err.message : String(err)));
    }
  });
  settingsResetBtn?.addEventListener("click", async () => {
    await loadSettings();
    populateSettingsForm();
    showSaveConfirmation(t("settings.reset"));
  });

  // Theme toggle wiring
  const themeToggle = document.querySelector("#themeToggle");
  if (themeToggle) {
    themeToggle.checked = document.documentElement.getAttribute("data-theme") === "dark";
    themeToggle.addEventListener("change", () => {
      saveTheme(themeToggle.checked ? "dark" : "light");
    });
  }

  // Language toggle wiring
  const languageSelect = document.querySelector("#languageSelect");
  if (languageSelect) {
    languageSelect.value = currentLang;
    languageSelect.addEventListener("change", () => {
      saveLanguage(languageSelect.value);
    });
  }

  // Image viewer modal wiring
  imageViewerModal?.querySelector("[data-close-modal]")?.addEventListener("click", closeImageViewer);
  document.querySelector("#closeImageViewer")?.addEventListener("click", closeImageViewer);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !imageViewerModal?.classList.contains("hidden")) {
      closeImageViewer();
    }
  });

  // Reference modal wiring
  referenceModal?.querySelector(".modal-close")?.addEventListener("click", closeReferenceModal);
  referenceModal?.querySelector(".modal-backdrop")?.addEventListener("click", closeReferenceModal);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && referenceModal?.style.display !== "none") {
      closeReferenceModal();
    }
  });

  viewerRegenerate?.addEventListener("click", () => {
    if (!currentViewerNodeId) return;
    const node = state.nodes.get(currentViewerNodeId);
    if (!node || !node.option) return;
    closeImageViewer();
    generateOption(currentViewerNodeId, node.option);
  });

  viewerModify?.addEventListener("click", () => {
    viewerModifyPanel?.classList.remove("hidden");
    viewerPromptInput?.focus();
  });

  viewerCancelModify?.addEventListener("click", () => {
    viewerModifyPanel?.classList.add("hidden");
  });

  viewerSubmitModify?.addEventListener("click", async () => {
    if (!currentViewerNodeId) return;
    const node = state.nodes.get(currentViewerNodeId);
    if (!node || !node.option) return;
    const customPrompt = viewerPromptInput?.value.trim();
    if (!customPrompt) return;

    const modifiedOption = { ...node.option, prompt: customPrompt };
    closeImageViewer();
    await generateOption(currentViewerNodeId, modifiedOption);
  });

  viewerDownload?.addEventListener("click", async () => {
    if (!currentViewerNodeId) return;
    const node = state.nodes.get(currentViewerNodeId);
    if (!node) return;

    const imageUrl = node.element.querySelector(".generated-image")?.src;
    if (!imageUrl) return;

    if (imageUrl.includes("/api/assets/") && node.imageHash) {
      try {
        const sep = imageUrl.includes("?") ? "&" : "?";
        const res = await fetch(`${imageUrl}${sep}download=1`);
        if (!res.ok) throw new Error("Fetch failed");
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const fileName = `${node.option?.id || "generated"}_${node.imageHash.slice(0, 8)}.png`;
        downloadImage(blobUrl, fileName);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
      } catch (err) {
        console.error("Download failed:", err);
        downloadImage(imageUrl, `${node.option?.id || "generated"}.png`);
      }
    } else {
      downloadImage(imageUrl, `${node.option?.id || "generated"}.png`);
    }
  });

  viewport.addEventListener("click", (event) => {
    if (!settingsPanel?.classList.contains("hidden") && event.target === viewport) {
      settingsPanel.classList.add("hidden");
    }
    if (commandMenu && !commandMenu.contains(event.target) && !chatForm.contains(event.target)) {
      closeCommandMenu();
    }
  });

  viewport.addEventListener("wheel", (event) => {
    event.preventDefault();
    if (event.ctrlKey || event.metaKey) {
      zoomBy(event.deltaY < 0 ? 0.06 : -0.06);
    } else {
      let dx = event.deltaX;
      let dy = event.deltaY;
      if (event.shiftKey && Math.abs(dy) > 0 && dx === 0) {
        dx = dy;
        dy = 0;
      }
      state.view.x -= dx;
      state.view.y -= dy;
      updateBoardTransform();
    }
  }, { passive: false });

  let panStart = null;
  viewport.addEventListener("pointerdown", (event) => {
    if (event.target !== viewport && event.target !== board && event.target !== linkLayer) return;
    panStart = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      viewX: state.view.x,
      viewY: state.view.y
    };
    viewport.classList.add("is-panning");
    viewport.setPointerCapture(event.pointerId);
  });

  viewport.addEventListener("pointermove", (event) => {
    if (!panStart) return;
    state.view.x = panStart.viewX + event.clientX - panStart.x;
    state.view.y = panStart.viewY + event.clientY - panStart.y;
    updateBoardTransform();
  });

  viewport.addEventListener("pointerup", () => {
    panStart = null;
    viewport.classList.remove("is-panning");
  });
}

function restoreNavState() {
  const collapsed = localStorage.getItem("oryzae.navCollapsed") === "true";
  document.body.classList.toggle("nav-collapsed", collapsed);
  navToggle.setAttribute("aria-expanded", String(!collapsed));
  navToggle.setAttribute("aria-label", collapsed ? "Expand navigation" : "Collapse navigation");
}

function toggleNav() {
  const collapsed = !document.body.classList.contains("nav-collapsed");
  document.body.classList.toggle("nav-collapsed", collapsed);
  localStorage.setItem("oryzae.navCollapsed", String(collapsed));
  navToggle.setAttribute("aria-expanded", String(!collapsed));
  navToggle.setAttribute("aria-label", collapsed ? "Expand navigation" : "Collapse navigation");
}

function setChatSidebarOpen(open) {
  document.body.classList.toggle("chat-sidebar-closed", !open);
  chatSidebarToggle?.classList.toggle("hidden", open);
  chatSidebarToggle?.setAttribute("aria-expanded", String(open));
  localStorage.setItem("oryzae.chatSidebarOpen", String(open));
  if (!open) {
    closeCommandMenu();
    chatConversationPanel?.classList.add("hidden");
    chatInput?.blur();
  }
}

function restoreChatSidebarState() {
  const saved = localStorage.getItem("oryzae.chatSidebarOpen");
  setChatSidebarOpen(saved !== "false");
}

function createChatThread(messages = [], title = "") {
  return {
    id: `chat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    title,
    createdAt: new Date().toISOString(),
    messages: messages.map(normalizeChatThreadMessage)
  };
}

function normalizeChatThreadMessage(message) {
  return {
    role: message?.role === "assistant" ? "assistant" : "user",
    content: typeof message?.content === "string" ? message.content : "",
    branchNodeId: message?.branchNodeId ?? null,
    createdAt: message?.createdAt || new Date().toISOString()
  };
}

function normalizeChatThread(thread, index = 0) {
  const fallback = createChatThread([], t("chat.conversationUntitled", { index: index + 1 }));
  if (!thread || typeof thread !== "object") return fallback;
  const messages = Array.isArray(thread.messages) ? thread.messages.map(normalizeChatThreadMessage).filter((m) => m.content) : [];
  return {
    id: typeof thread.id === "string" && thread.id ? thread.id : fallback.id,
    title: typeof thread.title === "string" ? thread.title : "",
    createdAt: thread.createdAt || fallback.createdAt,
    messages
  };
}

function hydrateChatThreads({ threads, activeId, fallbackMessages = [] } = {}) {
  const normalizedThreads = Array.isArray(threads)
    ? threads.map(normalizeChatThread).filter((thread) => thread.messages.length || thread.id)
    : [];
  state.chatThreads = normalizedThreads.length
    ? normalizedThreads
    : [createChatThread(fallbackMessages)];
  state.activeChatThreadId = state.chatThreads.some((thread) => thread.id === activeId)
    ? activeId
    : state.chatThreads[0].id;
  syncActiveChatMessages();
  renderChatConversationList();
}

function ensureActiveChatThread() {
  if (!state.chatThreads.length) {
    state.chatThreads = [createChatThread(state.chatMessages)];
  }
  let thread = state.chatThreads.find((item) => item.id === state.activeChatThreadId);
  if (!thread) {
    thread = state.chatThreads[0];
    state.activeChatThreadId = thread.id;
  }
  state.chatMessages = thread.messages;
  return thread;
}

function syncActiveChatMessages() {
  const thread = ensureActiveChatThread();
  state.chatMessages = thread.messages;
}

function resetChatThreads(messages = []) {
  const thread = createChatThread(messages);
  state.chatThreads = [thread];
  state.activeChatThreadId = thread.id;
  state.chatMessages = thread.messages;
  renderChatConversationList();
}

function updateActiveChatThreadTitle(message) {
  const thread = ensureActiveChatThread();
  if (thread.title || !message) return;
  thread.title = message.length > 26 ? `${message.slice(0, 26)}...` : message;
}

function serializeChatThreads() {
  ensureActiveChatThread();
  return state.chatThreads.map((thread) => ({
    id: thread.id,
    title: thread.title || "",
    createdAt: thread.createdAt || new Date().toISOString(),
    messages: thread.messages.map((message) => ({
      role: message.role,
      content: message.content,
      branchNodeId: message.branchNodeId ?? null,
      createdAt: message.createdAt || null
    }))
  }));
}

function getChatThreadTitle(thread, index) {
  const firstUserMessage = thread.messages.find((message) => message.role === "user" && message.content);
  const title = thread.title || firstUserMessage?.content || t("chat.conversationUntitled", { index: index + 1 });
  return title.length > 28 ? `${title.slice(0, 28)}...` : title;
}

function renderChatConversationList() {
  if (!chatConversationList) return;
  ensureActiveChatThread();
  chatConversationList.replaceChildren();
  if (!state.chatThreads.length) {
    const empty = document.createElement("div");
    empty.className = "chat-conversation-empty";
    empty.textContent = t("chat.conversationListEmpty");
    chatConversationList.appendChild(empty);
    return;
  }

  state.chatThreads.forEach((thread, index) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "chat-conversation-item";
    item.classList.toggle("active", thread.id === state.activeChatThreadId);

    const title = document.createElement("span");
    title.className = "chat-conversation-title";
    title.textContent = getChatThreadTitle(thread, index);

    const meta = document.createElement("span");
    meta.className = "chat-conversation-meta";
    meta.textContent = t("chat.conversationMessages", { count: thread.messages.length });

    item.append(title, meta);
    item.addEventListener("click", () => {
      state.activeChatThreadId = thread.id;
      syncActiveChatMessages();
      chatConversationPanel?.classList.add("hidden");
      renderChatMessages();
      renderChatConversationList();
      autoSave();
      chatInput?.focus();
    });

    chatConversationList.appendChild(item);
  });
}

function toggleChatConversationPanel() {
  if (!chatConversationPanel) return;
  const open = chatConversationPanel.classList.contains("hidden");
  if (open) renderChatConversationList();
  chatConversationPanel.classList.toggle("hidden", !open);
}

function updateChatPrimaryButtonMode() {
  if (!chatRealtimeButton) return;
  const hasText = Boolean(chatInput?.value.trim());
  const active = Boolean(voiceState.realtimeRecorder);
  chatRealtimeButton.classList.toggle("has-text", hasText);
  const label = hasText ? t("chat.send") : active ? t("voice.realtimeStop") : t("voice.realtime");
  chatRealtimeButton.title = label;
  chatRealtimeButton.setAttribute("aria-label", label);
}

function handleChatPrimaryAction() {
  if (chatInput?.value.trim()) {
    chatForm?.requestSubmit();
    return;
  }
  toggleRealtimeVoice();
}

function startNewChat() {
  const currentThread = ensureActiveChatThread();
  if (currentThread.messages.length) {
    const thread = createChatThread();
    state.chatThreads.unshift(thread);
    state.activeChatThreadId = thread.id;
    syncActiveChatMessages();
  } else {
    currentThread.title = "";
    currentThread.messages = [];
    syncActiveChatMessages();
  }
  if (chatInput) chatInput.value = "";
  closeCommandMenu();
  chatConversationPanel?.classList.add("hidden");
  updateChatPrimaryButtonMode();
  renderChatConversationList();
  renderChatMessages();
  autoSave();
  chatInput?.focus();
}

function setThinkingMode(mode) {
  if (mode !== "thinking" && mode !== "no-thinking") return;
  state.thinkingMode = mode;
  localStorage.setItem("oryzae-thinking-mode", mode);
  updateThinkingToggleUI();
}

function loadThinkingMode() {
  const saved = localStorage.getItem("oryzae-thinking-mode");
  if (saved === "thinking" || saved === "no-thinking") {
    state.thinkingMode = saved;
  } else {
    state.thinkingMode = "no-thinking";
  }
  updateThinkingToggleUI();
}

function updateThinkingToggleUI() {
  const toggle = document.querySelector("#thinkingToggle");
  const options = document.querySelectorAll(".thinking-option");
  if (!toggle) return;

  const label = toggle.querySelector(".thinking-label");
  if (label) {
    label.textContent = state.thinkingMode === "thinking" ? t("thinking.thinking") : t("thinking.fast");
  }

  options.forEach((btn) => {
    const isActive = btn.dataset.mode === state.thinkingMode;
    btn.classList.toggle("active", isActive);
  });
}

async function checkHealth() {
  try {
    const health = await getJson("/api/health");
    currentHealthMode = health.mode || "unknown";
    if (modeBadge) {
      modeBadge.textContent = health.mode;
      modeBadge.title = health.mode === "demo" ? "No model API key configured, using demo fallback" : "Connected to configured model API";
    }
  } catch {
    currentHealthMode = "offline";
    if (modeBadge) modeBadge.textContent = "offline";
  }
}

function applyTheme(theme) {
  if (theme !== "light" && theme !== "dark") return;
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("oryzae-theme", theme);
}

async function loadTheme() {
  try {
    const res = await fetch("/api/settings");
    const data = await res.json();
    if (data.theme === "light" || data.theme === "dark") {
      applyTheme(data.theme);
    }
  } catch (e) {
    console.error("Failed to load theme", e);
  }
}

async function saveTheme(theme) {
  applyTheme(theme);
  try {
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme })
    });
  } catch (e) {
    console.error("Failed to save theme", e);
  }
}

async function loadSettings() {
  try {
    const data = await getJson("/api/settings");
    for (const role of ["analysis", "chat", "image", "asr", "realtime"]) {
      if (data[role]) {
        settingsCache[role] = {
          endpoint: data[role].endpoint || "",
          model: data[role].model || "",
          apiKey: data[role].apiKey || "",
          temperature: typeof data[role].temperature === "number" ? data[role].temperature : 0.7
        };
      }
    }
    if (data.theme === "light" || data.theme === "dark") {
      applyTheme(data.theme);
    }
  } catch (err) {
    console.error("Failed to load settings:", err);
  }
}

function populateSettingsForm() {
  const role = settingsCache.currentRole;
  const cfg = settingsCache[role];
  if (!cfg) return;
  if (settingsEndpoint) settingsEndpoint.value = cfg.endpoint || "";
  if (settingsModel) settingsModel.value = cfg.model || "";
  if (settingsApiKey) settingsApiKey.value = cfg.apiKey || "";
  if (settingsTemperature) settingsTemperature.value = String(typeof cfg.temperature === "number" ? cfg.temperature : 0.7);
}

function showSaveConfirmation(text) {
  const actions = document.querySelector(".settings-actions");
  if (!actions) return;
  let el = actions.querySelector(".settings-confirm");
  if (!el) {
    el = document.createElement("span");
    el.className = "settings-confirm";
    el.style.cssText = "font-size:13px;color:var(--ps-blue);align-self:center;";
    actions.appendChild(el);
  }
  el.textContent = text;
  setTimeout(() => {
    if (el) el.textContent = "";
  }, 2000);
}

async function handleFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const isImage = file.type.startsWith("image/");
  const isTextDoc = /\.(txt|md|json|docx|pdf|pptx)$/i.test(file.name);

  if (isImage) {
    setStatus(t("status.busy"), "busy");
    try {
      const image = await resizeImage(file, 1600, 0.88);
      state.sourceImage = image.dataUrl;
      state.sourceType = "image";
      state.sourceText = null;
      state.sourceDataUrl = null;
      state.fileName = file.name;

      sourcePreview.src = image.dataUrl;
      sourcePreview.classList.add("has-image");
      emptyState.classList.add("hidden");
      sourceName.textContent = trimMiddle(file.name, 28);
      if (researchButton) researchButton.disabled = false;

      clearOptions();
      state.latestAnalysis = null;
      resetChatThreads();
      renderChatMessages();
      state.collapsed.clear();
      analysisNode.classList.add("hidden");
      state.links = [];
      applyCollapseState();
      updateCounts();
      setStatus(t("status.ready"), "ready");
      updateSourceBadge();
      autoSave();
    } catch (error) {
      setStatus(error.message || t("status.error"), "error");
    }
    return;
  }

  if (isTextDoc) {
    setStatus(t("status.busy"), "busy");
    try {
      state.fileName = file.name;
      state.sourceType = "text";
      state.sourceImage = null;
      state.sourceImageHash = null;

      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      const isPlainText = ["txt", "md", "json"].includes(ext);

      if (isPlainText) {
        const text = await file.text();
        state.sourceText = text;
        state.sourceDataUrl = null;
      } else {
        const arrayBuffer = await file.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
        const mimeMap = {
          docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          pdf: "application/pdf",
          pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation"
        };
        const mime = mimeMap[ext] || "application/octet-stream";
        state.sourceDataUrl = `data:${mime};base64,${base64}`;
        state.sourceText = null;
      }

      // Show document preview in source node
      sourcePreview.src = "";
      sourcePreview.classList.remove("has-image");
      emptyState.classList.add("hidden");
      sourceName.textContent = trimMiddle(file.name, 28);
      if (researchButton) researchButton.disabled = false;

      clearOptions();
      state.latestAnalysis = null;
      resetChatThreads();
      renderChatMessages();
      state.collapsed.clear();
      analysisNode.classList.add("hidden");
      state.links = [];
      applyCollapseState();
      updateCounts();
      updateSourceBadge();
      setStatus(t("status.ready"), "ready");
      autoSave();
    } catch (error) {
      setStatus(error.message || t("status.error"), "error");
    }
    return;
  }

  setStatus(t("file.unsupported"), "error");
}

function canResearchNode(nodeId) {
  if (!nodeId) return false;
  const node = state.nodes.get(nodeId);
  if (!node) return false;
  // Only source and analysis nodes can be researched
  if (nodeId === "source" || nodeId === "analysis") return true;
  // Option nodes (not yet generated) can be researched
  if (node.option && !node.generated) return true;
  return false;
}

function handleAnalyze(mode = "analyze") {
  // If a node is selected, validate it can be researched
  if (state.selectedNodeId && !canResearchNode(state.selectedNodeId)) {
    showSelectionToast(t("research.cannotResearch"));
    return;
  }
  analyzeSource(mode);
}

function handleExplore() {
  // If a node is selected, validate it can be researched
  if (state.selectedNodeId && !canResearchNode(state.selectedNodeId)) {
    showSelectionToast(t("research.cannotResearch"));
    return;
  }
  exploreSource();
}

async function exploreSource() {
  if (state.sourceType === "image" && !state.sourceImage) return;
  if (state.sourceType === "text" && !state.sourceText && !state.sourceDataUrl) return;
  if (state.sourceType === "url" && !state.sourceUrl) return;

  setStatus(t("research.exploring"), "busy");
  if (researchButton) researchButton.disabled = true;

  try {
    let data;
    if (state.sourceType === "image") {
      const sourceImageDataUrl = await getSourceImageDataUrl();
      data = await postJson("/api/analyze-explore", {
        imageDataUrl: sourceImageDataUrl,
        fileName: state.fileName,
        thinkingMode: "thinking"
      });
    } else if (state.sourceType === "url") {
      data = await postJson("/api/analyze-explore", {
        url: state.sourceUrl,
        thinkingMode: "thinking"
      });
    } else {
      data = await postJson("/api/analyze-explore", {
        text: state.sourceText,
        dataUrl: state.sourceDataUrl,
        fileName: state.fileName,
        thinkingMode: "thinking"
      });
    }

    renderAnalysis(data);
    renderExploreOptions(data.options || [], data.references || []);
    state.latestAnalysis = data;
    setStatus(t("research.exploreComplete"), "ready");
    autoSave();
  } catch (error) {
    setStatus(error.message || "Explore failed", "error");
  } finally {
    if (researchButton) researchButton.disabled = false;
  }
}

async function analyzeSource(mode = "analyze") {
  if (state.sourceType === "image" && !state.sourceImage) return;
  if (state.sourceType === "text" && !state.sourceText && !state.sourceDataUrl) return;
  if (state.sourceType === "url" && !state.sourceUrl) return;

  setStatus(t("status.busy"), "busy");
  if (researchButton) researchButton.disabled = true;

  try {
    let data;
    if (state.sourceType === "image") {
      const sourceImageDataUrl = await getSourceImageDataUrl();
      data = await postJson("/api/analyze", {
        imageDataUrl: sourceImageDataUrl,
        fileName: state.fileName,
        thinkingMode: mode === "explore" ? "thinking" : state.thinkingMode
      });
    } else if (state.sourceType === "url") {
      data = await postJson("/api/analyze-url", { url: state.sourceUrl, thinkingMode: mode === "explore" ? "thinking" : state.thinkingMode });
    } else {
      data = await postJson("/api/analyze-text", {
        text: state.sourceText,
        dataUrl: state.sourceDataUrl,
        fileName: state.fileName,
        thinkingMode: mode === "explore" ? "thinking" : state.thinkingMode
      });
    }

    renderAnalysis(data);
    renderOptions(data.options || []);
    state.latestAnalysis = data;
    setStatus(t("status.ready"), "ready");
    autoSave();
  } catch (error) {
    setStatus(error.message || "Analysis failed", "error");
  } finally {
    if (researchButton) researchButton.disabled = false;
  }
}

async function analyzeUrl() {
  const url = urlInput?.value.trim();
  if (!url) return;
  setStatus(t("status.busy"), "busy");
  if (urlAnalyzeButton) urlAnalyzeButton.disabled = true;

  try {
    const data = await postJson("/api/analyze-url", { url });
    state.sourceType = "url";
    state.sourceUrl = url;
    state.fileName = new URL(url).hostname;
    state.latestAnalysis = data;

    // Render source preview as a link card
    renderUrlSource(url, data.title);
    renderAnalysis(data);
    renderOptions(data.options || []);
    setStatus(t("status.ready"), "ready");
    autoSave();
  } catch (error) {
    setStatus(error.message || "URL analysis failed", "error");
  } finally {
    if (urlAnalyzeButton) urlAnalyzeButton.disabled = false;
  }
}

function renderUrlSource(url, title) {
  sourcePreview.src = "";
  sourcePreview.classList.remove("has-image");
  emptyState.classList.add("hidden");

  // Remove any existing link card
  const existing = document.querySelector(".url-source-card");
  if (existing) existing.remove();

  const linkCard = document.createElement("a");
  linkCard.href = url;
  linkCard.target = "_blank";
  linkCard.rel = "noopener noreferrer";
  linkCard.className = "url-source-card";
  linkCard.textContent = title || url;
  sourcePreview.parentElement.appendChild(linkCard);

  sourceName.textContent = new URL(url).hostname;
  if (researchButton) researchButton.disabled = false;
  updateSourceBadge();
}

function buildSelectedNodeContext() {
  const nodeId = state.selectedNodeId;
  if (!nodeId) return null;
  const node = state.nodes.get(nodeId);
  if (!node) return null;

  let type = "unknown";
  if (nodeId === "source") type = "source";
  else if (nodeId === "analysis") type = "analysis";
  else if (node.generated) type = "generated";
  else if (node.option) type = "option";

  const title = node.option?.title || node.id;
  const summary = node.explanation || node.option?.description || state.latestAnalysis?.summary || "";
  const prompt = node.option?.prompt || "";

  return { type, title, summary, prompt };
}

async function handleChatSubmit(event) {
  event.preventDefault();
  const message = chatInput.value.trim();
  if (!message) return;
  if (message.startsWith("/")) {
    const command = getFilteredCommands()[activeCommandIndex];
    if (command) {
      await executeWorkbenchCommand(command.id);
    }
    return;
  }

  chatInput.value = "";
  updateChatPrimaryButtonMode();
  updateActiveChatThreadTitle(message);
  appendChatMessage("user", message);
  setStatus(t("status.busy"), "busy");
  if (chatRealtimeButton) chatRealtimeButton.disabled = true;

  try {
    const sourceImageDataUrl = await getSourceImageDataUrl();
    const selectedContext = buildSelectedNodeContext();

    let systemContext = t("chat.systemContext");
    if (selectedContext) {
      systemContext += "\n\n" + t("chat.selectedCardContext", {
        type: selectedContext.type,
        title: selectedContext.title,
        summary: selectedContext.summary.slice(0, 200)
      });
      if (selectedContext.prompt) {
        systemContext += "\n" + t("chat.selectedCardPrompt", { prompt: selectedContext.prompt.slice(0, 300) });
      }
    }

    const data = await postJson("/api/chat", {
      message,
      imageDataUrl: sourceImageDataUrl,
      analysis: state.latestAnalysis,
      messages: state.chatMessages.slice(-8),
      systemContext,
      selectedNodeId: state.selectedNodeId,
      thinkingMode: state.thinkingMode
    });
    appendChatMessage("assistant", data.reply || t("chat.systemContext"));
    setStatus(t("status.ready"), "ready");
    autoSave();
  } catch (error) {
    appendChatMessage("assistant", error.message || "对话请求失败。");
    setStatus(t("status.error"), "error");
  } finally {
    if (chatRealtimeButton) chatRealtimeButton.disabled = false;
    updateChatPrimaryButtonMode();
    chatInput.focus();
  }
}

function generateDirectionFromDialog() {
  const promptText = chatInput.value.trim();
  if (!promptText) {
    showSelectionToast(t("chat.emptyPrompt"));
    return;
  }

  const selectedNodeId = state.selectedNodeId;
  if (!selectedNodeId) {
    showSelectionToast(t("chat.selectCardFirst"));
    return;
  }

  const selectedNode = state.nodes.get(selectedNodeId);
  if (!selectedNode) return;

  // Prevent generation from generated nodes
  if (selectedNode.generated) {
    showSelectionToast(t("chat.generatedCannotGenerate"));
    return;
  }

  // Build option object from dialog text
  const option = {
    id: `custom-${Date.now()}`,
    title: promptText,
    description: promptText,
    prompt: promptText,
    tone: "custom",
    layoutHint: "square"
  };

  // Create the option node as child of selected node
  const newNodeId = createOptionNode(option, selectedNodeId);

  // Clear input
  chatInput.value = "";

  // Auto-select the new option node
  if (newNodeId) {
    selectNode(newNodeId);
  }

  // Save session
  autoSave();
}

async function toggleAsrDictation() {
  if (voiceState.asrRecorder) {
    stopAsrRecorder();
    return;
  }
  await startAsrDictation();
}

async function startAsrDictation() {
  if (!canRecordAudio()) return;

  const sessionId = voiceState.asrSessionId + 1;
  voiceState.asrSessionId = sessionId;
  voiceState.asrBaseText = chatInput?.value || "";
  voiceState.asrTranscript = "";
  voiceState.asrBusy = false;

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
    });
    const mimeType = pickAudioMimeType();
    const options = mimeType ? { mimeType } : undefined;
    const recorder = new MediaRecorder(stream, options);

    voiceState.asrStream = stream;
    voiceState.asrRecorder = recorder;
    setAsrReviewMode(true);
    chatInput?.classList.add("has-asr-draft");
    chatAsrButton?.classList.add("is-recording");
    setStatus(t("voice.asrListening"), "busy");

    recorder.addEventListener("dataavailable", (event) => {
      if (event.data?.size) {
        transcribeAsrChunk(event.data, sessionId);
      }
    });
    recorder.addEventListener("stop", () => {
      stopMediaStream(voiceState.asrStream);
      voiceState.asrStream = null;
      voiceState.asrRecorder = null;
      chatAsrButton?.classList.remove("is-recording");
    });
    recorder.start(1800);
  } catch (error) {
    cleanupAsrDraft({ restore: true });
    setStatus(t("voice.permissionDenied"), "error");
    showToast(error?.message || t("voice.permissionDenied"));
  }
}

async function transcribeAsrChunk(blob, sessionId) {
  if (voiceState.asrBusy || sessionId !== voiceState.asrSessionId) return;
  voiceState.asrBusy = true;
  setStatus(t("voice.asrTranscribing"), "busy");

  try {
    const audioDataUrl = await blobToDataUrl(blob);
    const data = await postJson("/api/asr", {
      audioDataUrl,
      mimeType: blob.type || "audio/webm",
      language: currentLang
    });
    if (sessionId !== voiceState.asrSessionId) return;
    if (data.provider === "demo" && !data.text) {
      showToast(t("voice.asrNotConfigured"));
      stopAsrRecorder();
      cleanupAsrDraft({ restore: true });
      return;
    }
    const text = String(data.text || "").trim();
    if (text) {
      voiceState.asrTranscript = [voiceState.asrTranscript, text].filter(Boolean).join(" ");
      const pieces = [voiceState.asrBaseText, voiceState.asrTranscript].filter((part) => part && part.trim());
      chatInput.value = pieces.join(voiceState.asrBaseText.trim() ? " " : "");
      updateChatPrimaryButtonMode();
    }
    setStatus(t("voice.asrListening"), "busy");
  } catch (error) {
    setStatus(error?.message || t("status.error"), "error");
  } finally {
    voiceState.asrBusy = false;
  }
}

function acceptAsrTranscript() {
  stopAsrRecorder();
  cleanupAsrDraft({ restore: false });
  chatInput?.focus();
  autoSave();
}

function rejectAsrTranscript() {
  stopAsrRecorder();
  cleanupAsrDraft({ restore: true });
  chatInput?.focus();
}

function stopAsrRecorder() {
  if (voiceState.asrRecorder && voiceState.asrRecorder.state !== "inactive") {
    voiceState.asrRecorder.stop();
  } else {
    stopMediaStream(voiceState.asrStream);
    voiceState.asrStream = null;
    voiceState.asrRecorder = null;
  }
}

function cleanupAsrDraft({ restore }) {
  voiceState.asrSessionId += 1;
  if (restore && chatInput) {
    chatInput.value = voiceState.asrBaseText;
  }
  voiceState.asrBaseText = "";
  voiceState.asrTranscript = "";
  voiceState.asrBusy = false;
  chatInput?.classList.remove("has-asr-draft");
  chatAsrButton?.classList.remove("is-recording");
  setAsrReviewMode(false);
  updateChatPrimaryButtonMode();
  setStatus(t("status.ready"), "ready");
}

function setAsrReviewMode(active) {
  chatVoiceActions?.classList.toggle("hidden", active);
  chatAsrReview?.classList.toggle("hidden", !active);
}

async function toggleRealtimeVoice() {
  if (voiceState.realtimeRecorder) {
    stopRealtimeVoice();
    return;
  }
  await startRealtimeVoice();
}

async function startRealtimeVoice() {
  if (!canRecordAudio()) return;

  const sessionId = voiceState.realtimeSessionId + 1;
  voiceState.realtimeSessionId = sessionId;
  voiceState.realtimeBusy = false;

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
    });
    const mimeType = pickAudioMimeType();
    const options = mimeType ? { mimeType } : undefined;
    const recorder = new MediaRecorder(stream, options);

    voiceState.realtimeStream = stream;
    voiceState.realtimeRecorder = recorder;
    chatRealtimeButton?.classList.add("is-listening");
    renderAllText();
    setStatus(t("voice.realtimeListening"), "busy");

    recorder.addEventListener("dataavailable", (event) => {
      if (event.data?.size) {
        handleRealtimeVoiceChunk(event.data, sessionId);
      }
    });
    recorder.addEventListener("stop", () => {
      stopMediaStream(voiceState.realtimeStream);
      voiceState.realtimeStream = null;
      voiceState.realtimeRecorder = null;
      voiceState.realtimeBusy = false;
      chatRealtimeButton?.classList.remove("is-listening");
      renderAllText();
      setStatus(t("status.ready"), "ready");
    });
    recorder.start(3200);
  } catch (error) {
    stopRealtimeVoice();
    setStatus(t("voice.permissionDenied"), "error");
    showToast(error?.message || t("voice.permissionDenied"));
  }
}

function stopRealtimeVoice() {
  voiceState.realtimeSessionId += 1;
  if (voiceState.realtimeRecorder && voiceState.realtimeRecorder.state !== "inactive") {
    voiceState.realtimeRecorder.stop();
  } else {
    stopMediaStream(voiceState.realtimeStream);
    voiceState.realtimeStream = null;
    voiceState.realtimeRecorder = null;
    voiceState.realtimeBusy = false;
    chatRealtimeButton?.classList.remove("is-listening");
    renderAllText();
    setStatus(t("status.ready"), "ready");
  }
}

async function handleRealtimeVoiceChunk(blob, sessionId) {
  if (voiceState.realtimeBusy || sessionId !== voiceState.realtimeSessionId) return;
  voiceState.realtimeBusy = true;

  try {
    const audioDataUrl = await blobToDataUrl(blob);
    const data = await postJson("/api/realtime-voice", {
      audioDataUrl,
      mimeType: blob.type || "audio/webm",
      language: currentLang,
      selectedContext: buildSelectedNodeContext(),
      analysis: state.latestAnalysis,
      messages: state.chatMessages.slice(-8),
      canvas: buildVoiceCanvasContext()
    });
    if (sessionId !== voiceState.realtimeSessionId) return;
    if (data.provider === "demo") {
      showToast(t("voice.realtimeNotConfigured"));
      stopRealtimeVoice();
      return;
    }
    if (data.transcript) appendChatMessage("user", data.transcript);
    if (data.reply) {
      appendChatMessage("assistant", data.reply);
      playVoiceReply(data);
    }
    applyVoiceActions(data.actions || data.action);
    autoSave();
  } catch (error) {
    setStatus(error?.message || t("status.error"), "error");
  } finally {
    voiceState.realtimeBusy = false;
  }
}

function buildVoiceCanvasContext() {
  const visibleNodes = Array.from(state.nodes.values()).filter(isNodeVisible).map((node) => ({
    id: node.id,
    title: node.option?.title || node.id,
    type: node.generated ? "generated" : (node.option ? "option" : node.id)
  })).slice(0, 30);
  return {
    selectedNodeId: state.selectedNodeId,
    generatedCount: state.generatedCount,
    visibleNodes
  };
}

function applyVoiceActions(value) {
  const actions = Array.isArray(value) ? value : (value ? [value] : []);
  for (const action of actions) {
    const type = typeof action === "string" ? action : action?.type || action?.name;
    if (!type) continue;
    if (type === "zoom_in") zoomBy(0.08);
    if (type === "zoom_out") zoomBy(-0.08);
    if (type === "reset_view") resetView();
    if (type === "arrange_canvas") arrangeCanvasLayout();
    if (type === "deselect") deselectNode();
    if (type === "select_source") selectNode("source");
    if (type === "select_analysis" && state.nodes.has("analysis")) selectNode("analysis");
    if (type === "select_node" && action?.nodeId && state.nodes.has(action.nodeId)) selectNode(action.nodeId);
    if (type === "create_direction") {
      const parentId = action?.parentNodeId && state.nodes.has(action.parentNodeId) ? action.parentNodeId : state.selectedNodeId;
      const parent = parentId ? state.nodes.get(parentId) : null;
      if (parent && !parent.generated) {
        const text = String(action.prompt || action.title || "").trim();
        if (text) {
          const nodeId = createOptionNode({
            id: `voice-${Date.now()}`,
            title: String(action.title || text).slice(0, 20),
            description: String(action.description || text),
            prompt: text,
            tone: "custom",
            layoutHint: "square"
          }, parentId);
          if (nodeId) selectNode(nodeId);
        }
      }
    }
  }
}

function playVoiceReply(data) {
  const audioDataUrl = typeof data?.audioDataUrl === "string" ? data.audioDataUrl : "";
  if (audioDataUrl.startsWith("data:audio/")) {
    const audio = new Audio(audioDataUrl);
    audio.play().catch(() => speakText(data.reply));
    return;
  }
  speakText(data?.reply);
}

function speakText(text) {
  const reply = String(text || "").trim();
  if (!reply || !("speechSynthesis" in window)) return;
  const utterance = new SpeechSynthesisUtterance(reply);
  utterance.lang = currentLang === "en" ? "en-US" : "zh-CN";
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function canRecordAudio() {
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
    showToast(t("voice.unsupported"));
    setStatus(t("voice.unsupported"), "error");
    return false;
  }
  return true;
}

function pickAudioMimeType() {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus"
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

function stopMediaStream(stream) {
  if (!stream) return;
  stream.getTracks().forEach((track) => track.stop());
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Failed to read audio."));
    reader.readAsDataURL(blob);
  });
}

function createOptionNode(option, parentNodeId) {
  const parentNode = state.nodes.get(parentNodeId);
  if (!parentNode) return null;

  // Compute position offset from parent
  const offsetX = 380;
  const offsetY = 40;
  const newX = (parentNode.x || 0) + offsetX;
  const newY = (parentNode.y || 0) + offsetY;

  const id = `option-${option.id}`;

  // Remove existing node with same id if any
  if (state.nodes.has(id)) {
    const existing = state.nodes.get(id);
    existing.element.remove();
    state.nodes.delete(id);
    state.collapsed.delete(id);
    state.selectiveHidden.delete(id);
    state.links = state.links.filter(l => l.from !== id && l.to !== id);
  }

  const fragment = optionTemplate.content.cloneNode(true);
  const element = fragment.querySelector(".option-node");
  element.dataset.nodeId = id;
  element.style.left = `${newX}px`;
  element.style.top = `${newY}px`;
  element.style.setProperty("--tilt", `${(Math.random() - 0.5) * 2}deg`);
  element.querySelector(".option-tone").textContent = `${option.tone || "visual"} / ${option.layoutHint || "square"}`;
  element.querySelector(".option-title").textContent = option.title || t("generated.result");
  element.querySelector(".option-description").textContent = option.description || "";

  const titleEl = element.querySelector(".option-title");
  if (titleEl) makeTitleEditable(id, titleEl);

  const button = element.querySelector(".generate-button");
  button.addEventListener("click", () => generateOption(id, option));

  board.appendChild(element);
  registerNode(id, element, {
    x: newX,
    y: newY,
    width: 318,
    height: element.offsetHeight,
    option
  });

  state.links.push({ from: parentNodeId, to: id, kind: "option" });
  makeDraggable(element, id);

  applyCollapseState();
  updateCounts();
  drawLinks();

  return id;
}

function appendChatMessage(role, content) {
  const thread = ensureActiveChatThread();
  thread.messages.push({
    role: role === "assistant" ? "assistant" : "user",
    content,
    branchNodeId: state.selectedNodeId,
    createdAt: new Date().toISOString()
  });
  state.chatMessages = thread.messages;
  renderChatMessages();
  renderChatConversationList();
}

function getBranchMessages() {
  syncActiveChatMessages();
  return state.chatMessages;
}

function renderChatMessages() {
  chatMessages.replaceChildren();

  const branchMessages = getBranchMessages();
  if (!branchMessages.length) {
    const placeholder = document.createElement("div");
    placeholder.className = "chat-placeholder";
    placeholder.textContent = t("chat.noMessages");
    chatMessages.appendChild(placeholder);
    return;
  }

  for (const message of branchMessages) {
    const line = document.createElement("div");
    line.className = `chat-line ${message.role}`;

    const role = document.createElement("span");
    role.className = "chat-role";
    role.textContent = message.role === "user" ? t("chat.roleUser") : t("chat.roleAssistant");

    const text = document.createElement("span");
    text.className = "chat-text";
    text.textContent = message.content;

    line.append(role, text);
    chatMessages.appendChild(line);
  }
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function renderChatContextIndicator() {
  let indicator = document.querySelector(".chat-context-indicator");
  if (!indicator) {
    indicator = document.createElement("div");
    indicator.className = "chat-context-indicator";
    const chatbar = document.querySelector(".chatbar");
    if (chatbar) {
      chatbar.insertBefore(indicator, chatbar.firstChild);
    } else {
      return;
    }
  }

  const selectedId = state.selectedNodeId;
  if (!selectedId) {
    indicator.textContent = "";
    indicator.classList.add("hidden");
    return;
  }

  const node = state.nodes.get(selectedId);
  const title = node?.option?.title || node?.id || "";
  indicator.textContent = t("chat.contextIndicator", { title: title.slice(0, 24) });
  indicator.classList.remove("hidden");
}

function renderAnalysis(data) {
  analysisSummary.textContent = data.summary || t("analysis.defaultSummary");
  keywordList.replaceChildren(...(data.moodKeywords || []).slice(0, 8).map((keyword) => {
    const span = document.createElement("span");
    span.className = "keyword";
    span.textContent = keyword;
    return span;
  }));
  analysisNode.classList.remove("hidden");

  // Update analysis node eyebrow based on source type
  const eyebrow = analysisNode.querySelector(".eyebrow");
  if (eyebrow) {
    const labels = { image: t("analysis.eyebrowImage"), text: t("analysis.eyebrowText"), url: t("analysis.eyebrowUrl") };
    eyebrow.textContent = labels[state.sourceType] || t("analysis.eyebrow");
  }
  const heading = analysisNode.querySelector("h2");
  if (heading) {
    const titles = { image: t("analysis.titleImage"), text: t("analysis.titleText"), url: t("analysis.titleUrl") };
    heading.textContent = titles[state.sourceType] || t("analysis.title");
    makeTitleEditable("analysis", heading);
  }

  state.links = [{ from: "source", to: "analysis", kind: "analysis" }];
  state.selectiveHidden.clear();
  applyCollapseState();
}

function renderOptions(options) {
  clearOptions();

  options.forEach((option, index) => {
    const fragment = optionTemplate.content.cloneNode(true);
    const element = fragment.querySelector(".option-node");
    const position = optionPositions[index % optionPositions.length];
    const id = `option-${option.id || index}`;

    element.dataset.nodeId = id;
    element.style.left = `${position.x}px`;
    element.style.top = `${position.y}px`;
    element.style.setProperty("--tilt", `${position.tilt}deg`);
    element.querySelector(".option-tone").textContent = `${option.tone || "visual"} / ${option.layoutHint || "square"}`;
    element.querySelector(".option-title").textContent = option.title || t("generated.result");
    element.querySelector(".option-description").textContent = option.description || "";

    const titleEl = element.querySelector(".option-title");
    if (titleEl) makeTitleEditable(id, titleEl);

    const button = element.querySelector(".generate-button");
    button.addEventListener("click", () => generateOption(id, option));

    board.appendChild(element);
    registerNode(id, element, {
      x: position.x,
      y: position.y,
      width: 318,
      height: element.offsetHeight,
      option
    });
    state.links.push({ from: "analysis", to: id, kind: "option" });
    makeDraggable(element, id);
  });

  applyCollapseState();
  updateCounts();
}

function renderExploreOptions(options, references) {
  clearOptions();

  options.forEach((option, index) => {
    const fragment = optionTemplate.content.cloneNode(true);
    const element = fragment.querySelector(".option-node");
    const position = optionPositions[index % optionPositions.length];
    const id = `option-${option.id || index}`;

    element.dataset.nodeId = id;
    element.style.left = `${position.x}px`;
    element.style.top = `${position.y}px`;
    element.style.setProperty("--tilt", `${position.tilt}deg`);
    element.querySelector(".option-tone").textContent = `${option.tone || "visual"} / ${option.layoutHint || "square"}`;
    element.querySelector(".option-title").textContent = option.title || t("generated.result");
    element.querySelector(".option-description").textContent = option.description || "";

    const titleEl = element.querySelector(".option-title");
    if (titleEl) makeTitleEditable(id, titleEl);

    const button = element.querySelector(".generate-button");
    button.addEventListener("click", () => generateOption(id, option));

    // Store references on the option data
    if (references.length > 0) {
      option.references = references;
    }

    // Add reference badge if references exist
    if (references.length > 0) {
      const badge = document.createElement("span");
      badge.className = "reference-badge";
      badge.textContent = `${references.length}`;
      badge.title = `${references.length} reference${references.length > 1 ? 's' : ''}`;
      element.appendChild(badge);
    }

    board.appendChild(element);
    registerNode(id, element, {
      x: position.x,
      y: position.y,
      width: 318,
      height: element.offsetHeight,
      option
    });
    state.links.push({ from: "analysis", to: id, kind: "option" });
    makeDraggable(element, id);
  });

  applyCollapseState();
  updateCounts();
}

async function generateOption(id, option) {
  const node = state.nodes.get(id);
  if (!node || !state.sourceImage) return;

  const element = node.element;
  const wasGenerated = Boolean(node.generated);
  const button = element.querySelector(".generate-button");
  element.classList.add("loading");
  if (button) button.disabled = true;
  setStatus(t("status.busy"), "busy");

  try {
    const sourceImageDataUrl = await getSourceImageDataUrl();
    const data = await postJson("/api/generate", {
      imageDataUrl: sourceImageDataUrl,
      option,
      thinkingMode: state.thinkingMode
    });

    let imageUrl = data.imageDataUrl;
    if (data.imageDataUrl && data.imageDataUrl.startsWith("data:")) {
      const asset = await postJson("/api/assets", {
        dataUrl: data.imageDataUrl,
        kind: "generated"
      });
      node.imageHash = asset.hash;
      imageUrl = `/api/assets/${asset.hash}?kind=generated`;
    } else if (data.hash) {
      node.imageHash = data.hash;
      imageUrl = `/api/assets/${data.hash}?kind=generated`;
    }

    // Generate explanation
    let explanation = "";
    try {
      const explainRes = await postJson("/api/explain", {
        prompt: data.prompt || option.prompt,
        optionTitle: option.title,
        summary: state.latestAnalysis?.summary || "",
        thinkingMode: state.thinkingMode
      });
      explanation = explainRes.explanation || "";
    } catch (e) {
      console.error("Failed to generate explanation:", e);
    }
    node.explanation = explanation;

    turnIntoGeneratedNode(element, option, imageUrl);
    node.width = element.offsetWidth;
    node.height = element.offsetHeight;
    node.generated = true;
    if (!wasGenerated) {
      state.generatedCount += 1;
    }

    // Auto-collapse unselected siblings
    const parentLink = state.links.find(l => l.to === id);
    if (parentLink) {
      const siblings = getChildren(parentLink.from);
      let hiddenAny = false;
      for (const sid of siblings) {
        if (sid === id) continue;
        const n = state.nodes.get(sid);
        if (n && !n.generated) {
          state.selectiveHidden.add(sid);
          hiddenAny = true;
        }
      }
      if (hiddenAny) {
        applyCollapseState();
        autoSave();
      }
    }

    applyCollapseState();
    updateCounts();
    setStatus(t("status.ready"), "ready");
    autoSave();
  } catch (error) {
    element.classList.remove("loading");
    if (button) button.disabled = false;
    setStatus(error.message || t("status.error"), "error");
  }
}

function turnIntoGeneratedNode(element, option, imageDataUrl) {
  element.className = "node option-node generated-node";
  element.innerHTML = "";
  ensureCollapseControl(element.dataset.nodeId, element);

  const img = document.createElement("img");
  img.className = "generated-image";
  img.src = imageDataUrl;
  img.alt = option.title || "生成图";
  img.style.cursor = "zoom-in";
  img.addEventListener("click", (event) => {
    event.stopPropagation();
    openImageViewer(element.dataset.nodeId);
  });
  element.appendChild(img);

  const eyebrow = document.createElement("p");
  eyebrow.className = "eyebrow";
  eyebrow.textContent = `${option.tone || "generated"} / ${t("generated.result")}`;
  element.appendChild(eyebrow);

  const title = document.createElement("h3");
  title.textContent = option.title || t("generated.result");
  element.appendChild(title);
  makeTitleEditable(element.dataset.nodeId, title);

  const desc = document.createElement("p");
  desc.className = "generated-description";
  desc.textContent = option.description || "";
  element.appendChild(desc);

  const actions = document.createElement("div");
  actions.className = "generated-actions";

  const download = document.createElement("button");
  download.className = "secondary-button";
  download.textContent = t("generated.download");
  download.addEventListener("click", () => downloadImage(imageDataUrl, `${option.id || "generated"}.png`));

  const regenerate = document.createElement("button");
  regenerate.className = "secondary-button";
  regenerate.textContent = t("generated.regenerate");
  regenerate.addEventListener("click", () => generateOption(element.dataset.nodeId, option));

  actions.append(download, regenerate);
  element.appendChild(actions);
}

function openImageViewer(nodeId) {
  const node = state.nodes.get(nodeId);
  if (!node || !node.generated) return;

  const img = node.element.querySelector(".generated-image");
  if (!img) return;

  currentViewerNodeId = nodeId;
  viewerImage.src = img.src;
  viewerImage.alt = node.option?.title || t("generated.result");
  viewerTitle.textContent = node.option?.title || "";
  viewerExplanation.textContent = node.explanation || "";

  if (viewerPromptInput) viewerPromptInput.value = node.option?.prompt || "";
  if (viewerModifyPanel) viewerModifyPanel.classList.add("hidden");

  const shareBtn = imageViewerModal.querySelector("#imageShareButton");
  if (shareBtn) {
    shareBtn.onclick = () => handleShareImage(nodeId);
  }

  imageViewerModal.classList.remove("hidden");
  document.body.style.overflow = "hidden";

  const closeBtn = imageViewerModal.querySelector("#closeImageViewer");
  if (closeBtn) closeBtn.focus();
}

function closeImageViewer() {
  imageViewerModal.classList.add("hidden");
  viewerImage.src = "";
  document.body.style.overflow = "";
  currentViewerNodeId = null;
  if (viewerModifyPanel) viewerModifyPanel.classList.add("hidden");
}

async function handleShareImage(nodeId) {
  const node = state.nodes.get(nodeId);
  if (!node || !node.generated) return;

  if (!currentSessionId) {
    showToast(t("viewer.shareFailed"));
    return;
  }

  showToast(t("viewer.shareInProgress"));

  try {
    const res = await postJson("/api/share-image", { nodeId, sessionId: currentSessionId });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("[handleShareImage] API error:", err);
      showToast(t("viewer.shareFailed"));
      return;
    }
    const data = await res.json();
    if (!data.ok || !data.shareUrl) {
      showToast(t("viewer.shareFailed"));
      return;
    }
    const fullUrl = window.location.origin + data.shareUrl;
    await navigator.clipboard.writeText(fullUrl);
    showToast(t("viewer.shareCopied"));
  } catch (err) {
    console.error("[handleShareImage] error:", err);
    showToast(t("viewer.shareFailed"));
  }
}

function openReferenceModal(nodeId) {
  const node = state.nodes.get(nodeId);
  if (!node || !node.option?.references || node.option.references.length === 0) return;

  if (referenceList) {
    referenceList.replaceChildren();
    for (const ref of node.option.references) {
      const item = document.createElement("div");
      item.className = "reference-item";

      const badge = document.createElement("span");
      badge.className = "ref-type-badge";
      badge.textContent = ref.type || "web";

      const link = document.createElement("a");
      link.href = ref.url || "#";
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = ref.title || ref.url || "Untitled";

      const desc = document.createElement("p");
      desc.textContent = ref.description || "";

      item.append(badge, link, desc);
      referenceList.appendChild(item);
    }
  }

  const titleEl = referenceModal?.querySelector(".reference-modal-title");
  if (titleEl) titleEl.textContent = t("reference.title");

  if (referenceModal) {
    referenceModal.style.display = "";
    document.body.style.overflow = "hidden";
    const closeBtn = referenceModal.querySelector(".modal-close");
    if (closeBtn) closeBtn.focus();
  }
}

function closeReferenceModal() {
  if (referenceModal) {
    referenceModal.style.display = "none";
    document.body.style.overflow = "";
  }
  if (referenceList) referenceList.replaceChildren();
}

function clearOptions() {
  deselectNode();
  for (const [id, node] of Array.from(state.nodes.entries())) {
    if (id.startsWith("option-")) {
      node.element.remove();
      state.nodes.delete(id);
      state.collapsed.delete(id);
      state.selectiveHidden.delete(id);
    }
  }
  state.links = state.links.filter((link) => !link.to.startsWith("option-") && !link.from.startsWith("option-"));
  state.generatedCount = 0;
  applyCollapseState();
}

function selectNode(nodeId) {
  if (!state.nodes.has(nodeId)) return;
  if (state.selectedNodeId === nodeId) {
    deselectNode();
    return;
  }
  deselectNode();
  state.selectedNodeId = nodeId;
  const node = state.nodes.get(nodeId);
  if (node && node.element) {
    node.element.classList.add("is-selected");
    node.element.style.zIndex = "9";
  }
  updateDialogState();
}

function deselectNode() {
  if (state.selectedNodeId === null) return;
  const node = state.nodes.get(state.selectedNodeId);
  if (node && node.element) {
    node.element.classList.remove("is-selected");
    node.element.style.zIndex = "";
  }
  state.selectedNodeId = null;
  updateDialogState();
}

function updateDialogState() {
  const hasSelection = state.selectedNodeId !== null;
  const node = hasSelection ? state.nodes.get(state.selectedNodeId) : null;

  // Enable/disable chat input
  if (chatInput) {
    chatInput.disabled = !hasSelection;
    if (hasSelection && node) {
      const title = node.option?.title || node.id;
      chatInput.placeholder = t("chat.placeholderWithCard", { title: title.slice(0, 20) });
    } else {
      chatInput.placeholder = t("chat.placeholder");
    }
  }
  if (chatGenerateButton) {
    chatGenerateButton.disabled = !hasSelection;
  }

  // Toggle no-selection class on chatbar for visual feedback
  if (chatForm) {
    chatForm.classList.toggle("no-selection", !hasSelection);
  }

  // Toggle has-selection on chat-input-row for bound-card visual cue
  const chatInputRow = chatForm?.querySelector(".chat-input-row");
  if (chatInputRow) {
    chatInputRow.classList.toggle("has-selection", hasSelection);
  }

  renderChatContextIndicator();
  renderChatMessages();
}

let toastTimer = null;
function showSelectionToast(message) {
  showToast(message || t("chat.selectCardFirst"));
}

function showToast(message) {
  const toast = document.querySelector("#selectionToast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("visible");
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("visible");
  }, 2500);
}

function registerNode(id, element, data) {
  state.nodes.set(id, { id, element, ...data });
  ensureCollapseControl(id, element);
  element.addEventListener("dblclick", (event) => {
    if (event.target.closest(".collapse-dot")) return;
    if (event.target.closest("button, input, textarea, a")) return;
    const node = state.nodes.get(id);
    if (node?.option?.references && node.option.references.length > 0) {
      openReferenceModal(id);
      return;
    }
    selectNode(id);
  });

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "node-delete-btn";
  deleteBtn.setAttribute("aria-label", t("node.delete"));
  deleteBtn.innerHTML = "&#x2715;"; // Unicode multiplication X
  deleteBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    deleteNode(id);
  });
  element.appendChild(deleteBtn);

  updateCollapseControls();
}

function ensureCollapseControl(id, element) {
  let button = Array.from(element.children).find((child) => child.classList?.contains("collapse-dot"));
  if (button) return button;

  button = document.createElement("button");
  button.type = "button";
  button.className = "collapse-dot";
  button.setAttribute("aria-label", "Collapse downstream nodes");
  attachMultiClickCollapseHandler(button, id);
  element.prepend(button);
  return button;
}

function attachMultiClickCollapseHandler(button, nodeId) {
  let clicks = 0;
  let timer = null;

  button.addEventListener("click", (event) => {
    event.stopPropagation();
    clicks++;
    if (clicks === 1) {
      timer = setTimeout(() => {
        toggleSelectiveCollapse(nodeId);
        clicks = 0;
      }, 280);
    } else if (clicks === 2) {
      clearTimeout(timer);
      timer = setTimeout(() => {
        toggleCollapse(nodeId);
        clicks = 0;
      }, 280);
    } else if (clicks >= 3) {
      clearTimeout(timer);
      expandAllCollapsed();
      clicks = 0;
    }
  });
}

function toggleCollapse(id) {
  const descendants = getDescendants(id);
  if (!descendants.size) return;

  if (state.collapsed.has(id)) {
    state.collapsed.delete(id);
  } else {
    state.collapsed.add(id);
  }
  applyCollapseState();
  autoSave();
}

function toggleSelectiveCollapse(id) {
  const descendants = getDescendants(id);
  if (!descendants.size) return;

  const unGeneratedDescendants = [...descendants].filter(did => {
    const n = state.nodes.get(did);
    return n && !n.generated;
  });

  if (!unGeneratedDescendants.length) return;

  const anyVisible = unGeneratedDescendants.some(did => !state.selectiveHidden.has(did) && !isHiddenByCollapsedAncestor(did));

  if (anyVisible) {
    for (const did of unGeneratedDescendants) {
      state.selectiveHidden.add(did);
    }
  } else {
    for (const did of unGeneratedDescendants) {
      state.selectiveHidden.delete(did);
    }
  }
  applyCollapseState();
  autoSave();
}

function expandAllCollapsed() {
  state.collapsed.clear();
  state.selectiveHidden.clear();
  applyCollapseState();
  autoSave();
}

function applyCollapseState() {
  for (const [id, node] of state.nodes.entries()) {
    const hiddenByAncestor = isHiddenByCollapsedAncestor(id);
    const selectivelyHidden = state.selectiveHidden.has(id);
    node.element.classList.toggle("collapsed-hidden", hiddenByAncestor);
    node.element.classList.toggle("selective-hidden", selectivelyHidden && !hiddenByAncestor);
  }
  updateCollapseControls();
  drawLinks();
}

function updateCollapseControls() {
  for (const [id, node] of state.nodes.entries()) {
    const button = Array.from(node.element.children).find((child) => child.classList?.contains("collapse-dot"));
    if (!button) continue;

    const descendants = getDescendants(id);
    const fullCollapsed = state.collapsed.has(id);

    const hiddenCount = [...descendants].filter(did => {
      const n = state.nodes.get(did);
      return n && (n.element.classList.contains("collapsed-hidden") || n.element.classList.contains("selective-hidden"));
    }).length;

    const hasChildren = descendants.size > 0;
    button.disabled = !hasChildren;
    button.textContent = (fullCollapsed || hiddenCount > 0) ? String(hiddenCount || descendants.size) : "";
    button.classList.toggle("is-collapsed", fullCollapsed || hiddenCount > 0);
    button.classList.toggle("has-children", hasChildren);
    button.title = hasChildren
      ? (fullCollapsed ? t("collapse.expand", { count: descendants.size }) : hiddenCount > 0 ? t("collapse.expand", { count: hiddenCount }) : t("collapse.collapse", { count: descendants.size }))
      : t("collapse.noChildren");
    button.setAttribute("aria-label", button.title);
  }
}

function getChildren(id) {
  return state.links.filter((link) => link.from === id).map((link) => link.to);
}

function canDeleteNode(nodeId) {
  if (nodeId === "source") return false;
  const children = getChildren(nodeId);
  if (children.length > 0) return false;
  return true;
}

function makeTitleEditable(nodeId, titleElement) {
  if (!titleElement) return;

  titleElement.addEventListener("dblclick", (event) => {
    event.stopPropagation();
    if (titleElement.querySelector(".node-title-input")) return; // already editing

    const originalText = titleElement.textContent;
    const input = document.createElement("input");
    input.type = "text";
    input.className = "node-title-input";
    input.value = originalText;

    // Replace title text with input
    titleElement.textContent = "";
    titleElement.appendChild(input);
    input.focus();
    input.select();

    function save() {
      const newText = input.value.trim();
      if (newText && newText !== originalText) {
        titleElement.textContent = newText;
        // Update node data
        const node = state.nodes.get(nodeId);
        if (node) {
          if (node.option) node.option.title = newText;
          autoSave();
        }
      } else {
        titleElement.textContent = originalText;
      }
    }

    function cancel() {
      titleElement.textContent = originalText;
    }

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        save();
      } else if (e.key === "Escape") {
        e.preventDefault();
        cancel();
      }
    });

    input.addEventListener("blur", () => {
      save();
    });
  });
}

function deleteNode(nodeId) {
  if (!canDeleteNode(nodeId)) {
    const reason = nodeId === "source" ? t("node.cannotDeleteSource") : t("node.cannotDeleteWithChildren");
    showSelectionToast(reason);
    return;
  }
  const node = state.nodes.get(nodeId);
  if (!node) return;

  // Deselect if this node was selected
  if (state.selectedNodeId === nodeId) {
    deselectNode();
  }

  // Remove from state
  state.nodes.delete(nodeId);
  state.collapsed.delete(nodeId);
  state.selectiveHidden.delete(nodeId);

  // Remove links connected to this node
  state.links = state.links.filter(l => l.from !== nodeId && l.to !== nodeId);

  // Remove DOM element
  node.element.remove();

  // Update counts and UI
  if (node.generated) {
    state.generatedCount = Math.max(0, state.generatedCount - 1);
  }
  updateCounts();
  updateCollapseControls();
  drawLinks();
  autoSave();
}

function getDescendants(id) {
  const descendants = new Set();
  const stack = [...getChildren(id)];

  while (stack.length) {
    const current = stack.pop();
    if (!current || descendants.has(current)) continue;
    descendants.add(current);
    stack.push(...getChildren(current));
  }

  return descendants;
}

function isHiddenByCollapsedAncestor(id) {
  for (const collapsedId of state.collapsed) {
    if (collapsedId === id) continue;
    if (getDescendants(collapsedId).has(id)) {
      return true;
    }
  }
  return false;
}

function makeDraggable(element, id) {
  let start = null;

  element.addEventListener("pointerdown", (event) => {
    const interactive = event.target.closest("button, input, label");
    if (interactive && event.target.tagName !== "SECTION") return;
    const node = state.nodes.get(id);
    if (!node) return;

    start = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      nodeX: node.x,
      nodeY: node.y
    };
    element.classList.add("dragging");
    element.setPointerCapture(event.pointerId);
  });

  element.addEventListener("pointermove", (event) => {
    if (!start) return;
    const node = state.nodes.get(id);
    if (!node) return;

    node.x = start.nodeX + (event.clientX - start.x) / state.view.scale;
    node.y = start.nodeY + (event.clientY - start.y) / state.view.scale;
    element.style.left = `${node.x}px`;
    element.style.top = `${node.y}px`;
    node.width = element.offsetWidth;
    node.height = element.offsetHeight;
    drawLinks();
  });

  element.addEventListener("pointerup", () => {
    start = null;
    element.classList.remove("dragging");
    autoSave();
  });
}

function drawLinks() {
  const fragments = document.createDocumentFragment();

  state.links.forEach((link) => {
    const from = state.nodes.get(link.from);
    const to = state.nodes.get(link.to);
    if (!isNodeVisible(from) || !isNodeVisible(to)) return;

    const start = anchor(from, "right");
    const end = anchor(to, "left");
    const path = curvePath(start, end);
    const shadow = svgElement("path", { d: path, class: "link-shadow" });
    const line = svgElement("path", { d: path, class: "link" });
    const pinA = svgElement("circle", { cx: start.x, cy: start.y, r: 9, class: "link-pin" });
    const pinB = svgElement("circle", { cx: end.x, cy: end.y, r: 9, class: "link-pin" });

    fragments.append(shadow, line, pinA, pinB);
  });

  linkLayer.replaceChildren(fragments);
}

function isNodeVisible(node) {
  return Boolean(node)
    && !node.element.classList.contains("hidden")
    && !node.element.classList.contains("collapsed-hidden")
    && !node.element.classList.contains("selective-hidden");
}

function anchor(node, side) {
  const element = node.element;
  const width = element.offsetWidth || node.width || 300;
  const height = element.offsetHeight || node.height || 220;
  const x = node.x + (side === "right" ? width - 18 : 18);
  const y = node.y + Math.min(height * 0.48, height - 32);
  return { x, y };
}

function curvePath(start, end) {
  const distance = Math.max(120, Math.abs(end.x - start.x) * 0.42);
  const c1x = start.x + distance;
  const c2x = end.x - distance;
  const c1y = start.y + (end.y - start.y) * 0.08;
  const c2y = end.y - (end.y - start.y) * 0.08;
  return `M ${start.x} ${start.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${end.x} ${end.y}`;
}

function svgElement(tag, attributes) {
  const element = document.createElementNS("http://www.w3.org/2000/svg", tag);
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
  return element;
}

function handleAttachClick() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/png,image/jpeg,image/webp,image/gif,.txt,.md,.json,text/plain";
  input.onchange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleAttachment(file);
  };
  input.click();
}

async function handleAttachment(file) {
  if (file.type.startsWith("image/")) {
    await handleFile({ target: { files: [file] } });
  } else if (file.type.startsWith("text/") || file.name.endsWith(".txt") || file.name.endsWith(".md") || file.name.endsWith(".json")) {
    try {
      const text = await file.text();
      chatInput.value = text.slice(0, 2000);
      chatInput.focus();
    } catch (err) {
      alert(t("file.readError") + (err instanceof Error ? err.message : String(err)));
    }
  } else {
    alert(t("file.unsupported"));
  }
}

async function resizeImage(file, maxSize, quality) {
  if (!file.type.startsWith("image/")) {
    throw new Error(t("image.chooseFile"));
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    const ratio = Math.min(1, maxSize / Math.max(img.width, img.height));
    const width = Math.round(img.width * ratio);
    const height = Math.round(img.height * ratio);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    return {
      width,
      height,
      dataUrl: canvas.toDataURL("image/jpeg", quality)
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(t("image.error")));
    img.src = src;
  });
}

async function getJson(url) {
  const response = await fetch(url);
  return parseApiResponse(response);
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return parseApiResponse(response);
}

async function putJson(url, payload) {
  const response = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return parseApiResponse(response);
}

async function parseApiResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || data.error || response.statusText);
  }
  return data;
}

function zoomBy(delta) {
  state.view.scale = clamp(state.view.scale + delta, 0.45, 1.35);
  updateBoardTransform();
}

function resetView() {
  state.view.x = 0;
  state.view.y = 0;
  state.view.scale = window.innerWidth < 820 ? 0.64 : 0.86;
  updateBoardTransform();
}

function updateBoardTransform() {
  board.style.transform = `translate(${state.view.x}px, ${state.view.y}px) scale(${state.view.scale})`;
}

function updateCounts() {
  if (!counts) return;
  const optionCount = Array.from(state.nodes.keys()).filter((id) => id.startsWith("option-")).length;
  counts.textContent = t("counts.label", { options: optionCount, generated: state.generatedCount });
}

function setStatus(text, tone = "ready") {
  if (statusText) statusText.textContent = text;
  if (statusDot) statusDot.className = `status-dot ${tone}`;
}

function downloadImage(dataUrl, fileName) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function trimMiddle(value, maxLength) {
  if (!value || value.length <= maxLength) return value || "";
  const left = Math.ceil((maxLength - 1) / 2);
  const right = Math.floor((maxLength - 1) / 2);
  return `${value.slice(0, left)}…${value.slice(-right)}`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function computeStateHash() {
  return JSON.stringify({
    nodes: Array.from(state.nodes.entries()).map(([k, v]) => [k, { x: v.x, y: v.y, width: v.width, height: v.height, generated: v.generated, option: v.option }]),
    links: state.links,
    collapsed: Array.from(state.collapsed),
    selectiveHidden: Array.from(state.selectiveHidden),
    chatMessages: state.chatMessages,
    chatThreads: serializeChatThreads(),
    activeChatThreadId: state.activeChatThreadId,
    selectedNodeId: state.selectedNodeId,
    view: state.view,
    sourceImage: state.sourceImage ? state.sourceImage.slice(0, 200) : null,
    latestAnalysis: state.latestAnalysis
  });
}

async function prepareStateForSave() {
  const payload = {
    sourceImage: state.sourceImage,
    sourceImageHash: state.sourceImageHash,
    sourceType: state.sourceType,
    sourceText: state.sourceText,
    sourceDataUrl: state.sourceDataUrl,
    sourceUrl: state.sourceUrl,
    fileName: state.fileName,
    latestAnalysis: state.latestAnalysis,
    chatMessages: state.chatMessages,
    nodes: {},
    links: state.links,
    collapsed: Array.from(state.collapsed),
    selectiveHidden: Array.from(state.selectiveHidden),
    generatedCount: state.generatedCount,
    selectedNodeId: state.selectedNodeId,
    view: {
      ...state.view,
      chatThreads: serializeChatThreads(),
      activeChatThreadId: state.activeChatThreadId
    }
  };

  for (const [id, node] of state.nodes.entries()) {
    payload.nodes[id] = {
      id,
      x: node.x,
      y: node.y,
      width: node.width,
      height: node.height,
      generated: node.generated || false,
      option: node.option || null,
      imageHash: node.imageHash || null,
      explanation: node.explanation || null
    };
  }

  return payload;
}

async function getSourceImageDataUrl() {
  if (state.sourceImage && state.sourceImage.startsWith("data:")) return state.sourceImage;
  if (state.sourceImageHash) {
    const response = await fetch(`/api/assets/${state.sourceImageHash}?kind=upload`);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  }
  return state.sourceImage;
}

function getSourceBadgeClass() {
  if (state.sourceType === "url") return "link";
  if (state.sourceType === "text") {
    const ext = (state.fileName || "").split(".").pop()?.toLowerCase();
    if (["docx", "pdf", "pptx"].includes(ext)) return "document";
    return "text";
  }
  return "image";
}

function getSourceBadgeLabel() {
  if (state.sourceType === "url") {
    return state.fileName || "LINK";
  }
  if (state.sourceType === "text") {
    const ext = (state.fileName || "").split(".").pop()?.toLowerCase();
    const map = { txt: "TXT", md: "MD", json: "JSON", docx: "DOCX", pdf: "PDF", pptx: "PPTX" };
    return map[ext] || "TEXT";
  }
  return "IMG";
}

function updateSourceBadge() {
  let badge = sourceNode.querySelector(".source-badge");
  if (!badge) {
    badge = document.createElement("span");
    badge.className = "source-badge";
    sourceNode.querySelector(".node-caption")?.prepend(badge);
  }
  badge.className = `source-badge ${getSourceBadgeClass()}`;
  badge.textContent = getSourceBadgeLabel();
}

async function saveSession({ isAuto = false } = {}) {
  const saveStatus = document.querySelector("#saveStatus");
  if (saveStatus) saveStatus.textContent = isAuto ? t("save.auto") : t("save.inProgress");
  if (saveStatus) saveStatus.className = "save-status saving";

  try {
    if (state.sourceImage && state.sourceImage.startsWith("data:") && !state.sourceImageHash) {
      const asset = await postJson("/api/assets", {
        dataUrl: state.sourceImage,
        kind: "upload",
        fileName: state.fileName
      });
      state.sourceImageHash = asset.hash;
    }

    const payloadState = await prepareStateForSave();
    const aiTitle = state.latestAnalysis?.title?.trim();
    const body = {
      state: payloadState,
      title: aiTitle || (state.fileName ? `${state.fileName}${t("session.exploration")}` : t("session.unnamed")),
      isDemo: currentHealthMode === "demo"
    };

    let result;
    if (currentSessionId) {
      result = await putJson(`/api/sessions/${currentSessionId}`, body);
    } else {
      result = await postJson("/api/sessions", body);
      currentSessionId = result.sessionId;
      const url = new URL(window.location.href);
      url.searchParams.set("session", currentSessionId);
      window.history.replaceState({}, "", url);
    }

    lastSavedStateHash = computeStateHash();
    if (saveStatus) {
      saveStatus.textContent = t("save.savedAt", { time: new Date(result.savedAt).toLocaleTimeString() });
      saveStatus.className = "save-status saved";
    }
  } catch (error) {
    console.error("Save failed:", error);
    if (saveStatus) {
      saveStatus.textContent = t("save.failed");
      saveStatus.className = "save-status error";
    }
  }
}

function autoSave() {
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
  const currentHash = computeStateHash();
  if (currentHash === lastSavedStateHash) return;

  autoSaveTimer = setTimeout(() => {
    saveSession({ isAuto: true });
  }, 2000);
}

async function loadSession(sessionId) {
  setStatus(t("status.busy"), "busy");
  try {
    const data = await getJson(`/api/sessions/${sessionId}`);

    clearOptions();
    resetChatThreads();
    state.links = [];
    state.collapsed.clear();
    state.selectiveHidden.clear();
    state.generatedCount = 0;
    state.sourceImage = null;
    state.sourceImageHash = null;
    state.sourceUrl = null;
    state.fileName = "";
    state.latestAnalysis = null;

    if (data.viewState) {
      state.view = {
        ...state.view,
        x: Number.isFinite(data.viewState.x) ? data.viewState.x : state.view.x,
        y: Number.isFinite(data.viewState.y) ? data.viewState.y : state.view.y,
        scale: Number.isFinite(data.viewState.scale) ? data.viewState.scale : state.view.scale
      };
      updateBoardTransform();
    }

    const sourceAsset = data.assets.find(a => a.kind === "upload");
    if (sourceAsset) {
      const isText = data.state?.sourceType === "text" || sourceAsset.mimeType?.startsWith("text/") || /\.(txt|md|json|docx|pdf|pptx)$/i.test(sourceAsset.fileName || "");
      state.sourceType = isText ? "text" : "image";
      state.fileName = sourceAsset.fileName || "";

      if (state.sourceType === "image") {
        state.sourceImage = `/api/assets/${sourceAsset.hash}?kind=upload`;
        state.sourceImageHash = sourceAsset.hash;
        sourcePreview.src = state.sourceImage;
        sourcePreview.classList.add("has-image");
      } else {
        state.sourceImage = null;
        state.sourceImageHash = null;
        state.sourceText = data.state?.sourceText || null;
        state.sourceDataUrl = data.state?.sourceDataUrl || null;
        sourcePreview.src = "";
        sourcePreview.classList.remove("has-image");
      }
      emptyState.classList.add("hidden");
      sourceName.textContent = trimMiddle(state.fileName, 28);
      if (researchButton) researchButton.disabled = false;
      updateSourceBadge();
    } else if (data.state?.sourceType === "url" && data.state?.sourceUrl) {
      // Restore URL source without upload asset
      state.sourceType = "url";
      state.sourceUrl = data.state.sourceUrl;
      state.fileName = data.state.fileName || new URL(data.state.sourceUrl).hostname;
      state.sourceImage = null;
      state.sourceImageHash = null;
      state.sourceText = null;
      state.sourceDataUrl = null;

      renderUrlSource(state.sourceUrl, data.state?.latestAnalysis?.title || "");
      sourceName.textContent = trimMiddle(state.fileName, 28);
      if (researchButton) researchButton.disabled = false;
      updateSourceBadge();
    } else {
      state.sourceType = "image";
      state.sourceImage = null;
      state.sourceImageHash = null;
      state.sourceText = null;
      state.sourceDataUrl = null;
      state.sourceUrl = null;
      sourcePreview.src = "";
      sourcePreview.classList.remove("has-image");
      emptyState.classList.remove("hidden");
      sourceName.textContent = "Source image";
      if (researchButton) researchButton.disabled = true;
      updateSourceBadge();
    }

    const analysisNodeData = data.nodes.find(n => n.type === "analysis");
    if (analysisNodeData && analysisNodeData.data?.summary) {
      state.latestAnalysis = {
        title: analysisNodeData.data.title || "",
        summary: analysisNodeData.data.summary,
        detectedSubjects: analysisNodeData.data.detectedSubjects || [],
        moodKeywords: analysisNodeData.data.moodKeywords || [],
        options: []
      };
      renderAnalysis(state.latestAnalysis);
    } else {
      analysisNode.classList.add("hidden");
      state.latestAnalysis = null;
    }

    // Restore source fields from persisted state if present
    if (data.state?.sourceType) {
      state.sourceType = data.state.sourceType;
    }
    if (data.state?.sourceText) {
      state.sourceText = data.state.sourceText;
    }
    if (data.state?.sourceDataUrl) {
      state.sourceDataUrl = data.state.sourceDataUrl;
    }
    if (data.state?.sourceUrl) {
      state.sourceUrl = data.state.sourceUrl;
    }

    const optionNodes = data.nodes.filter(n => n.type === "option" || n.type === "generated");
    for (const n of optionNodes) {
      const option = n.data?.option || { title: t("generated.result"), description: "", tone: "cinematic", layoutHint: "square" };
      // Restore references from persisted data
      if (n.data?.references) {
        option.references = n.data.references;
      }
      const position = optionPositions[optionNodes.indexOf(n) % optionPositions.length];
      const nodeId = n.nodeId;

      const fragment = optionTemplate.content.cloneNode(true);
      const element = fragment.querySelector(".option-node");
      element.dataset.nodeId = nodeId;
      element.style.left = `${n.x || position.x}px`;
      element.style.top = `${n.y || position.y}px`;
      element.style.setProperty("--tilt", `${position.tilt}deg`);
      element.querySelector(".option-tone").textContent = `${option.tone || "visual"} / ${option.layoutHint || "square"}`;
      element.querySelector(".option-title").textContent = option.title || t("generated.result");
      element.querySelector(".option-description").textContent = option.description || "";

      const button = element.querySelector(".generate-button");
      button.addEventListener("click", () => generateOption(nodeId, option));

      // Restore reference badge if references exist
      if (option.references && option.references.length > 0) {
        const badge = document.createElement("span");
        badge.className = "reference-badge";
        badge.textContent = `${option.references.length}`;
        badge.title = `${option.references.length} reference${option.references.length > 1 ? 's' : ''}`;
        element.appendChild(badge);
      }

      board.appendChild(element);
      registerNode(nodeId, element, {
        x: n.x || position.x,
        y: n.y || position.y,
        width: n.width || 318,
        height: n.height || element.offsetHeight,
        option,
        generated: n.type === "generated"
      });

      const titleEl = element.querySelector(".option-title, h3");
      if (titleEl) makeTitleEditable(nodeId, titleEl);

      if (n.type === "generated" && (n.data?.imageHash || n.data?.imageDataUrl)) {
        const hash = n.data?.imageHash || n.data?.imageDataUrl;
        const imageUrl = hash.startsWith("data:") ? hash : `/api/assets/${hash}?kind=generated`;
        turnIntoGeneratedNode(element, option, imageUrl);
        const node = state.nodes.get(nodeId);
        if (node) {
          node.generated = true;
          node.imageHash = n.data?.imageHash || null;
          node.explanation = n.data?.explanation || "";
          node.width = element.offsetWidth;
          node.height = element.offsetHeight;
        }
        state.generatedCount += 1;
      }

      state.links.push({ from: "analysis", to: nodeId, kind: "option" });
      makeDraggable(element, nodeId);
    }

    state.links = data.links.map(l => ({ from: l.fromNodeId, to: l.toNodeId, kind: l.kind }));
    if (analysisNodeData && !state.links.find(l => l.from === "source" && l.to === "analysis")) {
      state.links.unshift({ from: "source", to: "analysis", kind: "analysis" });
    }

    for (const n of data.nodes) {
      if (n.collapsed) state.collapsed.add(n.nodeId);
    }
    if (data.selectiveHidden) {
      for (const id of data.selectiveHidden) state.selectiveHidden.add(id);
    }

    hydrateChatThreads({
      threads: data.viewState?.chatThreads,
      activeId: data.viewState?.activeChatThreadId,
      fallbackMessages: data.chatMessages.map(m => ({ role: m.role, content: m.content }))
    });
    renderChatMessages();

    applyCollapseState();
    updateCounts();

    if (data.state?.selectedNodeId && state.nodes.has(data.state.selectedNodeId)) {
      selectNode(data.state.selectedNodeId);
    }

    currentSessionId = sessionId;
    lastSavedStateHash = computeStateHash();

    const url = new URL(window.location.href);
    url.searchParams.set("session", sessionId);
    window.history.replaceState({}, "", url);

    setStatus(t("status.ready"), "ready");
  } catch (error) {
    setStatus(error.message || t("status.error"), "error");
  }
}

async function renderSessionList() {
  const list = document.querySelector("#sessionList");
  if (!list) return;
  list.innerHTML = "<span class='session-item-meta'>" + t("status.saving") + "</span>";

  try {
    const data = await getJson("/api/history?limit=50");
    list.innerHTML = "";

    if (!data.sessions?.length) {
      list.innerHTML = "<span class='session-item-meta'>" + t("history.empty") + "</span>";
      return;
    }

    for (const session of data.sessions) {
      const item = document.createElement("div");
      item.className = "session-item";
      if (session.id === currentSessionId) item.classList.add("active");

      const title = document.createElement("div");
      title.className = "session-item-title";
      title.textContent = session.title || t("session.unnamed");

      if (session.isDemo) {
        const badge = document.createElement("span");
        badge.className = "session-item-demo";
        badge.textContent = "Demo";
        title.appendChild(badge);
      }

      const meta = document.createElement("div");
      meta.className = "session-item-meta";
      const date = new Date(session.updatedAt);
      meta.textContent = `${date.toLocaleDateString()} ${date.toLocaleTimeString()} · ${session.nodeCount} nodes · ${session.assetCount} assets`;

      item.appendChild(title);
      item.appendChild(meta);
      item.addEventListener("click", () => {
        loadSession(session.id);
        document.querySelector("#sessionPanel")?.classList.add("hidden");
      });

      list.appendChild(item);
    }
  } catch (error) {
    list.innerHTML = "<span class='session-item-meta'>" + t("status.error") + "</span>";
  }
}

function arrangeCanvasLayout() {
  // 1. Collapse un-generated option nodes
  let hiddenAny = false;
  for (const [id, node] of state.nodes.entries()) {
    if (id.startsWith("option-") && !node.generated) {
      state.selectiveHidden.add(id);
      hiddenAny = true;
    }
  }
  if (hiddenAny) {
    applyCollapseState();
    updateCollapseControls();
  }

  // 2. Build visible tree structure and compute depths
  const visibleNodeIds = [];
  for (const [id, node] of state.nodes.entries()) {
    if (isNodeVisible(node)) visibleNodeIds.push(id);
  }

  const depthMap = new Map();
  for (const id of visibleNodeIds) {
    if (id === "source") {
      depthMap.set(id, 0);
    } else if (id === "analysis") {
      depthMap.set(id, 1);
    } else {
      const parentLink = state.links.find(l => l.to === id);
      if (parentLink) {
        const parentDepth = depthMap.get(parentLink.from);
        if (typeof parentDepth === "number") {
          depthMap.set(id, parentDepth + 1);
        } else {
          depthMap.set(id, 2);
        }
      } else {
        depthMap.set(id, id.startsWith("option-") ? 2 : 0);
      }
    }
  }

  // Group by depth
  const depthGroups = new Map();
  for (const [id, depth] of depthMap.entries()) {
    if (!depthGroups.has(depth)) depthGroups.set(depth, []);
    depthGroups.get(depth).push(id);
  }

  // 3. Compute tree layout positions
  const COLUMN_GAP = 420;
  const ROW_GAP = 40;
  const START_X = 96;
  const START_Y = 120;
  const BOARD_WIDTH = 2400;
  const BOARD_HEIGHT = 1500;

  const targetPositions = new Map();
  const depths = Array.from(depthGroups.keys()).sort((a, b) => a - b);

  for (const depth of depths) {
    const x = START_X + depth * COLUMN_GAP;
    const nodesAtDepth = depthGroups.get(depth);
    const totalHeight = nodesAtDepth.reduce((sum, id) => {
      const node = state.nodes.get(id);
      return sum + (node?.height || 220) + ROW_GAP;
    }, 0) - ROW_GAP;

    let y = START_Y;
    if (totalHeight < BOARD_HEIGHT - START_Y * 2) {
      y = (BOARD_HEIGHT - totalHeight) / 2;
    }

    for (const nodeId of nodesAtDepth) {
      const node = state.nodes.get(nodeId);
      if (!node) continue;
      const clampedX = clamp(x, 0, BOARD_WIDTH - (node.width || 318));
      const clampedY = clamp(y, 0, BOARD_HEIGHT - (node.height || 220));
      targetPositions.set(nodeId, { x: clampedX, y: clampedY });
      y += (node.height || 220) + ROW_GAP;
    }
  }

  // 4. Animate to new positions
  animateNodesToPositions(targetPositions, 400);
}

function animateNodesToPositions(targetPositions, duration = 400) {
  if (!targetPositions.size) return;

  board.classList.add("is-arranging");

  const startPositions = [];
  for (const [id, target] of targetPositions.entries()) {
    const node = state.nodes.get(id);
    if (!node) continue;
    startPositions.push({ id, node, startX: node.x, startY: node.y, targetX: target.x, targetY: target.y });
  }

  const ease = t => 1 - Math.pow(1 - t, 3);
  const startTime = performance.now();

  function step(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = ease(progress);

    for (const item of startPositions) {
      const { node, startX, startY, targetX, targetY } = item;
      const currentX = startX + (targetX - startX) * eased;
      const currentY = startY + (targetY - startY) * eased;
      node.x = currentX;
      node.y = currentY;
      node.element.style.left = `${currentX}px`;
      node.element.style.top = `${currentY}px`;
    }

    drawLinks();

    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      board.classList.remove("is-arranging");
      drawLinks();
      autoSave();
    }
  }

  requestAnimationFrame(step);
}
