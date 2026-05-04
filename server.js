import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { handleCreateSession, handleGetSession, handleUpdateSession, handleExportSession } from "./src/api/sessions.js";
import { handleListHistory, handleRenameSession } from "./src/api/history.js";
import { handleStoreAsset, handleGetAsset } from "./src/api/assets.js";
import { handleCreateShare, handleGetShare, handleCreateImageShare, handleGetImageShare } from "./src/api/share.js";
import { handleImportSession } from "./src/api/import.js";
import { handleGetSettings, handleUpdateSettings } from "./src/api/settings.js";
import { handleListMaterials, handleCreateMaterial, handleUpdateMaterial, handleDeleteMaterial, handleGetMaterialFile } from "./src/api/materials.js";
import { handleCreateFileUnderstanding, handleGetFileUnderstanding } from "./src/api/fileUnderstanding.js";
import { handleContextIngest, handleContextRetrieve, handleContextStats, handleContextWipe } from "./src/api/context.js";
import { ensureStorageDirs, storeDataUrl, storeFile } from "./src/lib/storage.js";
import { extractTextFromBuffer } from "./src/lib/textExtract.js";
import { PrismaClient } from "@prisma/client";
import WebSocket from "ws";
import { buildAnalysisPrompt, buildExplorePrompt, buildUrlAnalysisPrompt, buildTextAnalysisPrompt, buildChatSystemContext, buildChatUserPrompt, buildGeneratePrompt, buildExplainPrompt, buildExplainSystemPrompt, buildRealtimeInstruction, buildDeepThinkSystemPrompt, buildDeepThinkUserPrompt, buildExploreContent, CANVAS_ACTION_TYPES, CANVAS_ACTION_TYPES_TEXT } from "./src/prompts/index.js";
import { ingestText, ingestSnippet, retrieveContext, formatContextForPrompt, isEmbeddingConfigured, CONTEXT_KINDS } from "./src/lib/rag/index.js";
import { classifyContent, getFallbackTaskType, resolveTaskType, routeContent } from "./src/lib/taskRouter.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "public");

loadDotEnv(path.join(__dirname, ".env"));

const PORT = Number(process.env.PORT || 3000);
const DEMO_MODE = process.env.DEMO_MODE === "true";

const prisma = new PrismaClient();

let runtimeConfigs = {
  chat: buildModelConfig("CHAT", {
    provider: "dashscope-qwen",
    model: "qwen3.6-plus",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    apiKeyEnv: ["DASHSCOPE_API_KEY", "CHAT_API_KEY"],
    options: {
      max_tokens: 65536
    }
  }),
  analysis: buildModelConfig("ANALYSIS", {
    provider: "dashscope-qwen",
    model: "qwen3.6-plus",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    apiKeyEnv: ["DASHSCOPE_API_KEY", "ANALYSIS_API_KEY"]
  }),
  image: buildModelConfig("IMAGE", {
    provider: "dashscope-qwen-image",
    model: "qwen-image-2.0-pro",
    baseUrl: "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation",
    apiKeyEnv: ["DASHSCOPE_API_KEY", "IMAGE_API_KEY"],
    options: {
      size: "2048*2048",
      n: 1,
      prompt_extend: true,
      watermark: false,
      negative_prompt: "",
      useReferenceImage: true
    }
  }),
  asr: buildModelConfig("ASR", {
    provider: "dashscope-livetranslate",
    model: "qwen3-livetranslate-flash-2025-12-01",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    apiKeyEnv: ["DASHSCOPE_API_KEY", "ASR_API_KEY"],
    options: { targetLanguage: "auto" }
  }),
  realtime: buildModelConfig("REALTIME", {
    provider: "dashscope-realtime",
    model: "qwen3.5-omni-plus-realtime",
    baseUrl: "wss://dashscope.aliyuncs.com/api-ws/v1/realtime",
    apiKeyEnv: ["DASHSCOPE_API_KEY", "REALTIME_API_KEY"],
    options: {
      voice: "Ethan",
      outputAudio: false,
      enableSearch: false,
      smoothOutput: "auto"
    }
  }),
  deepthink: buildModelConfig("DEEPTHINK", {
    provider: "dashscope-deep-research",
    model: "qwen-deep-research",
    baseUrl: "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation",
    apiKeyEnv: ["DASHSCOPE_API_KEY", "DEEPTHINK_API_KEY"]
  })
};

const IMAGE_POLL_INTERVAL_MS = Number(process.env.IMAGE_POLL_INTERVAL_MS || 2000);
const IMAGE_POLL_ATTEMPTS = Number(process.env.IMAGE_POLL_ATTEMPTS || 30);
const IMAGE_INCLUDE_DATA_URL = process.env.IMAGE_INCLUDE_DATA_URL === "true";
const MAX_BODY_BYTES = 22 * 1024 * 1024;
const CHAT_COMPLETION_TIMEOUT_MS = Number(process.env.CHAT_COMPLETION_TIMEOUT_MS || 120000);
const CHAT_STREAM_IDLE_TIMEOUT_MS = Number(process.env.CHAT_STREAM_IDLE_TIMEOUT_MS || process.env.CHAT_STREAM_TIMEOUT_MS || 240000);
const DEEP_RESEARCH_TIMEOUT_MS = Number(process.env.DEEP_RESEARCH_TIMEOUT_MS || 600000);
const EXPLORE_THINKING_TIMEOUT_MS = Number(process.env.EXPLORE_THINKING_TIMEOUT_MS || 120000);
const EXPLORE_FALLBACK_TIMEOUT_MS = Number(process.env.EXPLORE_FALLBACK_TIMEOUT_MS || 60000);
const IMAGE_SEARCH_MODEL = process.env.IMAGE_SEARCH_MODEL || "qwen3.5-plus";

const CANVAS_ACTION_TOOL_SCHEMA = {
  type: "function",
  function: {
    name: "canvas_action",
    description: "Execute a canvas action such as creating a reusable card, zooming, searching, or manipulating the view. Use this to augment the chat answer, not replace it. You may invoke this tool MULTIPLE times in a single turn when multiple reusable artifacts are genuinely useful.",
    parameters: {
      type: "object",
      properties: {
        type: { type: "string", enum: CANVAS_ACTION_TYPES, description: "The action type to execute" },
        title: { type: "string", description: "Title for the new card or action" },
        description: { type: "string", description: "Description or body text" },
        prompt: { type: "string", description: "Prompt for image generation or detailed instruction" },
        query: { type: "string", description: "Search query" },
        url: { type: "string", description: "URL for link or web card" },
        nodeType: { type: "string", enum: ["note", "plan", "todo", "weather", "map", "link", "code", "table", "timeline", "comparison", "metric", "quote"], description: "Rich node type" },
        content: {
          type: "object",
          description: [
            "Structured payload that fills the rich node. REQUIRED for create_plan/create_todo/create_note/create_weather/create_map/create_link/create_code/create_table/create_timeline/create_comparison/create_metric/create_quote — without it the card renders empty. The chat answer must still summarize the useful result. Shape per type:",
            "- create_plan: { summary?: string, assumptions?: string[], steps: [{ title: string, description: string, time?: string, priority?: string, tips?: string[] }, ...], tips?: string[], budget?: string } — use this as a compact overview plan. Each description should cover sequence/order, rationale, resources/cost/time constraints, dependencies, risks, and cautions where relevant, but do not make one oversized plan card. For complex learning/exam/research/project tasks, create multiple artifacts: overview plan + resources/logistics note + todo checklist + web/reference cards when useful",
            "- create_todo: { items: [{ text: string, done: boolean, priority?: string, rationale?: string }, ...] }",
            "- create_note: { text: string, sections?: [{ title: string, body: string }] } — the full note body in markdown",
            "- create_weather: { location: string, temp: string, forecast: string }",
            "- create_map: { address: string, lat?: number, lng?: number }",
            "- create_link/create_web_card: { title: string, url: string, description?: string, source?: string, faviconUrl?: string } — title must be the readable page/site name, not a raw URL; description should summarize what the page is for or why it matters",
            "- create_code: { language: string, code: string, explanation?: string, usage?: string }",
            "- create_table: { columns: string[], rows: object[] | string[][], caption?: string } — structured facts, matrices, datasets, schedules, resource lists",
            "- create_timeline: { items: [{ time?: string, date?: string, phase?: string, title: string, description?: string }, ...] } — chronological plans, history, milestones, processes",
            "- create_comparison: { items: [{ title: string, summary?: string, pros?: string[], cons?: string[], score?: string }], criteria?: string[], recommendation?: string } — decision support and option tradeoffs",
            "- create_metric: { metrics: [{ label: string, value: string, delta?: string, trend?: string, note?: string }], summary?: string } — KPIs, benchmarks, measurements, progress snapshots",
            "- create_quote: { quotes: [{ text: string, source?: string, author?: string, url?: string }], context?: string } — excerpts, citations, source-backed claims"
          ].join("\n")
        },
        position: { type: "string", description: "Position hint: left, right, above, below, center, etc." },
        nodeId: { type: "string", description: "Exact node ID from canvas state" },
        nodeName: { type: "string", description: "Node name when exact ID is uncertain" },
        anchorNodeId: { type: "string" },
        x: { type: "number" },
        y: { type: "number" },
        scale: { type: "number" },
        amount: { type: "number" },
        mode: { type: "string" },
        scope: { type: "string" }
      },
      required: ["type"]
    }
  }
};

const CANVAS_TOOLS = [CANVAS_ACTION_TOOL_SCHEMA];
const RESPONSES_CANVAS_TOOL_SCHEMA = {
  type: "function",
  name: CANVAS_ACTION_TOOL_SCHEMA.function.name,
  description: CANVAS_ACTION_TOOL_SCHEMA.function.description,
  parameters: CANVAS_ACTION_TOOL_SCHEMA.function.parameters
};
const RESPONSES_CANVAS_TOOL_SCHEMA_WRAPPED = {
  type: "function",
  function: {
    name: CANVAS_ACTION_TOOL_SCHEMA.function.name,
    description: CANVAS_ACTION_TOOL_SCHEMA.function.description,
    parameters: CANVAS_ACTION_TOOL_SCHEMA.function.parameters
  }
};

function extractToolCallActions(response) {
  const toolCalls = response?.choices?.[0]?.message?.tool_calls || [];
  return toolCalls
    .filter((tc) => tc.type === "function" && tc.function?.name === "canvas_action")
    .map((tc) => {
      try {
        return JSON.parse(tc.function.arguments || "{}");
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

const ACTION_REPLY_TEMPLATES = {
  zh: {
    create_plan: (a) => `已为你创建 plan 卡片${a.title ? `「${a.title}」` : ""},你可以点击下方反馈卡跳转查看。`,
    create_todo: (a) => `已为你创建 todo 清单${a.title ? `「${a.title}」` : ""}。`,
    create_note: (a) => `已为你创建 note 笔记${a.title ? `「${a.title}」` : ""}。`,
    create_weather: (a) => `已为你创建 weather 卡片${a.title ? `「${a.title}」` : ""}。`,
    create_map: (a) => `已为你创建 map 卡片${a.title ? `「${a.title}」` : ""}。`,
    create_link: (a) => `已为你创建 link 卡片${a.title ? `「${a.title}」` : ""}。`,
    create_code: (a) => `已为你创建 code 卡片${a.title ? `「${a.title}」` : ""}。`,
    create_web_card: (a) => `已为你创建 web 卡片${a.title ? `「${a.title}」` : ""}。`,
    create_table: (a) => `已为你创建 table 卡片${a.title ? `「${a.title}」` : ""}。`,
    create_timeline: (a) => `已为你创建 timeline 卡片${a.title ? `「${a.title}」` : ""}。`,
    create_comparison: (a) => `已为你创建 comparison 卡片${a.title ? `「${a.title}」` : ""}。`,
    create_metric: (a) => `已为你创建 metric 卡片${a.title ? `「${a.title}」` : ""}。`,
    create_quote: (a) => `已为你创建 quote 卡片${a.title ? `「${a.title}」` : ""}。`,
    create_card: (a) => `已为你创建卡片${a.title ? `「${a.title}」` : ""}。`,
    new_card: (a) => `已为你创建卡片${a.title ? `「${a.title}」` : ""}。`,
    create_direction: (a) => `已添加方向卡片${a.title ? `「${a.title}」` : ""}。`,
    generate_image: () => "已开始生成图片,稍候请查看画布上的新节点。",
    zoom_in: () => "已放大画布。",
    zoom_out: () => "已缩小画布。",
    reset_view: () => "已重置视图。"
  },
  en: {
    create_plan: (a) => `Created a plan card${a.title ? ` "${a.title}"` : ""}. Click the feedback card below to focus on it.`,
    create_todo: (a) => `Created a todo list${a.title ? ` "${a.title}"` : ""}.`,
    create_note: (a) => `Created a note${a.title ? ` "${a.title}"` : ""}.`,
    create_weather: (a) => `Created a weather card${a.title ? ` "${a.title}"` : ""}.`,
    create_map: (a) => `Created a map card${a.title ? ` "${a.title}"` : ""}.`,
    create_link: (a) => `Created a link card${a.title ? ` "${a.title}"` : ""}.`,
    create_code: (a) => `Created a code card${a.title ? ` "${a.title}"` : ""}.`,
    create_web_card: (a) => `Created a web card${a.title ? ` "${a.title}"` : ""}.`,
    create_table: (a) => `Created a table card${a.title ? ` "${a.title}"` : ""}.`,
    create_timeline: (a) => `Created a timeline card${a.title ? ` "${a.title}"` : ""}.`,
    create_comparison: (a) => `Created a comparison card${a.title ? ` "${a.title}"` : ""}.`,
    create_metric: (a) => `Created a metric card${a.title ? ` "${a.title}"` : ""}.`,
    create_quote: (a) => `Created a quote card${a.title ? ` "${a.title}"` : ""}.`,
    create_card: (a) => `Created a card${a.title ? ` "${a.title}"` : ""}.`,
    new_card: (a) => `Created a card${a.title ? ` "${a.title}"` : ""}.`,
    create_direction: (a) => `Added a direction card${a.title ? ` "${a.title}"` : ""}.`,
    generate_image: () => "Image generation started — check the canvas for the new node.",
    zoom_in: () => "Zoomed in.",
    zoom_out: () => "Zoomed out.",
    reset_view: () => "View reset."
  }
};

const REUSABLE_CARD_ACTION_TYPES = ["create_plan", "create_todo", "create_note", "create_code", "create_web_card", "create_link", "create_table", "create_timeline", "create_comparison", "create_metric", "create_quote"];

function synthesizeReplyFromActions(actions, lang, references = []) {
  if (!Array.isArray(actions) || actions.length === 0) return "";
  const rich = synthesizeRichActionReply(actions, lang, references);
  if (rich) return rich;
  const templates = ACTION_REPLY_TEMPLATES[lang === "en" ? "en" : "zh"];
  const lines = [];
  for (const action of actions.slice(0, 3)) {
    const tpl = templates[action?.type];
    if (tpl) lines.push(tpl(action));
  }
  return lines.join(" ").slice(0, 400);
}

function synthesizeRichActionReply(actions, lang, references = []) {
  const action = actions.find((item) => REUSABLE_CARD_ACTION_TYPES.includes(item?.type));
  if (!action) return "";
  if (action.type === "create_plan") return [synthesizePlanActionReply(action, lang, references), formatActionBundleSection(actions, lang)].filter(Boolean).join("\n\n");
  if (action.type === "create_todo") return synthesizeTodoActionReply(action, lang);
  if (action.type === "create_note") return synthesizeNoteActionReply(action, lang);
  if (action.type === "create_code") return synthesizeCodeActionReply(action, lang);
  if (["create_table", "create_timeline", "create_comparison", "create_metric", "create_quote"].includes(action.type)) return synthesizeStructuredCardReply(action, lang);
  return synthesizeReferenceActionReply(action, lang);
}

function synthesizePlanActionReply(action, lang, references = []) {
  const content = action?.content && typeof action.content === "object" ? action.content : {};
  const steps = Array.isArray(content.steps) ? content.steps : [];
  if (!steps.length) return "";
  const title = action.title || (lang === "en" ? "Plan" : "计划");
  const summary = stringOr(content.summary || action.description || action.prompt, "").trim();
  const stepLines = steps.slice(0, 10).map((step, index) => {
    const stepTitle = stringOr(step?.title, `${lang === "en" ? "Step" : "步骤"} ${index + 1}`);
    const detail = stringOr(step?.description || step?.body || step?.text, "").replace(/\s+/g, " ").slice(0, 520);
    return { title: stepTitle, detail, time: stringOr(step?.time, ""), priority: stringOr(step?.priority, "") };
  });
  const tips = Array.isArray(content.tips) ? content.tips.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 3) : [];
  if (lang === "en") {
    return [
      `# ${title}`,
      "",
      summary || "I created a reusable plan card and summarized the structured deliverable below.",
      "",
      "| Section | Focus | Notes |",
      "|---|---|---|",
      ...stepLines.slice(0, 6).map((step, index) => `| ${index + 1} | ${escapeMarkdownTableCell(step.title)} | ${escapeMarkdownTableCell(step.detail || step.time || step.priority)} |`),
      "",
      ...stepLines.map((step, index) => `## ${index + 1}. ${step.title}\n\n${step.detail || "Details are available in the canvas card."}`),
      content.budget ? `\n## Budget\n\n${content.budget}` : "",
      tips.length ? `\n## Practical tips\n\n${tips.map((tip) => `- ${tip}`).join("\n")}` : "",
      formatReferenceSection(references, lang),
      "\nI also created the canvas plan card so you can inspect, rearrange, and iterate each step visually."
    ].filter(Boolean).join("\n");
  }
  return [
    `# ${title}`,
    "",
    summary || "我已创建可复用的 plan 卡片,并把可直接阅读的结构化交付物整理在下面。",
    "",
    "| 阶段/步骤 | 主题 | 核心内容 |",
    "|---|---|---|",
    ...stepLines.slice(0, 6).map((step, index) => `| ${index + 1} | ${escapeMarkdownTableCell(step.title)} | ${escapeMarkdownTableCell(step.detail || step.time || step.priority)} |`),
    "",
    ...stepLines.map((step, index) => `## ${index + 1}. ${step.title}\n\n${step.detail || "详细内容已写入画布卡片。"}`),
    content.budget ? `\n## 资源/成本参考\n\n${content.budget}` : "",
    tips.length ? `\n## 实用提醒\n\n${tips.map((tip) => `- ${tip}`).join("\n")}` : "",
    formatReferenceSection(references, lang),
    "\n我也已同步创建画布 plan 卡片,方便你继续在画布上按阶段/步骤细化、重排和迭代。"
  ].filter(Boolean).join("\n");
}

function escapeMarkdownTableCell(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/\|/g, "\\|")
    .slice(0, 180);
}

function synthesizeTodoActionReply(action, lang) {
  const items = Array.isArray(action?.content?.items) ? action.content.items : [];
  if (!items.length) return "";
  const lines = items.slice(0, 12).map((item) => {
    const text = stringOr(item?.text || item?.title, "").slice(0, 220);
    const rationale = stringOr(item?.rationale, "").slice(0, 220);
    const priority = stringOr(item?.priority, "");
    return text ? `- **${text}**${priority ? ` (${priority})` : ""}${rationale ? `：${rationale}` : ""}` : "";
  }).filter(Boolean);
  return lang === "en"
    ? [`# ${action.title || "Todo"}`, "", "I created a reusable todo card. Here are the actionable items:", "", ...lines].join("\n")
    : [`# ${action.title || "待办"}`, "", "我已创建可复用的 todo 卡片。下面是可执行事项:", "", ...lines].join("\n");
}

function synthesizeNoteActionReply(action, lang) {
  const sections = Array.isArray(action?.content?.sections) ? action.content.sections : [];
  const text = stringOr(action?.content?.text || action.description || action.prompt, "").trim();
  if (!text && !sections.length) return "";
  const sectionText = sections.slice(0, 8)
    .map((section) => {
      const title = stringOr(section?.title, "");
      const body = stringOr(section?.body || section?.text || section?.description, "");
      return title || body ? `## ${title || (lang === "en" ? "Section" : "小节")}\n\n${body}` : "";
    })
    .filter(Boolean)
    .join("\n\n");
  const body = sectionText || text;
  return lang === "en"
    ? `# ${action.title || "Note"}\n\n${body.slice(0, 2400)}${body.length > 2400 ? "\n\nOpen the card to continue reading or editing." : ""}`
    : `# ${action.title || "笔记"}\n\n${body.slice(0, 2400)}${body.length > 2400 ? "\n\n可打开卡片继续阅读或编辑。" : ""}`;
}

function synthesizeCodeActionReply(action, lang) {
  const content = action?.content && typeof action.content === "object" ? action.content : {};
  const explanation = stringOr(content.explanation || action.description || action.prompt, "").trim();
  if (!explanation && !content.code) return "";
  return lang === "en"
    ? [`Created a code card **${action.title || "Code"}**.`, explanation || "The runnable code is available in the canvas card.", content.usage ? `Usage: ${content.usage}` : ""].filter(Boolean).join("\n\n")
    : [`已创建 code 卡片 **${action.title || "代码"}**。`, explanation || "可运行代码已放在画布卡片中。", content.usage ? `用法: ${content.usage}` : ""].filter(Boolean).join("\n\n");
}

function synthesizeReferenceActionReply(action, lang) {
  const title = action.title || action.url || (lang === "en" ? "Reference" : "参考资料");
  const description = stringOr(action.description || action.prompt || action.query, "").trim();
  return lang === "en"
    ? [`Created a reference card **${title}**.`, description].filter(Boolean).join("\n\n")
    : [`已创建参考卡片 **${title}**。`, description].filter(Boolean).join("\n\n");
}

function synthesizeStructuredCardReply(action, lang) {
  const type = String(action?.type || "").replace(/^create_/, "");
  const title = action.title || type;
  const description = stringOr(action.description || action.prompt, "").trim();
  return lang === "en"
    ? [`Created a reusable ${type} card **${title}**.`, description || "Open the canvas card to inspect the structured content and continue editing."].join("\n\n")
    : [`已创建可复用的 ${type} 卡片 **${title}**。`, description || "可打开画布卡片查看结构化内容并继续编辑。"].join("\n\n");
}

function finalizeChatReply(reply, actions, lang, references = []) {
  const text = String(reply || "").trim();
  if (!Array.isArray(actions) || actions.length === 0) return appendReferencesIfMissing(text, references, lang);
  const planAction = actions.find((action) => action?.type === "create_plan" && Array.isArray(action?.content?.steps) && action.content.steps.length);
  if (planAction && shouldUpgradePlanReply(text, lang)) {
    return appendReferencesIfMissing([synthesizePlanActionReply(planAction, lang, references), formatActionBundleSection(actions, lang)].filter(Boolean).join("\n\n"), references, lang);
  }
  if (isSubstantiveActionReply(text, lang)) return text;
  return appendReferencesIfMissing(synthesizeReplyFromActions(actions, lang, references) || text, references, lang);
}

function formatActionBundleSection(actions, lang) {
  const reusable = Array.isArray(actions)
    ? actions.filter((action) => REUSABLE_CARD_ACTION_TYPES.includes(action?.type))
    : [];
  if (reusable.length <= 1) return "";
  const lines = reusable.slice(0, 8).map((action) => {
    const type = String(action.type || "").replace(/^create_/, "");
    const title = stringOr(action.title || action.url || action.query, type);
    return `- **${type}**: ${title}`;
  });
  return lang === "en"
    ? ["## Canvas card split", "", "I split the reusable work into multiple cards instead of one oversized card:", "", ...lines].join("\n")
    : ["## 画布卡片拆分", "", "我把可复用内容拆成多张卡片,避免塞进一张超长卡:", "", ...lines].join("\n");
}

function isSubstantiveActionReply(reply, lang) {
  if (!reply) return false;
  const text = String(reply).trim();
  if (text.length >= 220) return true;
  if (/^#{1,3}\s|\n[-*]\s|\n\d+[.)]\s/.test(text)) return true;
  if (lang === "en") {
    return !/^created\s+(a|an|the)?.{0,80}(card|node)/i.test(text);
  }
  return !/^(已为你创建|已创建|已经创建|已添加).{0,80}(卡片|节点|plan|todo|note|code|web)/i.test(text);
}

function shouldUpgradePlanReply(reply, lang) {
  const text = String(reply || "").trim();
  if (!text) return true;
  const hasMarkdownTable = /(^|\n)\|.+\|\s*\n\|[\s:|,-]+\|/m.test(text);
  const sectionCount = (text.match(/^#{1,3}\s+/gm) || []).length;
  const structuredSectionCount = (text.match(/(^|\n)(Step\s*\d+|Phase\s*\d+|Milestone\s*\d+|步骤\s*\d+|阶段\s*\d+|里程碑|目标|假设|风险|下一步|验证|资源|成本)/gi) || []).length;
  const ackPattern = lang === "en"
    ? /^(sure|okay|done|i('|’)ve|i have).{0,260}(created|canvas|card|plan|weather|map)/is
    : /^(好的|好|可以|已|我已|我已经|我来|没问题).{0,260}(创建|画布|卡片|计划|行程|天气|地图)/is;
  if (ackPattern.test(text)) return true;
  if (text.length < 700) return true;
  if (text.length < 1200 && !hasMarkdownTable) return true;
  return !(hasMarkdownTable && (sectionCount >= 2 || structuredSectionCount >= 2 || text.length >= 1200));
}

function appendReferencesIfMissing(reply, references = [], lang) {
  const text = String(reply || "").trim();
  if (!text || !Array.isArray(references) || references.length === 0) return text;
  if (/\[ref_\d+\]|\[\d+\]/i.test(text)) return text;
  const section = formatReferenceSection(references, lang);
  return section ? `${text}\n\n${section}` : text;
}

function formatReferenceSection(references = [], lang) {
  const usable = Array.isArray(references) ? references.filter((reference) => reference?.url).slice(0, 5) : [];
  if (!usable.length) return "";
  const title = lang === "en" ? "## References" : "## 参考来源";
  const lines = usable.map((reference, index) => {
    const label = stringOr(reference.title || reference.description, reference.url).replace(/\s+/g, " ").slice(0, 120);
    return `- [ref_${index + 1}] ${label}`;
  });
  return [title, "", ...lines].join("\n");
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);

    if (req.method === "GET" && url.pathname === "/api/health") {
      return sendJson(res, 200, {
        ok: true,
        mode: appMode(),
        chat: roleHealth(runtimeConfigs.chat),
        analysis: roleHealth(runtimeConfigs.analysis),
        image: roleHealth(runtimeConfigs.image),
        asr: roleHealth(runtimeConfigs.asr),
        realtime: roleHealth(runtimeConfigs.realtime),
        deepthink: roleHealth(runtimeConfigs.deepthink)
      });
    }

    if (req.method === "GET" && url.pathname === "/api/settings") {
      return await handleGetSettings(res);
    }

    if (req.method === "PUT" && url.pathname === "/api/settings") {
      const body = await readJson(req);
      const result = await handleUpdateSettings(body, res);
      await refreshConfigs();
      return result;
    }

    if (req.method === "POST" && url.pathname === "/api/chat") {
      const body = await readJson(req);
      return await handleChat(body, res);
    }

    if (req.method === "POST" && url.pathname === "/api/asr") {
      const body = await readJson(req);
      return await handleAsr(body, res);
    }

    if (req.method === "POST" && url.pathname === "/api/realtime-voice") {
      const body = await readJson(req);
      return await handleRealtimeVoice(body, res);
    }

    if (req.method === "POST" && (url.pathname === "/api/deep-think" || url.pathname === "/api/deep-research")) {
      const body = await readJson(req);
      return await handleDeepThink(body, res);
    }

    if (req.method === "POST" && url.pathname === "/api/image-search") {
      const body = await readJson(req);
      return await handleImageSearch(body, res);
    }

    if (req.method === "POST" && url.pathname === "/api/route-task") {
      const body = await readJson(req);
      return await handleRouteTask(body, res);
    }

    if (req.method === "POST" && url.pathname === "/api/analyze") {
      const body = await readJson(req);
      return await handleAnalyze(body, res);
    }

    if (req.method === "POST" && url.pathname === "/api/analyze-text") {
      const body = await readJson(req);
      return await handleAnalyzeText(body, res);
    }

    if (req.method === "POST" && url.pathname === "/api/analyze-url") {
      const body = await readJson(req);
      return await handleAnalyzeUrl(body, res);
    }

    if (req.method === "POST" && url.pathname === "/api/analyze-explore") {
      const body = await readJson(req);
      return await handleAnalyzeExplore(body, res);
    }

    if (req.method === "POST" && url.pathname === "/api/generate") {
      const body = await readJson(req);
      return await handleGenerate(body, res);
    }

    if (req.method === "POST" && url.pathname === "/api/explain") {
      const body = await readJson(req);
      return await handleExplain(body, res);
    }

    // Asset routes
    if (req.method === "POST" && url.pathname === "/api/assets") {
      const body = await readJson(req);
      return await handleStoreAsset(body, res);
    }
    if (req.method === "GET" && url.pathname.startsWith("/api/assets/")) {
      return await handleGetAsset(req, res);
    }

    // Session routes
    if (req.method === "POST" && url.pathname === "/api/sessions") {
      const body = await readJson(req);
      return await handleCreateSession(body, res);
    }
    if (req.method === "GET" && url.pathname.startsWith("/api/sessions/") && url.pathname.endsWith("/export")) {
      const id = url.pathname.split("/")[3];
      return await handleExportSession(id, res);
    }
    if (req.method === "GET" && /^\/api\/sessions\/[^/]+$/.test(url.pathname)) {
      const id = url.pathname.split("/")[3];
      return await handleGetSession(id, res);
    }
    if (req.method === "PUT" && /^\/api\/sessions\/[^/]+$/.test(url.pathname)) {
      const id = url.pathname.split("/")[3];
      const body = await readJson(req);
      return await handleUpdateSession(id, body, res);
    }

    // Import route
    if (req.method === "POST" && url.pathname === "/api/import") {
      const body = await readJson(req);
      return await handleImportSession(body, res);
    }

    // Share routes
    if (req.method === "POST" && url.pathname.startsWith("/api/sessions/") && url.pathname.endsWith("/share")) {
      const id = url.pathname.split("/")[3];
      return await handleCreateShare(id, res);
    }
    if (req.method === "GET" && url.pathname.startsWith("/api/share/")) {
      const token = url.pathname.split("/")[3];
      return await handleGetShare(token, res);
    }
    if (req.method === "POST" && url.pathname === "/api/share-image") {
      const body = await readJson(req);
      return await handleCreateImageShare(body, res);
    }
    if (req.method === "GET" && url.pathname.startsWith("/api/share-image/")) {
      const token = url.pathname.split("/")[3];
      return await handleGetImageShare(token, res);
    }

    // History route
    if (req.method === "GET" && url.pathname === "/api/history") {
      return await handleListHistory(Object.fromEntries(url.searchParams), res);
    }
    if (req.method === "PATCH" && /^\/api\/sessions\/[^/]+\/title$/.test(url.pathname)) {
      const id = url.pathname.split("/")[3];
      const body = await readJson(req);
      return await handleRenameSession(id, body, res);
    }

    // Material library routes
    if (req.method === "GET" && url.pathname === "/api/materials") {
      return await handleListMaterials(Object.fromEntries(url.searchParams), res);
    }
    if (req.method === "POST" && url.pathname === "/api/materials") {
      const body = await readJson(req);
      return await handleCreateMaterial(body, res);
    }
    if (req.method === "PUT" && /^\/api\/materials\/[^/]+$/.test(url.pathname)) {
      const id = url.pathname.split("/")[3];
      const body = await readJson(req);
      return await handleUpdateMaterial(id, body, res);
    }
    if (req.method === "DELETE" && /^\/api\/materials\/[^/]+$/.test(url.pathname)) {
      const id = url.pathname.split("/")[3];
      return await handleDeleteMaterial(id, res);
    }
    if (req.method === "GET" && /^\/api\/materials\/[^/]+\/file$/.test(url.pathname)) {
      const id = url.pathname.split("/")[3];
      return await handleGetMaterialFile(id, res, {
        download: url.searchParams.get("download") === "1"
      });
    }

    // File understanding routes
    if (req.method === "POST" && url.pathname === "/api/file-understanding") {
      const body = await readJson(req);
      return await handleCreateFileUnderstanding(body, res);
    }
    if (req.method === "GET" && url.pathname.startsWith("/api/file-understanding/")) {
      return await handleGetFileUnderstanding(req, res);
    }

    // Context (session-scoped RAG) routes
    if (req.method === "POST" && url.pathname === "/api/context/ingest") {
      const body = await readJson(req);
      return await handleContextIngest(body, res);
    }
    if (req.method === "POST" && url.pathname === "/api/context/retrieve") {
      const body = await readJson(req);
      return await handleContextRetrieve(body, res);
    }
    if (req.method === "GET" && url.pathname === "/api/context/stats") {
      return await handleContextStats(req, res);
    }
    if (req.method === "DELETE" && url.pathname.startsWith("/api/context/")) {
      const id = url.pathname.split("/")[3];
      return await handleContextWipe(id, res);
    }

    if (req.method === "GET") {
      if (url.pathname === "/history") {
        res.writeHead(302, { Location: "/history/" });
        return res.end();
      }
      if (url.pathname === "/history/") {
        return serveStatic("/history/index.html", res);
      }
      if (url.pathname.startsWith("/share/assets/")) {
        return serveStatic(url.pathname.replace(/^\/share/, ""), res);
      }
      if (/^\/share\/[^/]+\/?$/.test(url.pathname)) {
        return serveStatic("/share.html", res);
      }
      if (/^\/share-image\/[^/]+\/?$/.test(url.pathname)) {
        return serveStatic("/share-image.html", res);
      }
      if (url.pathname === "/home.html") {
        return sendJson(res, 404, { error: "Not found" });
      }
      return serveStatic(url.pathname, res);
    }

    return sendJson(res, 405, { error: "Method not allowed" });
  } catch (error) {
    console.error(error);
    return sendJson(res, 500, {
      error: "Server error",
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

server.listen(PORT, () => {
  console.log(`ORYZAE Image Board running at http://localhost:${PORT}`);
  console.log(`Model mode: ${appMode()}`);
});

ensureStorageDirs().catch(console.error);
refreshConfigs().catch(console.error);

async function refreshConfigs() {
  try {
    const rows = await prisma.settings.findMany();
    const dbMap = Object.fromEntries(
      rows.map((r) => [
        r.role,
        { endpoint: r.endpoint, model: r.model, apiKey: r.apiKey, temperature: r.temperature, options: r.options }
      ])
    );

    runtimeConfigs.chat = buildModelConfig("CHAT", {
      provider: "dashscope-qwen",
      model: "qwen3.6-plus",
      baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
      apiKeyEnv: ["DASHSCOPE_API_KEY", "CHAT_API_KEY"]
    }, dbMap.chat);

    runtimeConfigs.analysis = buildModelConfig("ANALYSIS", {
      provider: "dashscope-qwen",
      model: "qwen3.6-plus",
      baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
      apiKeyEnv: ["DASHSCOPE_API_KEY", "ANALYSIS_API_KEY"]
    }, dbMap.analysis);

    runtimeConfigs.image = buildModelConfig("IMAGE", {
      provider: "dashscope-qwen-image",
      model: "qwen-image-2.0-pro",
      baseUrl: "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation",
      apiKeyEnv: ["DASHSCOPE_API_KEY", "IMAGE_API_KEY"],
      options: {
        size: "2048*2048",
        n: 1,
        prompt_extend: true,
        watermark: false,
        negative_prompt: "",
        useReferenceImage: true
      }
    }, dbMap.image);

    runtimeConfigs.asr = buildModelConfig("ASR", {
      provider: "dashscope-livetranslate",
      model: "qwen3-livetranslate-flash-2025-12-01",
      baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
      apiKeyEnv: ["DASHSCOPE_API_KEY", "ASR_API_KEY"],
      options: { targetLanguage: "auto" }
    }, dbMap.asr);

    runtimeConfigs.realtime = buildModelConfig("REALTIME", {
      provider: "dashscope-realtime",
      model: "qwen3.5-omni-plus-realtime",
      baseUrl: "wss://dashscope.aliyuncs.com/api-ws/v1/realtime",
      apiKeyEnv: ["DASHSCOPE_API_KEY", "REALTIME_API_KEY"],
      options: {
        voice: "Ethan",
        outputAudio: false,
        enableSearch: false,
        smoothOutput: "auto"
      }
    }, dbMap.realtime);

    runtimeConfigs.deepthink = buildModelConfig("DEEPTHINK", {
      provider: "dashscope-deep-research",
      model: "qwen-deep-research",
      baseUrl: "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation",
      apiKeyEnv: ["DASHSCOPE_API_KEY", "DEEPTHINK_API_KEY"]
    }, dbMap.deepthink);
  } catch (err) {
    console.warn("[refreshConfigs] Database unavailable, using env defaults:", err.message);
  }
}

function buildModelConfig(role, defaults, dbSettings = null) {
  const effectiveDbSettings = isLegacyDefault(role, dbSettings) ? null : dbSettings;
  const envProvider = process.env[`${role}_PROVIDER`] || "";
  const envBaseUrl = process.env[`${role}_API_BASE_URL`] || "";
  const envModel = process.env[`${role}_MODEL`] || "";
  const ignoreLegacyEnv = isLegacyEnvDefault(role, { provider: envProvider, endpoint: envBaseUrl, model: envModel });
  const apiKey =
    (effectiveDbSettings?.apiKey ?? "") ||
    firstEnv(defaults.apiKeyEnv || []) ||
    process.env[`${role}_API_KEY`] ||
    "";
  const baseUrl = (
    (effectiveDbSettings?.endpoint || "").replace(/\/+$/, "") ||
    (ignoreLegacyEnv ? "" : envBaseUrl) ||
    defaults.baseUrl
  ).replace(/\/+$/, "");
  const roleProvider =
    (effectiveDbSettings?.provider) ||
    (ignoreLegacyEnv ? "" : envProvider) ||
    inferProviderFromEndpoint(baseUrl, defaults.provider);
  const model =
    (effectiveDbSettings?.model) ||
    (ignoreLegacyEnv ? "" : envModel) ||
    defaults.model;
  const temperature =
    typeof effectiveDbSettings?.temperature === "number"
      ? effectiveDbSettings.temperature
      : (parseFloat(process.env[`${role}_TEMPERATURE`]) || defaults.temperature || 0.7);
  const options = normalizeModelOptions(role.toLowerCase(), {
    ...(defaults.options || {}),
    ...parseEnvOptions(role),
    ...(effectiveDbSettings?.options && typeof effectiveDbSettings.options === "object" ? effectiveDbSettings.options : {})
  });

  return { role: role.toLowerCase(), provider: roleProvider, apiKey, baseUrl, model, temperature, options };
}

function inferProviderFromEndpoint(endpoint, fallback) {
  const normalized = String(endpoint || "").toLowerCase();
  if (normalized.includes("/api/v1/services/aigc/multimodal-generation/generation")) return "dashscope-qwen-image";
  if (normalized.includes("/api/v1/services/aigc/text-generation/generation")) return "dashscope-deep-research";
  if (normalized.includes("dashscope.aliyuncs.com")) return "dashscope-qwen";
  return fallback;
}

function isLegacyEnvDefault(role, envSettings) {
  if (!envSettings) return false;
  const endpoint = String(envSettings.endpoint || "").replace(/\/+$/, "");
  const model = String(envSettings.model || "");
  const provider = String(envSettings.provider || "").toLowerCase();
  return (
    role === "CHAT" &&
    (provider === "kimi" || endpoint === "https://api.moonshot.cn/v1" || model === "kimi-k2.6")
  ) || (
    role === "ANALYSIS" &&
    (provider === "kimi" || endpoint === "https://api.moonshot.cn/v1" || model === "kimi-k2.6")
  ) || (
    role === "IMAGE" &&
    (provider === "tencent-tokenhub-image" || endpoint === "https://tokenhub.tencentmaas.com/v1/api/image" || model === "hy-image-v3.0")
  ) || (
    role === "DEEPTHINK" &&
    (model === "qwen3.6-max-preview" || model === "qwen3.6-plus")
  );
}

function isLegacyDefault(role, dbSettings) {
  if (!dbSettings) return false;
  const endpoint = String(dbSettings.endpoint || "").replace(/\/+$/, "");
  const model = String(dbSettings.model || "");
  if (
    role === "IMAGE" &&
    endpoint === "https://tokenhub.tencentmaas.com/v1/api/image" &&
    model === "hy-image-v3.0"
  ) {
    return true;
  }
  if (
    role === "CHAT" &&
    endpoint === "https://api.moonshot.cn/v1" &&
    model === "kimi-k2.6"
  ) {
    return true;
  }
  if (
    role === "ANALYSIS" &&
    endpoint === "https://api.moonshot.cn/v1" &&
    model === "kimi-k2.6"
  ) {
    return true;
  }
  if (
    role === "DEEPTHINK" &&
    endpoint === "https://dashscope.aliyuncs.com/compatible-mode/v1" &&
    (model === "qwen3.6-max-preview" || model === "qwen3.6-plus")
  ) {
    return true;
  }
  if (dbSettings.apiKey) return false;
  return (
    role === "ASR" &&
    endpoint === "https://api.openai.com/v1" &&
    model === "whisper-1"
  ) || (
    role === "REALTIME" &&
    endpoint === "https://api.openai.com/v1" &&
    model === "gpt-4o-audio-preview"
  );
}

function parseEnvOptions(role) {
  const raw = process.env[`${role}_OPTIONS`];
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    console.warn(`[settings] Ignoring invalid ${role}_OPTIONS JSON.`);
    return {};
  }
}

function normalizeModelOptions(role, value) {
  const raw = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  if (role === "image") {
    return dropUndefined({
      size: cleanSize(raw.size) || "2048*2048",
      n: cleanInteger(raw.n, 1, 6, 1),
      prompt_extend: cleanBoolean(raw.prompt_extend, true),
      watermark: cleanBoolean(raw.watermark, false),
      negative_prompt: cleanString(raw.negative_prompt, 500),
      seed: cleanOptionalInteger(raw.seed, 0, 2147483647),
      useReferenceImage: cleanBoolean(raw.useReferenceImage, true)
    });
  }
  if (role === "asr") {
    return {
      targetLanguage: ["auto", "zh", "en"].includes(raw.targetLanguage) ? raw.targetLanguage : "auto"
    };
  }
  if (role === "realtime") {
    return dropUndefined({
      voice: cleanString(raw.voice, 64) || "Ethan",
      outputAudio: cleanBoolean(raw.outputAudio, false),
      enableSearch: cleanBoolean(raw.enableSearch, false),
      smoothOutput: raw.smoothOutput === true || raw.smoothOutput === false ? raw.smoothOutput : "auto",
      top_p: cleanOptionalNumber(raw.top_p, 0.01, 1)
    });
  }
  return dropUndefined({
    top_p: cleanOptionalNumber(raw.top_p, 0.01, 1),
    max_tokens: cleanOptionalInteger(raw.max_tokens, 1, 200000)
  });
}

function cleanString(value, max = 256) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function cleanBoolean(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

function cleanInteger(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

function cleanOptionalInteger(value, min, max) {
  if (value === "" || value === null || value === undefined) return undefined;
  const number = Number(value);
  if (!Number.isFinite(number)) return undefined;
  return Math.min(max, Math.max(min, Math.round(number)));
}

function cleanOptionalNumber(value, min, max) {
  if (value === "" || value === null || value === undefined) return undefined;
  const number = Number(value);
  if (!Number.isFinite(number)) return undefined;
  return Math.min(max, Math.max(min, number));
}

function cleanSize(value) {
  const size = cleanString(value, 32).replace(/[xX]/g, "*");
  return /^\d{3,4}\*\d{3,4}$/.test(size) ? size : "";
}

function dropUndefined(value) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));
}

function firstEnv(keys) {
  for (const key of keys) {
    if (process.env[key]) return process.env[key];
  }
  return "";
}

function roleHealth(config) {
  return {
    mode: isDemoRole(config) ? "demo" : "api",
    provider: config.provider,
    model: config.model,
    baseUrl: config.baseUrl
  };
}

function isDemoRole(config) {
  return DEMO_MODE || !config.apiKey;
}

function applyReasoningMode(payload, config, thinkingMode) {
  if (config.provider === "kimi" && /^kimi-k2\./.test(config.model)) {
    payload.thinking = { type: thinkingMode === "thinking" ? "enabled" : "disabled" };
  } else if (config.provider === "openrouter") {
    payload.reasoning = { effort: thinkingMode === "thinking" ? "high" : "none", exclude: thinkingMode !== "thinking" };
  } else if (isDashScopeQwenConfig(config)) {
    payload.enable_thinking = thinkingMode === "thinking";
  }
  return payload;
}

function isDashScopeQwenConfig(config) {
  if (config?.provider === "dashscope-deep-research") return false;
  if (config?.provider === "dashscope-qwen-image") return false;
  if (/qwen-deep-research/i.test(config?.model || "")) return false;
  return config?.provider === "dashscope-qwen" || /dashscope\.aliyuncs\.com/i.test(config?.baseUrl || "");
}

function isDashScopeQwenImageConfig(config) {
  return (
    config?.provider === "dashscope-qwen-image" ||
    /qwen-image/i.test(config?.model || "") ||
    /\/api\/v1\/services\/aigc\/multimodal-generation\/generation/i.test(config?.baseUrl || "")
  );
}

function isDashScopeDeepResearchConfig(config) {
  return config?.provider === "dashscope-deep-research" || /qwen-deep-research/i.test(config?.model || "") || /\/api\/v1\/services\/aigc\/text-generation\/generation/i.test(config?.baseUrl || "");
}

function applyWebSearchMode(payload, config, enabled = true, options = {}) {
  if (enabled && isDashScopeQwenConfig(config)) {
    payload.enable_search = true;
    payload.search_options = {
      ...(payload.search_options || {}),
      enable_source: true,
      enable_citation: true,
      citation_format: "[ref_<number>]",
      forced_search: true,
      search_strategy: options.strategy || "max"
    };
  }
  return payload;
}

function applyJsonObjectResponseMode(payload, config, enabled = true) {
  if (enabled && isDashScopeQwenConfig(config)) {
    payload.response_format = { type: "json_object" };
  }
  return payload;
}

function applyRequestOptions(payload, config) {
  const options = config?.options || {};
  if (payload.temperature === undefined && typeof config?.temperature === "number") {
    payload.temperature = config.temperature;
  }
  if (payload.top_p === undefined && typeof options.top_p === "number") {
    payload.top_p = options.top_p;
  }
  if (payload.max_tokens === undefined && Number.isInteger(options.max_tokens)) {
    payload.max_tokens = options.max_tokens;
  }
  return payload;
}

function applyChatQualityRequestOptions(payload, config, message, options = {}) {
  const target = inferChatMaxTokens(message, options);
  const configured = Number.isInteger(config?.options?.max_tokens) ? config.options.max_tokens : 0;
  const current = Number.isInteger(payload.max_tokens) ? payload.max_tokens : 0;
  const maxTokens = Math.max(current, configured, target);
  if (maxTokens > 0) payload.max_tokens = maxTokens;
  return payload;
}

function inferChatMaxTokens(message, options = {}) {
  const text = String(message || "").normalize("NFKC");
  if (/(只给出|只输出|一句话|简短|不要展开|brief|concise|one sentence|answer only|result only)/i.test(text)) return 2048;
  if (options.agentMode) return 32768;
  if (options.webSearchEnabled || /(研究|调研|资料|论文|文献|来源|引用|最新|官方|新闻|research|source|citation|latest|official|news)/i.test(text)) return 32768;
  if (/(计划|规划|方案|步骤|流程|路线图|日程|行程|学习路径|执行|落地|roadmap|workflow|schedule|itinerary|plan|milestone|implementation)/i.test(text)) return 24576;
  if (/(分析|对比|比较|评估|优缺点|选择|决策|复盘|诊断|analysis|compare|evaluate|pros|cons|decision|diagnose|audit|review)/i.test(text)) return 24576;
  if (/(教程|指南|策略|写一篇|创作|文案|报告|提纲|润色|代码|程序|python|javascript|数据|表格|csv|tutorial|guide|strategy|writing|draft|report|outline|code|debug|data|chart|plot)/i.test(text)) return 24576;
  if (text.length > 800 || /详细|深入|全面|系统|完整|展开|具体|多角度|深度|广度|thorough|detailed|comprehensive|in depth|deep dive/i.test(text)) return 24576;
  return 12288;
}

function shouldUseWebSearchReadable(message, canvas = {}, selectedContext = null) {
  const text = String(message || "").normalize("NFKC").trim();
  if (!text) return false;

  // Trivial / no-info-need patterns: identity meta, greetings, app commands, pure
  // creative writing or pure local code/math problems. These do NOT benefit from
  // web search and would just slow the reply down. Everything else defaults to
  // search ON, mirroring the official Qwen app's behaviour.
  const trivialChat = /^(你好|您好|嗨|喂|早上好|晚上好|晚安|再见|谢谢|多谢|不客气|hi+|hello|hey|good\s+(morning|night|evening)|thanks?|thank you|bye)\b/i.test(text)
    || text.length <= 4;
  if (trivialChat) return false;

  const identityMeta = /(你是谁|你叫什么|你能做什么|你是.*(模型|ai|助手)|介绍.*你自己|who\s+are\s+you|what\s+can\s+you\s+do|tell\s+me\s+about\s+yourself)/i.test(text);
  if (identityMeta) return false;

  // Canvas-only operations: zoom/pan/select/delete/move — no info-seek.
  const canvasOnly = /^(放大|缩小|居中|重置|聚焦|选中|取消选中|删除|移动|平移|对齐|整理|排版|关闭|打开|新建|新对话|清空|展开|收起|zoom|pan|focus|select|deselect|delete|move|arrange|tidy|open|close|new|reset)\b/i.test(text);
  if (canvasOnly) return false;

  // Pure creative writing / role-play — local generation, no search.
  const pureCreative = /^(写一(首|段|篇|个)|帮我写|创作一(首|段|篇)|扮演|角色扮演|continue\s+the\s+story|write\s+(me\s+)?a\s+(poem|story|song))/i.test(text);
  if (pureCreative) return false;

  // Pure code / math — local reasoning unless they explicitly ask for docs/refs.
  const pureCode = /^(解释一下这段|帮我看看(这段|这个)?(代码|程序|报错|bug)|debug|fix\s+this|why\s+does\s+this\s+(code|fn|function))/i.test(text);
  if (pureCode) return false;

  if (shouldForceWebSearchReadable(text)) return true;
  if (selectedContext?.type === "url" || selectedContext?.url) return true;
  if (/https?:\/\/[^\s)）\]】"'<>]+/i.test(text)) return true;
  const nodes = Array.isArray(canvas?.nodes) ? canvas.nodes : (Array.isArray(canvas?.visibleNodes) ? canvas.visibleNodes : []);
  if (nodes.some((node) => node?.type === "url" || node?.url || node?.sourceType === "url")) return true;
  return /(新闻|实时|今天|昨日|本周|今年|价格|股价|汇率|天气|政策|论文|文献|来源|资料|报名|考试时间|考点|考场|考位|证书|雅思|托福|四六级|考研|公务员|对比.*版本|最新|current|latest|news|price|weather|citation|reference|source|exam|test|ielts|toefl|certification|registration|test center)/i.test(text);
}

function shouldForceWebSearchReadable(message) {
  // forced_search is on by default once enable_search is on (see applyWebSearchMode),
  // so this only matters for callers that want to flip search ON for a query that
  // shouldUseWebSearchReadable would otherwise reject. Keep the explicit-keyword path.
  const text = String(message || "").normalize("NFKC");
  return /(请.*(联网|上网|搜索|搜一下|查一下|检索)|联网.*(搜索|查|找)|上网.*(搜索|查|找)|搜索.*(资料|网页|网站|链接|新闻|最新|官方|文档)|最新|官方文档|官方资料|引用来源|web\s*search|search\s+the\s+web|browse|lookup|internet)/i.test(text);
}

function shouldUseAgentModeReadable(message) {
  return /(agent|subagent|子代理|代理|自主|自动|连续任务|一系列|多步|分步|规划并执行|完成整个|帮我做完|long task|multi[-\s]?step)/i.test(String(message || "").normalize("NFKC"));
}

function shouldUseWebSearch(message, canvas = {}, selectedContext = null) {
  const text = String(message || "");
  if (/(联网|搜索|检索|查找|网页|网站|链接|url|最新|资料|reference|web|search|browse|lookup|internet)/i.test(text)) {
    return true;
  }
  if (selectedContext?.type === "url" || selectedContext?.url) return true;
  const nodes = Array.isArray(canvas?.nodes) ? canvas.nodes : (Array.isArray(canvas?.visibleNodes) ? canvas.visibleNodes : []);
  return nodes.some((node) => node?.type === "url" || node?.url || node?.sourceType === "url");
}

function shouldForceWebSearch(message) {
  return /(联网|上网|搜索|搜一下|查一下|检索|网页|网站|链接|最新|资料|引用|reference|web\s*search|search\s+the\s+web|browse|lookup|internet)/i.test(String(message || ""));
}

function shouldUseAgentMode(message) {
  return /(agent|代理|自主|自动|连续任务|一系列|多步|分步骤|规划并执行|完成整个|帮我做完|long task|multi[-\s]?step)/i.test(String(message || ""));
}

function isTimeoutError(error) {
  return error?.name === "AbortError" || /timeout|aborted/i.test(String(error?.message || ""));
}

function shouldRetryExploreWithoutThinking(error) {
  return isTimeoutError(error) || /json|empty text|returned empty|parse/i.test(String(error?.message || ""));
}

function appMode() {
  const modes = [runtimeConfigs.chat, runtimeConfigs.analysis, runtimeConfigs.image, runtimeConfigs.asr, runtimeConfigs.realtime, runtimeConfigs.deepthink].map((config) => roleHealth(config).mode);
  if (modes.every((mode) => mode === "demo")) return "demo";
  if (modes.some((mode) => mode === "demo")) return "mixed";
  return "api";
}

async function handleAsr(body, res) {
  const audioDataUrl = typeof body?.audioDataUrl === "string" ? body.audioDataUrl : "";
  if (!isAudioDataUrl(audioDataUrl)) {
    return sendJson(res, 400, { error: "audioDataUrl is required" });
  }

  if (isDemoRole(runtimeConfigs.asr)) {
    return sendJson(res, 200, {
      provider: "demo",
      model: runtimeConfigs.asr.model,
      text: ""
    });
  }

  const requestedLanguage = body?.language === "en" ? "en" : "zh";
  const configuredLanguage = runtimeConfigs.asr.options?.targetLanguage;
  const language = configuredLanguage === "zh" || configuredLanguage === "en" ? configuredLanguage : requestedLanguage;
  const text = await transcribeAudio(runtimeConfigs.asr, audioDataUrl, language);
  return sendJson(res, 200, {
    provider: "api",
    model: runtimeConfigs.asr.model,
    text
  });
}

async function handleRealtimeVoice(body, res) {
  const audioDataUrl = typeof body?.audioDataUrl === "string" ? body.audioDataUrl : "";
  const pcmBase64 = typeof body?.pcmBase64 === "string" ? body.pcmBase64 : "";
  if (!isAudioDataUrl(audioDataUrl) && !isBase64Payload(pcmBase64)) {
    return sendJson(res, 400, { error: "audioDataUrl or pcmBase64 is required" });
  }

  if (isDemoRole(runtimeConfigs.realtime)) {
    return sendJson(res, 200, {
      provider: "demo",
      model: runtimeConfigs.realtime.model,
      transcript: "",
      reply: "",
      actions: []
    });
  }

  const result = await realtimeVoiceCompletion(runtimeConfigs.realtime, {
    audioDataUrl,
    pcmBase64,
    sampleRate: Number(body?.sampleRate) || 16000,
    language: body?.language === "en" ? "en" : "zh",
    selectedContext: body?.selectedContext || null,
    analysis: normalizeChatAnalysis(body?.analysis),
    messages: normalizeChatMessages(body?.messages),
    canvas: body?.canvas && typeof body.canvas === "object" ? body.canvas : {}
  });

  return sendJson(res, 200, {
    provider: "api",
    model: runtimeConfigs.realtime.model,
    ...result
  });
}

async function handleDeepThink(body, res) {
  const message = typeof body?.message === "string" ? body.message.trim().slice(0, 32000) : "";
  const imageDataUrl = normalizeDataUrl(body?.imageDataUrl);
  const analysis = normalizeChatAnalysis(body?.analysis);
  const messages = normalizeChatMessages(body?.messages);
  const lang = body?.language === "en" ? "en" : "zh";
  const selectedContext = body?.selectedContext && typeof body.selectedContext === "object" ? body.selectedContext : null;
  const canvas = body?.canvas && typeof body.canvas === "object" ? body.canvas : {};
  const prompt = message || analysis.summary || analysis.title || (lang === "en" ? "Expand this canvas." : "扩展当前画布。");

  if (isDemoRole(runtimeConfigs.deepthink)) {
    return sendJson(res, 200, buildDemoDeepThinkPlan(prompt, lang, runtimeConfigs.deepthink.model));
  }

  if (isDashScopeDeepResearchConfig(runtimeConfigs.deepthink)) {
    return await handleDeepResearch({
      prompt,
      analysis,
      selectedContext,
      canvas,
      messages: messages.slice(-40),
      imageDataUrl,
      lang,
      stream: body?.stream === true
    }, res);
  }

  const payload = {
    temperature: typeof runtimeConfigs.deepthink.temperature === "number" ? runtimeConfigs.deepthink.temperature : 0.7,
    response_format: { type: "json_object" },
    enable_thinking: true,
    messages: [
      {
        role: "system",
        content: buildDeepThinkSystemPrompt(lang)
      },
      {
        role: "user",
        content: buildDeepThinkUserPrompt({
          prompt,
          analysis,
          selectedContext,
          canvas,
          messages: messages.slice(-40),
          lang
        })
      }
    ]
  };
  applyWebSearchMode(payload, runtimeConfigs.deepthink, true);

  let response;
  try {
    response = await chatCompletions(runtimeConfigs.deepthink, payload);
  } catch (error) {
    if (!/response_format|enable_thinking|unsupported|invalid/i.test(String(error?.message || ""))) {
      throw error;
    }
    const fallbackPayload = { ...payload };
    delete fallbackPayload.response_format;
    delete fallbackPayload.enable_thinking;
    response = await chatCompletions(runtimeConfigs.deepthink, fallbackPayload);
  }

  const text = collectChatContent(response).trim();
  const parsed = parseJsonFromText(text);
  const plan = normalizeDeepThinkPlan(parsed, prompt, lang);
  return sendJson(res, 200, {
    provider: "api",
    model: response?.model || runtimeConfigs.deepthink.model,
    thinkingContent: collectReasoningContent(response),
    ...plan
  });
}

async function handleDeepResearch(context, res) {
  if (context.stream) {
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no"
    });
    res.write("\n");
    try {
      const result = await runDashScopeDeepResearch(context, {
        onEvent(event) {
          writeSse(res, "research", event);
        }
      });
      writeSse(res, "final", result);
    } catch (error) {
      writeSse(res, "error", { error: error.message || "Deep research stream failed" });
    } finally {
      res.end();
    }
    return;
  }

  const result = await runDashScopeDeepResearch(context);
  return sendJson(res, 200, result);
}

async function handleImageSearch(body, res) {
  const query = typeof body?.query === "string" ? body.query.trim().slice(0, 500) : "";
  const imageDataUrl = normalizeDataUrl(body?.imageDataUrl);
  const lang = body?.language === "en" ? "en" : "zh";
  if (!query && !imageDataUrl) {
    return sendJson(res, 400, { error: "query or imageDataUrl is required" });
  }
  if (isDemoRole(runtimeConfigs.chat) || !isDashScopeQwenConfig(runtimeConfigs.chat)) {
    return sendJson(res, 200, buildDemoImageSearchResults(query, lang));
  }

  const result = await runQwenImageSearch({
    query,
    imageDataUrl,
    lang,
    limit: Math.max(1, Math.min(Number(body?.limit) || 8, 12))
  });
  return sendJson(res, 200, result);
}

async function handleChat(body, res) {
  const message = typeof body?.message === "string" ? body.message.trim().slice(0, 32000) : "";
  const imageDataUrl = normalizeDataUrl(body?.imageDataUrl);
  const analysis = normalizeChatAnalysis(body?.analysis);
  const messages = normalizeChatMessages(body?.messages);
  const thinkingMode = body?.thinkingMode === "thinking" ? "thinking" : "no-thinking";
  const sessionId = typeof body?.sessionId === "string" ? body.sessionId.trim() : "";
  const previousResponseId = typeof body?.previousResponseId === "string"
    ? body.previousResponseId.trim()
    : (typeof body?.previous_response_id === "string" ? body.previous_response_id.trim() : "");

  if (!message) {
    return sendJson(res, 400, { error: "message is required" });
  }

  if (isDemoRole(runtimeConfigs.chat)) {
    const actions = inferDemoChatActions(message);
    return sendJson(res, 200, {
      provider: "demo",
      model: runtimeConfigs.chat.model,
      reply: buildDemoChatReply(message, analysis),
      actions,
      thinkingContent: "",
      thinkingTrace: []
    });
  }

  const lang = body?.language === "en" ? "en" : "zh";
  const selectedContext = body?.selectedContext && typeof body.selectedContext === "object" ? body.selectedContext : null;
  const canvas = body?.canvas && typeof body.canvas === "object" ? body.canvas : {};
  let systemContext = typeof body?.systemContext === "string" ? body.systemContext.slice(0, 32000) : "";

  // Session-scoped RAG: retrieve relevant chunks before the LLM call.
  // Falls through silently when sessionId is missing or embeddings aren't configured.
  let retrieved = [];
  if (sessionId && isEmbeddingConfigured()) {
    try {
      retrieved = await retrieveContext({ sessionId, query: message, topK: 10, minScore: 0.18 });
      if (retrieved.length) {
        const ragBlock = formatContextForPrompt(retrieved, { maxChars: 5200, itemMaxChars: 900, lang });
        systemContext = systemContext
          ? `${systemContext}\n\n${ragBlock}`
          : ragBlock;
      }
    } catch (ragError) {
      console.warn("[handleChat] RAG retrieve failed:", ragError.message);
    }
  }

  const webSearchEnabled = shouldUseWebSearchReadable(message, canvas, selectedContext);
  const webSearchForced = shouldForceWebSearchReadable(message);
  const subagentsEnabled = body?.subagentsEnabled === true;
  const agentMode = subagentsEnabled && (body?.agentMode === true || shouldUseAgentModeReadable(message));
  const promptMessages = previousResponseId ? [] : messages;
  const context = buildChatSystemContext(lang, analysis, promptMessages);

  const content = [
    { type: "input_text", text: `${context}\n\n用户最新消息：${message}` }
  ];
  if (content[0]) {
    content[0].text = buildChatUserPrompt({
      message,
      analysis,
      selectedContext,
      canvas,
      messages: promptMessages,
      systemContext,
      thinkingMode,
      webSearchEnabled,
      agentMode,
      lang
    });
  }
  if (imageDataUrl) {
    content.push({ type: "input_image", image_url: imageDataUrl });
  }

  const chatPayload = buildChatResponsesPayload({
    instructions: buildChatSystemContext(lang, analysis, promptMessages),
    content,
    message,
    previousResponseId,
    webSearchEnabled: webSearchEnabled || webSearchForced,
    thinkingMode
  });
  applyChatQualityRequestOptions(chatPayload, runtimeConfigs.chat, message, {
    webSearchEnabled: webSearchEnabled || webSearchForced,
    agentMode
  });

  if (body?.stream === true) {
    return await handleChatStream({
      payload: chatPayload,
      message,
      thinkingMode,
      agentMode,
      lang,
      sessionId,
      retrievedCount: retrieved.length,
      webSearchEnabled: webSearchEnabled || webSearchForced
    }, res);
  }

  const response = responsesToChatCompletion(
    await qwenResponsesRequest(runtimeConfigs.chat, applyRequestOptions({
      model: runtimeConfigs.chat.model,
      ...chatPayload
    }, runtimeConfigs.chat)),
    runtimeConfigs.chat
  );

  const references = extractResponseReferences(response);
  const reply = normalizeCitationMarkers(collectChatContent(response).trim(), references);
  let actions = normalizeVoiceActions(extractToolCallActions(response));
  actions = ensureChatFallbackActionsClean(message, actions, reply);
  actions = mergeReferenceActions(actions, response, message, webSearchEnabled || webSearchForced);
  actions = enrichCanvasActions(actions, message, reply, lang);
  if (!agentMode) {
    actions = actions.filter((action) => action.type !== "create_agent");
  }
  const thinkingContent = thinkingMode === "thinking" ? collectReasoningContent(response) : "";
  const finalReply = finalizeChatReply(reply, actions, lang, references) || (lang === "en" ? "Got it. We can keep exploring from here." : "我读到了，我们可以继续从这里展开。");

  // Fire-and-forget: persist this turn into the session context pool.
  ingestChatTurn(sessionId, message, finalReply).catch((e) =>
    console.warn("[handleChat] chat turn ingest failed:", e.message)
  );

  return sendJson(res, 200, {
    provider: "api",
    model: runtimeConfigs.chat.model,
    reply: finalReply,
    actions,
    artifacts: buildChatArtifacts(response, actions, agentMode),
    thinkingContent,
    thinkingTrace: [],
    responseId: response.id || undefined,
    previousResponseId: response.id || undefined,
    references,
    retrievedContext: retrieved.length ? retrieved.length : undefined
  });
}

function buildChatResultFromResponse({ response, message, thinkingMode, agentMode, lang, streamedReasoning = "", webSearchEnabled = false }) {
  const references = extractResponseReferences(response);
  const reply = normalizeCitationMarkers(collectChatContent(response).trim(), references);
  let actions = normalizeVoiceActions(extractToolCallActions(response));
  actions = ensureChatFallbackActionsClean(message, actions, reply);
  actions = mergeReferenceActions(actions, response, message, webSearchEnabled);
  actions = enrichCanvasActions(actions, message, reply, lang);
  if (!agentMode) {
    actions = actions.filter((action) => action.type !== "create_agent");
  }
  const finalReply = finalizeChatReply(reply, actions, lang, references) || (lang === "en" ? "Got it. We can keep exploring from here." : "我读到了，我们可以继续从这里展开。");
  return {
    provider: "api",
    model: runtimeConfigs.chat.model,
    reply: finalReply,
    actions,
    artifacts: buildChatArtifacts(response, actions, agentMode),
    thinkingContent: thinkingMode === "thinking" ? (streamedReasoning || collectReasoningContent(response)) : "",
    thinkingTrace: [],
    responseId: response?.id || undefined,
    previousResponseId: response?.id || undefined,
    references
  };
}

function buildChatResponsesPayload({ instructions, content, message, previousResponseId, webSearchEnabled, thinkingMode, wrappedCanvasTool = false }) {
  const tools = buildResponsesTools(message, webSearchEnabled, { wrappedCanvasTool });
  const payload = {
    instructions,
    input: [
      {
        role: "user",
        content
      }
    ],
    tools,
    tool_choice: "auto"
  };
  if (previousResponseId) payload.previous_response_id = previousResponseId;
  applyReasoningMode(payload, runtimeConfigs.chat, thinkingMode);
  if (tools.some((tool) => tool.type === "web_search" || tool.type === "web_extractor" || tool.type === "code_interpreter")) {
    payload.enable_thinking = true;
  }
  return payload;
}

function buildResponsesTools(message, webSearchEnabled = false, options = {}) {
  const tools = [];
  if (webSearchEnabled) tools.push({ type: "web_search" });
  if (shouldUseWebExtractor(message)) tools.push({ type: "web_extractor" });
  if (shouldUseCodeInterpreter(message)) tools.push({ type: "code_interpreter" });
  if (!shouldSkipCanvasToolForCodeOnlyRequest(message)) {
    tools.push(options.wrappedCanvasTool ? RESPONSES_CANVAS_TOOL_SCHEMA_WRAPPED : RESPONSES_CANVAS_TOOL_SCHEMA);
  }
  return tools;
}

function shouldUseWebExtractor(message) {
  const text = String(message || "");
  return /https?:\/\/[^\s)）\]】"'<>]+/i.test(text) || /网页提取|提取网页|读取网页|网页内容|web\s*extract|extract\s+web|summari[sz]e\s+this\s+page/i.test(text);
}

function shouldUseCodeInterpreter(message) {
  const text = String(message || "");
  return /代码解释器|code\s*interpreter|python|数据分析|计算|统计|图表|表格|csv|xlsx|绘图|画图|plot|chart|calculate|analy[sz]e\s+data/i.test(text);
}

function shouldSkipCanvasToolForCodeOnlyRequest(message) {
  const text = String(message || "").normalize("NFKC");
  return shouldUseCodeInterpreter(text) && /(只给出结果|只输出结果|只回复结果|不要.*(画布|卡片|节点)|不需要.*(画布|卡片|节点)|不要调用画布|answer\s+only|result\s+only|no\s+canvas)/i.test(text);
}

function buildChatArtifacts(response, actions, agentMode = false) {
  const artifacts = buildAgentArtifacts(actions, agentMode);
  const references = extractResponseReferences(response);
  for (const reference of references.slice(0, 8)) {
    artifacts.push({
      type: reference.type || "web",
      title: reference.title || reference.url,
      summary: reference.description || "",
      url: reference.url,
      status: "reference"
    });
  }
  artifacts.push(...extractResponseArtifacts(response));
  const seen = new Set();
  return artifacts.filter((artifact) => {
    const key = `${artifact.type}:${artifact.url || artifact.title || artifact.summary}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 12);
}

function extractResponseReferences(response) {
  return dedupeReferences([
    ...extractReferencesFromObject(response),
    ...extractReferencesFromText(collectChatContent(response) || extractResponsesText(response))
  ]).filter((reference) => reference.url);
}

function normalizeCitationMarkers(reply, references = []) {
  if (!reply || !references.length) return reply;
  return String(reply).replace(/\[(\d{1,2})\]/g, (match, rawIndex) => {
    const index = Number(rawIndex);
    if (!Number.isInteger(index) || index < 1) return match;
    return `[ref_${index}]`;
  });
}

function extractResponseArtifacts(response) {
  const artifacts = [];
  walkJson(response, (item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return;
    const type = String(item.type || item.kind || item.name || "");
    const text = stringOr(item.output || item.text || item.content || item.logs || item.result || item.summary, "");
    if (/code_interpreter|python|execution|sandbox/i.test(type)) {
      artifacts.push({
        type: "code",
        title: stringOr(item.title || item.name, "Code Interpreter"),
        summary: text.slice(0, 420),
        url: stringOr(item.url || item.download_url || item.downloadUrl, ""),
        status: stringOr(item.status || type, "artifact")
      });
    }
    const fileName = stringOr(item.filename || item.file_name || item.fileName || item.name, "");
    const fileUrl = stringOr(item.url || item.download_url || item.downloadUrl || item.preview_url || item.previewUrl, "");
    if ((fileName || fileUrl) && /file|artifact|image|csv|chart|table/i.test(type)) {
      artifacts.push({
        type: /\.(png|jpe?g|webp|gif|svg)$/i.test(fileName || fileUrl) ? "image" : "file",
        title: fileName || stringOr(item.title, "Artifact"),
        summary: text.slice(0, 420),
        url: fileUrl,
        status: stringOr(item.status || type, "artifact")
      });
    }
  });
  return artifacts.filter((artifact) => artifact.summary || artifact.url).slice(0, 8);
}

function webSourceName(url) {
  try {
    return new URL(url).hostname.replace(/^www\./i, "");
  } catch {
    return "";
  }
}

function isUrlLikeText(value) {
  return /^https?:\/\//i.test(String(value || "").trim());
}

function titleFromWebUrl(url) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./i, "");
    const known = {
      "chinaielts.org": "雅思官方报名与评分信息",
      "ielts.org": "IELTS Official",
      "ielts.neea.edu.cn": "教育部教育考试院 IELTS",
      "zhuanlan.zhihu.com": "知乎专栏",
      "zhihu.com": "知乎"
    };
    const pathTitle = decodeURIComponent(parsed.pathname || "")
      .replace(/\.[a-z0-9]+$/i, "")
      .split(/[\/_-]+/)
      .map((part) => part.trim())
      .filter((part) => part && !/^\d+$/.test(part))
      .slice(-3)
      .join(" ");
    if (known[host]) return pathTitle ? `${known[host]}｜${pathTitle}` : known[host];
    return pathTitle || host;
  } catch {
    return "";
  }
}

function readableWebTitle(url, ...candidates) {
  const readable = candidates
    .map((item) => String(item || "").trim())
    .find((item) => item && !isUrlLikeText(item));
  return readable || titleFromWebUrl(url) || webSourceName(url) || "Web reference";
}

function webFaviconUrl(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}/favicon.ico`;
  } catch {
    return "";
  }
}

function enrichWebCardAction(action, message = "") {
  if (!action || !["create_web_card", "create_link"].includes(action.type) || !action.url) return action;
  const source = stringOr(action.content?.source, webSourceName(action.url));
  const title = readableWebTitle(action.url, action.content?.title, action.title).slice(0, 96);
  const candidateDescription = stringOr(action.content?.description || action.description || action.prompt || action.query, "");
  const description = stringOr(isUrlLikeText(candidateDescription) ? "" : candidateDescription, `参考来源：${source || action.url}。用于核实网页内容、来源背景和后续阅读。`).slice(0, 420);
  return {
    ...action,
    title,
    description,
    prompt: stringOr(action.prompt, description || message).slice(0, 1200),
    content: {
      ...(action.content && typeof action.content === "object" ? action.content : {}),
      title,
      url: action.url,
      description,
      source,
      faviconUrl: stringOr(action.content?.faviconUrl, webFaviconUrl(action.url))
    }
  };
}

function mergeReferenceActions(actions, response, message, webSearchEnabled = false) {
  const normalized = Array.isArray(actions) ? actions.map((action) => enrichWebCardAction(action, message)) : [];
  if (!webSearchEnabled) return normalized;

  const existingUrls = new Set(normalized.map((action) => stringOr(action?.url, "")).filter(Boolean));
  const references = dedupeReferences([
    ...extractReferencesFromObject(response),
    ...extractReferencesFromText(collectChatContent(response))
  ]).filter((reference) => reference.type !== "image" && reference.url);

  for (const reference of references.slice(0, 4)) {
    if (existingUrls.has(reference.url)) continue;
    existingUrls.add(reference.url);
    normalized.push(enrichWebCardAction({
      type: "create_web_card",
      title: stringOr(reference.title, reference.url).slice(0, 48),
      description: stringOr(reference.description, reference.url).slice(0, 260),
      prompt: stringOr(reference.description || reference.title, message).slice(0, 1200),
      query: deriveSearchQueryClean(message) || String(message || "").slice(0, 120),
      url: reference.url
    }, message));
  }

  return normalized;
}

function enrichCanvasActions(actions, message, reply = "", lang = "zh") {
  if (!Array.isArray(actions) || !actions.length) return actions;
  let expanded = [...actions];
  const planAction = actions.find((action) => action?.type === "create_plan" && Array.isArray(action?.content?.steps));
  if (planAction) {
    const splitPlan = shouldSplitPlanAction(planAction);
    const examOrLearning = isExamOrLearningRequest(message);
    const planningRequest = isPlanningRequest(message);
    if (splitPlan || examOrLearning || planningRequest) {
      const hasNote = actions.some((action) => action?.type === "create_note");
      const hasTodo = actions.some((action) => action?.type === "create_todo");
      const hasTimeline = actions.some((action) => action?.type === "create_timeline");
      const hasTable = actions.some((action) => action?.type === "create_table");
      expanded = [];
      for (const action of actions) {
        if (action !== planAction) {
          expanded.push(action);
          continue;
        }
        expanded.push(splitPlan ? buildCompactPlanAction(action, lang) : action);
        if (splitPlan && !hasNote) expanded.push(buildPlanDetailsNoteAction(action, lang));
        if ((splitPlan || examOrLearning || planningRequest) && !hasTodo) expanded.push(buildPlanTodoAction(action, lang));
        if ((planningRequest || splitPlan) && !hasTimeline) expanded.push(buildPlanTimelineAction(action, lang));
        if ((planningRequest || examOrLearning) && !hasTable) expanded.push(buildPlanTableAction(action, lang));
      }
      if (examOrLearning && !hasNote) {
        expanded.push(buildExamSupportNoteAction(message, reply, lang));
      }
    }
  }
  expanded = expandGeneralCanvasActions(expanded, message, reply, lang);
  return dedupeCanvasActions(expanded).slice(0, 10);
}

function shouldSplitPlanAction(action) {
  const steps = Array.isArray(action?.content?.steps) ? action.content.steps : [];
  if (steps.length > 8) return true;
  const details = steps.map((step) => stringOr(step?.description || step?.body || step?.text, ""));
  const totalDetailLength = details.reduce((sum, detail) => sum + detail.length, 0);
  const maxDetailLength = details.reduce((max, detail) => Math.max(max, detail.length), 0);
  return totalDetailLength > 3600 || maxDetailLength > 900;
}

function isExamOrLearningRequest(message) {
  return /(考试|备考|学习|证书|报名|考点|考场|考位|成绩|分数|雅思|托福|四六级|考研|公务员|certification|exam|test|ielts|toefl|gre|gmat|sat|act|registration|test center|study plan|learning path)/i.test(String(message || "").normalize("NFKC"));
}

function isPlanningRequest(message) {
  return /(计划|规划|方案|步骤|流程|路线图|日程|行程|旅行|旅游|攻略|安排|执行|落地|roadmap|workflow|schedule|itinerary|travel|trip|plan|milestone|implementation)/i.test(String(message || "").normalize("NFKC"));
}

function buildCompactPlanAction(action, lang) {
  const content = action.content && typeof action.content === "object" ? action.content : {};
  const steps = Array.isArray(content.steps) ? content.steps : [];
  const groups = groupPlanSteps(steps, 6);
  const compactSteps = groups.map((group) => {
    const start = group.start + 1;
    const end = group.end + 1;
    const firstTitle = stringOr(group.steps[0]?.title, lang === "en" ? "Phase" : "阶段");
    const details = group.steps.map((step, index) => {
      const title = stringOr(step?.title || step?.text, `${start + index}`);
      const time = stringOr(step?.time, "");
      const priority = stringOr(step?.priority, "");
      return [time ? `${time} ` : "", title, priority ? ` (${priority})` : ""].join("");
    }).join("; ");
    return {
      title: lang === "en" ? `${start}-${end}. ${firstTitle}` : `${start}-${end}. ${firstTitle}`,
      description: [
        details,
        lang === "en" ? "Detailed step notes are split into supporting cards." : "详细拆解已拆到支撑卡片中。"
      ].join("\n").slice(0, 900),
      time: stringOr(group.steps[0]?.time, ""),
      priority: stringOr(group.steps[0]?.priority, "")
    };
  });
  return {
    ...action,
    description: stringOr(action.description, content.summary || action.title || "").slice(0, 700),
    content: {
      ...content,
      summary: [
        stringOr(content.summary || action.description || action.prompt, ""),
        lang === "en" ? "This is a compact overview card; detailed resources/checklists are split into supporting cards." : "这是紧凑总览卡;详细资料、清单和说明已拆分到支撑卡片。"
      ].filter(Boolean).join("\n\n").slice(0, 1200),
      steps: compactSteps.length ? compactSteps : steps
    }
  };
}

function buildPlanDetailsNoteAction(action, lang) {
  const content = action.content && typeof action.content === "object" ? action.content : {};
  const steps = Array.isArray(content.steps) ? content.steps : [];
  const groups = groupPlanSteps(steps, 6);
  const sections = groups.map((group) => ({
    title: lang === "en"
      ? `Steps ${group.start + 1}-${group.end + 1}`
      : `步骤 ${group.start + 1}-${group.end + 1}`,
    body: group.steps.map((step, index) => {
      const number = group.start + index + 1;
      const title = stringOr(step?.title || step?.text, `${number}`);
      const time = stringOr(step?.time, "");
      const priority = stringOr(step?.priority, "");
      const description = stringOr(step?.description || step?.body || step?.text, "").slice(0, 700);
      const tips = Array.isArray(step?.tips) ? step.tips.map((tip) => String(tip || "").trim()).filter(Boolean).slice(0, 3) : [];
      return [
        `### ${number}. ${title}`,
        time ? `- ${lang === "en" ? "Time" : "时间"}: ${time}` : "",
        priority ? `- ${lang === "en" ? "Priority" : "优先级"}: ${priority}` : "",
        description,
        tips.length ? tips.map((tip) => `- ${tip}`).join("\n") : ""
      ].filter(Boolean).join("\n");
    }).join("\n\n")
  }));
  return {
    type: "create_note",
    title: lang === "en" ? `${action.title || "Plan"} details` : `${action.title || "计划"}｜详细拆解`,
    description: lang === "en" ? "Detailed notes split out from the oversized plan card." : "从超长计划卡中拆出的详细说明。",
    content: {
      sections,
      text: sections.map((section) => `## ${section.title}\n\n${section.body}`).join("\n\n").slice(0, 8000)
    }
  };
}

function buildPlanTodoAction(action, lang) {
  const steps = Array.isArray(action?.content?.steps) ? action.content.steps : [];
  const items = steps.slice(0, 16).map((step) => ({
    text: stringOr(step?.title || step?.text, "").slice(0, 180),
    done: false,
    priority: stringOr(step?.priority, ""),
    rationale: stringOr(step?.time || step?.description, "").slice(0, 220)
  })).filter((item) => item.text);
  return {
    type: "create_todo",
    title: lang === "en" ? `${action.title || "Plan"} checklist` : `${action.title || "计划"}｜执行清单`,
    description: lang === "en" ? "Operational checklist extracted from the plan." : "从计划中抽取的执行清单。",
    content: { items }
  };
}

function buildPlanTimelineAction(action, lang) {
  const steps = Array.isArray(action?.content?.steps) ? action.content.steps : [];
  const items = steps.slice(0, 16).map((step, index) => ({
    phase: stringOr(step?.time || step?.phase, `${index + 1}`),
    title: stringOr(step?.title || step?.text, `${index + 1}`).slice(0, 160),
    description: stringOr(step?.description || step?.body || step?.text, "").slice(0, 360)
  })).filter((item) => item.title);
  return {
    type: "create_timeline",
    title: lang === "en" ? `${action.title || "Plan"} timeline` : `${action.title || "计划"}｜时间线`,
    description: lang === "en" ? "Sequential timeline extracted from the plan." : "从计划中抽取的阶段/时间线。",
    content: { items }
  };
}

function buildPlanTableAction(action, lang) {
  const steps = Array.isArray(action?.content?.steps) ? action.content.steps : [];
  const columns = lang === "en" ? ["Stage", "Focus", "Details"] : ["阶段", "重点", "细节"];
  const rows = steps.slice(0, 12).map((step, index) => ({
    [columns[0]]: stringOr(step?.time || step?.phase, `${index + 1}`),
    [columns[1]]: stringOr(step?.title || step?.text, "").slice(0, 140),
    [columns[2]]: stringOr(step?.description || step?.body || step?.text, "").slice(0, 260)
  })).filter((row) => row[columns[1]] || row[columns[2]]);
  return {
    type: "create_table",
    title: lang === "en" ? `${action.title || "Plan"} overview table` : `${action.title || "计划"}｜概览表`,
    description: lang === "en" ? "Structured table extracted from the plan." : "从计划中抽取的结构化概览表。",
    content: { columns, rows }
  };
}

function expandGeneralCanvasActions(actions, message, reply, lang) {
  const reusable = actions.filter((action) => REUSABLE_CARD_ACTION_TYPES.includes(action?.type));
  if (!reusable.length) return actions;
  const requestText = String(message || "").normalize("NFKC");
  const body = [reply, message].map((item) => String(item || "").trim()).filter(Boolean).join("\n\n");
  const wantsArtifact = wantsCanvasArtifact(requestText);
  const typeNeedsBundle = isPlanningRequest(requestText) || isComparisonRequest(requestText) || isResearchRequest(requestText) || isDataOrCodeRequest(requestText) || isGeneralMultiCardRequest(requestText);
  const complex = body.length > 1200 || typeNeedsBundle || (wantsArtifact && (body.length > 900 || typeNeedsBundle));
  if (!complex || reusable.length >= 4) return actions;
  const has = (type) => actions.some((action) => action?.type === type);
  const additions = [];
  if (isPlanningRequest(requestText)) {
    if (!has("create_timeline")) additions.push(buildGenericTimelineAction(message, body, lang));
    if (!has("create_todo")) additions.push(buildGenericTodoAction(message, body, lang));
    if (!has("create_table")) additions.push(buildGenericTableAction(message, body, lang));
  } else if (isComparisonRequest(requestText)) {
    if (!has("create_comparison")) additions.push(buildGenericComparisonAction(message, body, lang));
    if (!has("create_metric")) additions.push(buildGenericMetricAction(message, body, lang));
    if (!has("create_todo")) additions.push(buildGenericTodoAction(message, body, lang));
  } else if (isResearchRequest(requestText)) {
    if (!has("create_quote")) additions.push(buildGenericQuoteAction(message, body, lang));
    if (!has("create_note")) additions.push(buildGenericNoteAction(message, body, lang));
    if (!has("create_table")) additions.push(buildGenericTableAction(message, body, lang));
  } else if (isDataOrCodeRequest(requestText)) {
    if (!has("create_table")) additions.push(buildGenericTableAction(message, body, lang));
    if (!has("create_note")) additions.push(buildGenericNoteAction(message, body, lang));
    if (!has("create_todo")) additions.push(buildGenericTodoAction(message, body, lang));
  } else {
    if (!has("create_note")) additions.push(buildGenericNoteAction(message, body, lang));
    if (!has("create_table")) additions.push(buildGenericTableAction(message, body, lang));
    if (!has("create_todo")) additions.push(buildGenericTodoAction(message, body, lang));
  }
  return [...actions, ...additions.filter(Boolean).slice(0, Math.max(0, 4 - reusable.length))];
}

function wantsCanvasArtifact(text) {
  return /(画布|卡片|节点|创建|新建|生成.*(卡片|节点)|保存成|放到画布|整理到画布|canvas|card|node|create|add|save.*card)/i.test(String(text || ""));
}

function isGeneralMultiCardRequest(text) {
  return /(详细|完整|系统|全面|深入|整理|总结|方案|攻略|研究|分析|对比|评估|写作|报告|数据|表格|资料|资源|风险|执行|落地|comprehensive|detailed|full|guide|research|analysis|compare|evaluate|report|resources|risks)/i.test(String(text || "").normalize("NFKC"));
}

function isComparisonRequest(text) {
  return /(分析|对比|比较|评估|优缺点|选择|决策|取舍|analysis|compare|comparison|evaluate|pros|cons|decision|tradeoff)/i.test(String(text || "").normalize("NFKC"));
}

function isResearchRequest(text) {
  return /(研究|资料|论文|文献|来源|引用|最新|官方|新闻|调研|research|source|citation|latest|official|news|literature)/i.test(String(text || "").normalize("NFKC"));
}

function isDataOrCodeRequest(text) {
  return /(代码|程序|bug|python|javascript|数据|表格|csv|图表|指标|code|debug|data|table|chart|metric|benchmark)/i.test(String(text || "").normalize("NFKC"));
}

function genericCardTitle(message, suffix, lang) {
  const base = deriveSearchQueryClean(message) || String(message || "").normalize("NFKC").slice(0, 36) || (lang === "en" ? "Result" : "结果");
  return `${base}｜${suffix}`.slice(0, 64);
}

function genericItemsFromText(text, limit = 8) {
  const items = extractFallbackListItems(text).slice(0, limit);
  if (items.length) return items;
  return String(text || "")
    .split(/[。！？.!?]\s*/)
    .map((part) => part.trim())
    .filter((part) => part.length > 8)
    .slice(0, limit)
    .map((part, index) => ({ title: `${index + 1}`, description: part.slice(0, 700) }));
}

function buildGenericNoteAction(message, text, lang) {
  const items = genericItemsFromText(text, 4);
  const sections = items.map((item) => ({ title: item.title, body: item.description || item.title }));
  return {
    type: "create_note",
    title: genericCardTitle(message, lang === "en" ? "notes" : "要点笔记", lang),
    description: lang === "en" ? "Supporting notes extracted from the answer." : "从回答中抽取的支撑笔记。",
    content: {
      sections,
      text: sections.map((section) => `## ${section.title}\n\n${section.body}`).join("\n\n").slice(0, 5000)
    }
  };
}

function buildGenericTodoAction(message, text, lang) {
  const items = genericItemsFromText(text, 10).map((item) => ({
    text: String(item.description || item.title).slice(0, 180),
    done: false,
    rationale: String(item.title || "").slice(0, 160)
  })).filter((item) => item.text);
  return {
    type: "create_todo",
    title: genericCardTitle(message, lang === "en" ? "checklist" : "执行清单", lang),
    description: lang === "en" ? "Follow-up checklist extracted from the answer." : "从回答中抽取的后续执行清单。",
    content: { items }
  };
}

function buildGenericTableAction(message, text, lang) {
  const columns = lang === "en" ? ["Item", "Details"] : ["项目", "细节"];
  const rows = genericItemsFromText(text, 8).map((item) => ({
    [columns[0]]: item.title,
    [columns[1]]: item.description || item.title
  }));
  return {
    type: "create_table",
    title: genericCardTitle(message, lang === "en" ? "table" : "结构化表格", lang),
    description: lang === "en" ? "Structured table extracted from the answer." : "从回答中抽取的结构化表格。",
    content: { columns, rows }
  };
}

function buildGenericTimelineAction(message, text, lang) {
  const items = genericItemsFromText(text, 10).map((item, index) => ({
    phase: `${index + 1}`,
    title: item.title,
    description: item.description || item.title
  }));
  return {
    type: "create_timeline",
    title: genericCardTitle(message, lang === "en" ? "timeline" : "时间线", lang),
    description: lang === "en" ? "Sequence/timeline extracted from the answer." : "从回答中抽取的顺序/阶段时间线。",
    content: { items }
  };
}

function buildGenericComparisonAction(message, text, lang) {
  const items = genericItemsFromText(text, 6).map((item) => ({
    title: item.title,
    summary: item.description || item.title
  }));
  return {
    type: "create_comparison",
    title: genericCardTitle(message, lang === "en" ? "comparison" : "对比", lang),
    description: lang === "en" ? "Comparison card extracted from the answer." : "从回答中抽取的比较/取舍卡。",
    content: { items }
  };
}

function buildGenericMetricAction(message, text, lang) {
  const metrics = genericItemsFromText(text, 6).map((item, index) => ({
    label: item.title || `${index + 1}`,
    value: String(item.description || item.title).slice(0, 80),
    note: String(item.description || "").slice(0, 220)
  }));
  return {
    type: "create_metric",
    title: genericCardTitle(message, lang === "en" ? "metrics" : "指标", lang),
    description: lang === "en" ? "Metric/benchmark card extracted from the answer." : "从回答中抽取的指标/基准卡。",
    content: { metrics }
  };
}

function buildGenericQuoteAction(message, text, lang) {
  const quotes = genericItemsFromText(text, 4).map((item) => ({
    text: String(item.description || item.title).slice(0, 700),
    source: String(item.title || "").slice(0, 120)
  }));
  return {
    type: "create_quote",
    title: genericCardTitle(message, lang === "en" ? "quotes" : "引用摘录", lang),
    description: lang === "en" ? "Quote/excerpt card extracted from the answer." : "从回答中抽取的引用/摘录卡。",
    content: { quotes }
  };
}

function buildExamSupportNoteAction(message, reply, lang) {
  const source = [message, reply].map((item) => String(item || "").trim()).filter(Boolean).join("\n\n").slice(0, 1600);
  const sections = lang === "en"
    ? [
        { title: "Official information to verify", body: "Check the official registration portal, available test dates, test centers/seats, fees, score release timing, ID requirements, and cancellation/rescheduling rules. Treat dates, centers, prices, and policies as time-sensitive." },
        { title: "Materials and practice resources", body: "Prioritize official sample tests, recent authentic practice books, scoring descriptors, vocabulary/error logs, listening/reading timed sets, speaking question banks, writing samples, and mock-test review templates." },
        { title: "Trend/risk signals", body: "Track recent changes in availability, scoring expectations, common weak sections, target-score gap, burnout risk, and whether the plan needs more diagnostic testing before committing to the exam date." },
        { title: "Context from this turn", body: source }
      ]
    : [
        { title: "官方信息核实", body: "核实官方报名入口、可选考试日期、考点/考位、费用、出分时间、证件要求、退改规则。考试时间、地点、价格和政策都属于时效信息,需要以官网为准。" },
        { title: "资料与练习资源", body: "优先准备官方样题、近期真题/剑桥雅思类资料、评分标准、词汇/错题本、听读限时训练、口语题库、写作范文与批改模板、模考复盘表。" },
        { title: "趋势与风险信号", body: "关注近期考位供给、目标分差距、薄弱科目、口语/写作评分预期、备考疲劳和是否需要先做诊断测试再锁定考试日期。" },
        { title: "本轮上下文", body: source }
      ];
  return {
    type: "create_note",
    title: lang === "en" ? "Exam resources and logistics" : "考试资料与后勤核实",
    description: lang === "en" ? "Supporting card for resources, official logistics, and verification points." : "用于补充资料、官方后勤信息和核实点的支撑卡。",
    content: {
      sections,
      text: sections.map((section) => `## ${section.title}\n\n${section.body}`).join("\n\n")
    }
  };
}

function groupPlanSteps(steps, maxGroups = 6) {
  const usable = Array.isArray(steps) ? steps : [];
  if (!usable.length) return [];
  const groupCount = Math.min(maxGroups, usable.length);
  const groupSize = Math.ceil(usable.length / groupCount);
  const groups = [];
  for (let start = 0; start < usable.length; start += groupSize) {
    const chunk = usable.slice(start, start + groupSize);
    groups.push({ start, end: start + chunk.length - 1, steps: chunk });
  }
  return groups;
}

function dedupeCanvasActions(actions) {
  const seen = new Set();
  const result = [];
  for (const action of actions) {
    if (!action?.type) continue;
    const key = `${action.type}:${action.url || action.title || action.query || JSON.stringify(action.content || {}).slice(0, 120)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(action);
  }
  return result;
}

async function handleChatStream({ payload, message, thinkingMode, agentMode, lang, sessionId = "", retrievedCount = 0, webSearchEnabled = false }, res) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no"
  });
  res.write("\n");
  try {
    const response = await streamQwenResponses(runtimeConfigs.chat, payload, {
      onReasoning(delta) {
        if (thinkingMode === "thinking") writeSse(res, "thinking", { delta });
      },
      onText(delta) {
        writeSse(res, "reply", { delta });
      }
    });
    const finalPayload = buildChatResultFromResponse({
      response,
      message,
      thinkingMode,
      agentMode,
      lang,
      streamedReasoning: response?.choices?.[0]?.message?.reasoning_content || "",
      webSearchEnabled
    });
    if (retrievedCount) finalPayload.retrievedContext = retrievedCount;
    ingestChatTurn(sessionId, message, finalPayload.reply || "").catch((e) =>
      console.warn("[handleChatStream] chat turn ingest failed:", e.message)
    );
    writeSse(res, "final", finalPayload);
  } catch (error) {
    writeSse(res, "error", { error: error.message || "Chat stream failed" });
  } finally {
    res.end();
  }
}

/**
 * Persist a single chat turn (user message + assistant reply) into the
 * session-scoped RAG pool. Designed for fire-and-forget invocation — silently
 * no-ops when sessionId is missing or embeddings aren't configured.
 */
async function ingestChatTurn(sessionId, userMessage, assistantReply) {
  if (!sessionId || !isEmbeddingConfigured()) return;
  const userText = typeof userMessage === "string" ? userMessage.trim() : "";
  const replyText = typeof assistantReply === "string" ? assistantReply.trim() : "";
  if (!userText && !replyText) return;
  const turnText = `用户：${userText}\n\n助手：${replyText}`.slice(0, 4000);
  await ingestSnippet({
    sessionId,
    kind: CONTEXT_KINDS.CHAT,
    text: turnText,
    sourceMeta: { role: "turn", at: new Date().toISOString() }
  });
}

async function handleRouteTask(body, res) {
  const content = body?.content || body?.text || body?.imageDataUrl || body?.url || "";
  const contentType = body?.contentType || "";
  const fileName = body?.fileName || "";
  const lang = body?.language === "en" ? "en" : "zh";
  const useLLM = body?.useLLM !== false;

  if (!content) {
    return sendJson(res, 400, { error: "content is required" });
  }

  let result;
  if (useLLM && !isDemoRole(runtimeConfigs.analysis)) {
    try {
      const classification = await classifyContent({ content, contentType, fileName, lang, config: runtimeConfigs.chat });
      const fallback = getFallbackTaskType({ contentType, fileName });
      result = resolveTaskType(classification, fallback);
    } catch (err) {
      console.warn("[handleRouteTask] classification failed, using fallback:", err.message);
      const fallback = getFallbackTaskType({ contentType, fileName });
      result = {
        taskType: fallback.taskType,
        confidence: 0,
        wasFallback: true,
        rationale: `Classification failed: ${err.message}`
      };
    }
  } else {
    const fallback = getFallbackTaskType({ contentType, fileName });
    result = {
      taskType: fallback.taskType,
      confidence: 0,
      wasFallback: true,
      rationale: useLLM ? "Demo mode: using fallback" : "LLM disabled by request"
    };
  }

  return sendJson(res, 200, result);
}

async function handleAnalyze(body, res) {
  const imageDataUrl = normalizeDataUrl(body?.imageDataUrl);
  const thinkingMode = body?.thinkingMode === "thinking" ? "thinking" : "no-thinking";
  if (!imageDataUrl) {
    return sendJson(res, 400, { error: "imageDataUrl is required" });
  }

  if (isDemoRole(runtimeConfigs.analysis)) {
    return sendJson(res, 200, buildDemoAnalysis(body?.fileName));
  }

  const lang = body?.language === "en" ? "en" : "zh";

  const { taskType, confidence, wasFallback } = await routeContent({
    content: imageDataUrl,
    contentType: body?.contentType || "image",
    fileName: body?.fileName,
    lang,
    config: runtimeConfigs.chat
  });
  console.log(`[route] ${taskType} (confidence: ${confidence}, fallback: ${wasFallback})`);

  const prompt = buildAnalysisPrompt(lang, taskType);

  const analysisPayload = {
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: imageDataUrl } }
        ]
      }
    ]
  };

  applyReasoningMode(analysisPayload, runtimeConfigs.analysis, thinkingMode);

  const response = await chatCompletions(runtimeConfigs.analysis, analysisPayload);
  const text = collectChatContent(response);
  const parsed = parseJsonFromText(text);
  const normalized = normalizeAnalysis(parsed, body?.fileName);
  normalized.provider = "api";
  normalized.model = response?.model || runtimeConfigs.analysis.model;
  normalized.taskType = taskType;
  return sendJson(res, 200, normalized);
}

function isValidPublicUrl(urlString) {
  if (typeof urlString !== "string" || !urlString.trim()) return false;
  if (urlString.length > 2048) return false;

  let parsed;
  try {
    parsed = new URL(urlString);
  } catch {
    return false;
  }

  // Reject non-http(s) protocols
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return false;
  }

  const hostname = parsed.hostname.toLowerCase();

  // Reject localhost and loopback
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "0.0.0.0") {
    return false;
  }

  // Reject private IP ranges
  if (/^(10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.|127\.)/.test(hostname)) {
    return false;
  }

  return true;
}

async function fetchPublicPageText(urlString) {
  if (!isValidPublicUrl(urlString)) return "";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(urlString, {
      headers: {
        "User-Agent": "ORYZAE/0.1 link-analyzer",
        Accept: "text/html, text/plain, application/xhtml+xml"
      },
      signal: controller.signal
    });
    if (!response.ok || !isValidPublicUrl(response.url || urlString)) return "";
    const contentType = response.headers.get("content-type") || "";
    if (!/text\/html|text\/plain|application\/xhtml\+xml/i.test(contentType)) return "";
    const contentLength = Number(response.headers.get("content-length") || 0);
    if (contentLength > 800000) return "";
    const raw = (await response.text()).slice(0, 220000);
    return htmlToReadableText(raw).slice(0, 12000);
  } finally {
    clearTimeout(timer);
  }
}

function htmlToReadableText(raw) {
  return String(raw || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<\/(p|div|section|article|header|footer|li|h[1-6]|br)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

async function handleAnalyzeExplore(body, res) {
  const imageDataUrl = normalizeDataUrl(body?.imageDataUrl);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  const dataUrl = typeof body?.dataUrl === "string" ? body.dataUrl.trim() : "";
  const url = typeof body?.url === "string" ? body.url.trim() : "";
  const fileName = typeof body?.fileName === "string" ? body.fileName.trim() : "";
  const thinkingMode = body?.thinkingMode === "thinking" ? "thinking" : "no-thinking";
  const sessionId = typeof body?.sessionId === "string" ? body.sessionId.trim() : "";

  const hasContent = imageDataUrl || text || dataUrl || url;
  if (!hasContent) {
    return sendJson(res, 400, { error: "imageDataUrl, text, dataUrl, or url is required" });
  }

  if (isDemoRole(runtimeConfigs.analysis)) {
    return sendJson(res, 200, buildDemoExplore(fileName));
  }

  const lang = body?.language === "en" ? "en" : "zh";

  const primaryContent = text || url || imageDataUrl || "";
  const contentType = body?.contentType || (imageDataUrl ? "image" : text ? "text" : url ? "url" : "text");

  const { taskType, confidence, wasFallback } = await routeContent({
    content: primaryContent,
    contentType,
    fileName,
    lang,
    config: runtimeConfigs.chat
  });
  console.log(`[route] ${taskType} (confidence: ${confidence}, fallback: ${wasFallback})`);

  const prompt = buildExplorePrompt(lang, taskType);

  let content;
  let pageText = "";
  let extractedText = "";
  try {
    pageText = url ? await fetchPublicPageText(url).catch(() => "") : "";
    if (dataUrl && fileName) {
      try {
        const parsed = parseDataUrl(dataUrl);
        const ext = extensionFromFileName(fileName) || parsed.ext || "";
        const result = extractTextFromBuffer(parsed.buffer, ext);
        extractedText = result?.text || "";
      } catch {
        extractedText = "";
      }
    }
    content = buildExploreContent({ prompt, imageDataUrl, url, pageText, text, dataUrl, fileName, parseDataUrl, extensionFromFileName, extractTextFromBuffer });
  } catch (parseErr) {
    return sendJson(res, 400, { error: parseErr.message || "Failed to parse uploaded file." });
  }

  const analysisPayload = {
    messages: [{ role: "user", content }]
  };

  applyReasoningMode(analysisPayload, runtimeConfigs.analysis, thinkingMode);
  applyWebSearchMode(analysisPayload, runtimeConfigs.analysis, Boolean(url));

  // Fire-and-forget: ingest whatever explorable text we have so subsequent
  // chats can recall what the user dropped on the canvas.
  const ingestExploreSources = () => {
    if (!sessionId || !isEmbeddingConfigured()) return;
    if (text && text.length > 30) {
      ingestText({
        sessionId,
        kind: CONTEXT_KINDS.NOTE,
        text,
        sourceId: `note:${Date.now()}`,
        sourceMeta: { fileName: fileName || "note" }
      }).catch((e) => console.warn("[handleAnalyzeExplore] note ingest failed:", e.message));
    }
    if (extractedText && extractedText.length > 30) {
      ingestText({
        sessionId,
        kind: CONTEXT_KINDS.FILE,
        text: extractedText,
        sourceId: `file:${fileName || "uploaded"}`,
        sourceMeta: { fileName: fileName || "uploaded" },
        replace: true
      }).catch((e) => console.warn("[handleAnalyzeExplore] file ingest failed:", e.message));
    }
    if (url && pageText && pageText.length > 50) {
      let domain = "";
      try { domain = new URL(url).hostname; } catch {}
      ingestText({
        sessionId,
        kind: CONTEXT_KINDS.WEB,
        text: pageText,
        sourceId: `url:${url}`,
        sourceMeta: { url, domain },
        replace: true
      }).catch((e) => console.warn("[handleAnalyzeExplore] web ingest failed:", e.message));
    }
  };

  try {
    const response = await chatCompletions(runtimeConfigs.analysis, analysisPayload, {
      timeoutMs: thinkingMode === "thinking" ? EXPLORE_THINKING_TIMEOUT_MS : CHAT_COMPLETION_TIMEOUT_MS
    });
    const text = collectChatContent(response);
    const parsed = parseJsonFromText(text);
    const normalized = normalizeExplore(parsed, fileName);
    normalized.provider = "api";
    normalized.model = response?.model || runtimeConfigs.analysis.model;
    normalized.taskType = taskType;
    ingestExploreSources();
    return sendJson(res, 200, normalized);
  } catch (error) {
    if (thinkingMode === "thinking" && shouldRetryExploreWithoutThinking(error)) {
      console.info("[handleAnalyzeExplore] thinking path failed, retrying without thinking:", error.message);
      try {
        const fallbackPayload = applyWebSearchMode(
          applyReasoningMode({ messages: analysisPayload.messages }, runtimeConfigs.analysis, "no-thinking"),
          runtimeConfigs.analysis,
          Boolean(url)
        );
        const response = await chatCompletions(runtimeConfigs.analysis, fallbackPayload, {
          timeoutMs: EXPLORE_FALLBACK_TIMEOUT_MS
        });
        const text = collectChatContent(response);
        const parsed = parseJsonFromText(text);
        const normalized = normalizeExplore(parsed, fileName);
        normalized.provider = "api";
        normalized.model = response?.model || runtimeConfigs.analysis.model;
        normalized.warningCode = "explore_fallback";
        normalized.taskType = taskType;
        ingestExploreSources();
        return sendJson(res, 200, normalized);
      } catch (fallbackError) {
        console.error("[handleAnalyzeExplore] fallback error:", fallbackError);
      }
    }
    console.error("[handleAnalyzeExplore] error:", error);
    return sendJson(res, 500, { error: "Explore analysis failed", message: error.message });
  }
}

async function handleAnalyzeUrl(body, res) {
  const url = typeof body?.url === "string" ? body.url.trim() : "";
  const thinkingMode = body?.thinkingMode === "thinking" ? "thinking" : "no-thinking";
  const sessionId = typeof body?.sessionId === "string" ? body.sessionId.trim() : "";

  if (!isValidPublicUrl(url)) {
    return sendJson(res, 400, { error: "Invalid URL. Only http:// and https:// links are supported." });
  }

  let domain;
  try {
    domain = new URL(url).hostname;
  } catch {
    return sendJson(res, 400, { error: "Invalid URL. Only http:// and https:// links are supported." });
  }

  if (isDemoRole(runtimeConfigs.analysis)) {
    const demo = buildDemoAnalysis(domain);
    demo.domain = domain;
    return sendJson(res, 200, demo);
  }

  const lang = body?.language === "en" ? "en" : "zh";
  const { taskType, confidence, wasFallback } = await routeContent({
    content: url,
    contentType: "url",
    fileName: domain,
    lang,
    config: runtimeConfigs.chat
  });
  console.log(`[route] ${taskType} (confidence: ${confidence}, fallback: ${wasFallback})`);

  const pageText = await fetchPublicPageText(url).catch(() => "");
  const prompt = buildUrlAnalysisPrompt({ url, domain, pageText });

  const analysisPayload = {
    messages: [
      {
        role: "user",
        content: prompt
      }
    ]
  };

  applyReasoningMode(analysisPayload, runtimeConfigs.analysis, thinkingMode);
  applyWebSearchMode(analysisPayload, runtimeConfigs.analysis, true);

  try {
    const response = await chatCompletions(runtimeConfigs.analysis, analysisPayload);
    const text = collectChatContent(response);
    const parsed = parseJsonFromText(text);
    const normalized = normalizeAnalysis(parsed, domain);
    normalized.provider = "api";
    normalized.model = response?.model || runtimeConfigs.analysis.model;
    normalized.taskType = taskType;
    normalized.domain = domain;

    // Fire-and-forget: ingest the page body so future chat turns can recall
    // it without re-fetching. Skipped if the page returned nothing useful.
    if (sessionId && pageText && pageText.length > 50 && isEmbeddingConfigured()) {
      ingestText({
        sessionId,
        kind: CONTEXT_KINDS.WEB,
        text: pageText,
        sourceId: `url:${url}`,
        sourceMeta: { url, domain, title: normalized?.title || domain },
        replace: true
      }).catch((e) => console.warn("[handleAnalyzeUrl] ingest failed:", e.message));
    }

    return sendJson(res, 200, normalized);
  } catch (error) {
    console.error("[handleAnalyzeUrl] error:", error);
    return sendJson(res, 500, { error: "URL analysis failed", message: error.message });
  }
}

async function handleAnalyzeText(body, res) {
  const fileName = typeof body?.fileName === "string" ? body.fileName.trim() : "";
  const safeFileName = fileName || "document";
  const thinkingMode = body?.thinkingMode === "thinking" ? "thinking" : "no-thinking";
  const sessionId = typeof body?.sessionId === "string" ? body.sessionId.trim() : "";

  let extractedText = "";
  let storedHash = null;

  if (typeof body?.text === "string" && body.text.trim().length >= 10) {
    extractedText = body.text.trim();
  } else if (typeof body?.dataUrl === "string" && body.dataUrl.startsWith("data:")) {
    try {
      const parsed = parseDataUrl(body.dataUrl);
      const ext = extensionFromFileName(safeFileName) || parsed.ext || "txt";
      const result = extractTextFromBuffer(parsed.buffer, ext);
      extractedText = result.text;

      // Store the original file for history browser
      try {
        const stored = await storeFile(parsed.buffer, { kind: "upload", ext });
        storedHash = stored.hash;
      } catch (storeErr) {
        console.error("[handleAnalyzeText] storeFile failed:", storeErr);
      }
    } catch (parseErr) {
      return sendJson(res, 400, { error: parseErr.message || "Failed to parse uploaded file." });
    }
  }

  if (!extractedText || extractedText.length < 10) {
    return sendJson(res, 400, { error: "File appears to be empty or unreadable." });
  }

  if (isDemoRole(runtimeConfigs.analysis)) {
    const demo = buildDemoAnalysis(safeFileName);
    if (storedHash) demo.sourceHash = storedHash;
    return sendJson(res, 200, demo);
  }

  const lang = body?.language === "en" ? "en" : "zh";
  const { taskType, confidence, wasFallback } = await routeContent({
    content: extractedText,
    contentType: body?.contentType || "text",
    fileName,
    lang,
    config: runtimeConfigs.chat
  });
  console.log(`[route] ${taskType} (confidence: ${confidence}, fallback: ${wasFallback})`);

  const prompt = buildTextAnalysisPrompt({ extractedText });

  const analysisPayload = {
    messages: [
      {
        role: "user",
        content: prompt
      }
    ]
  };

  applyReasoningMode(analysisPayload, runtimeConfigs.analysis, thinkingMode);

  const response = await chatCompletions(runtimeConfigs.analysis, analysisPayload);
  const text = collectChatContent(response);
  const parsed = parseJsonFromText(text);
  const normalized = normalizeAnalysis(parsed, safeFileName);
  normalized.provider = "api";
  normalized.model = response?.model || runtimeConfigs.analysis.model;
  normalized.taskType = taskType;
  if (storedHash) normalized.sourceHash = storedHash;

  // Fire-and-forget: ingest the extracted text into the session pool so
  // future chat turns can recall this document without resending it.
  if (sessionId && isEmbeddingConfigured()) {
    ingestText({
      sessionId,
      kind: CONTEXT_KINDS.FILE,
      text: extractedText,
      sourceId: storedHash || `file:${safeFileName}`,
      sourceMeta: { fileName: safeFileName, hash: storedHash || null },
      replace: true
    }).catch((e) => console.warn("[handleAnalyzeText] ingest failed:", e.message));
  }

  return sendJson(res, 200, normalized);
}

function extensionFromFileName(fileName) {
  if (!fileName) return "";
  const ext = fileName.split(".").pop()?.toLowerCase();
  return ext || "";
}

async function handleGenerate(body, res) {
  const imageDataUrl = normalizeDataUrl(body?.imageDataUrl);
  const maskDataUrl = normalizeDataUrl(body?.maskDataUrl);
  const sizeOverride = cleanSize(body?.size);
  const option = normalizeOption(body?.option);
  if (!imageDataUrl || !option) {
    return sendJson(res, 400, { error: "imageDataUrl and option are required" });
  }

  if (isDemoRole(runtimeConfigs.image)) {
    return sendJson(res, 200, {
      provider: "demo",
      model: runtimeConfigs.image.model,
      prompt: option.prompt,
      imageDataUrl: buildDemoImage(option)
    });
  }

  const lang = body?.language === "en" ? "en" : "zh";
  const prompt = buildGeneratePrompt(lang, option);

  // thinkingMode is accepted for consistency but image generation APIs don't support it directly.
  const result = isDashScopeQwenImageConfig(runtimeConfigs.image)
    ? await generateDashScopeQwenImage(prompt, body?.imageUrl || null, imageDataUrl, { maskDataUrl, size: sizeOverride })
    : await generateTokenHubImage(prompt, body?.imageUrl || null, imageDataUrl);

  const generatedImage = result.imageDataUrl || result.imageUrl || "";
  let stored = null;
  if (generatedImage) {
    try {
      stored = await storeGeneratedImage(generatedImage);
    } catch (storeError) {
      console.error("[handleGenerate] failed to store generated image:", storeError);
    }
  }

  return sendJson(res, 200, {
    provider: "api",
    model: runtimeConfigs.image.model,
    prompt,
    imageDataUrl: stored ? `/api/assets/${stored.hash}?kind=generated` : generatedImage,
    hash: stored ? stored.hash : undefined,
    imageUrl: result.imageUrl,
    revisedPrompt: result.revisedPrompt
  });
}

async function storeGeneratedImage(imageReference) {
  if (typeof imageReference !== "string" || !imageReference) {
    return null;
  }

  if (imageReference.startsWith("data:")) {
    return storeDataUrl(imageReference, { kind: "generated" });
  }

  if (!/^https?:\/\//i.test(imageReference)) {
    return null;
  }

  const response = await fetch(imageReference);
  if (!response.ok) {
    throw new Error(`Failed to download generated image ${response.status}: ${response.statusText}`);
  }

  const contentType = response.headers.get("content-type") || "";
  const ext = extensionFromContentType(contentType) || extensionFromUrl(imageReference) || "jpg";
  const buffer = Buffer.from(await response.arrayBuffer());
  return storeFile(buffer, { kind: "generated", ext });
}

async function ingestRemoteImageAsUpload(imageUrl) {
  if (typeof imageUrl !== "string" || !/^https?:\/\//i.test(imageUrl)) return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    const response = await fetch(imageUrl, { signal: controller.signal, headers: { "User-Agent": "ORYZAE-Search/1.0" } });
    clearTimeout(timeout);
    if (!response.ok) return null;
    const contentType = (response.headers.get("content-type") || "").split(";")[0].trim();
    if (contentType && !/^image\//i.test(contentType)) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    if (!buffer.length || buffer.length > 12 * 1024 * 1024) return null;
    const ext = extensionFromContentType(contentType) || extensionFromUrl(imageUrl) || "jpg";
    const stored = await storeFile(buffer, { kind: "upload", ext });
    return {
      hash: stored.hash,
      mimeType: contentType || stored.mimeType || "image/jpeg",
      fileSize: stored.size || buffer.length
    };
  } catch (error) {
    console.warn("[ingestRemoteImageAsUpload] failed:", imageUrl?.slice(0, 80), error?.message || error);
    return null;
  }
}

async function handleExplain(body, res) {
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
  const optionTitle = typeof body?.optionTitle === "string" ? body.optionTitle.trim() : "";
  const summary = typeof body?.summary === "string" ? body.summary.trim() : "";
  const thinkingMode = body?.thinkingMode === "thinking" ? "thinking" : "no-thinking";

  if (!prompt) {
    return sendJson(res, 400, { error: "prompt is required" });
  }

  const lang = body?.language === "en" ? "en" : "zh";

  if (isDemoRole(runtimeConfigs.chat)) {
    const demoExplanation = lang === "en"
      ? `This image was created in the "${optionTitle || "generation direction"}" direction. It preserves the core visual memory of the original image while introducing new composition and lighting, presenting a visual effect that ${summary ? summary.slice(0, 20) : "echoes the original image"}.`
      : `这张图片基于「${optionTitle || "生成方向"}」方向创作。画面保留了原图的核心视觉记忆，同时引入了新的构图与光影处理，整体呈现出 ${summary ? summary.slice(0, 20) : "与原图呼应"} 的视觉效果。`;
    return sendJson(res, 200, {
      provider: "demo",
      model: runtimeConfigs.chat.model,
      explanation: demoExplanation
    });
  }

  const context = buildExplainPrompt(lang, { prompt, optionTitle, summary });

  const explainPayload = {
    messages: [
      {
        role: "system",
        content: buildExplainSystemPrompt(lang)
      },
      {
        role: "user",
        content: context
      }
    ]
  };

  applyReasoningMode(explainPayload, runtimeConfigs.chat, thinkingMode);

  const response = await chatCompletions(runtimeConfigs.chat, explainPayload);

  const explanation = collectChatContent(response)?.trim() || "";
  return sendJson(res, 200, {
    provider: "api",
    model: runtimeConfigs.chat.model,
    explanation
  });
}

async function transcribeAudio(config, audioDataUrl, language) {
  if (isDashScopeLiveTranslateConfig(config)) {
    return dashScopeLiveTranslateTranscription(config, audioDataUrl, language);
  }

  const parsed = parseDataUrl(audioDataUrl);
  const ext = extensionFromMimeType(parsed.mimeType) || "webm";
  const form = new FormData();
  form.append("model", config.model);
  form.append("file", new Blob([parsed.buffer], { type: parsed.mimeType }), `speech.${ext}`);
  if (language === "zh" || language === "en") {
    form.append("language", language);
  }
  if (typeof config.temperature === "number") {
    form.append("temperature", String(config.temperature));
  }

  const response = await fetch(`${config.baseUrl}/audio/transcriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`
    },
    body: form
  });

  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { text };
  }

  if (!response.ok) {
    const detail = json?.error?.message || json?.message || text || response.statusText;
    throw new Error(`${config.role} API ${response.status}: ${detail}`);
  }

  return String(json?.text || json?.transcript || json?.data?.text || "").trim();
}

function isDashScopeLiveTranslateConfig(config) {
  return config.provider === "dashscope-livetranslate" || /^qwen3-livetranslate/i.test(config.model || "");
}

async function dashScopeLiveTranslateTranscription(config, audioDataUrl, language) {
  const audio = dashScopeInputAudioFromDataUrl(audioDataUrl);
  const targetLang = language === "en" ? "en" : "zh";
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "input_audio",
              input_audio: audio
            }
          ]
        }
      ],
      modalities: ["text"],
      stream: true,
      stream_options: { include_usage: false },
      translation_options: { target_lang: targetLang }
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`${config.role} API ${response.status}: ${detail || response.statusText}`);
  }

  const text = await collectStreamingChatText(response);
  return text.trim();
}

async function realtimeVoiceCompletion(config, context) {
  if (isDashScopeRealtimeConfig(config)) {
    return dashScopeRealtimeVoiceCompletion(config, context);
  }

  const audio = audioInputFromDataUrl(context.audioDataUrl);
  const instruction = buildRealtimeInstruction(context);

  const response = await chatCompletions(config, {
    temperature: typeof config.temperature === "number" ? config.temperature : 0.7,
    modalities: ["text"],
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: instruction },
          { type: "input_audio", input_audio: audio }
        ]
      }
    ]
  });

  const text = collectChatContent(response).trim();
  let parsed;
  try {
    parsed = parseJsonFromText(text);
  } catch {
    parsed = { transcript: "", reply: text, actions: [] };
  }

  return {
    transcript: stringOr(parsed?.transcript, ""),
    reply: stringOr(parsed?.reply, text),
    actions: normalizeVoiceActions(parsed?.actions || parsed?.action),
    audioDataUrl: extractVoiceAudioDataUrl(response)
  };
}

function isDashScopeRealtimeConfig(config) {
  return config.provider === "dashscope-realtime" || /^wss:\/\//i.test(config.baseUrl || "") || /omni.*realtime|realtime/i.test(config.model || "");
}

function normalizeChatThinkingTrace(value) {
  const raw = Array.isArray(value) ? value : (typeof value === "string" ? value.split(/\n+/) : []);
  return raw
    .map((item) => String(item || "").replace(/^[-*\d.\s]+/, "").trim())
    .filter(Boolean)
    .slice(0, 6)
    .map((item) => item.slice(0, 220));
}

function ensureChatFallbackActions(message, actions, reply = "") {
  const normalized = Array.isArray(actions) ? [...actions] : [];
  if (normalized.some((action) => action.type === "create_web_card")) return normalized;
  const requestText = String(message || "").normalize("NFKC");
  const wantsCard = requestText.includes("卡片") || /\bcard\b/i.test(requestText);
  const wantsWeb = /(网页|网站|链接|参考|联网|搜索|检索|查找|web|reference|search|url|link)/i.test(requestText);
  if (wantsCard && wantsWeb) {
    const query = deriveSearchQuery(message);
    normalized.push({
      type: "create_web_card",
      title: query.slice(0, 48) || "Web reference",
      description: String(reply || query).slice(0, 220),
      query,
      url: `https://www.google.com/search?q=${encodeURIComponent(query || message)}`
    });
  }
  return normalized;
}

function deriveSearchQuery(message) {
  return String(message || "")
    .replace(/请|帮我|给我|联网搜索|搜索|检索|查找|并|给出|创建|新建|生成|一个|一张|网页|网站|链接|参考|卡片|web|reference|card/gi, " ")
    .replace(/[，。,.!?！？:：；;]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 120);
}

const FALLBACK_KEYWORDS = {
  create_plan: /计划|日程|行程|规划|itinerary|schedule|plan/i,
  create_todo: /任务|待办|清单|checklist|todo|task list/i,
  create_note: /笔记|记录|备忘|note|jot down/i,
  create_weather: /天气|气温|forecast|weather/i,
  create_map: /地图|位置|地址|导航|map|location/i,
  create_link: /链接|收藏|书签|link|bookmark/i,
  create_code: /代码|脚本|程序|snippet|code/i,
  create_web_card: /网页|网站|联网|搜索|检索|web|search|reference/i,
  create_table: /表格|矩阵|清单表|数据表|table|matrix|spreadsheet/i,
  create_timeline: /时间线|里程碑|阶段|进度|timeline|milestone|chronology/i,
  create_comparison: /对比|比较|取舍|决策|comparison|compare|tradeoff|decision/i,
  create_metric: /指标|KPI|数据看板|度量|metric|kpi|dashboard|benchmark/i,
  create_quote: /引用|摘录|金句|原文|quote|excerpt|citation/i,
  zoom_in: /放大|zoom in|enlarge/i,
  zoom_out: /缩小|zoom out|shrink/i,
  reset_view: /重置视图|reset view|恢复默认视图/i
};

function ensureChatFallbackActionsClean(message, actions, reply = "") {
  const normalized = Array.isArray(actions) ? [...actions] : [];
  if (normalized.length > 0) return normalized;

  const requestText = String(message || "").normalize("NFKC");
  const combinedText = requestText + " " + String(reply || "").normalize("NFKC");
  const wantsArtifact = /(画布|卡片|节点|创建|新建|生成.*(卡片|节点)|保存成|放到画布|整理到画布|canvas|card|node|create|add|save.*card)/i.test(requestText);
  const matchedTypes = [];

  for (const [actionType, regex] of Object.entries(FALLBACK_KEYWORDS)) {
    if (regex.test(combinedText)) {
      if (isViewOnlyFallbackAction(actionType)) return [{ type: actionType }];
      if (!wantsArtifact) break;
      matchedTypes.push(actionType);
    }
  }
  if (!wantsArtifact) return normalized;
  const fallbackTypes = fallbackActionTypesForRequest(requestText, matchedTypes);
  const title = requestText.slice(0, 48);
  const url = extractFirstUrl(requestText);
  for (const actionType of fallbackTypes.slice(0, 4)) {
    const safeType = (actionType === "create_web_card" || actionType === "create_link") && !url ? "create_note" : actionType;
    const action = {
      type: safeType,
      title,
      description: reply || title,
      content: buildFallbackActionContent(safeType, title, reply || requestText)
    };
    if ((safeType === "create_web_card" || safeType === "create_link") && url) action.url = url;
    normalized.push(action);
  }
  return normalized;
}

function fallbackActionTypesForRequest(text, matchedTypes = []) {
  const primary = matchedTypes.find((type) => !isViewOnlyFallbackAction(type));
  if (isPlanningRequest(text)) return uniqueActionTypes([primary || "create_plan", "create_timeline", "create_todo", "create_table"]);
  if (isComparisonRequest(text)) return uniqueActionTypes([primary || "create_comparison", "create_metric", "create_todo"]);
  if (isResearchRequest(text)) return uniqueActionTypes([primary || "create_note", "create_quote", "create_table"]);
  if (isDataOrCodeRequest(text)) return uniqueActionTypes([primary || "create_table", "create_note", "create_todo"]);
  if (isGeneralMultiCardRequest(text)) return uniqueActionTypes([primary || "create_note", "create_table", "create_todo"]);
  return uniqueActionTypes([primary || "create_note"]);
}

function uniqueActionTypes(types) {
  return Array.from(new Set(types.filter(Boolean)));
}

function extractFirstUrl(text) {
  return String(text || "").match(/https?:\/\/[^\s"'<>，。]+/i)?.[0] || "";
}

function isViewOnlyFallbackAction(actionType) {
  return ["zoom_in", "zoom_out", "reset_view"].includes(actionType);
}

function buildFallbackActionContent(actionType, title, text) {
  const body = String(text || title || "").trim();
  if (!body) return undefined;
  if (actionType === "create_plan") {
    const steps = extractFallbackListItems(body)
      .slice(0, 8)
      .map((item, index) => ({
        title: item.title || `${index + 1}`,
        description: item.description || item.title || body.slice(0, 600)
      }));
    return {
      summary: body.slice(0, 900),
      steps: steps.length ? steps : [{ title: title || "Step 1", description: body.slice(0, 1200) }]
    };
  }
  if (actionType === "create_todo") {
    const items = extractFallbackListItems(body)
      .slice(0, 12)
      .map((item) => ({ text: item.description || item.title, done: false }));
    return { items: items.length ? items : [{ text: body.slice(0, 300), done: false }] };
  }
  if (actionType === "create_note") return { text: body.slice(0, 4000) };
  if (actionType === "create_code") {
    const code = body.match(/```[a-z0-9_-]*\n([\s\S]*?)```/i)?.[1] || body;
    return { language: "text", code: code.slice(0, 6000), explanation: body.slice(0, 1200) };
  }
  if (actionType === "create_table") {
    const items = extractFallbackListItems(body).slice(0, 8);
    return {
      columns: ["Item", "Details"],
      rows: (items.length ? items : [{ title, description: body.slice(0, 700) }]).map((item) => ({ Item: item.title, Details: item.description || item.title }))
    };
  }
  if (actionType === "create_timeline") {
    const items = extractFallbackListItems(body).slice(0, 8);
    return { items: (items.length ? items : [{ title, description: body.slice(0, 700) }]).map((item, index) => ({ phase: `${index + 1}`, title: item.title, description: item.description || item.title })) };
  }
  if (actionType === "create_comparison") {
    const items = extractFallbackListItems(body).slice(0, 6);
    return { items: (items.length ? items : [{ title, description: body.slice(0, 700) }]).map((item) => ({ title: item.title, summary: item.description || item.title })) };
  }
  if (actionType === "create_metric") return { metrics: [{ label: title || "Metric", value: body.slice(0, 80), note: body.slice(0, 400) }] };
  if (actionType === "create_quote") return { quotes: [{ text: body.slice(0, 900) }] };
  return undefined;
}

function extractFallbackListItems(text) {
  const lines = String(text || "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const items = [];
  for (const line of lines) {
    const cleaned = line.replace(/^#{1,6}\s+/, "").replace(/^[-*•]\s+/, "").replace(/^\d+[.)、]\s+/, "").trim();
    if (!cleaned || cleaned.length < 3) continue;
    const [rawTitle, ...rest] = cleaned.split(/[:：]\s*/);
    const description = rest.join("：").trim();
    items.push({
      title: rawTitle.slice(0, 80),
      description: (description || cleaned).slice(0, 700)
    });
  }
  return items;
}

function deriveSearchQueryClean(message) {
  return String(message || "")
    .normalize("NFKC")
    .replace(/请|帮我|给我|联网搜索|联网|上网|搜索|搜一下|查一下|检索|查找|并给出|创建|新建|生成|一张|一个|网页|网站|链接|资料|引用|参考|卡片|web|reference|card/gi, " ")
    .replace(/[，。、《》“”‘’（）()[\]{}?.!?！？:：；;]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 120);
}

function buildAgentArtifacts(actions, agentMode = false) {
  if (!agentMode) return [];
  const agentActions = Array.isArray(actions)
    ? actions.filter((action) => action?.type === "create_agent")
    : [];
  if (agentActions.length) {
    return agentActions.map((action, index) => ({
      type: "agent",
      title: action.title || action.nodeName || `Subagent ${index + 1}`,
      summary: action.description || action.prompt || action.query || "",
      status: "no-thinking"
    }));
  }
  return [{
    type: "agent",
    title: "Agent controller",
    summary: "Subagents are enabled for this turn. The controller completed the task without spawning a separate worker.",
    status: "ready"
  }];
}

function inferDemoChatActions(message) {
  const text = String(message || "").toLowerCase();
  const actions = [];
  if (/一键整理|整理画布|自动整理|arrange|layout/.test(text)) {
    actions.push({ type: "arrange_canvas" });
  }
  if (/保存|save/.test(text)) {
    actions.push({ type: "save_session" });
  }
  if (/新建对话|新的对话|new chat/.test(text)) {
    actions.push({ type: "new_chat" });
  }
  if (/历史对话|chat history/.test(text)) {
    actions.push({ type: "open_chat_history" });
  }
  if (/关闭对话|收起对话|close chat/.test(text)) {
    actions.push({ type: "close_chat" });
  }
  if (/打开对话|展开对话|open chat/.test(text)) {
    actions.push({ type: "open_chat" });
  }
  if (/深入研究|深度思考|deep think|deep research/.test(text)) {
    actions.push({ type: "set_deep_think_mode", mode: "on" });
  }
  if (/上传|添加文件|open upload/.test(text)) {
    actions.push({ type: "open_upload" });
  }
  if (/image search|reverse image|visual reference|搜图|以图搜图|相似图片|视觉参考/.test(text)) {
    actions.push({ type: "image_search", query: String(message || "").slice(0, 240) });
  }
  return normalizeVoiceActions(actions).slice(0, 3);
}

async function dashScopeRealtimeVoiceCompletion(config, context) {
  const pcmBase64 = context.pcmBase64 || pcmBase64FromAudioDataUrl(context.audioDataUrl);
  const instruction = buildRealtimeInstruction(context);
  const events = await runDashScopeRealtimeTurn(config, pcmBase64, instruction);
  const transcript = events.inputTranscript.trim();
  const responseText = (events.text || events.audioTranscript).trim();
  const audioDataUrl = events.audioChunks?.length ? wavDataUrlFromPcm16Chunks(events.audioChunks, 24000) : "";
  let parsed;
  try {
    parsed = parseJsonFromText(responseText);
  } catch {
    parsed = { transcript, reply: responseText, actions: [] };
  }

  return {
    transcript: stringOr(parsed?.transcript, transcript),
    reply: stringOr(parsed?.reply, responseText),
    actions: normalizeVoiceActions(parsed?.actions || parsed?.action),
    audioDataUrl
  };
}

function runDashScopeRealtimeTurn(config, pcmBase64, instruction) {
  return new Promise((resolve, reject) => {
    const url = `${config.baseUrl.replace(/\/+$/, "")}?model=${encodeURIComponent(config.model)}`;
    const ws = new WebSocket(url, {
      headers: { Authorization: `Bearer ${config.apiKey}` }
    });
    const chunks = splitBuffer(Buffer.from(pcmBase64, "base64"), 3200);
    const result = { inputTranscript: "", text: "", audioTranscript: "", audioChunks: [] };
    let settled = false;
    let audioSent = false;

    const timer = setTimeout(() => {
      finish(new Error(`${config.role} API timeout waiting for realtime response.`));
    }, 45000);

    function finish(error) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        ws.close();
      } catch {
        // Ignore close errors.
      }
      if (error) reject(error);
      else resolve(result);
    }

    function send(event) {
      ws.send(JSON.stringify({
        event_id: `event_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        ...event
      }));
    }

    function sendAudioTurn() {
      if (audioSent) return;
      audioSent = true;
      for (const chunk of chunks) {
        send({ type: "input_audio_buffer.append", audio: chunk.toString("base64") });
      }
      send({ type: "input_audio_buffer.commit" });
      send({ type: "response.create" });
    }

    ws.on("open", () => {
      const outputAudio = config.options?.outputAudio === true;
      const session = {
        modalities: outputAudio ? ["text", "audio"] : ["text"],
        instructions: instruction,
        input_audio_format: "pcm",
        output_audio_format: "pcm",
        input_audio_transcription: { model: "qwen3-asr-flash-realtime" },
        turn_detection: null
      };
      if (outputAudio) {
        session.voice = cleanString(config.options?.voice, 64) || "Ethan";
      }
      if (config.options?.enableSearch === true) {
        session.enable_search = true;
        session.search_options = { enable_source: true };
      }
      if (config.options?.smoothOutput === true || config.options?.smoothOutput === false) {
        session.smooth_output = config.options.smoothOutput;
      }
      if (typeof config.temperature === "number") {
        session.temperature = config.temperature;
      }
      if (typeof config.options?.top_p === "number") {
        session.top_p = config.options.top_p;
      }
      send({
        type: "session.update",
        session
      });
    });

    ws.on("message", (data) => {
      let event;
      try {
        event = JSON.parse(data.toString());
      } catch {
        return;
      }

      switch (event.type) {
        case "error":
          finish(new Error(event.error?.message || JSON.stringify(event.error || event)));
          break;
        case "session.updated":
          sendAudioTurn();
          break;
        case "conversation.item.input_audio_transcription.completed":
          result.inputTranscript = event.transcript || result.inputTranscript;
          break;
        case "response.text.delta":
          result.text += event.delta || "";
          break;
        case "response.audio_transcript.delta":
          result.audioTranscript += event.delta || "";
          break;
        case "response.audio_transcript.done":
          if (event.transcript && !result.audioTranscript) result.audioTranscript = event.transcript;
          break;
        case "response.audio.delta":
          if (event.delta) result.audioChunks.push(event.delta);
          break;
        case "response.done":
          finish();
          break;
        default:
          break;
      }
    });

    ws.on("error", (error) => finish(error));
    ws.on("close", () => {
      if (!settled && audioSent) finish();
    });
  });
}

function splitBuffer(buffer, size) {
  const chunks = [];
  for (let i = 0; i < buffer.length; i += size) {
    chunks.push(buffer.subarray(i, i + size));
  }
  return chunks;
}

function wavDataUrlFromPcm16Chunks(base64Chunks, sampleRate = 24000) {
  const pcm = Buffer.concat(
    base64Chunks
      .filter((chunk) => typeof chunk === "string" && chunk)
      .map((chunk) => Buffer.from(chunk, "base64"))
  );
  if (!pcm.length) return "";
  const header = Buffer.alloc(44);
  const byteRate = sampleRate * 2;
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return `data:audio/wav;base64,${Buffer.concat([header, pcm]).toString("base64")}`;
}

function pcmBase64FromAudioDataUrl(audioDataUrl) {
  const parsed = parseDataUrl(audioDataUrl);
  if (audioFormatFromMimeType(parsed.mimeType) !== "pcm") {
    throw new Error("DashScope realtime requires 16kHz 16-bit mono PCM audio.");
  }
  return parsed.buffer.toString("base64");
}

function audioInputFromDataUrl(audioDataUrl) {
  const match = /^data:([^;,]+)(?:;[^,]*)?;base64,([a-zA-Z0-9+/=]+)$/i.exec(audioDataUrl);
  if (!match) {
    throw new Error("Invalid audio data URL.");
  }
  return {
    data: match[2],
    format: audioFormatFromMimeType(match[1])
  };
}

function dashScopeInputAudioFromDataUrl(audioDataUrl) {
  const match = /^data:([^;,]+)(?:;[^,]*)?;base64,[a-zA-Z0-9+/=]+$/i.exec(audioDataUrl);
  if (!match) {
    throw new Error("Invalid audio data URL.");
  }
  return {
    data: audioDataUrl,
    format: audioFormatFromMimeType(match[1])
  };
}

function audioFormatFromMimeType(mimeType) {
  const normalized = String(mimeType || "").split(";")[0].trim().toLowerCase();
  return {
    "audio/wav": "wav",
    "audio/wave": "wav",
    "audio/x-wav": "wav",
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
    "audio/mp4": "mp4",
    "audio/m4a": "m4a",
    "audio/webm": "webm",
    "audio/ogg": "ogg",
    "audio/pcm": "pcm",
    "audio/l16": "pcm"
  }[normalized] || "webm";
}

const VOICE_ACTION_TYPES = new Set(CANVAS_ACTION_TYPES);

function normalizedActionString(value, maxLength = 160) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : undefined;
}

function normalizedActionNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function normalizeVoiceActions(value) {
  const raw = Array.isArray(value) ? value : (value ? [value] : []);
  return raw
    .map((action) => {
      if (typeof action === "string") return { type: action };
      if (!action || typeof action !== "object") return null;
      const normalized = {
        type: String(action.type || action.name || "").trim(),
        nodeId: normalizedActionString(action.nodeId, 120),
        parentNodeId: normalizedActionString(action.parentNodeId, 120),
        anchorNodeId: normalizedActionString(action.anchorNodeId, 120),
        nodeName: normalizedActionString(action.nodeName || action.nameText, 160),
        parentNodeName: normalizedActionString(action.parentNodeName, 160),
        anchorNodeName: normalizedActionString(action.anchorNodeName, 160),
        target: normalizedActionString(action.target, 160),
        title: normalizedActionString(action.title, 120),
        description: normalizedActionString(action.description, 700),
        prompt: normalizedActionString(action.prompt, 1600),
        query: normalizedActionString(action.query, 360),
        url: normalizedActionString(action.url, 512),
        position: normalizedActionString(action.position, 60),
        direction: normalizedActionString(action.direction, 60),
        mode: normalizedActionString(action.mode, 80),
        scope: normalizedActionString(action.scope, 80),
        nodeType: normalizedActionString(action.nodeType, 40) || undefined,
        content: action.content || undefined,
        x: normalizedActionNumber(action.x),
        y: normalizedActionNumber(action.y),
        dx: normalizedActionNumber(action.dx),
        dy: normalizedActionNumber(action.dy),
        scale: normalizedActionNumber(action.scale),
        amount: normalizedActionNumber(action.amount)
      };
      Object.keys(normalized).forEach((key) => {
        if (normalized[key] === undefined) delete normalized[key];
      });
      return normalized;
    })
    .filter((action) => action && VOICE_ACTION_TYPES.has(action.type));
}

function normalizeDeepThinkActions(value) {
  return normalizeVoiceActions(value).slice(0, 6);
}

function extractVoiceAudioDataUrl(response) {
  const audio =
    response?.choices?.[0]?.message?.audio ||
    response?.audio ||
    response?.output_audio ||
    null;
  const data = audio?.data || audio?.b64_json || audio?.content;
  if (typeof data !== "string" || !data) return "";
  const format = audio?.format || "wav";
  const mime = {
    mp3: "audio/mpeg",
    mpeg: "audio/mpeg",
    wav: "audio/wav",
    webm: "audio/webm",
    ogg: "audio/ogg",
    mp4: "audio/mp4"
  }[String(format).toLowerCase()] || "audio/wav";
  return `data:${mime};base64,${data}`;
}

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
    zh ? `用户目标：${prompt}` : `User goal: ${prompt}`,
    "",
    zh ? "当前图像/文件分析：" : "Current image/file analysis:",
    JSON.stringify(analysis || {}, null, 2).slice(0, 16000),
    "",
    zh ? "当前选中卡片：" : "Selected canvas card:",
    selectedContext ? JSON.stringify(selectedContext, null, 2).slice(0, 8000) : "None",
    "",
    zh ? "可见画布状态：" : "Visible canvas state:",
    JSON.stringify(canvas || {}, null, 2).slice(0, 32000),
    "",
    zh ? "最近对话：" : "Recent dialogue:",
    JSON.stringify(messages || [], null, 2).slice(0, 12000)
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
      incremental_output: true,
      enable_feedback: false,
      output_format: "model_summary_report"
    }
  };
}

async function runDashScopeDeepResearch(context, options = {}) {
  let payload = buildDeepResearchPayload(context, true);
  let response;
  try {
    response = await dashScopeNativeGenerationRequest(runtimeConfigs.deepthink, payload, {
      timeoutMs: DEEP_RESEARCH_TIMEOUT_MS
    });
  } catch (error) {
    if (!context.imageDataUrl || !/image|content|invalid|unsupported|base64/i.test(String(error?.message || ""))) {
      throw error;
    }
    payload = buildDeepResearchPayload(context, false);
    response = await dashScopeNativeGenerationRequest(runtimeConfigs.deepthink, payload, {
      timeoutMs: DEEP_RESEARCH_TIMEOUT_MS
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
  const timeoutMs = Number(options.timeoutMs || DEEP_RESEARCH_TIMEOUT_MS);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
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
      throw new Error(`${config.role} API timeout after ${Math.round(timeoutMs / 1000)}s`);
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
  const eventCards = buildDeepResearchEventCards(collected.events, context.lang);
  const referenceCards = references.slice(0, 6).map((reference, index) => ({
    id: `deep-reference-${index + 1}-${slug(reference.title || reference.url || "reference")}`,
    type: reference.type === "image" ? "image" : "web",
    title: stringOr(reference.title, reference.url || "Reference").slice(0, 48),
    summary: stringOr(reference.description, reference.url || "").slice(0, 240),
    prompt: stringOr(reference.description || reference.title, context.prompt).slice(0, 1200),
    query: context.prompt,
    url: stringOr(reference.url || reference.sourceUrl, "").slice(0, 512)
  }));
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
    query: context.prompt
  };
  const cards = [...eventCards, ...referenceCards, reportCard].slice(0, 8);
  const links = cards.slice(1).map((_, index) => ({ from: 0, to: index + 1, label: "" }));
  return {
    provider: "api",
    model: collected.model || runtimeConfigs.deepthink.model,
    reply,
    cards,
    links,
    references,
    researchEvents: collected.events.slice(-40),
    thinkingContent: collected.thinkingContent,
    actions: []
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

async function runQwenImageSearch({ query, imageDataUrl, lang, limit }) {
  const prompt = query || (lang === "en" ? "Find visually similar images and useful visual references." : "搜索相似图片和可参考的视觉素材。");
  const content = [{ type: "input_text", text: prompt }];
  if (imageDataUrl) content.push({ type: "input_image", image_url: imageDataUrl });
  const basePayload = {
    model: IMAGE_SEARCH_MODEL,
    input: imageDataUrl ? [{ role: "user", content }] : prompt
  };
  let responseJson;
  let lastError;
  const toolTypes = imageDataUrl ? ["image_search", "web_search_image"] : ["web_search_image", "image_search"];
  for (const toolType of toolTypes) {
    try {
      responseJson = await qwenResponsesRequest(runtimeConfigs.chat, {
        ...basePayload,
        tools: [{ type: toolType }]
      });
      break;
    } catch (error) {
      lastError = error;
    }
  }
  if (!responseJson && lastError) throw lastError;
  const summary = extractResponsesText(responseJson);
  const references = dedupeReferences([
    ...extractReferencesFromObject(responseJson),
    ...extractReferencesFromText(summary)
  ]);
  const results = references
    .filter((reference) => reference.type === "image" || reference.imageUrl || reference.url)
    .slice(0, limit)
    .map((reference, index) => ({
      id: `image-search-${index + 1}`,
      title: stringOr(reference.title, query || "Image reference").slice(0, 80),
      description: stringOr(reference.description, summary).slice(0, 240),
      imageUrl: stringOr(reference.imageUrl || reference.url, ""),
      sourceUrl: stringOr(reference.sourceUrl || reference.url, ""),
      url: stringOr(reference.sourceUrl || reference.url, ""),
      type: "image"
    }));

  await Promise.all(results.map(async (result) => {
    const remoteImage = result.imageUrl;
    if (!remoteImage || !/^https?:\/\//i.test(remoteImage)) return;
    const stored = await ingestRemoteImageAsUpload(remoteImage);
    if (stored?.hash) {
      result.imageHash = stored.hash;
      result.localImageUrl = `/api/assets/${stored.hash}?kind=upload`;
      result.mimeType = stored.mimeType;
      result.fileSize = stored.fileSize;
    }
  }));

  return {
    provider: "api",
    model: IMAGE_SEARCH_MODEL,
    query: prompt,
    summary,
    results
  };
}

async function qwenResponsesRequest(config, payload) {
  const response = await fetch(`${qwenResponsesBaseUrl(config)}/responses`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  if (!response.ok) {
    const detail = json?.error?.message || json?.message || text || response.statusText;
    throw new Error(`${config.role} Responses API ${response.status}: ${detail}`);
  }
  return json;
}

async function streamQwenResponses(config, payload, options = {}) {
  const requestPayload = applyRequestOptions({
    model: config.model,
    ...payload,
    stream: true
  }, config);
  const timeoutMs = Number(options.timeoutMs || CHAT_STREAM_IDLE_TIMEOUT_MS || CHAT_COMPLETION_TIMEOUT_MS);
  const controller = new AbortController();
  let timer = null;
  const refreshTimeout = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      controller.abort();
    }, timeoutMs);
  };
  refreshTimeout();

  let response;
  try {
    response = await fetch(`${qwenResponsesBaseUrl(config)}/responses`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestPayload),
      signal: controller.signal
    });
  } catch (error) {
    if (timer) clearTimeout(timer);
    if (error?.name === "AbortError") {
      throw new Error(`${config.role} stream timed out after ${Math.round(timeoutMs / 1000)}s without new output`);
    }
    throw error;
  }

  if (!response.ok) {
    if (timer) clearTimeout(timer);
    const detail = await response.text().catch(() => response.statusText);
    throw new Error(`${config.role} Responses API ${response.status}: ${detail || response.statusText}`);
  }

  try {
    const collected = await collectStreamingResponsesPayload(response, {
      ...options,
      onActivity() {
        refreshTimeout();
        options.onActivity?.();
      }
    });
    return responsesToChatCompletion(collected.response || {}, config, collected);
  } catch (error) {
    if (error?.name === "AbortError" || /abort/i.test(String(error?.message || ""))) {
      throw new Error(`${config.role} stream timed out after ${Math.round(timeoutMs / 1000)}s without new output`);
    }
    throw error;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function collectStreamingResponsesPayload(response, options = {}) {
  if (!response.body) return { content: "", reasoning: "", model: "", toolCalls: [], response: null };

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";
  let reasoning = "";
  let model = "";
  let completedResponse = null;
  const toolCalls = new Map();

  function getToolCall(key) {
    const normalizedKey = key || "0";
    if (!toolCalls.has(normalizedKey)) {
      toolCalls.set(normalizedKey, {
        id: normalizedKey,
        type: "function",
        function: { name: "", arguments: "" }
      });
    }
    return toolCalls.get(normalizedKey);
  }

  function captureFunctionCall(item, fallbackKey = "") {
    if (!item || typeof item !== "object") return;
    const name = item.name || item.function?.name || "";
    const args = item.arguments ?? item.function?.arguments;
    if (name !== "canvas_action") return;
    const key = item.call_id || item.callId || item.id || fallbackKey || String(toolCalls.size);
    const call = getToolCall(key);
    call.id = key;
    call.function.name = name;
    if (args !== undefined) {
      call.function.arguments = typeof args === "string" ? args : JSON.stringify(args || {});
    }
  }

  function consumeData(eventName, data) {
    if (!data || data === "[DONE]") return;
    let chunk;
    try {
      chunk = JSON.parse(data);
    } catch {
      return;
    }
    options.onActivity?.();
    if (chunk?.model) model = chunk.model;
    if (chunk?.response) {
      completedResponse = chunk.response;
      if (chunk.response?.model) model = chunk.response.model;
    }
    if (/response\.completed|completed|done/i.test(eventName) && chunk?.id && chunk?.output) {
      completedResponse = chunk;
    }

    const reasoningDelta = extractResponsesReasoningDelta(eventName, chunk) || extractStreamingReasoningDelta(chunk);
    const textDelta = reasoningDelta ? "" : (extractResponsesTextDelta(eventName, chunk) || extractStreamingTextDelta(chunk));
    if (textDelta) {
      content += textDelta;
      options.onText?.(textDelta);
    }
    if (reasoningDelta) {
      reasoning += reasoningDelta;
      options.onReasoning?.(reasoningDelta);
    }

    const item = chunk.item || chunk.output_item || chunk.response?.output_item;
    captureFunctionCall(item, chunk.item_id || chunk.output_index);
    captureFunctionCall(chunk, chunk.item_id || chunk.output_index);

    if (/function_call_arguments\.delta/i.test(eventName)) {
      const key = chunk.item_id || chunk.call_id || chunk.id || String(chunk.output_index ?? chunk.index ?? 0);
      const call = getToolCall(key);
      if (chunk.name && !call.function.name) call.function.name = chunk.name;
      call.function.arguments += chunk.delta || chunk.arguments_delta || "";
    }
    if (/function_call_arguments\.done/i.test(eventName)) {
      const key = chunk.item_id || chunk.call_id || chunk.id || String(chunk.output_index ?? chunk.index ?? 0);
      const call = getToolCall(key);
      if (chunk.name && !call.function.name) call.function.name = chunk.name;
      if (typeof chunk.arguments === "string") call.function.arguments = chunk.arguments;
    }
  }

  while (true) {
    const { value, done } = await reader.read();
    if (value) buffer += decoder.decode(value, { stream: !done });
    const events = buffer.split(/\r?\n\r?\n/);
    buffer = events.pop() || "";

    for (const event of events) {
      const lines = event.split(/\r?\n/).map((line) => line.trim());
      const eventName = lines.find((line) => line.startsWith("event:"))?.slice(6).trim() || "message";
      const dataLines = lines
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trim());
      for (const data of dataLines) consumeData(eventName, data);
    }

    if (done) break;
  }

  if (buffer.trim()) {
    const lines = buffer.split(/\r?\n/).map((line) => line.trim());
    const eventName = lines.find((line) => line.startsWith("event:"))?.slice(6).trim() || "message";
    const dataLines = lines
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim());
    for (const data of dataLines) consumeData(eventName, data);
  }

  const normalizedToolCalls = Array.from(toolCalls.values())
    .filter((call) => call.function.name === "canvas_action" && call.function.arguments);
  return { content, reasoning, model, toolCalls: normalizedToolCalls, response: completedResponse };
}

function responsesToChatCompletion(response, config, collected = {}) {
  const raw = response?.response || response || {};
  const content = collected.content || extractResponsesText(raw);
  const reasoning = collected.reasoning || extractResponsesReasoning(raw);
  const toolCalls = mergeResponsesToolCalls(collected.toolCalls || [], extractResponsesToolCallsAsChat(raw));
  const message = {
    role: "assistant",
    content,
    reasoning_content: reasoning
  };
  if (toolCalls.length) message.tool_calls = toolCalls;
  return {
    id: raw.id || response?.id || "",
    object: "response",
    model: collected.model || raw.model || config.model,
    rawResponse: raw,
    choices: [
      {
        index: 0,
        message,
        finish_reason: toolCalls.length ? "tool_calls" : "stop"
      }
    ]
  };
}

function mergeResponsesToolCalls(...groups) {
  const seen = new Set();
  const merged = [];
  for (const group of groups) {
    for (const call of group || []) {
      if (!call?.function?.name || !call.function.arguments) continue;
      const key = `${call.function.name}:${call.function.arguments}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(call);
    }
  }
  return merged;
}

function extractResponsesTextDelta(eventName, chunk) {
  if (/output_text\.delta|text\.delta|message\.delta/i.test(eventName)) {
    return stringOr(chunk?.delta || chunk?.text || chunk?.content, "");
  }
  if (typeof chunk?.delta === "string" && /text|message|output/i.test(String(chunk?.type || eventName))) {
    return chunk.delta;
  }
  return "";
}

function extractResponsesReasoningDelta(eventName, chunk) {
  if (/reasoning|thinking/i.test(eventName)) {
    return stringOr(chunk?.delta || chunk?.text || chunk?.content, "");
  }
  if (typeof chunk?.delta === "string" && /reasoning|thinking/i.test(String(chunk?.type || ""))) {
    return chunk.delta;
  }
  return "";
}

function extractResponsesReasoning(value) {
  const parts = [];
  walkJson(value, (item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return;
    const type = String(item.type || item.kind || "");
    const text = item.reasoning || item.reasoning_content || item.thinking || item.thinking_content;
    if (typeof text === "string") parts.push(text);
    if (/reasoning|thinking/i.test(type) && typeof item.text === "string") parts.push(item.text);
  });
  return parts.join("\n\n").trim();
}

function extractResponsesToolCallsAsChat(value) {
  const calls = [];
  walkJson(value, (item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return;
    const name = item.name || item.function?.name || "";
    const args = item.arguments ?? item.function?.arguments;
    if (name !== "canvas_action" || args === undefined || item.parameters) return;
    calls.push({
      id: String(item.call_id || item.callId || item.id || `responses-call-${calls.length + 1}`),
      type: "function",
      function: {
        name,
        arguments: typeof args === "string" ? args : JSON.stringify(args || {})
      }
    });
  });
  return calls;
}

function qwenResponsesBaseUrl(config) {
  const base = String(config.baseUrl || "https://dashscope.aliyuncs.com/compatible-mode/v1").replace(/\/+$/, "");
  if (/dashscope\.aliyuncs\.com\/compatible-mode\/v1$/i.test(base)) {
    return base.replace(/dashscope\.aliyuncs\.com\/compatible-mode\/v1$/i, "dashscope.aliyuncs.com/api/v2/apps/protocols/compatible-mode/v1");
  }
  if (/dashscope-intl\.aliyuncs\.com\/compatible-mode\/v1$/i.test(base)) {
    return base.replace(/dashscope-intl\.aliyuncs\.com\/compatible-mode\/v1$/i, "dashscope-intl.aliyuncs.com/api/v2/apps/protocols/compatible-mode/v1");
  }
  return base;
}

function extractResponsesText(value) {
  const texts = [];
  walkJson(value, (item) => {
    if (!item || typeof item !== "object") return;
    if (item.type === "output_text" && typeof item.text === "string") texts.push(item.text);
    if ((item.type === "text" || item.type === "message") && typeof item.text === "string") texts.push(item.text);
    if (typeof item.output_text === "string") texts.push(item.output_text);
    if (typeof item.content === "string" && /message|output_text|text/i.test(String(item.type || ""))) texts.push(item.content);
    if (typeof item.text === "string" && /search|image|图片|来源|http/i.test(item.text)) texts.push(item.text);
  });
  return [...new Set(texts.map((text) => text.trim()).filter(Boolean))].join("\n").trim();
}

function extractReferencesFromObject(value) {
  const references = [];
  walkJson(value, (item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return;
    if (typeof item.output === "string" && /image_search|web_search_image|web_search|web_extractor|search|extractor/i.test(String(item.type || ""))) {
      try {
        const parsedOutput = JSON.parse(item.output);
        references.push(...extractReferencesFromObject(parsedOutput));
      } catch {
        references.push(...extractReferencesFromText(item.output));
      }
    }
    const url = item.url || item.link || item.uri || item.source_url || item.sourceUrl || item.page_url || item.pageUrl;
    const imageUrl = item.image_url || item.imageUrl || item.img_url || item.imgUrl || item.image || item.thumbnail || item.thumbnail_url || item.thumbnailUrl || item.original_url || item.originalUrl;
    const sourceUrl = item.source_url || item.sourceUrl || item.page_url || item.pageUrl || url;
    if (typeof url === "string" || typeof imageUrl === "string") {
      references.push({
        title: stringOr(item.title || item.name || item.site_name || item.siteName, ""),
        description: stringOr(item.description || item.snippet || item.summary || item.content, ""),
        url: stringOr(url || sourceUrl || imageUrl, ""),
        sourceUrl: stringOr(sourceUrl || url, ""),
        imageUrl: stringOr(imageUrl, ""),
        type: imageUrl ? "image" : "web"
      });
    }
  });
  return references.filter((reference) => reference.url && !reference.url.startsWith("data:"));
}

function extractReferencesFromText(text) {
  if (typeof text !== "string" || !text) return [];
  const urls = text.match(/https?:\/\/[^\s)）\]】"'<>]+/g) || [];
  return urls.map((url) => ({
    title: url,
    description: "",
    url,
    sourceUrl: url,
    imageUrl: "",
    type: /\.(png|jpe?g|webp|gif)(?:$|[?#])/i.test(url) ? "image" : "web"
  }));
}

function dedupeReferences(references) {
  const seen = new Set();
  const result = [];
  for (const reference of references || []) {
    const url = stringOr(reference?.url || reference?.sourceUrl || reference?.imageUrl, "").trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    result.push({
      title: stringOr(reference.title, "").slice(0, 120),
      description: stringOr(reference.description, "").slice(0, 500),
      url,
      sourceUrl: stringOr(reference.sourceUrl || url, "").slice(0, 512),
      imageUrl: stringOr(reference.imageUrl, "").slice(0, 512),
      type: reference.type === "image" || reference.imageUrl ? "image" : "web"
    });
  }
  return result;
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

function buildDemoImageSearchResults(query, lang = "zh") {
  const zh = lang !== "en";
  return {
    provider: "demo",
    model: "demo",
    query,
    summary: zh ? "演示模式下返回占位视觉参考。" : "Demo image-search references.",
    results: [
      {
        id: "demo-reference-1",
        title: zh ? "视觉参考线索" : "Visual reference lead",
        description: query || (zh ? "围绕当前任务寻找构图、色彩和材质参考。" : "Search composition, color, and material references around the current task."),
        imageUrl: "",
        sourceUrl: "",
        url: "",
        type: "image"
      }
    ]
  };
}

async function chatCompletions(config, payload, options = {}) {
  const requestPayload = applyRequestOptions({
    model: config.model,
    ...payload
  }, config);
  const timeoutMs = Number(options.timeoutMs || CHAT_COMPLETION_TIMEOUT_MS);
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  let response;
  let text;
  try {
    response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestPayload),
      signal: controller.signal
    });
    text = await response.text();
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`${config.role} API timeout after ${Math.round(timeoutMs / 1000)}s`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }

  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  if (!response.ok) {
    const detail = json?.error?.message || text || response.statusText;
    throw new Error(`${config.role} API ${response.status}: ${detail}`);
  }

  return json;
}

function writeSse(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

async function streamChatCompletions(config, payload, options = {}) {
  const requestPayload = applyRequestOptions({
    model: config.model,
    ...payload,
    stream: true,
    stream_options: {
      ...(payload.stream_options || {}),
      include_usage: false
    }
  }, config);
  const timeoutMs = Number(options.timeoutMs || CHAT_STREAM_IDLE_TIMEOUT_MS || CHAT_COMPLETION_TIMEOUT_MS);
  const controller = new AbortController();
  let timer = null;
  const refreshTimeout = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      controller.abort();
    }, timeoutMs);
  };
  refreshTimeout();

  let response;
  try {
    response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestPayload),
      signal: controller.signal
    });
  } catch (error) {
    if (timer) clearTimeout(timer);
    if (error?.name === "AbortError") {
      throw new Error(`${config.role} stream timed out after ${Math.round(timeoutMs / 1000)}s without new output`);
    }
    throw error;
  }

  if (!response.ok) {
    if (timer) clearTimeout(timer);
    const detail = await response.text().catch(() => response.statusText);
    throw new Error(`${config.role} API ${response.status}: ${detail || response.statusText}`);
  }

  try {
    const { content, reasoning, model, toolCalls } = await collectStreamingChatPayload(response, {
      ...options,
      onActivity() {
        refreshTimeout();
        options.onActivity?.();
      }
    });
    const message = {
      role: "assistant",
      content,
      reasoning_content: reasoning
    };
    if (toolCalls && toolCalls.length) {
      message.tool_calls = toolCalls;
    }
    return {
      id: `stream-${Date.now()}`,
      object: "chat.completion",
      model: model || config.model,
      choices: [
        {
          index: 0,
          message,
          finish_reason: toolCalls && toolCalls.length ? "tool_calls" : "stop"
        }
      ]
    };
  } finally {
    clearTimeout(timer);
  }
}

async function collectStreamingChatText(response) {
  if (!response.body) return "";

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";

  while (true) {
    const { value, done } = await reader.read();
    if (value) buffer += decoder.decode(value, { stream: !done });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      try {
        const chunk = JSON.parse(data);
        text += extractStreamingTextDelta(chunk);
      } catch {
        // Ignore keepalive or non-JSON stream fragments.
      }
    }

    if (done) break;
  }

  if (buffer.trim().startsWith("data:")) {
    const data = buffer.trim().slice(5).trim();
    if (data && data !== "[DONE]") {
      try {
        text += extractStreamingTextDelta(JSON.parse(data));
      } catch {
        // Ignore trailing non-JSON stream fragments.
      }
    }
  }

  return text;
}

async function collectStreamingChatPayload(response, options = {}) {
  if (!response.body) return { content: "", reasoning: "", model: "", toolCalls: [] };

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";
  let reasoning = "";
  let model = "";
  const toolCalls = [];

  function consumeData(data) {
    if (!data || data === "[DONE]") return;
    try {
      const chunk = JSON.parse(data);
      options.onActivity?.();
      if (chunk?.model) model = chunk.model;
      const textDelta = extractStreamingTextDelta(chunk);
      const reasoningDelta = extractStreamingReasoningDelta(chunk);
      const toolDeltas = chunk?.choices?.[0]?.delta?.tool_calls || [];
      for (const td of toolDeltas) {
        const idx = td.index ?? 0;
        if (!toolCalls[idx]) {
          toolCalls[idx] = { id: td.id || "", type: td.type || "function", function: { name: "", arguments: "" } };
        }
        if (td.function?.name) toolCalls[idx].function.name += td.function.name;
        if (td.function?.arguments) toolCalls[idx].function.arguments += td.function.arguments;
      }
      if (textDelta) {
        content += textDelta;
        options.onText?.(textDelta);
      }
      if (reasoningDelta) {
        reasoning += reasoningDelta;
        options.onReasoning?.(reasoningDelta);
      }
    } catch {
      // Ignore keepalive or non-JSON stream fragments.
    }
  }

  while (true) {
    const { value, done } = await reader.read();
    if (value) buffer += decoder.decode(value, { stream: !done });
    const events = buffer.split(/\r?\n\r?\n/);
    buffer = events.pop() || "";

    for (const event of events) {
      const dataLines = event
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

  return { content, reasoning, model, toolCalls };
}

function extractStreamingTextDelta(chunk) {
  const delta = chunk?.choices?.[0]?.delta;
  if (!delta) return "";
  if (typeof delta.content === "string") return delta.content;
  if (Array.isArray(delta.content)) {
    return delta.content.map((part) => part?.text || part?.content || "").join("");
  }
  if (typeof delta.audio?.transcript === "string") return delta.audio.transcript;
  if (typeof delta.transcript === "string") return delta.transcript;
  return "";
}

function extractStreamingReasoningDelta(chunk) {
  const delta = chunk?.choices?.[0]?.delta;
  if (!delta) return "";
  const candidates = [
    delta.reasoning_content,
    delta.reasoningContent,
    delta.reasoning,
    delta.thinking_content,
    delta.thinkingContent,
    delta.thinking
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate) return candidate;
  }
  return "";
}

function collectChatContent(response) {
  const content = response?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => part?.text || part?.content || "")
      .filter(Boolean)
      .join("\n");
  }
  return "";
}

function collectReasoningContent(response) {
  const message = response?.choices?.[0]?.message || {};
  const candidates = [
    message.reasoning_content,
    message.reasoningContent,
    message.reasoning,
    message.thinking,
    message.thinking_content,
    message.thoughts,
    response?.reasoning_content,
    response?.reasoning
  ];

  const normalizePart = (value) => {
    if (!value) return "";
    if (typeof value === "string") return value.trim();
    if (Array.isArray(value)) {
      return value
        .map((part) => normalizePart(part?.text || part?.content || part?.reasoning || part))
        .filter(Boolean)
        .join("\n");
    }
    if (typeof value === "object") {
      const text = value.text || value.content || value.reasoning || value.reasoning_content || value.summary;
      if (typeof text === "string") return text.trim();
      try {
        return JSON.stringify(value, null, 2);
      } catch {
        return "";
      }
    }
    return "";
  };

  return candidates
    .map(normalizePart)
    .filter(Boolean)
    .join("\n\n");
}

async function generateTokenHubImage(prompt, imageUrl, imageDataUrl) {
  const images = [];
  if (typeof imageUrl === "string" && /^https?:\/\//i.test(imageUrl)) {
    images.push(imageUrl);
  } else if (IMAGE_INCLUDE_DATA_URL && imageDataUrl) {
    images.push(imageDataUrl);
  }

  const submitPayload = {
    model: runtimeConfigs.image.model,
    prompt
  };
  if (images.length) {
    submitPayload.images = images;
  }

  const submitted = await tokenHubImageRequest(`${runtimeConfigs.image.baseUrl}/submit`, submitPayload);
  const jobId = submitted?.id;
  if (!jobId) {
    throw new Error("TokenHub image submit did not return a job id.");
  }

  for (let attempt = 0; attempt < IMAGE_POLL_ATTEMPTS; attempt += 1) {
    await delay(IMAGE_POLL_INTERVAL_MS);
    const queried = await tokenHubImageRequest(`${runtimeConfigs.image.baseUrl}/query`, {
      model: runtimeConfigs.image.model,
      id: jobId
    });

    if (queried?.status === "completed") {
      const imageUrlResult = queried?.data?.[0]?.url;
      if (!imageUrlResult) {
        throw new Error("TokenHub image query completed without image url.");
      }
      return {
        imageUrl: imageUrlResult,
        imageDataUrl: imageUrlResult,
        revisedPrompt: queried?.data?.[0]?.revised_prompt || ""
      };
    }

    if (["failed", "error", "cancelled"].includes(String(queried?.status).toLowerCase())) {
      throw new Error(`TokenHub image job failed: ${queried?.status}`);
    }
  }

  throw new Error("TokenHub image job timed out before completion.");
}

function buildMaskedEditPrompt(prompt) {
  return [
    "图 1 是需要编辑的原图。",
    "图 2 是用户涂抹生成的黑白选区蒙版：白色区域是唯一允许修改的区域，黑色区域必须尽量保持不变。",
    "请只根据用户指令修改白色选区，保留黑色区域的构图、主体、透视、光照、材质和文字细节。",
    `用户指令：${prompt}`
  ].join("\n");
}

async function generateDashScopeQwenImage(prompt, imageUrl, imageDataUrl, requestOptions = {}) {
  const options = runtimeConfigs.image.options || {};
  const content = [];
  const maskDataUrl = normalizeDataUrl(requestOptions.maskDataUrl);
  const referenceImage =
    typeof imageUrl === "string" && /^https?:\/\//i.test(imageUrl)
      ? imageUrl
      : imageDataUrl;
  if (options.useReferenceImage !== false && referenceImage) {
    content.push({ image: referenceImage });
  }
  if (maskDataUrl) {
    content.push({ image: maskDataUrl });
  }
  const finalPrompt = maskDataUrl ? buildMaskedEditPrompt(prompt) : String(prompt || "");
  content.push({ text: finalPrompt.slice(0, 800) });

  const parameters = dropUndefined({
    size: cleanSize(requestOptions.size) || cleanSize(options.size) || "2048*2048",
    n: cleanInteger(options.n, 1, 6, 1),
    prompt_extend: cleanBoolean(options.prompt_extend, true),
    watermark: cleanBoolean(options.watermark, false),
    negative_prompt: cleanString(options.negative_prompt, 500),
    seed: cleanOptionalInteger(options.seed, 0, 2147483647)
  });

  const payload = {
    model: runtimeConfigs.image.model,
    input: {
      messages: [
        {
          role: "user",
          content
        }
      ]
    },
    parameters
  };

  const response = await fetch(dashScopeQwenImageEndpoint(runtimeConfigs.image), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${runtimeConfigs.image.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  if (!response.ok || json?.code) {
    const detail = json?.message || json?.error?.message || text || response.statusText;
    throw new Error(`DashScope image API ${response.status}: ${detail}`);
  }

  const imageUrlResult = extractDashScopeImageUrl(json);
  if (!imageUrlResult) {
    throw new Error("DashScope image response did not include an image URL.");
  }
  return {
    imageUrl: imageUrlResult,
    imageDataUrl: imageUrlResult,
    revisedPrompt: json?.output?.actual_prompt || json?.output?.revised_prompt || "",
    usage: json?.usage || null
  };
}

function dashScopeQwenImageEndpoint(config) {
  const base = String(config.baseUrl || "").replace(/\/+$/, "");
  if (/\/api\/v1\/services\/aigc\/multimodal-generation\/generation$/i.test(base)) return base;
  if (/\/api\/v1$/i.test(base)) return `${base}/services/aigc/multimodal-generation/generation`;
  if (/dashscope-intl\.aliyuncs\.com/i.test(base)) {
    return "https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation";
  }
  return "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation";
}

function extractDashScopeImageUrl(response) {
  const choices = response?.output?.choices;
  if (Array.isArray(choices)) {
    for (const choice of choices) {
      const content = choice?.message?.content;
      if (!Array.isArray(content)) continue;
      const item = content.find((part) => typeof part?.image === "string" && part.image);
      if (item) return item.image;
    }
  }
  const results = response?.output?.results || response?.results || response?.data;
  if (Array.isArray(results)) {
    const item = results.find((part) => typeof part?.url === "string" || typeof part?.image === "string");
    if (item) return item.url || item.image;
  }
  return "";
}

async function tokenHubImageRequest(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${runtimeConfigs.image.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  if (!response.ok) {
    const detail = json?.error?.message || json?.message || text || response.statusText;
    throw new Error(`TokenHub image API ${response.status}: ${detail}`);
  }

  return json;
}

function extensionFromContentType(contentType) {
  const normalized = String(contentType).split(";")[0].trim().toLowerCase();
  return {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/svg+xml": "svg"
  }[normalized] || "";
}

function extensionFromUrl(url) {
  try {
    const ext = path.extname(new URL(url).pathname).replace(/^\./, "").toLowerCase();
    if (["jpg", "jpeg", "png", "webp", "gif", "svg"].includes(ext)) {
      return ext;
    }
  } catch {}
  return "";
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseJsonFromText(text) {
  if (!text) {
    throw new Error("The analysis model returned empty text.");
  }

  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("Could not parse analysis JSON from model output.");
    }
    return JSON.parse(match[0]);
  }
}

function normalizeAnalysis(value, fileName = "source image") {
  const fallback = buildDemoAnalysis(fileName);
  const options = Array.isArray(value?.options) ? value.options : fallback.options;

  return {
    provider: "api",
    title: stringOr(value?.title, fallback.title),
    summary: stringOr(value?.summary, fallback.summary),
    detectedSubjects: arrayOfStrings(value?.detectedSubjects, fallback.detectedSubjects).slice(0, 6),
    moodKeywords: arrayOfStrings(value?.moodKeywords, fallback.moodKeywords).slice(0, 8),
    options: options.slice(0, 6).map((option, index) => ({
      id: slug(option?.id || option?.title || `option-${index + 1}`),
      title: stringOr(option?.title, fallback.options[index % fallback.options.length].title).slice(0, 20),
      description: stringOr(option?.description, fallback.options[index % fallback.options.length].description),
      prompt: stringOr(option?.prompt, fallback.options[index % fallback.options.length].prompt),
      tone: stringOr(option?.tone, fallback.options[index % fallback.options.length].tone),
      layoutHint: stringOr(option?.layoutHint, fallback.options[index % fallback.options.length].layoutHint),
      nodeType: option?.nodeType || undefined,
      content: option?.content || undefined
    }))
  };
}

function normalizeExplore(value, fileName = "source image") {
  const fallback = buildDemoExplore(fileName);
  const options = Array.isArray(value?.options) ? value.options : fallback.options;
  const references = Array.isArray(value?.references) ? value.references : fallback.references;

  return {
    provider: "api",
    title: stringOr(value?.title, fallback.title),
    summary: stringOr(value?.summary, fallback.summary),
    detectedSubjects: arrayOfStrings(value?.detectedSubjects, fallback.detectedSubjects).slice(0, 6),
    moodKeywords: arrayOfStrings(value?.moodKeywords, fallback.moodKeywords).slice(0, 8),
    options: options.slice(0, 6).map((option, index) => ({
      id: slug(option?.id || option?.title || `option-${index + 1}`),
      title: stringOr(option?.title, fallback.options[index % fallback.options.length].title).slice(0, 20),
      description: stringOr(option?.description, fallback.options[index % fallback.options.length].description),
      prompt: stringOr(option?.prompt, fallback.options[index % fallback.options.length].prompt),
      tone: stringOr(option?.tone, fallback.options[index % fallback.options.length].tone),
      layoutHint: stringOr(option?.layoutHint, fallback.options[index % fallback.options.length].layoutHint),
      nodeType: option?.nodeType || undefined,
      content: option?.content || undefined
    })),
    references: references.slice(0, 6).map((ref, index) => ({
      title: stringOr(ref?.title, fallback.references[index % fallback.references.length].title).slice(0, 80),
      url: stringOr(ref?.url, fallback.references[index % fallback.references.length].url).slice(0, 512),
      description: stringOr(ref?.description, fallback.references[index % fallback.references.length].description).slice(0, 200),
      type: ["web", "doc", "image"].includes(ref?.type) ? ref.type : "web"
    }))
  };
}
function normalizeDeepThinkPlan(value, prompt, lang) {
  const fallback = buildDemoDeepThinkPlan(prompt, lang, runtimeConfigs.deepthink.model);
  const cards = Array.isArray(value?.cards) ? value.cards : fallback.cards;
  const links = Array.isArray(value?.links) ? value.links : fallback.links;
  const allowedTypes = new Set(["direction", "web", "image", "file", "api", "note", "plan", "todo", "weather", "map", "link", "code"]);

  return {
    reply: stringOr(value?.reply, fallback.reply),
    cards: cards.slice(0, 8).map((card, index) => {
      const type = allowedTypes.has(card?.type) ? card.type : "note";
      const title = stringOr(card?.title, fallback.cards[index % fallback.cards.length].title).slice(0, 48);
      const summary = stringOr(card?.summary || card?.description, fallback.cards[index % fallback.cards.length].summary).slice(0, 240);
      return {
        id: slug(card?.id || `${type}-${title}-${index + 1}`),
        type,
        title,
        summary,
        prompt: stringOr(card?.prompt, summary).slice(0, 1200),
        query: stringOr(card?.query, "").slice(0, 240),
        url: stringOr(card?.url, "").slice(0, 512)
      };
    }),
    links: links.slice(0, 6).map((link) => ({
      from: Number.isInteger(link?.from) ? link.from : 0,
      to: Number.isInteger(link?.to) ? link.to : 0,
      label: stringOr(link?.label, "").slice(0, 40)
    })).filter((link) => link.from !== link.to),
    actions: normalizeDeepThinkActions(value?.actions || value?.action)
  };
}

function buildDemoDeepThinkPlan(prompt, lang = "zh", model = "demo") {
  const zh = lang !== "en";
  return {
    provider: "demo",
    model,
    reply: zh
      ? "我先把深入研究外化为几张可执行卡片：搜索线索、参考图片、材料拆解和成图方向。"
      : "I mapped the deep-thinking pass into actionable cards: search leads, visual references, material breakdown, and generation directions.",
    cards: [
      {
        id: "search-context",
        type: "web",
        title: zh ? "搜索语境线索" : "Search context",
        summary: zh ? "围绕当前目标建立外部语境，找到可借鉴的视觉题材、场景和关键词。" : "Build external context around the current goal and identify useful visual themes, scenes, and keywords.",
        prompt,
        query: prompt
      },
      {
        id: "reference-image-board",
        type: "image",
        title: zh ? "参考图卡片" : "Reference image board",
        summary: zh ? "规划一组照片或视觉参考，用来校准光线、构图、材质和色彩。" : "Plan a set of visual references for lighting, composition, materials, and color.",
        prompt: zh ? `为「${prompt}」搜集或生成参考图片，突出光线、构图和材质。` : `Collect or generate references for "${prompt}", emphasizing lighting, composition, and material.`
      },
      {
        id: "material-breakdown",
        type: "file",
        title: zh ? "文件材料拆解" : "File material breakdown",
        summary: zh ? "把当前画布和上传文件拆成可复用素材：主体、局部、色卡、叙事线索。" : "Break the current canvas and uploaded files into reusable subject, detail, palette, and narrative assets.",
        prompt: zh ? "整理当前材料，提取主体、色彩、构图和叙事线索。" : "Extract subjects, color, composition, and narrative clues from the current materials."
      },
      {
        id: "image-generation-call",
        type: "api",
        title: zh ? "成图 API 动作" : "Image API action",
        summary: zh ? "准备调用成图接口前的提示词结构，并标记需要保留和需要发散的元素。" : "Prepare the image generation prompt structure and mark what to preserve versus diverge.",
        prompt: zh ? `基于当前图和「${prompt}」生成一张完整图像，保留核心视觉记忆，加入新的叙事形状。` : `Generate a complete image from the current canvas and "${prompt}", preserving core visual memory while adding a new narrative shape.`
      },
      {
        id: "final-direction",
        type: "direction",
        title: zh ? "综合发散方向" : "Synthesis direction",
        summary: zh ? "把搜索、参考和材料拆解合成一个可直接点击生成的方向。" : "Synthesize search, references, and material breakdown into a generation-ready direction.",
        prompt: zh ? `以「${prompt}」为核心，生成一张由多张卡片线索连接出的视觉探索图。` : `Create a visual exploration image centered on "${prompt}", shaped by linked clue cards.`
      }
    ],
    links: [
      { from: 0, to: 1, label: zh ? "启发" : "inspires" },
      { from: 1, to: 3, label: zh ? "转成提示词" : "prompt" },
      { from: 2, to: 4, label: zh ? "合成" : "synthesize" }
    ]
  };
}

function normalizeOption(option) {
  if (!option || typeof option !== "object") return null;
  return {
    id: slug(option.id || option.title || "option"),
    title: stringOr(option.title, "生成方向"),
    description: stringOr(option.description, "基于原图生成一个新的视觉方向。"),
    prompt: stringOr(option.prompt, option.description || option.title || "基于参考图生成新图。"),
    tone: stringOr(option.tone, "cinematic"),
    layoutHint: stringOr(option.layoutHint, "square")
  };
}

function normalizeChatAnalysis(value) {
  if (!value || typeof value !== "object") {
    return {
      summary: "尚未完成图片分析。",
      moodKeywords: [],
      options: []
    };
  }

  return {
    summary: stringOr(value.summary, "尚未完成图片分析。"),
    moodKeywords: arrayOfStrings(value.moodKeywords, []).slice(0, 8),
    detectedSubjects: arrayOfStrings(value.detectedSubjects, []).slice(0, 6),
    options: Array.isArray(value.options)
      ? value.options.slice(0, 6).map((option) => ({
          title: stringOr(option?.title, "生成方向"),
          description: stringOr(option?.description, ""),
          tone: stringOr(option?.tone, ""),
          layoutHint: stringOr(option?.layoutHint, "")
        }))
      : []
  };
}

function normalizeChatMessages(value) {
  if (!Array.isArray(value)) return [];
  return value
    .slice(-40)
    .map((item) => ({
      role: item?.role === "assistant" ? "assistant" : "user",
      content: typeof item?.content === "string" ? item.content.trim().slice(0, 8000) : ""
    }))
    .filter((item) => item.content);
}

function buildDemoChatReply(message, analysis) {
  const optionCount = analysis.options?.length || 0;
  if (/提示词|prompt/i.test(message)) {
    return "可以把方向写成：保留原图主体和色彩记忆，强化一个明确的场景、光线和材质目标，再限制不要出现水印或可读文字。";
  }
  if (/哪个|选择|方向/.test(message) && optionCount) {
    return `当前有 ${optionCount} 个方向。想要故事感就选电影剧照或线索板，想要设计提案就选杂志海报或视觉系统。`;
  }
  if (/重新|更多|新增/.test(message)) {
    return "下一步可以让分析模型再扩展一组分支，例如更商业、更叙事、更极简或更实验的方向。";
  }
  return `我会围绕“${analysis.summary || "当前图片"}”继续帮你收束想法。你可以告诉我想更像海报、电影剧照、线索板，还是概念板。`;
}

function buildDemoAnalysis(fileName = "source image") {
  return {
    provider: "demo",
    title: `${fileName ? fileName.split('.')[0] : "未知图片"} 的视觉探索`,
    summary: `已读取 ${fileName || "上传图片"}：可以从主体、氛围、叙事线索和视觉风格四个方向继续扩展。`,
    detectedSubjects: ["主视觉", "光影", "空间关系", "色彩线索"],
    moodKeywords: ["线索板", "电影感", "编辑感", "图像分叉", "叙事延展"],
    options: [
      {
        id: "evidence-board",
        title: "线索板重构",
        description: "把原图转化成侦探线索墙：照片、便签、纸张和红线围绕主体展开，像在追踪一个尚未揭开的故事。",
        prompt: "基于参考图的主体与色彩，生成一张真实摄影质感的调查线索板，包含纸张、照片、便签、图钉和红色连接线，构图有层次，光线温暖，细节丰富，电影道具摄影风格。",
        tone: "documentary",
        layoutHint: "board"
      },
      {
        id: "editorial-poster",
        title: "杂志海报",
        description: "保留原图最强的视觉记忆点，重组成一张留白克制的编辑海报，适合做封面或视觉提案。",
        prompt: "将参考图转化为高端杂志编辑海报，保留主要主体轮廓和关键色彩，使用克制排版、自然颗粒、柔和阴影和精致留白，不要出现可读文字。",
        tone: "editorial",
        layoutHint: "portrait"
      },
      {
        id: "cinematic-still",
        title: "电影剧照",
        description: "把当前图片延展为一帧电影镜头，强调空间、灯光和情绪，让画面像故事中的关键一秒。",
        prompt: "基于参考图生成电影剧照风格图像，保留主体和场景关系，加入自然镜头景深、环境光、微妙雾气和叙事张力，真实摄影，35mm film still。",
        tone: "cinematic",
        layoutHint: "landscape"
      },
      {
        id: "surreal-memory",
        title: "梦境记忆",
        description: "将原图中的物体和氛围抽离成梦境化场景，画面更诗性，像记忆被重新拼贴。",
        prompt: "把参考图转化为超现实梦境场景，保留核心主体但让背景、光影和比例产生诗性变化，细腻材质，柔和边缘，安静而神秘。",
        tone: "surreal",
        layoutHint: "square"
      },
      {
        id: "product-system",
        title: "视觉系统",
        description: "把原图拆成一套视觉资产：主图、色卡、材质片段和构图小样，适合继续做品牌或概念板。",
        prompt: "基于参考图生成一张视觉系统概念板，包含主视觉、局部材质切片、色彩样本、构图缩略图和整洁网格，现代设计工作室风格，不要出现真实文字。",
        tone: "graphic",
        layoutHint: "board"
      }
    ]
  };
}

function buildDemoExplore(fileName = "source image") {
  const base = buildDemoAnalysis(fileName);
  return {
    ...base,
    references: [
      {
        title: "Pinterest 视觉灵感板",
        url: "https://www.pinterest.com/search/pins/?q=creative+visual+moodboard",
        description: "大量视觉灵感与情绪板参考，适合快速浏览不同风格的视觉参考。",
        type: "web"
      },
      {
        title: "Behance 创意项目集",
        url: "https://www.behance.net/search/projects/creative%20direction",
        description: "全球创意人分享的高质量视觉项目，可作为风格与构图的参考。",
        type: "web"
      },
      {
        title: "电影色彩分析图集",
        url: "https://www.flickr.com/search/?q=cinematic+color+grading",
        description: "电影级调色与光影处理的图片参考，适合延展电影感方向。",
        type: "image"
      }
    ]
  };
}

function buildDemoImage(option) {
  const palette = paletteFor(option.id);
  const title = escapeXml(option.title);
  const description = escapeXml(option.description).slice(0, 95);
  const promptHint = escapeXml(option.tone || "visual branch");
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="${palette[0]}"/>
      <stop offset="0.52" stop-color="${palette[1]}"/>
      <stop offset="1" stop-color="${palette[2]}"/>
    </linearGradient>
    <filter id="paper" x="-20%" y="-20%" width="140%" height="140%">
      <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="3" seed="7"/>
      <feColorMatrix type="saturate" values="0"/>
      <feBlend in="SourceGraphic" mode="multiply"/>
    </filter>
  </defs>
  <rect width="1024" height="1024" fill="url(#bg)"/>
  <g opacity="0.22" stroke="#ffffff" stroke-width="1">
    ${Array.from({ length: 18 }, (_, i) => `<path d="M${i * 64} 0 L${1024 - i * 38} 1024"/>`).join("")}
  </g>
  <g transform="translate(132 128) rotate(-3)">
    <rect width="760" height="620" rx="18" fill="#fffdf4" opacity="0.88" filter="url(#paper)"/>
    <rect x="44" y="48" width="672" height="386" rx="10" fill="${palette[3]}" opacity="0.78"/>
    <circle cx="130" cy="132" r="64" fill="${palette[4]}" opacity="0.82"/>
    <rect x="232" y="102" width="398" height="36" rx="18" fill="#ffffff" opacity="0.52"/>
    <rect x="232" y="166" width="310" height="24" rx="12" fill="#ffffff" opacity="0.36"/>
    <path d="M92 480 C220 392 354 572 504 456 S672 432 716 520" fill="none" stroke="${palette[5]}" stroke-width="11" stroke-linecap="round"/>
    <circle cx="92" cy="480" r="18" fill="#f7f2df"/>
    <circle cx="504" cy="456" r="18" fill="#f7f2df"/>
    <circle cx="716" cy="520" r="18" fill="#f7f2df"/>
  </g>
  <g font-family="Arial, sans-serif" fill="#1f2733">
    <text x="104" y="824" font-size="54" font-weight="700" letter-spacing="0">${title}</text>
    <text x="108" y="872" font-size="24" opacity="0.72">${promptHint}</text>
    <foreignObject x="104" y="900" width="820" height="84">
      <div xmlns="http://www.w3.org/1999/xhtml" style="font-family:Arial,sans-serif;font-size:25px;line-height:1.45;color:#26313f;opacity:.78">${description}</div>
    </foreignObject>
  </g>
</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.trim())}`;
}

function paletteFor(seed) {
  const palettes = [
    ["#f3ead5", "#8ab2aa", "#2f5262", "#d9e5df", "#d77756", "#b64032"],
    ["#fbf2d0", "#d0a56f", "#344d5f", "#e9ddc7", "#446f68", "#a94f3f"],
    ["#e8eef0", "#8ca1ad", "#202939", "#d7e4de", "#c7a76c", "#742f2f"],
    ["#f7efe7", "#c6dad1", "#786f9d", "#eee6d7", "#4d8a8b", "#d15d4a"],
    ["#f4f1e7", "#aabf90", "#334c3f", "#ece0c4", "#6d87b0", "#a14335"]
  ];
  const index = Math.abs(String(seed).split("").reduce((sum, char) => sum + char.charCodeAt(0), 0)) % palettes.length;
  return palettes[index];
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error("Request body is too large. Please upload an image under 10MB."));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error("Invalid JSON body."));
      }
    });
    req.on("error", reject);
  });
}

function serveStatic(requestPath, res) {
  const cleanPath = decodeURIComponent(requestPath.split("?")[0]);
  const relativePath = cleanPath === "/" ? "index.html" : cleanPath.replace(/^\/+/, "");
  const targetPath = path.normalize(path.join(publicDir, relativePath));

  if (!targetPath.startsWith(publicDir)) {
    return sendJson(res, 403, { error: "Forbidden" });
  }

  fs.readFile(targetPath, (error, data) => {
    if (error) {
      return sendJson(res, 404, { error: "Not found" });
    }
    res.writeHead(200, {
      "Content-Type": mimeType(targetPath),
      "Cache-Control": "no-cache"
    });
    res.end(data);
  });
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-cache"
  });
  res.end(JSON.stringify(data));
}

function mimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp"
  }[ext] || "application/octet-stream";
}

function normalizeDataUrl(value) {
  if (typeof value !== "string") return null;
  if (!/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(value) && !/^data:image\/svg\+xml(?:;[^,]*)?,/i.test(value)) {
    return null;
  }
  return value;
}

function isAudioDataUrl(value) {
  return typeof value === "string" && /^data:audio\/[a-z0-9.+-]+(?:;[^,]*)?;base64,/i.test(value);
}

function isBase64Payload(value) {
  return typeof value === "string" && value.length > 0 && /^[a-zA-Z0-9+/=]+$/.test(value);
}

function parseDataUrl(value) {
  if (typeof value !== "string") {
    throw new Error("Invalid data URL format");
  }
  const rasterMatch = /^data:([a-z0-9+\/.-]+)(?:;[^,]*)?;base64,([a-zA-Z0-9+/=]+)$/i.exec(value);
  if (rasterMatch) {
    const mimeType = rasterMatch[1].toLowerCase();
    const ext = extensionFromMimeType(mimeType) || "bin";
    return {
      buffer: Buffer.from(rasterMatch[2], "base64"),
      mimeType,
      ext
    };
  }
  const plainMatch = /^data:([a-z0-9+\/-]+)(?:;[^,]*)?,(.*)$/is.exec(value);
  if (plainMatch) {
    const mimeType = plainMatch[1].toLowerCase();
    const payload = plainMatch[2] || "";
    const buffer = Buffer.from(decodeURIComponent(payload), "utf8");
    return {
      buffer,
      mimeType,
      ext: extensionFromMimeType(mimeType) || "txt"
    };
  }
  throw new Error("Invalid data URL format");
}

function extensionFromMimeType(mimeType) {
  const map = {
    "text/plain": "txt",
    "text/markdown": "md",
    "application/json": "json",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
    "application/pdf": "pdf",
    "audio/webm": "webm",
    "audio/ogg": "ogg",
    "audio/mp4": "mp4",
    "audio/m4a": "m4a",
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
    "audio/wav": "wav",
    "audio/wave": "wav",
    "audio/x-wav": "wav",
    "audio/pcm": "pcm",
    "audio/l16": "pcm"
  };
  return map[mimeType] || "";
}

function arrayOfStrings(value, fallback) {
  if (!Array.isArray(value)) return fallback;
  const cleaned = value.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim());
  return cleaned.length ? cleaned : fallback;
}

function stringOr(value, fallback) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function slug(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "option";
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function loadDotEnv(envPath) {
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}
