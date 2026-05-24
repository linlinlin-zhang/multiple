/**
 * File understanding service.
 *
 * It turns parsed documents into a "file understanding card": summary,
 * structure, key materials, and follow-up directions. The LLM path is used
 * when an analysis key is configured; otherwise the parser-derived fallback
 * still returns a useful card.
 */

import { parseFileStructured } from "./fileParser.js";
import { CONTEXT_BOUNDARY_DIRECTIVES, jsonSchemaContract, xmlBlock } from "../prompts/shared.js";

const API_TIMEOUT_MS = 120000;
const MAX_PAGES_FOR_PROMPT = 6;
const MAX_CHARS_PER_PAGE_IN_PROMPT = 900;
const MAX_KEY_PHRASES = 12;
const MAX_PREVIEW_PAGES = 24;
const MAX_CANVAS_CARDS = 12;

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
  const initialParsed = await parseFileStructured(buffer, ext);
  const ocr = await maybeRunOcr(initialParsed, buffer, ext, { ...options, fileName });
  const parsed = ocr.parsed || initialParsed;

  if (parsed.isScanned) {
    return enrichUnderstanding(buildScannedUnderstanding(parsed, fileName, lang), parsed, fileName, lang, ocr);
  }

  const apiKey = options.apiKey || process.env.ANALYSIS_API_KEY || process.env.DASHSCOPE_API_KEY || "";
  const baseUrl = options.baseUrl || process.env.ANALYSIS_API_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1";
  const model = options.model || process.env.ANALYSIS_MODEL || "qwen3.6-plus";

  if (!apiKey) {
    return enrichUnderstanding(buildFallbackUnderstanding(parsed, fileName, lang), parsed, fileName, lang, ocr);
  }

  try {
    const prompt = buildUnderstandingPrompt(parsed, fileName, lang);
    const response = await callLlm(apiKey, baseUrl, model, prompt);
    const content = collectChatContent(response);
    const parsedJson = parseJsonFromText(content);
    const normalized = normalizeUnderstanding(parsedJson, parsed, fileName, lang);
    const enriched = enrichUnderstanding(normalized, parsed, fileName, lang, ocr);
    return {
      ...enriched,
      ok: true,
      isScanned: false,
      metadata: { ...(enriched.metadata || {}), ...(parsed.metadata || {}), keyPhrases: parsed.keyPhrases || [] },
      rawParsed: parsed
    };
  } catch (error) {
    console.error("[buildFileUnderstanding] LLM failed:", error.message);
    return {
      ...enrichUnderstanding(buildFallbackUnderstanding(parsed, fileName, lang), parsed, fileName, lang, ocr),
      _llmError: error.message
    };
  }
}

export async function answerFileQuestion(buffer, fileName, ext, question, options = {}) {
  const lang = options.lang === "en" ? "en" : "zh";
  const parsed = await parseFileStructured(buffer, ext);
  const pages = selectQuestionPages(parsed, question, 5);
  const citations = pages.map((page) => ({
    page: page.pageNumber,
    label: pageLabel(parsed.type, page.pageNumber, lang),
    quote: citeQuote(page.text, question)
  })).filter((citation) => citation.quote);
  const apiKey = options.apiKey || process.env.ANALYSIS_API_KEY || process.env.DASHSCOPE_API_KEY || "";
  const baseUrl = options.baseUrl || process.env.ANALYSIS_API_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1";
  const model = options.model || process.env.ANALYSIS_MODEL || "qwen3.6-plus";

  if (apiKey && pages.length) {
    try {
      const prompt = buildQaPrompt({ parsed, fileName, question, pages, lang });
      const response = await callLlm(apiKey, baseUrl, model, prompt);
      const content = collectChatContent(response).trim();
      if (content) {
        return {
          ok: true,
          answer: content,
          citations,
          pages: pages.map((page) => page.pageNumber),
          model: response?.model || model
        };
      }
    } catch (error) {
      console.error("[answerFileQuestion] LLM failed:", error.message);
    }
  }

  const isEn = lang === "en";
  const snippets = citations.length
    ? citations.map((citation) => `${citation.label}: ${citation.quote}`).join("\n")
    : pages.map((page) => `${pageLabel(parsed.type, page.pageNumber, lang)}: ${page.text.slice(0, 360)}`).join("\n");
  return {
    ok: true,
    answer: snippets
      ? (isEn
          ? `I found the most relevant passages below. Use the page citations to verify the answer.\n\n${snippets}`
          : `我找到了最相关的页内片段，可根据页码引用核对答案。\n\n${snippets}`)
      : (isEn ? "I could not find enough readable text in this file to answer confidently." : "这份文件中没有足够可读文本，暂时无法可靠回答。"),
    citations,
    pages: pages.map((page) => page.pageNumber),
    model: "local-page-retrieval"
  };
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
    ? [
        "You are a document intelligence engine for a visual AI canvas. Analyze uploaded files and return a compact file-understanding card.",
        CONTEXT_BOUNDARY_DIRECTIVES.en
      ].join("\n\n")
    : [
        "你是服务于可视化 AI 画布的文档理解引擎。请分析上传文件，并生成可被画布继续操作的文件理解卡。",
        CONTEXT_BOUNDARY_DIRECTIVES.zh
      ].join("\n\n");

  const user = isEn
    ? [
        `File name: ${fileName || "(unnamed)"}`,
        `Type: ${parsed.type}`,
        `Pages/slides: ${parsed.totalPages}`,
        `Detected images: ${totalImages}`,
        `Detected tables: ${totalTables}`,
        `Detected key phrases: ${phrases || "(none)"}`,
        "",
        jsonSchemaContract("en", schema),
        "",
        "Requirements:",
        "- Provide 5 to 8 actionableDirections. Pick the count based on document complexity.",
        "- Do not limit directions to image generation. Include research, task planning, report structure, web analysis, or material collection when the document calls for them.",
        "- Ground every direction in the document content.",
        "- Use concise titles that can fit in a canvas card.",
        "- Do not include Markdown fences.",
        "",
        xmlBlock("document_preview", pagePreviews || "(no extractable text)", { trusted: "false" })
      ].join("\n")
    : [
        `文件名：${fileName || "未命名文件"}`,
        `类型：${parsed.type}`,
        `页数/幻灯片数：${parsed.totalPages}`,
        `检测到图片：${totalImages}`,
        `检测到表格：${totalTables}`,
        `检测到关键词：${phrases || "无"}`,
        "",
        jsonSchemaContract("zh", schema),
        "",
        "要求：",
        "- actionableDirections 返回 5 到 8 个方向，数量由文档复杂度决定。",
        "- 方向不能只做成图，也可以是研究、任务计划、网页分析、汇报结构、素材收集。",
        "- 每个方向都必须基于文档实际内容。",
        "- 标题要短，适合显示在画布卡片上。",
        "- 不要输出暴力、色情、仇恨或侵犯隐私的内容。",
        "",
        xmlBlock("document_preview", pagePreviews || "未提取到可读文本", { trusted: "false" })
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

function enrichUnderstanding(base, parsed, fileName, lang, ocr = {}) {
  const metadata = {
    ...(base.metadata || {}),
    ...(parsed.metadata || {}),
    keyPhrases: base.keyPhrases || base.metadata?.keyPhrases || parsed.keyPhrases || [],
    documentPreview: buildDocumentPreview(parsed, lang, ocr),
    qaHints: buildQaHints(parsed, fileName, lang),
    ocr: normalizeOcrStatus(ocr)
  };
  const canvasCards = buildCanvasCards(parsed, base, fileName, lang);
  return {
    ...base,
    documentPreview: metadata.documentPreview,
    canvasCards,
    canvasLinks: buildCanvasLinks(canvasCards),
    qaHints: metadata.qaHints,
    metadata
  };
}

function buildDocumentPreview(parsed, lang, ocr = {}) {
  const pages = (parsed.pages || []).slice(0, MAX_PREVIEW_PAGES).map((page) => {
    const title = inferPageTitle(page, parsed.type, lang);
    return {
      pageNumber: page.pageNumber,
      label: pageLabel(parsed.type, page.pageNumber, lang),
      title,
      excerpt: String(page.text || "").replace(/\s+/g, " ").slice(0, 420),
      wordCount: page.wordCount || 0,
      imageCount: page.images?.length || 0,
      tableCount: page.tables?.length || 0,
      tables: (page.tables || []).slice(0, 3).map((table, index) => ({
        index,
        rowCount: table.rowCount || 0,
        colCount: table.colCount || 0,
        preview: (table.cells || []).slice(0, 4).map((row) => row.slice(0, 5))
      }))
    };
  });
  return {
    type: parsed.type,
    totalPages: parsed.totalPages || pages.length || 1,
    isScanned: Boolean(parsed.isScanned),
    truncated: (parsed.pages || []).length > pages.length,
    ocr: normalizeOcrStatus(ocr),
    pages
  };
}

function buildCanvasCards(parsed, understanding, fileName, lang) {
  const isEn = lang === "en";
  const title = fileName || (isEn ? "Document" : "文档");
  const cards = [];
  const safeTitle = title.replace(/\.[^.]+$/, "");
  const summaryText = [
    `# ${safeTitle}`,
    "",
    understanding.abstract || understanding.summary || "",
    "",
    (understanding.keyPhrases || parsed.keyPhrases || []).length
      ? `## ${isEn ? "Key phrases" : "关键词"}\n\n${(understanding.keyPhrases || parsed.keyPhrases || []).slice(0, 12).map((item) => `- ${item}`).join("\n")}`
      : "",
    buildPageCitationList(parsed, lang)
  ].filter(Boolean).join("\n\n");
  cards.push({
    id: "file-summary",
    type: "create_note",
    nodeType: "note",
    title: isEn ? "Document summary" : "文档摘要",
    description: understanding.summary || "",
    prompt: summaryText,
    content: { text: summaryText },
    pageRange: parsed.totalPages > 1 ? `1-${parsed.totalPages}` : "1"
  });

  const sections = Array.isArray(understanding.structure?.sections) ? understanding.structure.sections : [];
  if (sections.length) {
    cards.push({
      id: "file-outline",
      type: "create_timeline",
      nodeType: "timeline",
      title: isEn ? "Document outline" : "文档目录",
      description: isEn ? "Page-aware structure extracted from the file." : "从文件中提取的带页码结构。",
      prompt: sections.map((section) => `${section.pageRange || ""} ${section.title}: ${section.summary || ""}`).join("\n"),
      content: {
        items: sections.slice(0, 16).map((section) => ({
          time: section.pageRange ? `${isEn ? "p." : "第"} ${section.pageRange}` : "",
          title: section.title,
          description: section.summary
        }))
      }
    });
  }

  const tableEntries = [];
  for (const page of parsed.pages || []) {
    for (const [index, table] of (page.tables || []).entries()) {
      tableEntries.push({ page, table, index });
    }
  }
  for (const entry of tableEntries.slice(0, 4)) {
    const columns = inferTableColumns(entry.table);
    const rows = tableRowsAsObjects(entry.table, columns).slice(0, 12);
    cards.push({
      id: `file-table-${entry.page.pageNumber}-${entry.index + 1}`,
      type: "create_table",
      nodeType: "table",
      title: isEn ? `Table p.${entry.page.pageNumber}` : `第 ${entry.page.pageNumber} 页表格`,
      description: isEn
        ? `Detected table with ${entry.table.rowCount || 0} rows and ${entry.table.colCount || 0} columns.`
        : `检测到 ${entry.table.rowCount || 0} 行 ${entry.table.colCount || 0} 列的表格。`,
      prompt: `${pageLabel(parsed.type, entry.page.pageNumber, lang)} table ${entry.index + 1}`,
      content: {
        columns,
        rows,
        caption: isEn ? `Extracted from page ${entry.page.pageNumber}` : `提取自第 ${entry.page.pageNumber} 页`
      },
      pageRange: String(entry.page.pageNumber)
    });
  }

  const images = parsed.pages.flatMap((page) => (page.images || []).map((image, index) => ({ page, image, index })));
  if (images.length) {
    const text = images.slice(0, 16).map((item) => {
      const name = item.image?.name || `${isEn ? "Image" : "图片"} ${item.index + 1}`;
      return `- ${pageLabel(parsed.type, item.page.pageNumber, lang)}: ${name}`;
    }).join("\n");
    cards.push({
      id: "file-images",
      type: "create_note",
      nodeType: "note",
      title: isEn ? "Image inventory" : "图片素材清单",
      description: isEn ? `${images.length} embedded image(s) detected.` : `检测到 ${images.length} 个内嵌图片素材。`,
      prompt: text,
      content: { text },
      pageRange: images.length ? `${images[0].page.pageNumber}` : ""
    });
  }

  if (parsed.isScanned) {
    cards.push({
      id: "file-ocr-needed",
      type: "create_todo",
      nodeType: "todo",
      title: isEn ? "OCR checklist" : "OCR 处理清单",
      description: isEn ? "The file needs OCR before detailed analysis." : "该文件需要 OCR 后才能进行详细理解。",
      prompt: "",
      content: {
        items: [
          { text: isEn ? "Run OCR on the scanned pages" : "对扫描页执行 OCR", done: false, priority: "high" },
          { text: isEn ? "Review page previews and mark important pages" : "检查分页预览并标记重点页", done: false, priority: "medium" },
          { text: isEn ? "Re-run document understanding after OCR" : "OCR 后重新执行文档理解", done: false, priority: "medium" }
        ]
      }
    });
  }

  return cards.slice(0, MAX_CANVAS_CARDS);
}

function buildCanvasLinks(cards) {
  return cards.slice(1).map((card) => ({ from: "file-summary", to: card.id, label: card.pageRange || "" }));
}

function buildQaHints(parsed, fileName, lang) {
  const isEn = lang === "en";
  const phrases = parsed.keyPhrases || [];
  const subject = phrases[0] || fileName?.replace(/\.[^.]+$/, "") || (isEn ? "this file" : "这份文件");
  return {
    supported: !parsed.isScanned && Boolean(parsed.allText),
    citationStyle: isEn ? "page" : "页码",
    suggestedQuestions: isEn
      ? [
          `What is the main argument of ${subject}?`,
          "Which pages contain tables or evidence?",
          "What are the next actions implied by this file?"
        ]
      : [
          `${subject} 的核心观点是什么？`,
          "哪些页包含表格或关键证据？",
          "这份文件隐含了哪些下一步行动？"
        ]
  };
}

async function maybeRunOcr(parsed, buffer, ext, options = {}) {
  if (!parsed?.isScanned) return { status: "not_needed", provider: "", message: "" };
  const endpoint = options.ocrEndpoint || process.env.OCR_API_BASE_URL || process.env.OCR_ENDPOINT || "";
  const apiKey = options.ocrApiKey || process.env.OCR_API_KEY || process.env.DASHSCOPE_API_KEY || "";
  if (!endpoint || options.enableOcr === false) {
    return {
      status: "not_configured",
      provider: endpoint ? "generic" : "",
      message: "OCR endpoint is not configured."
    };
  }
  try {
    const response = await callOcrProvider({
      endpoint,
      apiKey,
      model: options.ocrModel || process.env.OCR_MODEL || "",
      buffer,
      ext,
      fileName: options.fileName || ""
    });
    const pages = normalizeOcrPages(response, parsed.totalPages);
    const textLength = pages.reduce((sum, page) => sum + page.text.length, 0);
    if (!textLength) {
      return { status: "empty", provider: endpoint, message: "OCR returned no text." };
    }
    const ocrParsed = {
      ...parsed,
      isScanned: false,
      pages: pages.map((page, index) => ({
        pageNumber: page.pageNumber || index + 1,
        text: page.text,
        wordCount: countWordsLocal(page.text),
        images: parsed.pages?.[index]?.images || [],
        tables: parsed.pages?.[index]?.tables || []
      })),
      allText: pages.map((page) => page.text).join("\n"),
      keyPhrases: extractLocalKeyPhrases(pages.map((page) => page.text).join("\n"))
    };
    return { status: "complete", provider: endpoint, message: "", parsed: ocrParsed };
  } catch (error) {
    return {
      status: "failed",
      provider: endpoint,
      message: error.message || "OCR failed."
    };
  }
}

async function callOcrProvider({ endpoint, apiKey, model, buffer, ext, fileName }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: model || undefined,
        fileName,
        fileType: ext,
        data: buffer.toString("base64")
      }),
      signal: controller.signal
    });
    const text = await response.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = { text };
    }
    if (!response.ok) {
      throw new Error(json?.error?.message || text || response.statusText);
    }
    return json;
  } finally {
    clearTimeout(timer);
  }
}

function normalizeOcrPages(response, totalPages = 1) {
  if (Array.isArray(response?.pages)) {
    return response.pages.map((page, index) => ({
      pageNumber: Number(page.pageNumber || page.page || index + 1),
      text: String(page.text || page.content || "").trim()
    })).filter((page) => page.text);
  }
  const text = String(response?.text || response?.content || response?.result || "").trim();
  if (!text) return [];
  const chunks = text.split(/\n\s*(?:---+\s*)?page\s+\d+\s*(?:---+)?\n/i).filter(Boolean);
  if (chunks.length > 1) {
    return chunks.map((chunk, index) => ({ pageNumber: index + 1, text: chunk.trim() }));
  }
  return [{ pageNumber: 1, text: text.slice(0, Math.max(text.length, totalPages * 800)) }];
}

function normalizeOcrStatus(ocr = {}) {
  return {
    status: ocr.status || "unknown",
    provider: ocr.provider || "",
    message: ocr.message || ""
  };
}

function pageLabel(type, pageNumber, lang) {
  if (lang === "en") return type === "pptx" || type === "ppt" ? `Slide ${pageNumber}` : `Page ${pageNumber}`;
  return type === "pptx" || type === "ppt" ? `第 ${pageNumber} 张` : `第 ${pageNumber} 页`;
}

function inferPageTitle(page, type, lang) {
  const text = String(page?.text || "").trim();
  const firstLine = text.split(/\n+/).map((line) => line.trim()).find(Boolean);
  if (firstLine) return firstLine.slice(0, 80);
  return pageLabel(type, page?.pageNumber || 1, lang);
}

function buildPageCitationList(parsed, lang) {
  const usefulPages = (parsed.pages || []).filter((page) => page.text).slice(0, 10);
  if (!usefulPages.length) return "";
  const title = lang === "en" ? "## Page citations" : "## 页码引用";
  return [
    title,
    "",
    ...usefulPages.map((page) => `- ${pageLabel(parsed.type, page.pageNumber, lang)}: ${String(page.text || "").replace(/\s+/g, " ").slice(0, 160)}`)
  ].join("\n");
}

function inferTableColumns(table) {
  const cells = Array.isArray(table?.cells) ? table.cells : [];
  const first = cells[0] || [];
  const count = Math.max(table?.colCount || 0, first.length, 1);
  return Array.from({ length: count }, (_, index) => String(first[index] || `Column ${index + 1}`).slice(0, 48));
}

function tableRowsAsObjects(table, columns) {
  const cells = Array.isArray(table?.cells) ? table.cells : [];
  const rows = cells.length > 1 ? cells.slice(1) : cells;
  return rows.map((row) => {
    const obj = {};
    columns.forEach((column, index) => {
      obj[column] = String(row[index] || "");
    });
    return obj;
  });
}

function selectQuestionPages(parsed, question, maxPages = 5) {
  const queryTokens = tokenizeForSearch(question);
  const pages = (parsed.pages || []).filter((page) => page.text);
  const scored = pages.map((page) => {
    const text = String(page.text || "").toLowerCase();
    let score = 0;
    for (const token of queryTokens) {
      if (text.includes(token)) score += token.length > 2 ? 3 : 1;
    }
    if (!score && queryTokens.length) score = overlapScore(text, queryTokens);
    return { page, score };
  }).sort((a, b) => b.score - a.score || a.page.pageNumber - b.page.pageNumber);
  const selected = scored.filter((item) => item.score > 0).slice(0, maxPages).map((item) => item.page);
  return selected.length ? selected : pages.slice(0, maxPages);
}

function tokenizeForSearch(text) {
  const raw = String(text || "").toLowerCase();
  const en = raw.match(/[a-z0-9]{2,}/g) || [];
  const zh = raw.match(/[\u4e00-\u9fff]{2,4}/g) || [];
  return Array.from(new Set([...en, ...zh])).slice(0, 24);
}

function overlapScore(text, tokens) {
  let score = 0;
  for (const token of tokens) {
    if (text.includes(token.slice(0, 2))) score += 1;
  }
  return score;
}

function citeQuote(text, question) {
  const sentences = String(text || "").split(/(?<=[。！？.!?])\s+|\n+/).map((item) => item.trim()).filter(Boolean);
  const tokens = tokenizeForSearch(question);
  const best = sentences
    .map((sentence) => ({ sentence, score: overlapScore(sentence.toLowerCase(), tokens) }))
    .sort((a, b) => b.score - a.score || b.sentence.length - a.sentence.length)[0];
  return (best?.sentence || sentences[0] || String(text || "")).slice(0, 360);
}

function buildQaPrompt({ parsed, fileName, question, pages, lang }) {
  const isEn = lang === "en";
  const context = pages.map((page) => {
    return `${pageLabel(parsed.type, page.pageNumber, lang)}\n${String(page.text || "").slice(0, 1800)}`;
  }).join("\n\n---\n\n");
  return {
    system: isEn
      ? "Answer questions about a document. Use only the provided page excerpts. Include page citations like [Page 2]."
      : "请回答关于文档的问题。只能使用提供的页内摘录，并用类似 [第 2 页] 的格式标注页码引用。",
    user: [
      isEn ? `File: ${fileName || "document"}` : `文件：${fileName || "文档"}`,
      isEn ? `Question: ${question}` : `问题：${question}`,
      "",
      xmlBlock("page_excerpts", context || "(no readable text)", { trusted: "false" })
    ].join("\n")
  };
}

function countWordsLocal(text) {
  if (!text) return 0;
  const cjk = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const latin = (text.match(/[a-zA-Z0-9_]+/g) || []).length;
  return cjk + latin;
}

function extractLocalKeyPhrases(text, max = MAX_KEY_PHRASES) {
  const cleaned = String(text || "").toLowerCase();
  const phrases = [
    ...(cleaned.match(/[\u4e00-\u9fff]{2,4}/g) || []),
    ...(cleaned.match(/[a-z]{3,}(?:\s+[a-z]{3,})?/g) || [])
  ];
  const counts = new Map();
  for (const phrase of phrases) counts.set(phrase, (counts.get(phrase) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([phrase]) => phrase).slice(0, max);
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
