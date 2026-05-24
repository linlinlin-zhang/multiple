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
const MAX_VIDEO_FRAMES = 8;
const MAX_VIDEO_SCENES = 12;
const VIDEO_EXTENSIONS = new Set(["mp4", "webm", "mov", "m4v"]);

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
  if (isVideoExtension(ext) || options.videoMetadata?.type === "video") {
    return buildVideoUnderstanding(buffer, fileName, ext, { ...options, lang });
  }

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

async function buildVideoUnderstanding(buffer, fileName, ext, options = {}) {
  const lang = options.lang === "en" ? "en" : "zh";
  const metadata = normalizeVideoMetadata(options.videoMetadata || {}, buffer, ext);
  const frames = normalizeVideoFrames(options.videoFrames || options.keyframes || [], metadata);
  const transcript = normalizeTranscript(options.transcript || options.videoTranscript || "");
  const apiKey = options.apiKey || process.env.ANALYSIS_API_KEY || process.env.DASHSCOPE_API_KEY || "";
  const baseUrl = options.baseUrl || process.env.ANALYSIS_API_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1";
  const model = options.model || process.env.ANALYSIS_MODEL || "qwen3.6-plus";
  let llmValue = null;
  let llmError = "";

  if (apiKey && frames.length) {
    try {
      const response = await callVideoLlm(apiKey, baseUrl, model, {
        fileName,
        metadata,
        frames,
        transcript,
        lang
      });
      llmValue = parseJsonFromText(collectChatContent(response));
    } catch (error) {
      llmError = error.message || "Video understanding LLM failed";
      console.error("[buildVideoUnderstanding] LLM failed:", llmError);
    }
  }

  const normalized = normalizeVideoUnderstanding(llmValue, {
    fileName,
    metadata,
    frames,
    transcript,
    lang
  });
  return llmError ? { ...normalized, _llmError: llmError } : normalized;
}

async function callVideoLlm(apiKey, baseUrl, model, context) {
  const { fileName, metadata, frames, transcript, lang } = context;
  const isEn = lang === "en";
  const system = isEn
    ? [
        "You are a multimedia understanding engine for an AI canvas.",
        "Analyze a short video from sampled key frames and an optional transcript.",
        "Return strict JSON only. Ground each scene in visible details and timestamp evidence.",
        CONTEXT_BOUNDARY_DIRECTIVES.en
      ].join("\n")
    : [
        "你是服务于 AI 画布的多媒体理解引擎。",
        "请根据抽取的关键帧和可选音频转写分析短视频。",
        "只返回严格 JSON。每个镜头都要基于可见画面和时间戳证据。",
        CONTEXT_BOUNDARY_DIRECTIVES.zh
      ].join("\n");
  const schema = [
    "{",
    '  "summary": "one sentence",',
    '  "abstract": "100-200 words / 120-260 Chinese characters",',
    '  "keyPhrases": ["phrase"],',
    '  "scenes": [',
    '    {"start": 0, "end": 4.2, "title": "short scene title", "summary": "what happens", "visualDescription": "visible people/objects/style/composition", "people": ["person"], "objects": ["object"], "actions": ["action"], "transcriptQuote": "optional spoken quote"}',
    "  ],",
    '  "actionableDirections": [',
    '    {"type": "image-generation|research|task-plan|web-analysis|report-structure|material-collection", "title": "short title", "description": "40-80 words", "rationale": "short reason"}',
    "  ]",
    "}"
  ].join("\n");
  const text = isEn
    ? [
        `File name: ${fileName || "(unnamed video)"}`,
        `Duration: ${formatDuration(metadata.durationSeconds)}`,
        `Resolution: ${metadata.width || "?"}x${metadata.height || "?"}`,
        `Sampled key frames: ${frames.length}`,
        transcript ? `Transcript excerpt:\n${transcript.slice(0, 3000)}` : "Transcript excerpt: (none or not available)",
        "",
        jsonSchemaContract("en", schema),
        "",
        "Requirements:",
        "- Build 4 to 8 coherent timeline scenes from the key frames.",
        "- Mention visible people, objects, actions, composition, style, and motion cues when available.",
        "- Keep scene titles short enough for canvas cards.",
        "- Include timestamp-grounded observations; do not invent offscreen events.",
        "- Include directions for storyboard/script rewrite, visual style exploration, evidence review, or production planning when useful.",
        "",
        frames.map((frame, index) => `Frame ${index + 1}: ${frame.timeLabel || formatTimestamp(frame.time)}`).join("\n")
      ].join("\n")
    : [
        `文件名：${fileName || "未命名视频"}`,
        `时长：${formatDuration(metadata.durationSeconds)}`,
        `分辨率：${metadata.width || "?"}x${metadata.height || "?"}`,
        `抽样关键帧：${frames.length}`,
        transcript ? `音频转写摘录：\n${transcript.slice(0, 3000)}` : "音频转写摘录：（无或未识别到）",
        "",
        jsonSchemaContract("zh", schema),
        "",
        "要求：",
        "- 从关键帧中建立 4 到 8 个连贯的时间线镜头。",
        "- 尽量描述可见人物、物体、动作、构图、风格与运动线索。",
        "- 镜头标题要短，适合画布卡片显示。",
        "- 观察必须以时间戳和画面为依据，不要编造画外事件。",
        "- 可加入分镜/脚本改写、视觉风格探索、证据复核、制作计划等后续方向。",
        "",
        frames.map((frame, index) => `关键帧 ${index + 1}：${frame.timeLabel || formatTimestamp(frame.time)}`).join("\n")
      ].join("\n");

  const content = [{ type: "text", text }];
  for (const frame of frames.slice(0, MAX_VIDEO_FRAMES)) {
    if (frame.dataUrl) {
      content.push({ type: "image_url", image_url: { url: frame.dataUrl } });
      content.push({ type: "text", text: `${isEn ? "Timestamp" : "时间戳"}: ${frame.timeLabel || formatTimestamp(frame.time)}` });
    }
  }

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
          { role: "system", content: system },
          { role: "user", content }
        ],
        temperature: 0.2
      }),
      signal: controller.signal
    });
    const body = await response.text();
    let json;
    try {
      json = JSON.parse(body);
    } catch {
      json = { raw: body };
    }
    if (!response.ok) {
      const detail = json?.error?.message || body || response.statusText;
      throw new Error(`LLM API ${response.status}: ${detail}`);
    }
    return json;
  } finally {
    clearTimeout(timer);
  }
}

function normalizeVideoUnderstanding(value, context) {
  const { fileName, metadata, frames, transcript, lang } = context;
  const isEn = lang === "en";
  const safeTitle = (fileName || (isEn ? "Video" : "视频")).replace(/\.[^.]+$/, "");
  const fallbackScenes = buildFallbackVideoScenes(frames, metadata, transcript, lang);
  const rawScenes = Array.isArray(value?.scenes) && value.scenes.length ? value.scenes : fallbackScenes;
  const scenes = normalizeVideoScenes(rawScenes, frames, metadata, lang);
  const keyPhrases = normalizeStringArray(value?.keyPhrases, extractVideoKeyPhrases({ scenes, transcript, fileName, lang }), MAX_KEY_PHRASES);
  const summary = stringOr(value?.summary, isEn
    ? `${safeTitle} is a ${formatDuration(metadata.durationSeconds)} video with ${scenes.length} timestamped scene(s).`
    : `《${safeTitle}》是一段 ${formatDuration(metadata.durationSeconds)} 的视频，已拆解为 ${scenes.length} 个可引用镜头。`);
  const abstract = stringOr(value?.abstract, buildVideoAbstract({ scenes, transcript, metadata, lang }));
  const directions = ensureDirectionCount(
    Array.isArray(value?.actionableDirections) ? value.actionableDirections : [],
    buildVideoFallbackDirections(safeTitle, scenes, transcript, lang),
    lang
  ).slice(0, 8).map((direction, index) => ({
    id: `dir-${index + 1}`,
    type: DIRECTION_TYPES.has(direction?.type) ? direction.type : "research",
    title: stringOr(direction?.title, isEn ? `Direction ${index + 1}` : `方向 ${index + 1}`).slice(0, 28),
    description: stringOr(direction?.description, "").slice(0, 360),
    rationale: stringOr(direction?.rationale, "").slice(0, 180)
  }));
  const structure = {
    totalPages: scenes.length || 1,
    outline: scenes.map((scene) => `${scene.timeLabel} ${scene.title}`).slice(0, 12),
    sections: scenes.map((scene) => ({
      title: scene.title,
      pageRange: scene.timeLabel,
      summary: scene.summary || scene.visualDescription || ""
    }))
  };
  const keyMaterials = {
    images: scenes.map((scene, index) => ({
      description: scene.visualDescription || scene.summary || `${isEn ? "Key frame" : "关键帧"} ${index + 1}`,
      page: index + 1,
      relevance: index < 3 ? "high" : "medium",
      timestamp: scene.timeLabel
    })).slice(0, 12),
    tables: [],
    charts: []
  };
  const videoTimeline = {
    type: "video",
    durationSeconds: metadata.durationSeconds,
    durationLabel: formatDuration(metadata.durationSeconds),
    width: metadata.width || 0,
    height: metadata.height || 0,
    frameCount: frames.length,
    transcript,
    transcriptStatus: transcript ? "complete" : "unavailable",
    scenes
  };
  const documentPreview = buildVideoDocumentPreview(videoTimeline, lang);
  const canvasCards = buildVideoCanvasCards({
    safeTitle,
    summary,
    abstract,
    keyPhrases,
    scenes,
    transcript,
    metadata,
    lang
  });
  const metadataOut = {
    ...(metadata.raw || {}),
    keyPhrases,
    documentPreview,
    videoTimeline,
    canvasCards,
    canvasLinks: buildCanvasLinks(canvasCards),
    qaHints: buildVideoQaHints(scenes, safeTitle, transcript, lang),
    ocr: { status: "not_needed", provider: "", message: "" }
  };
  return {
    ok: true,
    summary,
    abstract,
    keyPhrases,
    structure,
    keyMaterials,
    actionableDirections: directions,
    isScanned: false,
    documentPreview,
    videoTimeline,
    canvasCards,
    canvasLinks: metadataOut.canvasLinks,
    qaHints: metadataOut.qaHints,
    metadata: metadataOut,
    rawParsed: {
      type: "video",
      totalPages: scenes.length || 1,
      pages: scenes.map((scene, index) => ({
        pageNumber: index + 1,
        text: [scene.title, scene.summary, scene.visualDescription, scene.transcriptQuote].filter(Boolean).join("\n"),
        wordCount: countWordsLocal([scene.title, scene.summary, scene.visualDescription, scene.transcriptQuote].filter(Boolean).join(" ")),
        images: scene.frameDataUrl ? [{ name: `${scene.timeLabel} keyframe`, type: "jpg" }] : [],
        tables: []
      })),
      allText: [summary, abstract, transcript, ...scenes.map((scene) => `${scene.timeLabel} ${scene.title} ${scene.summary} ${scene.visualDescription}`)].join("\n"),
      keyPhrases,
      isScanned: false,
      metadata: metadataOut
    }
  };
}

function normalizeVideoMetadata(raw = {}, buffer, ext) {
  const durationSeconds = Math.max(0, coerceNumber(raw.durationSeconds ?? raw.duration, 0));
  return {
    type: "video",
    ext: String(ext || raw.ext || "").replace(/^\./, "").toLowerCase(),
    mimeType: String(raw.mimeType || raw.type || "").slice(0, 80),
    width: Math.max(0, Math.round(coerceNumber(raw.width, 0))),
    height: Math.max(0, Math.round(coerceNumber(raw.height, 0))),
    durationSeconds,
    fileSize: Math.max(0, Math.round(coerceNumber(raw.fileSize ?? raw.size ?? buffer?.length, 0))),
    frameCount: Math.max(0, Math.round(coerceNumber(raw.frameCount, 0))),
    hasAudio: raw.hasAudio === true,
    raw: raw && typeof raw === "object" ? raw : {}
  };
}

function normalizeVideoFrames(rawFrames = [], metadata = {}) {
  const frames = (Array.isArray(rawFrames) ? rawFrames : [])
    .map((frame, index) => {
      const time = Math.max(0, coerceNumber(frame?.time ?? frame?.timestamp ?? frame?.start, 0));
      const dataUrl = typeof frame?.dataUrl === "string" && frame.dataUrl.startsWith("data:image/") ? frame.dataUrl : "";
      return {
        index: index + 1,
        time,
        timeLabel: stringOr(frame?.timeLabel, formatTimestamp(time)),
        width: Math.max(0, Math.round(coerceNumber(frame?.width, 0))),
        height: Math.max(0, Math.round(coerceNumber(frame?.height, 0))),
        dataUrl
      };
    })
    .filter((frame) => frame.dataUrl || Number.isFinite(frame.time))
    .sort((a, b) => a.time - b.time)
    .slice(0, MAX_VIDEO_FRAMES);
  if (!frames.length) {
    const duration = Math.max(1, metadata.durationSeconds || 1);
    return [0, 0.33, 0.66, 0.9].map((ratio, index) => {
      const time = Math.max(0, Math.min(duration, duration * ratio));
      return { index: index + 1, time, timeLabel: formatTimestamp(time), width: metadata.width || 0, height: metadata.height || 0, dataUrl: "" };
    }).slice(0, Math.min(4, MAX_VIDEO_FRAMES));
  }
  return frames;
}

function normalizeTranscript(value) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, 12000);
}

function buildFallbackVideoScenes(frames, metadata, transcript, lang) {
  const isEn = lang === "en";
  const duration = Math.max(metadata.durationSeconds || 0, frames.at(-1)?.time || 0);
  return frames.slice(0, MAX_VIDEO_SCENES).map((frame, index) => {
    const nextFrame = frames[index + 1];
    const end = nextFrame ? Math.max(frame.time, nextFrame.time) : Math.max(frame.time, duration || frame.time + 3);
    return {
      start: frame.time,
      end,
      title: isEn ? `Scene ${index + 1}` : `镜头 ${index + 1}`,
      summary: isEn
        ? "Key frame sampled from the video for visual inspection."
        : "从视频中抽样得到的关键帧，可用于视觉检查和后续创作。",
      visualDescription: isEn
        ? "Awaiting model-level visual description; the key frame remains available as canvas evidence."
        : "等待模型级视觉描述；关键帧已作为画布证据保留。",
      people: [],
      objects: [],
      actions: [],
      transcriptQuote: transcript ? transcript.slice(0, 180) : "",
      frameDataUrl: frame.dataUrl,
      frameWidth: frame.width,
      frameHeight: frame.height
    };
  });
}

function normalizeVideoScenes(rawScenes, frames, metadata, lang) {
  const isEn = lang === "en";
  const duration = Math.max(metadata.durationSeconds || 0, frames.at(-1)?.time || 0);
  const scenes = (Array.isArray(rawScenes) ? rawScenes : []).slice(0, MAX_VIDEO_SCENES).map((scene, index) => {
    const frame = nearestVideoFrame(frames, coerceNumber(scene?.start ?? scene?.time, frames[index]?.time || 0), index);
    const start = clampNumber(coerceNumber(scene?.start ?? scene?.time, frame?.time || 0), 0, duration || Number.MAX_SAFE_INTEGER);
    const defaultEnd = frames[index + 1]?.time ?? (duration || start + 3);
    const end = clampNumber(coerceNumber(scene?.end, defaultEnd), start, duration || Math.max(defaultEnd, start));
    const people = normalizeStringArray(scene?.people, [], 8);
    const objects = normalizeStringArray(scene?.objects, [], 10);
    const actions = normalizeStringArray(scene?.actions, [], 10);
    return {
      index: index + 1,
      start,
      end,
      timeLabel: `${formatTimestamp(start)}${end > start ? `-${formatTimestamp(end)}` : ""}`,
      title: stringOr(scene?.title, isEn ? `Scene ${index + 1}` : `镜头 ${index + 1}`).slice(0, 60),
      summary: stringOr(scene?.summary, scene?.description || "").slice(0, 360),
      visualDescription: stringOr(scene?.visualDescription, scene?.visual || scene?.detail || "").slice(0, 520),
      people,
      objects,
      actions,
      transcriptQuote: stringOr(scene?.transcriptQuote, scene?.quote || "").slice(0, 240),
      frameDataUrl: frame?.dataUrl || "",
      frameWidth: frame?.width || 0,
      frameHeight: frame?.height || 0
    };
  });
  return scenes.length ? scenes : buildFallbackVideoScenes(frames, metadata, "", lang).map((scene, index) => ({
    ...scene,
    index: index + 1,
    timeLabel: `${formatTimestamp(scene.start)}-${formatTimestamp(scene.end)}`
  }));
}

function nearestVideoFrame(frames, targetTime, fallbackIndex = 0) {
  if (!frames.length) return null;
  const sorted = [...frames].sort((a, b) => Math.abs(a.time - targetTime) - Math.abs(b.time - targetTime));
  return sorted[0] || frames[fallbackIndex % frames.length] || frames[0];
}

function buildVideoAbstract({ scenes, transcript, metadata, lang }) {
  const isEn = lang === "en";
  const sceneText = scenes.slice(0, 4).map((scene) => `${scene.timeLabel} ${scene.title}: ${scene.summary || scene.visualDescription}`).join(isEn ? " " : "；");
  const transcriptText = transcript ? (isEn ? ` Transcript is available and can be cited.` : " 已检测到转写文本，可按时间线引用。") : "";
  return isEn
    ? `The video lasts ${formatDuration(metadata.durationSeconds)} and has been segmented into ${scenes.length} key scene(s). ${sceneText}${transcriptText}`.trim()
    : `视频时长 ${formatDuration(metadata.durationSeconds)}，已拆分为 ${scenes.length} 个关键镜头。${sceneText}${transcriptText}`.trim();
}

function extractVideoKeyPhrases({ scenes, transcript, fileName, lang }) {
  const base = [
    fileName?.replace(/\.[^.]+$/, ""),
    ...(lang === "en" ? ["video timeline", "key frames", "storyboard"] : ["视频时间线", "关键帧", "分镜"])
  ].filter(Boolean);
  const sceneWords = scenes.flatMap((scene) => [
    scene.title,
    ...scene.people,
    ...scene.objects,
    ...scene.actions
  ]).filter(Boolean);
  return Array.from(new Set([...base, ...sceneWords, ...extractLocalKeyPhrases(transcript, 4)])).slice(0, MAX_KEY_PHRASES);
}

function buildVideoFallbackDirections(title, scenes, transcript, lang) {
  const isEn = lang === "en";
  return [
    {
      type: "report-structure",
      title: isEn ? "Build shot report" : "生成镜头报告",
      description: isEn
        ? `Turn ${title} into a timestamped shot report with key frames, scene summaries, evidence, and production notes.`
        : `将《${title}》整理为带时间戳的镜头报告，包含关键帧、场景摘要、证据与制作备注。`,
      rationale: isEn ? "A timestamped report makes the video inspectable." : "带时间戳报告能让视频分析可核查。"
    },
    {
      type: "image-generation",
      title: isEn ? "Explore style frames" : "探索风格帧",
      description: isEn
        ? "Use representative key frames to generate visual style directions, posters, storyboard frames, or look-development boards."
        : "基于代表性关键帧生成视觉风格方向、海报、分镜帧或 look-development 风格板。",
      rationale: isEn ? "Key frames are strong seeds for controllable visual generation." : "关键帧很适合作为可控视觉生成的种子。"
    },
    {
      type: "task-plan",
      title: isEn ? "Rewrite scene script" : "改写镜头脚本",
      description: isEn
        ? "Rewrite selected scenes into a short video script with shot descriptions, voiceover, motion cues, and edit notes."
        : "将选定镜头改写成短视频脚本，包含画面描述、旁白、运动线索和剪辑备注。",
      rationale: isEn ? "Timeline scenes map naturally to production tasks." : "时间线镜头可以自然转成制作任务。"
    },
    {
      type: "research",
      title: isEn ? "Research references" : "调研参考案例",
      description: isEn
        ? "Search for comparable references, visual precedents, and storytelling examples that match the video style and intent."
        : "检索相近参考、视觉先例和叙事案例，与视频风格和意图进行对照。",
      rationale: isEn ? "External references improve multimedia interpretation." : "外部参考能增强多媒体理解。"
    },
    {
      type: "material-collection",
      title: isEn ? "Collect production assets" : "收集制作素材",
      description: isEn
        ? "Collect music, images, clips, captions, and design materials needed to expand the video into a richer multimedia piece."
        : "收集音乐、图片、片段、字幕和设计素材，用于把视频扩展成更完整的多媒体作品。",
      rationale: isEn ? "Production assets connect analysis to creation." : "制作素材能把分析转成创作。"
    }
  ];
}

function buildVideoDocumentPreview(videoTimeline, lang) {
  const isEn = lang === "en";
  return {
    type: "video",
    totalPages: videoTimeline.scenes.length || 1,
    totalDuration: videoTimeline.durationSeconds,
    durationLabel: videoTimeline.durationLabel,
    isScanned: false,
    truncated: false,
    ocr: { status: "not_needed", provider: "", message: "" },
    pages: videoTimeline.scenes.slice(0, MAX_PREVIEW_PAGES).map((scene, index) => ({
      pageNumber: index + 1,
      label: scene.timeLabel || formatTimestamp(scene.start),
      title: scene.title,
      excerpt: [scene.summary, scene.visualDescription, scene.transcriptQuote ? `${isEn ? "Transcript" : "转写"}: ${scene.transcriptQuote}` : ""].filter(Boolean).join(" "),
      wordCount: countWordsLocal([scene.summary, scene.visualDescription, scene.transcriptQuote].filter(Boolean).join(" ")),
      imageCount: scene.frameDataUrl ? 1 : 0,
      tableCount: 0,
      timestamp: scene.start,
      frameDataUrl: scene.frameDataUrl || "",
      people: scene.people || [],
      objects: scene.objects || [],
      actions: scene.actions || []
    }))
  };
}

function buildVideoCanvasCards({ safeTitle, summary, abstract, keyPhrases, scenes, transcript, metadata, lang }) {
  const isEn = lang === "en";
  const cards = [];
  const sceneList = scenes.map((scene) => {
    const tags = [
      scene.people?.length ? `${isEn ? "People" : "人物"}: ${scene.people.join(", ")}` : "",
      scene.objects?.length ? `${isEn ? "Objects" : "物体"}: ${scene.objects.join(", ")}` : "",
      scene.actions?.length ? `${isEn ? "Actions" : "动作"}: ${scene.actions.join(", ")}` : ""
    ].filter(Boolean).join(" · ");
    return `- ${scene.timeLabel} ${scene.title}: ${scene.summary || scene.visualDescription}${tags ? ` (${tags})` : ""}`;
  }).join("\n");
  const summaryText = [
    `# ${safeTitle}`,
    "",
    summary,
    "",
    abstract,
    "",
    `## ${isEn ? "Video metadata" : "视频元数据"}`,
    `- ${isEn ? "Duration" : "时长"}: ${formatDuration(metadata.durationSeconds)}`,
    `- ${isEn ? "Resolution" : "分辨率"}: ${metadata.width || "?"}x${metadata.height || "?"}`,
    `- ${isEn ? "Key frames" : "关键帧"}: ${scenes.filter((scene) => scene.frameDataUrl).length}`,
    keyPhrases?.length ? `\n## ${isEn ? "Key phrases" : "关键词"}\n${keyPhrases.map((item) => `- ${item}`).join("\n")}` : "",
    sceneList ? `\n## ${isEn ? "Timestamped scenes" : "时间戳镜头"}\n${sceneList}` : ""
  ].filter(Boolean).join("\n");
  cards.push({
    id: "video-summary",
    type: "create_note",
    nodeType: "note",
    title: isEn ? "Video summary" : "视频摘要",
    description: summary,
    prompt: summaryText,
    content: { text: summaryText },
    pageRange: formatDuration(metadata.durationSeconds)
  });
  cards.push({
    id: "video-timeline",
    type: "create_timeline",
    nodeType: "timeline",
    title: isEn ? "Video timeline" : "视频时间线",
    description: isEn ? "Timestamped key-frame scenes extracted from the video." : "从视频中抽取的带时间戳关键帧镜头。",
    prompt: sceneList,
    content: {
      summary,
      items: scenes.map((scene) => ({
        time: scene.timeLabel,
        title: scene.title,
        description: [scene.summary, scene.visualDescription, scene.transcriptQuote ? `${isEn ? "Transcript" : "转写"}: ${scene.transcriptQuote}` : ""].filter(Boolean).join(" "),
        frameDataUrl: scene.frameDataUrl || "",
        people: scene.people,
        objects: scene.objects,
        actions: scene.actions,
        source: { type: "video", timestamp: scene.start, start: scene.start, end: scene.end, label: scene.timeLabel }
      }))
    },
    pageRange: formatDuration(metadata.durationSeconds)
  });
  const tableRows = scenes.map((scene) => ({
    [isEn ? "Time" : "时间"]: scene.timeLabel,
    [isEn ? "Scene" : "镜头"]: scene.title,
    [isEn ? "People" : "人物"]: scene.people.join(", "),
    [isEn ? "Objects" : "物体"]: scene.objects.join(", "),
    [isEn ? "Actions" : "动作"]: scene.actions.join(", "),
    [isEn ? "Notes" : "备注"]: scene.summary || scene.visualDescription
  }));
  cards.push({
    id: "video-shot-table",
    type: "create_table",
    nodeType: "table",
    title: isEn ? "Shot evidence table" : "镜头证据表",
    description: isEn ? "Structured timestamp evidence for follow-up questions." : "供后续追问使用的结构化时间戳证据。",
    prompt: sceneList,
    content: {
      columns: Object.keys(tableRows[0] || {}),
      rows: tableRows,
      caption: isEn ? "Each row is grounded in a sampled key frame." : "每一行都对应抽样关键帧。"
    },
    pageRange: formatDuration(metadata.durationSeconds)
  });
  if (transcript) {
    cards.push({
      id: "video-transcript",
      type: "create_quote",
      nodeType: "quote",
      title: isEn ? "Audio transcript" : "音频转写",
      description: isEn ? "Recognized speech from the video audio track." : "从视频音轨中识别出的语音文本。",
      prompt: transcript,
      content: {
        quotes: [{ text: transcript.slice(0, 1800), source: isEn ? "Video audio track" : "视频音轨" }]
      },
      pageRange: formatDuration(metadata.durationSeconds)
    });
  }
  cards.push({
    id: "video-style-board",
    type: "create_note",
    nodeType: "note",
    title: isEn ? "Style board prompts" : "视觉风格板提示",
    description: isEn ? "Prompts for turning scenes into style frames or storyboard cards." : "将镜头转成风格帧或分镜卡的提示词。",
    prompt: "",
    content: {
      text: [
        `# ${isEn ? "Style board prompts" : "视觉风格板提示"}`,
        "",
        ...scenes.slice(0, 6).map((scene, index) => {
          const detail = [scene.visualDescription, scene.objects.join(", "), scene.actions.join(", ")].filter(Boolean).join("; ");
          return `${index + 1}. ${scene.timeLabel} ${scene.title}: ${detail || scene.summary}`;
        })
      ].join("\n")
    },
    pageRange: formatDuration(metadata.durationSeconds)
  });
  return cards.slice(0, MAX_CANVAS_CARDS);
}

function buildVideoQaHints(scenes, title, transcript, lang) {
  const isEn = lang === "en";
  const third = scenes[2]?.title || (isEn ? "the third scene" : "第 3 个镜头");
  return {
    supported: true,
    citationStyle: isEn ? "timestamp" : "时间戳",
    suggestedQuestions: isEn
      ? [
          `Rewrite ${third} as a short video script.`,
          "Which timestamp best represents the visual style?",
          transcript ? "Which lines from the transcript should become captions?" : "Create a visual style board from the key frames."
        ]
      : [
          `把「${third}」改写成短视频脚本。`,
          "哪个时间戳最能代表整体视觉风格？",
          transcript ? "转写里哪些句子适合做字幕？" : "基于这些关键帧生成视觉风格板。"
        ]
  };
}

function formatTimestamp(seconds) {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatDuration(seconds) {
  const value = Number(seconds) || 0;
  if (value <= 0) return "unknown";
  return formatTimestamp(value);
}

function isVideoExtension(ext) {
  return VIDEO_EXTENSIONS.has(String(ext || "").toLowerCase().replace(/^\./, ""));
}

function coerceNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clampNumber(value, min, max) {
  return Math.min(Math.max(value, min), max);
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
