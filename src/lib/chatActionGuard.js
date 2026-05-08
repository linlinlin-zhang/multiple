const IMAGE_GENERATION_ACTION = "generate_image";
const VIDEO_GENERATION_ACTION = "generate_video";

const IMAGE_ACTION_TYPES = new Set([IMAGE_GENERATION_ACTION]);
const VIDEO_ACTION_TYPES = new Set([VIDEO_GENERATION_ACTION]);

const IMAGE_SEARCH_RE = /(找|搜|搜索|检索|查找|参考图|图片参考|视觉参考|灵感图|素材图|similar|reference|search|look\s*up|find).{0,16}(图|图片|图像|照片|image|photo|picture|visual|reference)|(?:image|photo|picture|visual)\s+(?:search|reference)/i;
const IMAGE_GENERATE_RE = /(成图|出图|生成(?:一张|这张|这些|几个|多张)?(?:图|图片|图像|照片|视觉|海报|插图|概念图|卡片)?|生成.*(?:成图|图片|图像|视觉|海报|插图|概念图)|画(?:一张|这张|这些)?(?:图|图片|图像|画面)?|绘制|渲染|做(?:一张|几张|这些)?.*(?:图|图片|图像|视觉|海报|插图|概念图)|make\s+(?:an?\s+)?image|generate\s+(?:an?\s+)?(?:image|picture|visual|illustration|render|concept)|draw\s+(?:an?\s+)?(?:image|picture|illustration)|render\s+(?:an?\s+)?(?:image|picture|visual))/i;
const VIDEO_GENERATE_RE = /(生成|制作|做|创作).{0,12}(视频|动画|短片|动态镜头|动图|video|animation|clip|motion)|(?:generate|make|create)\s+(?:a\s+)?(?:video|animation|clip|motion)/i;
const MEDIA_NEGATION_RE = /(不要|不用|无需|别|不需要).{0,12}(成图|出图|生成图|图片|图像|视频|动画|image|video|picture|visual)|(?:no|without|do\s+not|don't)\s+(?:generate|make|create)?.{0,16}(image|video|picture|visual)/i;
const PROMPT_ONLY_RE = /(提示词|prompt).{0,12}(怎么写|优化|润色|改写|模板|结构|参考|建议|分析)|(写|生成|输出|给).{0,10}(图片|图像|image|picture).{0,10}(提示词|prompt)|(?:write|improve|revise|optimi[sz]e).{0,18}(image\s+)?prompt|(?:image|picture)\s+generation\s+prompt/i;
const EXPLAIN_ONLY_RE = /(怎么|如何|流程|教程|原理|说明|解释|指南).{0,18}(成图|出图|生成图片|图像生成|image generation)|(?:how\s+to|explain|guide|tutorial).{0,18}(generate|image generation)/i;
const MULTI_DIRECTION_RE = /(这些|这几个|几个|所有|全部|每个|分别|批量|一组|多张|多份|方向们|方案们|each|all|these|several|multiple|batch)/i;
const DIRECTION_WORD_RE = /(方向|方案|卡片|节点|option|direction|card|node)/i;

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
  selectedContext = null,
  canvas = {},
  analysis = {},
  lang = "zh",
  maxActions = 8
} = {}) {
  const normalized = Array.isArray(actions) ? actions.filter(Boolean) : [];

  if (isDirectVideoGenerationRequest(message)) {
    if (hasActionType(normalized, VIDEO_ACTION_TYPES)) return normalized;
    const fallback = buildMediaGenerationFallbackActions({
      mediaType: "video",
      message,
      selectedContext,
      canvas,
      analysis,
      lang,
      maxActions
    });
    return fallback.length ? fallback : normalized;
  }

  if (isDirectImageGenerationRequest(message)) {
    if (hasActionType(normalized, IMAGE_ACTION_TYPES)) return normalized;
    const fallback = buildMediaGenerationFallbackActions({
      mediaType: "image",
      message,
      selectedContext,
      canvas,
      analysis,
      lang,
      maxActions
    });
    return fallback.length ? fallback : normalized;
  }

  return normalized;
}

export function buildMediaGenerationFallbackActions({
  mediaType = "image",
  message = "",
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
  const requestedCount = requestedGenerationCount(text);
  const limit = Math.max(1, Math.min(maxActions, requestedCount || (wantsMany ? maxActions : 1)));
  const selectedCandidates = candidates.slice(0, limit);

  if (selectedCandidates.length) {
    return selectedCandidates.map((candidate, index) => ({
      type,
      nodeId: candidate.nodeId || undefined,
      title: candidate.title || fallbackMediaTitle(text, lang, mediaType, index),
      description: candidate.description || candidate.summary || "",
      prompt: candidate.prompt || buildFallbackMediaPrompt(text, candidate, lang, mediaType),
      mode: candidate.mode || (mediaType === "video" ? "text-to-video" : "text-to-image")
    }));
  }

  return [{
    type,
    title: fallbackMediaTitle(text, lang, mediaType, 0),
    description: text.slice(0, 700),
    prompt: buildFallbackMediaPrompt(text, null, lang, mediaType),
    mode: mediaType === "video" ? "text-to-video" : "text-to-image"
  }];
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

function requestedGenerationCount(message = "") {
  const text = normalizeText(message);
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
  if (base) return base.slice(0, 1600);
  if (mediaType === "video") {
    return lang === "en"
      ? "Generate a coherent short video from the current canvas context."
      : "请基于当前画布上下文生成一段连贯短视频。";
  }
  return lang === "en"
    ? "Generate a complete image from the current canvas context."
    : "请基于当前画布上下文生成一张完整图片。";
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

function hasActionType(actions, types) {
  return actions.some((action) => types.has(action?.type));
}

function clampCount(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(1, Math.min(12, Math.round(value)));
}

function normalizeText(value = "") {
  return String(value || "").normalize("NFKC").trim();
}
