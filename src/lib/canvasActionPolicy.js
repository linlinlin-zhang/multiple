import { CANVAS_ACTION_TYPES } from "../prompts/shared.js";

const action = (group, annotations = {}, options = {}) => ({
  group,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
    ...annotations
  },
  risk: options.risk || "low",
  cost: options.cost || "low",
  async: Boolean(options.async),
  mayCreateMany: Boolean(options.mayCreateMany),
  requiresExplicitIntent: Boolean(options.requiresExplicitIntent),
  createsCard: Boolean(options.createsCard),
  automatic: options.automatic !== false
});

export const CANVAS_ACTION_REGISTRY = {
  pan_view: action("workspace", { idempotentHint: false }, { risk: "low", requiresExplicitIntent: true }),
  focus_node: action("workspace", { idempotentHint: true }, { risk: "low", requiresExplicitIntent: true }),
  select_node: action("workspace", { idempotentHint: true }, { risk: "low", requiresExplicitIntent: true }),
  move_node: action("workspace", { idempotentHint: false }, { risk: "medium", requiresExplicitIntent: true }),
  arrange_canvas: action("workspace", { idempotentHint: false }, { risk: "low", requiresExplicitIntent: true }),
  auto_layout: action("workspace", { idempotentHint: false }, { risk: "low", requiresExplicitIntent: true }),
  tidy_canvas: action("workspace", { idempotentHint: false }, { risk: "low", requiresExplicitIntent: true }),
  group_selection: action("workspace", { idempotentHint: false }, { risk: "medium", requiresExplicitIntent: true }),
  ungroup_selection: action("workspace", { idempotentHint: false }, { risk: "medium", requiresExplicitIntent: true }),
  search_card: action("workspace", { readOnlyHint: true, idempotentHint: true }, { risk: "low", requiresExplicitIntent: true }),
  export_report: action("workspace", { readOnlyHint: true, idempotentHint: true }, { risk: "low", requiresExplicitIntent: true }),
  deselect: action("workspace", { idempotentHint: true }, { risk: "low", requiresExplicitIntent: true }),
  select_source: action("workspace", { idempotentHint: true }, { risk: "low", requiresExplicitIntent: true }),
  select_analysis: action("workspace", { idempotentHint: true }, { risk: "low", requiresExplicitIntent: true }),

  create_card: action("card", { idempotentHint: false }, { createsCard: true }),
  new_card: action("card", { idempotentHint: false }, { createsCard: true }),
  create_direction: action("card", { idempotentHint: false }, { createsCard: true, mayCreateMany: true }),
  create_note: action("card", { idempotentHint: false }, { createsCard: true }),
  create_plan: action("card", { idempotentHint: false }, { createsCard: true }),
  create_todo: action("card", { idempotentHint: false }, { createsCard: true }),
  create_weather: action("card", { openWorldHint: true, idempotentHint: false }, { createsCard: true, cost: "network" }),
  create_map: action("card", { openWorldHint: true, idempotentHint: false }, { createsCard: true, cost: "network" }),
  create_link: action("card", { idempotentHint: false }, { createsCard: true }),
  create_web_card: action("reference", { openWorldHint: true, idempotentHint: false }, { createsCard: true, cost: "network" }),
  create_code: action("card", { idempotentHint: false }, { createsCard: true }),
  create_table: action("card", { idempotentHint: false }, { createsCard: true }),
  create_timeline: action("card", { idempotentHint: false }, { createsCard: true }),
  create_comparison: action("card", { idempotentHint: false }, { createsCard: true }),
  create_metric: action("card", { idempotentHint: false }, { createsCard: true }),
  create_quote: action("card", { idempotentHint: false }, { createsCard: true }),

  web_search: action("reference", { openWorldHint: true, idempotentHint: false }, { createsCard: true, cost: "network", requiresExplicitIntent: true }),
  image_search: action("media_search", { openWorldHint: true, idempotentHint: false }, { createsCard: true, cost: "network", requiresExplicitIntent: true }),
  reverse_image_search: action("media_search", { openWorldHint: true, idempotentHint: false }, { createsCard: true, cost: "network", requiresExplicitIntent: true }),
  text_image_search: action("media_search", { openWorldHint: true, idempotentHint: false }, { createsCard: true, cost: "network", requiresExplicitIntent: true }),

  generate_image: action("media_generation", { openWorldHint: true, idempotentHint: false }, { createsCard: true, cost: "costly", async: true, mayCreateMany: true, requiresExplicitIntent: true }),
  generate_video: action("media_generation", { openWorldHint: true, idempotentHint: false }, { createsCard: true, cost: "costly", async: true, mayCreateMany: true, requiresExplicitIntent: true }),

  analyze_source: action("source_research", { openWorldHint: false, idempotentHint: false }, { cost: "medium", mayCreateMany: true, requiresExplicitIntent: true }),
  explore_source: action("source_research", { openWorldHint: true, idempotentHint: false }, { cost: "network", mayCreateMany: true, requiresExplicitIntent: true }),
  research_source: action("source_research", { openWorldHint: true, idempotentHint: false }, { cost: "network", mayCreateMany: true, requiresExplicitIntent: true }),
  research_node: action("source_research", { openWorldHint: true, idempotentHint: false }, { cost: "network", mayCreateMany: true, requiresExplicitIntent: true }),
  open_references: action("source_research", { readOnlyHint: true, openWorldHint: false, idempotentHint: true }, { requiresExplicitIntent: true }),

  create_agent: action("agent", { openWorldHint: false, idempotentHint: false }, { cost: "medium", async: true, mayCreateMany: true, requiresExplicitIntent: true }),

  save_session: action("workspace", { idempotentHint: true }, { risk: "low", requiresExplicitIntent: true }),
  new_chat: action("workspace", { idempotentHint: false }, { risk: "medium", requiresExplicitIntent: true }),
  open_chat_history: action("workspace", { readOnlyHint: true, idempotentHint: true }, { risk: "low", requiresExplicitIntent: true }),
  close_chat: action("workspace", { idempotentHint: true }, { risk: "low", requiresExplicitIntent: true }),
  open_chat: action("workspace", { idempotentHint: true }, { risk: "low", requiresExplicitIntent: true }),
  open_history: action("workspace", { readOnlyHint: true, idempotentHint: true }, { risk: "low", requiresExplicitIntent: true }),
  open_settings: action("workspace", { readOnlyHint: true, idempotentHint: true }, { risk: "low", requiresExplicitIntent: true }),
  open_upload: action("workspace", { readOnlyHint: true, idempotentHint: true }, { risk: "low", requiresExplicitIntent: true }),
  delete_node: action("destructive", { destructiveHint: true, idempotentHint: false }, { risk: "high", requiresExplicitIntent: true }),
  set_thinking_mode: action("workspace", { idempotentHint: true }, { risk: "low", requiresExplicitIntent: true }),
  set_deep_think_mode: action("workspace", { idempotentHint: true }, { risk: "low", requiresExplicitIntent: true }),
  zoom_in: action("workspace", { idempotentHint: false }, { risk: "low", requiresExplicitIntent: true }),
  zoom_out: action("workspace", { idempotentHint: false }, { risk: "low", requiresExplicitIntent: true }),
  set_zoom: action("workspace", { idempotentHint: true }, { risk: "low", requiresExplicitIntent: true }),
  reset_view: action("workspace", { idempotentHint: false }, { risk: "low", requiresExplicitIntent: true })
};

const CARD_TYPES = [
  "create_note", "create_plan", "create_todo", "create_weather", "create_map",
  "create_link", "create_code", "create_table", "create_timeline",
  "create_comparison", "create_metric", "create_quote", "create_card", "new_card"
];
const SUMMARY_TYPES = ["create_note", "create_table", "create_todo"];
const VISUAL_EVALUATION_TYPES = ["create_comparison", "create_metric", "create_note"];
const PLANNING_TYPES = ["create_plan", "create_todo", "create_timeline", "create_table", "create_note"];
const COMPARISON_TYPES = ["create_comparison", "create_metric", "create_table", "create_note"];
const RESEARCH_SYNTHESIS_TYPES = ["create_note", "create_table", "create_quote", "create_web_card", "create_link"];
const DATA_CODE_TYPES = ["create_table", "create_code", "create_note", "create_todo", "create_metric"];
const WRITING_TYPES = ["create_note", "create_todo", "create_table"];
const MEDIA_SEARCH_TYPES = ["image_search", "reverse_image_search", "text_image_search", "create_note"];
const MEDIA_GENERATION_TYPES = ["generate_image", "generate_video", "create_direction", "create_note"];
const SOURCE_RESEARCH_TYPES = ["analyze_source", "explore_source", "research_source", "research_node", "open_references", "web_search", "create_note", "create_table", "create_web_card", "create_quote"];
const WORKSPACE_TYPES = [
  "pan_view", "focus_node", "select_node", "move_node", "arrange_canvas",
  "auto_layout", "tidy_canvas", "group_selection", "ungroup_selection",
  "search_card", "export_report", "deselect", "select_source", "select_analysis",
  "save_session", "new_chat", "open_chat_history", "close_chat", "open_chat",
  "open_history", "open_settings", "open_upload", "set_thinking_mode",
  "set_deep_think_mode", "zoom_in", "zoom_out", "set_zoom", "reset_view"
];

export function normalizeIntentText(message) {
  return String(message || "").normalize("NFKC").trim();
}

export function isNoCanvasRequest(message) {
  return /(不要.*(画布|卡片|节点)|不需要.*(画布|卡片|节点)|只要文字|纯文字|直接回答|别建卡|别创建|no\s+canvas|no\s+cards?|text\s+only|answer\s+only)/i.test(normalizeIntentText(message));
}

function isTrivialChatRequest(message) {
  const text = normalizeIntentText(message);
  return !text || (text.length <= 18 && /^(你好|您好|嗨|hello|hi|hey|谢谢|多谢|ok|好的|收到|在吗|help|帮助)[。！!?.\s]*$/i.test(text));
}

function detect(message) {
  const text = normalizeIntentText(message);
  const visualEvaluation = /(照片|图片|图像|画面|摄影|拍得|构图|曝光|色彩|光线|清晰|焦点|镜头|取景|photo|picture|image|shot|photograph|composition|exposure|lighting|color|focus|framing)/i.test(text)
    && /(哪张|哪个|哪一张|更好|最好|比较好|拍得好|好看|评价|点评|分析一下|对比|比较|选择|推荐|优劣|best|better|which|compare|evaluate|critique|recommend|pick|choose)/i.test(text);
  const directAnalysis = /(分析|对比|比较|评估|评价|点评|判断|选择|推荐|优缺点|analysis|compare|comparison|evaluate|critique|judge|recommend|choose|pick)/i.test(text);
  const explicitCanvas = /(画布|卡片|节点|创建|新建|新增|加一张|建一张|生成.{0,8}(卡片|节点)|保存成.{0,8}(卡片|节点)|放到画布|整理到画布|做成.{0,8}(卡片|表格|清单|时间线)|canvas|card|node|create|add\s+(?:a\s+)?card|save\s+(?:it\s+)?as\s+(?:a\s+)?card|put\s+(?:it\s+)?on\s+(?:the\s+)?canvas)/i.test(text);
  const structuredDeliverable = /(做|制定|生成|创建|整理|输出|列|写一份|给我一份|帮我做|make|create|build|generate|draft|produce|turn\s+.*\s+into).{0,18}(计划|规划|清单|待办|表格|时间线|路线图|报告|提纲|矩阵|对比表|checklist|todo|table|timeline|roadmap|report|outline|matrix|comparison)/i.test(text);
  const workspaceAction = /(放大|缩小|重置视图|聚焦|定位|移动|整理|排列|删除|移除|打开历史|打开设置|保存会话|新建对话|导出|zoom|focus|pan|move|arrange|layout|delete|remove|open history|open settings|save session|new chat|export)/i.test(text)
    && /(画布|卡片|节点|视图|会话|历史|设置|canvas|card|node|view|session|history|settings)/i.test(text);
  const deleteAction = /(删除|移除|删掉|delete|remove)/i.test(text) && /(卡片|节点|选中|这个|当前|card|node|selected|current)/i.test(text);
  const sourceResearch = /(研究|深入研究|探索|分析).{0,16}(这张|这个|当前|选中|源|素材|来源|卡片|节点|source|card|node)|(?:analy[sz]e|explore|research).{0,16}(?:selected|current|source|card|node)|打开.{0,8}(引用|参考资料|references)|open\s+references/i.test(text);
  const mediaGeneration = /(成图|出图|生成.{0,10}(图|图片|图像|视觉|海报|插画)|画.{0,8}(图|图片|画面)|绘制|渲染|改图|变体|生成.{0,10}(视频|动画|短片|动态镜头)|制作.{0,10}(视频|动画|短片)|generate.{0,16}(image|picture|visual|video|animation|clip)|draw.{0,12}(image|picture)|render.{0,12}(image|picture|visual)|make.{0,12}(video|animation|clip))/i.test(text);
  const mediaSearch = /(搜图|找图|参考图|视觉参考|相似图片|以图搜图|图片搜索|找.{0,8}(图片|照片|图像|案例)|image search|visual reference|find.{0,10}(images|photos|pictures)|reverse image search)/i.test(text);
  const planning = /(计划|规划|方案|步骤|流程|路线图|日程|行程|旅行|旅游|攻略|安排|执行|落地|roadmap|workflow|schedule|itinerary|travel|trip|plan|milestone|implementation)/i.test(text);
  const research = /(研究|资料|论文|文献|来源|引用|最新|官方|新闻|调研|research|source|citation|latest|official|news|literature)/i.test(text);
  const dataCode = /(代码|程序|bug|python|javascript|数据|表格|csv|图表|指标|code|debug|data|table|chart|metric|benchmark)/i.test(text);
  const writing = /(写作|文案|文章|报告|提纲|润色|创意|故事|脚本|writing|copy|article|report|outline|draft|revise|creative|story|script)/i.test(text);
  const autoCanvasCandidate = !isNoCanvasRequest(text)
    && !isTrivialChatRequest(text)
    && (visualEvaluation || directAnalysis || planning || research || dataCode || writing || (text.length >= 28 && /(帮我|请|分析|总结|整理|解释|写|列|给我|如何|怎么|为什么|建议|方案|思路|review|analy[sz]e|summari[sz]e|explain|compare|suggest|recommend|draft|write|plan)/i.test(text)));
  return {
    text,
    visualEvaluation,
    directAnalysis,
    explicitCanvas,
    structuredDeliverable,
    workspaceAction,
    deleteAction,
    sourceResearch,
    mediaGeneration,
    mediaSearch,
    planning,
    research,
    dataCode,
    writing,
    noCanvas: isNoCanvasRequest(text),
    trivial: isTrivialChatRequest(text),
    autoCanvasCandidate
  };
}

export function classifyCanvasActionIntent(message, options = {}) {
  const flags = detect(message);
  const agentMode = Boolean(options.agentMode);
  const explicitToolIntent = flags.explicitCanvas || flags.structuredDeliverable || flags.workspaceAction
    || flags.sourceResearch || flags.mediaGeneration || flags.mediaSearch || agentMode;
  const automaticCardMode = !flags.noCanvas && !explicitToolIntent && flags.autoCanvasCandidate;
  let taskType = "general";
  if (flags.noCanvas) taskType = "no_canvas";
  else if (flags.trivial) taskType = "trivial";
  else if (flags.mediaGeneration) taskType = "media_generation";
  else if (flags.mediaSearch) taskType = "media_search";
  else if (flags.sourceResearch) taskType = "source_research";
  else if (flags.workspaceAction || flags.deleteAction) taskType = "workspace";
  else if (flags.visualEvaluation) taskType = "visual_evaluation";
  else if (flags.planning) taskType = "planning";
  else if (flags.research) taskType = "research_synthesis";
  else if (flags.dataCode) taskType = "data_code";
  else if (flags.writing) taskType = "writing";
  else if (flags.directAnalysis) taskType = "analysis";
  return {
    ...flags,
    agentMode,
    taskType,
    confidence: flags.noCanvas || flags.trivial ? 0.95 : (explicitToolIntent ? 0.88 : (automaticCardMode ? 0.72 : 0.45)),
    explicitToolIntent,
    automaticCardMode,
    allowCanvasTool: !flags.noCanvas && !flags.trivial && (explicitToolIntent || automaticCardMode),
    allowCardCreation: !flags.noCanvas && !flags.trivial && (flags.explicitCanvas || flags.structuredDeliverable || flags.mediaGeneration || flags.mediaSearch || agentMode || automaticCardMode),
    allowSourceResearch: flags.sourceResearch,
    allowWorkspaceAction: flags.workspaceAction || agentMode,
    allowDestructive: flags.deleteAction,
    maxAutomaticCards: flags.visualEvaluation ? (options.thinkingMode === "thinking" ? 3 : 2) : (options.thinkingMode === "thinking" ? 5 : 3),
    maxActions: options.thinkingMode === "thinking" ? 12 : 8
  };
}

function addMany(target, values) {
  values.forEach((value) => target.add(value));
}

function allowedActionTypesForIntent(intent) {
  const allowed = new Set();
  if (!intent.allowCanvasTool) return allowed;
  if (intent.automaticCardMode) {
    if (intent.visualEvaluation) addMany(allowed, VISUAL_EVALUATION_TYPES);
    else if (intent.planning) addMany(allowed, PLANNING_TYPES);
    else if (intent.research) addMany(allowed, RESEARCH_SYNTHESIS_TYPES);
    else if (intent.dataCode) addMany(allowed, DATA_CODE_TYPES);
    else if (intent.writing) addMany(allowed, WRITING_TYPES);
    else if (intent.directAnalysis) addMany(allowed, COMPARISON_TYPES);
    else addMany(allowed, SUMMARY_TYPES);
  }
  if (intent.explicitCanvas || intent.structuredDeliverable) {
    addMany(allowed, CARD_TYPES);
    if (intent.planning) addMany(allowed, PLANNING_TYPES);
    if (intent.directAnalysis || intent.visualEvaluation) addMany(allowed, COMPARISON_TYPES);
    if (intent.research) addMany(allowed, RESEARCH_SYNTHESIS_TYPES);
    if (intent.dataCode) addMany(allowed, DATA_CODE_TYPES);
    if (intent.writing) addMany(allowed, WRITING_TYPES);
  }
  if (intent.mediaSearch) addMany(allowed, MEDIA_SEARCH_TYPES);
  if (intent.mediaGeneration) addMany(allowed, MEDIA_GENERATION_TYPES);
  if (intent.sourceResearch) addMany(allowed, SOURCE_RESEARCH_TYPES);
  if (intent.workspaceAction || intent.agentMode) addMany(allowed, WORKSPACE_TYPES);
  if (intent.allowDestructive) allowed.add("delete_node");
  if (intent.agentMode) allowed.add("create_agent");
  return new Set([...allowed].filter((type) => CANVAS_ACTION_REGISTRY[type]));
}

export function buildCanvasActionPolicy(message, options = {}) {
  const intent = classifyCanvasActionIntent(message, options);
  const allowedSet = allowedActionTypesForIntent(intent);
  const allowedActionTypes = CANVAS_ACTION_TYPES.filter((type) => allowedSet.has(type));
  return {
    intent,
    allowCanvasTool: allowedActionTypes.length > 0,
    allowedActionTypes,
    allowedActionSet: new Set(allowedActionTypes),
    maxActions: intent.automaticCardMode ? intent.maxAutomaticCards : intent.maxActions,
    maxAutomaticCards: intent.maxAutomaticCards
  };
}

export function filterCanvasActionsByPolicy(actions, policy) {
  const raw = Array.isArray(actions) ? actions : [];
  const allowed = [];
  const rejected = [];
  for (const actionItem of raw) {
    const type = String(actionItem?.type || actionItem?.name || "").trim();
    const metadata = CANVAS_ACTION_REGISTRY[type];
    if (!type || !metadata) {
      rejected.push({ action: actionItem, type, reason: "unknown_action" });
      continue;
    }
    if (!policy.allowCanvasTool || !policy.allowedActionSet.has(type)) {
      rejected.push({ action: actionItem, type, reason: "not_allowed_for_intent", group: metadata.group });
      continue;
    }
    if (metadata.annotations.destructiveHint && !policy.intent.allowDestructive) {
      rejected.push({ action: actionItem, type, reason: "destructive_requires_explicit_delete", group: metadata.group });
      continue;
    }
    if (metadata.group === "source_research" && !policy.intent.allowSourceResearch) {
      rejected.push({ action: actionItem, type, reason: "source_research_requires_explicit_source_intent", group: metadata.group });
      continue;
    }
    if (metadata.group === "workspace" && metadata.requiresExplicitIntent && !policy.intent.allowWorkspaceAction) {
      rejected.push({ action: actionItem, type, reason: "workspace_action_requires_explicit_intent", group: metadata.group });
      continue;
    }
    if (metadata.group === "media_generation" && !policy.intent.mediaGeneration) {
      rejected.push({ action: actionItem, type, reason: "media_generation_requires_explicit_intent", group: metadata.group });
      continue;
    }
    if (metadata.group === "media_search" && !policy.intent.mediaSearch) {
      rejected.push({ action: actionItem, type, reason: "media_search_requires_explicit_intent", group: metadata.group });
      continue;
    }
    if (policy.intent.automaticCardMode && metadata.annotations.openWorldHint && !["create_quote", "create_link", "create_web_card"].includes(type)) {
      rejected.push({ action: actionItem, type, reason: "automatic_mode_blocks_open_world_action", group: metadata.group });
      continue;
    }
    if (policy.intent.automaticCardMode && (type === "create_link" || type === "create_web_card") && !(actionItem?.url || actionItem?.content?.url)) {
      rejected.push({ action: actionItem, type, reason: "automatic_reference_card_requires_url", group: metadata.group });
      continue;
    }
    allowed.push(actionItem);
  }
  if (allowed.length <= policy.maxActions) {
    return { actions: allowed, rejected, policy };
  }
  const kept = allowed.slice(0, policy.maxActions);
  for (const actionItem of allowed.slice(policy.maxActions)) {
    rejected.push({ action: actionItem, type: actionItem?.type, reason: "over_policy_budget" });
  }
  return { actions: kept, rejected, policy };
}

export function summarizeCanvasActionPolicy(policy, { proposed = [], final = [], rejected = [] } = {}) {
  return {
    taskType: policy.intent.taskType,
    confidence: policy.intent.confidence,
    automaticCardMode: policy.intent.automaticCardMode,
    allowCanvasTool: policy.allowCanvasTool,
    maxActions: policy.maxActions,
    allowedActionTypes: policy.allowedActionTypes,
    proposedActionTypes: proposed.map((actionItem) => actionItem?.type || actionItem?.name || "").filter(Boolean),
    finalActionTypes: final.map((actionItem) => actionItem?.type || actionItem?.name || "").filter(Boolean),
    rejected: rejected.map((item) => ({
      type: item.type,
      reason: item.reason,
      group: item.group || CANVAS_ACTION_REGISTRY[item.type]?.group || ""
    }))
  };
}

export function actionRegistryCoverage() {
  return {
    missing: CANVAS_ACTION_TYPES.filter((type) => !CANVAS_ACTION_REGISTRY[type]),
    extra: Object.keys(CANVAS_ACTION_REGISTRY).filter((type) => !CANVAS_ACTION_TYPES.includes(type))
  };
}
