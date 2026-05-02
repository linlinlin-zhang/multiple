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
const chatScrollBottom = document.querySelector("#chatScrollBottom");
const commandMenu = document.querySelector("#commandMenu");
const chatAttachButton = document.querySelector("#chatAttachButton");
const chatActionMenu = document.querySelector("#chatActionMenu");
const chatUploadAction = document.querySelector("#chatUploadAction");
const chatDeepThinkAction = document.querySelector("#chatDeepThinkAction");
const chatSubagentsAction = document.querySelector("#chatSubagentsAction");
const deepThinkModeChip = document.querySelector("#deepThinkModeChip");
const deepThinkModeCancel = document.querySelector("#deepThinkModeCancel");
const chatSidebarResize = document.querySelector("#chatSidebarResize");
const chatInputResize = document.querySelector("#chatInputResize");
const chatAgentButton = document.querySelector("#chatAgentButton");
const agentPanel = document.querySelector("#agentPanel");
const closeAgentPanel = document.querySelector("#closeAgentPanel");
const subagentsToggle = document.querySelector("#subagentsToggle");
const agentPrompt = document.querySelector("#agentPrompt");
const runAgentButton = document.querySelector("#runAgentButton");
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
const viewerAsrButton = document.querySelector("#viewerAsrButton");
const viewerThumbnailStrip = document.querySelector("#viewerThumbnailStrip");
const imageShareModal = document.querySelector("#imageShareModal");
const sharePreviewImage = document.querySelector("#sharePreviewImage");
const shareTitle = document.querySelector("#shareTitle");
const shareNameInput = document.querySelector("#shareNameInput");
const shareLinkInput = document.querySelector("#shareLinkInput");
const shareCopyButton = document.querySelector("#shareCopyButton");
const shareRenameButton = document.querySelector("#shareRenameButton");
const shareDownloadButton = document.querySelector("#shareDownloadButton");

const referenceModal = document.querySelector("#referenceModal");
const referenceList = document.querySelector(".reference-list");
const blueprintModal = document.querySelector("#blueprintModal");
const blueprintCanvas = document.querySelector(".blueprint-canvas");

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
  junctions: new Map(),  // junctionId -> { connectedCardIds: string[], maxCapacity: 5 }
  blueprints: new Map(),  // junctionId -> { positions: { cardId: { x, y } }, relationships: [{ from, to, type }] }
  collapsed: new Set(),        // full collapse (double-click)
  selectiveHidden: new Set(),  // selective hide (single-click / auto-collapse)
  generatedCount: 0,
  selectedNodeId: null,
  thinkingMode: "no-thinking",
  subagentsEnabled: false,
  view: {
    x: 0,
    y: 0,
    scale: 0.86
  }
};

const settingsCache = {
  currentRole: "analysis",
  analysis: { endpoint: "", model: "", apiKey: "", temperature: 0.7 },
  chat: { endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1", model: "qwen3.6-plus", apiKey: "", temperature: 0.7 },
  image: { endpoint: "", model: "", apiKey: "", temperature: 0.7 },
  asr: { endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1", model: "qwen3-livetranslate-flash-2025-12-01", apiKey: "", temperature: 0 },
  realtime: { endpoint: "wss://dashscope.aliyuncs.com/api-ws/v1/realtime", model: "qwen3.5-omni-plus-realtime", apiKey: "", temperature: 0.7 },
  deepthink: { endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1", model: "qwen3.6-plus", apiKey: "", temperature: 0.7 }
};

const voiceState = {
  asrSessionId: 0,
  asrRecorder: null,
  asrStream: null,
  asrBaseText: "",
  asrTargetInput: null,
  asrTranscript: "",
  asrBusy: false,
  realtimeSessionId: 0,
  realtimeRecorder: null,
  realtimeStream: null,
  realtimeAudioContext: null,
  realtimeSource: null,
  realtimeProcessor: null,
  realtimeFlushTimer: null,
  realtimePcmChunks: [],
  realtimeBusy: false
};

let currentSessionId = null;
let autoSaveTimer = null;
let lastSavedStateHash = "";
let currentViewerNodeId = null;
let currentShareNodeId = null;
const imageShareLinks = new Map();
let activeCommandIndex = 0;
let currentHealthMode = "checking";
let deepThinkBusy = false;
let deepThinkModeActive = false;

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
    "command.newCard": "新建卡片",
    "command.newCardDesc": "在画布上创建一张空白卡片",
    "command.searchCard": "搜索卡片",
    "command.searchCardDesc": "按名称搜索画布上的卡片并定位",
    "command.searchCardPrompt": "输入卡片名称搜索…",
    "command.searchCardEmpty": "未找到匹配的卡片",
    "command.searchCardFound": "已定位到卡片：{title}",
    "junction.maxCapacity": "聚合节点最多连接 {max} 张卡片",
    "junction.mergeExceedsCapacity": "合并后超过最大容量 {max}",
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
    "settings.deepthink": "深度思考",
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
    "research.fallbackComplete": "探索完成（已自动降级为快速模式）",
    "research.timeout": "模型响应超时，请稍后重试",
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
    "chat.thinkingPending": "正在思考...",
    "chat.thinkingDetails": "思考过程",
    "chat.thinkingRunning": "正在思考中",
    "chat.thinkingComplete": "思考已完成",
    "chat.thinkingUnavailable": "模型本次没有返回可展开的思考过程。",
    "chat.actionsApplied": "已执行 {count} 个画布操作",
    "chat.scrollBottom": "回到底部",
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
    "chat.actionMenu": "功能区",
    "chat.upload": "上传图片或文件",
    "chat.uploadDesc": "添加到当前画布或输入框",
    "chat.deepThink": "深度思考",
    "chat.deepThinkDesc": "把思考过程展开成画布卡片",
    "chat.deepThinkMode": "深度思考",
    "chat.deepThinkActive": "正处于深度思考模式下",
    "chat.cancelDeepThink": "取消深度思考模式",
    "deepthink.busy": "深度思考中...",
    "deepthink.complete": "深度思考完成",
    "chat.generatedCannotGenerate": "生成图节点无法继续生成方向",
    "chat.noSourceForGenerate": "请先上传图片或打开可作为参考的图片，再生成。",
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
    "viewer.promptPlaceholder": "描述编辑",
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
    "command.newCard": "New Card",
    "command.newCardDesc": "Create a blank card on the canvas",
    "command.searchCard": "Search card",
    "command.searchCardDesc": "Find and locate a card on the canvas by name",
    "command.searchCardPrompt": "Type card name to search…",
    "command.searchCardEmpty": "No matching card found",
    "command.searchCardFound": "Located card: {title}",
    "junction.maxCapacity": "Junction node can connect at most {max} cards",
    "junction.mergeExceedsCapacity": "Merge would exceed maximum capacity of {max}",
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
    "settings.deepthink": "Deep Think",
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
    "research.fallbackComplete": "Explore complete (fell back to fast mode)",
    "research.timeout": "Model response timed out. Please try again.",
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
    "chat.thinkingPending": "Thinking...",
    "chat.thinkingDetails": "Thinking process",
    "chat.thinkingRunning": "Thinking",
    "chat.thinkingComplete": "Thinking complete",
    "chat.thinkingUnavailable": "The model did not return an expandable thinking process for this turn.",
    "chat.actionsApplied": "{count} canvas actions applied",
    "chat.scrollBottom": "Scroll to bottom",
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
    "chat.actionMenu": "Action menu",
    "chat.upload": "Upload image or file",
    "chat.uploadDesc": "Add to the canvas or input",
    "chat.deepThink": "Deep think",
    "chat.deepThinkDesc": "Expand the thinking process into canvas cards",
    "chat.deepThinkMode": "Deep think",
    "chat.deepThinkActive": "Deep thinking mode is active",
    "chat.cancelDeepThink": "Cancel deep thinking mode",
    "deepthink.busy": "Deep thinking...",
    "deepthink.complete": "Deep thinking complete",
    "chat.generatedCannotGenerate": "Generated image nodes cannot spawn new directions",
    "chat.noSourceForGenerate": "Upload or open a reference image before generating.",
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
    "viewer.promptPlaceholder": "Describe edit",
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
  if (chatScrollBottom) {
    chatScrollBottom.title = t("chat.scrollBottom");
    chatScrollBottom.setAttribute("aria-label", t("chat.scrollBottom"));
  }
  const chatGenerate = document.querySelector("#chatGenerateButton");
  if (chatGenerate) chatGenerate.textContent = t("chat.generate");
  if (chatAttachButton) {
    chatAttachButton.title = t("chat.actionMenu");
    chatAttachButton.setAttribute("aria-label", t("chat.actionMenu"));
  }
  if (chatUploadAction) {
    const title = chatUploadAction.querySelector(".chat-action-title");
    const desc = chatUploadAction.querySelector(".chat-action-desc");
    if (title) title.textContent = t("chat.upload");
    if (desc) desc.textContent = t("chat.uploadDesc");
  }
  if (chatDeepThinkAction) {
    const title = chatDeepThinkAction.querySelector(".chat-action-title");
    const desc = chatDeepThinkAction.querySelector(".chat-action-desc");
    if (title) title.textContent = t("chat.deepThink");
    if (desc) desc.textContent = t("chat.deepThinkDesc");
  }
  if (deepThinkModeChip) {
    deepThinkModeChip.title = t("chat.deepThinkActive");
    deepThinkModeChip.setAttribute("aria-label", t("chat.deepThinkActive"));
    const label = deepThinkModeChip.querySelector(".deep-think-chip-label");
    if (label) label.textContent = t("chat.deepThinkMode");
  }
  if (deepThinkModeCancel) {
    deepThinkModeCancel.title = t("chat.cancelDeepThink");
    deepThinkModeCancel.setAttribute("aria-label", t("chat.cancelDeepThink"));
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
    if (role === "deepthink") tab.textContent = t("settings.deepthink");
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
  restoreChatSizing();
  restoreChatSidebarState();
  registerNode("source", sourceNode, { x: 96, y: 88, width: 318, height: 326 });
  registerNode("analysis", analysisNode, { x: 452, y: 96, width: 318, height: 220 });
  installSourceImageActions();
  makeSourceNameEditable();

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
  loadSubagentsMode();
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
    { id: "arrange", icon: "A", label: t("command.arrange"), description: t("command.arrangeDesc") },
    { id: "new-card", icon: "N", label: t("command.newCard"), description: t("command.newCardDesc") },
    { id: "search-card", icon: "Q", label: t("command.searchCard"), description: t("command.searchCardDesc") },
    {
      id: "subagents",
      icon: "A",
      label: currentLang === "en" ? "Subagents" : "Subagents",
      description: currentLang === "en" ? "Allow complex tasks to spawn quick agents" : "允许复杂任务拆成多个快速 agent"
    }
  ];
}

function getFilteredCommands() {
  const query = getCommandQuery(chatInput?.value || "").toLowerCase();
  const commands = getWorkbenchCommands();
  if (!query) return commands;
  return commands.filter((command) => `${command.label} ${command.description} ${command.id}`.toLowerCase().includes(query));
}

function getCommandQuery(rawValue) {
  const text = String(rawValue || "").trim().replace(/^\/+/, "").trim();
  const matched = resolveWorkbenchCommandFromInput(rawValue);
  if (matched?.command && matched.remainder) {
    return matched.command.label || matched.command.id;
  }
  return text;
}

function resolveWorkbenchCommandFromInput(rawValue) {
  const text = String(rawValue || "").trim().replace(/^\/+/, "").trim();
  if (!text) return null;
  const commands = getWorkbenchCommands();
  const candidates = commands
    .flatMap((command) => [command.id, command.label].filter(Boolean).map((alias) => ({ command, alias })))
    .sort((a, b) => b.alias.length - a.alias.length);
  const lower = text.toLowerCase();
  for (const candidate of candidates) {
    const alias = candidate.alias.toLowerCase();
    if (lower === alias || lower.startsWith(`${alias} `) || lower.startsWith(`${alias}:`) || lower.startsWith(`${alias}：`)) {
      return {
        command: candidate.command,
        remainder: text.slice(candidate.alias.length).replace(/^[:：\-—\s]+/, "").trim()
      };
    }
  }
  return null;
}

function renderCommandMenu() {
  if (!commandMenu) return;
  if (cardSearchMode) {
    renderCardSearchResults();
    return;
  }
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
      commandMenu.querySelectorAll(".command-item").forEach((item, itemIndex) => {
        item.classList.toggle("is-active", itemIndex === activeCommandIndex);
        item.setAttribute("aria-selected", String(itemIndex === activeCommandIndex));
      });
    });
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      executeWorkbenchCommand(command.id);
    });
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
  if (cardSearchMode) {
    if (chatInput.value.trim().startsWith("/")) {
      commandMenu.classList.remove("hidden");
      renderCommandMenu();
    } else {
      closeCardSearchUI();
      closeCommandMenu();
    }
    return;
  }
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
  const rawCommandInput = chatInput?.value || "";
  const commandArgument = extractCommandArgument(commandId, rawCommandInput);
  closeCommandMenu();
  if (chatInput) chatInput.value = "";
  updateChatPrimaryButtonMode();

  if (commandId === "save") return saveSession();
  if (commandId === "export") return exportCurrentSession();
  if (commandId === "import") return importSessionFile();
  if (commandId === "sessions") return openSessionPanel();
  if (commandId === "fit") return resetView();
  if (commandId === "arrange") return arrangeCanvasLayout();
  if (commandId === "new-card") return createNewCardNode(commandArgument);
  if (commandId === "search-card") return openCardSearchUI();
  if (commandId === "subagents") return toggleSubagentsMode();
}

function extractCommandArgument(commandId, rawValue) {
  if (commandId !== "new-card") return "";
  let text = String(rawValue || "").trim().replace(/^\/+/, "").trim();
  const aliases = [
    t("command.newCard"),
    "new-card",
    "new card",
    "card",
    "新建卡片",
    "新建",
    "卡片"
  ].filter(Boolean).sort((a, b) => b.length - a.length);
  const lower = text.toLowerCase();
  const alias = aliases.find((item) => lower === item.toLowerCase() || lower.startsWith(`${item.toLowerCase()} `));
  if (alias) {
    text = text.slice(alias.length).trim();
  }
  return text.replace(/^[:：\-—\s]+/, "").trim();
}

let cardSearchMode = false;

function openCardSearchUI() {
  cardSearchMode = true;
  if (chatInput) chatInput.value = "/";
  openCommandMenu();
}

function closeCardSearchUI() {
  cardSearchMode = false;
}

function getCardSearchQuery() {
  if (!chatInput) return "";
  const raw = chatInput.value.trim().replace(/^\/+/, "").trim();
  const cmdPrefix = t("command.searchCard").toLowerCase();
  if (raw.toLowerCase().startsWith(cmdPrefix)) {
    return raw.slice(cmdPrefix.length).replace(/^[:：\-—\s]+/, "").trim().toLowerCase();
  }
  return raw.toLowerCase();
}

function getAllCanvasCards() {
  const cards = [];
  for (const [id, node] of state.nodes.entries()) {
    if (id === "source" || id === "analysis") continue;
    const title = node.option?.title || node.sourceCard?.title || node.sourceCard?.fileName || "";
    if (title) {
      cards.push({ id, title, node });
    }
  }
  return cards;
}

function getFilteredCards() {
  const query = getCardSearchQuery();
  const allCards = getAllCanvasCards();
  if (!query) return allCards;
  return allCards.filter((card) => card.title.toLowerCase().includes(query));
}

function renderCardSearchResults() {
  if (!commandMenu) return;
  const cards = getFilteredCards();
  commandMenu.innerHTML = "";

  const header = document.createElement("div");
  header.className = "command-empty";
  header.textContent = cards.length ? t("command.searchCardPrompt") : t("command.searchCardEmpty");
  commandMenu.appendChild(header);

  activeCommandIndex = Math.min(activeCommandIndex, Math.max(cards.length - 1, 0));
  cards.forEach((card, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `command-item${index === activeCommandIndex ? " is-active" : ""}`;
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", String(index === activeCommandIndex));

    const icon = document.createElement("span");
    icon.className = "command-icon";
    icon.textContent = "🔍";
    const copy = document.createElement("span");
    copy.className = "command-copy";
    const title = document.createElement("span");
    title.className = "command-title";
    title.textContent = card.title;
    const description = document.createElement("span");
    description.className = "command-description";
    description.textContent = card.id;
    copy.append(title, description);
    button.append(icon, copy);

    button.addEventListener("mouseenter", () => {
      activeCommandIndex = index;
      commandMenu.querySelectorAll(".command-item").forEach((item, itemIndex) => {
        item.classList.toggle("is-active", itemIndex === activeCommandIndex);
        item.setAttribute("aria-selected", String(itemIndex === activeCommandIndex));
      });
    });
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      locateCard(card.id, card.title);
    });
    commandMenu.appendChild(button);
  });
}

function locateCard(nodeId, title) {
  closeCardSearchUI();
  closeCommandMenu();
  if (chatInput) chatInput.value = "";
  updateChatPrimaryButtonMode();
  selectNode(nodeId);
  focusNodeInViewport(nodeId, "upper-left");
  showToast(t("command.searchCardFound", { title }));
}

function wireControls() {
  fileInput.addEventListener("change", handleFile);
  // Research dropdown wiring
  const researchDropdownWrapper = document.querySelector(".research-dropdown-wrapper");
  if (researchDropdownWrapper) {
    let researchCloseTimer = null;
    const openResearchMenu = () => {
      window.clearTimeout(researchCloseTimer);
      researchDropdownWrapper.classList.add("is-open");
    };
    const closeResearchMenu = () => {
      researchDropdownWrapper.classList.remove("is-open");
    };
    const scheduleResearchMenuClose = () => {
      window.clearTimeout(researchCloseTimer);
      researchCloseTimer = window.setTimeout(closeResearchMenu, 160);
    };

    researchDropdownWrapper.addEventListener("mouseenter", openResearchMenu);
    researchDropdownWrapper.addEventListener("mouseleave", scheduleResearchMenuClose);
    researchButton?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openResearchMenu();
    });
    document.addEventListener("click", (event) => {
      if (!researchDropdownWrapper.contains(event.target)) {
        closeResearchMenu();
      }
    });
  }

  let lastResearchOptionRun = 0;
  const runResearchOption = (option) => {
    const now = Date.now();
    if (now - lastResearchOptionRun < 250) return;
    lastResearchOptionRun = now;
    const mode = option.dataset.mode;
    if (mode === "analyze") {
      handleAnalyze("analyze");
    } else if (mode === "explore") {
      handleExplore();
    }
    researchDropdownWrapper?.classList.remove("is-open");
  };

  document.querySelectorAll(".research-option").forEach((option) => {
    option.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      runResearchOption(option);
    });
    option.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      runResearchOption(option);
    });
  });
  chatForm.addEventListener("submit", handleChatSubmit);
  chatInput?.addEventListener("keydown", (event) => {
    const commandMenuOpen = commandMenu && !commandMenu.classList.contains("hidden");
    if (commandMenuOpen && cardSearchMode) {
      const cards = getFilteredCards();
      if (event.key === "ArrowDown") {
        event.preventDefault();
        activeCommandIndex = (activeCommandIndex + 1) % Math.max(cards.length, 1);
        renderCommandMenu();
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        activeCommandIndex = (activeCommandIndex - 1 + Math.max(cards.length, 1)) % Math.max(cards.length, 1);
        renderCommandMenu();
        return;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        const card = cards[activeCommandIndex];
        if (card) locateCard(card.id, card.title);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        closeCardSearchUI();
        closeCommandMenu();
        return;
      }
      return;
    }
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
  });
  chatInput?.addEventListener("input", () => {
    syncCommandMenu();
    updateChatPrimaryButtonMode();
  });
  chatInput?.addEventListener("focus", () => {
    if (chatInput.value.trim().startsWith("/")) {
      openCommandMenu();
    }
  });
  document.addEventListener("pointerdown", (event) => {
    if (!commandMenu || commandMenu.classList.contains("hidden")) return;
    const target = event.target;
    if (commandMenu.contains(target)) return;
    if (chatInput && (target === chatInput || chatInput.contains(target))) return;
    if (cardSearchMode) {
      closeCardSearchUI();
    }
    closeCommandMenu();
  });
  chatMessages?.addEventListener("scroll", updateChatScrollButton);
  chatScrollBottom?.addEventListener("click", () => scrollChatToBottom());
  navToggle?.addEventListener("click", toggleNav);
  chatNewButton?.addEventListener("click", startNewChat);
  chatHistoryButton?.addEventListener("click", toggleChatConversationPanel);
  chatCloseButton?.addEventListener("click", () => setChatSidebarOpen(false));
  chatAgentButton?.addEventListener("click", toggleAgentPanel);
  closeAgentPanel?.addEventListener("click", () => setAgentPanelOpen(false));
  subagentsToggle?.addEventListener("change", () => setSubagentsMode(Boolean(subagentsToggle.checked)));
  runAgentButton?.addEventListener("click", runCustomAgentTask);
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

  chatAttachButton?.addEventListener("click", toggleChatActionMenu);
  chatUploadAction?.addEventListener("click", () => {
    closeChatActionMenu();
    handleAttachClick();
  });
  chatDeepThinkAction?.addEventListener("click", () => {
    closeChatActionMenu();
    setDeepThinkModeActive(true);
    chatInput?.focus();
  });
  chatSubagentsAction?.addEventListener("click", () => {
    closeChatActionMenu();
    toggleSubagentsMode();
  });
  deepThinkModeCancel?.addEventListener("click", () => setDeepThinkModeActive(false));
  chatSidebarResize?.addEventListener("pointerdown", startChatSidebarResize);
  chatInputResize?.addEventListener("pointerdown", startChatInputResize);
  window.addEventListener("resize", () => {
    const current = getCurrentChatSidebarWidth();
    if (current) applyChatSidebarWidth(current);
  });
  chatAsrButton?.addEventListener("click", toggleAsrDictation);
  chatAsrRejectButton?.addEventListener("click", rejectAsrTranscript);
  chatAsrAcceptButton?.addEventListener("click", acceptAsrTranscript);
  chatRealtimeButton?.addEventListener("click", handleChatPrimaryAction);
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".chat-action-wrapper")) {
      closeChatActionMenu();
    }
  });
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
  imageShareModal?.querySelector("[data-close-share]")?.addEventListener("click", closeImageShareModal);
  document.querySelector("#closeImageShare")?.addEventListener("click", closeImageShareModal);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !imageViewerModal?.classList.contains("hidden")) {
      closeImageViewer();
    }
    if (event.key === "Escape" && !imageShareModal?.classList.contains("hidden")) {
      closeImageShareModal();
    }
    if (event.key === "Escape") {
      closeChatActionMenu();
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

  viewerAsrButton?.addEventListener("click", () => {
    toggleViewerAsrDictation();
  });

  viewerSubmitModify?.addEventListener("click", async () => {
    const customPrompt = viewerPromptInput?.value.trim();
    if (!customPrompt) return;
    await submitViewerImageEdit(customPrompt);
  });

  viewerDownload?.addEventListener("click", async () => {
    if (!currentViewerNodeId) return;
    await downloadImageNode(currentViewerNodeId);
  });

  shareCopyButton?.addEventListener("click", async () => {
    if (!currentShareNodeId) return;
    await copyImageShareLink(currentShareNodeId);
  });

  shareRenameButton?.addEventListener("click", () => {
    if (!currentShareNodeId) return;
    renameImageNode(currentShareNodeId, shareNameInput?.value || "");
  });

  shareDownloadButton?.addEventListener("click", async () => {
    if (!currentShareNodeId) return;
    await downloadImageNode(currentShareNodeId, shareNameInput?.value || "");
  });

  viewport.addEventListener("click", (event) => {
    if (!settingsPanel?.classList.contains("hidden") && event.target === viewport) {
      settingsPanel.classList.add("hidden");
    }
    if (commandMenu && !commandMenu.contains(event.target) && !chatForm.contains(event.target)) {
      closeCommandMenu();
    }
    if (chatActionMenu && !chatActionMenu.contains(event.target) && !chatAttachButton?.contains(event.target)) {
      closeChatActionMenu();
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

function restoreChatSizing() {
  const savedSidebar = Number(localStorage.getItem("oryzae.chatSidebarWidth") || 0);
  if (savedSidebar) applyChatSidebarWidth(savedSidebar);

  const savedInput = Number(localStorage.getItem("oryzae.chatInputHeight") || 0);
  if (savedInput) applyChatInputHeight(savedInput);
}

function getCurrentChatSidebarWidth() {
  const current = getComputedStyle(document.documentElement).getPropertyValue("--chat-sidebar-width").trim();
  if (current.endsWith("px")) return Number.parseFloat(current);
  return document.querySelector(".statusbar")?.getBoundingClientRect().width || 0;
}

function clampChatSidebarWidth(width) {
  const min = 320;
  const max = Math.max(min, Math.floor(window.innerWidth * 0.4));
  return Math.min(max, Math.max(min, Math.round(width)));
}

function applyChatSidebarWidth(width) {
  const clamped = clampChatSidebarWidth(width);
  document.documentElement.style.setProperty("--chat-sidebar-width", `${clamped}px`);
  localStorage.setItem("oryzae.chatSidebarWidth", String(clamped));
}

function clampChatInputHeight(height) {
  const min = 76;
  const max = Math.max(min, Math.min(360, Math.floor(window.innerHeight * 0.45)));
  return Math.min(max, Math.max(min, Math.round(height)));
}

function applyChatInputHeight(height) {
  const clamped = clampChatInputHeight(height);
  document.documentElement.style.setProperty("--chat-input-height", `${clamped}px`);
  localStorage.setItem("oryzae.chatInputHeight", String(clamped));
}

function startChatSidebarResize(event) {
  if (event.button !== undefined && event.button !== 0) return;
  event.preventDefault();
  const startX = event.clientX;
  const startWidth = document.querySelector(".statusbar")?.getBoundingClientRect().width || getCurrentChatSidebarWidth() || 430;
  document.body.classList.add("is-resizing-chat");

  function move(pointerEvent) {
    applyChatSidebarWidth(startWidth + (startX - pointerEvent.clientX));
  }

  function stop() {
    document.body.classList.remove("is-resizing-chat");
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", stop);
    window.removeEventListener("pointercancel", stop);
  }

  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", stop, { once: true });
  window.addEventListener("pointercancel", stop, { once: true });
}

function startChatInputResize(event) {
  if (event.button !== undefined && event.button !== 0) return;
  event.preventDefault();
  const startY = event.clientY;
  const startHeight = chatInput?.getBoundingClientRect().height || 76;
  document.body.classList.add("is-resizing-chat-input");

  function move(pointerEvent) {
    applyChatInputHeight(startHeight + (startY - pointerEvent.clientY));
  }

  function stop() {
    document.body.classList.remove("is-resizing-chat-input");
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", stop);
    window.removeEventListener("pointercancel", stop);
  }

  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", stop, { once: true });
  window.addEventListener("pointercancel", stop, { once: true });
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
    thinkingTrace: normalizeChatThinkingTrace(message?.thinkingTrace || message?.trace),
    thinkingContent: normalizeChatThinkingContent(message?.thinkingContent || message?.reasoningContent || message?.reasoning),
    thinkingRequested: Boolean(message?.thinkingRequested || message?.thinkingContent || message?.reasoningContent),
    actions: normalizeChatMessageActions(message?.actions),
    artifacts: normalizeChatArtifacts(message?.artifacts || message?.materials || message?.cards),
    pending: Boolean(message?.pending),
    createdAt: message?.createdAt || new Date().toISOString()
  };
}

function normalizeChatThinkingTrace(value) {
  const raw = Array.isArray(value)
    ? value
    : (typeof value === "string" ? value.split(/\n+/) : []);
  return raw
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, 8);
}

function normalizeChatMessageActions(value) {
  const raw = Array.isArray(value) ? value : (value ? [value] : []);
  return raw
    .filter((action) => action && typeof action === "object" && action.type)
    .slice(0, 8)
    .map((action) => ({ ...action, type: String(action.type) }));
}

function normalizeChatArtifacts(value) {
  const raw = Array.isArray(value) ? value : (value ? [value] : []);
  return raw
    .filter((item) => item && typeof item === "object")
    .slice(0, 12)
    .map((item) => ({
      type: String(item.type || item.kind || "note").slice(0, 24),
      title: String(item.title || item.name || item.query || item.url || "Material").slice(0, 80),
      summary: String(item.summary || item.description || item.content || item.prompt || "").slice(0, 420),
      url: String(item.url || "").slice(0, 512),
      query: String(item.query || "").slice(0, 240),
      status: String(item.status || "").slice(0, 40)
    }));
}

function normalizeChatThinkingContent(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean).join("\n");
  }
  if (value && typeof value === "object") {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return "";
    }
  }
  return typeof value === "string" ? value.trim() : "";
}

function normalizeChatThread(thread, index = 0) {
  const fallback = createChatThread([], t("chat.conversationUntitled", { index: index + 1 }));
  if (!thread || typeof thread !== "object") return fallback;
  const messages = Array.isArray(thread.messages)
    ? thread.messages.map(normalizeChatThreadMessage).filter((m) => m.content || m.thinkingContent || m.pending || m.actions?.length || m.artifacts?.length)
    : [];
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
      thinkingTrace: normalizeChatThinkingTrace(message.thinkingTrace),
      thinkingContent: normalizeChatThinkingContent(message.thinkingContent),
      thinkingRequested: Boolean(message.thinkingRequested),
      actions: normalizeChatMessageActions(message.actions),
      artifacts: normalizeChatArtifacts(message.artifacts),
      pending: Boolean(message.pending),
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

function setSubagentsMode(enabled, { silent = false } = {}) {
  state.subagentsEnabled = Boolean(enabled);
  if (subagentsToggle) subagentsToggle.checked = state.subagentsEnabled;
  chatForm?.classList.toggle("subagents-enabled", state.subagentsEnabled);
  localStorage.setItem("oryzae-subagents-enabled", state.subagentsEnabled ? "true" : "false");
  if (silent) return;
  showToast(state.subagentsEnabled
    ? (currentLang === "en" ? "Subagents enabled" : "Subagents 已启用")
    : (currentLang === "en" ? "Subagents disabled" : "Subagents 已关闭"));
}

function loadSubagentsMode() {
  setSubagentsMode(localStorage.getItem("oryzae-subagents-enabled") === "true", { silent: true });
}

function toggleSubagentsMode() {
  setSubagentsMode(!state.subagentsEnabled);
  setAgentPanelOpen(true);
}

function setAgentPanelOpen(open) {
  agentPanel?.classList.toggle("hidden", !open);
  chatAgentButton?.classList.toggle("active", Boolean(open));
  if (open) {
    if (subagentsToggle) subagentsToggle.checked = state.subagentsEnabled;
    agentPrompt?.focus();
  }
}

function toggleAgentPanel() {
  const isHidden = agentPanel?.classList.contains("hidden");
  setAgentPanelOpen(Boolean(isHidden));
}

async function runCustomAgentTask() {
  const task = agentPrompt?.value.trim() || chatInput?.value.trim() || "";
  if (!task) {
    showToast(currentLang === "en" ? "Describe an agent task first." : "请先描述 Agent 任务。");
    agentPrompt?.focus();
    return;
  }
  setSubagentsMode(Boolean(subagentsToggle?.checked));
  if (agentPrompt) agentPrompt.value = "";
  setAgentPanelOpen(false);
  await submitChatMessage(task, {
    agentMode: true,
    subagentsEnabled: true,
    forcedThinkingMode: "no-thinking"
  });
}

function setDeepThinkModeActive(active) {
  const next = Boolean(active);
  if (next) ensureFreshChatThread(currentLang === "en" ? "Deep thinking" : "深度思考");
  deepThinkModeActive = next;
  deepThinkModeChip?.classList.toggle("hidden", !deepThinkModeActive);
  chatForm?.classList.toggle("deep-think-active", deepThinkModeActive);
  if (deepThinkModeActive) closeCommandMenu();
}

function ensureFreshChatThread(title = "") {
  const currentThread = ensureActiveChatThread();
  if (!currentThread.messages.length) {
    if (title && !currentThread.title) currentThread.title = title;
    syncActiveChatMessages();
    renderChatConversationList();
    renderChatMessages();
    return currentThread;
  }
  const thread = createChatThread([], title);
  state.chatThreads.unshift(thread);
  state.activeChatThreadId = thread.id;
  syncActiveChatMessages();
  renderChatConversationList();
  renderChatMessages();
  autoSave();
  return thread;
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
    for (const role of ["analysis", "chat", "image", "asr", "realtime", "deepthink"]) {
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
      state.sourceDataUrlHash = null;

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
  if (node.sourceCard) return Boolean(node.sourceCard.imageUrl || node.sourceCard.imageHash);
  // Option nodes (not yet generated) can be researched
  if (node.option && !node.generated) return true;
  return false;
}

function setResearchButtonBusy(isBusy, label = t("research.button")) {
  if (!researchButton) return;
  researchButton.disabled = Boolean(isBusy);
  researchButton.classList.toggle("is-busy", Boolean(isBusy));
  researchButton.textContent = isBusy ? label : t("research.button");
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
  setResearchButtonBusy(true, t("research.button"));

  try {
    let data;
    if (state.sourceType === "image") {
      const sourceImageDataUrl = await getSourceImageDataUrl();
      data = await postJson("/api/analyze-explore", {
        imageDataUrl: sourceImageDataUrl,
        fileName: state.fileName,
        thinkingMode: "thinking"
      }, {
        timeoutMs: 180000,
        timeoutMessage: t("research.timeout")
      });
    } else if (state.sourceType === "url") {
      data = await postJson("/api/analyze-explore", {
        url: state.sourceUrl,
        thinkingMode: "thinking"
      }, {
        timeoutMs: 180000,
        timeoutMessage: t("research.timeout")
      });
    } else {
      data = await postJson("/api/analyze-explore", {
        text: state.sourceText,
        dataUrl: state.sourceDataUrl,
        fileName: state.fileName,
        thinkingMode: "thinking"
      }, {
        timeoutMs: 180000,
        timeoutMessage: t("research.timeout")
      });
    }

    renderAnalysis(data);
    renderExploreOptions(data.options || [], data.references || []);
    state.latestAnalysis = data;
    setStatus(data.warningCode === "explore_fallback" ? t("research.fallbackComplete") : t("research.exploreComplete"), "ready");
    autoSave();
  } catch (error) {
    setStatus(error.message || "Explore failed", "error");
  } finally {
    setResearchButtonBusy(false);
  }
}

async function analyzeSource(mode = "analyze") {
  if (state.sourceType === "image" && !state.sourceImage) return;
  if (state.sourceType === "text" && !state.sourceText && !state.sourceDataUrl) return;
  if (state.sourceType === "url" && !state.sourceUrl) return;

  setStatus(t("status.busy"), "busy");
  setResearchButtonBusy(true, t("research.analyze"));

  try {
    let data;
    if (state.sourceType === "image") {
      const sourceImageDataUrl = await getSourceImageDataUrl();
      data = await postJson("/api/analyze", {
        imageDataUrl: sourceImageDataUrl,
        fileName: state.fileName,
        thinkingMode: mode === "explore" ? "thinking" : state.thinkingMode
      }, {
        timeoutMs: 150000,
        timeoutMessage: t("research.timeout")
      });
    } else if (state.sourceType === "url") {
      data = await postJson("/api/analyze-url", { url: state.sourceUrl, thinkingMode: mode === "explore" ? "thinking" : state.thinkingMode }, {
        timeoutMs: 150000,
        timeoutMessage: t("research.timeout")
      });
    } else {
      data = await postJson("/api/analyze-text", {
        text: state.sourceText,
        dataUrl: state.sourceDataUrl,
        fileName: state.fileName,
        thinkingMode: mode === "explore" ? "thinking" : state.thinkingMode
      }, {
        timeoutMs: 150000,
        timeoutMessage: t("research.timeout")
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
    setResearchButtonBusy(false);
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

function findJunctionForCard(cardId) {
  for (const [junctionId, junction] of state.junctions) {
    if (junction.connectedCardIds.includes(cardId)) {
      return junctionId;
    }
  }
  return null;
}

function buildSelectedNodeContext() {
  const nodeId = state.selectedNodeId;
  if (!nodeId) return null;
  const node = state.nodes.get(nodeId);
  if (!node) return null;

  let type = "unknown";
  if (nodeId === "source") type = "source";
  else if (nodeId === "analysis") type = "analysis";
  else if (node.sourceCard) type = "source-card";
  else if (node.generated) type = "generated";
  else if (node.option) type = "option";

  const title = node.sourceCard?.title || node.option?.title || node.id;
  const summary = node.explanation || node.sourceCard?.summary || node.option?.description || state.latestAnalysis?.summary || "";
  const prompt = node.option?.prompt || node.sourceCard?.summary || "";

  const context = {
    id: nodeId,
    type,
    title,
    summary,
    prompt,
    x: Math.round(node.x || 0),
    y: Math.round(node.y || 0),
    generated: Boolean(node.generated),
    hasReferences: Boolean(node.option?.references?.length)
  };

  // Include blueprint relationships if this card belongs to a junction
  const junctionId = findJunctionForCard(nodeId);
  if (junctionId) {
    const blueprint = state.blueprints.get(junctionId);
    if (blueprint?.relationships?.length > 0) {
      context.blueprint = {
        junctionId,
        relationships: blueprint.relationships.map(r => ({
          from: r.from,
          to: r.to,
          type: r.type
        }))
      };
    }
  }

  return context;
}

async function handleChatSubmit(event) {
  event.preventDefault();
  const message = chatInput.value.trim();
  if (!message) return;
  if (message.startsWith("/")) {
    const resolved = resolveWorkbenchCommandFromInput(message);
    const command = resolved?.command || getFilteredCommands()[activeCommandIndex];
    if (command) {
      if (command.id === "search-card") {
        const cards = getFilteredCards();
        if (cards.length > 0) {
          locateCard(cards[0].id, cards[0].title);
        } else {
          showToast(t("command.searchCardEmpty"));
        }
        return;
      }
      await executeWorkbenchCommand(command.id);
    }
    return;
  }
  if (deepThinkModeActive) {
    await startDeepThink(message);
    return;
  }

  await submitChatMessage(message);
}

async function submitChatMessage(message, options = {}) {
  const text = String(message || "").trim();
  if (!text) return;
  const subagentsEnabled = Boolean(options.subagentsEnabled ?? state.subagentsEnabled);
  const inferredAgentMode = subagentsEnabled && shouldUseClientAgentMode(text);
  const agentMode = Boolean(options.agentMode || inferredAgentMode);
  const effectiveThinkingMode = options.forcedThinkingMode || (agentMode ? "no-thinking" : state.thinkingMode);

  chatInput.value = "";
  updateChatPrimaryButtonMode();
  updateActiveChatThreadTitle(text);
  appendChatMessage("user", text);
  const pendingAssistant = effectiveThinkingMode === "thinking"
    ? appendChatMessage("assistant", "", {
        pending: true,
        thinkingRequested: true
      })
    : null;
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
      if (selectedContext.blueprint?.relationships?.length > 0) {
        const relDescriptions = selectedContext.blueprint.relationships.map(r => {
          const fromNode = state.nodes.get(r.from);
          const toNode = state.nodes.get(r.to);
          const fromTitle = fromNode?.option?.title || r.from;
          const toTitle = toNode?.option?.title || r.to;
          const typeLabel = r.type === "upstream" ? "上游依赖" : r.type === "downstream" ? "下游影响" : "并列关系";
          return `${fromTitle} -> ${toTitle} (${typeLabel})`;
        });
        const blueprintContextText = `蓝图关系: ${relDescriptions.join("; ")}`;
        systemContext += "\n\n" + blueprintContextText;
      }
    }

    const data = await postJson("/api/chat", {
      message: text,
      imageDataUrl: sourceImageDataUrl,
      analysis: state.latestAnalysis,
      messages: state.chatMessages.slice(-8),
      systemContext,
      selectedContext,
      canvas: buildVoiceCanvasContext(),
      language: currentLang,
      selectedNodeId: state.selectedNodeId,
      thinkingMode: effectiveThinkingMode,
      agentMode,
      subagentsEnabled
    });
    const assistantMeta = {
      pending: false,
      thinkingTrace: data.thinkingTrace || data.trace,
      thinkingContent: data.thinkingContent || data.reasoningContent || data.reasoning,
      thinkingRequested: effectiveThinkingMode === "thinking",
      actions: data.actions || data.action,
      artifacts: data.artifacts || data.agentPlan || []
    };
    if (pendingAssistant) {
      updateChatMessage(pendingAssistant, {
        content: data.reply || t("chat.systemContext"),
        ...assistantMeta
      });
    } else {
      appendChatMessage("assistant", data.reply || t("chat.systemContext"), assistantMeta);
    }
    const returnedActions = data?.actions || data?.action;
    if (returnedActions) {
      await applyVoiceActions(returnedActions);
    }
    setStatus(t("status.ready"), "ready");
    autoSave();
  } catch (error) {
    const errorText = error.message || (currentLang === "en" ? "Chat request failed." : "对话请求失败。");
    if (pendingAssistant) {
      updateChatMessage(pendingAssistant, { content: errorText, pending: false });
    } else {
      appendChatMessage("assistant", errorText);
    }
    setStatus(t("status.error"), "error");
  } finally {
    if (chatRealtimeButton) chatRealtimeButton.disabled = false;
    updateChatPrimaryButtonMode();
    chatInput.focus();
  }
}

function shouldUseClientAgentMode(message) {
  return /(agent|subagent|代理|自动|自主|连续任务|一系列|多步|分步骤|规划并执行|完成整个|帮我做完|multi[-\s]?step|long task)/i.test(String(message || ""));
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

async function startDeepThink(explicitPrompt = "", options = {}) {
  if (deepThinkBusy) return;

  const parentNodeId = state.selectedNodeId || (state.nodes.has("analysis") ? "analysis" : "source");
  if (!state.nodes.has(parentNodeId)) {
    showSelectionToast(t("chat.selectCardFirst"));
    return;
  }

  const typedPrompt = String(explicitPrompt || chatInput?.value.trim() || "").trim();
  const selectedContext = buildSelectedNodeContext();
  const prompt = typedPrompt || selectedContext?.summary || state.latestAnalysis?.summary || state.fileName || t("chat.deepThink");
  deepThinkBusy = true;
  if (chatDeepThinkAction) chatDeepThinkAction.disabled = true;
  setStatus(t("deepthink.busy"), "busy");

  const shouldAppendUser = options.appendUser !== false;
  if (typedPrompt && shouldAppendUser) {
    updateActiveChatThreadTitle(typedPrompt);
    appendChatMessage("user", typedPrompt);
    if (chatInput) chatInput.value = "";
    updateChatPrimaryButtonMode();
  }
  const pendingAssistant = appendChatMessage("assistant", "", {
    pending: true,
    artifacts: [{
      type: "deep-think",
      title: currentLang === "en" ? "Collecting research material" : "正在收集研究素材",
      summary: currentLang === "en" ? "Web, document, image, and action cards will appear here when the model returns them." : "模型返回网页、文档、图片和动作卡片后会展示在这里。",
      status: currentLang === "en" ? "running" : "运行中"
    }]
  });

  try {
    const data = await postJson("/api/deep-think", {
      message: prompt,
      language: currentLang,
      selectedContext,
      selectedNodeId: parentNodeId,
      analysis: state.latestAnalysis,
      messages: state.chatMessages.slice(-8),
      canvas: buildVoiceCanvasContext()
    });
    updateChatMessage(pendingAssistant, {
      content: data.reply || t("deepthink.complete"),
      pending: false,
      thinkingContent: data.thinkingContent || data.reasoningContent || data.reasoning,
      artifacts: buildDeepThinkArtifacts(data)
    });
    const created = applyDeepThinkPlan(data, parentNodeId);
    if (Array.isArray(data?.actions) && data.actions.length) {
      await applyVoiceActions(data.actions);
    } else if (created[0]) {
      forceSelectNode(created[0]);
    }
    setStatus(t("deepthink.complete"), "ready");
    autoSave();
  } catch (error) {
    updateChatMessage(pendingAssistant, {
      content: error.message || t("status.error"),
      pending: false,
      artifacts: []
    });
    setStatus(t("status.error"), "error");
  } finally {
    deepThinkBusy = false;
    if (chatDeepThinkAction) chatDeepThinkAction.disabled = false;
    chatInput?.focus();
  }
}

function applyDeepThinkPlan(plan, parentNodeId) {
  const parentNode = state.nodes.get(parentNodeId);
  if (!parentNode) return [];
  const cards = Array.isArray(plan?.cards) ? plan.cards.slice(0, 8) : [];
  const createdIds = [];
  const visibleRows = Math.min(cards.length || 1, 4);

  cards.forEach((card, index) => {
    const type = normalizeDeepThinkCardType(card?.type);
    const row = index % 4;
    const col = Math.floor(index / 4);
    const x = (parentNode.x || 0) + 410 + col * 360;
    const y = (parentNode.y || 0) + (row - (visibleRows - 1) / 2) * 210;
    const queryLine = card?.query ? `\n${currentLang === "en" ? "Query" : "检索"}: ${card.query}` : "";
    const urlLine = card?.url ? `\nURL: ${card.url}` : "";
    const option = {
      id: `deep-${Date.now()}-${index}-${safeNodeSlug(card?.id || card?.title || type)}`,
      title: String(card?.title || t("chat.deepThink")).slice(0, 48),
      description: `${String(card?.summary || "").slice(0, 240)}${queryLine}${urlLine}`.trim(),
      prompt: String(card?.prompt || card?.summary || card?.query || "").slice(0, 1200),
      tone: deepThinkTypeLabel(type),
      layoutHint: "deep-think",
      deepThinkType: type,
      references: buildDeepThinkReferences(card),
      x,
      y
    };
    const nodeId = createOptionNode(option, parentNodeId);
    if (nodeId) createdIds.push(nodeId);
  });

  const extraLinks = Array.isArray(plan?.links) ? plan.links : [];
  extraLinks.forEach((link) => {
    const from = createdIds[Number(link?.from)];
    const to = createdIds[Number(link?.to)];
    if (from && to && from !== to) {
      state.links.push({ from, to, kind: "deep-think", label: String(link?.label || "") });
    }
  });

  applyCollapseState();
  updateCounts();
  drawLinks();
  return createdIds;
}

function buildDeepThinkArtifacts(plan) {
  const cards = Array.isArray(plan?.cards) ? plan.cards : [];
  const references = Array.isArray(plan?.references) ? plan.references : [];
  const cardArtifacts = cards.map((card) => ({
    type: normalizeDeepThinkCardType(card?.type),
    title: card?.title || card?.query || card?.url || t("chat.deepThink"),
    summary: card?.summary || card?.prompt || "",
    url: card?.url || "",
    query: card?.query || "",
    status: deepThinkTypeLabel(normalizeDeepThinkCardType(card?.type))
  }));
  const referenceArtifacts = references.map((reference) => ({
    type: reference?.type || "web",
    title: reference?.title || reference?.url || "Reference",
    summary: reference?.description || "",
    url: reference?.url || "",
    status: reference?.type || "web"
  }));
  return normalizeChatArtifacts([...cardArtifacts, ...referenceArtifacts]);
}

function normalizeDeepThinkCardType(type) {
  return ["direction", "web", "image", "file", "api", "note"].includes(type) ? type : "note";
}

function deepThinkTypeLabel(type) {
  const zh = {
    direction: "方向",
    web: "网页",
    image: "图片",
    file: "文件",
    api: "动作",
    note: "笔记"
  };
  const en = {
    direction: "direction",
    web: "web",
    image: "image",
    file: "file",
    api: "action",
    note: "note"
  };
  return (currentLang === "en" ? en : zh)[type] || type;
}

function buildDeepThinkReferences(card) {
  const references = [];
  if (card?.url) {
    references.push({
      title: card.title || card.url,
      url: card.url,
      description: card.summary || "",
      type: card.type === "image" ? "image" : "web"
    });
  }
  if (card?.query) {
    references.push({
      title: currentLang === "en" ? "Search query" : "检索线索",
      url: `https://www.google.com/search?q=${encodeURIComponent(card.query)}`,
      description: card.query,
      type: "web"
    });
  }
  return references;
}

function safeNodeSlug(value) {
  return String(value || "card")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "card";
}

async function toggleAsrDictation() {
  if (voiceState.asrRecorder) {
    stopAsrRecorder();
    return;
  }
  await startAsrDictation(chatInput);
}

async function toggleViewerAsrDictation() {
  if (voiceState.asrRecorder) {
    stopAsrRecorder();
    cleanupAsrDraft({ restore: false });
    viewerAsrButton?.classList.remove("is-recording");
    return;
  }
  await startAsrDictation(viewerPromptInput, { silent: true });
  viewerAsrButton?.classList.add("is-recording");
}

async function startAsrDictation(targetInput, { silent = false } = {}) {
  if (!canRecordAudio({ mediaRecorder: true })) return;

  const sessionId = voiceState.asrSessionId + 1;
  voiceState.asrSessionId = sessionId;
  voiceState.asrTargetInput = targetInput || chatInput;
  voiceState.asrBaseText = voiceState.asrTargetInput?.value || "";
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
    if (!silent) setAsrReviewMode(true);
    voiceState.asrTargetInput?.classList.add("has-asr-draft");
    chatAsrButton?.classList.add("is-recording");
    if (!silent) setStatus(t("voice.asrListening"), "busy");

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
    if (!silent) setStatus(t("voice.permissionDenied"), "error");
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
      const target = voiceState.asrTargetInput || chatInput;
      if (target) target.value = pieces.join(voiceState.asrBaseText.trim() ? " " : "");
      if (target === chatInput) updateChatPrimaryButtonMode();
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
  const target = voiceState.asrTargetInput || chatInput;
  if (restore && target) {
    target.value = voiceState.asrBaseText;
  }
  voiceState.asrBaseText = "";
  voiceState.asrTranscript = "";
  voiceState.asrBusy = false;
  voiceState.asrTargetInput?.classList.remove("has-asr-draft");
  voiceState.asrTargetInput = null;
  chatAsrButton?.classList.remove("is-recording");
  viewerAsrButton?.classList.remove("is-recording");
  setAsrReviewMode(false);
  updateChatPrimaryButtonMode();
  setStatus(t("status.ready"), "ready");
}

function setAsrReviewMode(active) {
  chatVoiceActions?.classList.toggle("hidden", active);
  chatAsrReview?.classList.toggle("hidden", !active);
}

async function toggleRealtimeVoice() {
  if (voiceState.realtimeStream) {
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
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) {
      stopMediaStream(stream);
      setStatus(t("voice.unsupported"), "error");
      return;
    }
    const audioContext = new AudioContextCtor();
    const source = audioContext.createMediaStreamSource(stream);
    const processor = audioContext.createScriptProcessor(4096, 1, 1);

    processor.onaudioprocess = (event) => {
      const input = event.inputBuffer.getChannelData(0);
      voiceState.realtimePcmChunks.push(floatToPcm16(input, audioContext.sampleRate, 16000));
    };
    source.connect(processor);
    processor.connect(audioContext.destination);

    voiceState.realtimeStream = stream;
    voiceState.realtimeAudioContext = audioContext;
    voiceState.realtimeSource = source;
    voiceState.realtimeProcessor = processor;
    voiceState.realtimePcmChunks = [];
    voiceState.realtimeFlushTimer = window.setInterval(() => {
      flushRealtimePcmChunk(sessionId);
    }, 3200);
    chatRealtimeButton?.classList.add("is-listening");
    renderAllText();
    setStatus(t("voice.realtimeListening"), "busy");
  } catch (error) {
    stopRealtimeVoice();
    setStatus(t("voice.permissionDenied"), "error");
    showToast(error?.message || t("voice.permissionDenied"));
  }
}

function stopRealtimeVoice() {
  voiceState.realtimeSessionId += 1;
  if (voiceState.realtimeFlushTimer) {
    window.clearInterval(voiceState.realtimeFlushTimer);
    voiceState.realtimeFlushTimer = null;
  }
  voiceState.realtimeProcessor?.disconnect();
  voiceState.realtimeSource?.disconnect();
  voiceState.realtimeAudioContext?.close?.().catch(() => {});
  stopMediaStream(voiceState.realtimeStream);
  voiceState.realtimeStream = null;
  voiceState.realtimeRecorder = null;
  voiceState.realtimeAudioContext = null;
  voiceState.realtimeSource = null;
  voiceState.realtimeProcessor = null;
  voiceState.realtimePcmChunks = [];
  voiceState.realtimeBusy = false;
  chatRealtimeButton?.classList.remove("is-listening");
  renderAllText();
  setStatus(t("status.ready"), "ready");
}

function flushRealtimePcmChunk(sessionId) {
  if (!voiceState.realtimePcmChunks.length || voiceState.realtimeBusy || sessionId !== voiceState.realtimeSessionId) return;
  const pcmBase64 = pcmChunksToBase64(voiceState.realtimePcmChunks);
  voiceState.realtimePcmChunks = [];
  handleRealtimeVoiceChunk(pcmBase64, sessionId);
}

async function handleRealtimeVoiceChunk(pcmBase64, sessionId) {
  if (voiceState.realtimeBusy || sessionId !== voiceState.realtimeSessionId) return;
  voiceState.realtimeBusy = true;

  try {
    const data = await postJson("/api/realtime-voice", {
      pcmBase64,
      sampleRate: 16000,
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
    await applyVoiceActions(data.actions || data.action);
  } catch (error) {
    setStatus(error?.message || t("status.error"), "error");
  } finally {
    voiceState.realtimeBusy = false;
  }
}

function buildVoiceCanvasContext() {
  const visibleNodes = Array.from(state.nodes.values()).filter(isNodeVisible).map((node) => ({
    id: node.id,
    title: getNodeTitle(node),
    type: getNodeType(node),
    summary: getNodeSummary(node).slice(0, 220),
    prompt: String(node.option?.prompt || "").slice(0, 260),
    x: Math.round(node.x || 0),
    y: Math.round(node.y || 0),
    width: Math.round(node.width || node.element?.offsetWidth || 0),
    height: Math.round(node.height || node.element?.offsetHeight || 0),
    generated: Boolean(node.generated),
    hasReferences: Boolean(node.option?.references?.length)
  })).slice(0, 40);
  return {
    selectedNodeId: state.selectedNodeId,
    generatedCount: state.generatedCount,
    view: {
      x: Math.round(state.view.x || 0),
      y: Math.round(state.view.y || 0),
      scale: Number(state.view.scale || 1).toFixed(2)
    },
    source: {
      type: state.sourceType,
      fileName: state.fileName || "",
      hasImage: Boolean(state.sourceImage),
      hasText: Boolean(state.sourceText || state.sourceDataUrl),
      url: state.sourceUrl || ""
    },
    capabilities: [
      "pan_view",
      "focus_node",
      "select_node",
      "move_node",
      "arrange_canvas",
      "deselect",
      "select_source",
      "select_analysis",
      "create_direction",
      "create_web_card",
      "create_agent",
      "generate_image",
      "analyze_source",
      "explore_source",
      "research_node",
      "open_references",
      "save_session",
      "new_chat",
      "open_chat_history",
      "close_chat",
      "open_chat",
      "open_history",
      "open_settings",
      "set_thinking_mode",
      "set_deep_think_mode"
    ],
    visibleNodes
  };
}

async function applyVoiceActions(value) {
  const actions = Array.isArray(value) ? value : (value ? [value] : []);
  for (const action of actions) {
    const type = typeof action === "string" ? action : action?.type || action?.name;
    if (!type) continue;
    await executeCanvasAction(typeof action === "string" ? { type } : { ...action, type });
  }
  autoSave();
}

async function executeCanvasAction(action) {
  const type = String(action?.type || "").trim();
  if (!type) return;

  if (type === "zoom_in") return zoomBy(0.08);
  if (type === "zoom_out") return zoomBy(-0.08);
  if (type === "set_zoom") return setCanvasZoom(action);
  if (type === "reset_view") return resetView();
  if (type === "pan_view") return panCanvasView(action);
  if (type === "focus_node") return focusNodeByAction(action);
  if (type === "arrange_canvas") return arrangeCanvasLayout();
  if (type === "deselect") return deselectNode();
  if (type === "select_source") return focusNodeById("source");
  if (type === "select_analysis") return focusNodeById("analysis");
  if (type === "select_node") return focusNodeByAction(action);
  if (type === "move_node") return moveNodeByAction(action);
  if (type === "create_direction") return createDirectionFromAction(action);
  if (type === "create_web_card") return createDirectionFromAction({ ...action, mode: action.mode || "web" });
  if (type === "create_agent") return showAgentAction(action);
  if (type === "generate_image") return generateImageFromAction(action);
  if (type === "analyze_source") return analyzeSource(action.mode || "analyze");
  if (type === "explore_source" || type === "research_source") return exploreSource();
  if (type === "research_node") return researchNodeFromAction(action);
  if (type === "open_references") return openReferencesFromAction(action);
  if (type === "save_session") return saveSession();
  if (type === "new_chat") return startNewChat();
  if (type === "open_chat_history") return toggleChatConversationPanel();
  if (type === "close_chat") return setChatSidebarOpen(false);
  if (type === "open_chat") return setChatSidebarOpen(true);
  if (type === "open_history") {
    window.location.href = "/history/";
    return;
  }
  if (type === "open_settings") {
    window.location.href = "/history/?view=settings";
    return;
  }
  if (type === "set_thinking_mode") return setThinkingModeFromAction(action);
  if (type === "set_deep_think_mode") return setDeepThinkModeFromAction(action);
  if (type === "open_upload") return handleAttachClick();
  if (type === "delete_node") return deleteNodeFromAction(action);
}

function getNodeType(node) {
  if (!node) return "unknown";
  if (node.id === "source") return "source";
  if (node.id === "analysis") return "analysis";
  if (node.sourceCard) return "source-card";
  if (node.generated) return "generated";
  if (node.option) return "option";
  return "node";
}

function getNodeTitle(node) {
  if (!node) return "";
  if (node.id === "source") return state.fileName || sourceName?.textContent || "source";
  if (node.id === "analysis") return state.latestAnalysis?.title || "analysis";
  if (node.sourceCard) return node.sourceCard.title || node.sourceCard.fileName || node.id;
  return node.option?.title || node.id;
}

function getNodeSummary(node) {
  if (!node) return "";
  if (node.id === "analysis") return state.latestAnalysis?.summary || analysisSummary?.textContent || "";
  if (node.id === "source") return state.fileName || state.sourceUrl || state.sourceText || "";
  if (node.sourceCard) return node.sourceCard.summary || node.sourceCard.fileName || "";
  return node.explanation || node.option?.description || node.option?.prompt || "";
}

function normalizeMatchText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[\s"'`.,:;!?()[\]{}<>，。！？；：、（）【】《》]/g, "");
}

function resolveDirectNodeId(value) {
  const text = String(value || "").trim();
  if (!text) return null;
  if (state.nodes.has(text)) return text;
  if (!text.startsWith("option-") && state.nodes.has(`option-${text}`)) return `option-${text}`;
  const lowered = text.toLowerCase();
  if (["source", "src", "image", "upload", "file"].includes(lowered) || /源|原图|图片|文件|上传/.test(text)) {
    return state.nodes.has("source") ? "source" : null;
  }
  if (["analysis", "report", "summary"].includes(lowered) || /分析|报告|摘要|总结/.test(text)) {
    return state.nodes.has("analysis") ? "analysis" : null;
  }
  return null;
}

function resolveNodeIdByText(value) {
  const direct = resolveDirectNodeId(value);
  if (direct) return direct;
  const needle = normalizeMatchText(value);
  if (!needle) return null;

  let best = null;
  let bestScore = 0;
  for (const node of state.nodes.values()) {
    const haystacks = [
      node.id,
      getNodeTitle(node),
      getNodeSummary(node),
      node.option?.prompt || "",
      node.option?.tone || ""
    ].map(normalizeMatchText).filter(Boolean);

    for (const haystack of haystacks) {
      let score = 0;
      if (haystack === needle) score = 100;
      else if (haystack.includes(needle)) score = Math.min(90, 30 + needle.length);
      else if (needle.includes(haystack) && haystack.length > 2) score = Math.min(80, 20 + haystack.length);
      if (score > bestScore) {
        bestScore = score;
        best = node.id;
      }
    }
  }
  return bestScore >= 32 ? best : null;
}

function resolveActionNodeId(action, fallbackId = null) {
  if (!action || typeof action !== "object") return fallbackId;
  const direct = resolveDirectNodeId(action.nodeId);
  if (direct) return direct;
  const named = [
    action.nodeName,
    action.target,
    action.title,
    action.query
  ].map(resolveNodeIdByText).find(Boolean);
  return named || fallbackId;
}

function resolveParentNodeId(action, fallbackId = null) {
  const parent = resolveDirectNodeId(action?.parentNodeId) || resolveNodeIdByText(action?.parentNodeName);
  return parent || fallbackId;
}

function resolveAnchorNodeId(action, movingNodeId = null) {
  const anchor = resolveDirectNodeId(action?.anchorNodeId) ||
    resolveNodeIdByText(action?.anchorNodeName) ||
    resolveDirectNodeId(action?.parentNodeId) ||
    resolveNodeIdByText(action?.parentNodeName);
  return anchor && anchor !== movingNodeId ? anchor : null;
}

function focusNodeById(nodeId, position = "center") {
  if (!state.nodes.has(nodeId)) return;
  revealNode(nodeId);
  forceSelectNode(nodeId);
  focusNodeInViewport(nodeId, position);
}

function focusNodeByAction(action) {
  const nodeId = resolveActionNodeId(action, state.selectedNodeId);
  if (!nodeId) return;
  focusNodeById(nodeId, action.position || action.direction || "center");
}

function revealNode(nodeId) {
  if (!nodeId) return;
  state.selectiveHidden.delete(nodeId);
  let current = nodeId;
  for (let depth = 0; depth < 20; depth += 1) {
    const parentLink = state.links.find((link) => link.to === current);
    if (!parentLink) break;
    state.collapsed.delete(parentLink.from);
    state.selectiveHidden.delete(parentLink.from);
    current = parentLink.from;
  }
  applyCollapseState();
}

function forceSelectNode(nodeId) {
  if (!state.nodes.has(nodeId)) return;
  if (state.selectedNodeId === nodeId) {
    updateDialogState();
    return;
  }
  deselectNode();
  state.selectedNodeId = nodeId;
  const node = state.nodes.get(nodeId);
  if (node?.element) {
    node.element.classList.add("is-selected");
    node.element.style.zIndex = "9";
  }
  updateDialogState();
}

function normalizePositionKey(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "right";
  if (/上|顶部|上方/.test(raw)) return raw.includes("left") || /左/.test(raw) ? "upper-left" : raw.includes("right") || /右/.test(raw) ? "upper-right" : "above";
  if (/下|底部|下方/.test(raw)) return raw.includes("left") || /左/.test(raw) ? "lower-left" : raw.includes("right") || /右/.test(raw) ? "lower-right" : "below";
  if (/左/.test(raw)) return raw.includes("upper") || /上/.test(raw) ? "upper-left" : raw.includes("lower") || /下/.test(raw) ? "lower-left" : "left";
  if (/右/.test(raw)) return raw.includes("upper") || /上/.test(raw) ? "upper-right" : raw.includes("lower") || /下/.test(raw) ? "lower-right" : "right";
  if (raw.includes("top")) return raw.includes("left") ? "upper-left" : raw.includes("right") ? "upper-right" : "above";
  if (raw.includes("bottom")) return raw.includes("left") ? "lower-left" : raw.includes("right") ? "lower-right" : "below";
  if (raw.includes("screen")) return "screen-center";
  if (raw.includes("canvas")) return "canvas-center";
  if (raw.includes("center") || /中间|中央/.test(raw)) return "center";
  return raw;
}

function viewportRatiosForPosition(position) {
  const key = normalizePositionKey(position);
  const ratio = { x: 0.5, y: 0.5 };
  if (key.includes("left")) ratio.x = 0.32;
  if (key.includes("right")) ratio.x = 0.68;
  if (key.includes("upper") || key === "above") ratio.y = 0.32;
  if (key.includes("lower") || key === "below") ratio.y = 0.68;
  return ratio;
}

function focusNodeInViewport(nodeId, position = "center") {
  const node = state.nodes.get(nodeId);
  if (!node || !viewport) return;
  const rect = viewport.getBoundingClientRect();
  const ratio = viewportRatiosForPosition(position);
  const nodeCenterX = (node.x || 0) + (node.width || node.element?.offsetWidth || 0) / 2;
  const nodeCenterY = (node.y || 0) + (node.height || node.element?.offsetHeight || 0) / 2;
  state.view.x = rect.width * ratio.x - nodeCenterX * state.view.scale;
  state.view.y = rect.height * ratio.y - nodeCenterY * state.view.scale;
  updateBoardTransform();
}

function boardPointForViewportPosition(position = "center") {
  const rect = viewport?.getBoundingClientRect();
  if (!rect) return { x: 0, y: 0 };
  const ratio = viewportRatiosForPosition(position);
  return {
    x: (rect.width * ratio.x - state.view.x) / state.view.scale,
    y: (rect.height * ratio.y - state.view.y) / state.view.scale
  };
}

function setNodeBoardPosition(nodeId, x, y) {
  const node = state.nodes.get(nodeId);
  if (!node) return;
  const nextX = clamp(Number(x), -1200, 5200);
  const nextY = clamp(Number(y), -1200, 3600);
  node.x = nextX;
  node.y = nextY;
  node.element.style.left = `${nextX}px`;
  node.element.style.top = `${nextY}px`;
  drawLinks();
}

function relativePosition(anchor, node, position) {
  const key = normalizePositionKey(position);
  const gap = 90;
  const nodeWidth = node.width || node.element?.offsetWidth || 318;
  const nodeHeight = node.height || node.element?.offsetHeight || 220;
  const anchorWidth = anchor.width || anchor.element?.offsetWidth || 318;
  const anchorHeight = anchor.height || anchor.element?.offsetHeight || 220;
  const centerX = (anchor.x || 0) + anchorWidth / 2 - nodeWidth / 2;
  const centerY = (anchor.y || 0) + anchorHeight / 2 - nodeHeight / 2;

  if (key === "left") return { x: (anchor.x || 0) - nodeWidth - gap, y: centerY };
  if (key === "right") return { x: (anchor.x || 0) + anchorWidth + gap, y: centerY };
  if (key === "above") return { x: centerX, y: (anchor.y || 0) - nodeHeight - gap };
  if (key === "below") return { x: centerX, y: (anchor.y || 0) + anchorHeight + gap };
  if (key === "upper-left") return { x: (anchor.x || 0) - nodeWidth - gap, y: (anchor.y || 0) - nodeHeight - gap };
  if (key === "upper-right") return { x: (anchor.x || 0) + anchorWidth + gap, y: (anchor.y || 0) - nodeHeight - gap };
  if (key === "lower-left") return { x: (anchor.x || 0) - nodeWidth - gap, y: (anchor.y || 0) + anchorHeight + gap };
  if (key === "lower-right") return { x: (anchor.x || 0) + anchorWidth + gap, y: (anchor.y || 0) + anchorHeight + gap };
  return { x: centerX, y: centerY };
}

function moveNodeByAction(action) {
  const nodeId = resolveActionNodeId(action, state.selectedNodeId);
  const node = nodeId ? state.nodes.get(nodeId) : null;
  if (!node) return;
  revealNode(nodeId);

  let x = Number.isFinite(action.x) ? action.x : null;
  let y = Number.isFinite(action.y) ? action.y : null;
  if (x === null || y === null) {
    const anchorId = resolveAnchorNodeId(action, nodeId);
    const anchor = anchorId ? state.nodes.get(anchorId) : null;
    if (anchor && !["screen-center", "canvas-center"].includes(normalizePositionKey(action.position))) {
      const position = relativePosition(anchor, node, action.position || action.direction || "right");
      x = position.x;
      y = position.y;
    } else {
      const point = boardPointForViewportPosition(action.position || "center");
      x = point.x - (node.width || node.element?.offsetWidth || 318) / 2;
      y = point.y - (node.height || node.element?.offsetHeight || 220) / 2;
    }
  }

  setNodeBoardPosition(nodeId, x, y);
  focusNodeById(nodeId, action.position || "center");
}

function createDirectionFromAction(action) {
  const fallbackParent = state.selectedNodeId || (state.nodes.has("analysis") ? "analysis" : "source");
  const parentId = resolveParentNodeId(action, fallbackParent);
  if (!parentId || !state.nodes.has(parentId)) return null;

  const text = String(action.prompt || action.query || action.description || action.title || "").trim();
  if (!text) return null;
  const isWebCard = action.type === "create_web_card" || Boolean(action.url);
  const references = isWebCard && action.url
    ? [{
        title: String(action.title || action.url).slice(0, 80),
        url: String(action.url).slice(0, 512),
        description: String(action.description || action.query || "").slice(0, 200),
        type: "web"
      }]
    : undefined;
  const nodeId = createOptionNode({
    id: `voice-${Date.now()}-${safeNodeSlug(action.title || text)}`,
    title: String(action.title || text).slice(0, 48),
    description: String(action.description || text),
    prompt: text,
    tone: String(action.mode || (isWebCard ? "web" : "voice")),
    layoutHint: isWebCard ? "reference" : "voice",
    references
  }, parentId);
  if (!nodeId) return null;

  if (action.position || action.anchorNodeId || action.anchorNodeName) {
    moveNodeByAction({ ...action, type: "move_node", nodeId, anchorNodeId: action.anchorNodeId || parentId });
  } else {
    focusNodeById(nodeId, "center");
  }
  return nodeId;
}

async function generateImageFromAction(action) {
  let nodeId = resolveActionNodeId(action, state.selectedNodeId);
  const target = nodeId ? state.nodes.get(nodeId) : null;
  if ((!target || target.id === "source" || target.id === "analysis") && (action.prompt || action.title || action.query)) {
    nodeId = createDirectionFromAction({ ...action, parentNodeId: target?.id || state.selectedNodeId || "analysis" });
  }

  const node = nodeId ? state.nodes.get(nodeId) : null;
  if (!node?.option) {
    showSelectionToast("Select a direction card before generating.");
    return;
  }
  if (node.generated) {
    focusNodeById(nodeId, "center");
    return;
  }
  revealNode(nodeId);
  forceSelectNode(nodeId);
  await generateOption(nodeId, node.option);
  focusNodeInViewport(nodeId, "center");
}

async function researchNodeFromAction(action) {
  const nodeId = resolveActionNodeId(action, state.selectedNodeId);
  const node = nodeId ? state.nodes.get(nodeId) : null;
  if (!node) return;
  focusNodeById(nodeId, "center");
  if (nodeId === "source" || nodeId === "analysis") {
    await exploreSource();
    return;
  }
  if (node.option?.references?.length) {
    openReferenceModal(nodeId);
    return;
  }
  const prompt = action.prompt || action.query || getNodeSummary(node) || getNodeTitle(node);
  await startDeepThink(prompt, { appendUser: false });
}

function openReferencesFromAction(action) {
  const nodeId = resolveActionNodeId(action, state.selectedNodeId);
  const node = nodeId ? state.nodes.get(nodeId) : null;
  if (!node?.option?.references?.length) {
    showSelectionToast("This card does not have references yet.");
    return;
  }
  forceSelectNode(nodeId);
  openReferenceModal(nodeId);
}

function showAgentAction(action) {
  const title = action.title || action.nodeName || "Subagent";
  showToast(`${title} · no-thinking`);
}

function setCanvasZoom(action) {
  const requested = Number(action.scale ?? action.amount);
  if (!Number.isFinite(requested)) return;
  state.view.scale = clamp(requested > 10 ? requested / 100 : requested, 0.45, 1.35);
  updateBoardTransform();
}

function panCanvasView(action) {
  const amount = Number.isFinite(action.amount) ? action.amount : 180;
  let dx = Number.isFinite(action.dx) ? action.dx : 0;
  let dy = Number.isFinite(action.dy) ? action.dy : 0;
  const direction = normalizePositionKey(action.direction || action.position || "");
  if (!dx && !dy) {
    if (direction.includes("left")) dx = -amount;
    else if (direction.includes("right")) dx = amount;
    if (direction.includes("upper") || direction === "above") dy = -amount;
    else if (direction.includes("lower") || direction === "below") dy = amount;
  }
  state.view.x += dx;
  state.view.y += dy;
  updateBoardTransform();
}

function setThinkingModeFromAction(action) {
  const mode = String(action.mode || action.target || action.title || "").toLowerCase();
  if (mode.includes("no") || mode.includes("fast") || mode.includes("quick") || /关闭|快速|普通/.test(mode)) {
    setThinkingMode("no-thinking");
  } else {
    setThinkingMode("thinking");
  }
}

function setDeepThinkModeFromAction(action) {
  const mode = String(action.mode || action.target || action.title || "").toLowerCase();
  const off = mode.includes("off") || mode.includes("false") || mode.includes("cancel") || mode.includes("disable") || /关闭|取消|停止/.test(mode);
  setDeepThinkModeActive(!off);
}

function deleteNodeFromAction(action) {
  const nodeId = resolveActionNodeId(action, state.selectedNodeId);
  if (!nodeId || nodeId === "source" || nodeId === "analysis") return;
  deleteNode(nodeId);
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

function canRecordAudio({ mediaRecorder = false } = {}) {
  if (!navigator.mediaDevices?.getUserMedia || (mediaRecorder && typeof MediaRecorder === "undefined")) {
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

function floatToPcm16(floatSamples, sourceSampleRate, targetSampleRate) {
  const ratio = sourceSampleRate / targetSampleRate;
  const outputLength = Math.max(1, Math.floor(floatSamples.length / ratio));
  const output = new Int16Array(outputLength);
  for (let i = 0; i < outputLength; i += 1) {
    const sourceIndex = Math.min(floatSamples.length - 1, Math.floor(i * ratio));
    const sample = Math.max(-1, Math.min(1, floatSamples[sourceIndex] || 0));
    output[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }
  return output;
}

function pcmChunksToBase64(chunks) {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const merged = new Int16Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  const bytes = new Uint8Array(merged.buffer);
  let binary = "";
  const blockSize = 0x8000;
  for (let i = 0; i < bytes.length; i += blockSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + blockSize));
  }
  return btoa(binary);
}

function createOptionNode(option, parentNodeId) {
  const parentNode = state.nodes.get(parentNodeId);
  if (!parentNode) return null;

  // Compute position offset from parent
  const offsetX = 380;
  const offsetY = 40;
  const newX = Number.isFinite(option.x) ? option.x : (parentNode.x || 0) + offsetX;
  const newY = Number.isFinite(option.y) ? option.y : (parentNode.y || 0) + offsetY;

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
  element.classList.toggle("deep-think-node", Boolean(option.deepThinkType));
  if (option.deepThinkType) element.dataset.deepThinkType = option.deepThinkType;
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
  if (option.references?.length) {
    const badge = document.createElement("span");
    badge.className = "reference-badge";
    badge.textContent = `${option.references.length}`;
    badge.title = `${option.references.length} reference${option.references.length > 1 ? "s" : ""}`;
    element.appendChild(badge);
  }

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

function createNewCardNode(seedText = "") {
  const text = String(seedText || "").trim();
  const anchor = state.selectedNodeId && state.nodes.has(state.selectedNodeId)
    ? state.nodes.get(state.selectedNodeId)
    : state.nodes.get("source");
  const baseX = (anchor?.x || 96) + (anchor?.width || 318) + 96;
  const baseY = (anchor?.y || 88) + 24;
  // Find a position that doesn't overlap existing nodes
  let newX = baseX;
  let newY = baseY;
  const jitter = 60;
  let attempts = 0;
  while (attempts < 10) {
    const collision = [...state.nodes.values()].some(n =>
      Math.abs(n.x - newX) < 300 && Math.abs(n.y - newY) < 200
    );
    if (!collision) break;
    newX += jitter * (attempts % 2 === 0 ? 1 : -1);
    newY += jitter * (Math.floor(attempts / 2) % 2 === 0 ? 1 : -1);
    attempts++;
  }

  const nodeId = `source-card-${Date.now().toString(36)}`;
  createStandaloneSourceCard({
    id: nodeId,
    title: text || (currentLang === "en" ? "New source card" : "新建源卡片"),
    x: newX,
    y: newY
  });
  autoSave();
  focusNodeById(nodeId, "center");
  return nodeId;
}

function createStandaloneSourceCard({ id, title, x, y, imageUrl = "", imageHash = "", fileName = "" }) {
  const nodeId = id || `source-card-${Date.now().toString(36)}`;
  if (state.nodes.has(nodeId)) return nodeId;

  const element = document.createElement("section");
  element.className = "node source-node standalone-source-node";
  element.dataset.nodeId = nodeId;
  element.style.left = `${x || 520}px`;
  element.style.top = `${y || 120}px`;

  const tabs = document.createElement("div");
  tabs.className = "source-tabs";
  const tab = document.createElement("button");
  tab.type = "button";
  tab.className = "source-tab active";
  tab.textContent = currentLang === "en" ? "File" : "文件";
  tabs.appendChild(tab);

  const upload = document.createElement("label");
  upload.className = `upload-target${imageUrl ? " has-source-image" : ""}`;
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/png,image/jpeg,image/webp,image/gif";
  const empty = document.createElement("span");
  empty.className = `empty-state${imageUrl ? " hidden" : ""}`;
  empty.innerHTML = `<strong>${currentLang === "en" ? "Upload image" : "上传图片"}</strong><span>${currentLang === "en" ? "Start a separate source card" : "创建独立素材卡片"}</span>`;
  const img = document.createElement("img");
  img.className = `source-preview${imageUrl ? " has-image" : ""}`;
  img.alt = title || "Source card";
  if (imageUrl) img.src = imageUrl;
  upload.append(input, empty, img);
  attachImageCardActions(upload, nodeId);

  const caption = document.createElement("div");
  caption.className = "node-caption";
  const name = document.createElement("span");
  name.className = "standalone-source-name";
  name.textContent = trimMiddle(fileName || title || (currentLang === "en" ? "New source card" : "新建源卡片"), 28);
  const research = document.createElement("button");
  research.className = "research-button";
  research.type = "button";
  research.textContent = t("research.button");
  research.disabled = !imageUrl;
  caption.append(name, research);

  element.append(tabs, upload, caption);
  board.appendChild(element);

  const sourceCard = {
    title: title || fileName || "Source card",
    fileName: fileName || "",
    imageHash: imageHash || "",
    imageUrl: imageUrl || "",
    sourceType: "image"
  };
  registerNode(nodeId, element, {
    x: Number.isFinite(x) ? x : 520,
    y: Number.isFinite(y) ? y : 120,
    width: 318,
    height: element.offsetHeight || 326,
    sourceCard
  });
  makeDraggable(element, nodeId);
  makeStandaloneSourceNameEditable(nodeId, name);

  input.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (file) await handleStandaloneSourceFile(nodeId, file);
    event.target.value = "";
  });
  research.addEventListener("click", () => analyzeStandaloneSourceCard(nodeId));

  if (!imageUrl) syncSourceCardImageActionState(nodeId);
  applyCollapseState();
  updateCounts();
  return nodeId;
}

function syncSourceCardImageActionState(nodeId) {
  const node = state.nodes.get(nodeId);
  const upload = node?.element?.querySelector(".upload-target");
  if (!upload) return;
  const hasImage = Boolean(node?.sourceCard?.imageUrl || node?.sourceCard?.imageHash);
  upload.classList.toggle("has-source-image", hasImage);
}

async function handleStandaloneSourceFile(nodeId, file) {
  if (!file?.type?.startsWith("image/")) {
    showToast(t("file.unsupported"));
    return;
  }
  const node = state.nodes.get(nodeId);
  if (!node?.sourceCard) return;
  setStatus(t("status.busy"), "busy");
  try {
    const image = await resizeImage(file, 1600, 0.88);
    const stored = await postJson("/api/assets", {
      dataUrl: image.dataUrl,
      kind: "upload",
      fileName: file.name
    });
    const imageUrl = `/api/assets/${stored.hash}?kind=upload`;
    node.sourceCard = {
      ...node.sourceCard,
      title: file.name,
      fileName: file.name,
      imageHash: stored.hash,
      imageUrl,
      sourceType: "image"
    };
    const img = node.element.querySelector(".source-preview");
    const empty = node.element.querySelector(".empty-state");
    const name = node.element.querySelector(".standalone-source-name");
    const research = node.element.querySelector(".research-button");
    if (img) {
      img.src = imageUrl;
      img.classList.add("has-image");
    }
    empty?.classList.add("hidden");
    if (name) name.textContent = trimMiddle(file.name, 28);
    if (research) research.disabled = false;
    syncSourceCardImageActionState(nodeId);
    setStatus(t("status.ready"), "ready");
    autoSave();
  } catch (error) {
    setStatus(error.message || t("status.error"), "error");
  }
}

async function analyzeStandaloneSourceCard(nodeId) {
  const node = state.nodes.get(nodeId);
  const sourceCard = node?.sourceCard;
  if (!sourceCard?.imageUrl && !sourceCard?.imageHash) return;
  forceSelectNode(nodeId);
  setStatus(t("status.busy"), "busy");
  const button = node.element.querySelector(".research-button");
  if (button) {
    button.disabled = true;
    button.classList.add("is-busy");
  }
  try {
    const imageDataUrl = await getImageDataUrlForNode(nodeId);
    const data = await postJson("/api/analyze", {
      imageDataUrl,
      fileName: sourceCard.fileName || sourceCard.title || "source-card",
      thinkingMode: state.thinkingMode
    }, {
      timeoutMs: 150000,
      timeoutMessage: t("research.timeout")
    });
    const option = {
      id: `analysis-${Date.now()}`,
      title: data.title || t("analysis.title"),
      description: data.summary || "",
      prompt: data.summary || "",
      tone: "analysis",
      layoutHint: "source-card",
      x: (node.x || 0) + 390,
      y: (node.y || 0) + 30
    };
    createOptionNode(option, nodeId);
    setStatus(t("status.ready"), "ready");
    autoSave();
  } catch (error) {
    setStatus(error.message || t("status.error"), "error");
  } finally {
    if (button) {
      button.disabled = false;
      button.classList.remove("is-busy");
    }
  }
}

function makeStandaloneSourceNameEditable(nodeId, titleElement) {
  if (!titleElement || titleElement.dataset.editable === "true") return;
  titleElement.dataset.editable = "true";
  titleElement.title = "Double-click to rename";
  titleElement.addEventListener("dblclick", (event) => {
    event.stopPropagation();
    event.preventDefault();
    if (titleElement.querySelector(".node-title-input")) return;
    const node = state.nodes.get(nodeId);
    const original = node?.sourceCard?.title || titleElement.textContent || "Source card";
    const input = document.createElement("input");
    input.type = "text";
    input.className = "node-title-input";
    input.value = original;
    titleElement.textContent = "";
    titleElement.appendChild(input);
    input.focus();
    input.select();

    let canceled = false;
    const save = () => {
      if (canceled) return;
      const next = sanitizeFileName(input.value || original);
      const latest = state.nodes.get(nodeId);
      if (latest?.sourceCard) {
        latest.sourceCard.title = next;
        latest.sourceCard.fileName = latest.sourceCard.fileName || next;
      }
      titleElement.textContent = trimMiddle(next, 28);
      autoSave();
    };
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        input.blur();
      } else if (e.key === "Escape") {
        e.preventDefault();
        canceled = true;
        titleElement.textContent = trimMiddle(original, 28);
      }
    });
    input.addEventListener("blur", save, { once: true });
  });
}

function createJunctionNode(x, y) {
  const id = `junction-${Date.now()}`;

  const element = document.createElement("section");
  element.className = "node junction-node";
  element.dataset.nodeId = id;
  element.style.left = `${x - 40}px`;  // Center the 80px circle
  element.style.top = `${y - 40}px`;

  const count = document.createElement("span");
  count.className = "junction-count";
  count.textContent = "0";

  const label = document.createElement("span");
  label.className = "junction-label";
  label.textContent = "JUNCTION";

  element.append(count, label);
  board.appendChild(element);

  registerNode(id, element, {
    x: x - 40,
    y: y - 40,
    width: 80,
    height: 80,
    isJunction: true
  });

  state.junctions.set(id, {
    connectedCardIds: [],
    maxCapacity: 5
  });

  makeDraggable(element, id);
  applyCollapseState();
  updateCounts();
  drawLinks();
  autoSave();

  return id;
}

function updateJunctionCount(junctionId) {
  const junction = state.junctions.get(junctionId);
  if (!junction) return;
  const node = state.nodes.get(junctionId);
  if (!node) return;
  const countEl = node.element.querySelector(".junction-count");
  if (countEl) {
    countEl.textContent = String(junction.connectedCardIds.length);
  }
}

// --- Connection mode: edge drag handles ---

let connectionState = null;

function addEdgeHandles(element, nodeId) {
  const rightHandle = document.createElement("div");
  rightHandle.className = "edge-handle edge-handle-right";
  rightHandle.dataset.side = "right";
  rightHandle.dataset.nodeId = nodeId;

  const leftHandle = document.createElement("div");
  leftHandle.className = "edge-handle edge-handle-left";
  leftHandle.dataset.side = "left";
  leftHandle.dataset.nodeId = nodeId;

  element.appendChild(rightHandle);
  element.appendChild(leftHandle);

  rightHandle.addEventListener("pointerdown", (event) => startConnection(event, nodeId, "right"));
  leftHandle.addEventListener("pointerdown", (event) => startConnection(event, nodeId, "left"));
}

function startConnection(event, fromNodeId, side) {
  event.stopPropagation();
  event.preventDefault();

  const fromNode = state.nodes.get(fromNodeId);
  if (!fromNode) return;

  const startPoint = anchor(fromNode, side);

  // Create temporary drag line in SVG
  const dragLine = svgElement("path", { class: "drag-line" });
  linkLayer.appendChild(dragLine);

  connectionState = {
    fromNodeId,
    side,
    startPoint,
    dragLine,
    pointerId: event.pointerId
  };

  // Capture pointer for smooth tracking
  event.target.setPointerCapture(event.pointerId);

  const onPointerMove = (moveEvent) => {
    if (!connectionState) return;

    // Convert screen coordinates to board coordinates
    const boardRect = board.getBoundingClientRect();
    const endX = (moveEvent.clientX - boardRect.left) / state.view.scale;
    const endY = (moveEvent.clientY - boardRect.top) / state.view.scale;

    const endPoint = { x: endX, y: endY };
    const path = curvePath(startPoint, endPoint);
    dragLine.setAttribute("d", path);
  };

  const onPointerUp = (upEvent) => {
    if (!connectionState) return;

    // Find if we're over a node
    const boardRect = board.getBoundingClientRect();
    const dropX = (upEvent.clientX - boardRect.left) / state.view.scale;
    const dropY = (upEvent.clientY - boardRect.top) / state.view.scale;

    let targetNodeId = null;
    for (const [id, node] of state.nodes) {
      if (id === fromNodeId) continue;  // No self-connections
      const nodeRight = node.x + (node.width || 300);
      const nodeBottom = node.y + (node.height || 220);
      if (dropX >= node.x && dropX <= nodeRight && dropY >= node.y && dropY <= nodeBottom) {
        targetNodeId = id;
        break;
      }
    }

    // Clean up drag line
    dragLine.remove();
    connectionState = null;

    // Create connection if valid target
    if (targetNodeId) {
      createConnection(fromNodeId, targetNodeId);
    }

    // Remove event listeners
    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerup", onPointerUp);
  };

  document.addEventListener("pointermove", onPointerMove);
  document.addEventListener("pointerup", onPointerUp);
}

function createConnection(fromId, toId) {
  // Check if connection already exists
  const exists = state.links.some(link =>
    (link.from === fromId && link.to === toId) ||
    (link.from === toId && link.to === fromId)
  );
  if (exists) return;

  // Add the link
  state.links.push({ from: fromId, to: toId, kind: "connection" });

  // Trigger junction creation/update (implemented in Plan 03)
  if (typeof handleNewConnection === "function") {
    handleNewConnection(fromId, toId);
  }

  drawLinks();
  autoSave();
}

// --- Junction node logic ---

function handleNewConnection(fromId, toId) {
  // Check if either card is already in a junction
  const fromJunctionId = findJunctionForCard(fromId);
  const toJunctionId = findJunctionForCard(toId);

  if (fromJunctionId && toJunctionId) {
    // Both cards are in junctions — merge if different junctions
    if (fromJunctionId !== toJunctionId) {
      mergeJunctions(fromJunctionId, toJunctionId);
    }
    // If same junction, nothing to do (already grouped)
  } else if (fromJunctionId) {
    // Only 'from' card is in a junction — add 'to' card to it
    addCardToJunction(fromJunctionId, toId);
  } else if (toJunctionId) {
    // Only 'to' card is in a junction — add 'from' card to it
    addCardToJunction(toJunctionId, fromId);
  } else {
    // Neither card is in a junction — create new junction at midpoint
    createJunctionAtMidpoint(fromId, toId);
  }
}

function createJunctionAtMidpoint(cardAId, cardBId) {
  const cardA = state.nodes.get(cardAId);
  const cardB = state.nodes.get(cardBId);
  if (!cardA || !cardB) return;

  // Calculate midpoint between the two cards
  const midX = (cardA.x + (cardA.width || 300) / 2 + cardB.x + (cardB.width || 300) / 2) / 2;
  const midY = (cardA.y + (cardA.height || 220) / 2 + cardB.y + (cardB.height || 220) / 2) / 2;

  // Create junction node at midpoint
  const junctionId = createJunctionNode(midX, midY);

  // Add both cards to the junction
  const junction = state.junctions.get(junctionId);
  if (junction) {
    junction.connectedCardIds.push(cardAId, cardBId);
    updateJunctionCount(junctionId);
  }

  // Rewire links to go through junction
  rewireLinksThroughJunction(junctionId);
}

function addCardToJunction(junctionId, cardId) {
  const junction = state.junctions.get(junctionId);
  if (!junction) return;

  // Check capacity limit (MC-07: max 5 cards per junction)
  if (junction.connectedCardIds.length >= junction.maxCapacity) {
    showSelectionToast(t("junction.maxCapacity", { max: junction.maxCapacity }));
    // Remove the link that was just created
    state.links = state.links.filter(link => {
      const isTarget = (link.from === cardId || link.to === cardId);
      const connectsToJunctionCards = junction.connectedCardIds.some(jcId =>
        (link.from === jcId || link.to === jcId)
      );
      return !(isTarget && connectsToJunctionCards);
    });
    drawLinks();
    return;
  }

  // Add card to junction
  if (!junction.connectedCardIds.includes(cardId)) {
    junction.connectedCardIds.push(cardId);
    updateJunctionCount(junctionId);
  }

  // Rewire links through junction
  rewireLinksThroughJunction(junctionId);
}

function mergeJunctions(junctionAId, junctionBId) {
  const junctionA = state.junctions.get(junctionAId);
  const junctionB = state.junctions.get(junctionBId);
  if (!junctionA || !junctionB) return;

  // Check if merge would exceed capacity
  const mergedCards = [...new Set([...junctionA.connectedCardIds, ...junctionB.connectedCardIds])];
  if (mergedCards.length > junctionA.maxCapacity) {
    showSelectionToast(t("junction.mergeExceedsCapacity", { max: junctionA.maxCapacity }));
    return;
  }

  // Move all cards from B to A
  junctionA.connectedCardIds = mergedCards;
  updateJunctionCount(junctionAId);

  // Delete junction B
  deleteNode(junctionBId);

  // Rewire links through merged junction
  rewireLinksThroughJunction(junctionAId);
}

function rewireLinksThroughJunction(junctionId) {
  const junction = state.junctions.get(junctionId);
  if (!junction) return;

  const cardIds = junction.connectedCardIds;

  // Remove direct links between cards in this junction
  state.links = state.links.filter(link => {
    const fromInGroup = cardIds.includes(link.from);
    const toInGroup = cardIds.includes(link.to);
    // Keep links where at least one end is outside the junction
    return !(fromInGroup && toInGroup);
  });

  // Add links from each card to the junction node
  for (const cardId of cardIds) {
    const exists = state.links.some(link =>
      (link.from === cardId && link.to === junctionId) ||
      (link.from === junctionId && link.to === cardId)
    );
    if (!exists) {
      state.links.push({ from: cardId, to: junctionId, kind: "junction" });
    }
  }

  drawLinks();
  autoSave();
}

function appendChatMessage(role, content, metadata = {}) {
  const thread = ensureActiveChatThread();
  const message = {
    role: role === "assistant" ? "assistant" : "user",
    content,
    branchNodeId: state.selectedNodeId,
    thinkingTrace: normalizeChatThinkingTrace(metadata.thinkingTrace || metadata.trace),
    thinkingContent: normalizeChatThinkingContent(metadata.thinkingContent || metadata.reasoningContent || metadata.reasoning),
    thinkingRequested: Boolean(metadata.thinkingRequested || metadata.pending),
    actions: normalizeChatMessageActions(metadata.actions),
    artifacts: normalizeChatArtifacts(metadata.artifacts || metadata.materials || metadata.cards),
    pending: Boolean(metadata.pending),
    createdAt: new Date().toISOString()
  };
  thread.messages.push(message);
  state.chatMessages = thread.messages;
  renderChatMessages({ scrollToBottom: true });
  renderChatConversationList();
  return message;
}

function updateChatMessage(message, updates = {}) {
  if (!message) return;
  if (typeof updates.content === "string") message.content = updates.content;
  if ("thinkingTrace" in updates || "trace" in updates) {
    message.thinkingTrace = normalizeChatThinkingTrace(updates.thinkingTrace || updates.trace);
  }
  if ("thinkingContent" in updates || "reasoningContent" in updates || "reasoning" in updates) {
    message.thinkingContent = normalizeChatThinkingContent(updates.thinkingContent || updates.reasoningContent || updates.reasoning);
  }
  if ("thinkingRequested" in updates) message.thinkingRequested = Boolean(updates.thinkingRequested);
  if ("actions" in updates) {
    message.actions = normalizeChatMessageActions(updates.actions);
  }
  if ("artifacts" in updates || "materials" in updates || "cards" in updates) {
    message.artifacts = normalizeChatArtifacts(updates.artifacts || updates.materials || updates.cards);
  }
  if ("pending" in updates) message.pending = Boolean(updates.pending);
  renderChatMessages({ scrollToBottom: true });
  renderChatConversationList();
}

function getBranchMessages() {
  syncActiveChatMessages();
  return state.chatMessages;
}

function isChatNearBottom() {
  if (!chatMessages) return true;
  return chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight < 80;
}

function scrollChatToBottom() {
  if (!chatMessages) return;
  chatMessages.scrollTop = chatMessages.scrollHeight;
  updateChatScrollButton();
}

function updateChatScrollButton() {
  if (!chatScrollBottom || !chatMessages) return;
  const canScroll = chatMessages.scrollHeight > chatMessages.clientHeight + 8;
  chatScrollBottom.classList.toggle("hidden", !canScroll || isChatNearBottom());
}

function renderChatMessages({ scrollToBottom = false } = {}) {
  const shouldStickToBottom = scrollToBottom || isChatNearBottom();
  chatMessages.replaceChildren();

  const branchMessages = getBranchMessages();
  if (!branchMessages.length) {
    const placeholder = document.createElement("div");
    placeholder.className = "chat-placeholder";
    placeholder.textContent = t("chat.noMessages");
    chatMessages.appendChild(placeholder);
    updateChatScrollButton();
    return;
  }

  for (const message of branchMessages) {
    const line = document.createElement("div");
    line.className = `chat-line ${message.role}`;
    line.classList.toggle("pending", Boolean(message.pending));

    if (message.role === "assistant" && (message.pending || message.thinkingRequested || message.thinkingContent || message.thinkingTrace?.length)) {
      const details = document.createElement("details");
      details.className = "chat-thinking";
      details.classList.toggle("is-running", Boolean(message.pending));
      details.classList.toggle("is-complete", Boolean(!message.pending && (message.thinkingContent || message.thinkingTrace?.length)));
      const summary = document.createElement("summary");
      summary.className = "chat-thinking-bar";
      const label = message.pending
        ? t("chat.thinkingRunning")
        : (message.thinkingContent ? t("chat.thinkingComplete") : t("chat.thinkingDetails"));
      const icon = document.createElement("span");
      icon.className = "chat-thinking-icon";
      icon.setAttribute("aria-hidden", "true");
      const labelNode = document.createElement("span");
      labelNode.className = "chat-thinking-label";
      labelNode.textContent = label;
      const chevron = document.createElement("span");
      chevron.className = "chat-thinking-chevron";
      chevron.setAttribute("aria-hidden", "true");
      chevron.textContent = "›";
      summary.append(icon, labelNode, chevron);
      const panel = document.createElement("div");
      panel.className = "chat-thinking-panel";
      if (message.thinkingContent) {
        const pre = document.createElement("pre");
        pre.textContent = message.thinkingContent;
        panel.appendChild(pre);
      } else if (!message.pending && message.thinkingTrace?.length) {
        const pre = document.createElement("pre");
        pre.textContent = message.thinkingTrace.join("\n");
        panel.appendChild(pre);
      } else if (!message.pending) {
        panel.textContent = t("chat.thinkingUnavailable");
      }
      details.appendChild(summary);
      if (!message.pending || panel.childNodes.length) {
        details.appendChild(panel);
      }
      line.appendChild(details);
    }

    if (message.content) {
      const text = document.createElement("span");
      text.className = "chat-text";
      text.textContent = message.content;
      line.appendChild(text);
    }
    if (message.role === "assistant" && message.artifacts?.length) {
      line.appendChild(renderChatArtifacts(message.artifacts));
    }
    if (message.role === "assistant" && message.actions?.length) {
      const actions = document.createElement("div");
      actions.className = "chat-action-summary";
      actions.textContent = t("chat.actionsApplied", { count: message.actions.length });
      line.appendChild(actions);
    }
    chatMessages.appendChild(line);
  }
  if (shouldStickToBottom) {
    scrollChatToBottom();
  } else {
    updateChatScrollButton();
  }
}

function renderChatArtifacts(artifacts) {
  const list = document.createElement("div");
  list.className = "chat-artifacts";
  artifacts.forEach((artifact) => {
    const card = document.createElement(artifact.url ? "a" : "div");
    card.className = `chat-artifact-card type-${artifact.type || "note"}`;
    if (artifact.url) {
      card.href = artifact.url;
      card.target = "_blank";
      card.rel = "noopener noreferrer";
    }
    const meta = document.createElement("span");
    meta.className = "chat-artifact-type";
    meta.textContent = artifact.status || artifact.type || "note";
    const title = document.createElement("strong");
    title.textContent = artifact.title || artifact.query || artifact.url || "Material";
    card.append(meta, title);
    if (artifact.summary) {
      const summary = document.createElement("span");
      summary.className = "chat-artifact-summary";
      summary.textContent = artifact.summary;
      card.appendChild(summary);
    }
    if (artifact.query && !artifact.summary) {
      const query = document.createElement("span");
      query.className = "chat-artifact-summary";
      query.textContent = artifact.query;
      card.appendChild(query);
    }
    list.appendChild(card);
  });
  return list;
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
  const title = node?.sourceCard?.title || node?.option?.title || node?.id || "";
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
  const referenceImageDataUrl = await getSourceImageDataUrl();
  await generateOptionWithReference(id, option, referenceImageDataUrl);
}

async function generateOptionWithReference(id, option, referenceImageDataUrl) {
  const node = state.nodes.get(id);
  if (!node) return;
  if (!referenceImageDataUrl) {
    showSelectionToast(t("chat.noSourceForGenerate"));
    return;
  }

  const element = node.element;
  const wasGenerated = Boolean(node.generated);
  const button = element.querySelector(".generate-button");
  element.classList.add("loading");
  if (button) button.disabled = true;
  setStatus(t("status.busy"), "busy");

  try {
    const data = await postJson("/api/generate", {
      imageDataUrl: referenceImageDataUrl,
      option,
      language: currentLang,
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
  const nodeId = element.dataset.nodeId;

  const imageWrap = document.createElement("div");
  imageWrap.className = "generated-image-wrap";
  const img = document.createElement("img");
  img.className = "generated-image";
  img.src = imageDataUrl;
  img.alt = option.title || "生成图";
  img.style.cursor = "zoom-in";
  img.addEventListener("click", (event) => {
    event.stopPropagation();
    openImageViewer(nodeId);
  });
  imageWrap.appendChild(img);
  attachImageCardActions(imageWrap, nodeId);
  element.appendChild(imageWrap);

  const eyebrow = document.createElement("p");
  eyebrow.className = "eyebrow";
  eyebrow.textContent = `${option.tone || "generated"} / ${t("generated.result")}`;
  element.appendChild(eyebrow);

  const title = document.createElement("h3");
  title.textContent = option.title || t("generated.result");
  element.appendChild(title);
  makeTitleEditable(nodeId, title);

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
  regenerate.addEventListener("click", () => generateOption(nodeId, option));

  actions.append(download, regenerate);
  element.appendChild(actions);
}

function installSourceImageActions() {
  const target = document.querySelector(".upload-target");
  if (!target || target.querySelector(".image-card-actions")) return;
  attachImageCardActions(target, "source");
  syncSourceImageActionState();
}

function attachImageCardActions(container, nodeId) {
  if (!container || container.querySelector(".image-card-actions")) return;
  const actions = document.createElement("div");
  actions.className = "image-card-actions";
  actions.append(
    createImageActionButton("edit", "编辑", () => openImageViewer(nodeId, { editing: true })),
    createImageActionButton("share", "分享", () => openImageShareModal(nodeId))
  );
  container.appendChild(actions);
}

function createImageActionButton(kind, label, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `image-card-action image-card-action-${kind}`;
  button.setAttribute("aria-label", label);
  button.title = label;
  button.innerHTML = kind === "edit"
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"/><path d="M12 16V4"/><path d="m7 9 5-5 5 5"/></svg>';
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    onClick();
  });
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    event.stopPropagation();
  });
  return button;
}

function getImageNodeInfo(nodeId) {
  if (nodeId === "source") {
    if (state.sourceType !== "image" || !state.sourceImage) return null;
    return {
      nodeId,
      isSource: true,
      node: state.nodes.get("source"),
      imageUrl: sourcePreview?.src || state.sourceImage,
      title: state.fileName || sourceName?.textContent || "Source image",
      explanation: state.latestAnalysis?.summary || "",
      prompt: state.latestAnalysis?.summary || "",
      imageHash: state.sourceImageHash || null
    };
  }

  const node = state.nodes.get(nodeId);
  if (node?.sourceCard) {
    const imageUrl = node.sourceCard.imageUrl || (node.sourceCard.imageHash ? `/api/assets/${node.sourceCard.imageHash}?kind=upload` : "");
    if (!imageUrl) return null;
    return {
      nodeId,
      isSource: true,
      node,
      imageUrl,
      title: node.sourceCard.title || node.sourceCard.fileName || "Source card",
      explanation: node.sourceCard.summary || "",
      prompt: node.sourceCard.summary || "",
      imageHash: node.sourceCard.imageHash || null
    };
  }
  if (!node?.generated) return null;
  const img = node.element.querySelector(".generated-image");
  if (!img) return null;
  return {
    nodeId,
    isSource: false,
    node,
    imageUrl: img.src,
    title: node.option?.title || t("generated.result"),
    explanation: node.explanation || "",
    prompt: node.option?.prompt || "",
    imageHash: node.imageHash || null
  };
}

function syncSourceImageActionState() {
  document.querySelector(".upload-target")?.classList.toggle(
    "has-source-image",
    state.sourceType === "image" && Boolean(state.sourceImage)
  );
}

function getAllImageNodeIds() {
  const ids = [];
  if (state.sourceType === "image" && state.sourceImage) ids.push("source");
  for (const [id, node] of state.nodes) {
    if (node?.generated) {
      const img = node.element?.querySelector(".generated-image");
      if (img?.src) ids.push(id);
    }
  }
  return ids;
}

function populateViewerThumbnails(activeNodeId) {
  if (!viewerThumbnailStrip) return;
  const imageIds = getAllImageNodeIds();
  viewerThumbnailStrip.innerHTML = "";
  imageIds.forEach((id) => {
    const info = getImageNodeInfo(id);
    if (!info) return;
    const item = document.createElement("div");
    item.className = "viewer-thumbnail-item" + (id === activeNodeId ? " active" : "");
    item.dataset.nodeId = id;
    const img = document.createElement("img");
    img.src = info.imageUrl;
    img.alt = info.title || "";
    img.loading = "lazy";
    item.appendChild(img);
    item.addEventListener("click", () => viewerNavigateToImage(id));
    viewerThumbnailStrip.appendChild(item);
  });
  const activeEl = viewerThumbnailStrip.querySelector(".viewer-thumbnail-item.active");
  if (activeEl) activeEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

function viewerNavigateToImage(nodeId) {
  const info = getImageNodeInfo(nodeId);
  if (!info) return;
  currentViewerNodeId = nodeId;
  viewerImage.src = info.imageUrl;
  viewerImage.alt = info.title || t("generated.result");
  viewerTitle.textContent = info.title || "";
  viewerExplanation.textContent = info.explanation || "";
  if (viewerRegenerate) viewerRegenerate.classList.toggle("hidden", info.isSource);
  if (viewerModifyPanel && !viewerModifyPanel.classList.contains("hidden")) {
    if (viewerPromptInput) viewerPromptInput.value = "";
  }
  viewerThumbnailStrip?.querySelectorAll(".viewer-thumbnail-item").forEach((el) => {
    el.classList.toggle("active", el.dataset.nodeId === nodeId);
  });
  const activeEl = viewerThumbnailStrip?.querySelector(".viewer-thumbnail-item.active");
  if (activeEl) activeEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

let viewerTouchStartX = 0;
let viewerTouchStartY = 0;

function handleViewerTouchStart(e) {
  viewerTouchStartX = e.touches[0].clientX;
  viewerTouchStartY = e.touches[0].clientY;
}

function handleViewerTouchEnd(e) {
  const dx = e.changedTouches[0].clientX - viewerTouchStartX;
  const dy = e.changedTouches[0].clientY - viewerTouchStartY;
  if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx)) return;
  const imageIds = getAllImageNodeIds();
  const idx = imageIds.indexOf(currentViewerNodeId);
  if (idx < 0) return;
  if (dx < 0 && idx < imageIds.length - 1) viewerNavigateToImage(imageIds[idx + 1]);
  else if (dx > 0 && idx > 0) viewerNavigateToImage(imageIds[idx - 1]);
}

function openImageViewer(nodeId, { editing = false } = {}) {
  const info = getImageNodeInfo(nodeId);
  if (!info || !imageViewerModal) return;

  currentViewerNodeId = nodeId;
  viewerImage.src = info.imageUrl;
  viewerImage.alt = info.title || t("generated.result");
  viewerTitle.textContent = info.title || "";
  viewerExplanation.textContent = info.explanation || "";

  if (viewerRegenerate) viewerRegenerate.classList.toggle("hidden", info.isSource);
  if (viewerPromptInput) viewerPromptInput.value = "";
  viewerModifyPanel?.classList.toggle("hidden", !editing);

  const shareBtn = imageViewerModal.querySelector("#imageShareButton");
  if (shareBtn) {
    shareBtn.onclick = () => openImageShareModal(nodeId);
  }

  populateViewerThumbnails(nodeId);

  imageViewerModal.classList.remove("hidden");
  document.body.style.overflow = "hidden";

  viewerImage.addEventListener("touchstart", handleViewerTouchStart, { passive: true });
  viewerImage.addEventListener("touchend", handleViewerTouchEnd, { passive: true });

  if (editing) viewerPromptInput?.focus();
  else imageViewerModal.querySelector("#closeImageViewer")?.focus();
}

function closeImageViewer() {
  imageViewerModal.classList.add("hidden");
  viewerImage.src = "";
  document.body.style.overflow = "";
  currentViewerNodeId = null;
  if (viewerModifyPanel) viewerModifyPanel.classList.add("hidden");
  viewerImage.removeEventListener("touchstart", handleViewerTouchStart);
  viewerImage.removeEventListener("touchend", handleViewerTouchEnd);
}

async function submitViewerImageEdit(prompt) {
  if (!currentViewerNodeId) return;
  const info = getImageNodeInfo(currentViewerNodeId);
  if (!info) return;

  closeImageViewer();
  setStatus(t("status.busy"), "busy");
  try {
    const referenceImageDataUrl = await getImageDataUrlForNode(info.nodeId);
    if (!referenceImageDataUrl) throw new Error("Image reference is unavailable");

    if (info.isSource) {
      const option = {
        id: `edit-${Date.now()}`,
        title: prompt.slice(0, 48),
        description: prompt,
        prompt,
        tone: "edit",
        layoutHint: "image edit"
      };
      const parentId = state.latestAnalysis && state.nodes.has("analysis") ? "analysis" : "source";
      const nodeId = createOptionNode(option, parentId);
      if (nodeId) {
        forceSelectNode(nodeId);
        await generateOptionWithReference(nodeId, option, referenceImageDataUrl);
      }
      return;
    }

    const node = info.node;
    const modifiedOption = {
      ...(node.option || {}),
      id: node.option?.id || `edit-${Date.now()}`,
      title: node.option?.title || prompt.slice(0, 48),
      description: prompt,
      prompt
    };
    node.option = modifiedOption;
    await generateOptionWithReference(info.nodeId, modifiedOption, referenceImageDataUrl);
  } catch (error) {
    setStatus(error.message || t("status.error"), "error");
  }
}

function openImageShareModal(nodeId) {
  const info = getImageNodeInfo(nodeId);
  if (!info || !imageShareModal) return;

  currentShareNodeId = nodeId;
  if (sharePreviewImage) {
    sharePreviewImage.src = info.imageUrl;
    sharePreviewImage.alt = info.title || "Shared image";
  }
  if (shareTitle) shareTitle.textContent = info.title || "分享图片";
  if (shareNameInput) shareNameInput.value = suggestImageFileName(info);
  if (shareLinkInput) shareLinkInput.value = imageShareLinks.get(nodeId) || "";
  imageShareModal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
  shareCopyButton?.focus();
}

function closeImageShareModal() {
  imageShareModal?.classList.add("hidden");
  if (sharePreviewImage) sharePreviewImage.src = "";
  currentShareNodeId = null;
  if (imageViewerModal?.classList.contains("hidden")) {
    document.body.style.overflow = "";
  }
}

async function ensureImageShareLink(nodeId) {
  if (imageShareLinks.has(nodeId)) return imageShareLinks.get(nodeId);
  if (!currentSessionId) {
    await saveSession();
  } else {
    await saveSession({ isAuto: true });
  }
  if (!currentSessionId) throw new Error("Session is not saved yet");
  const data = await postJson("/api/share-image", { nodeId, sessionId: currentSessionId });
  if (!data?.ok || !data.shareUrl) throw new Error("Failed to create image share");
  const fullUrl = window.location.origin + data.shareUrl;
  imageShareLinks.set(nodeId, fullUrl);
  return fullUrl;
}

async function copyImageShareLink(nodeId) {
  showToast(t("viewer.shareInProgress"));
  try {
    const url = await ensureImageShareLink(nodeId);
    if (shareLinkInput) shareLinkInput.value = url;
    await navigator.clipboard.writeText(url);
    showToast(t("viewer.shareCopied"));
  } catch (error) {
    console.error("[copyImageShareLink]", error);
    showToast(t("viewer.shareFailed"));
  }
}

function suggestImageFileName(info) {
  const raw = info?.title || info?.node?.option?.title || state.fileName || "oryzae-image";
  const name = sanitizeFileName(raw).replace(/\.(png|jpe?g|webp|gif)$/i, "");
  const ext = getImageFileExtension(info?.imageUrl || raw) || "png";
  return `${name || "oryzae-image"}.${ext}`;
}

function sanitizeFileName(value) {
  return String(value || "oryzae-image")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .slice(0, 80) || "oryzae-image";
}

function getImageFileExtension(value) {
  const clean = String(value || "").split("?")[0].toLowerCase();
  const match = /\.(png|jpe?g|webp|gif)$/.exec(clean);
  if (!match) return "";
  return match[1] === "jpeg" ? "jpg" : match[1];
}

function renameImageNode(nodeId, value) {
  const clean = sanitizeFileName(value).replace(/\.(png|jpe?g|webp|gif)$/i, "");
  if (!clean) return;
  if (nodeId === "source") {
    const ext = getImageFileExtension(state.fileName) || getImageFileExtension(sharePreviewImage?.src) || "png";
    state.fileName = `${clean}.${ext}`;
    if (sourceName) sourceName.textContent = trimMiddle(state.fileName, 28);
    if (shareTitle) shareTitle.textContent = state.fileName;
    if (shareNameInput) shareNameInput.value = state.fileName;
    updateSourceBadge();
    autoSave();
    return;
  }

  const node = state.nodes.get(nodeId);
  if (!node?.option) return;
  node.option.title = clean;
  const titleEl = node.element.querySelector("h3, .option-title");
  if (titleEl) titleEl.textContent = clean;
  if (shareTitle) shareTitle.textContent = clean;
  if (shareNameInput && !/\.(png|jpe?g|webp|gif)$/i.test(shareNameInput.value)) {
    shareNameInput.value = `${clean}.png`;
  }
  autoSave();
}

async function downloadImageNode(nodeId, requestedName = "") {
  const info = getImageNodeInfo(nodeId);
  if (!info?.imageUrl) return;
  const fileName = sanitizeFileName(requestedName || suggestImageFileName(info));
  try {
    if (info.imageUrl.startsWith("data:")) {
      downloadImage(info.imageUrl, fileName);
      return;
    }
    const sep = info.imageUrl.includes("?") ? "&" : "?";
    const res = await fetch(`${info.imageUrl}${sep}download=1`);
    if (!res.ok) throw new Error("Fetch failed");
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    downloadImage(blobUrl, fileName);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
  } catch (err) {
    console.error("Download failed:", err);
    downloadImage(info.imageUrl, fileName);
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

function openBlueprintModal(junctionId) {
  const junction = state.junctions.get(junctionId);
  if (!junction || junction.connectedCardIds.length === 0) return;

  const canvas = blueprintCanvas;
  if (!canvas) return;
  canvas.replaceChildren();

  // Create SVG overlay for relationship lines
  const svg = svgElement("svg", { class: "blueprint-svg" });
  canvas.appendChild(svg);

  // Render each connected card as a simplified mini-card
  const blueprint = state.blueprints.get(junctionId);
  const positions = blueprint?.positions || {};
  let index = 0;
  for (const cardId of junction.connectedCardIds) {
    const node = state.nodes.get(cardId);
    if (!node) continue;

    const pos = positions[cardId] || {
      x: 24 + (index % 3) * 220,
      y: 24 + Math.floor(index / 3) * 180
    };

    const card = document.createElement("div");
    card.className = "blueprint-card";
    card.dataset.cardId = cardId;
    card.style.left = `${pos.x}px`;
    card.style.top = `${pos.y}px`;

    const title = document.createElement("div");
    title.className = "blueprint-card-title";
    title.textContent = node.option?.title || cardId;

    card.appendChild(title);

    // Add thumbnail if node has a generated image
    if (node.generated && node.imageHash) {
      const img = document.createElement("img");
      img.className = "blueprint-card-thumb";
      img.src = node.imageHash.startsWith("data:") ? node.imageHash : `/api/assets/${node.imageHash}?kind=generated`;
      img.alt = "";
      card.appendChild(img);
    }

    // Add edge handles for drawing relationship lines
    const rightHandle = document.createElement("div");
    rightHandle.className = "edge-handle edge-handle-right";
    rightHandle.addEventListener("pointerdown", (event) => startBlueprintConnection(event, cardId, canvas));

    const leftHandle = document.createElement("div");
    leftHandle.className = "edge-handle edge-handle-left";
    leftHandle.addEventListener("pointerdown", (event) => startBlueprintConnection(event, cardId, canvas));

    card.append(rightHandle, leftHandle);
    canvas.appendChild(card);

    makeModalDraggable(card, cardId, canvas);
    index++;
  }

  // Draw saved relationship lines
  if (blueprint?.relationships?.length > 0) {
    drawBlueprintLinks(canvas, blueprint.relationships);
  }

  blueprintModal.style.display = "";
  blueprintModal.dataset.junctionId = junctionId;
  document.body.style.overflow = "hidden";
}

function closeBlueprintModal() {
  if (blueprintModal) {
    blueprintModal.style.display = "none";
    document.body.style.overflow = "";
    delete blueprintModal.dataset.junctionId;
  }
}

function makeModalDraggable(element, cardId, canvas) {
  let start = null;

  element.addEventListener("pointerdown", (event) => {
    if (event.target.closest(".edge-handle")) return;
    start = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      elX: parseFloat(element.style.left) || 0,
      elY: parseFloat(element.style.top) || 0
    };
    element.classList.add("dragging");
    element.setPointerCapture(event.pointerId);
  });

  element.addEventListener("pointermove", (event) => {
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    element.style.left = `${start.elX + dx}px`;
    element.style.top = `${start.elY + dy}px`;

    // Redraw relationship lines during drag
    const junctionId = blueprintModal.dataset.junctionId;
    const blueprint = state.blueprints.get(junctionId);
    if (blueprint?.relationships?.length > 0) {
      drawBlueprintLinks(canvas, blueprint.relationships);
    }
  });

  element.addEventListener("pointerup", () => {
    if (!start) return;
    start = null;
    element.classList.remove("dragging");

    // Persist position to state.blueprints
    const junctionId = blueprintModal.dataset.junctionId;
    if (!junctionId) return;
    if (!state.blueprints.has(junctionId)) {
      state.blueprints.set(junctionId, { positions: {}, relationships: [] });
    }
    const blueprint = state.blueprints.get(junctionId);
    blueprint.positions[cardId] = {
      x: parseFloat(element.style.left) || 0,
      y: parseFloat(element.style.top) || 0
    };
    autoSave();
  });
}

function drawBlueprintLinks(canvas, relationships) {
  const svg = canvas.querySelector(".blueprint-svg");
  if (!svg) return;
  const fragments = document.createDocumentFragment();

  for (const rel of relationships) {
    const fromCard = canvas.querySelector(`[data-card-id="${rel.from}"]`);
    const toCard = canvas.querySelector(`[data-card-id="${rel.to}"]`);
    if (!fromCard || !toCard) continue;

    const fromRect = { x: parseFloat(fromCard.style.left), y: parseFloat(fromCard.style.top), width: fromCard.offsetWidth || 200, height: fromCard.offsetHeight || 140 };
    const toRect = { x: parseFloat(toCard.style.left), y: parseFloat(toCard.style.top), width: toCard.offsetWidth || 200, height: toCard.offsetHeight || 140 };

    const start = { x: fromRect.x + fromRect.width, y: fromRect.y + fromRect.height * 0.4 };
    const end = { x: toRect.x, y: toRect.y + toRect.height * 0.4 };
    const path = curvePath(start, end);

    const line = svgElement("path", {
      d: path,
      class: `blueprint-link ${rel.type}`
    });
    line.addEventListener("click", () => {
      removeBlueprintRelationship(rel.from, rel.to, canvas);
    });
    fragments.appendChild(line);
  }

  svg.replaceChildren(fragments);
}

function startBlueprintConnection(event, fromCardId, canvas) {
  event.stopPropagation();
  event.preventDefault();

  const svg = canvas.querySelector(".blueprint-svg");
  const dragLine = svgElement("path", { class: "blueprint-drag-line" });
  svg.appendChild(dragLine);

  const fromCard = canvas.querySelector(`[data-card-id="${fromCardId}"]`);
  const fromRect = { x: parseFloat(fromCard.style.left), y: parseFloat(fromCard.style.top), width: fromCard.offsetWidth || 200, height: fromCard.offsetHeight || 140 };
  const startPoint = { x: fromRect.x + fromRect.width, y: fromRect.y + fromRect.height * 0.4 };

  const onPointerMove = (moveEvent) => {
    const canvasRect = canvas.getBoundingClientRect();
    const endX = moveEvent.clientX - canvasRect.left + canvas.scrollLeft;
    const endY = moveEvent.clientY - canvasRect.top + canvas.scrollTop;
    dragLine.setAttribute("d", curvePath(startPoint, { x: endX, y: endY }));
  };

  const onPointerUp = (upEvent) => {
    dragLine.remove();
    const targetEl = document.elementFromPoint(upEvent.clientX, upEvent.clientY)
      ?.closest("[data-card-id]");
    const targetId = targetEl?.dataset.cardId;
    if (targetId && targetId !== fromCardId) {
      showRelationshipTypePicker(fromCardId, targetId, canvas, upEvent.clientX, upEvent.clientY);
    }
    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerup", onPointerUp);
  };

  document.addEventListener("pointermove", onPointerMove);
  document.addEventListener("pointerup", onPointerUp);
}

function showRelationshipTypePicker(fromCardId, toCardId, canvas, clientX, clientY) {
  // Remove any existing picker
  canvas.querySelector(".blueprint-relationship-picker")?.remove();

  const picker = document.createElement("div");
  picker.className = "blueprint-relationship-picker";

  const canvasRect = canvas.getBoundingClientRect();
  picker.style.left = `${clientX - canvasRect.left + canvas.scrollLeft}px`;
  picker.style.top = `${clientY - canvasRect.top + canvas.scrollTop}px`;

  const types = [
    { key: "upstream", label: "上游" },
    { key: "downstream", label: "下游" },
    { key: "parallel", label: "并列" }
  ];

  for (const t of types) {
    const btn = document.createElement("button");
    btn.textContent = t.label;
    btn.addEventListener("click", () => {
      addBlueprintRelationship(fromCardId, toCardId, t.key, canvas);
      picker.remove();
    });
    picker.appendChild(btn);
  }

  canvas.appendChild(picker);

  // Auto-dismiss after 5 seconds
  setTimeout(() => picker.remove(), 5000);
}

function addBlueprintRelationship(fromCardId, toCardId, type, canvas) {
  const junctionId = blueprintModal.dataset.junctionId;
  if (!junctionId) return;

  if (!state.blueprints.has(junctionId)) {
    state.blueprints.set(junctionId, { positions: {}, relationships: [] });
  }
  const blueprint = state.blueprints.get(junctionId);

  // Check for duplicate
  const exists = blueprint.relationships.some(r =>
    (r.from === fromCardId && r.to === toCardId) ||
    (r.from === toCardId && r.to === fromCardId)
  );
  if (exists) return;

  blueprint.relationships.push({ from: fromCardId, to: toCardId, type });
  drawBlueprintLinks(canvas, blueprint.relationships);
  autoSave();
}

function removeBlueprintRelationship(fromCardId, toCardId, canvas) {
  const junctionId = blueprintModal.dataset.junctionId;
  if (!junctionId) return;
  const blueprint = state.blueprints.get(junctionId);
  if (!blueprint) return;

  blueprint.relationships = blueprint.relationships.filter(r =>
    !(r.from === fromCardId && r.to === toCardId) &&
    !(r.from === toCardId && r.to === fromCardId)
  );
  drawBlueprintLinks(canvas, blueprint.relationships);
  autoSave();
}

// Blueprint modal close handlers
blueprintModal?.addEventListener("click", (event) => {
  if (event.target.hasAttribute("data-close-blueprint")) {
    closeBlueprintModal();
  }
});

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

  if (chatInput) {
    chatInput.disabled = false;
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

  // Add edge handles for connection mode (only for non-junction nodes)
  if (!data.isJunction) {
    addEdgeHandles(element, id);
  }

  element.addEventListener("dblclick", (event) => {
    if (event.target.closest(".collapse-dot")) return;
    if (event.target.closest("button, input, textarea, a")) return;
    if (event.target.closest(".option-title, .generated-node h3, .analysis-node h2, #sourceName, .standalone-source-name, .node-title-input")) return;
    const node = state.nodes.get(id);
    // Open blueprint modal for junction nodes
    if (node?.isJunction) {
      openBlueprintModal(id);
      return;
    }
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
  if (titleElement.dataset.titleEditable === "true") return;
  titleElement.dataset.titleEditable = "true";
  titleElement.title = titleElement.title || "Double-click to rename";

  titleElement.addEventListener("dblclick", (event) => {
    event.stopPropagation();
    event.preventDefault();
    if (titleElement.querySelector(".node-title-input")) return; // already editing

    const node = state.nodes.get(nodeId);
    const originalText = (node?.option?.title || titleElement.textContent || "").trim();
    const input = document.createElement("input");
    input.type = "text";
    input.className = "node-title-input";
    input.value = originalText;

    // Replace title text with input
    titleElement.textContent = "";
    titleElement.appendChild(input);
    input.focus();
    input.select();

    let finished = false;

    function finish(callback) {
      if (finished) return;
      finished = true;
      callback();
    }

    function save() {
      finish(() => {
        const newText = input.value.trim();
        if (newText && newText !== originalText) {
          titleElement.textContent = newText;
          const latestNode = state.nodes.get(nodeId);
          if (latestNode?.option) {
            latestNode.option.title = newText;
          }
          autoSave();
        } else {
          titleElement.textContent = originalText;
        }
      });
    }

    function cancel() {
      finish(() => {
        titleElement.textContent = originalText;
      });
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

function makeSourceNameEditable() {
  if (!sourceName || sourceName.dataset.editable === "true") return;
  sourceName.dataset.editable = "true";
  sourceName.title = "双击重命名";
  sourceName.addEventListener("dblclick", (event) => {
    event.stopPropagation();
    event.preventDefault();
    if (sourceName.querySelector(".node-title-input")) return;
    const originalFileName = state.fileName || sourceName.textContent || "Source image";
    const input = document.createElement("input");
    input.type = "text";
    input.className = "node-title-input";
    input.value = originalFileName;
    sourceName.textContent = "";
    sourceName.appendChild(input);
    input.focus();
    input.select();

    let finished = false;

    function finish(callback) {
      if (finished) return;
      finished = true;
      callback();
    }

    function save() {
      finish(() => {
        const next = sanitizeFileName(input.value || originalFileName);
        state.fileName = next;
        sourceName.textContent = trimMiddle(next, 28);
        updateSourceBadge();
        autoSave();
      });
    }

    function cancel() {
      finish(() => {
        sourceName.textContent = trimMiddle(originalFileName, 28);
      });
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
    input.addEventListener("blur", save);
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

  // Clean up junction state if this is a junction node
  if (state.junctions.has(nodeId)) {
    state.junctions.delete(nodeId);
  }
  // Remove this card from any junction's connectedCardIds
  for (const [junctionId, junction] of state.junctions) {
    junction.connectedCardIds = junction.connectedCardIds.filter(id => id !== nodeId);
    updateJunctionCount(junctionId);
  }

  // Clean up blueprint data
  if (state.blueprints.has(nodeId)) {
    // This node is a junction — delete its entire blueprint
    state.blueprints.delete(nodeId);
  }
  // Remove this card from any blueprint's relationships and positions
  for (const [junctionId, blueprint] of state.blueprints) {
    blueprint.relationships = blueprint.relationships.filter(r =>
      r.from !== nodeId && r.to !== nodeId
    );
    delete blueprint.positions[nodeId];
    // If no cards remain connected to this junction, remove the blueprint entirely
    const junction = state.junctions.get(junctionId);
    if (!junction || junction.connectedCardIds.length === 0) {
      state.blueprints.delete(junctionId);
    }
  }

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
    const interactive = event.target.closest("button, input, label, .option-title, .generated-node h3, .analysis-node h2, #sourceName, .standalone-source-name, .node-title-input");
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
  const visibleLinks = state.links.map((link) => {
    const from = state.nodes.get(link.from);
    const to = state.nodes.get(link.to);
    if (!isNodeVisible(from) || !isNodeVisible(to)) return null;
    return { link, from, to, sides: chooseLinkSides(from, to) };
  }).filter(Boolean);

  const fromGroups = groupLinkDescriptors(visibleLinks, (descriptor) => `${descriptor.link.from}:${descriptor.sides.fromSide}`);
  const toGroups = groupLinkDescriptors(visibleLinks, (descriptor) => `${descriptor.link.to}:${descriptor.sides.toSide}`);

  visibleLinks.forEach((descriptor) => {
    const { link, from, to, sides } = descriptor;
    const start = anchor(
      from,
      sides.fromSide,
      linkSpreadOffset(fromGroups.get(`${link.from}:${sides.fromSide}`), descriptor)
    );
    const end = anchor(
      to,
      sides.toSide,
      linkSpreadOffset(toGroups.get(`${link.to}:${sides.toSide}`), descriptor)
    );
    const path = curvePath(start, end);
    const shadow = svgElement("path", { d: path, class: "link-shadow" });
    const line = svgElement("path", { d: path, class: "link" });
    const pinA = svgElement("circle", { cx: start.x, cy: start.y, r: 7, class: "link-pin" });
    const pinB = svgElement("circle", { cx: end.x, cy: end.y, r: 7, class: "link-pin" });

    fragments.append(shadow, line, pinA, pinB);
  });

  linkLayer.replaceChildren(fragments);
}

function groupLinkDescriptors(items, keyFn) {
  const groups = new Map();
  items.forEach((item) => {
    const key = keyFn(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  });
  return groups;
}

function linkSpreadOffset(group, descriptor) {
  if (!group || group.length <= 1) return 0;
  const index = group.indexOf(descriptor);
  const step = group.length > 6 ? 10 : 14;
  return (index - (group.length - 1) / 2) * step;
}

function chooseLinkSides(from, to) {
  const fromCenter = nodeCenter(from);
  const toCenter = nodeCenter(to);
  const dx = toCenter.x - fromCenter.x;
  const dy = toCenter.y - fromCenter.y;

  if (Math.abs(dx) >= Math.abs(dy) * 0.78) {
    return {
      fromSide: dx >= 0 ? "right" : "left",
      toSide: dx >= 0 ? "left" : "right"
    };
  }

  return {
    fromSide: dy >= 0 ? "bottom" : "top",
    toSide: dy >= 0 ? "top" : "bottom"
  };
}

function nodeCenter(node) {
  const element = node.element;
  const width = element.offsetWidth || node.width || 300;
  const height = element.offsetHeight || node.height || 220;
  return {
    x: node.x + width / 2,
    y: node.y + height / 2,
    width,
    height
  };
}

function isNodeVisible(node) {
  return Boolean(node)
    && !node.element.classList.contains("hidden")
    && !node.element.classList.contains("collapsed-hidden")
    && !node.element.classList.contains("selective-hidden");
}

function anchor(node, side = "right", offset = 0) {
  const element = node.element;
  const width = element.offsetWidth || node.width || 300;
  const height = element.offsetHeight || node.height || 220;
  const sidePadding = 18;
  const edgePadding = 30;

  if (side === "top" || side === "bottom") {
    return {
      x: node.x + clamp(width / 2 + offset, edgePadding, width - edgePadding),
      y: node.y + (side === "bottom" ? height - sidePadding : sidePadding),
      side
    };
  }

  return {
    x: node.x + (side === "right" ? width - sidePadding : sidePadding),
    y: node.y + clamp(height * 0.48 + offset, edgePadding, height - edgePadding),
    side
  };
}

function curvePath(start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  let bend = clamp(length * 0.36, 56, 260);
  if ((start.side === "right" && end.side === "left") || (start.side === "left" && end.side === "right")) {
    bend = Math.min(bend, Math.max(30, Math.abs(dx) * 0.48));
  }
  if ((start.side === "bottom" && end.side === "top") || (start.side === "top" && end.side === "bottom")) {
    bend = Math.min(bend, Math.max(30, Math.abs(dy) * 0.48));
  }
  const startTangent = tangentForSide(start.side);
  const endTangent = tangentForSide(end.side);
  const c1x = start.x + startTangent.x * bend;
  const c1y = start.y + startTangent.y * bend;
  const c2x = end.x + endTangent.x * bend;
  const c2y = end.y + endTangent.y * bend;
  return `M ${start.x} ${start.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${end.x} ${end.y}`;
}

function tangentForSide(side) {
  switch (side) {
    case "left":
      return { x: -1, y: 0 };
    case "top":
      return { x: 0, y: -1 };
    case "bottom":
      return { x: 0, y: 1 };
    case "right":
    default:
      return { x: 1, y: 0 };
  }
}

function svgElement(tag, attributes) {
  const element = document.createElementNS("http://www.w3.org/2000/svg", tag);
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
  return element;
}

function toggleChatActionMenu(event) {
  event?.stopPropagation?.();
  const open = chatActionMenu?.classList.contains("hidden");
  setChatActionMenuOpen(Boolean(open));
}

function closeChatActionMenu() {
  setChatActionMenuOpen(false);
}

function setChatActionMenuOpen(open) {
  if (!chatActionMenu || !chatAttachButton) return;
  chatActionMenu.classList.toggle("hidden", !open);
  chatAttachButton.classList.toggle("is-open", open);
  chatAttachButton.setAttribute("aria-expanded", String(open));
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

async function postJson(url, payload, options = {}) {
  const timeoutMs = Number(options.timeoutMs || 0);
  const controller = timeoutMs > 0 ? new AbortController() : null;
  const timer = controller ? window.setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller?.signal
    });
    return parseApiResponse(response);
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(options.timeoutMessage || "Request timed out");
    }
    throw error;
  } finally {
    if (timer) window.clearTimeout(timer);
  }
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
    nodes: Array.from(state.nodes.entries()).map(([k, v]) => [k, { x: v.x, y: v.y, width: v.width, height: v.height, generated: v.generated, option: v.option, sourceCard: v.sourceCard }]),
    links: state.links,
    collapsed: Array.from(state.collapsed),
    selectiveHidden: Array.from(state.selectiveHidden),
    chatMessages: state.chatMessages,
    chatThreads: serializeChatThreads(),
    activeChatThreadId: state.activeChatThreadId,
    selectedNodeId: state.selectedNodeId,
    view: state.view,
    sourceImage: state.sourceImage ? state.sourceImage.slice(0, 200) : null,
    latestAnalysis: state.latestAnalysis,
    blueprints: Object.fromEntries(state.blueprints)
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
    },
    blueprints: Object.fromEntries(state.blueprints)
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
      sourceCard: node.sourceCard || null,
      imageHash: node.imageHash || null,
      explanation: node.explanation || null
    };
  }

  return payload;
}

async function getSourceImageDataUrl() {
  const selected = state.selectedNodeId ? state.nodes.get(state.selectedNodeId) : null;
  if (selected?.sourceCard?.imageUrl || selected?.sourceCard?.imageHash) {
    return getImageDataUrlForNode(state.selectedNodeId);
  }
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

async function getImageDataUrlForNode(nodeId) {
  if (nodeId === "source") return getSourceImageDataUrl();
  const info = getImageNodeInfo(nodeId);
  if (!info?.imageUrl) return "";
  return imageUrlToDataUrl(info.imageUrl);
}

async function imageUrlToDataUrl(url) {
  if (!url) return "";
  if (url.startsWith("data:")) return url;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to read image");
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image"));
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
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
  syncSourceImageActionState();
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

    // Upload non-image document to material library
    if (state.sourceDataUrl && !state.sourceDataUrl.startsWith("data:image/") && !state.sourceDataUrlHash) {
      try {
        const docAsset = await postJson("/api/assets", {
          dataUrl: state.sourceDataUrl,
          kind: "upload",
          fileName: state.fileName
        });
        state.sourceDataUrlHash = docAsset.hash;
      } catch (err) {
        console.warn("Failed to sync document to material library:", err);
      }
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
    for (const [id, node] of Array.from(state.nodes.entries())) {
      if (id !== "source" && id !== "analysis") {
        node.element.remove();
        state.nodes.delete(id);
        state.collapsed.delete(id);
        state.selectiveHidden.delete(id);
      }
    }
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
        state.sourceDataUrlHash = sourceAsset?.hash || null;
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

    const sourceCardNodes = data.nodes.filter(n => n.type === "source-card" || n.data?.sourceCard);
    for (const n of sourceCardNodes) {
      const sourceCard = n.data?.sourceCard || {};
      const imageHash = sourceCard.imageHash || n.data?.imageHash || "";
      const imageUrl = sourceCard.imageUrl || (imageHash ? `/api/assets/${imageHash}?kind=upload` : "");
      createStandaloneSourceCard({
        id: n.nodeId,
        title: sourceCard.title || sourceCard.fileName || (currentLang === "en" ? "Source card" : "源卡片"),
        x: n.x,
        y: n.y,
        imageUrl,
        imageHash,
        fileName: sourceCard.fileName || ""
      });
      const restored = state.nodes.get(n.nodeId);
      if (restored?.sourceCard) {
        restored.sourceCard = { ...restored.sourceCard, ...sourceCard, imageHash, imageUrl };
      }
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

    // Reconstruct junction state from links with kind: "junction"
    state.junctions.clear();
    for (const link of state.links) {
      if (link.kind !== "junction") continue;
      // junction links go: card -> junction node
      const junctionId = link.to;
      const cardId = link.from;
      if (!state.junctions.has(junctionId)) {
        state.junctions.set(junctionId, { connectedCardIds: [], maxCapacity: 5 });
      }
      const junction = state.junctions.get(junctionId);
      if (!junction.connectedCardIds.includes(cardId)) {
        junction.connectedCardIds.push(cardId);
      }
    }

    // Restore junction counts in DOM
    for (const [junctionId, junction] of state.junctions) {
      const node = state.nodes.get(junctionId);
      if (node?.element) {
        const countEl = node.element.querySelector(".junction-count");
        if (countEl) countEl.textContent = String(junction.connectedCardIds.length);
      }
    }

    // Restore blueprint data if present in persisted state
    if (data.state?.blueprints) {
      state.blueprints = new Map(Object.entries(data.state.blueprints));
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
  const visibleNodeIds = Array.from(state.nodes.entries())
    .filter(([, node]) => isNodeVisible(node))
    .map(([id]) => id);
  if (!visibleNodeIds.length) return;

  const visibleSet = new Set(visibleNodeIds);
  const outgoing = new Map();
  const incoming = new Map();
  visibleNodeIds.forEach((id) => {
    outgoing.set(id, []);
    incoming.set(id, []);
  });

  for (const link of state.links) {
    if (!visibleSet.has(link.from) || !visibleSet.has(link.to)) continue;
    outgoing.get(link.from)?.push(link.to);
    incoming.get(link.to)?.push(link.from);
  }

  const depthMap = new Map();
  const queue = [];
  const seedDepth = (id, depth) => {
    if (!visibleSet.has(id)) return;
    const existing = depthMap.get(id);
    if (typeof existing === "number" && existing <= depth) return;
    depthMap.set(id, depth);
    queue.push(id);
  };

  seedDepth("source", 0);
  seedDepth("analysis", 1);
  visibleNodeIds
    .filter((id) => (incoming.get(id)?.length || 0) === 0 && id !== "source" && id !== "analysis")
    .sort((a, b) => getNodeTitle(state.nodes.get(a)).localeCompare(getNodeTitle(state.nodes.get(b)), currentLang === "zh" ? "zh-Hans-CN" : "en"))
    .forEach((id) => seedDepth(id, id.startsWith("option-") ? 2 : 0));

  while (queue.length) {
    const id = queue.shift();
    const depth = depthMap.get(id) || 0;
    for (const childId of outgoing.get(id) || []) {
      const nextDepth = depth + 1;
      if ((depthMap.get(childId) ?? -1) < nextDepth) {
        depthMap.set(childId, nextDepth);
        if (nextDepth < 12) queue.push(childId);
      }
    }
  }

  for (const id of visibleNodeIds) {
    if (!depthMap.has(id)) {
      depthMap.set(id, id.startsWith("option-") ? 2 : 0);
    }
  }

  const parentAverageY = (id) => {
    const parents = incoming.get(id) || [];
    if (!parents.length) return state.nodes.get(id)?.y || 0;
    const total = parents.reduce((sum, parentId) => sum + (state.nodes.get(parentId)?.y || 0), 0);
    return total / parents.length;
  };

  const depthGroups = new Map();
  for (const [id, depth] of depthMap.entries()) {
    if (!depthGroups.has(depth)) depthGroups.set(depth, []);
    depthGroups.get(depth).push(id);
  }
  for (const group of depthGroups.values()) {
    group.sort((a, b) => {
      const parentDelta = parentAverageY(a) - parentAverageY(b);
      if (Math.abs(parentDelta) > 4) return parentDelta;
      return getNodeTitle(state.nodes.get(a)).localeCompare(getNodeTitle(state.nodes.get(b)), currentLang === "zh" ? "zh-Hans-CN" : "en");
    });
  }

  const COLUMN_GAP = 390;
  const ROW_GAP = 54;
  const START_X = 96;
  const MIN_Y = 88;
  const BOARD_WIDTH = Math.max(2400, board.scrollWidth || 2400);
  const BOARD_HEIGHT = Math.max(1500, board.scrollHeight || 1500);
  const targetPositions = new Map();
  const depths = Array.from(depthGroups.keys()).sort((a, b) => a - b);

  for (const depth of depths) {
    const nodesAtDepth = depthGroups.get(depth).filter((id) => !id.startsWith("junction-"));
    if (!nodesAtDepth.length) continue;
    const x = START_X + depth * COLUMN_GAP;
    const totalHeight = nodesAtDepth.reduce((sum, id) => {
      const node = state.nodes.get(id);
      return sum + (node?.height || 220);
    }, 0) + Math.max(0, nodesAtDepth.length - 1) * ROW_GAP;
    let y = Math.max(MIN_Y, (BOARD_HEIGHT - totalHeight) / 2);

    for (const nodeId of nodesAtDepth) {
      const node = state.nodes.get(nodeId);
      if (!node) continue;
      const width = node.width || node.element?.offsetWidth || 318;
      const height = node.height || node.element?.offsetHeight || 220;
      targetPositions.set(nodeId, {
        x: clamp(x, 0, BOARD_WIDTH - width),
        y: clamp(y, 0, BOARD_HEIGHT - height)
      });
      y += height + ROW_GAP;
    }
  }

  for (const [junctionId, junction] of state.junctions) {
    const junctionNode = state.nodes.get(junctionId);
    if (!junctionNode || !visibleSet.has(junctionId)) continue;
    const connected = junction.connectedCardIds
      .map((id) => targetPositions.get(id) || state.nodes.get(id))
      .filter(Boolean);
    if (!connected.length) continue;
    const avgX = connected.reduce((sum, node) => sum + (node.x || 0), 0) / connected.length;
    const avgY = connected.reduce((sum, node) => sum + (node.y || 0), 0) / connected.length;
    const outgoingTargets = outgoing.get(junctionId) || [];
    const firstTarget = outgoingTargets.map((id) => targetPositions.get(id) || state.nodes.get(id)).find(Boolean);
    targetPositions.set(junctionId, {
      x: clamp(firstTarget ? avgX + 230 : avgX + 180, 0, BOARD_WIDTH - 64),
      y: clamp(firstTarget ? (avgY + (firstTarget.y || avgY)) / 2 : avgY + 48, 0, BOARD_HEIGHT - 64)
    });
  }

  animateNodesToPositions(targetPositions, 520);
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
