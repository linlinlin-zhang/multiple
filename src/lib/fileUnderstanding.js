/**
 * File understanding service.
 *
 * It turns parsed documents into a "file understanding card": summary,
 * structure, key materials, and follow-up directions. The LLM path is used
 * when an analysis key is configured; otherwise the parser-derived fallback
 * still returns a useful card.
 */

import { parseFileStructured } from "./fileParser.js";

const API_TIMEOUT_MS = 120000;
const MAX_PAGES_FOR_PROMPT = 6;
const MAX_CHARS_PER_PAGE_IN_PROMPT = 900;
const MAX_KEY_PHRASES = 12;

const DIRECTION_TYPES = new Set([
  "image-generation",
  "research",
  "task-plan",
  "web-analysis",
  "report-structure",
  "material-collection"
]);

export async function buildFileUnderstanding(buffer, fileName, ext, options = {}) {
  const lang = options.lang === "en" ? "en" : "zh";
  const parsed = await parseFileStructured(buffer, ext);

  if (parsed.isScanned) {
    return buildScannedUnderstanding(parsed, fileName, lang);
  }

  const apiKey = options.apiKey || process.env.KIMI_API_KEY || process.env.ANALYSIS_API_KEY || "";
  const baseUrl = options.baseUrl || process.env.ANALYSIS_API_BASE_URL || "https://api.moonshot.cn/v1";
  const model = options.model || process.env.ANALYSIS_MODEL || "kimi-k2.6";

  if (!apiKey) {
    return buildFallbackUnderstanding(parsed, fileName, lang);
  }

  try {
    const prompt = buildUnderstandingPrompt(parsed, fileName, lang);
    const response = await callLlm(apiKey, baseUrl, model, prompt);
    const content = collectChatContent(response);
    const parsedJson = parseJsonFromText(content);
    const normalized = normalizeUnderstanding(parsedJson, parsed, fileName, lang);
    return {
      ...normalized,
      ok: true,
      isScanned: false,
      metadata: { ...(parsed.metadata || {}), keyPhrases: parsed.keyPhrases || [] },
      rawParsed: parsed
    };
  } catch (error) {
    console.error("[buildFileUnderstanding] LLM failed:", error.message);
    return {
      ...buildFallbackUnderstanding(parsed, fileName, lang),
      _llmError: error.message
    };
  }
}

function buildScannedUnderstanding(parsed, fileName, lang) {
  const isEn = lang === "en";
  return {
    ok: true,
    summary: isEn ? "Scanned document, text extraction is limited" : "扫描版文档，文本提取受限",
    abstract: isEn
      ? `This appears to be a scanned PDF with ${parsed.totalPages} page(s). OCR is required before the app can reliably analyze structure, tables, and detailed content.`
      : `这是一份 ${parsed.totalPages} 页的扫描版 PDF。当前可提取文本很少，需要先进行 OCR，之后才能可靠分析章节结构、表格与具体内容。`,
    structure: { totalPages: parsed.totalPages, outline: [], sections: [] },
    keyMaterials: { images: [], tables: [], charts: [] },
    actionableDirections: [
      {
        id: "dir-1",
        type: "material-collection",
        title: isEn ? "Run OCR first" : "先进行 OCR",
        description: isEn
          ? "Extract text from the scanned pages, then rebuild the file understanding card from the OCR result."
          : "先从扫描页面中提取文字，再基于 OCR 结果重新生成文件理解卡。",
        rationale: isEn ? "The current document has too little machine-readable text." : "当前文档几乎没有可机器读取的文本。"
      },
      {
        id: "dir-2",
        type: "report-structure",
        title: isEn ? "Manual page review" : "人工页预览",
        description: isEn
          ? "Review page thumbnails and mark important pages before running deeper analysis."
          : "先预览页面缩略图并标记重点页面，再进入更深入的分析流程。",
        rationale: isEn ? "Visual page triage keeps scanned-document analysis controllable." : "扫描件先做视觉筛选更稳。"
      }
    ],
    isScanned: true,
    metadata: { ...(parsed.metadata || {}), needsOcr: true, keyPhrases: parsed.keyPhrases || [] },
    rawParsed: parsed,
    keyPhrases: parsed.keyPhrases || []
  };
}

function buildUnderstandingPrompt(parsed, fileName, lang) {
  const isEn = lang === "en";
  const pagePreviews = parsed.pages
    .slice(0, MAX_PAGES_FOR_PROMPT)
    .map((page) => {
      const text = page.text.slice(0, MAX_CHARS_PER_PAGE_IN_PROMPT);
      const images = page.images?.length ? ` [images: ${page.images.length}]` : "";
      const tables = page.tables?.length ? ` [tables: ${page.tables.length}]` : "";
      return isEn
        ? `Page/slide ${page.pageNumber}${images}${tables}:\n${text}`
        : `第 ${page.pageNumber} 页/幻灯片${images}${tables}：\n${text}`;
    })
    .join("\n\n---\n\n");

  const totalImages = parsed.pages.reduce((sum, p) => sum + (p.images?.length || 0), 0);
  const totalTables = parsed.pages.reduce((sum, p) => sum + (p.tables?.length || 0), 0);
  const phrases = (parsed.keyPhrases || []).slice(0, MAX_KEY_PHRASES).join(isEn ? ", " : "、");

  const schema = [
    "{",
    '  "summary": "one sentence",',
    '  "abstract": "100-200 words / 120-260 Chinese characters",',
    '  "keyPhrases": ["phrase"],',
    '  "structure": {',
    '    "outline": ["section title"],',
    '    "sections": [{"title": "section", "pageRange": "1-3", "summary": "section summary"}]',
    "  },",
    '  "keyMaterials": {',
    '    "images": [{"description": "image description", "page": 1, "relevance": "high|medium|low"}],',
    '    "tables": [{"description": "table description", "page": 1, "rowCount": 5, "colCount": 3}],',
    '    "charts": [{"description": "chart description", "page": 1}]',
    "  },",
    '  "actionableDirections": [',
    '    {"type": "image-generation|research|task-plan|web-analysis|report-structure|material-collection", "title": "short title", "description": "40-80 words", "rationale": "short reason"}',
    "  ]",
    "}"
  ].join("\n");

  const system = isEn
    ? "You are a document intelligence engine for a visual AI canvas. Analyze uploaded files and return a compact file-understanding card."
    : "你是服务于可视化 AI 画布的文档理解引擎。请分析上传文件，并生成可被画布继续操作的文件理解卡。";

  const user = isEn
    ? [
        `File name: ${fileName || "(unnamed)"}`,
        `Type: ${parsed.type}`,
        `Pages/slides: ${parsed.totalPages}`,
        `Detected images: ${totalImages}`,
        `Detected tables: ${totalTables}`,
        `Detected key phrases: ${phrases || "(none)"}`,
        "",
        "Preview:",
        pagePreviews || "(no extractable text)",
        "",
        "Return strict JSON only, with this schema:",
        schema,
        "",
        "Requirements:",
        "- Provide 5 to 8 actionableDirections. Pick the count based on document complexity.",
        "- Do not limit directions to image generation. Include research, task planning, report structure, web analysis, or material collection when the document calls for them.",
        "- Ground every direction in the document content.",
        "- Use concise titles that can fit in a canvas card.",
        "- Do not include Markdown fences."
      ].join("\n")
    : [
        `文件名：${fileName || "未命名文件"}`,
        `类型：${parsed.type}`,
        `页数/幻灯片数：${parsed.totalPages}`,
        `检测到图片：${totalImages}`,
        `检测到表格：${totalTables}`,
        `检测到关键词：${phrases || "无"}`,
        "",
        "内容预览：",
        pagePreviews || "未提取到可读文本",
        "",
        "只返回严格 JSON，不要 Markdown 代码块，结构如下：",
        schema,
        "",
        "要求：",
        "- actionableDirections 返回 5 到 8 个方向，数量由文档复杂度决定。",
        "- 方向不能只做成图，也可以是研究、任务计划、网页分析、汇报结构、素材收集。",
        "- 每个方向都必须基于文档实际内容。",
        "- 标题要短，适合显示在画布卡片上。",
        "- 不要输出暴力、色情、仇恨或侵犯隐私的内容。"
      ].join("\n");

  return { system, user };
}

async function callLlm(apiKey, baseUrl, model, prompt) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: prompt.system },
          { role: "user", content: prompt.user }
        ],
        temperature: 0.25
      }),
      signal: controller.signal
    });

    const text = await response.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }

    if (!response.ok) {
      const detail = json?.error?.message || text || response.statusText;
      throw new Error(`LLM API ${response.status}: ${detail}`);
    }

    return json;
  } finally {
    clearTimeout(timer);
  }
}

function collectChatContent(response) {
  const content = response?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map((part) => part?.text || part?.content || "").filter(Boolean).join("\n");
  }
  return "";
}

function parseJsonFromText(text) {
  if (!text) throw new Error("Empty LLM response");
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON object found in LLM response");
    return JSON.parse(match[0]);
  }
}

function normalizeUnderstanding(value, parsed, fileName, lang) {
  const isEn = lang === "en";
  const fallback = buildFallbackUnderstanding(parsed, fileName, lang);
  const rawDirections = Array.isArray(value?.actionableDirections)
    ? value.actionableDirections
    : fallback.actionableDirections;
  const directions = ensureDirectionCount(rawDirections, fallback.actionableDirections, lang);

  return {
    summary: stringOr(value?.summary, fallback.summary),
    abstract: stringOr(value?.abstract, fallback.abstract),
    keyPhrases: normalizeStringArray(value?.keyPhrases, parsed.keyPhrases || [], MAX_KEY_PHRASES),
    structure: {
      totalPages: parsed.totalPages,
      outline: normalizeStringArray(value?.structure?.outline, fallback.structure.outline, 12),
      sections: Array.isArray(value?.structure?.sections)
        ? value.structure.sections.slice(0, 16).map((section, idx) => ({
            title: stringOr(section?.title, isEn ? `Section ${idx + 1}` : `章节 ${idx + 1}`).slice(0, 60),
            pageRange: stringOr(section?.pageRange, "").slice(0, 30),
            summary: stringOr(section?.summary, "").slice(0, 260)
          }))
        : fallback.structure.sections
    },
    keyMaterials: {
      images: normalizeImages(value?.keyMaterials?.images, fallback.keyMaterials.images),
      tables: normalizeTables(value?.keyMaterials?.tables, fallback.keyMaterials.tables),
      charts: normalizeCharts(value?.keyMaterials?.charts, fallback.keyMaterials.charts)
    },
    actionableDirections: directions.slice(0, 8).map((direction, index) => ({
      id: `dir-${index + 1}`,
      type: DIRECTION_TYPES.has(direction?.type) ? direction.type : "research",
      title: stringOr(direction?.title, isEn ? `Direction ${index + 1}` : `方向 ${index + 1}`).slice(0, 28),
      description: stringOr(direction?.description, "").slice(0, 360),
      rationale: stringOr(direction?.rationale, "").slice(0, 180)
    }))
  };
}

function buildFallbackUnderstanding(parsed, fileName, lang) {
  const isEn = lang === "en";
  const totalImages = parsed.pages.reduce((sum, p) => sum + (p.images?.length || 0), 0);
  const totalTables = parsed.pages.reduce((sum, p) => sum + (p.tables?.length || 0), 0);
  const keyPhrases = (parsed.keyPhrases || []).slice(0, MAX_KEY_PHRASES);
  const title = fileName || (isEn ? "this file" : "这份文件");
  const preview = parsed.allText?.slice(0, 320) || "";

  const baseDirections = [
    {
      type: "research",
      title: isEn ? "Research key topics" : "研究关键主题",
      description: isEn
        ? `Investigate the main topics in ${title}, collect reliable references, and turn the findings into evidence cards.`
        : `围绕《${title}》中的关键主题进行资料检索，收集可靠来源，并把发现整理成证据卡片。`,
      rationale: isEn ? "The document contains topics worth expanding." : "文件中有值得继续发散的主题。"
    },
    {
      type: "report-structure",
      title: isEn ? "Build a report outline" : "生成汇报结构",
      description: isEn
        ? `Convert the ${parsed.totalPages}-page file into a clear presentation or report outline with sections, supporting materials, and takeaways.`
        : `将这份 ${parsed.totalPages} 页/张的文件转成清晰的汇报结构，包含章节、支撑素材和结论。`,
      rationale: isEn ? "A structured outline makes the content easier to present." : "结构化大纲更适合展示和复用。"
    },
    {
      type: "task-plan",
      title: isEn ? "Turn into tasks" : "拆成任务计划",
      description: isEn
        ? "Extract goals, constraints, dependencies, and next actions so the file can become an executable plan."
        : "提取目标、约束、依赖和下一步动作，把文件内容变成可执行计划。",
      rationale: isEn ? "Many files contain implicit work plans." : "很多文件里包含隐含的执行任务。"
    },
    {
      type: "web-analysis",
      title: isEn ? "Check online context" : "联网补充背景",
      description: isEn
        ? "Search for recent related web sources, compare them with the file, and identify missing context or updates."
        : "搜索近期相关网页资料，与文件内容对照，补充缺失背景和最新进展。",
      rationale: isEn ? "External context can reveal gaps and updates." : "联网资料可以补足文件未覆盖的信息。"
    },
    {
      type: "material-collection",
      title: isEn ? "Collect supporting assets" : "收集支撑素材",
      description: isEn
        ? "Collect images, papers, links, datasets, or examples that can support the next stage of work."
        : "收集图片、论文、链接、数据集或案例，为下一步工作提供素材支撑。",
      rationale: isEn ? "Good materials make follow-up generation more grounded." : "素材越充分，后续生成越可靠。"
    }
  ];

  if (totalImages > 0 || looksVisual(parsed.allText)) {
    baseDirections.push({
      type: "image-generation",
      title: isEn ? "Generate visual directions" : "生成视觉方向",
      description: isEn
        ? `Use the visual clues in ${title} to create several image-generation directions with distinct style, scene, and composition choices.`
        : `基于《${title}》中的视觉线索，生成多个成图方向，覆盖不同风格、场景和构图。`,
      rationale: isEn ? "The file contains visual material or visual intent." : "文件包含视觉素材或视觉意图。"
    });
  }

  if (totalTables > 0) {
    baseDirections.push({
      type: "task-plan",
      title: isEn ? "Analyze table data" : "分析表格数据",
      description: isEn
        ? `Review the ${totalTables} detected table(s), extract patterns, and turn important findings into canvas cards.`
        : `分析检测到的 ${totalTables} 个表格，提取模式，并将重要发现转成画布卡片。`,
      rationale: isEn ? "Tables often contain structured evidence." : "表格常常包含结构化证据。"
    });
  }

  return {
    ok: true,
    summary: isEn
      ? `${parsed.type.toUpperCase()} file with ${parsed.totalPages} page(s), ${totalImages} image(s), and ${totalTables} table(s).`
      : `${parsed.type.toUpperCase()} 文件，共 ${parsed.totalPages} 页/张，检测到 ${totalImages} 个图片素材、${totalTables} 个表格。`,
    abstract: preview || (isEn ? "No extractable text was found." : "未提取到可读文本。"),
    keyPhrases,
    structure: {
      totalPages: parsed.totalPages,
      outline: keyPhrases,
      sections: parsed.pages.slice(0, 8).map((page) => ({
        title: isEn ? `Page/slide ${page.pageNumber}` : `第 ${page.pageNumber} 页/张`,
        pageRange: `${page.pageNumber}`,
        summary: page.text.slice(0, 180)
      }))
    },
    keyMaterials: {
      images: parsed.pages.flatMap((page) =>
        (page.images || []).map((img, idx) => ({
          description: img.name || `${isEn ? "Image" : "图片"} ${idx + 1}`,
          page: page.pageNumber,
          relevance: "medium"
        }))
      ).slice(0, 12),
      tables: parsed.pages.flatMap((page) =>
        (page.tables || []).map((table, idx) => ({
          description: `${isEn ? "Table" : "表格"} ${idx + 1} (${table.rowCount}x${table.colCount})`,
          page: page.pageNumber,
          rowCount: table.rowCount,
          colCount: table.colCount
        }))
      ).slice(0, 12),
      charts: []
    },
    actionableDirections: ensureDirectionCount(baseDirections, baseDirections, lang),
    isScanned: parsed.isScanned,
    metadata: { ...(parsed.metadata || {}), keyPhrases },
    rawParsed: parsed
  };
}

function ensureDirectionCount(raw, fallback, lang) {
  const isEn = lang === "en";
  const directions = Array.isArray(raw) ? raw.filter(Boolean) : [];
  const supplement = Array.isArray(fallback) ? fallback.filter(Boolean) : [];
  const merged = [];
  const seen = new Set();
  const pushUnique = (item) => {
    const key = `${item?.type || ""}:${String(item?.title || "").trim().toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(item);
  };
  for (const item of [...directions, ...supplement]) pushUnique(item);
  const defaults = [
    {
      type: "research",
      title: isEn ? "Explore references" : "扩展参考资料",
      description: isEn ? "Collect reliable external references for the file topic." : "为文件主题收集可靠外部参考资料。",
      rationale: isEn ? "References improve grounding." : "参考资料能提升可靠性。"
    },
    {
      type: "material-collection",
      title: isEn ? "Gather examples" : "收集案例素材",
      description: isEn ? "Gather relevant examples, images, or documents for the next step." : "收集相关案例、图片或文档，供下一步使用。",
      rationale: isEn ? "Examples make output more concrete." : "案例能让输出更具体。"
    }
  ];
  let guard = 0;
  while (merged.length < 5 && guard < 12) {
    const base = defaults[guard % defaults.length];
    pushUnique({ ...base, title: `${base.title} ${guard + 1}` });
    guard++;
  }
  return merged.slice(0, 8);
}

function normalizeStringArray(value, fallback, max) {
  const source = Array.isArray(value) && value.length ? value : fallback;
  return (Array.isArray(source) ? source : [])
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, max);
}

function normalizeImages(value, fallback) {
  const source = Array.isArray(value) ? value : fallback;
  return (source || []).slice(0, 12).map((img, idx) => ({
    description: stringOr(img?.description, `Image ${idx + 1}`).slice(0, 160),
    page: Number(img?.page) || 1,
    relevance: ["high", "medium", "low"].includes(img?.relevance) ? img.relevance : "medium"
  }));
}

function normalizeTables(value, fallback) {
  const source = Array.isArray(value) ? value : fallback;
  return (source || []).slice(0, 12).map((table, idx) => ({
    description: stringOr(table?.description, `Table ${idx + 1}`).slice(0, 160),
    page: Number(table?.page) || 1,
    rowCount: Number(table?.rowCount) || 0,
    colCount: Number(table?.colCount) || 0
  }));
}

function normalizeCharts(value, fallback) {
  const source = Array.isArray(value) ? value : fallback;
  return (source || []).slice(0, 12).map((chart, idx) => ({
    description: stringOr(chart?.description, `Chart ${idx + 1}`).slice(0, 160),
    page: Number(chart?.page) || 1
  }));
}

function looksVisual(text) {
  return /image|photo|figure|visual|poster|render|design|illustration|图片|照片|图像|视觉|设计|海报|渲染|成图/.test(String(text || ""));
}

function stringOr(value, fallback) {
  if (typeof value === "string" && value.trim()) return value.trim();
  return fallback;
}
