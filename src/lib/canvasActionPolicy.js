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
  "create_direction", "create_note", "create_plan", "create_todo", "create_weather", "create_map",
  "create_link", "create_code", "create_table", "create_timeline",
  "create_comparison", "create_metric", "create_quote", "create_card", "new_card"
];
const DIRECTION_TYPES = ["create_direction", "create_note"];
const SUMMARY_TYPES = ["create_note", "create_table", "create_todo"];
const VISUAL_EVALUATION_TYPES = ["create_comparison", "create_metric", "create_note"];
const VISUAL_CRITIQUE_TYPES = ["create_note", "create_metric"];
const PLANNING_TYPES = ["create_plan", "create_todo", "create_timeline", "create_table", "create_note"];
const COMPARISON_TYPES = ["create_comparison", "create_metric", "create_table", "create_note"];
const RESEARCH_SYNTHESIS_TYPES = ["create_note", "create_table", "create_quote", "create_web_card", "create_link"];
const DATA_CODE_TYPES = ["create_table", "create_code", "create_note", "create_todo", "create_metric"];
const WRITING_TYPES = ["create_note", "create_todo", "create_table"];
const MEDIA_SEARCH_TYPES = ["image_search", "reverse_image_search", "text_image_search", "create_note"];
const MEDIA_GENERATION_TYPES = ["generate_image", "generate_video", "create_direction", "create_note"];
const SOURCE_RESEARCH_TYPES = ["analyze_source", "explore_source", "research_source", "research_node", "open_references", "web_search", "create_note", "create_table", "create_web_card", "create_quote"];
const WEB_RESEARCH_TYPES = ["web_search", "create_web_card", "create_quote", "create_note", "create_table"];
const WORKSPACE_TYPES = [
  "pan_view", "focus_node", "select_node", "move_node", "arrange_canvas",
  "auto_layout", "tidy_canvas", "group_selection", "ungroup_selection",
  "search_card", "export_report", "deselect", "select_source", "select_analysis",
  "save_session", "new_chat", "open_chat_history", "close_chat", "open_chat",
  "open_history", "open_settings", "open_upload", "set_thinking_mode",
  "set_deep_think_mode", "zoom_in", "zoom_out", "set_zoom", "reset_view"
];
const STOP_AFTER_ACTION_TYPES = [
  "delete_node", "research_node", "research_source", "explore_source", "analyze_source",
  "create_agent", "generate_video", "new_chat", "open_history", "open_settings",
  "open_chat_history", "open_upload", "export_report"
];
const STOP_AFTER_ACTION_GROUPS = ["destructive", "source_research", "agent"];
const LOOP_TRACE_EVENT_LIMIT = 28;

export function normalizeIntentText(message) {
  return String(message || "").normalize("NFKC").trim();
}

export function isNoCanvasRequest(message) {
  return /((不要|不需要|无需|别|不用)[^,，。！？.!?；;：:]{0,18}((创建|新建|新增|建立|保存).{0,8}(卡片|节点)|生成.{0,8}(卡片|节点)|画布|卡片)|只要文字|只用文字|纯文字|直接回答|别建卡|别创建|no\s+canvas|no\s+cards?|text\s+only|answer\s+only)/i.test(normalizeIntentText(message));
}

function isTrivialChatRequest(message) {
  const text = normalizeIntentText(message);
  return !text || (text.length <= 24 && /^(你好|您好|嗨|hello|hi|hey|谢谢|谢谢你|多谢|ok|好的|收到|在吗|help|帮助)(?:[,，。！!?.\s]*(谢谢|谢谢你|多谢|好的|收到))*[。！!?.\s]*$/i.test(text));
}

function detect(message) {
  const text = normalizeIntentText(message);
  const deferredMediaGeneration = /(先.*(分析|评价|评估|讨论|看看|方案|建议).{0,24}(不要|别|不用|无需|暂时不|先不).{0,16}(生成|出图|成图|绘制|渲染|视频|动画|改图)|(?:不要|别|不用|无需|暂时不|先不).{0,12}(直接|马上|现在)?[^，。！？.!?]{0,12}(生成|出图|成图|绘制|渲染|视频|动画|改图|image|video|visual)|只(?:分析|评价|评估|讨论|看看|给方案|给建议)|先(?:分析|评价|评估|讨论|看看|给方案|给建议)|(?:do\s+not|don't|dont|without|no).{0,16}(generate|make|create|render).{0,16}(image|video|visual|picture)|(?:analy[sz]e|discuss|review).{0,16}first|analysis\s+only)/i.test(text);
  const hasUrl = /https?:\/\/[^\s)）\]】"'<>]+/i.test(text);
  const webResearch = /((搜索|查找|检索|搜|找|联网查|查一下|查找一下|帮我找|找一下).{0,24}(资料|来源|引用|论文|文献|案例|新闻|信息|数据|参考|reference|source|sources|citation|paper|news|case|data))|((最新|官方|实时|新闻|current|latest|official|recent).{0,18}(资料|来源|引用|论文|文献|案例|新闻|信息|数据|reference|source|sources|citation|paper|news|case|data))|web\s*search|search\s+(?:the\s+)?web|find\s+(?:current|latest|official|sources|references)/i.test(text)
    || (hasUrl && /(网页|网址|链接|url|参考|来源|引用|总结|保存成|卡片|web|link|reference|source|citation|summari[sz]e|save)/i.test(text));
  const visualSubject = /(照片|图片|图像|画面|摄影|拍得|构图|曝光|色彩|光线|清晰|焦点|镜头|取景|这张图|这幅图|这张海报|这幅海报|logo|标志|photo|picture|image|shot|photograph|composition|exposure|lighting|color|focus|framing)/i.test(text);
  const multiVisualContext = /(几张|多张|两张|三张|四张|五张|这些|这几张|一组|多个|多图|两幅|三幅|四幅|photos|pictures|images|shots|A\s*\/\s*B|1\s*(和|与|vs|,|，|、)\s*2)/i.test(text);
  const negatedComparison = /(不要|别|不用|无需|no|without|do\s+not|don't|dont).{0,16}(多图)?(对比|比较|comparison|compare)/i.test(text);
  const visualComparison = visualSubject && !negatedComparison && (/(哪张|哪一张|哪个(?:更|最)|更好|最好|比较好|哪.*好|拍得更好|拍得最好|优劣|排序|排名|best|better|which|pick|choose|rank)/i.test(text)
    || (multiVisualContext && /(评分|打分|评分仪表|score|rating)/i.test(text))
    || (/(对比|比较|compare|comparison)/i.test(text) && multiVisualContext));
  const visualEvaluation = visualSubject && (visualComparison || /(好看|评价|点评|分析一下|分析|看看|评估|建议|诊断|评分|打分|对比|比较|compare|comparison|evaluate|critique|review|recommend|diagnose|score|rating)/i.test(text));
  const directAnalysis = /(分析|对比|比较|评估|评价|点评|判断|选择|推荐|优缺点|评分|打分|analysis|compare|comparison|evaluate|critique|judge|recommend|choose|pick|score|rating)/i.test(text);
  const explicitCanvas = /(画布|卡片|节点|创建|新建|新增|加一张|建一张|生成.{0,8}(卡片|节点)|保存成.{0,8}(卡片|节点)|放到画布|整理到画布|做成.{0,8}(卡片|表格|清单|时间线)|canvas|card|node|create|add\s+(?:a\s+)?card|save\s+(?:it\s+)?as\s+(?:a\s+)?card|put\s+(?:it\s+)?on\s+(?:the\s+)?canvas)/i.test(text);
  const structuredDeliverable = /(做|制定|生成|创建|整理|输出|列|写一份|给我一份|帮我做|make|create|build|generate|draft|produce|turn\s+.*\s+into).{0,18}(计划|规划|清单|待办|表格|时间线|路线图|报告|提纲|矩阵|对比表|checklist|todo|table|timeline|roadmap|report|outline|matrix|comparison)/i.test(text);
  const negatedSearchAction = /(不要|别|不用|无需|不需要).{0,8}搜索/i.test(text);
  const workspaceAction = (
    (/(放大|缩小|重置.{0,6}视图|默认缩放|聚焦|定位到|定位当前|定位这|定位选中|选中(?!的)|选择.{0,8}(卡片|节点|源卡片)|移动(?!平均)|平移|删除|移除|打开历史|打开设置|保存.{0,8}会话|新建对话|导出|分组|取消分组|zoom|focus|pan|move|delete|remove|reset view|open history|open settings|save session|new chat|export)/i.test(text)
      || (!negatedSearchAction && /搜索.{0,12}(卡片|节点)/i.test(text)))
      && /(画布|卡片|节点|视图|会话|历史|设置|canvas|card|node|view|session|history|settings)/i.test(text)
  ) || (
    /((整理|排列|排版).{0,12}(画布布局|布局|节点)|布局|重叠|arrange|layout|tidy)/i.test(text)
      && /(画布|布局|重叠|节点|canvas|layout|overlap|node)/i.test(text)
  );
  const negatedDeleteAction = /(不要|不需要|无需|别|不用|禁止|no|without|do\s+not|don't|dont).{0,18}(删除|移除|删掉|delete|remove)/i.test(text);
  const deleteAction = !negatedDeleteAction && /(删除|移除|删掉|delete|remove)/i.test(text) && /(卡片|节点|选中|这个|当前|card|node|selected|current)/i.test(text);
  const genericNonVisualPlan = /((发布|实施|执行|迁移|产品|研究|调研).{0,8}方案|方案.{0,8}(执行|发布|实施|迁移|落地))/i.test(text) && !/(视觉|风格|创意|成图|海报|主视觉|方向|visual|style|concept)/i.test(text);
  const sourceResearch = !workspaceAction && !/(研究计划|调研计划|访谈研究计划|计划卡片)/i.test(text) && (/(研究|深入研究|探索|分析).{0,16}(当前|选中|源|素材|来源|卡片|节点|source|card|node)|(?:analy[sz]e|explore|research).{0,16}(?:selected|current|source|card|node)|打开.{0,8}(引用|参考资料|references)|open\s+references/i.test(text));
  const negatedDirectionCardRequest = /(不要|别|不用|无需|不需要|no|without|do\s+not|don't|dont).{0,18}(先)?(做|创建|生成)?[^，。！？.!?]{0,12}(方向|方向卡|方向卡片|direction|concept)/i.test(text);
  const directionCardRequest = !workspaceAction && !genericNonVisualPlan && !negatedDirectionCardRequest && (/(方向|方案|概念|direction|option|concept).{0,16}(卡片|节点|card|node)|(?:卡片|节点|card|node).{0,16}(方向|方案|概念|direction|option|concept)/i.test(text));
  const directionContext = directionCardRequest || /(方向|概念方向|视觉概念|创意概念|风格方向|成图方向|视觉|创意|风格|directions?|concepts?|visual concepts?)/i.test(text);
  const directionRequest = !genericNonVisualPlan && !negatedDirectionCardRequest && directionContext
    && /(方向|方案|概念方向|视觉概念|创意概念|风格方向|directions?|options?|concepts?|visual concepts?)/i.test(text)
    && /(生成|创建|新建|做|整理|产出|给我|帮我|发散|展开|拆出|列出|设计|组合|generate|create|make|produce|brainstorm|develop|propose|give me)/i.test(text);
  const mediaFromExistingDirection = /(?:根据|基于|按照|用|把|从|选择|选中|current|selected|use|from|based on).{0,24}(方向|方案|概念|direction|option|concept).{0,32}(成图|出图|生成.{0,10}(图片|图像|图|视觉|海报)|generate\s+(?:image|picture|visual))|(?:方向|方案|概念|direction|option|concept).{0,32}(生成.{0,10}(图片|图像|图|视觉|海报)|成图|出图|generate\s+(?:image|picture|visual))/i.test(text);
  const mediaGeneration = !workspaceAction
    && !deferredMediaGeneration
    && (!directionCardRequest || mediaFromExistingDirection)
    && (!(directionRequest && !mediaFromExistingDirection))
    && /(成图|出图|生成.{0,32}(图|图片|图像|视觉|主视觉|海报|插画)|画.{0,8}(图|图片|画面)|绘制|渲染|改图|变体|生成.{0,10}(视频|动画|短片|动态镜头)|制作.{0,10}(视频|动画|短片)|generate.{0,16}(image|picture|visual|video|animation|clip)|draw.{0,12}(image|picture)|render.{0,12}(image|picture|visual)|make.{0,12}(video|animation|clip))/i.test(text);
  const mediaSearchRaw = /(搜图|找图|以图搜图|图片搜索|相似图片|相似风格.{0,8}图|反向.{0,8}(找|搜索|搜).{0,12}(图|图片|照片)|(?:找|搜|搜索|查找).{0,48}(参考图|视觉参考|图片|照片|图像|案例)|image search|visual reference search|find.{0,48}(images|photos|pictures|visual references)|reverse image search)/i.test(text);
  const explicitMediaSearch = /(搜图|找图|以图搜图|图片搜索|相似图片|参考图|视觉参考图|视觉参考|image search|visual reference search|reverse image search)/i.test(text);
  const negatedImageGeneration = /(不要|不需要|无需|别|不用|no|without|do\s+not|don't|dont).{0,16}(生成|出图|成图|绘制|渲染|create|generate|make)?[^，。！？.!?]{0,12}(图片|图像|照片|图|image|picture|photo)/i.test(text);
  const mediaSearch = mediaSearchRaw && (!negatedImageGeneration || explicitMediaSearch);
  const planning = /(计划|规划|方案|步骤|流程|路线图|日程|行程|旅行|旅游|攻略|安排|执行|落地|实施|待办|优先级|时间线|里程碑|筹备|预算|roadmap|workflow|schedule|itinerary|travel|trip|plan|milestone|implementation|timeline|budget)/i.test(text);
  const research = /(研究|资料|论文|文献|来源|引用|最新|官方|新闻|调研|research|source|citation|latest|official|news|literature)/i.test(text);
  const dataCode = /(代码|程序|bug|python|javascript|数据|表格|csv|图表|指标|前端|后端|白屏|控制台|环境变量|source\s*map|console|network|code|debug|data|table|chart|metric|benchmark)/i.test(text);
  const writing = /(写作|文案|文章|报告|提纲|润色|创意|故事|脚本|品牌宣言|宣言|开场白|邮件正文|writing|copy|article|report|outline|draft|revise|creative|story|script|manifesto|email body)/i.test(text);
  const summaryRequest = /(总结|摘要|归纳|整理).{0,16}(卡片|节点|情绪板|moodboard|summary|note)|(?:卡片|节点|情绪板|moodboard|summary|note).{0,16}(总结|摘要|归纳|整理)/i.test(text);
  const positiveCardSave = /(保存成|保存一个|保存一张|保存为|保存.{0,8}(结论|建议|评价|摘要|总结)?|做成|整理成).{0,16}(卡片|节点|card|node)/i.test(text);
  const noCanvas = isNoCanvasRequest(text) && !positiveCardSave && !workspaceAction && !deleteAction && !mediaGeneration && !mediaSearch && !sourceResearch && !webResearch && !visualEvaluation;
  const autoCanvasCandidate = !noCanvas
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
    webResearch,
    visualComparison,
    deferredMediaGeneration,
    directionRequest,
    directionCardRequest,
    negatedDirectionCardRequest,
    mediaFromExistingDirection,
    mediaGeneration,
    mediaSearch,
    planning,
    research,
    dataCode,
    writing,
    summaryRequest,
    noCanvas,
    trivial: isTrivialChatRequest(text),
    autoCanvasCandidate
  };
}

export function classifyCanvasActionIntent(message, options = {}) {
  const flags = detect(message);
  const agentMode = Boolean(options.agentMode);
  const explicitToolIntent = flags.explicitCanvas || flags.structuredDeliverable || flags.workspaceAction
    || flags.sourceResearch || flags.webResearch || flags.directionRequest || flags.directionCardRequest || flags.mediaGeneration || flags.mediaSearch || agentMode;
  const automaticCardMode = !flags.noCanvas && !explicitToolIntent && flags.autoCanvasCandidate;
  let taskType = "general";
  if (flags.noCanvas) taskType = "no_canvas";
  else if (flags.trivial) taskType = "trivial";
  else if (flags.mediaGeneration) taskType = "media_generation";
  else if (flags.mediaSearch) taskType = "media_search";
  else if (flags.sourceResearch) taskType = "source_research";
  else if (flags.webResearch) taskType = "web_research";
  else if (flags.workspaceAction || flags.deleteAction) taskType = "workspace";
  else if (flags.directionRequest || flags.directionCardRequest) taskType = "direction_generation";
  else if (flags.visualComparison) taskType = "visual_evaluation";
  else if (flags.visualEvaluation) taskType = "visual_critique";
  else if (flags.dataCode && /(白屏|bug|debug|console|network|source\s*map|前端|后端|代码|程序|javascript|python)/i.test(flags.text)) taskType = "data_code";
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
    allowCardCreation: !flags.noCanvas && !flags.trivial && (flags.explicitCanvas || flags.structuredDeliverable || flags.directionRequest || flags.directionCardRequest || flags.mediaGeneration || flags.mediaSearch || agentMode || automaticCardMode),
    allowSourceResearch: flags.sourceResearch,
    allowWorkspaceAction: flags.workspaceAction || agentMode,
    allowDestructive: flags.deleteAction,
    allowWebResearch: flags.webResearch,
    deferredMediaGeneration: flags.deferredMediaGeneration,
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
  if (intent.workspaceAction && !intent.agentMode) {
    addMany(allowed, WORKSPACE_TYPES);
    if (intent.allowDestructive) allowed.add("delete_node");
    return new Set([...allowed].filter((type) => CANVAS_ACTION_REGISTRY[type]));
  }
  if (intent.automaticCardMode) {
    if (intent.visualComparison) addMany(allowed, VISUAL_EVALUATION_TYPES);
    else if (intent.visualEvaluation) addMany(allowed, VISUAL_CRITIQUE_TYPES);
    else if (intent.planning) addMany(allowed, PLANNING_TYPES);
    else if (intent.research) addMany(allowed, RESEARCH_SYNTHESIS_TYPES);
    else if (intent.dataCode) addMany(allowed, DATA_CODE_TYPES);
    else if (intent.writing) addMany(allowed, WRITING_TYPES);
    else if (intent.directAnalysis) addMany(allowed, COMPARISON_TYPES);
    else addMany(allowed, SUMMARY_TYPES);
  }
  if (intent.explicitCanvas || intent.structuredDeliverable) {
    if (intent.visualComparison) addMany(allowed, COMPARISON_TYPES);
    else if (intent.visualEvaluation) addMany(allowed, VISUAL_CRITIQUE_TYPES);
    else if (intent.writing) addMany(allowed, WRITING_TYPES);
    else if (intent.dataCode) addMany(allowed, DATA_CODE_TYPES);
    else if (intent.planning) addMany(allowed, PLANNING_TYPES);
    else if (intent.research) addMany(allowed, RESEARCH_SYNTHESIS_TYPES);
    else if (intent.summaryRequest) addMany(allowed, SUMMARY_TYPES);
    else {
      addMany(allowed, CARD_TYPES);
      if (intent.directAnalysis) addMany(allowed, COMPARISON_TYPES);
    }
    if (intent.planning) addMany(allowed, PLANNING_TYPES);
    if (intent.research) addMany(allowed, RESEARCH_SYNTHESIS_TYPES);
    if (intent.dataCode) addMany(allowed, DATA_CODE_TYPES);
    if (intent.writing) addMany(allowed, WRITING_TYPES);
    if (intent.directAnalysis) addMany(allowed, COMPARISON_TYPES);
  }
  if ((intent.directionRequest || intent.directionCardRequest) && !intent.mediaGeneration) addMany(allowed, DIRECTION_TYPES);
  if (intent.mediaSearch) addMany(allowed, MEDIA_SEARCH_TYPES);
  if (intent.mediaGeneration) {
    if (intent.negatedDirectionCardRequest) addMany(allowed, ["generate_image", "generate_video", "create_note"]);
    else addMany(allowed, MEDIA_GENERATION_TYPES);
  }
  if (intent.webResearch) addMany(allowed, WEB_RESEARCH_TYPES);
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
  const policy = {
    intent,
    allowCanvasTool: allowedActionTypes.length > 0,
    allowedActionTypes,
    allowedActionSet: new Set(allowedActionTypes),
    maxActions: intent.automaticCardMode ? intent.maxAutomaticCards : intent.maxActions,
    maxAutomaticCards: intent.maxAutomaticCards
  };
  policy.loopControl = buildCanvasLoopControl(policy, options);
  return policy;
}

function normalizeLoopText(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/https?:\/\/[^\s)）\]】"'<>]+/gi, (url) => url.replace(/[?#].*$/, ""))
    .replace(/[\s"'“”‘’`_*#>()[\]{}，。！？、；：:;,.!?|/\\-]+/g, " ")
    .trim()
    .slice(0, 240);
}

function safeContentSnippet(value) {
  if (!value || typeof value !== "object") return "";
  try {
    return normalizeLoopText(JSON.stringify(value).slice(0, 900));
  } catch {
    return "";
  }
}

function firstLoopValue(...values) {
  for (const value of values) {
    const normalized = normalizeLoopText(value);
    if (normalized) return normalized;
  }
  return "";
}

export function actionLoopKey(actionItem) {
  const type = String(actionItem?.type || actionItem?.name || "").trim();
  const content = actionItem?.content && typeof actionItem.content === "object" ? actionItem.content : {};
  const parent = firstLoopValue(
    actionItem?.parentNodeId,
    actionItem?.parentNodeName,
    actionItem?.anchorNodeId,
    actionItem?.anchorNodeName
  );
  const identity = firstLoopValue(
    actionItem?.nodeId,
    actionItem?.nodeName,
    actionItem?.target,
    actionItem?.url,
    content?.url,
    actionItem?.query,
    content?.query,
    actionItem?.prompt,
    content?.prompt,
    actionItem?.title,
    content?.title,
    actionItem?.description,
    content?.description,
    content?.text
  );
  const contentSnippet = safeContentSnippet(content);
  return [type, parent, identity, contentSnippet].filter(Boolean).join("|") || `${type}|empty`;
}

export function buildCanvasLoopControl(policy, options = {}) {
  const intent = policy?.intent || {};
  const maxActions = Math.max(0, Number(policy?.maxActions) || 0);
  const maxActionsPerStep = Math.max(0, Math.min(Number(options.maxActionsPerStep) || maxActions, maxActions || 0));
  const openWorldCap = intent.automaticCardMode
    ? Math.min(2, maxActionsPerStep)
    : (intent.mediaGeneration ? Math.min(6, maxActionsPerStep) : (intent.allowSourceResearch || intent.allowWebResearch || intent.mediaSearch ? Math.min(4, maxActionsPerStep) : Math.min(2, maxActionsPerStep)));
  return {
    maxModelSteps: 1,
    maxActionSteps: 1,
    maxActionsPerStep,
    repeatLimitPerKey: Math.max(1, Number(options.repeatLimitPerKey) || 1),
    maxOpenWorldActions: Math.max(0, openWorldCap),
    stopAfterActionTypes: STOP_AFTER_ACTION_TYPES,
    stopAfterActionGroups: STOP_AFTER_ACTION_GROUPS,
    continueActionGroups: ["card", "reference", "media_search", "media_generation", "workspace"]
  };
}

function traceEvent(event, fields = {}) {
  return { event, ...fields };
}

function limitTraceEvents(events, limit = LOOP_TRACE_EVENT_LIMIT) {
  const list = Array.isArray(events) ? events.filter(Boolean) : [];
  if (list.length <= limit) return list;
  const headCount = Math.max(1, Math.floor((limit - 1) / 2));
  const tailCount = Math.max(1, limit - headCount - 1);
  return [
    ...list.slice(0, headCount),
    traceEvent("trace_truncated", { omittedCount: Math.max(0, list.length - headCount - tailCount) }),
    ...list.slice(-tailCount)
  ];
}

function compactActionTypes(actions) {
  return (Array.isArray(actions) ? actions : [])
    .map((actionItem) => actionItem?.type || actionItem?.name || "")
    .filter(Boolean)
    .slice(0, 24);
}

function shouldStopAfterAction(type, metadata, loopControl) {
  return loopControl.stopAfterActionTypes.includes(type)
    || loopControl.stopAfterActionGroups.includes(metadata?.group || "");
}

function compactLoopControl(loopControl) {
  return {
    maxModelSteps: loopControl.maxModelSteps,
    maxActionSteps: loopControl.maxActionSteps,
    maxActionsPerStep: loopControl.maxActionsPerStep,
    repeatLimitPerKey: loopControl.repeatLimitPerKey,
    maxOpenWorldActions: loopControl.maxOpenWorldActions,
    stopAfterActionTypes: loopControl.stopAfterActionTypes,
    stopAfterActionGroups: loopControl.stopAfterActionGroups
  };
}

export function applyCanvasLoopControl(actions, policy, options = {}) {
  const loopControl = {
    ...(policy?.loopControl || buildCanvasLoopControl(policy, options)),
    ...options
  };
  const raw = Array.isArray(actions) ? actions : [];
  const kept = [];
  const rejected = [];
  const events = [
    traceEvent("step_policy_prepared", {
      maxModelSteps: loopControl.maxModelSteps,
      maxActionSteps: loopControl.maxActionSteps,
      maxActionsPerStep: loopControl.maxActionsPerStep,
      repeatLimitPerKey: loopControl.repeatLimitPerKey,
      maxOpenWorldActions: loopControl.maxOpenWorldActions
    })
  ];
  const seenKeys = new Map();
  let openWorldActions = 0;
  let stoppedBy = null;

  for (const [index, actionItem] of raw.entries()) {
    const type = String(actionItem?.type || actionItem?.name || "").trim();
    const metadata = CANVAS_ACTION_REGISTRY[type];
    const group = metadata?.group || "";
    const key = actionLoopKey(actionItem);

    const reject = (reason, extra = {}) => {
      rejected.push({ action: actionItem, type, reason, group, key, ...extra });
      events.push(traceEvent("loop_action_rejected", { index, type, group, reason, ...extra }));
    };

    if (!type || !metadata) {
      reject("unknown_action");
      continue;
    }

    if (stoppedBy) {
      reject("after_stop_condition", { stoppedByType: stoppedBy.type, stoppedByGroup: stoppedBy.group });
      continue;
    }

    const seenCount = seenKeys.get(key) || 0;
    if (seenCount >= loopControl.repeatLimitPerKey) {
      reject("duplicate_circuit_breaker", { key });
      continue;
    }

    if (metadata?.annotations?.openWorldHint) {
      if (openWorldActions >= loopControl.maxOpenWorldActions) {
        reject("over_open_world_step_budget", { maxOpenWorldActions: loopControl.maxOpenWorldActions });
        continue;
      }
    }

    if (kept.length >= loopControl.maxActionsPerStep) {
      reject("over_step_action_budget", { maxActionsPerStep: loopControl.maxActionsPerStep });
      continue;
    }

    kept.push(actionItem);
    seenKeys.set(key, seenCount + 1);
    if (metadata?.annotations?.openWorldHint) openWorldActions += 1;
    events.push(traceEvent("loop_action_allowed", { index, type, group }));

    if (shouldStopAfterAction(type, metadata, loopControl)) {
      stoppedBy = { type, group, index };
      events.push(traceEvent("stop_condition_hit", { index, type, group }));
    }
  }

  events.push(traceEvent("loop_completed", {
    finalCount: kept.length,
    rejectedCount: rejected.length,
    openWorldActions,
    stoppedByType: stoppedBy?.type || ""
  }));

  return {
    actions: kept,
    rejected,
    loop: {
      control: compactLoopControl(loopControl),
      openWorldActions,
      stoppedBy,
      events: limitTraceEvents(events)
    }
  };
}

export function filterCanvasActionsByPolicy(actions, policy) {
  const raw = Array.isArray(actions) ? actions : [];
  const allowed = [];
  const rejected = [];
  const events = [
    traceEvent("intent_classified", {
      taskType: policy.intent.taskType,
      confidence: policy.intent.confidence,
      automaticCardMode: policy.intent.automaticCardMode
    }),
    traceEvent("allowed_actions_prepared", {
      count: policy.allowedActionTypes.length,
      maxActions: policy.maxActions,
      allowedActionTypes: policy.allowedActionTypes.slice(0, 32)
    }),
    traceEvent("model_actions_proposed", {
      count: raw.length,
      proposedActionTypes: compactActionTypes(raw)
    })
  ];
  for (const [index, actionItem] of raw.entries()) {
    const type = String(actionItem?.type || actionItem?.name || "").trim();
    const metadata = CANVAS_ACTION_REGISTRY[type];
    const reject = (reason) => {
      rejected.push({ action: actionItem, type, reason, group: metadata?.group || "" });
      events.push(traceEvent("guardrail_rejected", { index, type, reason, group: metadata?.group || "" }));
    };
    if (!type || !metadata) {
      reject("unknown_action");
      continue;
    }
    if (!policy.allowCanvasTool || !policy.allowedActionSet.has(type)) {
      reject("not_allowed_for_intent");
      continue;
    }
    if (policy.intent.visualEvaluation && !policy.intent.visualComparison && type === "create_comparison") {
      reject("single_visual_critique_not_comparison");
      continue;
    }
    if (metadata.annotations.destructiveHint && !policy.intent.allowDestructive) {
      reject("destructive_requires_explicit_delete");
      continue;
    }
    if (metadata.group === "source_research" && !policy.intent.allowSourceResearch) {
      reject("source_research_requires_explicit_source_intent");
      continue;
    }
    if (metadata.group === "workspace" && metadata.requiresExplicitIntent && !policy.intent.allowWorkspaceAction) {
      reject("workspace_action_requires_explicit_intent");
      continue;
    }
    if (metadata.group === "media_generation" && !policy.intent.mediaGeneration) {
      reject("media_generation_requires_explicit_intent");
      continue;
    }
    if (metadata.group === "media_search" && !policy.intent.mediaSearch) {
      reject("media_search_requires_explicit_intent");
      continue;
    }
    if (policy.intent.automaticCardMode && metadata.annotations.openWorldHint && !["create_quote", "create_link", "create_web_card"].includes(type)) {
      reject("automatic_mode_blocks_open_world_action");
      continue;
    }
    if (policy.intent.automaticCardMode && (type === "create_link" || type === "create_web_card") && !(actionItem?.url || actionItem?.content?.url)) {
      reject("automatic_reference_card_requires_url");
      continue;
    }
    allowed.push(actionItem);
  }
  events.push(traceEvent("guardrail_passed", {
    count: allowed.length,
    allowedActionTypes: compactActionTypes(allowed)
  }));
  const loopResult = applyCanvasLoopControl(allowed, policy);
  const allRejected = [...rejected, ...loopResult.rejected];
  const loopEvents = limitTraceEvents([...events, ...(loopResult.loop?.events || [])]);
  return {
    actions: loopResult.actions,
    rejected: allRejected,
    policy,
    loop: {
      ...(loopResult.loop || {}),
      events: loopEvents
    }
  };
}

export function summarizeCanvasActionPolicy(policy, { proposed = [], final = [], rejected = [], loop = null } = {}) {
  const events = limitTraceEvents([
    ...(loop?.events || []),
    traceEvent("final_actions_selected", {
      count: final.length,
      finalActionTypes: compactActionTypes(final)
    })
  ]);
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
    })),
    loop: loop ? {
      control: loop.control,
      stoppedBy: loop.stoppedBy,
      openWorldActions: loop.openWorldActions
    } : undefined,
    events
  };
}

export function actionRegistryCoverage() {
  return {
    missing: CANVAS_ACTION_TYPES.filter((type) => !CANVAS_ACTION_REGISTRY[type]),
    extra: Object.keys(CANVAS_ACTION_REGISTRY).filter((type) => !CANVAS_ACTION_TYPES.includes(type))
  };
}
