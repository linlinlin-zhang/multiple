const IMAGE_GENERATION_ACTION = "generate_image";
const VIDEO_GENERATION_ACTION = "generate_video";

const IMAGE_SEARCH_RE = /(找|搜|搜索|检索|查找|参考图|图片参考|视觉参考|灵感图|素材图|similar|reference|search|look\s*up|find).{0,16}(图|图片|图像|照片|image|photo|picture|visual|reference)|(?:image|photo|picture|visual)\s+(?:search|reference)/i;
const IMAGE_GENERATE_RE = /(成图|出图|生成(?:一张|这张|这些|几个|多张)?(?:图|图片|图像|照片|视觉|海报|插图|概念图|卡片)?|生成.*(?:成图|图片|图像|视觉|海报|插图|概念图)|画(?:一张|这张|这些)?(?:图|图片|图像|画面)?|绘制|渲染|做(?:一张|几张|这些)?.*(?:图|图片|图像|视觉|海报|插图|概念图)|make\s+(?:an?\s+)?image|generate\s+(?:an?\s+)?(?:image|picture|visual|illustration|render|concept)|draw\s+(?:an?\s+)?(?:image|picture|illustration)|render\s+(?:an?\s+)?(?:image|picture|visual))/i;
const VIDEO_GENERATE_RE = /(生成|制作|做|创作).{0,12}(视频|动画|短片|动态镜头|动图|video|animation|clip|motion)|(?:generate|make|create)\s+(?:a\s+)?(?:video|animation|clip|motion)/i;
const MEDIA_NEGATION_RE = /(不要|不用|无需|别|不需要).{0,12}(成图|出图|生成图|图片|图像|视频|动画|image|video|picture|visual)|(?:no|without|do\s+not|don't)\s+(?:generate|make|create)?.{0,16}(image|video|picture|visual)/i;
const PROMPT_ONLY_RE = /(提示词|prompt).{0,12}(怎么写|优化|润色|改写|模板|结构|参考|建议|分析)|(写|生成|输出|给).{0,10}(图片|图像|image|picture).{0,10}(提示词|prompt)|(?:write|improve|revise|optimi[sz]e).{0,18}(image\s+)?prompt|(?:image|picture)\s+generation\s+prompt/i;
const EXPLAIN_ONLY_RE = /(怎么|如何|流程|教程|原理|说明|解释|指南).{0,18}(成图|出图|生成图片|图像生成|image generation)|(?:how\s+to|explain|guide|tutorial).{0,18}(generate|image generation)/i;
const MULTI_DIRECTION_RE = /(这些|这几个|几个|所有|全部|每个|分别|批量|一组|多张|多份|方向们|方案们|each|all|these|several|multiple|batch)/i;
const DIRECTION_WORD_RE = /(方向|方案|卡片|节点|option|direction|card|node)/i;
const DEFAULT_MULTI_MEDIA_COUNT = 5;

const CHINESE_NUMERAL_COUNTS = new Map([
  ["一", 1],
  ["二", 2],
  ["两", 2],
  ["三", 3],
  ["四", 4],
  ["五", 5],
  ["六", 6],
  ["七", 7],
  ["八", 8],
  ["九", 9],
  ["十", 10]
]);

export function isDirectImageGenerationRequest(message = "") {
  const text = normalizeText(message);
  if (!text || MEDIA_NEGATION_RE.test(text)) return false;
  if (VIDEO_GENERATE_RE.test(text)) return false;
  if (IMAGE_SEARCH_RE.test(text) && !IMAGE_GENERATE_RE.test(text)) return false;
  if ((PROMPT_ONLY_RE.test(text) || EXPLAIN_ONLY_RE.test(text)) && !/(直接|现在|马上|同时|并|然后).{0,10}(成图|出图|生成(?:图|图片|图像)?|画|渲染|make|generate|draw|render)/i.test(text)) {
    return false;
  }
  return IMAGE_GENERATE_RE.test(text);
}

export function isDirectVideoGenerationRequest(message = "") {
  const text = normalizeText(message);
  if (!text || MEDIA_NEGATION_RE.test(text)) return false;
  return VIDEO_GENERATE_RE.test(text);
}

export function ensureMediaGenerationActions({
  message = "",
  actions = [],
  reply = "",
  selectedContext = null,
  canvas = {},
  analysis = {},
  lang = "zh",
  maxActions = 8
} = {}) {
  const normalized = Array.isArray(actions) ? actions.filter(Boolean) : [];

  if (isDirectVideoGenerationRequest(message)) {
    const fallback = buildMediaGenerationFallbackActions({
      mediaType: "video",
      message,
      reply,
      selectedContext,
      canvas,
      analysis,
      lang,
      maxActions
    });
    return reconcileMediaGenerationActions(normalized, fallback, VIDEO_GENERATION_ACTION, message, reply, maxActions, lang);
  }

  if (isDirectImageGenerationRequest(message)) {
    const fallback = buildMediaGenerationFallbackActions({
      mediaType: "image",
      message,
      reply,
      selectedContext,
      canvas,
      analysis,
      lang,
      maxActions
    });
    return reconcileMediaGenerationActions(normalized, fallback, IMAGE_GENERATION_ACTION, message, reply, maxActions, lang);
  }

  return normalized;
}

export function buildMediaGenerationFallbackActions({
  mediaType = "image",
  message = "",
  reply = "",
  selectedContext = null,
  canvas = {},
  analysis = {},
  lang = "zh",
  maxActions = 8
} = {}) {
  const text = normalizeText(message);
  const type = mediaType === "video" ? VIDEO_GENERATION_ACTION : IMAGE_GENERATION_ACTION;
  const candidates = collectGenerationCandidates({ mediaType, message: text, selectedContext, canvas, analysis });
  const wantsMany = wantsMultipleGenerations(text);
  const requestedCount = requestedGenerationCount(text, reply);
  const limit = mediaGenerationLimit({
    requestedCount,
    wantsMany,
    candidateCount: candidates.length,
    maxActions
  });
  const selectedCandidates = expandGenerationCandidates({
    candidates,
    message: text,
    mediaType,
    lang,
    limit
  });

  if (selectedCandidates.length) {
    return selectedCandidates.map((candidate, index) => ({
      type,
      nodeId: candidate.nodeId || undefined,
      parentNodeId: candidate.parentNodeId || undefined,
      title: candidate.title || fallbackMediaTitle(text, lang, mediaType, index),
      description: candidate.description || candidate.summary || "",
      prompt: appendMediaOutputDirective(candidate.prompt || buildFallbackMediaPrompt(text, candidate, lang, mediaType), lang, mediaType),
      mode: candidate.mode || (mediaType === "video" ? "text-to-video" : "text-to-image")
    }));
  }

  return buildSyntheticMediaCandidates({
    message: text,
    mediaType,
    lang,
    limit
  }).map((candidate, index) => ({
    type,
    title: candidate.title || fallbackMediaTitle(text, lang, mediaType, index),
    description: candidate.description || text.slice(0, 700),
    prompt: appendMediaOutputDirective(candidate.prompt || buildFallbackMediaPrompt(text, candidate, lang, mediaType), lang, mediaType),
    mode: candidate.mode || (mediaType === "video" ? "text-to-video" : "text-to-image")
  }));
}

function reconcileMediaGenerationActions(actions, fallback, mediaActionType, message, reply, maxActions, lang = "zh") {
  const normalized = Array.isArray(actions) ? actions.filter(Boolean) : [];
  const fallbackActions = Array.isArray(fallback) ? fallback.filter(Boolean) : [];
  const fallbackMediaActions = fallbackActions.filter((action) => action?.type === mediaActionType);
  const existingMedia = normalized
    .filter((action) => action?.type === mediaActionType)
    .map((action, index) => repairMediaActionTarget(action, fallbackMediaActions[index] || fallbackMediaActions[0]));
  const supportActions = normalized.filter((action) => action?.type !== mediaActionType);
  const requestedCount = requestedGenerationCount(message, reply);
  const wantsMany = wantsMultipleGenerations(message) || requestedCount > 1;
  const targetCount = Math.max(1, Math.min(
    maxActions,
    requestedCount || (wantsMany ? Math.max(existingMedia.length, fallbackActions.length || DEFAULT_MULTI_MEDIA_COUNT) : 1)
  ));

  if (!wantsMany && existingMedia.length) return normalized;
  if (existingMedia.length >= targetCount) return normalized;

  const media = [...existingMedia];
  const seen = new Set(media.map(mediaActionKey));
  const orderedFallbackActions = existingMedia.length && fallbackActions.length >= targetCount
    ? [...fallbackActions.slice(existingMedia.length), ...fallbackActions.slice(0, existingMedia.length)]
    : fallbackActions;
  for (const action of orderedFallbackActions) {
    if (action?.type !== mediaActionType) continue;
    const key = mediaActionKey(action);
    if (seen.has(key)) continue;
    seen.add(key);
    media.push(action);
    if (media.length >= targetCount) break;
  }

  if (media.length < targetCount) {
    const synthetic = buildSyntheticMediaCandidates({
      message: normalizeText(message),
      mediaType: mediaActionType === VIDEO_GENERATION_ACTION ? "video" : "image",
      lang,
      limit: targetCount
    }).map((candidate, index) => ({
      type: mediaActionType,
      title: candidate.title || fallbackMediaTitle(message, lang, mediaActionType === VIDEO_GENERATION_ACTION ? "video" : "image", index),
      description: candidate.description || "",
      prompt: appendMediaOutputDirective(candidate.prompt || message, lang, mediaActionType === VIDEO_GENERATION_ACTION ? "video" : "image"),
      mode: candidate.mode || (mediaActionType === VIDEO_GENERATION_ACTION ? "text-to-video" : "text-to-image")
    }));
    for (const action of synthetic) {
      const key = mediaActionKey(action);
      if (seen.has(key)) continue;
      seen.add(key);
      media.push(action);
      if (media.length >= targetCount) break;
    }
  }

  const retainedSupport = existingMedia.length ? supportActions : [];
  return [...media.slice(0, targetCount), ...retainedSupport].slice(0, maxActions);
}

function repairMediaActionTarget(action = {}, fallbackAction = null) {
  if (!fallbackAction || action.nodeId || action.parentNodeId || action.nodeName || action.target) return action;
  if (fallbackAction.nodeId) return { ...action, nodeId: fallbackAction.nodeId };
  if (fallbackAction.parentNodeId) return { ...action, parentNodeId: fallbackAction.parentNodeId };
  return action;
}

function mediaActionKey(action = {}) {
  return [
    String(action.type || ""),
    String(action.nodeId || action.parentNodeId || action.nodeName || action.target || ""),
    String(action.prompt || action.title || action.description || "").slice(0, 180)
  ].join(":");
}

function mediaGenerationLimit({ requestedCount = 0, wantsMany = false, candidateCount = 0, maxActions = 8 } = {}) {
  if (requestedCount) return Math.max(1, Math.min(maxActions, requestedCount));
  if (!wantsMany) return 1;
  if (candidateCount) return Math.max(1, Math.min(maxActions, candidateCount));
  return Math.max(1, Math.min(maxActions, DEFAULT_MULTI_MEDIA_COUNT));
}

function expandGenerationCandidates({ candidates = [], message = "", mediaType = "image", lang = "zh", limit = 1 } = {}) {
  const usable = candidates.filter(Boolean);
  if (usable.length >= limit) return usable.slice(0, limit);
  if (!usable.length) return [];

  if (limit > 1 && usable.length === 1) {
    return Array.from({ length: limit }, (_, index) => buildVariantCandidate(usable[0], {
      index,
      message,
      mediaType,
      lang
    }));
  }

  const expanded = [...usable];
  let index = 0;
  while (expanded.length < limit) {
    const base = usable[index % usable.length];
    expanded.push(buildVariantCandidate(base, {
      index: expanded.length,
      message,
      mediaType,
      lang
    }));
    index += 1;
  }
  return expanded.slice(0, limit);
}

function buildVariantCandidate(candidate = {}, { index = 0, message = "", mediaType = "image", lang = "zh" } = {}) {
  const variant = mediaVariant(index, lang, mediaType, message);
  const basePrompt = String(candidate.prompt || candidate.description || message || candidate.title || "").trim();
  const prompt = [
    basePrompt,
    variant.prompt,
    lang === "en"
      ? `This is output ${index + 1}; make it clearly different from the other requested outputs in setting, style, palette, camera language, and mood.`
      : `这是第 ${index + 1} 张结果；它必须在场景、风格、色彩、镜头语言和情绪上与其他结果明显不同。`
  ].filter(Boolean).join("\n\n");
  const parentNodeId = candidate.nodeId || candidate.parentNodeId || "";
  return {
    ...candidate,
    nodeId: undefined,
    parentNodeId: parentNodeId || undefined,
    title: variant.title || candidate.title,
    description: variant.description || candidate.description || "",
    prompt,
    mode: candidate.mode || (parentNodeId ? `${mediaType}-to-${mediaType}` : (mediaType === "video" ? "text-to-video" : "text-to-image"))
  };
}

function buildSyntheticMediaCandidates({ message = "", mediaType = "image", lang = "zh", limit = 1 } = {}) {
  return Array.from({ length: limit }, (_, index) => {
    const variant = mediaVariant(index, lang, mediaType, message);
    return {
      title: variant.title,
      description: variant.description,
      prompt: [message, variant.prompt].filter(Boolean).join("\n\n"),
      mode: mediaType === "video" ? "text-to-video" : "text-to-image"
    };
  });
}

function mediaVariant(index, lang, mediaType, message = "") {
  const battle = /(战斗|战斗场景|主角|battle|combat|protagonist|hero)/i.test(message);
  const zhBattle = [
    ["赛博朋克风格：未来都市战斗", "未来雨夜都市，霓虹广告牌、湿润街面、无人机和电光武器，主角处在动态战斗姿态，强透视，电影级动作瞬间。"],
    ["奇幻中世纪风格：城堡战场", "古老城堡或破碎王座大厅，火把、盔甲、魔法光效和尘土，主角与敌人交锋，史诗奇幻氛围。"],
    ["东方武侠风格：山水竹林", "雾气山谷、竹林或悬崖石台，长衣与兵器形成飘逸动势，水墨感构图，东方侠义气质。"],
    ["末日废土风格：荒原决斗", "沙尘暴、废弃机械、断裂公路和低饱和天空，主角在荒原中近身战斗，粗粝写实质感。"],
    ["科幻太空风格：外星环境", "外星地表或太空遗迹，低重力动作、异星光源、战甲细节和能量武器，宏大科幻尺度。"]
  ];
  const enBattle = [
    ["Cyberpunk: Future City Battle", "Rainy neon city, wet street reflections, drones, electric weapon trails, protagonist in a dynamic combat pose, cinematic action framing."],
    ["Medieval Fantasy: Castle Battlefield", "Ancient castle or ruined throne hall, torches, armor, magic light, dust, protagonist clashing with enemies, epic fantasy mood."],
    ["Eastern Wuxia: Mountain Bamboo Duel", "Misty valley, bamboo forest or cliff platform, flowing robes and weapons, ink-painting composition, elegant heroic motion."],
    ["Post-Apocalyptic: Wasteland Duel", "Dust storm, abandoned machines, broken road, desaturated sky, close combat in a harsh wasteland, gritty realism."],
    ["Sci-Fi Space: Alien Environment", "Alien surface or space ruin, low-gravity movement, strange light sources, detailed armor, energy weapons, large sci-fi scale."]
  ];
  const zhGeneral = [
    ["电影写实风格", "真实摄影质感，戏剧光线，清晰主体，强叙事瞬间，背景与动作完整。"],
    ["幻想史诗风格", "宏大场景，超现实细节，仪式感构图，丰富材质和高完成度世界观。"],
    ["未来科技风格", "高科技环境，冷暖光对比，精密装备，现代视觉语言和强空间纵深。"],
    ["东方诗意风格", "自然环境、留白、雾气和传统美学元素，画面安静但有力量。"],
    ["实验概念艺术风格", "大胆色彩、非常规镜头、抽象形态和强烈视觉识别。"]
  ];
  const enGeneral = [
    ["Cinematic Realism", "Photographic texture, dramatic lighting, clear subject, strong narrative moment, complete background and action."],
    ["Epic Fantasy", "Grand environment, surreal details, ritual composition, rich materials, highly finished worldbuilding."],
    ["Future Tech", "High-tech setting, warm/cool light contrast, precise gear, modern visual language, strong depth."],
    ["Poetic Eastern Mood", "Natural setting, negative space, mist, traditional aesthetic details, quiet but powerful image."],
    ["Experimental Concept Art", "Bold color, unusual camera angle, abstract forms, strong visual identity."]
  ];
  const variants = battle
    ? (lang === "en" ? enBattle : zhBattle)
    : (lang === "en" ? enGeneral : zhGeneral);
  const [title, description] = variants[index % variants.length];
  if (mediaType === "video") {
    return {
      title,
      description,
      prompt: lang === "en"
        ? `${description} Add coherent motion, clear subject action, camera movement, and a short cinematic shot structure.`
        : `${description} 加入连贯运动、明确主体动作、镜头运动和短片式镜头结构。`
    };
  }
  return { title, description, prompt: description };
}

function collectGenerationCandidates({ mediaType, message, selectedContext, canvas, analysis }) {
  const selectedIds = new Set(Array.isArray(canvas?.selectedNodeIds) ? canvas.selectedNodeIds.map(String) : []);
  if (canvas?.selectedNodeId) selectedIds.add(String(canvas.selectedNodeId));
  if (selectedContext?.id) selectedIds.add(String(selectedContext.id));

  const nodes = normalizeCanvasNodes(canvas);
  const selectedNodes = nodes.filter((node) => selectedIds.has(node.id) && isGenerationNodeCandidate(node, mediaType));
  const selectedContextCandidate = contextToCandidate(selectedContext, mediaType, message);

  const wantsMany = wantsMultipleGenerations(message);
  if (!wantsMany) {
    if (selectedNodes.length) return [nodeToCandidate(selectedNodes[0], message, mediaType)];
    if (selectedContextCandidate) return [selectedContextCandidate];
  }

  const nodeCandidates = nodes
    .filter((node) => isGenerationNodeCandidate(node, mediaType))
    .map((node) => nodeToCandidate(node, message, mediaType));

  const ordered = wantsMany
    ? [...selectedNodes.map((node) => nodeToCandidate(node, message, mediaType)), ...nodeCandidates]
    : [selectedContextCandidate, ...nodeCandidates].filter(Boolean);

  const analysisCandidates = normalizeAnalysisOptions(analysis)
    .filter((option) => isAnalysisGenerationCandidate(option, mediaType))
    .map((option) => optionToCandidate(option, message, mediaType));

  return dedupeCandidates([...ordered, ...analysisCandidates]);
}

function contextToCandidate(context, mediaType, message) {
  if (!context || typeof context !== "object") return null;
  const type = String(context.type || "").toLowerCase();
  if (!["option", "generated", "source-card", "source"].includes(type)) return null;
  if (mediaType === "video" && type !== "generated" && type !== "source-card" && type !== "source" && !looksVisual(context.prompt || context.summary || context.title || message)) {
    return null;
  }
  if (mediaType === "image" && type === "option" && context.nodeType && context.nodeType !== "image") return null;
  return {
    nodeId: context.id || "",
    title: String(context.title || "").slice(0, 120),
    description: String(context.summary || "").slice(0, 700),
    prompt: String(
      type === "generated" || type === "source-card" || type === "source"
        ? (message || context.prompt || context.summary || context.title || "")
        : (context.prompt || context.summary || message || context.title || "")
    ).slice(0, 1600),
    mode: type === "generated" || type === "source-card" || type === "source" ? `${mediaType}-to-${mediaType}` : ""
  };
}

function normalizeCanvasNodes(canvas) {
  const raw = Array.isArray(canvas?.nodes) ? canvas.nodes : (Array.isArray(canvas?.visibleNodes) ? canvas.visibleNodes : []);
  return raw
    .map((node) => {
      if (!node || typeof node !== "object") return null;
      return {
        id: String(node.id || node.nodeId || "").trim(),
        type: String(node.type || node.nodeType || "").trim(),
        title: String(node.title || node.name || node.label || "").trim(),
        summary: String(node.summary || node.description || "").trim(),
        prompt: String(node.prompt || "").trim(),
        nodeType: String(node.nodeType || node.optionNodeType || "").trim(),
        purpose: String(node.purpose || "").trim(),
        generated: Boolean(node.generated),
        selected: Boolean(node.selected || node.isSelected)
      };
    })
    .filter((node) => node?.id);
}

function isGenerationNodeCandidate(node, mediaType) {
  if (!node || node.id === "analysis") return false;
  const type = String(node.type || "").toLowerCase();
  if (type === "source") return false;
  if (mediaType === "video") {
    return type === "generated" || looksVisual(node.prompt || node.summary || node.title);
  }
  if (node.generated) return true;
  if (type !== "option" && type !== "source-card") return false;
  if (node.nodeType && node.nodeType !== "image") return false;
  if (node.purpose && node.purpose !== "visual" && node.nodeType !== "image") return false;
  return looksVisual(node.prompt || node.summary || node.title);
}

function nodeToCandidate(node, message, mediaType) {
  const promptSource = node.prompt || node.summary || node.title || message;
  return {
    nodeId: node.id,
    title: node.title.slice(0, 120),
    description: node.summary.slice(0, 700),
    prompt: (node.generated ? message || promptSource : promptSource).slice(0, 1600),
    mode: node.generated ? (mediaType === "video" ? "image-to-video" : "image-to-image") : ""
  };
}

function normalizeAnalysisOptions(analysis) {
  return Array.isArray(analysis?.options) ? analysis.options : [];
}

function isAnalysisGenerationCandidate(option, mediaType) {
  if (!option || typeof option !== "object") return false;
  if (mediaType === "video") return looksVisual(option.prompt || option.description || option.title || "");
  if (option.nodeType && option.nodeType !== "image") return false;
  if (option.purpose && option.purpose !== "visual" && option.nodeType !== "image") return false;
  return looksVisual(option.prompt || option.description || option.title || "");
}

function optionToCandidate(option, message, mediaType) {
  return {
    title: String(option.title || "").slice(0, 120),
    description: String(option.description || "").slice(0, 700),
    prompt: String(option.prompt || option.description || message || option.title || "").slice(0, 1600),
    mode: mediaType === "video" ? "text-to-video" : "text-to-image"
  };
}

function looksVisual(value = "") {
  return /(视觉|图像|图片|照片|画面|构图|光线|色彩|镜头|景别|风格|材质|渲染|概念|海报|插图|角色|场景|image|photo|picture|visual|composition|lighting|palette|camera|style|render|concept|poster|illustration|character|scene)/i.test(String(value || ""));
}

function wantsMultipleGenerations(message = "") {
  const text = normalizeText(message);
  return MULTI_DIRECTION_RE.test(text) || (DIRECTION_WORD_RE.test(text) && /(\d+|[一二两三四五六七八九十])\s*(个|张|种|款|条|份)?/.test(text));
}

function requestedGenerationCount(message = "", reply = "") {
  const text = `${normalizeText(message)} ${normalizeText(reply)}`.trim();
  const arabic = text.match(/(\d{1,2})\s*(个|张|种|款|条|份|directions?|images?|cards?)/i);
  if (arabic) return clampCount(Number(arabic[1]));
  const chinese = text.match(/([一二两三四五六七八九十])\s*(个|张|种|款|条|份)?/);
  if (chinese && CHINESE_NUMERAL_COUNTS.has(chinese[1])) return clampCount(CHINESE_NUMERAL_COUNTS.get(chinese[1]));
  return 0;
}

function fallbackMediaTitle(message, lang, mediaType, index) {
  const clean = deriveShortTitle(message);
  if (clean) return index > 0 ? `${clean} ${index + 1}`.slice(0, 120) : clean.slice(0, 120);
  if (mediaType === "video") return lang === "en" ? "Generated video" : "生成视频";
  return lang === "en" ? "Generated image" : "生成图片";
}

function buildFallbackMediaPrompt(message, candidate, lang, mediaType) {
  const base = [message, candidate?.prompt, candidate?.description]
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .join("\n\n");
  if (base) return appendMediaOutputDirective(base, lang, mediaType).slice(0, 1600);
  if (mediaType === "video") {
    return lang === "en"
      ? "Generate a coherent short video from the current canvas context."
      : "请基于当前画布上下文生成一段连贯短视频。";
  }
  return lang === "en"
    ? "Generate a complete image from the current canvas context."
    : "请基于当前画布上下文生成一张完整图片。";
}

function appendMediaOutputDirective(prompt, lang, mediaType) {
  if (/完整、可独立展示的图片|complete standalone image|真正的动态视觉画面|actual moving visual footage|对比决策卡|comparison card|decision card/i.test(prompt)) return prompt;
  if (mediaType === "video") {
    return lang === "en"
      ? `${prompt}\n\nCreate actual moving visual footage, not a storyboard card, comparison sheet, UI mockup, caption slide, or text-heavy explainer.`
      : `${prompt}\n\n请生成真正的动态视觉画面，不要做成分镜说明卡、对比表、UI 卡片、字幕页或文字解说页。`;
  }
  return lang === "en"
    ? `${prompt}\n\nCreate a complete standalone image. Do not turn this into a comparison card, decision card, infographic, UI screenshot, caption slide, or text-heavy layout unless explicitly requested.`
    : `${prompt}\n\n请生成一张完整、可独立展示的图片。除非用户明确要求，不要做成对比决策卡、信息图、UI 截图、字幕页或大量文字排版。`;
}

function deriveShortTitle(message) {
  return String(message || "")
    .normalize("NFKC")
    .replace(/请|帮我|给我|把|基于|根据|生成|成图|出图|画|绘制|渲染|一张|几个|这些|这几个|所有|全部|卡片|方向|方案|make|generate|draw|render|image|picture|visual/gi, " ")
    .replace(/[，。、《》“”‘’（）()[\]{}?.!?！？:：；;]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 48);
}

function dedupeCandidates(candidates) {
  const seen = new Set();
  const result = [];
  for (const candidate of candidates.filter(Boolean)) {
    const key = `${candidate.nodeId || ""}:${candidate.title || ""}:${candidate.prompt || ""}`.slice(0, 220);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(candidate);
  }
  return result;
}

function clampCount(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(1, Math.min(12, Math.round(value)));
}

function normalizeText(value = "") {
  return String(value || "").normalize("NFKC").trim();
}
