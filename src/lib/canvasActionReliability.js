const DEFAULT_DIRECTION_COUNT = 5;
const DEFAULT_GENERIC_COUNT = 1;

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

const DIRECTION_WORD_RE = /(方向|方案|概念方向|视觉概念|创意概念|风格方向|directions?|options?|concepts?|visual concepts?)/i;
const DIRECTION_CREATE_RE = /(生成|创建|新建|做|产出|给我|帮我|发散|展开|拆出|列出|设计|generate|create|make|produce|brainstorm|develop|propose|give me)/i;
const DIRECTION_EXPLAIN_ONLY_RE = /(怎么|如何|流程|教程|说明|解释|原理|为什么|how to|explain|tutorial|guide).{0,24}(方向|方案|direction|option|concept)/i;
const CANVAS_ARTIFACT_RE = /(画布|卡片|节点|创建|新建|生成|添加|放到|整理到|产物|canvas|card|node|artifact|create|add|generate)/i;
const PROMISED_ACTION_RE = /(我(?:会|来|将|可以|已经|已)|已为你|已经为你|会帮你|马上|接下来|i(?:'|’)ll|i will|i can|i(?:'|’)ve|i have|let me|going to).{0,120}(创建|新建|生成|添加|放到|整理|拆成|产出|create|generate|add|make|put|split|produce)/i;
const PROMISED_CANVAS_RE = new RegExp(`${PROMISED_ACTION_RE.source}.{0,120}(画布|卡片|节点|方向|方案|canvas|card|node|direction|option|artifact)`, "i");

export function ensureCommittedCanvasActions({
  message = "",
  reply = "",
  actions = [],
  analysis = {},
  lang = "zh",
  maxActions = 8
} = {}) {
  const normalized = Array.isArray(actions) ? actions.filter(Boolean) : (actions ? [actions] : []);
  const requestText = normalizeText(message);
  const replyText = normalizeText(reply);
  const wantsDirections = shouldCreateDirectionActions(requestText, replyText);

  if (normalized.length > 0) {
    if (wantsDirections && !hasConcreteDirectionAction(normalized)) {
      const directionActions = buildDirectionFallbackActions({
        message: requestText,
        reply: replyText,
        analysis,
        lang,
        maxActions
      });
      if (directionActions.length) return mergePrimaryActions(directionActions, normalized, maxActions);
    }
    return normalized;
  }

  if (!requestText && !replyText) return normalized;

  if (wantsDirections) {
    const directionActions = buildDirectionFallbackActions({
      message: requestText,
      reply: replyText,
      analysis,
      lang,
      maxActions
    });
    if (directionActions.length) return directionActions;
  }

  if (shouldCreatePromisedCanvasNote(requestText, replyText)) {
    return [buildPromisedCanvasNote({ message: requestText, reply: replyText, lang })];
  }

  return normalized;
}

function hasConcreteDirectionAction(actions = []) {
  return actions.some((action) => ["create_direction", "generate_image", "generate_video"].includes(String(action?.type || action?.name || "")));
}

function mergePrimaryActions(primary = [], secondary = [], maxActions = 8) {
  const max = clampPositiveNumber(maxActions, 8);
  const support = secondary.filter((action) => action && !hasConcreteDirectionAction([action]));
  return [...primary, ...support].slice(0, max);
}

export function shouldCreateDirectionActions(message = "", reply = "") {
  const requestText = normalizeText(message);
  const replyText = normalizeText(reply);
  if (!requestText && !replyText) return false;
  if (DIRECTION_EXPLAIN_ONLY_RE.test(requestText) && !/(帮我|给我|请|直接|现在|马上|生成\s*\d|create|generate|make)/i.test(requestText)) {
    return false;
  }
  const explicitRequest = DIRECTION_WORD_RE.test(requestText) && DIRECTION_CREATE_RE.test(requestText);
  const promisedDirections = DIRECTION_WORD_RE.test(replyText) && PROMISED_ACTION_RE.test(replyText);
  return explicitRequest || promisedDirections;
}

export function requestedDirectionCount(message = "", reply = "", maxActions = 8) {
  const text = `${normalizeText(message)} ${normalizeText(reply)}`.trim();
  const max = clampPositiveNumber(maxActions, 8);
  const arabic =
    text.match(/(\d{1,2})\s*(个|张|种|款|条|份)?\s*(不同|视觉|创意|概念|风格)?\s*(方向|方案|概念|directions?|options?|concepts?)/i) ||
    text.match(/(\d{1,2}).{0,32}(方向|方案|概念|directions?|options?|concepts?)/i) ||
    text.match(/(方向|方案|概念|directions?|options?|concepts?).{0,16}(\d{1,2})/i);
  if (arabic) {
    const count = Number(arabic[1] && /^\d/.test(arabic[1]) ? arabic[1] : arabic[2]);
    if (Number.isFinite(count)) return Math.max(1, Math.min(max, count));
  }

  const chinese =
    text.match(/([一二两三四五六七八九十])\s*(个|张|种|款|条|份)?\s*(不同|视觉|创意|概念|风格)?\s*(方向|方案|概念)/) ||
    text.match(/([一二两三四五六七八九十]).{0,32}(方向|方案|概念)/) ||
    text.match(/(方向|方案|概念).{0,16}([一二两三四五六七八九十])/);
  if (chinese) {
    const raw = CHINESE_NUMERAL_COUNTS.has(chinese[1]) ? chinese[1] : chinese[2];
    const count = CHINESE_NUMERAL_COUNTS.get(raw);
    if (Number.isFinite(count)) return Math.max(1, Math.min(max, count));
  }

  if (/(几个|几种|若干|多(?:个|张|种|款|条|份)?|several|multiple|few|a few)/i.test(text)) {
    return Math.max(1, Math.min(max, DEFAULT_DIRECTION_COUNT));
  }
  return Math.max(1, Math.min(max, DEFAULT_GENERIC_COUNT));
}

export function buildDirectionFallbackActions({
  message = "",
  reply = "",
  analysis = {},
  lang = "zh",
  maxActions = 8
} = {}) {
  const count = requestedDirectionCount(message, reply, maxActions);
  const analysisCandidates = extractAnalysisDirectionCandidates(analysis);
  const replyCandidates = extractDirectionCandidates(reply);
  const syntheticCandidates = buildSyntheticDirectionCandidates({
    topic: deriveDirectionTopic(message, reply, lang),
    count,
    lang
  });
  const candidates = dedupeCandidates([...analysisCandidates, ...replyCandidates, ...syntheticCandidates]).slice(0, count);
  return candidates.map((candidate, index) => {
    const title = candidate.title || fallbackDirectionTitle(index, lang);
    const prompt = String(candidate.prompt || candidate.description || title || message).trim();
    return {
      type: "create_direction",
      title: title.slice(0, 120),
      description: String(candidate.description || prompt || title).slice(0, 700),
      prompt: prompt.slice(0, 1600),
      mode: candidate.mode || "direction",
      nodeType: candidate.nodeType || inferDirectionNodeType(`${message}\n${reply}\n${prompt}`),
      content: candidate.content
    };
  });
}

function shouldCreatePromisedCanvasNote(message = "", reply = "") {
  const requestText = normalizeText(message);
  const replyText = normalizeText(reply);
  if (!replyText || DIRECTION_WORD_RE.test(replyText)) return false;
  return PROMISED_CANVAS_RE.test(replyText) && CANVAS_ARTIFACT_RE.test(`${requestText} ${replyText}`);
}

function buildPromisedCanvasNote({ message = "", reply = "", lang = "zh" } = {}) {
  const title = deriveNoteTitle(message || reply, lang);
  const body = reply || message || title;
  return {
    type: "create_note",
    title,
    description: lang === "en"
      ? "Recovered canvas artifact from a reply that promised work without tool calls."
      : "从承诺了画布产物但没有工具调用的回复中补齐内容。",
    content: {
      text: body.slice(0, 4000)
    }
  };
}

function extractAnalysisDirectionCandidates(analysis = {}) {
  const options = Array.isArray(analysis?.options) ? analysis.options : [];
  return options
    .map((option) => {
      if (!option || typeof option !== "object") return null;
      const title = String(option.title || "").trim();
      const description = String(option.description || option.summary || "").trim();
      const prompt = String(option.prompt || description || title || "").trim();
      const nodeType = String(option.nodeType || "").trim();
      const purpose = String(option.purpose || "").trim();
      const combined = `${title}\n${description}\n${prompt}`;
      if (!combined.trim()) return null;
      if (nodeType && nodeType !== "image") return null;
      if (purpose && purpose !== "visual" && nodeType !== "image") return null;
      if (!DIRECTION_WORD_RE.test(combined) && !looksVisual(combined)) return null;
      return {
        title,
        description,
        prompt,
        nodeType: nodeType || "image",
        mode: "direction"
      };
    })
    .filter(Boolean);
}

function extractDirectionCandidates(text = "") {
  const lines = String(text || "")
    .normalize("NFKC")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const candidates = [];
  for (const line of lines) {
    const cleaned = line.replace(/^#{1,6}\s+/, "").replace(/^[-*•]\s+/, "").trim();
    const directionMatch = cleaned.match(/^(方向|方案|概念|direction|option|concept)\s*([0-9一二两三四五六七八九十]+)?\s*[：:、.)-]?\s*(.+)$/i);
    const numberedMatch = cleaned.match(/^([0-9]{1,2}|[一二两三四五六七八九十])\s*[.)、-]\s*(.+)$/);
    const body = directionMatch?.[3] || numberedMatch?.[2] || "";
    if (!body || body.length < 3) continue;
    if (!directionMatch && !looksLikeDirection(body)) continue;
    const [rawTitle, ...rest] = body.split(/[:：]\s*/);
    const title = (directionMatch ? `${directionMatch[1]}${directionMatch[2] || candidates.length + 1}: ${rawTitle}` : rawTitle).trim();
    const description = (rest.join("：").trim() || body).trim();
    candidates.push({
      title: title.slice(0, 120),
      description: description.slice(0, 700),
      prompt: description.slice(0, 1600),
      nodeType: "image",
      mode: "direction"
    });
  }
  return candidates;
}

function buildSyntheticDirectionCandidates({ topic = "", count = DEFAULT_DIRECTION_COUNT, lang = "zh" } = {}) {
  const zhStyles = [
    ["叙事电影感", "用强叙事、戏剧光影和明确主体关系建立画面张力。"],
    ["极简符号化", "用克制构图、少量关键符号和留白强化识别度。"],
    ["未来科技感", "用界面光、冷暖对比、金属/玻璃材质表达前沿感。"],
    ["东方幻想", "用传统意象、仪式感构图和超现实细节做世界观延展。"],
    ["自然诗意", "用有机材质、环境光和季节性氛围塑造温度。"],
    ["编辑视觉", "用杂志式构图、清晰层级和强标题感支持传播。"],
    ["工艺质感", "突出材质、手作痕迹、微距细节和可触摸的真实感。"],
    ["实验抽象", "用非常规视角、抽象形态和大胆色彩打开差异。"]
  ];
  const enStyles = [
    ["Cinematic Story", "Build tension with narrative composition, dramatic light, and clear subject relationships."],
    ["Minimal Symbolic", "Use restraint, negative space, and a few strong symbols for high recognition."],
    ["Future Tech", "Lean on interface light, material contrast, metal/glass texture, and advanced mood."],
    ["Mythic Ritual", "Extend the world with symbolic rituals, surreal details, and monumental framing."],
    ["Organic Poetic", "Use natural texture, ambient light, and seasonal atmosphere for warmth."],
    ["Editorial System", "Use magazine-like hierarchy, clean composition, and strong communication value."],
    ["Craft Texture", "Emphasize tactile materials, hand-made marks, close detail, and realism."],
    ["Experimental Abstract", "Open contrast through unusual viewpoints, abstract forms, and bold color."]
  ];
  const styles = lang === "en" ? enStyles : zhStyles;
  const base = topic || (lang === "en" ? "the current canvas topic" : "当前画布主题");
  return Array.from({ length: count }, (_, index) => {
    const [style, detail] = styles[index % styles.length];
    return lang === "en"
      ? {
          title: `Direction ${index + 1}: ${style}`,
          description: `${style} direction for ${base}. ${detail}`,
          prompt: `${base}. ${style} visual direction. ${detail} Make it specific enough to refine, compare, or generate as an image.`,
          nodeType: "image",
          mode: "direction"
        }
      : {
          title: `方向${index + 1}：${style}`,
          description: `围绕「${base}」的${style}方向。${detail}`,
          prompt: `${base}。${style}视觉方向：${detail} 需要足够具体，便于继续细化、对比或直接成图。`,
          nodeType: "image",
          mode: "direction"
        };
  });
}

function deriveDirectionTopic(message = "", reply = "", lang = "zh") {
  const source = normalizeText(message || reply);
  const cleaned = source
    .replace(/请|帮我|给我|基于|根据|围绕|现在|直接|继续|生成|创建|新建|做|产出|发散|展开|拆出|列出|几个|几种|多个|多种|不同|方向|方案|概念方向|视觉概念|卡片|节点|画布/gi, " ")
    .replace(/\b(generate|create|make|produce|brainstorm|develop|directions?|options?|concepts?|cards?|nodes?|canvas|several|multiple|different|for|around|based on)\b/gi, " ")
    .replace(/[，。、《》“”‘’（）()[\]{}?.!?！？:：；;]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
  if (cleaned) return cleaned.slice(0, 80);
  return lang === "en" ? "current material" : "当前素材";
}

function deriveNoteTitle(text = "", lang = "zh") {
  const cleaned = normalizeText(text)
    .replace(/[，。、《》“”‘’（）()[\]{}?.!?！？:：；;]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
  if (cleaned) return cleaned.slice(0, 48);
  return lang === "en" ? "Recovered canvas note" : "补齐的画布笔记";
}

function fallbackDirectionTitle(index, lang) {
  return lang === "en" ? `Direction ${index + 1}` : `方向${index + 1}`;
}

function inferDirectionNodeType(text = "") {
  if (/(计划|步骤|路线图|排期|plan|roadmap|schedule)/i.test(text)) return "plan";
  if (/(待办|清单|todo|checklist)/i.test(text)) return "todo";
  if (/(表格|矩阵|数据|table|matrix|spreadsheet)/i.test(text)) return "table";
  return "image";
}

function looksLikeDirection(text = "") {
  return DIRECTION_WORD_RE.test(text) || looksVisual(text);
}

function looksVisual(text = "") {
  return /(视觉|图像|图片|照片|画面|构图|光线|色彩|镜头|景别|风格|材质|渲染|概念|海报|插图|角色|场景|image|photo|picture|visual|composition|lighting|palette|camera|style|render|concept|poster|illustration|character|scene)/i.test(String(text || ""));
}

function dedupeCandidates(candidates = []) {
  const seen = new Set();
  const result = [];
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "object") continue;
    const key = normalizeText(`${candidate.title || ""} ${candidate.prompt || candidate.description || ""}`).toLowerCase().slice(0, 180);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(candidate);
  }
  return result;
}

function clampPositiveNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : fallback;
}

function normalizeText(value = "") {
  return String(value || "").normalize("NFKC").replace(/\s+/g, " ").trim();
}
