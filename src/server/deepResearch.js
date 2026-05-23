import { CONTEXT_BOUNDARY_DIRECTIVES, SOURCE_GROUNDING_DIRECTIVES, xmlBlock } from "../prompts/index.js";
import { cleanInteger, cleanString } from "./modelConfig.js";

export function createDeepResearchRunner({
  runtimeConfigs,
  timeoutMs,
  maxCanvasCards,
  stringOr,
  slug,
  dedupeReferences,
  extractReferencesFromObject,
  extractReferencesFromText
}) {
  function dashScopeNativeGenerationEndpoint(config) {
    const base = String(config.baseUrl || "").replace(/\/+$/, "");
    if (/\/api\/v1\/services\/aigc\/text-generation\/generation$/i.test(base)) return base;
    return `${base || "https://dashscope.aliyuncs.com"}/api/v1/services/aigc/text-generation/generation`;
  }

  function buildDeepResearchPrompt({ prompt, analysis, selectedContext, canvas, messages, lang }) {
    const zh = lang !== "en";
    return [
      zh ? "请以深入研究模式完成用户目标，并在研究过程中尽量给出可复用的网页、图片、文件或行动线索。" : "Complete the user goal in deep research mode and surface reusable web, image, file, or action leads as you work.",
      zh ? "如果用户目标略宽泛，请先做清晰、保守的工作假设并继续推进研究，不要只返回澄清问题。" : "If the user goal is broad, make clear conservative working assumptions and continue the research instead of returning only clarification questions.",
      "",
      zh ? "# 上下文边界" : "# Context Boundaries",
      CONTEXT_BOUNDARY_DIRECTIVES[zh ? "zh" : "en"],
      "",
      zh ? "# 来源依据" : "# Source Grounding",
      SOURCE_GROUNDING_DIRECTIVES[zh ? "zh" : "en"],
      "",
      xmlBlock("user_goal", prompt, { trusted: "true" }),
      "",
      xmlBlock("current_analysis", JSON.stringify(analysis || {}, null, 2).slice(0, 16000), { trusted: "false" }),
      "",
      xmlBlock("selected_card", selectedContext ? JSON.stringify(selectedContext, null, 2).slice(0, 8000) : "None", { trusted: "false" }),
      "",
      xmlBlock("canvas_state", JSON.stringify(canvas || {}, null, 2).slice(0, 32000), { trusted: "false" }),
      "",
      xmlBlock("recent_dialogue", JSON.stringify(messages || [], null, 2).slice(0, 12000), { trusted: "false" })
    ].join("\n");
  }

  function buildDeepResearchPayload(context, includeImage = true) {
    const text = buildDeepResearchPrompt(context);
    const confirmedScope = context.lang === "en"
      ? "Confirmed. Please proceed directly with deep research using the provided canvas context, current file/card context, and the user's latest goal. If scope is broad, make conservative assumptions and include sources where available."
      : "已确认。请直接基于提供的画布上下文、当前文件/卡片上下文和用户最新目标开展深入研究；如果范围偏宽泛，请做清晰保守的工作假设，并尽可能给出来源。";
    const userContent = includeImage && context.imageDataUrl
      ? [{ image: context.imageDataUrl }, { text: confirmedScope }, { text }]
      : `${confirmedScope}\n\n${text}`;
    return {
      model: runtimeConfigs.deepthink.model,
      input: {
        messages: [
          {
            role: "user",
            content: context.prompt
          },
          {
            role: "assistant",
            content: context.lang === "en"
              ? "Which scope, constraints, and output format should I focus on?"
              : "请确认研究范围、约束条件和输出形式。"
          },
          {
            role: "user",
            content: userContent
          }
        ]
      },
      parameters: {
        incremental_output: runtimeConfigs.deepthink.options?.incrementalOutput !== false,
        enable_feedback: false,
        output_format: cleanString(runtimeConfigs.deepthink.options?.outputFormat, 80) || "model_summary_report"
      }
    };
  }

  async function runDashScopeDeepResearch(context, options = {}) {
    let payload = buildDeepResearchPayload(context, true);
    let response;
    try {
      response = await dashScopeNativeGenerationRequest(runtimeConfigs.deepthink, payload, {
        timeoutMs
      });
    } catch (error) {
      if (!context.imageDataUrl || !/image|content|invalid|unsupported|base64/i.test(String(error?.message || ""))) {
        throw error;
      }
      payload = buildDeepResearchPayload(context, false);
      response = await dashScopeNativeGenerationRequest(runtimeConfigs.deepthink, payload, {
        timeoutMs
      });
    }

    const collected = await collectDeepResearchPayload(response, {
      onEvent(event) {
        options.onEvent?.(event);
      }
    });
    return buildDeepResearchResult(collected, context);
  }

  async function dashScopeNativeGenerationRequest(config, payload, options = {}) {
    const requestTimeoutMs = Number(options.timeoutMs || timeoutMs);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), requestTimeoutMs);
    try {
      const response = await fetch(dashScopeNativeGenerationEndpoint(config), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
          "X-DashScope-SSE": "enable",
          Accept: "text/event-stream"
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      if (!response.ok) {
        const detail = await response.text().catch(() => response.statusText);
        throw new Error(`${config.role} API ${response.status}: ${detail || response.statusText}`);
      }
      return response;
    } catch (error) {
      if (error?.name === "AbortError") {
        throw new Error(`${config.role} API timeout after ${Math.round(requestTimeoutMs / 1000)}s`);
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  async function collectDeepResearchPayload(response, options = {}) {
    const result = {
      model: runtimeConfigs.deepthink.model,
      text: "",
      thinkingContent: "",
      events: [],
      references: [],
      rawChunks: []
    };
    if (!response.body) return result;

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    function consumeData(data) {
      if (!data || data === "[DONE]") return;
      let chunk;
      try {
        chunk = JSON.parse(data);
      } catch {
        return;
      }
      result.rawChunks.push(chunk);
      if (chunk?.output?.model || chunk?.model) result.model = chunk.output.model || chunk.model;
      const event = normalizeDeepResearchEvent(chunk);
      if (event.delta) {
        result.thinkingContent += event.delta;
        if (event.isAnswer) result.text += event.delta;
      }
      if (!event.isAnswer && event.delta) {
        result.events.push(event);
        options.onEvent?.(event);
      } else if (event.stage || event.references?.length) {
        result.events.push(event);
        options.onEvent?.(event);
      }
      if (event.references?.length) {
        result.references.push(...event.references);
      }
    }

    while (true) {
      const { value, done } = await reader.read();
      if (value) buffer += decoder.decode(value, { stream: !done });
      const blocks = buffer.split(/\r?\n\r?\n/);
      buffer = blocks.pop() || "";
      for (const block of blocks) {
        const dataLines = block
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trim());
        for (const data of dataLines) consumeData(data);
      }
      if (done) break;
    }

    if (buffer.trim()) {
      const dataLines = buffer
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trim());
      for (const data of dataLines) consumeData(data);
    }

    result.references = dedupeReferences(result.references);
    return result;
  }

  function normalizeDeepResearchEvent(chunk) {
    const output = chunk?.output || chunk || {};
    const message = output?.choices?.[0]?.message || output?.message || {};
    const extra = message?.extra || output?.extra || {};
    const stage = stringOr(
      message.phase || extra.phase || output.phase || output.status || output.event || output.type || output.name || chunk?.event || chunk?.type,
      ""
    );
    const delta = extractDeepResearchText(output);
    const queries = extractDeepResearchQueries({ extra, output, message });
    const query = queries[0] || "";
    const references = dedupeReferences([
      ...extractReferencesFromObject(extra),
      ...extractReferencesFromObject(output),
      ...extractReferencesFromText(delta)
    ]);
    const normalizedStage = stage.toLowerCase();
    const isAnswer = /answer|final|response|summary_report|report/i.test(stage) || Boolean(output.finish_reason);
    return {
      id: chunk?.request_id || chunk?.id || `research-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      stage: stage || (isAnswer ? "answer" : (query ? "search" : "research")),
      title: humanDeepResearchStage(stage || (query ? "search" : "")),
      delta,
      query,
      queries,
      references,
      isAnswer,
      status: /finish|complete|done|success/i.test(normalizedStage) ? "complete" : "running"
    };
  }

  function extractDeepResearchQueries(value) {
    const queries = [];
    walkJson(value, (item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return;
      const direct = item.query || item.search_query || item.searchQuery || item.keyword || item.q;
      if (typeof direct === "string") queries.push(direct);
      const arrays = [item.queries, item.search_queries, item.searchQueries, item.keywords];
      for (const list of arrays) {
        if (!Array.isArray(list)) continue;
        for (const entry of list) {
          if (typeof entry === "string") queries.push(entry);
          else if (entry && typeof entry === "object") {
            const nested = entry.query || entry.search_query || entry.searchQuery || entry.keyword || entry.q;
            if (typeof nested === "string") queries.push(nested);
          }
        }
      }
    });
    return Array.from(new Set(queries.map((query) => query.trim()).filter(Boolean))).slice(0, 8);
  }

  function extractDeepResearchText(output) {
    const message = output?.choices?.[0]?.message || output?.message || {};
    const candidates = [
      message?.content,
      message?.text,
      output?.text,
      output?.answer,
      output?.content,
      output?.summary,
      output?.message?.content,
      output?.choices?.[0]?.message?.content,
      output?.choices?.[0]?.delta?.content
    ];
    for (const candidate of candidates) {
      const text = textFromMixedContent(candidate);
      if (text) return text;
    }
    return "";
  }

  function humanDeepResearchStage(stage) {
    const key = String(stage || "").toLowerCase();
    if (/plan|planning|researchplanning/.test(key)) return "研究规划";
    if (/search|web|source|crawl|retrieve|webresearch/.test(key)) return "检索资料";
    if (/read|context|evidence/.test(key)) return "整理证据";
    if (/answer|report|final/.test(key)) return "生成报告";
    return stage || "深入研究";
  }

  function buildDeepResearchResult(collected, context) {
    const references = dedupeReferences(collected.references);
    const options = runtimeConfigs.deepthink.options || {};
    const sourceCardMode = ["list", "cards", "off"].includes(options.sourceCardMode) ? options.sourceCardMode : "cards";
    const cardLimit = cleanInteger(options.maxCanvasCards, 1, maxCanvasCards, maxCanvasCards);
    const maxReferenceCards = cleanInteger(options.maxReferenceCards, 0, maxCanvasCards, maxCanvasCards);
    const rankedReferences = rankDeepResearchReferences(references).slice(0, maxReferenceCards);
    const eventCards = buildDeepResearchEventCards(collected.events, context.lang).slice(0, Math.max(0, cardLimit - 2));
    const referenceCards = sourceCardMode === "cards" ? rankedReferences.slice(0, Math.max(0, cardLimit - eventCards.length - 1)).map((reference, index) => ({
      id: `deep-reference-${index + 1}-${slug(reference.title || reference.url || "reference")}`,
      type: reference.type === "image" ? "image" : "web",
      title: stringOr(reference.title, reference.url || "Reference").slice(0, 48),
      summary: stringOr(reference.description, reference.url || "").slice(0, 240),
      prompt: stringOr(reference.description || reference.title, context.prompt).slice(0, 1200),
      query: context.prompt,
      url: stringOr(reference.url || reference.sourceUrl, "").slice(0, 512)
    })) : [];
    const referenceListCard = sourceCardMode === "list" && rankedReferences.length ? [buildDeepResearchReferenceListCard(rankedReferences, context.lang)] : [];
    const finalText = (collected.text || collected.thinkingContent || "").trim();
    const reply = finalText
      ? finalText.slice(0, 1800)
      : (context.lang === "en" ? "Deep research completed." : "深入研究完成。");
    const reportCard = {
      id: `deep-report-${Date.now().toString(36)}`,
      type: "note",
      title: context.lang === "en" ? "Research report" : "研究报告",
      summary: reply.slice(0, 240),
      prompt: finalText || context.prompt,
      query: context.prompt,
      content: { text: finalText || reply }
    };
    const cards = [reportCard, ...eventCards, ...referenceListCard, ...referenceCards].slice(0, cardLimit);
    const links = cards.slice(1).map((_, index) => ({ from: 0, to: index + 1, label: "" }));
    return {
      provider: "api",
      model: collected.model || runtimeConfigs.deepthink.model,
      reply,
      cards,
      links,
      references: rankedReferences,
      researchEvents: collected.events.slice(-40),
      thinkingContent: collected.thinkingContent,
      actions: []
    };
  }

  function rankDeepResearchReferences(references) {
    return [...references].sort((a, b) => deepResearchReferenceScore(b) - deepResearchReferenceScore(a));
  }

  function deepResearchReferenceScore(reference) {
    const title = stringOr(reference?.title, "");
    const description = stringOr(reference?.description || reference?.summary, "");
    const url = stringOr(reference?.url || reference?.sourceUrl || reference?.imageUrl, "");
    let score = 0;
    if (title && title !== url) score += 4;
    if (description.length >= 40) score += 3;
    if (/\.edu|\.gov|arxiv|nature|science|who\.int|worldbank|oecd|官方|报告|论文|数据/i.test(`${url} ${title}`)) score += 3;
    if (reference?.type === "image") score -= 1;
    return score;
  }

  function buildDeepResearchReferenceListCard(references, lang) {
    const title = lang === "en" ? "Selected sources" : "精选来源列表";
    const lines = references.map((reference, index) => {
      const name = stringOr(reference.title, reference.url || `Source ${index + 1}`).replace(/\s+/g, " ").slice(0, 120);
      const url = stringOr(reference.url || reference.sourceUrl || reference.imageUrl, "");
      const description = stringOr(reference.description || reference.summary, "").replace(/\s+/g, " ").slice(0, 180);
      return `- ${url ? `[${name}](${url})` : name}${description ? ` - ${description}` : ""}`;
    });
    const text = lines.join("\n");
    return {
      id: `deep-sources-${Date.now().toString(36)}`,
      type: "note",
      title,
      summary: lang === "en" ? `${references.length} selected sources grouped into one list.` : `已将 ${references.length} 个精选来源合并为一个列表。`,
      prompt: text,
      query: "",
      content: { text }
    };
  }

  function buildDeepResearchEventCards(events, lang) {
    const grouped = new Map();
    for (const event of events || []) {
      if (!event.delta || event.isAnswer) continue;
      const title = event.title || humanDeepResearchStage(event.stage);
      const current = grouped.get(title) || "";
      grouped.set(title, `${current}${event.delta}`.slice(0, 900));
    }
    return Array.from(grouped.entries()).slice(0, 3).map(([title, text], index) => ({
      id: `deep-event-${index + 1}-${slug(title)}`,
      type: index === 0 ? "note" : "file",
      title: String(title || (lang === "en" ? "Research step" : "研究步骤")).slice(0, 48),
      summary: String(text || "").replace(/\s+/g, " ").slice(0, 240),
      prompt: String(text || "").slice(0, 1200),
      query: ""
    }));
  }

  return {
    runDashScopeDeepResearch
  };
}

function textFromMixedContent(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value.map((part) => textFromMixedContent(part?.text || part?.content || part)).filter(Boolean).join("");
  }
  if (typeof value === "object") {
    return textFromMixedContent(value.text || value.content || value.value || value.output_text || "");
  }
  return "";
}

function walkJson(value, visitor, seen = new Set()) {
  if (!value || typeof value !== "object") return;
  if (seen.has(value)) return;
  seen.add(value);
  visitor(value);
  if (Array.isArray(value)) {
    value.forEach((item) => walkJson(item, visitor, seen));
  } else {
    Object.values(value).forEach((item) => walkJson(item, visitor, seen));
  }
}
