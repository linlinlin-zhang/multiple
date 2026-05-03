import { micromark } from "https://esm.sh/micromark@4";
import { gfm, gfmHtml } from "https://esm.sh/micromark-extension-gfm@3";

const viewport = document.querySelector("#viewport");
const board = document.querySelector("#board");
const groupLayer = document.querySelector("#groupLayer");
const linkLayer = document.querySelector("#linkLayer");
const marqueeSelection = document.querySelector("#marqueeSelection");
const selectionToolbar = document.querySelector("#selectionToolbar");
const selectionCount = document.querySelector("#selectionCount");
const groupSelectionButton = document.querySelector("#groupSelectionButton");
const ungroupSelectionButton = document.querySelector("#ungroupSelectionButton");
const arrangeSelectionButton = document.querySelector("#arrangeSelectionButton");
const minimap = document.querySelector("#minimap");
const minimapCanvas = document.querySelector("#minimapCanvas");
const minimapViewport = document.querySelector("#minimapViewport");
const minimapCloseButton = document.querySelector("#minimapCloseButton");
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
const chatMinimapAction = document.querySelector("#chatMinimapAction");
const chatDeepThinkAction = document.querySelector("#chatDeepThinkAction");
const chatImageSearchAction = document.querySelector("#chatImageSearchAction");
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
const cardSearchBar = document.querySelector("#cardSearchBar");
const cardSearchInput = document.querySelector("#cardSearchInput");
const cardSearchResults = document.querySelector("#cardSearchResults");
const chatAttachmentPreview = document.querySelector("#chatAttachmentPreview");

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
const settingsAdvancedFields = document.querySelector("#settingsAdvancedFields");

const imageViewerModal = document.querySelector("#imageViewerModal");
const viewerImage = document.querySelector("#viewerImage");
const viewerTitle = document.querySelector("#viewerTitle");
const viewerExplanation = document.querySelector("#viewerExplanation");

const viewerRegenerate = document.querySelector("#viewerRegenerate");
const viewerModify = document.querySelector("#viewerModify");
const viewerDownload = document.querySelector("#viewerDownload");
const viewerBrushTool = document.querySelector("#viewerBrushTool");
const viewerClearMask = document.querySelector("#viewerClearMask");
const viewerAspectButton = document.querySelector("#viewerAspectButton");
const viewerAspectLabel = document.querySelector("#viewerAspectLabel");
const viewerAspectMenu = document.querySelector("#viewerAspectMenu");
const imageShareButton = document.querySelector("#imageShareButton");
const viewerModifyPanel = document.querySelector("#viewerModifyPanel");
const viewerPromptInput = document.querySelector("#viewerPromptInput");
const viewerSubmitModify = document.querySelector("#viewerSubmitModify");
const viewerAsrButton = document.querySelector("#viewerAsrButton");
const viewerMaskCanvas = document.querySelector("#viewerMaskCanvas");
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
  fileUnderstanding: null, // { summary, abstract, structure, keyMaterials, actionableDirections, isScanned }
  chatMessages: [],
  chatThreads: [],
  activeChatThreadId: null,
  nodes: new Map(),
  links: [],
  junctions: new Map(),  // junctionId -> { connectedCardIds: string[], maxCapacity: 5 }
  blueprints: new Map(),  // junctionId -> { positions: { cardId: { x, y } }, relationships: [{ from, to, type }] }
  groups: new Map(),      // groupId -> { id, title, nodeIds, color }
  collapsed: new Set(),        // full collapse (double-click)
  selectiveHidden: new Set(),  // selective hide (single-click / auto-collapse)
  generatedCount: 0,
  selectedNodeId: null,
  selectedNodeIds: new Set(),
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
  analysis: { endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1", model: "qwen3.6-plus", apiKey: "", temperature: 0.7, options: {} },
  chat: { endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1", model: "qwen3.6-plus", apiKey: "", temperature: 0.7, options: {} },
  image: {
    endpoint: "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation",
    model: "qwen-image-2.0-pro",
    apiKey: "",
    temperature: 0.7,
    options: { size: "2048*2048", n: 1, prompt_extend: true, watermark: false, negative_prompt: "", useReferenceImage: true }
  },
  asr: { endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1", model: "qwen3-livetranslate-flash-2025-12-01", apiKey: "", temperature: 0, options: { targetLanguage: "auto" } },
  realtime: {
    endpoint: "wss://dashscope.aliyuncs.com/api-ws/v1/realtime",
    model: "qwen3.5-omni-plus-realtime",
    apiKey: "",
    temperature: 0.7,
    options: { voice: "Ethan", outputAudio: false, enableSearch: false, smoothOutput: "auto" }
  },
  deepthink: { endpoint: "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation", model: "qwen-deep-research", apiKey: "", temperature: 0.7, options: {} }
};

const MODEL_OPTION_FIELDS = {
  analysis: [
    { key: "top_p", type: "number", min: 0.01, max: 1, step: 0.01 },
    { key: "max_tokens", type: "number", min: 1, step: 1 }
  ],
  chat: [
    { key: "top_p", type: "number", min: 0.01, max: 1, step: 0.01 },
    { key: "max_tokens", type: "number", min: 1, step: 1 }
  ],
  image: [
    { key: "size", type: "text", placeholder: "2048*2048" },
    { key: "n", type: "number", min: 1, max: 6, step: 1 },
    { key: "negative_prompt", type: "textarea" },
    { key: "prompt_extend", type: "checkbox" },
    { key: "watermark", type: "checkbox" },
    { key: "seed", type: "number", min: 0, max: 2147483647, step: 1 },
    { key: "useReferenceImage", type: "checkbox" }
  ],
  asr: [
    { key: "targetLanguage", type: "select", options: [["auto", "Auto"], ["zh", "中文"], ["en", "English"]] }
  ],
  realtime: [
    { key: "voice", type: "text", placeholder: "Ethan" },
    { key: "outputAudio", type: "checkbox" },
    { key: "enableSearch", type: "checkbox" },
    { key: "smoothOutput", type: "select", options: [["auto", "Auto"], ["true", "On"], ["false", "Off"]] },
    { key: "top_p", type: "number", min: 0.01, max: 1, step: 0.01 }
  ],
  deepthink: [
    { key: "top_p", type: "number", min: 0.01, max: 1, step: 0.01 },
    { key: "max_tokens", type: "number", min: 1, step: 1 }
  ]
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
let liveResearchCards = new Map();
let deepThinkBusy = false;
let deepThinkModeActive = false;

const VIEWER_ASPECT_OPTIONS = {
  auto: { label: { zh: "宽高比", en: "Aspect" }, size: "" },
  "1:1": { label: { zh: "方形 1:1", en: "Square 1:1" }, size: "1536*1536" },
  "3:4": { label: { zh: "竖版 3:4", en: "Portrait 3:4" }, size: "1080*1440" },
  "9:16": { label: { zh: "故事版 9:16", en: "Story 9:16" }, size: "1080*1920" },
  "4:3": { label: { zh: "横版 4:3", en: "Landscape 4:3" }, size: "1440*1080" },
  "16:9": { label: { zh: "宽屏 16:9", en: "Wide 16:9" }, size: "1920*1080" }
};

const viewerEditState = {
  brushActive: false,
  drawing: false,
  hasMask: false,
  lastMaskPoint: null,
  brushSize: 48,
  aspect: "auto"
};

// Fire-and-forget helper that pushes a chunk of session-scoped context into
// the RAG pool. No-ops without a session id; logs and swallows failures so
// the caller never has to care.
function ingestSessionContext({ kind, text, sourceId = null, sourceMeta = null, snippet = false, replace = false }) {
  if (!currentSessionId || !text || typeof text !== "string" || !text.trim()) return;
  fetch("/api/context/ingest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId: currentSessionId,
      kind,
      text,
      sourceId,
      sourceMeta,
      snippet,
      replace
    })
  }).catch((err) => console.warn(`[ingestSessionContext:${kind}]`, err.message));
}

const CANVAS_TOOL_DEFINITIONS = [
  { type: "pan_view" },
  { type: "focus_node" },
  { type: "select_node" },
  { type: "move_node" },
  { type: "arrange_canvas" },
  { type: "auto_layout" },
  { type: "tidy_canvas" },
  { type: "group_selection" },
  { type: "ungroup_selection" },
  { type: "search_card" },
  { type: "export_report" },
  { type: "deselect" },
  { type: "select_source" },
  { type: "select_analysis" },
  { type: "create_card" },
  { type: "new_card" },
  { type: "create_direction" },
  { type: "create_web_card" },
  { type: "web_search", risk: "network" },
  { type: "create_agent", risk: "agent" },
  { type: "generate_image", risk: "api_cost" },
  { type: "image_search", risk: "network" },
  { type: "reverse_image_search", risk: "network" },
  { type: "text_image_search", risk: "network" },
  { type: "analyze_source" },
  { type: "explore_source", risk: "network" },
  { type: "research_source", risk: "network" },
  { type: "research_node", risk: "network" },
  { type: "open_references" },
  { type: "save_session" },
  { type: "new_chat" },
  { type: "open_chat_history" },
  { type: "close_chat" },
  { type: "open_chat" },
  { type: "open_history" },
  { type: "open_settings" },
  { type: "set_thinking_mode" },
  { type: "set_deep_think_mode" },
  { type: "open_upload" },
  { type: "delete_node", risk: "destructive" }
];
const CANVAS_TOOL_TYPES = CANVAS_TOOL_DEFINITIONS.map((tool) => tool.type);
const CANVAS_RISKY_TOOL_TYPES = new Set(CANVAS_TOOL_DEFINITIONS.filter((tool) => tool.risk).map((tool) => tool.type));

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
    "command.newCanvas": "新建画布",
    "command.newCanvasDesc": "创建一个新的空白画布",
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
    "settings.deepthink": "深入研究",
    "settings.endpoint": "API Endpoint",
    "settings.model": "Model",
    "settings.apiKey": "API Key",
    "settings.temperature": "Temperature",
    "settings.advanced": "模型参数",
    "settings.option.top_p": "Top P",
    "settings.option.max_tokens": "最大输出 Tokens",
    "settings.option.size": "输出分辨率",
    "settings.option.n": "生成张数",
    "settings.option.negative_prompt": "反向提示词",
    "settings.option.prompt_extend": "Prompt 智能改写",
    "settings.option.watermark": "添加水印",
    "settings.option.seed": "随机种子",
    "settings.option.useReferenceImage": "使用当前图片作为参考",
    "settings.option.targetLanguage": "转写目标语言",
    "settings.option.voice": "音色",
    "settings.option.outputAudio": "返回语音回复",
    "settings.option.enableSearch": "实时语音联网搜索",
    "settings.option.smoothOutput": "口语化输出",
    "settings.hint.top_p": "留空使用模型默认值。",
    "settings.hint.max_tokens": "留空不限制，由模型默认控制。",
    "settings.hint.size": "Qwen Image 2.0 Pro 支持自由宽高，推荐使用 2K 预设。",
    "settings.hint.n": "Qwen Image 2.0 系列支持 1-6 张；当前画布会使用第一张。",
    "settings.hint.negative_prompt": "不希望出现在画面里的内容，最多 500 字符。",
    "settings.hint.prompt_extend": "开启后模型会优化正向提示词，画面更丰富。",
    "settings.hint.seed": "留空随机；相同 seed 可提高复现概率。",
    "settings.hint.voice": "例如 Ethan、Cherry、Chelsie；自定义复刻音色可填音色 ID。",
    "settings.hint.outputAudio": "开启后实时语音会播放模型原生音频。",
    "settings.hint.enableSearch": "仅 Qwen3.5 Omni Realtime 支持，且不能与工具调用同时开启。",
    "settings.hint.smoothOutput": "自动时由模型决定口语或书面风格。",
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
    "chat.copyCode": "复制",
    "chat.copied": "已复制",
    "chat.actionApplied": "已执行画布操作",
    "chat.clickToFocus": "点击跳转到画布节点",
    "chat.actionFeedback.create_plan": "已创建 plan 卡片",
    "chat.actionFeedback.create_todo": "已创建 todo 卡片",
    "chat.actionFeedback.create_note": "已创建 note 卡片",
    "chat.actionFeedback.create_weather": "已创建 weather 卡片",
    "chat.actionFeedback.create_map": "已创建 map 卡片",
    "chat.actionFeedback.create_link": "已创建 link 卡片",
    "chat.actionFeedback.create_code": "已创建 code 卡片",
    "chat.actionFeedback.create_web_card": "已创建 web 卡片",
    "chat.actionFeedback.create_direction": "已创建方向卡片",
    "chat.actionFeedback.create_card": "已创建卡片",
    "chat.actionFeedback.new_card": "已创建卡片",
    "chat.actionFeedback.zoom_in": "已放大画布",
    "chat.actionFeedback.zoom_out": "已缩小画布",
    "chat.actionFeedback.reset_view": "已重置视图",
    "chat.actionFeedback.set_zoom": "已调整缩放",
    "chat.actionFeedback.pan_view": "已平移画布",
    "chat.actionFeedback.focus_node": "已聚焦节点",
    "chat.actionFeedback.arrange_canvas": "已整理画布",
    "chat.actionFeedback.delete_node": "已删除卡片",
    "chat.actionFeedback.generate_image": "已生成图片",
    "chat.actionFeedback.research_node": "已开始研究",
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
    "chat.minimap": "缩略图",
    "chat.minimapDesc": "打开或关闭画布缩略图",
    "chat.deepThink": "深入研究",
    "chat.deepThinkDesc": "调用 Qwen Deep Research，把研究过程实时展开为资料卡片",
    "chat.deepThinkMode": "深入研究",
    "chat.deepThinkActive": "正处于深入研究模式下",
    "chat.cancelDeepThink": "取消深入研究模式",
    "deepthink.busy": "深入研究中...",
    "deepthink.complete": "深入研究完成",
    "chat.imageSearch": "图片搜索",
    "chat.imageSearchDesc": "以文字或选中图片搜索视觉参考",
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
    "fileUnderstanding.title": "文件理解卡",
    "fileUnderstanding.summary": "摘要",
    "fileUnderstanding.structure": "结构",
    "fileUnderstanding.pages": "{count} 页",
    "fileUnderstanding.keyMaterials": "关键素材",
    "fileUnderstanding.images": "图片",
    "fileUnderstanding.tables": "表格",
    "fileUnderstanding.charts": "图表",
    "fileUnderstanding.actionableDirections": "可执行方向",
    "fileUnderstanding.scannedWarning": "这似乎是扫描版文档，建议使用 OCR 以提取完整文本。",
    "fileUnderstanding.understandButton": "理解文档",
    "fileUnderstanding.understanding": "正在理解文档...",
    "direction.research": "研究",
    "direction.taskPlan": "任务计划",
    "direction.webAnalysis": "网页分析",
    "direction.reportStructure": "汇报结构",
    "direction.materialCollection": "素材收集",
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
    "chat.systemContext": "你是 ORYZAE 画布工作台的助手。画布支持规划、研究、写作、分析、设计和图像生成等通用任务。在合适的时候使用 canvas_action 工具创建结构化节点(plan / todo / note / weather / map / link / code / web_card / 图像 等)。每次调用工具都要同时写一条正常的消息回复给用户。",
    "chat.systemRole": "你是 ORYZAE 的画布助手。",
    "chat.selectedCardContext": "当前用户正在与画布上的以下卡片对话：\n类型：{type}\n标题：{title}\n内容摘要：{summary}",
    "chat.selectedCardPrompt": "提示词：{prompt}",
    "analysis.systemPrompt": "你是一个视觉创意导演，正在为一个画布式图片生成应用分析用户上传的图片。请快速理解图片内容、主体、氛围、可延展的叙事方向，并给出 5 个不同的成图方向。这些方向会作为画布上的分支节点展示，用户点击后会调用成图模型。请只返回严格 JSON，不要 Markdown，不要代码块。",
    "generate.systemPrompt": "请基于参考图生成一张新图，保留原图最重要的主体、颜色关系或视觉记忆点，但不要只是复制。成图方向：{title}\n\n方向说明：{description}\n\n详细提示词：{prompt}\n\n输出应是一张完整、可独立展示的图片；构图清晰；不要添加水印、UI 截图边框或说明文字。",
    "explain.systemContext": "你是一位视觉创意评论助手，正在为画布式图片生成应用中的每张生成图撰写简短的内容讲解。用户会看到：原图分析摘要、选中的创作方向、以及实际发给成图模型的提示词。你的任务是用 1-2 句话（30-60 字）描述这张生成图在视觉上做了什么、保留了什么、改变了什么。语气专业、简洁、有画面感。不要重复提示词原文，要提炼成观众能感知的视觉描述。",
    "explain.systemRole": "你是 ORYZAE 的 Qwen 视觉创意评论助手。讲解要短、有画面感、不提技术细节。",
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
    "viewer.brush": "选择",
    "viewer.clearMask": "清除",
    "viewer.aspect": "宽高比",
    "viewer.aspectAuto": "原图比例",
    "viewer.aspectMenuTitle": "用不同宽高比生成此图片",
    "viewer.maskRequired": "请先涂抹要编辑的区域。",
    "viewer.maskHint": "已使用画笔选区，模型会优先修改涂抹区域。",
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
    "reference.empty": "暂无参考资料",
    "badge.image_generation": "成图",
    "badge.research": "研究",
    "badge.planning": "规划",
    "badge.creative": "创意",
    "badge.general": "通用",
    "badge.note": "笔记",
    "badge.plan": "计划",
    "badge.todo": "待办",
    "badge.weather": "天气",
    "badge.map": "地图",
    "badge.link": "链接",
    "badge.code": "代码",
    "nodeType.view": "查看",
    "nodeType.open": "打开",
    "nodeType.copy": "复制",
    "nodeType.expand": "展开",
    "nodeType.collapse": "收起",
    "nodeType.done": "已完成",
    "nodeType.undone": "未完成",
    "nodeType.forecast": "预报",
    "nodeType.temperature": "温度",
    "nodeType.location": "位置",
    "nodeType.coordinates": "坐标",
    "nodeType.preview": "预览",
    "nodeType.steps": "步骤",
    "nodeType.step": "第 {n} 步",
    "generated.viewContent": "查看内容",
    "generated.openLink": "打开链接",
    "generated.copyCode": "复制代码",
    "generated.viewMap": "查看地图",
    "generated.viewWeather": "查看天气"
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
    "command.newCanvas": "New Canvas",
    "command.newCanvasDesc": "Create a new blank canvas",
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
    "settings.deepthink": "Deep Research",
    "settings.endpoint": "API Endpoint",
    "settings.model": "Model",
    "settings.apiKey": "API Key",
    "settings.temperature": "Temperature",
    "settings.advanced": "Model parameters",
    "settings.option.top_p": "Top P",
    "settings.option.max_tokens": "Max output tokens",
    "settings.option.size": "Output resolution",
    "settings.option.n": "Image count",
    "settings.option.negative_prompt": "Negative prompt",
    "settings.option.prompt_extend": "Prompt enhancement",
    "settings.option.watermark": "Watermark",
    "settings.option.seed": "Seed",
    "settings.option.useReferenceImage": "Use current image as reference",
    "settings.option.targetLanguage": "Transcript language",
    "settings.option.voice": "Voice",
    "settings.option.outputAudio": "Play voice reply",
    "settings.option.enableSearch": "Realtime web search",
    "settings.option.smoothOutput": "Conversational output",
    "settings.hint.top_p": "Leave blank to use the model default.",
    "settings.hint.max_tokens": "Leave blank for the provider default.",
    "settings.hint.size": "Qwen Image 2.0 Pro supports custom width and height; 2K presets are recommended.",
    "settings.hint.n": "Qwen Image 2.0 supports 1-6 images; the canvas uses the first image.",
    "settings.hint.negative_prompt": "Things to avoid in the generated image, up to 500 characters.",
    "settings.hint.prompt_extend": "Let the model expand and polish the prompt for richer images.",
    "settings.hint.seed": "Leave blank for random generation; same seed improves repeatability.",
    "settings.hint.voice": "For example Ethan, Cherry, or Chelsie; custom cloned voice IDs also work.",
    "settings.hint.outputAudio": "When enabled, realtime voice plays the model's native audio.",
    "settings.hint.enableSearch": "Only supported by Qwen3.5 Omni Realtime and incompatible with tool calling.",
    "settings.hint.smoothOutput": "Auto lets the model choose conversational or formal style.",
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
    "chat.copyCode": "Copy",
    "chat.copied": "Copied!",
    "chat.actionApplied": "Action applied",
    "chat.clickToFocus": "Click to focus node on canvas",
    "chat.actionFeedback.create_plan": "Created plan card",
    "chat.actionFeedback.create_todo": "Created todo card",
    "chat.actionFeedback.create_note": "Created note card",
    "chat.actionFeedback.create_weather": "Created weather card",
    "chat.actionFeedback.create_map": "Created map card",
    "chat.actionFeedback.create_link": "Created link card",
    "chat.actionFeedback.create_code": "Created code card",
    "chat.actionFeedback.create_web_card": "Created web card",
    "chat.actionFeedback.create_direction": "Created direction card",
    "chat.actionFeedback.create_card": "Created card",
    "chat.actionFeedback.new_card": "Created card",
    "chat.actionFeedback.zoom_in": "Zoomed in",
    "chat.actionFeedback.zoom_out": "Zoomed out",
    "chat.actionFeedback.reset_view": "Reset view",
    "chat.actionFeedback.set_zoom": "Adjusted zoom",
    "chat.actionFeedback.pan_view": "Panned canvas",
    "chat.actionFeedback.focus_node": "Focused node",
    "chat.actionFeedback.arrange_canvas": "Tidied canvas",
    "chat.actionFeedback.delete_node": "Deleted card",
    "chat.actionFeedback.generate_image": "Generated image",
    "chat.actionFeedback.research_node": "Started research",
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
    "chat.minimap": "Minimap",
    "chat.minimapDesc": "Show or hide the canvas minimap",
    "chat.deepThink": "Deep research",
    "chat.deepThinkDesc": "Use Qwen Deep Research and stream evidence into canvas cards",
    "chat.deepThinkMode": "Deep research",
    "chat.deepThinkActive": "Deep research mode is active",
    "chat.cancelDeepThink": "Cancel deep research mode",
    "deepthink.busy": "Deep research...",
    "deepthink.complete": "Deep research complete",
    "chat.imageSearch": "Image search",
    "chat.imageSearchDesc": "Search visual references from text or the selected image",
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
    "fileUnderstanding.title": "Document Understanding Card",
    "fileUnderstanding.summary": "Summary",
    "fileUnderstanding.structure": "Structure",
    "fileUnderstanding.pages": "{count} pages",
    "fileUnderstanding.keyMaterials": "Key Materials",
    "fileUnderstanding.images": "Images",
    "fileUnderstanding.tables": "Tables",
    "fileUnderstanding.charts": "Charts",
    "fileUnderstanding.actionableDirections": "Actionable Directions",
    "fileUnderstanding.scannedWarning": "This appears to be a scanned document. OCR is recommended for full text extraction.",
    "fileUnderstanding.understandButton": "Understand Document",
    "fileUnderstanding.understanding": "Understanding...",
    "direction.research": "Research",
    "direction.taskPlan": "Task Plan",
    "direction.webAnalysis": "Web Analysis",
    "direction.reportStructure": "Report Structure",
    "direction.materialCollection": "Material Collection",
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
    "chat.systemContext": "You are the assistant inside ORYZAE, a canvas-based AI workbench. The canvas supports planning, research, writing, analysis, design, and image generation. Use the canvas_action tool to create structured nodes (plan / todo / note / weather / map / link / code / web_card / image / etc.) when appropriate. Whenever you call a tool, also write a normal message reply to the user.",
    "chat.systemRole": "You are ORYZAE's canvas assistant.",
    "chat.selectedCardContext": "The user is currently chatting about the following card on the canvas:\nType: {type}\nTitle: {title}\nSummary: {summary}",
    "chat.selectedCardPrompt": "Prompt: {prompt}",
    "analysis.systemPrompt": "You are a visual creative director analyzing user-uploaded images for a canvas-based image generation app. Quickly understand the image content, subjects, atmosphere, and extensible narrative directions, then provide 5 different image generation directions. These directions will be displayed as branch nodes on the canvas; users click them to invoke the image generation model. Return strict JSON only, no Markdown, no code blocks.",
    "generate.systemPrompt": "Generate a new image based on the reference image, preserving the most important subjects, color relationships, or visual memory points, but do not simply copy. Direction: {title}\n\nDescription: {description}\n\nDetailed prompt: {prompt}\n\nOutput should be a complete, standalone image; clear composition; no watermarks, UI screenshot borders, or explanatory text.",
    "explain.systemContext": "You are a visual creative commentary assistant writing short descriptions for each generated image in a canvas-based image generation app. The user sees: original image analysis summary, selected creative direction, and the actual prompt sent to the image generation model. Your task is to describe in 1-2 sentences (30-60 words) what this generated image did visually, what it preserved, and what it changed. Tone: professional, concise, evocative. Do not repeat the prompt verbatim; distill it into a description the viewer can perceive.",
    "explain.systemRole": "You are ORYZAE's Qwen-powered visual creative commentary assistant. Descriptions are short, evocative, and avoid technical details.",
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
    "viewer.brush": "Select",
    "viewer.clearMask": "Clear",
    "viewer.aspect": "Aspect",
    "viewer.aspectAuto": "Original ratio",
    "viewer.aspectMenuTitle": "Generate this image in another aspect ratio",
    "viewer.maskRequired": "Brush over the area you want to edit first.",
    "viewer.maskHint": "Brush selection included; the model will prioritize the painted region.",
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
    "reference.empty": "No references available",
    "badge.image_generation": "Visual",
    "badge.research": "Research",
    "badge.planning": "Planning",
    "badge.creative": "Creative",
    "badge.general": "General",
    "badge.note": "Note",
    "badge.plan": "Plan",
    "badge.todo": "Todo",
    "badge.weather": "Weather",
    "badge.map": "Map",
    "badge.link": "Link",
    "badge.code": "Code",
    "nodeType.view": "View",
    "nodeType.open": "Open",
    "nodeType.copy": "Copy",
    "nodeType.expand": "Expand",
    "nodeType.collapse": "Collapse",
    "nodeType.done": "Done",
    "nodeType.undone": "Undone",
    "nodeType.forecast": "Forecast",
    "nodeType.temperature": "Temperature",
    "nodeType.location": "Location",
    "nodeType.coordinates": "Coordinates",
    "nodeType.preview": "Preview",
    "nodeType.steps": "Steps",
    "nodeType.step": "Step {n}",
    "generated.viewContent": "View Content",
    "generated.openLink": "Open Link",
    "generated.copyCode": "Copy Code",
    "generated.viewMap": "View Map",
    "generated.viewWeather": "View Weather"
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
    "nav.workbench": ".nav-link[href='/app.html'] .nav-label",
    "nav.history": ".nav-link[href='/history/'] .nav-label",
    "nav.home": ".nav-link[href='/'] .nav-label",
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
    if (label && mode === "understand") label.textContent = t("fileUnderstanding.understandButton");
    if (tooltip && mode === "analyze") tooltip.textContent = t("research.analyzeTooltip");
    if (tooltip && mode === "explore") tooltip.textContent = t("research.exploreTooltip");
    if (tooltip && mode === "understand") tooltip.textContent = currentLang === "en" ? "Understand document structure, extract key materials and generate actionable directions" : "理解文档结构、提取关键素材并生成可执行方向";
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
  if (chatMinimapAction) {
    const title = chatMinimapAction.querySelector(".chat-action-title");
    const desc = chatMinimapAction.querySelector(".chat-action-desc");
    if (title) title.textContent = t("chat.minimap");
    if (desc) desc.textContent = t("chat.minimapDesc");
  }
  if (chatDeepThinkAction) {
    const title = chatDeepThinkAction.querySelector(".chat-action-title");
    const desc = chatDeepThinkAction.querySelector(".chat-action-desc");
    if (title) title.textContent = t("chat.deepThink");
    if (desc) desc.textContent = t("chat.deepThinkDesc");
  }
  if (chatImageSearchAction) {
    const title = chatImageSearchAction.querySelector(".chat-action-title");
    const desc = chatImageSearchAction.querySelector(".chat-action-desc");
    if (title) title.textContent = t("chat.imageSearch");
    if (desc) desc.textContent = t("chat.imageSearchDesc");
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
  renderSettingsAdvancedFields();
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
  if (viewerBrushTool) {
    viewerBrushTool.title = t("viewer.brush");
    viewerBrushTool.setAttribute("aria-label", t("viewer.brush"));
    const brushLabel = viewerBrushTool.querySelector("span");
    if (brushLabel) brushLabel.textContent = t("viewer.brush");
  }
  if (viewerClearMask) {
    viewerClearMask.title = t("viewer.clearMask");
    viewerClearMask.setAttribute("aria-label", t("viewer.clearMask"));
    viewerClearMask.textContent = t("viewer.clearMask");
  }
  if (viewerAspectButton) {
    viewerAspectButton.title = t("viewer.aspect");
    viewerAspectButton.setAttribute("aria-label", t("viewer.aspect"));
  }
  const aspectTitle = viewerAspectMenu?.querySelector(".viewer-aspect-title");
  if (aspectTitle) aspectTitle.textContent = t("viewer.aspectMenuTitle");
  const aspectAuto = viewerAspectMenu?.querySelector('[data-aspect="auto"]');
  if (aspectAuto?.lastChild) aspectAuto.lastChild.textContent = t("viewer.aspectAuto");
  updateViewerAspectUI();
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
  drawLinks();
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
  } else {
    const lastSessionId = sessionStorage.getItem("oryzae-last-session-id");
    if (lastSessionId) {
      try {
        await loadSession(lastSessionId);
        const url = new URL(window.location.href);
        url.searchParams.set("session", lastSessionId);
        window.history.replaceState({}, "", url);
      } catch {
        sessionStorage.removeItem("oryzae-last-session-id");
      }
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
    { id: "new-canvas", icon: "C", label: t("command.newCanvas"), description: t("command.newCanvasDesc") },
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
      window.location.href = `/app.html?session=${data.sessionId}`;
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
  if (commandId === "search-card") {
    // Defer opening so the originating click event doesn't immediately dismiss it
    setTimeout(() => openCardSearchBar(commandArgument), 0);
    return;
  }
  if (commandId === "new-canvas") return createNewCanvas();
  if (commandId === "subagents") return toggleSubagentsMode();
}

function extractCommandArgument(commandId, rawValue) {
  if (commandId !== "new-card" && commandId !== "search-card") return "";
  let text = String(rawValue || "").trim().replace(/^\/+/, "").trim();
  const aliases = commandId === "new-card"
    ? [
        t("command.newCard"),
        "new-card",
        "new card",
        "card",
        "新建卡片",
        "新建",
        "卡片"
      ]
    : [
        t("command.searchCard"),
        "search-card",
        "search card",
        "search",
        "搜索卡片",
        "搜索"
      ];
  const sortedAliases = aliases.filter(Boolean).sort((a, b) => b.length - a.length);
  const lower = text.toLowerCase();
  const alias = sortedAliases.find((item) => lower === item.toLowerCase() || lower.startsWith(`${item.toLowerCase()} `));
  if (alias) {
    text = text.slice(alias.length).trim();
  }
  return text.replace(/^[:：\-—\s]+/, "").trim();
}

let cardSearchMode = false;

function openCardSearchUI(initialQuery = "") {
  cardSearchMode = true;
  if (chatInput) {
    chatInput.value = initialQuery ? "/" + t("command.searchCard") + " " + initialQuery : "/";
  }
  openCommandMenu();
}

function closeCardSearchUI() {
  cardSearchMode = false;
}

function openCardSearchBar(initialQuery = "") {
  if (cardSearchBar) {
    cardSearchBar.classList.remove("hidden");
  }
  if (cardSearchInput) {
    cardSearchInput.value = initialQuery;
    cardSearchInput.focus();
    renderCardSearchBarResults();
  }
}

function closeCardSearchBar() {
  if (cardSearchBar) {
    cardSearchBar.classList.add("hidden");
  }
  if (cardSearchResults) {
    cardSearchResults.innerHTML = "";
  }
  if (cardSearchInput) {
    cardSearchInput.value = "";
  }
}

function renderCardSearchBarResults() {
  if (!cardSearchResults || !cardSearchInput) return;
  const query = cardSearchInput.value.trim().toLowerCase();
  const allCards = getAllCanvasCards();
  const cards = query
    ? allCards.filter((card) => card.title.toLowerCase().includes(query))
    : allCards;

  cardSearchResults.innerHTML = "";

  if (!cards.length) {
    const empty = document.createElement("div");
    empty.className = "card-search-empty";
    empty.textContent = t("command.searchCardEmpty");
    cardSearchResults.appendChild(empty);
    return;
  }

  cards.forEach((card) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "card-search-item";
    const title = document.createElement("span");
    title.className = "card-search-item-title";
    title.textContent = card.title;
    const id = document.createElement("span");
    id.className = "card-search-item-id";
    id.textContent = card.id;
    item.append(title, id);
    item.addEventListener("click", () => {
      locateCard(card.id, card.title);
      closeCardSearchBar();
    });
    cardSearchResults.appendChild(item);
  });
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
    } else if (mode === "understand") {
      triggerFileUnderstanding();
    }
    researchDropdownWrapper?.classList.remove("is-open");
  };

  // Dynamically add "Understand Document" option for text/PDF/PPT sources
  const researchDropdown = document.querySelector(".research-dropdown");
  if (researchDropdown && !researchDropdown.querySelector('[data-mode="understand"]')) {
    const understandOption = document.createElement("div");
    understandOption.className = "research-option";
    understandOption.dataset.mode = "understand";
    understandOption.innerHTML = `
      <span class="option-label">${t("fileUnderstanding.understandButton")}</span>
      <div class="option-tooltip">理解文档结构、提取关键素材并生成可执行方向</div>
    `;
    understandOption.style.display = "none"; // hidden by default, shown when document source is active
    researchDropdown.appendChild(understandOption);
  }

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
  groupSelectionButton?.addEventListener("click", groupSelectedNodes);
  ungroupSelectionButton?.addEventListener("click", ungroupSelectedNodes);
  arrangeSelectionButton?.addEventListener("click", () => arrangeCanvasLayout({ selectionOnly: true }));
  minimap?.addEventListener("pointerdown", handleMinimapPointer);
  minimapCloseButton?.addEventListener("pointerdown", (event) => event.stopPropagation());
  minimapCloseButton?.addEventListener("click", (event) => {
    event.stopPropagation();
    setMinimapOpen(false);
  });

  chatAttachButton?.addEventListener("click", toggleChatActionMenu);
  chatUploadAction?.addEventListener("click", () => {
    closeChatActionMenu();
    handleAttachClick();
  });
  chatMinimapAction?.addEventListener("click", () => {
    closeChatActionMenu();
    toggleMinimap();
  });
  chatDeepThinkAction?.addEventListener("click", () => {
    closeChatActionMenu();
    setDeepThinkModeActive(true);
    chatInput?.focus();
  });
  chatImageSearchAction?.addEventListener("click", async () => {
    closeChatActionMenu();
    await searchImagesFromAction({ type: "image_search", query: chatInput?.value.trim() || "" });
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
        temperature: Number(settingsTemperature?.value ?? 0.7),
        options: collectSettingsOptions()
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
    setViewerEditPanelVisible(true);
  });

  viewerAsrButton?.addEventListener("click", () => {
    toggleViewerAsrDictation();
  });

  viewerBrushTool?.addEventListener("click", () => {
    setViewerEditPanelVisible(true);
    setViewerBrushActive(!viewerEditState.brushActive);
  });

  viewerClearMask?.addEventListener("click", () => {
    clearViewerMask();
  });

  viewerAspectButton?.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleViewerAspectMenu();
  });

  viewerAspectMenu?.querySelectorAll("[data-aspect]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      setViewerAspect(button.dataset.aspect || "auto");
      closeViewerAspectMenu();
    });
  });

  document.addEventListener("click", (event) => {
    if (!viewerAspectMenu || viewerAspectMenu.classList.contains("hidden")) return;
    if (viewerAspectMenu.contains(event.target) || viewerAspectButton?.contains(event.target)) return;
    closeViewerAspectMenu();
  });

  viewerMaskCanvas?.addEventListener("pointerdown", beginViewerMaskStroke);
  viewerMaskCanvas?.addEventListener("pointermove", continueViewerMaskStroke);
  viewerMaskCanvas?.addEventListener("pointerup", endViewerMaskStroke);
  viewerMaskCanvas?.addEventListener("pointercancel", endViewerMaskStroke);
  viewerMaskCanvas?.addEventListener("pointerleave", endViewerMaskStroke);
  viewerImage?.addEventListener("load", () => {
    syncViewerMaskCanvas();
  });
  window.addEventListener("resize", syncViewerMaskCanvas);

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

  // Card search bar wiring
  cardSearchInput?.addEventListener("input", renderCardSearchBarResults);
  cardSearchInput?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeCardSearchBar();
    } else if (event.key === "Enter") {
      event.preventDefault();
      const first = cardSearchResults?.querySelector(".card-search-item");
      if (first) first.click();
    }
  });
  document.addEventListener("click", (event) => {
    if (cardSearchBar && !cardSearchBar.classList.contains("hidden")&& !cardSearchBar.contains(event.target)) {
      closeCardSearchBar();
    }
  });

  let panStart = null;
  viewport.addEventListener("pointerdown", (event) => {
    if (event.target !== viewport && event.target !== board && event.target !== linkLayer) return;
    if (event.shiftKey) {
      startMarqueeSelection(event);
      return;
    }
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
  viewport.addEventListener("pointercancel", () => {
    panStart = null;
    viewport.classList.remove("is-panning");
  });

  chatActionMenu?.querySelectorAll(".chat-action-item").forEach((item) => {
    const desc = item.querySelector(".chat-action-desc");
    if (!desc) return;
    item.addEventListener("mouseenter", () => {
      const itemRect = item.getBoundingClientRect();
      const descWidth = desc.offsetWidth || 220;
      const descHeight = desc.offsetHeight || 60;
      const gap = 10;
      const margin = 8;
      let left = itemRect.left - descWidth - gap;
      let top = itemRect.top + (itemRect.height - descHeight) / 2;
      if (left < margin) {
        left = itemRect.right + gap;
      }
      if (top < margin) top = margin;
      if (top + descHeight > window.innerHeight - margin) {
        top = window.innerHeight - descHeight - margin;
      }
      desc.style.left = `${Math.round(left)}px`;
      desc.style.top = `${Math.round(top)}px`;
    });
    item.addEventListener("mouseleave", () => {
      desc.style.left = "";
      desc.style.top = "";
    });
  });
}

function startMarqueeSelection(event) {
  if (!viewport || !marqueeSelection) return;
  event.preventDefault();
  event.stopPropagation();
  const viewportRect = viewport.getBoundingClientRect();
  const startClient = { x: event.clientX, y: event.clientY };
  const startBoard = viewportToBoardPoint(event.clientX, event.clientY);
  marqueeSelection.classList.remove("hidden");
  viewport.setPointerCapture?.(event.pointerId);

  const update = (moveEvent) => {
    const left = Math.min(startClient.x, moveEvent.clientX) - viewportRect.left;
    const top = Math.min(startClient.y, moveEvent.clientY) - viewportRect.top;
    const width = Math.abs(moveEvent.clientX - startClient.x);
    const height = Math.abs(moveEvent.clientY - startClient.y);
    marqueeSelection.style.left = `${left}px`;
    marqueeSelection.style.top = `${top}px`;
    marqueeSelection.style.width = `${width}px`;
    marqueeSelection.style.height = `${height}px`;

    const currentBoard = viewportToBoardPoint(moveEvent.clientX, moveEvent.clientY);
    const rect = {
      x: Math.min(startBoard.x, currentBoard.x),
      y: Math.min(startBoard.y, currentBoard.y),
      right: Math.max(startBoard.x, currentBoard.x),
      bottom: Math.max(startBoard.y, currentBoard.y)
    };
    const selected = [];
    for (const [id, node] of state.nodes.entries()) {
      if (!isNodeVisible(node) || id.startsWith("junction-")) continue;
      const bounds = getNodeBounds(node);
      if (bounds && bounds.right >= rect.x && bounds.x <= rect.right && bounds.bottom >= rect.y && bounds.y <= rect.bottom) {
        selected.push(id);
      }
    }
    setMultiSelection(selected, { primaryId: selected[0] });
  };

  const finish = () => {
    marqueeSelection.classList.add("hidden");
    window.removeEventListener("pointermove", update);
    window.removeEventListener("pointerup", finish);
    window.removeEventListener("pointercancel", finish);
  };

  window.addEventListener("pointermove", update);
  window.addEventListener("pointerup", finish, { once: true });
  window.addEventListener("pointercancel", finish, { once: true });
}

function handleMinimapPointer(event) {
  if (!minimapCanvas || !viewport) return;
  if (event.target.closest?.("#minimapCloseButton")) return;
  const rect = minimapCanvas.getBoundingClientRect();
  const scaleX = 2400 / rect.width;
  const scaleY = 1500 / rect.height;
  const boardX = (event.clientX - rect.left) * scaleX;
  const boardY = (event.clientY - rect.top) * scaleY;
  const viewRect = viewport.getBoundingClientRect();
  state.view.x = viewRect.width / 2 - boardX * state.view.scale;
  state.view.y = viewRect.height / 2 - boardY * state.view.scale;
  updateBoardTransform();
}

function setMinimapOpen(open) {
  if (!minimap) return;
  minimap.classList.toggle("hidden", !open);
  if (open) {
    requestAnimationFrame(() => {
      renderMinimap();
      syncMinimapViewport();
    });
  }
}

function toggleMinimap() {
  setMinimapOpen(Boolean(minimap?.classList.contains("hidden")));
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

const ACTION_FEEDBACK_ICONS = {
  create_plan: "📋",
  create_todo: "✅",
  create_note: "📝",
  create_weather: "🌤",
  create_map: "🗺",
  create_link: "🔗",
  create_code: "💻",
  create_web_card: "🌐",
  create_direction: "🎨",
  create_card: "➕",
  new_card: "➕",
  zoom_in: "🔍+",
  zoom_out: "🔍-",
  reset_view: "🎯",
  set_zoom: "🔍",
  pan_view: "🖐",
  focus_node: "📍",
  arrange_canvas: "📐",
  auto_layout: "📐",
  tidy_canvas: "📐",
  delete_node: "🗑",
  generate_image: "🖼",
  image_search: "🖼",
  reverse_image_search: "🖼",
  text_image_search: "🖼",
  research_node: "🔬",
  research_source: "🔬",
  explore_source: "🧭",
  analyze_source: "🧪",
  open_references: "📚"
};

function normalizeChatActionResults(value) {
  const raw = Array.isArray(value) ? value : (value ? [value] : []);
  return raw
    .filter((entry) => entry && typeof entry === "object" && entry.type)
    .slice(0, 8)
    .map((entry) => {
      const result = entry.result;
      const nodeId = (typeof result === "string" ? result : result?.nodeId) || entry.nodeId || "";
      return {
        type: String(entry.type),
        title: String(entry.title || entry.nodeName || result?.title || "").slice(0, 80),
        nodeId: String(nodeId).slice(0, 96),
        success: result === null || result === undefined ? false : true
      };
    });
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

function renderMarkdownToHtml(markdown) {
  if (!markdown) return "";
  const rawHtml = micromark(markdown, {
    allowDangerousHtml: false,
    extensions: [gfm()],
    htmlExtensions: [gfmHtml()]
  });
  return DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS: [
      "p", "h1", "h2", "h3", "h4", "h5", "h6",
      "ul", "ol", "li", "strong", "em", "del", "code", "pre",
      "blockquote", "table", "thead", "tbody", "tr", "th", "td",
      "a", "br", "hr", "div", "span", "input"
    ],
    ALLOWED_ATTR: ["href", "target", "rel", "class", "align", "type", "checked", "disabled"],
    ALLOW_DATA_ATTR: false
  });
}

function addCopyButtons(container) {
  container.querySelectorAll("pre code").forEach((codeBlock) => {
    const pre = codeBlock.parentElement;
    if (pre.querySelector(".chat-code-copy")) return;
    const button = document.createElement("button");
    button.className = "chat-code-copy";
    button.textContent = t("chat.copyCode") || "Copy";
    button.setAttribute("aria-label", t("chat.copyCode") || "Copy code");
    button.onclick = () => {
      navigator.clipboard.writeText(codeBlock.textContent).then(() => {
        button.textContent = t("chat.copied") || "Copied!";
        setTimeout(() => {
          button.textContent = t("chat.copyCode") || "Copy";
        }, 1500);
      }).catch(() => {});
    };
    pre.appendChild(button);
  });
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
  setSubagentsMode(true, { silent: true });
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
  if (next) ensureFreshChatThread(currentLang === "en" ? "Deep research" : "深入研究");
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
          temperature: typeof data[role].temperature === "number" ? data[role].temperature : 0.7,
          options: data[role].options && typeof data[role].options === "object" ? data[role].options : {}
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
  renderSettingsAdvancedFields();
}

function renderSettingsAdvancedFields() {
  if (!settingsAdvancedFields) return;
  const role = settingsCache.currentRole;
  const fields = MODEL_OPTION_FIELDS[role] || [];
  const cfg = settingsCache[role] || {};
  const options = cfg.options && typeof cfg.options === "object" ? cfg.options : {};
  settingsAdvancedFields.innerHTML = "";
  if (!fields.length) return;

  const heading = document.createElement("div");
  heading.className = "settings-advanced-heading";
  heading.textContent = t("settings.advanced");
  settingsAdvancedFields.appendChild(heading);

  for (const field of fields) {
    const row = document.createElement("label");
    row.className = `settings-option-row${field.type === "checkbox" ? " is-checkbox" : ""}`;
    const label = document.createElement("span");
    label.textContent = t(`settings.option.${field.key}`);
    row.appendChild(label);

    const value = options[field.key];
    let control;
    if (field.type === "textarea") {
      control = document.createElement("textarea");
      control.rows = 3;
      control.value = typeof value === "string" ? value : "";
    } else if (field.type === "select") {
      control = document.createElement("select");
      for (const [optionValue, optionLabel] of field.options || []) {
        const option = document.createElement("option");
        option.value = optionValue;
        option.textContent = optionLabel;
        control.appendChild(option);
      }
      control.value = normalizeOptionControlValue(field.key, value);
    } else if (field.type === "checkbox") {
      control = document.createElement("input");
      control.type = "checkbox";
      control.checked = Boolean(value);
    } else {
      control = document.createElement("input");
      control.type = field.type || "text";
      if (field.min !== undefined) control.min = String(field.min);
      if (field.max !== undefined) control.max = String(field.max);
      if (field.step !== undefined) control.step = String(field.step);
      if (field.placeholder) control.placeholder = field.placeholder;
      control.value = value === undefined || value === null ? "" : String(value);
    }
    control.dataset.optionKey = field.key;
    control.dataset.optionType = field.type;
    row.appendChild(control);

    const hintKey = `settings.hint.${field.key}`;
    const hint = t(hintKey);
    if (hint !== hintKey) {
      const hintEl = document.createElement("div");
      hintEl.className = "settings-field-hint";
      hintEl.textContent = hint;
      row.appendChild(hintEl);
    }
    settingsAdvancedFields.appendChild(row);
  }
}

function normalizeOptionControlValue(key, value) {
  if (key === "smoothOutput") {
    if (value === true) return "true";
    if (value === false) return "false";
    return "auto";
  }
  return value === undefined || value === null ? "auto" : String(value);
}

function collectSettingsOptions() {
  const options = {};
  settingsAdvancedFields?.querySelectorAll("[data-option-key]").forEach((control) => {
    const key = control.dataset.optionKey;
    const type = control.dataset.optionType;
    if (!key) return;
    if (type === "checkbox") {
      options[key] = Boolean(control.checked);
      return;
    }
    const value = control.value?.trim?.() ?? "";
    if (value === "") return;
    if (type === "number") {
      const number = Number(value);
      if (Number.isFinite(number)) options[key] = number;
      return;
    }
    if (key === "smoothOutput") {
      options[key] = value === "true" ? true : value === "false" ? false : "auto";
      return;
    }
    options[key] = value;
  });
  return options;
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

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function handleFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (event.target && "value" in event.target) {
    event.target.value = "";
  }

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
      state.sourceImageHash = null;
      state.sourceDataUrlHash = null;
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
        const base64 = arrayBufferToBase64(arrayBuffer);
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

      // Render document preview for PDF/PPT
      const isRichDoc = ["pdf", "pptx", "docx"].includes(ext);
      if (isRichDoc) {
        const uploadTarget = document.querySelector("#sourceNode .upload-target");
        renderDocumentPreview(file.name, state.sourceDataUrl, null, mimeMap[ext], uploadTarget);
      }

      clearOptions();
      state.latestAnalysis = null;
      state.fileUnderstanding = null;
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
  if (node.sourceCard) {
    return Boolean(
      node.sourceCard.imageUrl ||
      node.sourceCard.imageHash ||
      node.sourceCard.sourceText ||
      node.sourceCard.sourceDataUrl ||
      node.sourceCard.sourceDataUrlHash ||
      node.sourceCard.sourceUrl
    );
  }
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
  if (state.sourceType === "text" && !state.sourceText && !state.sourceDataUrl) {
    await ensureSourceDocumentDataUrl();
  }
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
        thinkingMode: "thinking",
        sessionId: currentSessionId || ""
      }, {
        timeoutMs: 180000,
        timeoutMessage: t("research.timeout")
      });
    } else if (state.sourceType === "url") {
      data = await postJson("/api/analyze-explore", {
        url: state.sourceUrl,
        thinkingMode: "thinking",
        sessionId: currentSessionId || ""
      }, {
        timeoutMs: 180000,
        timeoutMessage: t("research.timeout")
      });
    } else {
      data = await postJson("/api/analyze-explore", {
        text: state.sourceText,
        dataUrl: state.sourceDataUrl,
        fileName: state.fileName,
        thinkingMode: "thinking",
        sessionId: currentSessionId || ""
      }, {
        timeoutMs: 180000,
        timeoutMessage: t("research.timeout")
      });
    }

    renderAnalysis(data);
    renderExploreOptions(data.options || [], data.references || [], data.taskType || "general");
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
  if (state.sourceType === "text" && !state.sourceText && !state.sourceDataUrl) {
    await ensureSourceDocumentDataUrl();
  }
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
        thinkingMode: mode === "explore" ? "thinking" : state.thinkingMode,
        sessionId: currentSessionId || ""
      }, {
        timeoutMs: 150000,
        timeoutMessage: t("research.timeout")
      });
    } else if (state.sourceType === "url") {
      data = await postJson("/api/analyze-url", { url: state.sourceUrl, thinkingMode: mode === "explore" ? "thinking" : state.thinkingMode, sessionId: currentSessionId || "" }, {
        timeoutMs: 150000,
        timeoutMessage: t("research.timeout")
      });
    } else {
      data = await postJson("/api/analyze-text", {
        text: state.sourceText,
        dataUrl: state.sourceDataUrl,
        fileName: state.fileName,
        thinkingMode: mode === "explore" ? "thinking" : state.thinkingMode,
        sessionId: currentSessionId || ""
      }, {
        timeoutMs: 150000,
        timeoutMessage: t("research.timeout")
      });
    }

    renderAnalysis(data);
    renderOptions(data.options || [], data.taskType || "general");
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
    const data = await postJson("/api/analyze-url", { url, sessionId: currentSessionId || "" });
    state.sourceType = "url";
    state.sourceUrl = url;
    state.fileName = new URL(url).hostname;
    state.latestAnalysis = data;

    // Render source preview as a link card
    renderUrlSource(url, data.title);
    renderAnalysis(data);
    renderOptions(data.options || [], data.taskType || "general");
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
        openCardSearchBar(resolved?.remainder || "");
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
  clearChatAttachmentPreview();
  updateChatPrimaryButtonMode();
  updateActiveChatThreadTitle(text);
  appendChatMessage("user", text);
  const pendingAssistant = appendChatMessage("assistant", "", {
    pending: true,
    thinkingRequested: effectiveThinkingMode === "thinking"
  });
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

    const chatPayload = {
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
      subagentsEnabled,
      sessionId: currentSessionId || ""
    };
    const data = await postStreamingChat("/api/chat", chatPayload, pendingAssistant);
    const assistantMeta = {
      pending: false,
      thinkingTrace: data.thinkingTrace || data.trace,
      thinkingContent: data.thinkingContent || data.reasoningContent || data.reasoning,
      thinkingRequested: effectiveThinkingMode === "thinking",
      actions: data.actions || data.action,
      artifacts: data.artifacts || data.agentPlan || []
    };
    const returnedActions = data?.actions || data?.action;
    let actionResults = [];
    if (returnedActions) {
      actionResults = await applyVoiceActions(returnedActions);
    }
    assistantMeta.actionResults = actionResults;
    updateChatMessage(pendingAssistant, {
      content: data.reply || t("chat.systemContext"),
      ...assistantMeta
    });
    setStatus(t("status.ready"), "ready");
    autoSave();
  } catch (error) {
    const errorText = error.message || (currentLang === "en" ? "Chat request failed." : "对话请求失败。");
    updateChatMessage(pendingAssistant, { content: errorText, pending: false });
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
  const activeThread = ensureActiveChatThread();
  if (activeThread.messages.length && options.newThread !== false) {
    startNewChat();
  }
  deepThinkBusy = true;
  liveResearchCards = new Map();
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
    let imageDataUrl = "";
    try {
      imageDataUrl = await getImageDataUrlForNode(parentNodeId);
    } catch {
      imageDataUrl = "";
    }
    const data = await postStreamingChat("/api/deep-research", {
      message: prompt,
      language: currentLang,
      selectedContext,
      selectedNodeId: parentNodeId,
      analysis: state.latestAnalysis,
      messages: state.chatMessages.slice(-8),
      canvas: buildVoiceCanvasContext(),
      imageDataUrl
    }, pendingAssistant);
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
    selectedNodeIds: Array.from(state.selectedNodeIds),
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
    capabilities: CANVAS_TOOL_TYPES,
    visibleNodes
  };
}

async function applyVoiceActions(value) {
  const actions = Array.isArray(value) ? value : (value ? [value] : []);
  const results = [];
  for (const action of actions) {
    const type = typeof action === "string" ? action : action?.type || action?.name;
    if (!type) continue;
    const normalized = typeof action === "string" ? { type } : { ...action, type };
    const result = await executeCanvasAction(normalized);
    results.push({ ...normalized, result });
  }
  autoSave();
  return results;
}

async function executeCanvasAction(action) {
  const type = String(action?.type || "").trim();
  if (!type) return;
  if (!confirmRiskyCanvasAction(action)) return;

  if (type === "zoom_in") { zoomBy(0.08); return { type, success: true }; }
  if (type === "zoom_out") { zoomBy(-0.08); return { type, success: true }; }
  if (type === "set_zoom") { setCanvasZoom(action); return { type, success: true }; }
  if (type === "reset_view") { resetView(); return { type, success: true }; }
  if (type === "pan_view") return panCanvasView(action);
  if (type === "focus_node") return focusNodeByAction(action);
  if (type === "arrange_canvas" || type === "auto_layout" || type === "tidy_canvas") return arrangeCanvasLayout({ selectionOnly: action.scope === "selection" || action.selectionOnly === true });
  if (type === "group_selection") return groupSelectedNodes();
  if (type === "ungroup_selection") return ungroupSelectedNodes();
  if (type === "search_card") return searchCardFromAction(action);
  if (type === "export_report") return exportCanvasReportFromAction(action);
  if (type === "deselect") return deselectNode();
  if (type === "select_source") return focusNodeById("source");
  if (type === "select_analysis") return focusNodeById("analysis");
  if (type === "select_node") return focusNodeByAction(action);
  if (type === "move_node") return moveNodeByAction(action);
  if (type === "create_direction") return createDirectionFromAction(action);
  if (type === "create_card" || type === "new_card") return createNewCardNode(action.title || action.prompt || action.query || "");
  if (type === "create_web_card") return createDirectionFromAction({ ...action, mode: action.mode || "web" });
  if (type === "web_search") return createDirectionFromAction({ ...action, type: "create_web_card", mode: "web" });
  // Rich node types
  if (["create_note", "create_plan", "create_todo", "create_weather", "create_map", "create_link", "create_code"].includes(type)) {
    return createDirectionFromAction({ ...action, type });
  }
  if (type === "create_agent") return runSubagentAction(action);
  if (type === "generate_image") return generateImageFromAction(action);
  if (type === "image_search" || type === "reverse_image_search" || type === "text_image_search") return searchImagesFromAction(action);
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

function confirmRiskyCanvasAction(action) {
  const type = String(action?.type || "").trim();
  const labels = {
    delete_node: currentLang === "en" ? "delete this card" : "删除这张卡片",
    generate_image: currentLang === "en" ? "call the image generation API" : "调用成图 API",
    web_search: currentLang === "en" ? "run web search" : "运行联网搜索",
    create_agent: currentLang === "en" ? "start a no-thinking subagent task" : "启动一个 no-thinking 子任务",
    image_search: currentLang === "en" ? "search the web for images" : "联网搜图",
    reverse_image_search: currentLang === "en" ? "upload the selected image for reverse image search" : "上传选中图片进行以图搜图",
    text_image_search: currentLang === "en" ? "search the web for images" : "联网搜图",
    research_node: currentLang === "en" ? "run web/deep research" : "运行联网/深入研究",
    research_source: currentLang === "en" ? "run web/deep research" : "运行联网/深入研究"
  };
  if (!labels[type]) return true;
  const autoConfirmed = action.confirmed === true || action.userConfirmed === true;
  if (autoConfirmed) return true;
  return window.confirm(currentLang === "en"
    ? `ORYZAE is about to ${labels[type]}. Continue?`
    : `ORYZAE 即将${labels[type]}，是否继续？`);
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
  if (node.option?.nodeType && node.option.nodeType !== "image") {
    const nt = node.option.nodeType;
    const c = node.option.content || {};
    if (nt === "note") return c.text || node.option.description || "";
    if (nt === "plan") return (c.steps || []).map((s, i) => `${i + 1}. ${s.title || s}`).join("; ");
    if (nt === "todo") return (c.items || []).map((it) => `[${it.done ? "x" : " "}] ${it.text || it}`).join("; ");
    if (nt === "weather") return `${c.location || ""} ${c.temp || ""} ${c.forecast || ""}`;
    if (nt === "map") return c.address || `${c.lat || ""},${c.lng || ""}`;
    if (nt === "link") return c.title || c.url || node.option.description || "";
    if (nt === "code") return c.code || node.option.description || "";
  }
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

  // Map action types to node types
  const nodeTypeMap = {
    create_note: "note",
    create_plan: "plan",
    create_todo: "todo",
    create_weather: "weather",
    create_map: "map",
    create_link: "link",
    create_code: "code",
    create_web_card: "link"
  };
  const nodeType = action.nodeType || nodeTypeMap[action.type] || (isWebCard ? "link" : "image");

  const nodeId = createOptionNode({
    id: `voice-${Date.now()}-${safeNodeSlug(action.title || text)}`,
    title: String(action.title || text).slice(0, 48),
    description: String(action.description || text),
    prompt: text,
    tone: String(action.mode || (isWebCard ? "web" : "voice")),
    layoutHint: isWebCard ? "reference" : "voice",
    references,
    nodeType,
    content: action.content || undefined
  }, parentId);
  if (!nodeId) return null;

  if (action.position || action.anchorNodeId || action.anchorNodeName) {
    moveNodeByAction({ ...action, type: "move_node", nodeId, anchorNodeId: action.anchorNodeId || parentId });
  } else {
    focusNodeById(nodeId, "center");
  }
  return nodeId;
}

async function searchImagesFromAction(action = {}) {
  const fallbackParent = state.selectedNodeId || (state.nodes.has("analysis") ? "analysis" : "source");
  const parentId = resolveParentNodeId(action, resolveActionNodeId(action, fallbackParent)) || fallbackParent;
  const parent = parentId ? state.nodes.get(parentId) : null;
  const query = String(
    action.query ||
    action.prompt ||
    action.description ||
    action.title ||
    chatInput?.value.trim() ||
    getNodeSummary(parent) ||
    state.latestAnalysis?.summary ||
    state.fileName ||
    ""
  ).trim();
  let imageDataUrl = "";
  const actionType = String(action.type || "");
  const targetNodeId = resolveActionNodeId(action, state.selectedNodeId || "source");
  if (actionType === "reverse_image_search" || targetNodeId) {
    try {
      imageDataUrl = await getImageDataUrlForNode(targetNodeId || "source");
    } catch {
      imageDataUrl = "";
    }
  }
  if (!query && !imageDataUrl) {
    showSelectionToast(currentLang === "en" ? "Type a query or select an image card first." : "请先输入搜索词，或选中一张图片卡片。");
    return null;
  }

  setStatus(currentLang === "en" ? "Searching images..." : "正在搜索图片...", "busy");
  const data = await postJson("/api/image-search", {
    query,
    imageDataUrl,
    language: currentLang,
    limit: 8
  });
  const results = Array.isArray(data?.results) ? data.results : [];
  if (!results.length) {
    appendChatMessage("assistant", data?.summary || (currentLang === "en" ? "No visual references were found." : "没有找到可用的视觉参考。"));
    setStatus(currentLang === "en" ? "Ready" : "就绪", "ready");
    return null;
  }

  const anchor = parent || state.nodes.get("source");
  const baseX = (anchor?.x || 96) + (anchor?.width || 318) + 120;
  const baseY = (anchor?.y || 88) - 20;
  const createdIds = [];
  results.slice(0, 6).forEach((result, index) => {
    const x = baseX + Math.floor(index / 3) * 360;
    const y = baseY + (index % 3) * 230;
    const title = String(result.title || result.sourceUrl || result.url || "Image reference").slice(0, 48);
    let nodeId = null;
    if (result.imageUrl) {
      const localUrl = result.localImageUrl || (result.imageHash ? `/api/assets/${result.imageHash}?kind=upload` : "");
      nodeId = createStandaloneSourceCard({
        id: `image-search-${Date.now().toString(36)}-${index}`,
        title,
        fileName: title,
        imageUrl: localUrl || result.imageUrl,
        imageHash: result.imageHash || "",
        x,
        y
      });
      const node = state.nodes.get(nodeId);
      if (node?.sourceCard) {
        node.sourceCard.summary = result.description || data.summary || "";
        node.sourceCard.sourceUrl = result.sourceUrl || result.url || "";
        if (result.imageHash) {
          node.sourceCard.imageHash = result.imageHash;
        }
        if (result.imageUrl) {
          node.sourceCard.remoteImageUrl = result.imageUrl;
        }
      }
    } else {
      nodeId = createOptionNode({
        id: `image-search-${Date.now()}-${index}-${safeNodeSlug(title)}`,
        title,
        description: String(result.description || data.summary || "").slice(0, 240),
        prompt: String(result.description || query || title).slice(0, 1200),
        tone: currentLang === "en" ? "image search" : "图片搜索",
        layoutHint: "reference",
        references: result.url ? [{ title, url: result.url, description: result.description || "", type: "web" }] : [],
        x,
        y
      }, parentId);
    }
    if (nodeId) {
      createdIds.push(nodeId);
      if (parentId && !state.links.some((link) => link.from === parentId && link.to === nodeId)) {
        state.links.push({ from: parentId, to: nodeId, kind: "image-search" });
      }
    }
  });
  appendChatMessage("assistant", currentLang === "en"
    ? `Found ${createdIds.length} visual reference cards.`
    : `已找到 ${createdIds.length} 张视觉参考卡片。`);
  if (createdIds[0]) focusNodeById(createdIds[0], "center");
  drawLinks();
  updateCounts();
  autoSave();
  setStatus(currentLang === "en" ? "Ready" : "就绪", "ready");
  return createdIds[0] || null;
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

function searchCardFromAction(action) {
  const query = String(action.query || action.title || action.nodeName || action.target || "").trim();
  const nodeId = resolveNodeIdByText(query);
  if (nodeId) {
    focusNodeById(nodeId, action.position || "center");
    return nodeId;
  }
  openCardSearchBar(query);
  return null;
}

async function exportCanvasReportFromAction(action = {}) {
  const title = String(action.title || state.latestAnalysis?.title || state.fileName || "oryzae-report").trim();
  const visibleNodes = Array.from(state.nodes.values()).filter(isNodeVisible);
  const lines = [
    `# ${title}`,
    "",
    `Generated: ${new Date().toLocaleString()}`,
    "",
    "## Canvas Cards",
    ...visibleNodes.map((node) => `- **${getNodeTitle(node)}** (${getNodeType(node)}): ${getNodeSummary(node).replace(/\s+/g, " ").slice(0, 260)}`),
    "",
    "## Links",
    ...state.links.map((link) => `- ${getNodeTitle(state.nodes.get(link.from)) || link.from} -> ${getNodeTitle(state.nodes.get(link.to)) || link.to} (${link.kind || "link"})`)
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${sanitizeFileName(title).slice(0, 40) || "oryzae-report"}.md`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return true;
}

async function runSubagentAction(action) {
  if (!state.subagentsEnabled) {
    showToast(currentLang === "en" ? "Enable Subagents before starting agent tasks." : "请先启用 Subagents，再启动 Agent 任务。");
    return null;
  }

  const parentNodeId = resolveParentNodeId(
    action,
    resolveActionNodeId(action, state.selectedNodeId || (state.nodes.has("analysis") ? "analysis" : "source"))
  );
  if (!parentNodeId || !state.nodes.has(parentNodeId)) return null;

  const title = String(action.title || action.nodeName || "Subagent").slice(0, 48);
  const prompt = String(action.prompt || action.description || action.query || title).trim();
  if (!prompt) return null;

  const nodeId = createOptionNode({
    id: `agent-${Date.now()}-${safeNodeSlug(title)}`,
    title,
    description: currentLang === "en" ? "Running a no-thinking subtask..." : "正在执行 no-thinking 子任务...",
    prompt,
    tone: "agent",
    layoutHint: "no-thinking",
    deepThinkType: "agent"
  }, parentNodeId);

  const node = nodeId ? state.nodes.get(nodeId) : null;
  const button = node?.element?.querySelector(".generate-button");
  if (button) {
    button.disabled = true;
    button.textContent = currentLang === "en" ? "Running" : "执行中";
  }
  if (nodeId) focusNodeById(nodeId, "right");
  setStatus(currentLang === "en" ? "Agent task running..." : "Agent 任务执行中...", "busy");

  try {
    let imageDataUrl = "";
    try {
      imageDataUrl = await getSourceImageDataUrl();
    } catch {
      imageDataUrl = "";
    }
    const subagentPayload = {
      message: prompt,
      imageDataUrl,
      analysis: state.latestAnalysis,
      messages: state.chatMessages.slice(-6),
      systemContext: currentLang === "en"
        ? "Run this as a concise no-thinking subagent. Return only the useful result and safe canvas actions."
        : "请作为一个简洁的 no-thinking 子任务执行者，只返回有用结果和安全的画布动作。",
      selectedContext: buildSelectedNodeContext(),
      canvas: buildVoiceCanvasContext(),
      language: currentLang,
      thinkingMode: "no-thinking",
      agentMode: false,
      subagentsEnabled: false
    };
    const data = await postStreamingChat("/api/chat", subagentPayload, null);

    const reply = String(data.reply || "").trim() || (currentLang === "en" ? "Agent task completed." : "Agent 任务已完成。");
    if (node?.option) {
      node.option.description = reply.slice(0, 360);
      node.option.prompt = `${prompt}\n\n${reply}`.slice(0, 1600);
      const descEl = node.element.querySelector(".option-description");
      if (descEl) descEl.textContent = node.option.description;
    }
    if (button) {
      button.disabled = false;
      button.textContent = currentLang === "en" ? "Use result" : "使用结果";
    }

    appendChatMessage("assistant", reply, {
      artifacts: [{
        type: "agent",
        title,
        summary: reply.slice(0, 240),
        status: "done"
      }]
    });

    const followupActions = (Array.isArray(data.actions) ? data.actions : (data.action ? [data.action] : []))
      .filter((nextAction) => nextAction?.type !== "create_agent");
    if (followupActions.length) {
      await applyVoiceActions(followupActions);
    }
    setStatus(t("status.ready"), "ready");
    autoSave();
    return nodeId;
  } catch (error) {
    const message = error?.message || (currentLang === "en" ? "Agent task failed." : "Agent 任务失败。");
    if (node?.option) {
      node.option.description = message.slice(0, 280);
      const descEl = node.element.querySelector(".option-description");
      if (descEl) descEl.textContent = node.option.description;
    }
    if (button) {
      button.disabled = false;
      button.textContent = currentLang === "en" ? "Retry" : "重试";
    }
    appendChatMessage("assistant", message);
    setStatus(t("status.error"), "error");
    return null;
  }
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

function renderRichNodeContent(element, option) {
  const slot = element?.querySelector?.(".option-rich-content");
  if (!slot) return;
  slot.innerHTML = "";
  slot.hidden = true;

  const c = option?.content;
  if (!c || typeof c !== "object") return;
  const nt = String(option.nodeType || "").toLowerCase();

  if (nt === "plan" && Array.isArray(c.steps) && c.steps.length) {
    const ol = document.createElement("ol");
    ol.className = "option-plan-steps";
    c.steps.forEach((step) => {
      const li = document.createElement("li");
      const title = (step && (step.title || step.name)) || (typeof step === "string" ? step : "");
      const desc = step && step.description;
      if (title) {
        const titleEl = document.createElement("strong");
        titleEl.textContent = title;
        li.appendChild(titleEl);
      }
      if (desc) {
        const descEl = document.createElement("p");
        descEl.textContent = desc;
        li.appendChild(descEl);
      }
      ol.appendChild(li);
    });
    slot.appendChild(ol);
    slot.hidden = false;
  } else if (nt === "todo" && Array.isArray(c.items) && c.items.length) {
    const ul = document.createElement("ul");
    ul.className = "option-todo-items";
    c.items.forEach((item) => {
      const li = document.createElement("li");
      const text = (item && (item.text || item.label)) || (typeof item === "string" ? item : "");
      const done = Boolean(item && item.done);
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.disabled = true;
      cb.checked = done;
      li.appendChild(cb);
      const span = document.createElement("span");
      span.textContent = " " + text;
      if (done) span.classList.add("done");
      li.appendChild(span);
      ul.appendChild(li);
    });
    slot.appendChild(ul);
    slot.hidden = false;
  } else if (nt === "note" && (c.text || c.body)) {
    const p = document.createElement("p");
    p.className = "option-note-text";
    p.textContent = c.text || c.body;
    slot.appendChild(p);
    slot.hidden = false;
  } else if (nt === "weather") {
    const wrap = document.createElement("div");
    wrap.className = "option-weather";
    if (c.location) {
      const loc = document.createElement("div");
      loc.className = "option-weather-loc";
      loc.textContent = c.location;
      wrap.appendChild(loc);
    }
    if (c.temp) {
      const tEl = document.createElement("div");
      tEl.className = "option-weather-temp";
      tEl.textContent = c.temp;
      wrap.appendChild(tEl);
    }
    if (c.forecast) {
      const f = document.createElement("div");
      f.className = "option-weather-forecast";
      f.textContent = c.forecast;
      wrap.appendChild(f);
    }
    if (wrap.childNodes.length) {
      slot.appendChild(wrap);
      slot.hidden = false;
    }
  } else if (nt === "map") {
    if (c.address) {
      const a = document.createElement("p");
      a.className = "option-map-address";
      a.textContent = c.address;
      slot.appendChild(a);
      if (c.lat != null && c.lng != null) {
        const ll = document.createElement("p");
        ll.className = "option-map-latlng";
        ll.textContent = `${c.lat}, ${c.lng}`;
        slot.appendChild(ll);
      }
      slot.hidden = false;
    }
  } else if (nt === "link" && c.url) {
    const a = document.createElement("a");
    a.className = "option-link-href";
    a.href = c.url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = c.title || c.url;
    slot.appendChild(a);
    if (c.description) {
      const d = document.createElement("p");
      d.className = "option-link-desc";
      d.textContent = c.description;
      slot.appendChild(d);
    }
    slot.hidden = false;
  } else if (nt === "code" && c.code) {
    const pre = document.createElement("pre");
    pre.className = "option-code-block";
    if (c.language) pre.dataset.language = c.language;
    const code = document.createElement("code");
    code.textContent = c.code;
    pre.appendChild(code);
    slot.appendChild(pre);
    slot.hidden = false;
  }
}

function createOptionNode(option, parentNodeId, taskType = "general") {
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
  applyTaskTypeBadge(element, taskType);
  element.querySelector(".option-tone").textContent = `${option.tone || "visual"} / ${option.layoutHint || "square"}`;
  element.querySelector(".option-title").textContent = option.title || t("generated.result");
  element.querySelector(".option-description").textContent = option.description || "";
  renderRichNodeContent(element, option);

  const titleEl = element.querySelector(".option-title");
  if (titleEl) makeTitleEditable(id, titleEl);

  const button = element.querySelector(".generate-button");
  if (option.nodeType && option.nodeType !== "image") {
    button.textContent = t("generated.viewContent");
  }
  button.addEventListener("click", () => generateOption(id, option));
  element.dataset.nodeType = option.nodeType || "image";
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

function createNewCanvas() {
  sessionStorage.removeItem("oryzae-last-session-id");
  const url = new URL(window.location.href);
  url.searchParams.delete("session");
  window.location.href = url.pathname + url.search;
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
  const fileTab = document.createElement("button");
  fileTab.type = "button";
  fileTab.className = "source-tab active";
  fileTab.dataset.tab = "file";
  fileTab.textContent = currentLang === "en" ? "File" : "文件";
  const urlTab = document.createElement("button");
  urlTab.type = "button";
  urlTab.className = "source-tab";
  urlTab.dataset.tab = "url";
  urlTab.textContent = currentLang === "en" ? "Link" : "链接";
  tabs.append(fileTab, urlTab);

  const upload = document.createElement("label");
  upload.className = `upload-target${imageUrl ? " has-source-image" : ""}`;
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/png,image/jpeg,image/webp,image/gif,.txt,.md,.json,.docx,.pdf,.pptx,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation";
  const empty = document.createElement("span");
  empty.className = `empty-state${imageUrl ? " hidden" : ""}`;
  empty.innerHTML = `<strong>${t("source.uploadPrompt")}</strong><span>${t("source.uploadHint")}</span>`;
  const img = document.createElement("img");
  img.className = `source-preview${imageUrl ? " has-image" : ""}`;
  img.alt = title || "Source card";
  if (imageUrl) img.src = imageUrl;
  upload.append(input, empty, img);
  attachImageCardActions(upload, nodeId);

  const urlPanel = document.createElement("div");
  urlPanel.className = "url-input-panel hidden";
  const urlInputEl = document.createElement("input");
  urlInputEl.type = "url";
  urlInputEl.placeholder = "https://...";
  urlInputEl.autocomplete = "off";
  const urlAnalyzeBtn = document.createElement("button");
  urlAnalyzeBtn.className = "primary-button";
  urlAnalyzeBtn.type = "button";
  urlAnalyzeBtn.textContent = t("source.analyzeUrl");
  urlAnalyzeBtn.disabled = true;
  urlPanel.append(urlInputEl, urlAnalyzeBtn);

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

  element.append(tabs, upload, urlPanel, caption);
  board.appendChild(element);

  const sourceCard = {
    title: title || fileName || "Source card",
    fileName: fileName || "",
    imageHash: imageHash || "",
    imageUrl: imageUrl || "",
    sourceType: imageUrl || imageHash ? "image" : "empty",
    sourceText: "",
    sourceDataUrl: "",
    sourceDataUrlHash: ""
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

  // Tab switching
  fileTab.addEventListener("click", () => {
    fileTab.classList.add("active");
    urlTab.classList.remove("active");
    upload.classList.remove("hidden");
    urlPanel.classList.add("hidden");
  });
  urlTab.addEventListener("click", () => {
    urlTab.classList.add("active");
    fileTab.classList.remove("active");
    upload.classList.add("hidden");
    urlPanel.classList.remove("hidden");
  });

  // URL input wiring
  urlInputEl.addEventListener("input", () => {
    urlAnalyzeBtn.disabled = !urlInputEl.value.trim();
  });
  urlAnalyzeBtn.addEventListener("click", async () => {
    const url = urlInputEl.value.trim();
    if (!url) return;
    setStatus(t("status.busy"), "busy");
    urlAnalyzeBtn.disabled = true;
    try {
      const data = await postJson("/api/analyze-url", { url, sessionId: currentSessionId || "" });
      const node = state.nodes.get(nodeId);
      if (node?.sourceCard) {
        node.sourceCard.sourceType = "url";
        node.sourceCard.sourceUrl = url;
        node.sourceCard.fileName = new URL(url).hostname;
        node.sourceCard.title = data.title || node.sourceCard.title || node.sourceCard.fileName;
      }
      name.textContent = trimMiddle(node.sourceCard.fileName, 28);
      research.disabled = false;
      syncSourceCardImageActionState(nodeId);
      setStatus(t("status.ready"), "ready");
      autoSave();
    } catch (error) {
      setStatus(error.message || "URL analysis failed", "error");
    } finally {
      urlAnalyzeBtn.disabled = !urlInputEl.value.trim();
    }
  });

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
  const hasFile = Boolean(
    hasImage ||
    node?.sourceCard?.sourceText ||
    node?.sourceCard?.sourceDataUrl ||
    node?.sourceCard?.sourceDataUrlHash ||
    node?.sourceCard?.sourceUrl
  );
  upload.classList.toggle("has-source-image", hasImage);
  upload.classList.toggle("has-source-file", hasFile);
}

async function handleStandaloneSourceFile(nodeId, file) {
  const isDocumentFile = /\.(txt|md|json|docx|pdf|pptx)$/i.test(file?.name || "");
  if (!file?.type?.startsWith("image/") && !isDocumentFile) {
    showToast(t("file.unsupported"));
    return;
  }
  const node = state.nodes.get(nodeId);
  if (!node?.sourceCard) return;
  setStatus(t("status.busy"), "busy");
  try {
    const img = node.element.querySelector(".source-preview");
    const empty = node.element.querySelector(".empty-state");
    const name = node.element.querySelector(".standalone-source-name");
    const research = node.element.querySelector(".research-button");

    if (file.type.startsWith("image/")) {
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
        sourceType: "image",
        sourceText: "",
        sourceDataUrl: "",
        sourceDataUrlHash: ""
      };
      if (img) {
        img.src = imageUrl;
        img.classList.add("has-image");
      }
    } else {
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      const isPlainText = ["txt", "md", "json"].includes(ext);
      const buffer = await file.arrayBuffer();
      const base64 = arrayBufferToBase64(buffer);
      const mimeMap = {
        txt: "text/plain",
        md: "text/markdown",
        json: "application/json",
        docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        pdf: "application/pdf",
        pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation"
      };
      const dataUrl = `data:${mimeMap[ext] || file.type || "application/octet-stream"};base64,${base64}`;
      let stored = null;
      try {
        stored = await postJson("/api/assets", { dataUrl, kind: "upload", fileName: file.name });
      } catch {}
      node.sourceCard = {
        ...node.sourceCard,
        title: file.name,
        fileName: file.name,
        imageHash: "",
        imageUrl: "",
        sourceType: "text",
        sourceText: isPlainText ? await file.text() : "",
        sourceDataUrl: isPlainText ? "" : dataUrl,
        sourceDataUrlHash: stored?.hash || ""
      };
      if (img) {
        img.src = "";
        img.classList.remove("has-image");
      }
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
  if (sourceCard?.sourceType === "text" && !sourceCard.sourceText && !sourceCard.sourceDataUrl) {
    await ensureSourceCardDocumentDataUrl(sourceCard);
  }
  if (sourceCard?.sourceType === "image" && !sourceCard?.imageUrl && !sourceCard?.imageHash) return;
  if (sourceCard?.sourceType === "text" && !sourceCard?.sourceText && !sourceCard?.sourceDataUrl) return;
  if (!sourceCard?.sourceType || sourceCard.sourceType === "empty") return;
  forceSelectNode(nodeId);
  setStatus(t("status.busy"), "busy");
  const button = node.element.querySelector(".research-button");
  if (button) {
    button.disabled = true;
    button.classList.add("is-busy");
  }
  try {
    let data;
    if (sourceCard.sourceType === "text") {
      data = await postJson("/api/analyze-text", {
        text: sourceCard.sourceText || "",
        dataUrl: sourceCard.sourceDataUrl || "",
        fileName: sourceCard.fileName || sourceCard.title || "source-card",
        thinkingMode: state.thinkingMode,
        sessionId: currentSessionId || ""
      }, {
        timeoutMs: 150000,
        timeoutMessage: t("research.timeout")
      });
    } else if (sourceCard.sourceType === "url") {
      data = await postJson("/api/analyze-url", {
        url: sourceCard.sourceUrl,
        thinkingMode: state.thinkingMode,
        sessionId: currentSessionId || ""
      }, {
        timeoutMs: 150000,
        timeoutMessage: t("research.timeout")
      });
    } else {
      data = await postJson("/api/analyze", {
        imageDataUrl: await getImageDataUrlForNode(nodeId),
        fileName: sourceCard.fileName || sourceCard.title || "source-card",
        thinkingMode: state.thinkingMode,
        sessionId: currentSessionId || ""
      }, {
        timeoutMs: 150000,
        timeoutMessage: t("research.timeout")
      });
    }

    if (data.options?.length) {
      renderStandaloneOptions(data.options, nodeId, data.taskType || "general");
    } else {
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
    }
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
  element.style.left = `${x - 20}px`;  // Center the 40px circle
  element.style.top = `${y - 20}px`;

  const count = document.createElement("span");
  count.className = "junction-count";
  count.textContent = "0";

  element.appendChild(count);
  board.appendChild(element);

  registerNode(id, element, {
    x: x - 20,
    y: y - 20,
    width: 40,
    height: 40,
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
    actionResults: normalizeChatActionResults(metadata.actionResults),
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
  if ("actionResults" in updates) {
    message.actionResults = normalizeChatActionResults(updates.actionResults);
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
      text.className = "chat-text markdown-body";
      if (message.role === "assistant") {
        text.innerHTML = renderMarkdownToHtml(message.content);
        addCopyButtons(text);
      } else {
        text.textContent = message.content;
      }
      if (message.pending) {
        const cursor = document.createElement("span");
        cursor.className = "streaming-cursor";
        text.appendChild(cursor);
      }
      line.appendChild(text);
    } else if (message.pending) {
      const text = document.createElement("span");
      text.className = "chat-text markdown-body";
      const cursor = document.createElement("span");
      cursor.className = "streaming-cursor";
      text.appendChild(cursor);
      line.appendChild(text);
    }
    if (message.role === "assistant" && message.artifacts?.length) {
      line.appendChild(renderChatArtifacts(message.artifacts));
    }
    if (message.role === "assistant" && message.actionResults?.length) {
      message.actionResults.forEach((ar) => {
        const card = document.createElement("div");
        card.className = "chat-action-feedback";
        card.setAttribute("role", "button");
        card.setAttribute("tabindex", "0");
        const icon = ACTION_FEEDBACK_ICONS[ar.type] || "⚡";
        const labelKey = `chat.actionFeedback.${ar.type}`;
        const label = t(labelKey) || t("chat.actionApplied") || "已执行";
        card.innerHTML = `
          <span class="chat-action-icon">${escapeHtml(icon)}</span>
          <span class="chat-action-label">${escapeHtml(label)}</span>
          <span class="chat-action-title">${escapeHtml(ar.title || "")}</span>
        `;
        if (ar.nodeId) {
          card.title = t("chat.clickToFocus") || "点击跳转到画布节点";
          card.onclick = () => focusNodeById(ar.nodeId);
          card.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); focusNodeById(ar.nodeId); } };
        }
        line.appendChild(card);
      });
    } else if (message.role === "assistant" && message.actions?.length) {
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

function applyTaskTypeBadge(element, taskType) {
  const badge = element.querySelector(".card-badge");
  if (!badge) return;
  const type = taskType || "general";
  const cssType = type === "image_generation" ? "visual" : type;
  badge.className = `card-badge badge-${cssType}`;
  badge.textContent = t(`badge.${type}`) || type;
  element.dataset.taskType = type;
}

function renderOptions(options, taskType = "general") {
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
    applyTaskTypeBadge(element, taskType);
    element.querySelector(".option-tone").textContent = `${option.tone || "visual"} / ${option.layoutHint || "square"}`;
    element.querySelector(".option-title").textContent = option.title || t("generated.result");
    element.querySelector(".option-description").textContent = option.description || "";
    renderRichNodeContent(element, option);

    const titleEl = element.querySelector(".option-title");
    if (titleEl) makeTitleEditable(id, titleEl);

    const button = element.querySelector(".generate-button");
    if (option.nodeType && option.nodeType !== "image") {
      button.textContent = t("generated.viewContent");
    }
    button.addEventListener("click", () => generateOption(id, option));
    element.dataset.nodeType = option.nodeType || "image";

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

function renderStandaloneOptions(options, parentNodeId, taskType = "general") {
  const parentNode = state.nodes.get(parentNodeId);
  if (!parentNode) return;

  // Remove existing option nodes linked to this parent
  for (const [id, node] of Array.from(state.nodes.entries())) {
    if (id.startsWith("option-") && state.links.some(l => l.from === parentNodeId && l.to === id)) {
      node.element.remove();
      state.nodes.delete(id);
      state.collapsed.delete(id);
      state.selectiveHidden.delete(id);
    }
  }
  state.links = state.links.filter(l => !(l.from === parentNodeId && l.to.startsWith("option-")));

  options.forEach((option, index) => {
    const offsetX = 380;
    const offsetY = 40 + index * 24;
    const newX = Number.isFinite(option.x) ? option.x : (parentNode.x || 0) + offsetX;
    const newY = Number.isFinite(option.y) ? option.y : (parentNode.y || 0) + offsetY;

    const id = `option-${option.id || `${parentNodeId}-${index}`}`;

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
    applyTaskTypeBadge(element, taskType);
    element.querySelector(".option-tone").textContent = `${option.tone || "visual"} / ${option.layoutHint || "square"}`;
    element.querySelector(".option-title").textContent = option.title || t("generated.result");
    element.querySelector(".option-description").textContent = option.description || "";
    renderRichNodeContent(element, option);

    const titleEl = element.querySelector(".option-title");
    if (titleEl) makeTitleEditable(id, titleEl);

    const button = element.querySelector(".generate-button");
    if (option.nodeType && option.nodeType !== "image") {
      button.textContent = t("generated.viewContent");
    }
    button.addEventListener("click", () => generateOption(id, option));
    element.dataset.nodeType = option.nodeType || "image";
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
  });

  applyCollapseState();
  updateCounts();
  drawLinks();
}

function renderExploreOptions(options, references, taskType = "general") {
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
    applyTaskTypeBadge(element, taskType);
    element.querySelector(".option-tone").textContent = `${option.tone || "visual"} / ${option.layoutHint || "square"}`;
    element.querySelector(".option-title").textContent = option.title || t("generated.result");
    element.querySelector(".option-description").textContent = option.description || "";
    renderRichNodeContent(element, option);

    const titleEl = element.querySelector(".option-title");
    if (titleEl) makeTitleEditable(id, titleEl);

    const button = element.querySelector(".generate-button");
    if (option.nodeType && option.nodeType !== "image") {
      button.textContent = t("generated.viewContent");
    }
    button.addEventListener("click", () => generateOption(id, option));
    element.dataset.nodeType = option.nodeType || "image";

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

async function generateOptionWithReference(id, option, referenceImageDataUrl, editOptions = {}) {
  const node = state.nodes.get(id);
  if (!node) return;

  const element = node.element;
  const wasGenerated = Boolean(node.generated);
  const button = element.querySelector(".generate-button");

  // Rich content nodes (non-image) bypass image generation
  if (option.nodeType && option.nodeType !== "image") {
    element.classList.add("loading");
    if (button) button.disabled = true;
    try {
      turnIntoRichNode(element, option);
      node.width = element.offsetWidth;
      node.height = element.offsetHeight;
      node.generated = true;
      if (!wasGenerated) {
        state.generatedCount += 1;
      }
      applyCollapseState();
      updateCounts();
      autoSave();
      setStatus(t("status.ready"), "ready");
    } finally {
      element.classList.remove("loading");
      if (button) button.disabled = false;
    }
    return;
  }

  if (!referenceImageDataUrl) {
    showSelectionToast(t("chat.noSourceForGenerate"));
    return;
  }

  element.classList.add("loading");
  if (button) button.disabled = true;
  setStatus(t("status.busy"), "busy");

  try {
    const data = await postJson("/api/generate", {
      imageDataUrl: referenceImageDataUrl,
      maskDataUrl: editOptions.maskDataUrl || "",
      size: editOptions.size || "",
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

    // Push the generated direction into the session RAG pool so future chats
    // can recall what was made and why without rehydrating from canvas state.
    const generatedSummary = [
      option?.title ? `标题：${option.title}` : "",
      data?.prompt || option?.prompt ? `Prompt：${data?.prompt || option?.prompt}` : "",
      explanation ? `说明：${explanation}` : ""
    ].filter(Boolean).join("\n");
    if (generatedSummary) {
      ingestSessionContext({
        kind: "generated",
        text: generatedSummary,
        sourceId: id,
        sourceMeta: {
          nodeId: id,
          title: option?.title || "",
          imageHash: node.imageHash || ""
        },
        snippet: true,
        replace: true
      });
    }

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

  // Re-add edge handles since innerHTML wipe removed them
  addEdgeHandles(element, nodeId);
}

// ---- Rich Node Types ----

function simpleMarkdownToHtml(text) {
  if (!text) return "";
  let html = String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  // code blocks
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const highlighted = highlightCode(code.trim(), lang);
    return `<pre class="rich-code-block" data-lang="${lang || "text"}"><code>${highlighted}</code></pre>`;
  });
  // inline code
  html = html.replace(/`([^`]+)`/g, "<code class=\"rich-inline-code\">$1</code>");
  // headings
  html = html.replace(/^### (.+)$/gm, "<h4 class=\"rich-md-h4\">$1</h4>");
  html = html.replace(/^## (.+)$/gm, "<h3 class=\"rich-md-h3\">$1</h3>");
  html = html.replace(/^# (.+)$/gm, "<h2 class=\"rich-md-h2\">$1</h2>");
  // bold / italic
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  // links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, url) => {
    const safeUrl = String(url).replace(/[" -]/g, "");
    if (!safeUrl.startsWith("http://") && !safeUrl.startsWith("https://") && !safeUrl.startsWith("mailto:")) {
      return `<span class="rich-md-link-invalid">${text}</span>`;
    }
    return `<a href="${safeUrl}" target="_blank" rel="noopener" class="rich-md-link">${text}</a>`;
  });
  // unordered lists
  html = html.replace(/(^|\n)- (.+)/g, '$1<li class="rich-md-li">$2</li>');
  html = html.replace(/(<li[^>]*>.*<\/li>\n?)+/g, '<ul class="rich-md-ul">$&</ul>');
  // ordered lists
  html = html.replace(/(^|\n)\d+\. (.+)/g, '$1<li class="rich-md-li">$2</li>');
  html = html.replace(/(<li[^>]*>.*<\/li>\n?)+/g, '<ol class="rich-md-ol">$&</ol>');
  // paragraphs
  html = html.split(/\n\n+/).map(p => p.trim() ? `<p class="rich-md-p">${p}</p>` : "").join("\n");
  return html;
}

function highlightCode(code, language) {
  if (!code) return "";
  const html = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const commonKeywords = /\b(const|let|var|function|return|if|else|for|while|switch|case|break|continue|class|extends|import|export|from|async|await|new|this|typeof|instanceof|try|catch|finally|throw|yield|default|static|get|set|true|false|null|undefined)\b/g;
  const jsTypes = /\b(string|number|boolean|object|array|void|any|never|unknown|bigint|symbol)\b/g;
  const strings = /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g;
  const comments = /(\/\/.*$|\/\*[\s\S]*?\*\/|#.*$)/gm;
  const numbers = /\b(\d+(?:\.\d+)?)\b/g;

  let result = html;
  // comments first (wrap in placeholder to avoid re-highlighting)
  const placeholders = [];
  result = result.replace(comments, (match) => {
    placeholders.push(`<span class="hl-comment">${match}</span>`);
    return `\x00${placeholders.length - 1}\x00`;
  });
  result = result.replace(strings, (match) => {
    placeholders.push(`<span class="hl-string">${match}</span>`);
    return `\x00${placeholders.length - 1}\x00`;
  });
  result = result.replace(commonKeywords, (match) => {
    placeholders.push(`<span class="hl-keyword">${match}</span>`);
    return `\x00${placeholders.length - 1}\x00`;
  });
  result = result.replace(jsTypes, (match) => {
    placeholders.push(`<span class="hl-type">${match}</span>`);
    return `\x00${placeholders.length - 1}\x00`;
  });
  result = result.replace(numbers, (match) => {
    placeholders.push(`<span class="hl-number">${match}</span>`);
    return `\x00${placeholders.length - 1}\x00`;
  });
  // restore placeholders
  result = result.replace(/\x00(\d+)\x00/g, (_, idx) => placeholders[Number(idx)]);
  return result;
}

function turnIntoRichNode(element, option) {
  const nodeType = option.nodeType || "note";
  element.className = `node option-node rich-node rich-node-${nodeType}`;
  element.innerHTML = "";
  ensureCollapseControl(element.dataset.nodeId, element);
  const nodeId = element.dataset.nodeId;

  const content = document.createElement("div");
  content.className = "rich-content";

  // Header
  const eyebrow = document.createElement("p");
  eyebrow.className = "eyebrow rich-eyebrow";
  eyebrow.textContent = `${option.tone || nodeType} / ${t("generated.result")}`;
  content.appendChild(eyebrow);

  const title = document.createElement("h3");
  title.className = "rich-title";
  title.textContent = option.title || t("generated.result");
  content.appendChild(title);
  makeTitleEditable(nodeId, title);

  // Type-specific body
  const body = document.createElement("div");
  body.className = "rich-body";

  switch (nodeType) {
    case "note": {
      body.innerHTML = simpleMarkdownToHtml(option.content?.text || option.description || "");
      break;
    }
    case "plan": {
      const steps = option.content?.steps || option.description?.split(/\n/).filter(Boolean).map((s, i) => ({ title: s.replace(/^\d+\.\s*/, ""), desc: "" })) || [];
      const ol = document.createElement("ol");
      ol.className = "rich-plan-steps";
      steps.forEach((step, i) => {
        const li = document.createElement("li");
        li.className = "rich-plan-step";
        li.innerHTML = `<span class="rich-plan-num">${i + 1}</span><div class="rich-plan-text"><strong>${String(step.title || step).slice(0, 80)}</strong>${step.desc ? `<p>${step.desc}</p>` : ""}</div>`;
        ol.appendChild(li);
      });
      body.appendChild(ol);
      break;
    }
    case "todo": {
      const items = option.content?.items || option.description?.split(/\n/).filter(Boolean).map((s) => ({ text: s.replace(/^- \[[ x]\]\s*/, ""), done: /^- \[[xX]\]/.test(s) })) || [];
      const ul = document.createElement("ul");
      ul.className = "rich-todo-list";
      items.forEach((item, i) => {
        const li = document.createElement("li");
        li.className = "rich-todo-item";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "rich-todo-check";
        checkbox.checked = Boolean(item.done);
        checkbox.addEventListener("change", () => {
          li.classList.toggle("rich-todo-done", checkbox.checked);
          if (option.content?.items) option.content.items[i].done = checkbox.checked;
          autoSave();
        });
        const span = document.createElement("span");
        span.className = "rich-todo-text";
        span.textContent = String(item.text || item).slice(0, 120);
        if (item.done) li.classList.add("rich-todo-done");
        li.append(checkbox, span);
        ul.appendChild(li);
      });
      body.appendChild(ul);
      break;
    }
    case "weather": {
      const w = option.content || {};
      const wrap = document.createElement("div");
      wrap.className = "rich-weather-wrap";
      const icon = document.createElement("div");
      icon.className = "rich-weather-icon";
      icon.textContent = w.icon || "☀"; // default sun
      const temp = document.createElement("div");
      temp.className = "rich-weather-temp";
      temp.textContent = w.temp || "";
      const loc = document.createElement("div");
      loc.className = "rich-weather-location";
      loc.textContent = w.location || "";
      const forecast = document.createElement("div");
      forecast.className = "rich-weather-forecast";
      forecast.textContent = w.forecast || "";
      wrap.append(icon, temp, loc, forecast);
      body.appendChild(wrap);
      break;
    }
    case "map": {
      const m = option.content || {};
      const wrap = document.createElement("div");
      wrap.className = "rich-map-wrap";
      if (m.url) {
        const img = document.createElement("img");
        img.className = "rich-map-img";
        img.src = m.url;
        img.alt = m.title || "Map";
        img.onerror = () => { img.style.display = "none"; };
        wrap.appendChild(img);
      }
      const coord = document.createElement("div");
      coord.className = "rich-map-coord";
      if (m.lat != null && m.lng != null) {
        coord.textContent = `${m.lat.toFixed(4)}, ${m.lng.toFixed(4)}`;
      } else if (m.address) {
        coord.textContent = m.address;
      }
      const link = document.createElement("a");
      link.className = "rich-map-link";
      link.target = "_blank";
      link.rel = "noopener";
      link.href = m.mapUrl || (m.lat != null && m.lng != null ? `https://maps.google.com/?q=${m.lat},${m.lng}` : (m.address ? `https://maps.google.com/?q=${encodeURIComponent(m.address)}` : "#"));
      link.textContent = t("nodeType.open");
      wrap.append(coord, link);
      body.appendChild(wrap);
      break;
    }
    case "link": {
      const l = option.content || {};
      const wrap = document.createElement("a");
      wrap.className = "rich-link-wrap";
      wrap.href = l.url || "#";
      wrap.target = "_blank";
      wrap.rel = "noopener";
      if (l.imageUrl) {
        const img = document.createElement("img");
        img.className = "rich-link-thumb";
        img.src = l.imageUrl;
        img.alt = l.title || "";
        img.onerror = () => { img.style.display = "none"; };
        wrap.appendChild(img);
      }
      const titleEl = document.createElement("div");
      titleEl.className = "rich-link-title";
      titleEl.textContent = l.title || option.title || "";
      const descEl = document.createElement("div");
      descEl.className = "rich-link-desc";
      descEl.textContent = l.description || option.description || "";
      const urlEl = document.createElement("div");
      urlEl.className = "rich-link-url";
      urlEl.textContent = l.url || "";
      wrap.append(titleEl, descEl, urlEl);
      body.appendChild(wrap);
      break;
    }
    case "code": {
      const lang = option.content?.language || option.language || "javascript";
      const codeText = option.content?.code || option.description || "";
      const pre = document.createElement("pre");
      pre.className = "rich-code-block";
      const code = document.createElement("code");
      code.innerHTML = highlightCode(codeText, lang);
      pre.appendChild(code);
      body.appendChild(pre);
      break;
    }
    default: {
      body.innerHTML = simpleMarkdownToHtml(option.description || "");
    }
  }

  content.appendChild(body);

  // Actions
  const actions = document.createElement("div");
  actions.className = "rich-actions";

  const copyBtn = document.createElement("button");
  copyBtn.className = "secondary-button";
  copyBtn.textContent = t("nodeType.copy");
  copyBtn.addEventListener("click", async () => {
    let text = "";
    switch (nodeType) {
      case "code": text = option.content?.code || option.description || ""; break;
      case "link": text = option.content?.url || ""; break;
      case "note": text = option.content?.text || option.description || ""; break;
      case "plan": text = (option.content?.steps || []).map((s, i) => `${i + 1}. ${s.title || s}`).join("\n"); break;
      case "todo": text = (option.content?.items || []).map((it) => `- [${it.done ? "x" : " "}] ${it.text || it}`).join("\n"); break;
      default: text = option.description || "";
    }
    try { await navigator.clipboard.writeText(text); showToast(t("nodeType.copy") + " OK"); } catch {}
  });

  const regen = document.createElement("button");
  regen.className = "secondary-button";
  regen.textContent = t("generated.regenerate");
  regen.addEventListener("click", () => generateOption(nodeId, option));

  actions.append(copyBtn, regen);
  content.appendChild(actions);

  element.appendChild(content);

  addEdgeHandles(element, nodeId);
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
  clearViewerMask();
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

function setViewerEditPanelVisible(visible) {
  viewerModifyPanel?.classList.toggle("hidden", !visible);
  imageViewerModal?.classList.toggle("is-editing", visible);
  if (!visible) {
    setViewerBrushActive(false);
    closeViewerAspectMenu();
  } else {
    syncViewerMaskCanvas();
    viewerPromptInput?.focus();
  }
}

function setViewerBrushActive(active) {
  viewerEditState.brushActive = Boolean(active);
  viewerBrushTool?.classList.toggle("active", viewerEditState.brushActive);
  viewerBrushTool?.setAttribute("aria-pressed", viewerEditState.brushActive ? "true" : "false");
  if (viewerMaskCanvas) {
    viewerMaskCanvas.classList.toggle("active", viewerEditState.brushActive);
    viewerMaskCanvas.style.pointerEvents = viewerEditState.brushActive ? "auto" : "none";
  }
  if (viewerEditState.brushActive) {
    syncViewerMaskCanvas();
  }
}

function clearViewerMask() {
  const ctx = viewerMaskCanvas?.getContext("2d");
  if (ctx && viewerMaskCanvas.width && viewerMaskCanvas.height) {
    ctx.clearRect(0, 0, viewerMaskCanvas.width, viewerMaskCanvas.height);
  }
  viewerEditState.hasMask = false;
  viewerEditState.lastMaskPoint = null;
  viewerClearMask?.classList.add("hidden");
  viewerMaskCanvas?.classList.remove("has-mask");
}

function resetViewerEditControls() {
  setViewerEditPanelVisible(false);
  clearViewerMask();
  setViewerAspect("auto");
}

function syncViewerMaskCanvas() {
  if (!viewerMaskCanvas || !viewerImage || !imageViewerModal || imageViewerModal.classList.contains("hidden")) return;
  const rect = viewerImage.getBoundingClientRect();
  const contentRect = imageViewerModal.getBoundingClientRect();
  const naturalWidth = viewerImage.naturalWidth || 0;
  const naturalHeight = viewerImage.naturalHeight || 0;
  if (!rect.width || !rect.height || !naturalWidth || !naturalHeight) return;

  const boxRatio = rect.width / rect.height;
  const imageRatio = naturalWidth / naturalHeight;
  let width = rect.width;
  let height = rect.height;
  let offsetX = 0;
  let offsetY = 0;
  if (imageRatio > boxRatio) {
    height = rect.width / imageRatio;
    offsetY = (rect.height - height) / 2;
  } else {
    width = rect.height * imageRatio;
    offsetX = (rect.width - width) / 2;
  }

  if (viewerMaskCanvas.width !== naturalWidth || viewerMaskCanvas.height !== naturalHeight) {
    viewerMaskCanvas.width = naturalWidth;
    viewerMaskCanvas.height = naturalHeight;
    viewerEditState.hasMask = false;
    viewerEditState.lastMaskPoint = null;
    viewerClearMask?.classList.add("hidden");
  }
  viewerMaskCanvas.style.left = `${rect.left - contentRect.left + offsetX}px`;
  viewerMaskCanvas.style.top = `${rect.top - contentRect.top + offsetY}px`;
  viewerMaskCanvas.style.width = `${width}px`;
  viewerMaskCanvas.style.height = `${height}px`;
}

function viewerMaskPointFromEvent(event) {
  if (!viewerMaskCanvas) return null;
  const rect = viewerMaskCanvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  return {
    x: clamp((event.clientX - rect.left) * (viewerMaskCanvas.width / rect.width), 0, viewerMaskCanvas.width),
    y: clamp((event.clientY - rect.top) * (viewerMaskCanvas.height / rect.height), 0, viewerMaskCanvas.height)
  };
}

function beginViewerMaskStroke(event) {
  if (!viewerEditState.brushActive || !viewerMaskCanvas) return;
  event.preventDefault();
  syncViewerMaskCanvas();
  viewerEditState.drawing = true;
  viewerMaskCanvas.setPointerCapture?.(event.pointerId);
  const point = viewerMaskPointFromEvent(event);
  viewerEditState.lastMaskPoint = point;
  if (point) drawViewerMaskPoint(point);
}

function continueViewerMaskStroke(event) {
  if (!viewerEditState.drawing || !viewerEditState.brushActive) return;
  event.preventDefault();
  const point = viewerMaskPointFromEvent(event);
  if (point) drawViewerMaskPoint(point, viewerEditState.lastMaskPoint);
  viewerEditState.lastMaskPoint = point;
}

function endViewerMaskStroke(event) {
  if (!viewerEditState.drawing) return;
  viewerEditState.drawing = false;
  viewerEditState.lastMaskPoint = null;
  try {
    viewerMaskCanvas?.releasePointerCapture?.(event.pointerId);
  } catch {
    // Pointer capture may already be gone after leaving the canvas.
  }
}

function drawViewerMaskPoint(point, fromPoint = null) {
  const ctx = viewerMaskCanvas?.getContext("2d");
  if (!ctx) return;
  const scale = viewerMaskCanvas.width / Math.max(viewerMaskCanvas.getBoundingClientRect().width, 1);
  const radius = Math.max(12, viewerEditState.brushSize * scale * 0.5);
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "rgba(255, 74, 40, 0.48)";
  ctx.strokeStyle = "rgba(255, 74, 40, 0.48)";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = radius * 2;
  ctx.shadowColor = "rgba(255, 74, 40, 0.28)";
  ctx.shadowBlur = radius * 0.18;
  if (fromPoint) {
    ctx.beginPath();
    ctx.moveTo(fromPoint.x, fromPoint.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  viewerEditState.hasMask = true;
  viewerClearMask?.classList.remove("hidden");
  viewerMaskCanvas?.classList.add("has-mask");
}

function buildViewerMaskDataUrl() {
  if (!viewerMaskCanvas || !viewerEditState.hasMask) return "";
  const sourceCtx = viewerMaskCanvas.getContext("2d");
  if (!sourceCtx) return "";
  const sourceData = sourceCtx.getImageData(0, 0, viewerMaskCanvas.width, viewerMaskCanvas.height);
  const output = document.createElement("canvas");
  output.width = viewerMaskCanvas.width;
  output.height = viewerMaskCanvas.height;
  const outputCtx = output.getContext("2d");
  outputCtx.fillStyle = "#000000";
  outputCtx.fillRect(0, 0, output.width, output.height);
  const maskData = outputCtx.createImageData(output.width, output.height);
  for (let i = 0; i < sourceData.data.length; i += 4) {
    const alpha = sourceData.data[i + 3];
    const value = alpha > 8 ? 255 : 0;
    maskData.data[i] = value;
    maskData.data[i + 1] = value;
    maskData.data[i + 2] = value;
    maskData.data[i + 3] = 255;
  }
  outputCtx.putImageData(maskData, 0, 0);
  return output.toDataURL("image/png");
}

function toggleViewerAspectMenu() {
  if (!viewerAspectMenu || !viewerAspectButton) return;
  const shouldOpen = viewerAspectMenu.classList.contains("hidden");
  viewerAspectMenu.classList.toggle("hidden", !shouldOpen);
  viewerAspectButton.setAttribute("aria-expanded", shouldOpen ? "true" : "false");
}

function closeViewerAspectMenu() {
  viewerAspectMenu?.classList.add("hidden");
  viewerAspectButton?.setAttribute("aria-expanded", "false");
}

function setViewerAspect(aspect) {
  viewerEditState.aspect = VIEWER_ASPECT_OPTIONS[aspect] ? aspect : "auto";
  updateViewerAspectUI();
}

function updateViewerAspectUI() {
  const selected = VIEWER_ASPECT_OPTIONS[viewerEditState.aspect] || VIEWER_ASPECT_OPTIONS.auto;
  if (viewerAspectLabel) viewerAspectLabel.textContent = selected.label[currentLang] || selected.label.zh;
  viewerAspectMenu?.querySelectorAll("[data-aspect]").forEach((button) => {
    const active = button.dataset.aspect === viewerEditState.aspect;
    button.classList.toggle("active", active);
  });
}

function currentViewerAspectSize() {
  return (VIEWER_ASPECT_OPTIONS[viewerEditState.aspect] || VIEWER_ASPECT_OPTIONS.auto).size || "";
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
  resetViewerEditControls();
  setViewerEditPanelVisible(editing);

  const shareBtn = imageViewerModal.querySelector("#imageShareButton");
  if (shareBtn) {
    shareBtn.onclick = () => openImageShareModal(nodeId);
  }

  populateViewerThumbnails(nodeId);

  imageViewerModal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
  requestAnimationFrame(syncViewerMaskCanvas);

  viewerImage.addEventListener("touchstart", handleViewerTouchStart, { passive: true });
  viewerImage.addEventListener("touchend", handleViewerTouchEnd, { passive: true });

  if (editing) viewerPromptInput?.focus();
  else imageViewerModal.querySelector("#closeImageViewer")?.focus();
}

function closeImageViewer() {
  resetViewerEditControls();
  imageViewerModal.classList.add("hidden");
  viewerImage.src = "";
  document.body.style.overflow = "";
  currentViewerNodeId = null;
  viewerImage.removeEventListener("touchstart", handleViewerTouchStart);
  viewerImage.removeEventListener("touchend", handleViewerTouchEnd);
}

async function submitViewerImageEdit(prompt) {
  if (!currentViewerNodeId) return;
  const info = getImageNodeInfo(currentViewerNodeId);
  if (!info) return;
  if (viewerEditState.brushActive && !viewerEditState.hasMask) {
    showSelectionToast(t("viewer.maskRequired"));
    return;
  }

  const maskDataUrl = buildViewerMaskDataUrl();
  const aspectSize = currentViewerAspectSize();
  const aspectKey = viewerEditState.aspect;
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
        layoutHint: aspectKey === "auto" ? "image edit" : aspectKey
      };
      const parentId = state.latestAnalysis && state.nodes.has("analysis") ? "analysis" : "source";
      const nodeId = createOptionNode(option, parentId);
      if (nodeId) {
        forceSelectNode(nodeId);
        await generateOptionWithReference(nodeId, option, referenceImageDataUrl, { maskDataUrl, size: aspectSize });
      }
      return;
    }

    const node = info.node;
    const modifiedOption = {
      ...(node.option || {}),
      id: node.option?.id || `edit-${Date.now()}`,
      title: node.option?.title || prompt.slice(0, 48),
      description: prompt,
      prompt,
      layoutHint: aspectKey === "auto" ? node.option?.layoutHint : aspectKey
    };
    node.option = modifiedOption;
    await generateOptionWithReference(info.nodeId, modifiedOption, referenceImageDataUrl, { maskDataUrl, size: aspectSize });
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
    if (pos.width) card.style.width = `${pos.width}px`;
    if (pos.height) card.style.height = `${pos.height}px`;

    // Type badge
    const typeBadge = document.createElement("span");
    typeBadge.className = "blueprint-card-badge";
    const typeText = node.generated ? t("generated.result") : node.option?.tone || "option";
    typeBadge.textContent = typeText;

    const header = document.createElement("div");
    header.className = "blueprint-card-header";

    const title = document.createElement("div");
    title.className = "blueprint-card-title";
    title.textContent = node.option?.title || node.sourceCard?.title || cardId;
    title.title = "Double-click to rename";
    title.addEventListener("dblclick", (event) => {
      event.stopPropagation();
      if (card.querySelector(".blueprint-card-title-input")) return;
      const original = title.textContent;
      title.textContent = "";
      const input = document.createElement("input");
      input.type = "text";
      input.className = "blueprint-card-title-input";
      input.value = original;
      title.appendChild(input);
      input.focus();
      input.select();
      const save = () => {
        const next = input.value.trim() || original;
        title.textContent = next;
        // Persist rename to actual node
        const realNode = state.nodes.get(cardId);
        if (realNode?.option) realNode.option.title = next;
        if (realNode?.sourceCard) realNode.sourceCard.title = next;
        autoSave();
      };
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          input.blur();
        } else if (e.key === "Escape") {
          e.preventDefault();
          title.textContent = original;
        }
      });
      input.addEventListener("blur", save, { once: true });
    });

    header.appendChild(title);
    header.appendChild(typeBadge);
    card.appendChild(header);

    // Description
    const descText = node.option?.description || node.explanation || "";
    if (descText) {
      const desc = document.createElement("div");
      desc.className = "blueprint-card-desc";
      desc.textContent = descText;
      card.appendChild(desc);
    }

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

    // Add resize handle
    const resizeHandle = document.createElement("div");
    resizeHandle.className = "blueprint-resize-handle";
    resizeHandle.addEventListener("pointerdown", (event) => startBlueprintCardResize(event, card, cardId, canvas));
    card.appendChild(resizeHandle);

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

    // Persist position and size to state.blueprints
    const junctionId = blueprintModal.dataset.junctionId;
    if (!junctionId) return;
    if (!state.blueprints.has(junctionId)) {
      state.blueprints.set(junctionId, { positions: {}, relationships: [] });
    }
    const blueprint = state.blueprints.get(junctionId);
    blueprint.positions[cardId] = {
      x: parseFloat(element.style.left) || 0,
      y: parseFloat(element.style.top) || 0,
      width: parseFloat(element.style.width) || element.offsetWidth,
      height: parseFloat(element.style.height) || element.offsetHeight
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

function startBlueprintCardResize(event, cardElement, cardId, canvas) {
  event.stopPropagation();
  event.preventDefault();

  const start = {
    pointerId: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    width: cardElement.offsetWidth,
    height: cardElement.offsetHeight
  };
  cardElement.setPointerCapture(event.pointerId);

  const onPointerMove = (moveEvent) => {
    const dx = moveEvent.clientX - start.x;
    const dy = moveEvent.clientY - start.y;
    const newWidth = Math.max(140, start.width + dx);
    const newHeight = Math.max(100, start.height + dy);
    cardElement.style.width = `${newWidth}px`;
    cardElement.style.height = `${newHeight}px`;

    const junctionId = blueprintModal.dataset.junctionId;
    const blueprint = state.blueprints.get(junctionId);
    if (blueprint?.relationships?.length > 0) {
      drawBlueprintLinks(canvas, blueprint.relationships);
    }
  };

  const onPointerUp = () => {
    cardElement.releasePointerCapture(start.pointerId);
    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerup", onPointerUp);

    const junctionId = blueprintModal.dataset.junctionId;
    if (!junctionId) return;
    if (!state.blueprints.has(junctionId)) {
      state.blueprints.set(junctionId, { positions: {}, relationships: [] });
    }
    const blueprint = state.blueprints.get(junctionId);
    blueprint.positions[cardId] = {
      x: parseFloat(cardElement.style.left) || 0,
      y: parseFloat(cardElement.style.top) || 0,
      width: parseFloat(cardElement.style.width) || cardElement.offsetWidth,
      height: parseFloat(cardElement.style.height) || cardElement.offsetHeight
    };
    autoSave();
  };

  document.addEventListener("pointermove", onPointerMove);
  document.addEventListener("pointerup", onPointerUp);
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
  clearMultiSelection();
  for (const [id, node] of Array.from(state.nodes.entries())) {
    if (id.startsWith("option-")) {
      node.element.remove();
      state.nodes.delete(id);
      state.collapsed.delete(id);
      state.selectiveHidden.delete(id);
    }
  }
  state.links = state.links.filter((link) => !link.to.startsWith("option-") && !link.from.startsWith("option-"));
  for (const [groupId, group] of Array.from(state.groups.entries())) {
    group.nodeIds = group.nodeIds.filter((id) => state.nodes.has(id));
    if (group.nodeIds.length < 2) state.groups.delete(groupId);
  }
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
  state.selectedNodeIds = new Set([nodeId]);
  const node = state.nodes.get(nodeId);
  if (node && node.element) {
    node.element.classList.add("is-selected");
    node.element.style.zIndex = "9";
  }
  updateMultiSelectionVisuals();
  updateDialogState();
}

function deselectNode() {
  if (state.selectedNodeId !== null) {
    const node = state.nodes.get(state.selectedNodeId);
    if (node && node.element) {
      node.element.classList.remove("is-selected");
      node.element.style.zIndex = "";
    }
  }
  state.selectedNodeId = null;
  state.selectedNodeIds.clear();
  updateMultiSelectionVisuals();
  updateDialogState();
}

function clearMultiSelection({ keepPrimary = false } = {}) {
  if (keepPrimary && state.selectedNodeId) {
    state.selectedNodeIds = new Set([state.selectedNodeId]);
  } else {
    state.selectedNodeIds.clear();
    if (!keepPrimary) state.selectedNodeId = null;
  }
  updateMultiSelectionVisuals();
}

function setMultiSelection(nodeIds, { primaryId = null } = {}) {
  const ids = Array.from(new Set(nodeIds)).filter((id) => state.nodes.has(id) && isNodeVisible(state.nodes.get(id)));
  state.selectedNodeIds = new Set(ids);
  state.selectedNodeId = primaryId && state.selectedNodeIds.has(primaryId) ? primaryId : (ids[0] || null);
  for (const node of state.nodes.values()) {
    node.element.classList.remove("is-selected");
    node.element.style.zIndex = "";
  }
  if (state.selectedNodeId) {
    const primary = state.nodes.get(state.selectedNodeId);
    primary?.element?.classList.add("is-selected");
    if (primary?.element) primary.element.style.zIndex = "9";
  }
  updateMultiSelectionVisuals();
  updateDialogState();
}

function updateMultiSelectionVisuals() {
  for (const [id, node] of state.nodes.entries()) {
    node.element.classList.toggle("is-multi-selected", state.selectedNodeIds.has(id) && id !== state.selectedNodeId);
  }
  renderSelectionToolbar();
}

function getNodeBounds(node) {
  if (!node) return null;
  const width = node.width || node.element?.offsetWidth || 318;
  const height = node.height || node.element?.offsetHeight || 220;
  return { x: node.x || 0, y: node.y || 0, width, height, right: (node.x || 0) + width, bottom: (node.y || 0) + height };
}

function getSelectionBounds(nodeIds = Array.from(state.selectedNodeIds)) {
  const bounds = nodeIds.map((id) => getNodeBounds(state.nodes.get(id))).filter(Boolean);
  if (!bounds.length) return null;
  const x = Math.min(...bounds.map((item) => item.x));
  const y = Math.min(...bounds.map((item) => item.y));
  const right = Math.max(...bounds.map((item) => item.right));
  const bottom = Math.max(...bounds.map((item) => item.bottom));
  return { x, y, right, bottom, width: right - x, height: bottom - y };
}

function boardToViewportPoint(point) {
  return {
    x: point.x * state.view.scale + state.view.x,
    y: point.y * state.view.scale + state.view.y
  };
}

function viewportToBoardPoint(clientX, clientY) {
  const rect = viewport.getBoundingClientRect();
  return {
    x: (clientX - rect.left - state.view.x) / state.view.scale,
    y: (clientY - rect.top - state.view.y) / state.view.scale
  };
}

function renderSelectionToolbar() {
  if (!selectionToolbar || !selectionCount) return;
  const ids = Array.from(state.selectedNodeIds).filter((id) => state.nodes.has(id));
  if (ids.length < 2) {
    selectionToolbar.classList.add("hidden");
    return;
  }
  const bounds = getSelectionBounds(ids);
  if (!bounds) {
    selectionToolbar.classList.add("hidden");
    return;
  }
  const point = boardToViewportPoint({ x: bounds.x + bounds.width / 2, y: bounds.y - 46 });
  selectionToolbar.style.left = `${Math.max(14, point.x - selectionToolbar.offsetWidth / 2)}px`;
  selectionToolbar.style.top = `${Math.max(14, point.y)}px`;
  selectionCount.textContent = `${ids.length} 选中`;
  selectionToolbar.classList.remove("hidden");
}

function renderGroupFrames() {
  if (!groupLayer) return;
  const fragment = document.createDocumentFragment();
  for (const [groupId, group] of state.groups.entries()) {
    const nodeIds = (group.nodeIds || []).filter((id) => state.nodes.has(id) && isNodeVisible(state.nodes.get(id)));
    if (nodeIds.length < 2) continue;
    const bounds = getSelectionBounds(nodeIds);
    if (!bounds) continue;
    const padding = 34;
    const frame = document.createElement("div");
    frame.className = "group-frame";
    frame.dataset.groupId = groupId;
    frame.style.left = `${bounds.x - padding}px`;
    frame.style.top = `${bounds.y - padding}px`;
    frame.style.width = `${bounds.width + padding * 2}px`;
    frame.style.height = `${bounds.height + padding * 2}px`;
    const title = document.createElement("span");
    title.className = "group-frame-title";
    title.textContent = group.title || (currentLang === "en" ? "Group" : "分组");
    frame.appendChild(title);
    fragment.appendChild(frame);
  }
  groupLayer.replaceChildren(fragment);
}

function groupSelectedNodes() {
  const ids = Array.from(state.selectedNodeIds).filter((id) => state.nodes.has(id) && id !== "source" && id !== "analysis");
  if (ids.length < 2) {
    showToast(currentLang === "en" ? "Select at least two cards first." : "请先框选至少两张卡片。");
    return null;
  }
  const groupId = `group-${Date.now().toString(36)}`;
  state.groups.set(groupId, {
    id: groupId,
    title: currentLang === "en" ? "Canvas group" : "画布分组",
    nodeIds: ids,
    color: "#0070cc"
  });
  renderGroupFrames();
  autoSave();
  return groupId;
}

function ungroupSelectedNodes() {
  const ids = new Set(state.selectedNodeIds);
  let removed = 0;
  for (const [groupId, group] of Array.from(state.groups.entries())) {
    if ((group.nodeIds || []).some((id) => ids.has(id))) {
      state.groups.delete(groupId);
      removed += 1;
    }
  }
  renderGroupFrames();
  if (removed) autoSave();
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
  const nodeRecord = { id, element, ...data };
  state.nodes.set(id, nodeRecord);
  if (!data.isJunction && data.width && data.height) {
    applyNodeSize(nodeRecord, data.width, data.height);
  }
  ensureCollapseControl(id, element);

  // Add edge handles for connection mode (only for non-junction nodes)
  if (!data.isJunction) {
    addEdgeHandles(element, id);
    addResizeHandles(element, id);
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

function addResizeHandles(element, id) {
  if (element.dataset.resizeHandles === "true") return;
  element.dataset.resizeHandles = "true";
  const handles = [
    ["n", "top"],
    ["e", "right"],
    ["s", "bottom"],
    ["w", "left"],
    ["ne", "top right"],
    ["nw", "top left"],
    ["se", "bottom right"],
    ["sw", "bottom left"]
  ];

  handles.forEach(([direction, label]) => {
    const handle = document.createElement("span");
    handle.className = `node-resize-handle node-resize-${direction}`;
    handle.dataset.resizeDirection = direction;
    handle.setAttribute("role", "presentation");
    handle.setAttribute("aria-label", `Resize ${label}`);
    handle.addEventListener("pointerdown", (event) => startNodeResize(event, id, direction));
    element.appendChild(handle);
  });
}

function startNodeResize(event, id, direction) {
  event.preventDefault();
  event.stopPropagation();
  const node = state.nodes.get(id);
  if (!node) return;
  const element = node.element;
  const startWidth = node.width || element.offsetWidth;
  const startHeight = node.height || element.offsetHeight;
  const start = {
    pointerId: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    nodeX: node.x,
    nodeY: node.y,
    width: startWidth,
    height: startHeight,
    ratio: startWidth / Math.max(startHeight, 1)
  };
  const minWidth = element.classList.contains("source-node") ? 240 : 220;
  const minHeight = element.classList.contains("source-node") ? 250 : 150;
  const maxWidth = 760;
  const maxHeight = 760;

  function move(moveEvent) {
    const dx = (moveEvent.clientX - start.x) / state.view.scale;
    const dy = (moveEvent.clientY - start.y) / state.view.scale;
    let nextX = start.nodeX;
    let nextY = start.nodeY;
    let nextWidth = start.width;
    let nextHeight = start.height;
    const isCorner = direction.length === 2;

    if (isCorner) {
      const signX = direction.includes("e") ? 1 : -1;
      const signY = direction.includes("s") ? 1 : -1;
      const projected = Math.abs(dx) > Math.abs(dy) ? dx * signX : dy * signY;
      nextWidth = clamp(start.width + projected, minWidth, maxWidth);
      nextHeight = clamp(nextWidth / start.ratio, minHeight, maxHeight);
      if (direction.includes("w")) nextX = start.nodeX + (start.width - nextWidth);
      if (direction.includes("n")) nextY = start.nodeY + (start.height - nextHeight);
    } else {
      if (direction.includes("e")) nextWidth = clamp(start.width + dx, minWidth, maxWidth);
      if (direction.includes("s")) nextHeight = clamp(start.height + dy, minHeight, maxHeight);
      if (direction.includes("w")) {
        nextWidth = clamp(start.width - dx, minWidth, maxWidth);
        nextX = start.nodeX + (start.width - nextWidth);
      }
      if (direction.includes("n")) {
        nextHeight = clamp(start.height - dy, minHeight, maxHeight);
        nextY = start.nodeY + (start.height - nextHeight);
      }
    }

    applyNodeSize(node, nextWidth, nextHeight);
    node.x = nextX;
    node.y = nextY;
    element.style.left = `${node.x}px`;
    element.style.top = `${node.y}px`;
    drawLinks();
  }

  function up() {
    element.classList.remove("resizing");
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    autoSave();
  }

  element.classList.add("resizing");
  element.setPointerCapture?.(event.pointerId);
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up, { once: true });
}

function applyNodeSize(node, width, height) {
  const element = node.element;
  node.width = width;
  node.height = height;
  element.style.width = `${width}px`;
  element.style.minHeight = `${height}px`;
  if (element.classList.contains("source-node")) {
    const target = element.querySelector(".upload-target");
    if (target) {
      target.style.width = `${width}px`;
      target.style.height = `${height}px`;
    }
  }
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
  state.selectedNodeIds.delete(nodeId);
  for (const [groupId, group] of Array.from(state.groups.entries())) {
    group.nodeIds = group.nodeIds.filter((id) => id !== nodeId);
    if (group.nodeIds.length < 2) state.groups.delete(groupId);
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
  updateMultiSelectionVisuals();
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
    const uploadTarget = event.target.closest(".upload-target");
    if (uploadTarget && !uploadTarget.classList.contains("has-source-image") && !uploadTarget.classList.contains("has-source-file")) return;
    const interactive = event.target.closest("button, input, textarea, select, a, .option-title, .generated-node h3, .analysis-node h2, #sourceName, .standalone-source-name, .node-title-input, .image-card-action, .edge-handle, .node-resize-handle");
    if (interactive && event.target.tagName !== "SECTION") return;
    const node = state.nodes.get(id);
    if (!node) return;
    if (event.shiftKey || event.metaKey || event.ctrlKey) {
      const next = new Set(state.selectedNodeIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setMultiSelection(Array.from(next), { primaryId: id });
      return;
    }
    if (!state.selectedNodeIds.has(id)) {
      setMultiSelection([id], { primaryId: id });
    }
    const movingIds = Array.from(state.selectedNodeIds).filter((nodeId) => state.nodes.has(nodeId));

    start = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      nodeX: node.x,
      nodeY: node.y,
      moving: movingIds.map((nodeId) => {
        const movingNode = state.nodes.get(nodeId);
        return { id: nodeId, x: movingNode.x, y: movingNode.y };
      })
    };
    element.classList.add("dragging");
    element.setPointerCapture(event.pointerId);
  });

  element.addEventListener("pointermove", (event) => {
    if (!start) return;
    const node = state.nodes.get(id);
    if (!node) return;

    const dx = (event.clientX - start.x) / state.view.scale;
    const dy = (event.clientY - start.y) / state.view.scale;
    for (const item of start.moving || [{ id, x: start.nodeX, y: start.nodeY }]) {
      const movingNode = state.nodes.get(item.id);
      if (!movingNode) continue;
      movingNode.x = item.x + dx;
      movingNode.y = item.y + dy;
      movingNode.element.style.left = `${movingNode.x}px`;
      movingNode.element.style.top = `${movingNode.y}px`;
      movingNode.width = movingNode.element.offsetWidth;
      movingNode.height = movingNode.element.offsetHeight;
    }
    drawLinks();
  });

  const finishDrag = () => {
    start = null;
    element.classList.remove("dragging");
    autoSave();
  };

  element.addEventListener("pointerup", finishDrag);
  element.addEventListener("pointercancel", finishDrag);
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
    const fromGroup = fromGroups.get(`${link.from}:${sides.fromSide}`);
    const toGroup = toGroups.get(`${link.to}:${sides.toSide}`);
    const isBundled = (fromGroup?.length || 0) > 2 || (toGroup?.length || 0) > 2;
    const path = routeLinkPath(start, end, descriptor, { fromGroup, toGroup });
    const linkClass = `link link-orthogonal${isBundled ? " link-bundled" : ""}`;
    const shadow = svgElement("path", { d: path, class: `link-shadow${isBundled ? " link-bundled" : ""}` });
    const line = svgElement("path", { d: path, class: linkClass });
    const pinA = svgElement("circle", { cx: start.x, cy: start.y, r: 7, class: "link-pin" });
    const pinB = svgElement("circle", { cx: end.x, cy: end.y, r: 7, class: "link-pin" });

    fragments.append(shadow, line, pinA, pinB);
  });

  linkLayer.replaceChildren(fragments);
  renderGroupFrames();
  renderMinimap();
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

function routeLinkPath(start, end, descriptor, groups = {}) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  const startTangent = tangentForSide(start.side);
  const endTangent = tangentForSide(end.side);
  const bundled = (groups.fromGroup?.length || 0) > 2 || (groups.toGroup?.length || 0) > 2;
  const firstLeg = clamp((start.side === "left" || start.side === "right" ? absDx : absDy) * 0.32, bundled ? 96 : 62, bundled ? 180 : 132);
  const lastLeg = clamp((end.side === "left" || end.side === "right" ? absDx : absDy) * 0.26, 54, 132);
  const points = [{ x: start.x, y: start.y }];
  const p1 = { x: start.x + startTangent.x * firstLeg, y: start.y + startTangent.y * firstLeg };
  const p4 = { x: end.x + endTangent.x * lastLeg, y: end.y + endTangent.y * lastLeg };
  points.push(p1);

  if ((start.side === "left" || start.side === "right") && (end.side === "left" || end.side === "right")) {
    const midX = bundled
      ? p1.x
      : (Math.abs(p1.x - p4.x) < 90 ? (p1.x + p4.x) / 2 : p1.x + (p4.x - p1.x) * 0.52);
    points.push({ x: midX, y: p1.y }, { x: midX, y: p4.y });
  } else if ((start.side === "top" || start.side === "bottom") && (end.side === "top" || end.side === "bottom")) {
    const midY = bundled
      ? p1.y
      : (Math.abs(p1.y - p4.y) < 90 ? (p1.y + p4.y) / 2 : p1.y + (p4.y - p1.y) * 0.52);
    points.push({ x: p1.x, y: midY }, { x: p4.x, y: midY });
  } else if (absDx > absDy) {
    points.push({ x: p4.x, y: p1.y });
  } else {
    points.push({ x: p1.x, y: p4.y });
  }

  points.push(p4, { x: end.x, y: end.y });
  return roundedPolylinePath(avoidLinkObstacles(points, descriptor), bundled ? 24 : 18);
}

function avoidLinkObstacles(points, descriptor) {
  const fromId = descriptor?.link?.from;
  const toId = descriptor?.link?.to;
  let routed = points;
  for (let pass = 0; pass < 2; pass += 1) {
    let changed = false;
    const next = [];
    for (let i = 0; i < routed.length - 1; i += 1) {
      const a = routed[i];
      const b = routed[i + 1];
      next.push(a);
      const obstacle = firstIntersectingNode(a, b, fromId, toId);
      if (!obstacle) continue;
      const rect = getNodeBounds(obstacle);
      const pad = 28;
      if (Math.abs(a.y - b.y) < 1) {
        const y = Math.abs(a.y - (rect.y - pad)) < Math.abs(a.y - (rect.bottom + pad)) ? rect.y - pad : rect.bottom + pad;
        next.push({ x: a.x, y }, { x: b.x, y });
      } else if (Math.abs(a.x - b.x) < 1) {
        const x = Math.abs(a.x - (rect.x - pad)) < Math.abs(a.x - (rect.right + pad)) ? rect.x - pad : rect.right + pad;
        next.push({ x, y: a.y }, { x, y: b.y });
      }
      changed = true;
    }
    next.push(routed[routed.length - 1]);
    routed = simplifyPolyline(next);
    if (!changed) break;
  }
  return routed;
}

function firstIntersectingNode(a, b, fromId, toId) {
  for (const [id, node] of state.nodes.entries()) {
    if (id === fromId || id === toId || !isNodeVisible(node)) continue;
    const rect = getNodeBounds(node);
    if (!rect) continue;
    const pad = 18;
    const expanded = {
      x: rect.x - pad,
      y: rect.y - pad,
      right: rect.right + pad,
      bottom: rect.bottom + pad
    };
    if (segmentIntersectsRect(a, b, expanded)) return node;
  }
  return null;
}

function segmentIntersectsRect(a, b, rect) {
  const minX = Math.min(a.x, b.x);
  const maxX = Math.max(a.x, b.x);
  const minY = Math.min(a.y, b.y);
  const maxY = Math.max(a.y, b.y);
  if (maxX < rect.x || minX > rect.right || maxY < rect.y || minY > rect.bottom) return false;
  if (Math.abs(a.x - b.x) < 1) return a.x >= rect.x && a.x <= rect.right;
  if (Math.abs(a.y - b.y) < 1) return a.y >= rect.y && a.y <= rect.bottom;
  return false;
}

function simplifyPolyline(points) {
  return points.filter((point, index) => {
    const prev = points[index - 1];
    if (!prev) return true;
    return Math.abs(prev.x - point.x) > 0.5 || Math.abs(prev.y - point.y) > 0.5;
  });
}

function roundedPolylinePath(points, radius = 18) {
  if (!points.length) return "";
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i += 1) {
    const current = points[i];
    const previous = points[i - 1];
    const next = points[i + 1];
    if (!next) {
      path += ` L ${current.x} ${current.y}`;
      continue;
    }
    const before = pointAlong(current, previous, Math.min(radius, distance(current, previous) / 2));
    const after = pointAlong(current, next, Math.min(radius, distance(current, next) / 2));
    path += ` L ${before.x} ${before.y} Q ${current.x} ${current.y} ${after.x} ${after.y}`;
  }
  return path;
}

function pointAlong(from, to, length) {
  const total = distance(from, to) || 1;
  const ratio = length / total;
  return {
    x: from.x + (to.x - from.x) * ratio,
    y: from.y + (to.y - from.y) * ratio
  };
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function renderMinimap() {
  if (!minimap || minimap.classList.contains("hidden") || !minimapCanvas || !minimapViewport) return;
  const ctx = minimapCanvas.getContext("2d");
  if (!ctx) return;
  const width = minimapCanvas.width;
  const height = minimapCanvas.height;
  const sx = width / 2400;
  const sy = height / 1500;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "rgba(248, 250, 252, 0.88)";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "rgba(0, 112, 204, 0.32)";
  ctx.lineWidth = 1;
  for (const link of state.links) {
    const from = state.nodes.get(link.from);
    const to = state.nodes.get(link.to);
    if (!isNodeVisible(from) || !isNodeVisible(to)) continue;
    const a = nodeCenter(from);
    const b = nodeCenter(to);
    ctx.beginPath();
    ctx.moveTo(a.x * sx, a.y * sy);
    ctx.lineTo(b.x * sx, b.y * sy);
    ctx.stroke();
  }
  for (const [id, node] of state.nodes.entries()) {
    if (!isNodeVisible(node)) continue;
    const bounds = getNodeBounds(node);
    ctx.fillStyle = id === state.selectedNodeId ? "#0070cc" : node.generated ? "rgba(0, 112, 204, 0.72)" : "rgba(28, 38, 52, 0.56)";
    ctx.fillRect(bounds.x * sx, bounds.y * sy, Math.max(2, bounds.width * sx), Math.max(2, bounds.height * sy));
  }
  syncMinimapViewport();
}

function syncMinimapViewport() {
  if (!minimap || minimap.classList.contains("hidden") || !minimapCanvas || !minimapViewport || !viewport) return;
  const rect = viewport.getBoundingClientRect();
  const sx = minimapCanvas.clientWidth / 2400;
  const sy = minimapCanvas.clientHeight / 1500;
  const x = (-state.view.x / state.view.scale) * sx;
  const y = (-state.view.y / state.view.scale) * sy;
  const width = (rect.width / state.view.scale) * sx;
  const height = (rect.height / state.view.scale) * sy;
  minimapViewport.style.left = `${clamp(x, -2, minimapCanvas.clientWidth + 2)}px`;
  minimapViewport.style.top = `${clamp(y, -2, minimapCanvas.clientHeight + 2)}px`;
  minimapViewport.style.width = `${clamp(width, 8, minimapCanvas.clientWidth)}px`;
  minimapViewport.style.height = `${clamp(height, 8, minimapCanvas.clientHeight)}px`;
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
  input.accept = "image/png,image/jpeg,image/webp,image/gif,.txt,.md,.json,.docx,.pdf,.pptx,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation";
  input.onchange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleAttachment(file);
  };
  input.click();
}

async function handleAttachment(file) {
  const isDocumentFile = /\.(docx|pdf|pptx)$/i.test(file.name);
  if (file.type.startsWith("image/") || isDocumentFile) {
    await handleFile({ target: { files: [file] } });
    showChatAttachmentPreview(file);
  } else if (file.type.startsWith("text/") || file.name.endsWith(".txt") || file.name.endsWith(".md") || file.name.endsWith(".json")) {
    try {
      const text = await file.text();
      chatInput.value = text.slice(0, 32000);
      chatInput.focus();
      showChatAttachmentPreview(file);
    } catch (err) {
      alert(t("file.readError") + (err instanceof Error ? err.message : String(err)));
    }
  } else {
    alert(t("file.unsupported"));
  }
}

function showChatAttachmentPreview(file) {
  if (!chatAttachmentPreview) return;
  chatAttachmentPreview.innerHTML = "";
  chatAttachmentPreview.classList.remove("hidden");

  const chip = document.createElement("div");
  chip.className = "chat-attachment-chip";

  if (file.type.startsWith("image/")) {
    const img = document.createElement("img");
    img.src = URL.createObjectURL(file);
    img.alt = file.name;
    img.className = "chat-attachment-thumb";
    chip.appendChild(img);
  } else {
    const icon = document.createElement("span");
    icon.className = "chat-attachment-icon";
    icon.textContent = "📄";
    chip.appendChild(icon);
  }

  const name = document.createElement("span");
  name.className = "chat-attachment-name";
  name.textContent = file.name;
  chip.appendChild(name);

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "chat-attachment-remove";
  remove.textContent = "×";
  remove.addEventListener("click", (e) => {
    e.stopPropagation();
    chatAttachmentPreview.innerHTML = "";
    chatAttachmentPreview.classList.add("hidden");
  });
  chip.appendChild(remove);

  chip.addEventListener("click", () => {
    if (file.type.startsWith("image/")) {
      openAttachmentPreviewModal(file);
    }
  });

  chatAttachmentPreview.appendChild(chip);
}

function openAttachmentPreviewModal(file) {
  const url = URL.createObjectURL(file);
  const modal = document.createElement("div");
  modal.className = "attachment-preview-modal";
  modal.innerHTML = `
    <div class="attachment-preview-backdrop"></div>
    <div class="attachment-preview-content">
      <button class="attachment-preview-close" type="button" aria-label="关闭">×</button>
      <img src="${url}" alt="${file.name}" class="attachment-preview-img" />
    </div>
  `;
  modal.querySelector(".attachment-preview-backdrop").addEventListener("click", () => modal.remove());
  modal.querySelector(".attachment-preview-close").addEventListener("click", () => modal.remove());
  document.body.appendChild(modal);
}

function clearChatAttachmentPreview() {
  if (chatAttachmentPreview) {
    chatAttachmentPreview.innerHTML = "";
    chatAttachmentPreview.classList.add("hidden");
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

async function postStreamingChat(url, payload, pendingMessage) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, stream: true })
  });

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/event-stream")) {
    return parseApiResponse(response);
  }
  if (!response.ok) {
    throw new Error(response.statusText || "Chat stream failed");
  }
  if (!response.body) {
    throw new Error("Chat stream is unavailable");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalData = null;
  let streamError = null;
  let thinkingContent = pendingMessage?.thinkingContent || "";
  let replyBuffer = "";

  function consumeEvent(eventBlock) {
    const lines = eventBlock.split(/\r?\n/).map((line) => line.trim());
    const eventName = lines.find((line) => line.startsWith("event:"))?.slice(6).trim() || "message";
    const dataText = lines
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim())
      .join("\n");
    if (!dataText) return;
    let data;
    try {
      data = JSON.parse(dataText);
    } catch {
      return;
    }
    if (eventName === "thinking") {
      const delta = data.delta || data.text || "";
      if (delta && pendingMessage) {
        thinkingContent += delta;
        updateChatMessage(pendingMessage, {
          thinkingContent,
          pending: true,
          thinkingRequested: true
        });
      }
    } else if (eventName === "reply") {
      const delta = data.delta || data.text || "";
      if (delta && pendingMessage) {
        replyBuffer += delta;
        updateChatMessage(pendingMessage, {
          content: replyBuffer,
          pending: true
        });
      }
    } else if (eventName === "research") {
      const delta = data.delta || data.text || "";
      if (delta) thinkingContent += delta;
      handleLiveResearchCanvasEvent(data, pendingMessage);
      if (pendingMessage) {
        updateChatMessage(pendingMessage, {
          thinkingContent,
          pending: true,
          thinkingRequested: true,
          artifacts: mergeResearchArtifacts(pendingMessage.artifacts || [], data)
        });
      }
    } else if (eventName === "final") {
      finalData = data;
    } else if (eventName === "error") {
      streamError = new Error(data.error || "Chat stream failed");
    }
  }

  while (true) {
    const { value, done } = await reader.read();
    if (value) buffer += decoder.decode(value, { stream: !done });
    const events = buffer.split(/\r?\n\r?\n/);
    buffer = events.pop() || "";
    events.forEach(consumeEvent);
    if (done) break;
  }
  if (buffer.trim()) consumeEvent(buffer);
  if (streamError) throw streamError;
  if (!finalData) throw new Error("Chat stream ended without a final response");
  return finalData;
}

function mergeResearchArtifacts(existingArtifacts, eventData = {}) {
  const artifacts = Array.isArray(existingArtifacts) ? existingArtifacts.map((item) => ({ ...item })) : [];
  const title = eventData.title || eventData.stage || t("chat.deepThink");
  const type = eventData.references?.[0]?.type || "deep-think";
  const status = eventData.status || "running";
  const delta = String(eventData.delta || eventData.summary || "").trim();
  let target = artifacts.find((item) => item.title === title && item.type === type && !item.url);
  if (!target) {
    target = { type, title, summary: "", url: "", query: "", status };
    artifacts.push(target);
  }
  if (delta) target.summary = `${target.summary ? `${target.summary} ` : ""}${delta}`.slice(-420);
  target.status = status;

  const references = Array.isArray(eventData.references) ? eventData.references : [];
  references.slice(0, 4).forEach((reference) => {
    const url = reference.url || reference.sourceUrl || reference.imageUrl || "";
    if (!url || artifacts.some((item) => item.url === url)) return;
    artifacts.push({
      type: reference.type || (reference.imageUrl ? "image" : "web"),
      title: reference.title || url,
      summary: reference.description || "",
      url,
      query: "",
      status: reference.type || "source"
    });
  });

  return artifacts.slice(-12);
}

function handleLiveResearchCanvasEvent(eventData = {}, pendingMessage = null) {
  if (!deepThinkBusy) return;
  const parentNodeId = pendingMessage?.branchNodeId || state.selectedNodeId || (state.nodes.has("analysis") ? "analysis" : "source");
  if (!state.nodes.has(parentNodeId)) return;
  const parent = state.nodes.get(parentNodeId);
  const createdCount = liveResearchCards.size;
  const stageTitle = String(eventData.title || eventData.stage || (currentLang === "en" ? "Research step" : "研究步骤")).slice(0, 48);
  const delta = String(eventData.delta || eventData.summary || "").trim();
  const query = String(eventData.query || eventData.searchQuery || "").trim();

  if (query) {
    const key = `query:${query}`;
    if (!liveResearchCards.has(key)) {
      const queryTitle = currentLang === "en" ? "Search query" : "搜索 query";
      const nodeId = createOptionNode({
        id: `live-query-${Date.now()}-${safeNodeSlug(query)}`,
        title: queryTitle,
        description: query.slice(0, 260),
        prompt: query.slice(0, 1200),
        tone: currentLang === "en" ? "search" : "搜索",
        layoutHint: "query",
        deepThinkType: "web",
        x: (parent.x || 0) + 410 + Math.floor(createdCount / 4) * 360,
        y: (parent.y || 0) + (createdCount % 4) * 210
      }, parentNodeId);
      if (nodeId) liveResearchCards.set(key, nodeId);
    }
  }

  if (delta.length >= 18) {
    const key = `stage:${stageTitle}`;
    let nodeId = liveResearchCards.get(key);
    if (!nodeId) {
      nodeId = createOptionNode({
        id: `live-research-${Date.now()}-${safeNodeSlug(stageTitle)}`,
        title: stageTitle,
        description: delta.slice(0, 240),
        prompt: delta.slice(0, 1200),
        tone: currentLang === "en" ? "research" : "研究",
        layoutHint: "live",
        deepThinkType: "note",
        x: (parent.x || 0) + 410 + Math.floor(createdCount / 4) * 360,
        y: (parent.y || 0) + (createdCount % 4) * 210
      }, parentNodeId);
      if (nodeId) liveResearchCards.set(key, nodeId);
    } else {
      const node = state.nodes.get(nodeId);
      if (node?.option) {
        node.option.description = `${node.option.description || ""} ${delta}`.trim().slice(-360);
        node.option.prompt = `${node.option.prompt || ""}\n${delta}`.trim().slice(-1600);
        node.element.querySelector(".option-description").textContent = node.option.description;
      }
    }
  }

  const references = Array.isArray(eventData.references) ? eventData.references : [];
  references.slice(0, 4).forEach((reference, index) => {
    const url = reference.url || reference.sourceUrl || reference.imageUrl || "";
    if (!url) return;
    const key = `ref:${url}`;
    if (liveResearchCards.has(key)) return;
    const title = String(reference.title || url).slice(0, 48);
    const nodeId = createOptionNode({
      id: `live-ref-${Date.now()}-${index}-${safeNodeSlug(title)}`,
      title,
      description: String(reference.description || reference.summary || url).slice(0, 260),
      prompt: String(reference.description || reference.summary || title).slice(0, 1200),
      tone: reference.type === "image" ? (currentLang === "en" ? "image" : "图片") : (currentLang === "en" ? "web" : "网页"),
      layoutHint: "evidence",
      deepThinkType: reference.type === "image" ? "image" : "web",
      references: [{ title, url, description: reference.description || "", type: reference.type || "web" }],
      x: (parent.x || 0) + 410 + Math.floor((createdCount + index + 1) / 4) * 360,
      y: (parent.y || 0) + ((createdCount + index + 1) % 4) * 210
    }, parentNodeId);
    if (nodeId) liveResearchCards.set(key, nodeId);
  });
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
  renderSelectionToolbar();
  syncMinimapViewport();
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
    selectedNodeIds: Array.from(state.selectedNodeIds),
    view: state.view,
    sourceType: state.sourceType,
    sourceText: state.sourceText ? state.sourceText.slice(0, 5000) : null,
    sourceDataUrlHash: state.sourceDataUrlHash || null,
    sourceUrl: state.sourceUrl || null,
    fileName: state.fileName || "",
    sourceImage: state.sourceImage ? state.sourceImage.slice(0, 200) : null,
    latestAnalysis: state.latestAnalysis,
    blueprints: Object.fromEntries(state.blueprints),
    groups: Object.fromEntries(state.groups)
  });
}

async function prepareStateForSave() {
  const payload = {
    sourceImage: state.sourceImage,
    sourceImageHash: state.sourceImageHash,
    sourceType: state.sourceType,
    sourceText: state.sourceText,
    sourceDataUrl: state.sourceDataUrl,
    sourceDataUrlHash: state.sourceDataUrlHash || null,
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
    selectedNodeIds: Array.from(state.selectedNodeIds),
    view: {
      ...state.view,
      chatThreads: serializeChatThreads(),
      activeChatThreadId: state.activeChatThreadId
    },
    blueprints: Object.fromEntries(state.blueprints),
    groups: Object.fromEntries(state.groups)
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

async function assetUrlToDataUrl(url) {
  if (!url) return "";
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to read asset");
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read asset"));
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

async function ensureSourceDocumentDataUrl() {
  if (state.sourceDataUrl || !state.sourceDataUrlHash) return state.sourceDataUrl || "";
  state.sourceDataUrl = await assetUrlToDataUrl(`/api/assets/${state.sourceDataUrlHash}?kind=upload`);
  return state.sourceDataUrl;
}

async function ensureSourceCardDocumentDataUrl(sourceCard) {
  if (!sourceCard || sourceCard.sourceDataUrl || !sourceCard.sourceDataUrlHash) return sourceCard?.sourceDataUrl || "";
  sourceCard.sourceDataUrl = await assetUrlToDataUrl(`/api/assets/${sourceCard.sourceDataUrlHash}?kind=upload`);
  return sourceCard.sourceDataUrl;
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
  syncResearchDropdownOptions();
}

function syncResearchDropdownOptions() {
  const isRichDoc = state.sourceType === "text" && state.fileName && /\.(pdf|pptx|docx)$/i.test(state.fileName);
  document.querySelectorAll('.research-option[data-mode="understand"]').forEach((el) => {
    el.style.display = isRichDoc ? "" : "none";
  });
  document.querySelectorAll('.research-option[data-mode="analyze"], .research-option[data-mode="explore"]').forEach((el) => {
    el.style.display = "";
  });
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
    if (currentSessionId) {
      sessionStorage.setItem("oryzae-last-session-id", currentSessionId);
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
    const sessionState = data.state || data.viewState?.stateSnapshot || data.viewState?.state || {};

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
    state.fileUnderstanding = null;
    state.groups.clear();
    groupLayer?.replaceChildren();

    if (data.viewState) {
      state.view = {
        ...state.view,
        x: Number.isFinite(data.viewState.x) ? data.viewState.x : state.view.x,
        y: Number.isFinite(data.viewState.y) ? data.viewState.y : state.view.y,
        scale: Number.isFinite(data.viewState.scale) ? data.viewState.scale : state.view.scale
      };
      updateBoardTransform();
    }

    const assets = Array.isArray(data.assets) ? data.assets : [];
    const sourceNodeRecord = Array.isArray(data.nodes) ? data.nodes.find((node) => node.nodeId === "source" || node.type === "source") : null;
    const sourceNodeData = sourceNodeRecord?.data || {};
    const desiredSourceHash = sessionState?.sourceImageHash || sessionState?.sourceDataUrlHash || sourceNodeData.imageHash || null;
    const sourceAsset = (
      desiredSourceHash
        ? assets.find((asset) => asset.kind === "upload" && asset.hash === desiredSourceHash)
        : null
    ) || assets.find((asset) => asset.kind === "upload" && asset.fileName && asset.fileName === (sessionState?.fileName || sourceNodeData.fileName))
      || assets.find(a => a.kind === "upload");
    if (sourceAsset) {
      const isText = sessionState?.sourceType === "text" || sourceAsset.mimeType?.startsWith("text/") || /\.(txt|md|json|docx|pdf|pptx)$/i.test(sourceAsset.fileName || "");
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
        state.sourceText = sessionState?.sourceText || null;
        state.sourceDataUrl = sessionState?.sourceDataUrl || null;
        state.sourceDataUrlHash = sourceAsset?.hash || null;
        sourcePreview.src = "";
        sourcePreview.classList.remove("has-image");
      }
      emptyState.classList.add("hidden");
      sourceName.textContent = trimMiddle(state.fileName, 28);
      if (researchButton) researchButton.disabled = false;
      updateSourceBadge();
    } else if (sessionState?.sourceType === "url" && sessionState?.sourceUrl) {
      // Restore URL source without upload asset
      state.sourceType = "url";
      state.sourceUrl = sessionState.sourceUrl;
      state.fileName = sessionState.fileName || new URL(sessionState.sourceUrl).hostname;
      state.sourceImage = null;
      state.sourceImageHash = null;
      state.sourceText = null;
      state.sourceDataUrl = null;

      renderUrlSource(state.sourceUrl, sessionState?.latestAnalysis?.title || "");
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
    if (sessionState?.sourceType) {
      state.sourceType = sessionState.sourceType;
    }
    if (sessionState?.sourceText) {
      state.sourceText = sessionState.sourceText;
    }
    if (sessionState?.sourceDataUrl) {
      state.sourceDataUrl = sessionState.sourceDataUrl;
    }
    if (sessionState?.sourceDataUrlHash) {
      state.sourceDataUrlHash = sessionState.sourceDataUrlHash;
    }
    if (sessionState?.sourceUrl) {
      state.sourceUrl = sessionState.sourceUrl;
    }
    if (sessionState?.fileUnderstanding) {
      state.fileUnderstanding = sessionState.fileUnderstanding;
      renderFileUnderstanding(state.fileUnderstanding);
      if (state.fileUnderstanding?.actionableDirections?.length) {
        renderDocumentUnderstandingOptions(state.fileUnderstanding.actionableDirections);
      }
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
        const hasContent = Boolean(restored.sourceCard.imageUrl || restored.sourceCard.imageHash || restored.sourceCard.sourceText || restored.sourceCard.sourceDataUrl || restored.sourceCard.sourceDataUrlHash || restored.sourceCard.sourceUrl);
        restored.element.querySelector(".empty-state")?.classList.toggle("hidden", hasContent);
        const research = restored.element.querySelector(".research-button");
        if (research) research.disabled = !hasContent;
        // Restore URL input if this is a URL card
        if (restored.sourceCard.sourceUrl) {
          const urlInputEl = restored.element.querySelector('.url-input-panel input[type="url"]');
          if (urlInputEl) urlInputEl.value = restored.sourceCard.sourceUrl;
          const urlAnalyzeBtn = restored.element.querySelector(".url-input-panel .primary-button");
          if (urlAnalyzeBtn) urlAnalyzeBtn.disabled = false;
        }
        const label = restored.element.querySelector(".standalone-source-name");
        if (label) label.textContent = trimMiddle(restored.sourceCard.fileName || restored.sourceCard.title || "Source card", 28);
        syncSourceCardImageActionState(n.nodeId);
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
      renderRichNodeContent(element, option);

      const button = element.querySelector(".generate-button");
      if (option.nodeType && option.nodeType !== "image") {
        button.textContent = t("generated.viewContent");
      }
      button.addEventListener("click", () => generateOption(nodeId, option));
      element.dataset.nodeType = option.nodeType || "image";

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

      if (n.type === "generated") {
        if (option.nodeType && option.nodeType !== "image") {
          turnIntoRichNode(element, option);
          const node = state.nodes.get(nodeId);
          if (node) {
            node.generated = true;
            node.width = element.offsetWidth;
            node.height = element.offsetHeight;
          }
          state.generatedCount += 1;
        } else if (n.data?.imageHash || n.data?.imageDataUrl) {
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
    if (sessionState?.blueprints) {
      state.blueprints = new Map(Object.entries(sessionState.blueprints));
    }
    if (sessionState?.groups) {
      state.groups = new Map(Object.entries(sessionState.groups));
    }

    for (const n of data.nodes) {
      if (n.collapsed) state.collapsed.add(n.nodeId);
    }
    if (sessionState?.selectiveHidden || data.selectiveHidden) {
      for (const id of (sessionState.selectiveHidden || data.selectiveHidden || [])) state.selectiveHidden.add(id);
    }

    hydrateChatThreads({
      threads: data.viewState?.chatThreads,
      activeId: data.viewState?.activeChatThreadId,
      fallbackMessages: data.chatMessages.map(m => ({ role: m.role, content: m.content }))
    });
    renderChatMessages();

    applyCollapseState();
    updateCounts();

    if (Array.isArray(sessionState?.selectedNodeIds) && sessionState.selectedNodeIds.length) {
      setMultiSelection(sessionState.selectedNodeIds, { primaryId: sessionState.selectedNodeId });
    } else if (sessionState?.selectedNodeId && state.nodes.has(sessionState.selectedNodeId)) {
      selectNode(sessionState.selectedNodeId);
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

function arrangeCanvasLayout(options = {}) {
  const opts = options && typeof options === "object" && !("target" in options) ? options : {};
  const selectionOnly = Boolean(opts.selectionOnly && state.selectedNodeIds.size >= 2);
  const selectableIds = selectionOnly ? new Set(state.selectedNodeIds) : null;
  const visibleNodeIds = Array.from(state.nodes.entries())
    .filter(([id, node]) => isNodeVisible(node) && (!selectableIds || selectableIds.has(id)))
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

// ─── File Understanding ───

async function triggerFileUnderstanding() {
  const hasData = state.sourceDataUrl || state.sourceText;
  if (state.sourceType !== "text" || !hasData) {
    showToast(t("file.unsupported"));
    return;
  }

  setStatus(t("fileUnderstanding.understanding"), "busy");
  setResearchButtonBusy(true, t("fileUnderstanding.understanding"));

  try {
    let dataUrl = state.sourceDataUrl;
    let hash = state.sourceDataUrlHash;

    if (!dataUrl && state.sourceText) {
      const textBytes = new TextEncoder().encode(state.sourceText);
      const base64 = arrayBufferToBase64(textBytes.buffer);
      dataUrl = `data:text/plain;base64,${base64}`;
      hash = null;
    }

    const payload = { dataUrl, fileName: state.fileName, language: currentLang };
    if (hash) payload.hash = hash;

    const result = await postJson("/api/file-understanding", payload, {
      timeoutMs: 180000,
      timeoutMessage: t("research.timeout")
    });

    if (result.ok) {
      state.fileUnderstanding = result.result;
      renderFileUnderstanding(result.result);
      renderDocumentUnderstandingOptions(result.result.actionableDirections || []);
      setStatus(t("status.ready"), "ready");
      autoSave();
    } else {
      throw new Error(result.error || "File understanding failed");
    }
  } catch (error) {
    console.error("[triggerFileUnderstanding]", error);
    setStatus(error.message || t("status.error"), "error");
  } finally {
    setResearchButtonBusy(false);
  }
}

function renderFileUnderstanding(understanding) {
  if (!understanding) return;

  analysisSummary.textContent = understanding.summary || t("analysis.defaultSummary");
  keywordList.replaceChildren(
    ...(understanding.keyPhrases || []).slice(0, 8).map((keyword) => {
      const span = document.createElement("span");
      span.className = "keyword";
      span.textContent = keyword;
      return span;
    })
  );
  analysisNode.classList.remove("hidden");

  let cardBody = analysisNode.querySelector(".file-understanding-body");
  if (!cardBody) {
    cardBody = document.createElement("div");
    cardBody.className = "file-understanding-body";
    analysisNode.appendChild(cardBody);
  }

  const struct = understanding.structure || {};
  const materials = understanding.keyMaterials || {};
  const imgCount = (materials.images || []).length;
  const tblCount = (materials.tables || []).length;
  const chartCount = (materials.charts || []).length;

  let html = `<div class="fu-section">`;
  html += `<p class="fu-abstract">${escapeHtml(understanding.abstract || "")}</p>`;

  if (struct.outline?.length || struct.totalPages) {
    html += `<div class="fu-block">`;
    html += `<h4>${escapeHtml(t("fileUnderstanding.structure"))}</h4>`;
    html += `<p class="fu-pages">${escapeHtml(t("fileUnderstanding.pages", { count: struct.totalPages || 1 }))}</p>`;
    if (struct.outline?.length) {
      html += `<ul class="fu-outline">`;
      for (const item of struct.outline.slice(0, 8)) {
        html += `<li>${escapeHtml(item)}</li>`;
      }
      html += `</ul>`;
    }
    html += `</div>`;
  }

  if (imgCount || tblCount || chartCount) {
    html += `<div class="fu-block">`;
    html += `<h4>${escapeHtml(t("fileUnderstanding.keyMaterials"))}</h4>`;
    html += `<div class="fu-materials">`;
    if (imgCount) {
      html += `<span class="fu-badge fu-badge-image">${escapeHtml(t("fileUnderstanding.images"))}: ${imgCount}</span>`;
    }
    if (tblCount) {
      html += `<span class="fu-badge fu-badge-table">${escapeHtml(t("fileUnderstanding.tables"))}: ${tblCount}</span>`;
    }
    if (chartCount) {
      html += `<span class="fu-badge fu-badge-chart">${escapeHtml(t("fileUnderstanding.charts"))}: ${chartCount}</span>`;
    }
    html += `</div></div>`;
  }

  if (understanding.isScanned) {
    html += `<div class="fu-block fu-scanned"><p>${escapeHtml(t("fileUnderstanding.scannedWarning"))}</p></div>`;
  }

  html += `</div>`;
  cardBody.innerHTML = html;

  const eyebrow = analysisNode.querySelector(".eyebrow");
  if (eyebrow) eyebrow.textContent = t("analysis.eyebrowText");
  const heading = analysisNode.querySelector("h2");
  if (heading) {
    heading.textContent = t("analysis.titleText");
    makeTitleEditable("analysis", heading);
  }

  state.links = [{ from: "source", to: "analysis", kind: "analysis" }];
  state.selectiveHidden.clear();
  applyCollapseState();
}

function renderDocumentUnderstandingOptions(directions) {
  clearOptions();
  if (!directions?.length) return;

  directions.forEach((dir, index) => {
    const position = optionPositions[index % optionPositions.length];
    const id = `option-${dir.id || index}`;

    const fragment = optionTemplate.content.cloneNode(true);
    const element = fragment.querySelector(".option-node");

    element.dataset.nodeId = id;
    element.dataset.directionType = dir.type || "research";
    element.style.left = `${position.x}px`;
    element.style.top = `${position.y}px`;
    element.style.setProperty("--tilt", `${position.tilt}deg`);

    const typeLabel = getDirectionTypeLabel(dir.type);
    const typeIcon = getDirectionTypeIcon(dir.type);
    element.querySelector(".option-tone").textContent = `${typeIcon} ${typeLabel}`;
    element.querySelector(".option-title").textContent = dir.title || t("generated.result");
    element.querySelector(".option-description").textContent = dir.description || "";

    const titleEl = element.querySelector(".option-title");
    if (titleEl) makeTitleEditable(id, titleEl);

    const button = element.querySelector(".generate-button");
    button.textContent = getDirectionButtonLabel(dir.type);
    button.addEventListener("click", () => handleDirectionAction(id, dir));

    board.appendChild(element);
    registerNode(id, element, {
      x: position.x,
      y: position.y,
      width: 318,
      height: element.offsetHeight,
      option: { ...dir, directionType: dir.type }
    });
    state.links.push({ from: "analysis", to: id, kind: "option" });
    makeDraggable(element, id);
  });

  applyCollapseState();
  updateCounts();
}

function getDirectionTypeLabel(type) {
  const map = {
    "image-generation": t("option.generate") || "Generate",
    "research": t("direction.research"),
    "task-plan": t("direction.taskPlan"),
    "web-analysis": t("direction.webAnalysis"),
    "report-structure": t("direction.reportStructure"),
    "material-collection": t("direction.materialCollection")
  };
  return map[type] || type;
}

function getDirectionTypeIcon(type) {
  const map = {
    "image-generation": "IMG",
    "research": "R",
    "task-plan": "PLAN",
    "web-analysis": "WEB",
    "report-structure": "DOC",
    "material-collection": "MAT"
  };
  return map[type] || "TASK";
}

function getDirectionButtonLabel(type) {
  if (type === "image-generation") return t("option.generate") || "Generate";
  return t("direction.research") || "Research";
}

async function handleDirectionAction(nodeId, dir) {
  if (dir.type === "image-generation") {
    const option = {
      id: dir.id,
      title: dir.title,
      description: dir.description,
      prompt: dir.description,
      tone: "cinematic",
      layoutHint: "landscape"
    };
    generateOption(nodeId, option);
    return;
  }

  setStatus(t("status.busy"), "busy");
  try {
    const node = state.nodes.get(nodeId);
    if (node) {
      const button = node.element.querySelector(".generate-button");
      if (button) {
        button.disabled = true;
        button.classList.add("is-busy");
      }
    }

    const prompt = buildDirectionPrompt(dir, currentLang);
    const data = await postJson("/api/deep-think", {
      message: prompt,
      language: currentLang
    }, {
      timeoutMs: 120000,
      timeoutMessage: t("research.timeout")
    });

    const resultId = `result-${Date.now()}`;
    const resultOption = {
      id: resultId,
      title: dir.title,
      description: data.reply || data.cards?.[0]?.summary || "",
      prompt: dir.description,
      tone: "cinematic",
      layoutHint: "board",
      deepThinkType: dir.type
    };

    const resultNodeId = createOptionNode(resultOption, nodeId);
    if (resultNodeId) {
      const resultNode = state.nodes.get(resultNodeId);
      if (resultNode) {
        resultNode.explanation = data.reply || "";
      }
    }

    setStatus(t("status.ready"), "ready");
    autoSave();
  } catch (error) {
    setStatus(error.message || t("status.error"), "error");
  } finally {
    const node = state.nodes.get(nodeId);
    if (node) {
      const button = node.element.querySelector(".generate-button");
      if (button) {
        button.disabled = false;
        button.classList.remove("is-busy");
      }
    }
  }
}

function buildDirectionPrompt(dir, lang) {
  const isEn = lang === "en";
  const typeMap = {
    "research": isEn ? "research topic" : "研究主题",
    "task-plan": isEn ? "task plan" : "任务计划",
    "web-analysis": isEn ? "web analysis" : "网页分析",
    "report-structure": isEn ? "report structure" : "汇报结构",
    "material-collection": isEn ? "material collection" : "素材收集"
  };

  const typeName = typeMap[dir.type] || dir.type;

  if (isEn) {
    return [
      `Please provide a detailed ${typeName} based on the following direction:`,
      `Title: ${dir.title}`,
      `Description: ${dir.description}`,
      `Rationale: ${dir.rationale}`,
      "",
      "Return the response in a well-structured format with clear sections."
    ].join("\n");
  }

  return [
    `请基于以下方向提供详细的${typeName}：`,
    `标题：${dir.title}`,
    `描述：${dir.description}`,
    `理由：${dir.rationale}`,
    "",
    "请以结构清晰的格式返回，包含明确的章节。"
  ].join("\n");
}

function renderDocumentPreview(fileName, dataUrl, hash, mimeType, container) {
  if (!container) return;

  let previewEl = container.querySelector(".document-preview");
  if (!previewEl) {
    previewEl = document.createElement("div");
    previewEl.className = "document-preview";
    container.appendChild(previewEl);
  }

  const ext = (fileName || "").split(".").pop()?.toLowerCase() || "";
  const isPdf = ext === "pdf" || mimeType === "application/pdf";
  const isPptx = ext === "pptx" || mimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation";

  if (isPdf && dataUrl) {
    previewEl.innerHTML = `<embed src="${dataUrl}" type="application/pdf" class="document-embed" />`;
  } else if (isPdf && hash) {
    previewEl.innerHTML = `<iframe src="/api/assets/${hash}?kind=upload" class="document-embed"></iframe>`;
  } else if (isPptx) {
    previewEl.innerHTML = `
      <div class="document-embed pptx-preview">
        <div class="pptx-icon">📊</div>
        <p class="pptx-name">${escapeHtml(fileName)}</p>
        <p class="pptx-hint">${currentLang === "en" ? "PPTX preview not available in browser. Download to view." : "PPTX 浏览器预览不可用。请下载查看。"}</p>
      </div>
    `;
  } else {
    previewEl.innerHTML = `<div class="document-embed text-preview"><p>${escapeHtml(fileName)}</p></div>`;
  }
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = String(text || "");
  return div.innerHTML;
}
