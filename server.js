import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { syncSystemHistory } from "./src/api/history.js";
import { syncSystemMaterials } from "./src/api/materials.js";
import { ensureStorageDirs, storeDataUrl, storeFile } from "./src/lib/storage.js";
import { extractTextFromBuffer } from "./src/lib/textExtract.js";
import { parseFileStructured } from "./src/lib/fileParser.js";
import { PrismaClient } from "@prisma/client";
import { buildAnalysisPrompt, buildExplorePrompt, buildUrlAnalysisPrompt, buildTextAnalysisPrompt, buildChatSystemContext, buildChatUserPrompt, buildGeneratePrompt, buildExplainPrompt, buildExplainSystemPrompt, buildRealtimeInstruction, buildDeepThinkSystemPrompt, buildDeepThinkUserPrompt, buildExploreContent, CONTEXT_BOUNDARY_DIRECTIVES, CANVAS_ACTION_TYPES, CANVAS_ACTION_TYPES_TEXT } from "./src/prompts/index.js";
import { AGENT_SKILL_IDS, agentSkillToolFlags, normalizeAgentSkill } from "./public/agentSkills.js";
import { ingestText, ingestSnippet, retrieveContext, formatContextForPrompt, isEmbeddingConfigured, CONTEXT_KINDS } from "./src/lib/rag/index.js";
import { classifyContent, getFallbackTaskType, resolveTaskType, routeContent } from "./src/lib/taskRouter.js";
import { ensureMediaGenerationActions } from "./src/lib/chatActionGuard.js";
import { ensureCommittedCanvasActions, shouldCreateDirectionActions } from "./src/lib/canvasActionReliability.js";
import { compactPipelineActionTypes, finalizeCanvasActions as runCanvasActionPipeline } from "./src/lib/canvasActionPipeline.js";
import { extractInlineCanvasActionsFromReply, removeInlineCanvasActionBlocks } from "./src/lib/inlineCanvasActions.js";
import {
  CANVAS_ACTION_REGISTRY,
  buildCanvasActionPolicy,
  classifyCanvasActionIntent,
  filterCanvasActionsByPolicy,
  summarizeCanvasActionPolicy
} from "./src/lib/canvasActionPolicy.js";
import { createActionTraceStore } from "./src/server/actionTrace.js";
import {
  REUSABLE_CARD_ACTION_TYPES,
  STRUCTURED_CONTENT_ACTION_TYPES,
  WEB_REFERENCE_ACTION_TYPES,
  createChatActionReplies
} from "./src/server/chatActionReplies.js";
import { createChatStreamHandler } from "./src/server/chatStream.js";
import { createDeepResearchRunner } from "./src/server/deepResearch.js";
import { loadDotEnv } from "./src/server/env.js";
import { createStaticFileHandler, sendJson } from "./src/server/http.js";
import { createImageSearchService } from "./src/server/imageSearch.js";
import { createMediaGenerators } from "./src/server/mediaGeneration.js";
import {
  applyJsonObjectResponseMode,
  applyReasoningMode,
  applyRequestOptions,
  applyWebSearchMode,
  cleanBoolean,
  cleanInteger,
  cleanOptionalInteger,
  cleanOptionalNumber,
  cleanSize,
  cleanString,
  createModelConfigHelpers,
  dropUndefined,
  isDashScopeDeepResearchConfig,
  isDashScopeHappyHorseVideoConfig,
  isDashScopeQwenConfig,
  isDashScopeQwenImageConfig,
  isKimiChatConfig,
  isMiMoChatConfig,
  shouldUseQwenResponsesTransport
} from "./src/server/modelConfig.js";
import { createModelClients } from "./src/server/modelClients.js";
import {
  createResponsesClient,
  dedupeTextParts,
  extractResponsesText,
  responsesToChatCompletion,
  sanitizeReasoningContent,
  stripReasoningEchoFromResponseText
} from "./src/server/responsesClient.js";
import { createRequestHandler } from "./src/server/router.js";
import { dedupeReferences, extractReferencesFromObject, extractReferencesFromText, walkJson } from "./src/server/references.js";
import { writeSse } from "./src/server/sse.js";
import { createVoiceServices, normalizeVoiceActions } from "./src/server/voice.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "public");

loadDotEnv(path.join(__dirname, ".env"));

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "127.0.0.1";
const DEMO_MODE = process.env.DEMO_MODE === "true";
const IMAGE_POLL_INTERVAL_MS = Number(process.env.IMAGE_POLL_INTERVAL_MS || 2000);
const IMAGE_POLL_ATTEMPTS = Number(process.env.IMAGE_POLL_ATTEMPTS || 30);
const IMAGE_INCLUDE_DATA_URL = process.env.IMAGE_INCLUDE_DATA_URL === "true";
const VIDEO_POLL_INTERVAL_MS = Number(process.env.VIDEO_POLL_INTERVAL_MS || 15000);
const VIDEO_POLL_ATTEMPTS = Number(process.env.VIDEO_POLL_ATTEMPTS || 30);
const VIDEO_SUBMIT_TIMEOUT_MS = Number(process.env.VIDEO_SUBMIT_TIMEOUT_MS || 60000);
const VIDEO_DOWNLOAD_TIMEOUT_MS = Number(process.env.VIDEO_DOWNLOAD_TIMEOUT_MS || 180000);
const MAX_BODY_BYTES = 150 * 1024 * 1024;
const CHAT_COMPLETION_TIMEOUT_MS = Number(process.env.CHAT_COMPLETION_TIMEOUT_MS || 180000);
const ANALYSIS_FAST_TIMEOUT_MS = Number(process.env.ANALYSIS_FAST_TIMEOUT_MS || 90000);
const FILE_ANALYSIS_TIMEOUT_MS = Number(process.env.FILE_ANALYSIS_TIMEOUT_MS || 150000);
const FILE_EXPLORE_THINKING_TIMEOUT_MS = Number(process.env.FILE_EXPLORE_THINKING_TIMEOUT_MS || 180000);
const FILE_EXPLORE_FALLBACK_TIMEOUT_MS = Number(process.env.FILE_EXPLORE_FALLBACK_TIMEOUT_MS || 90000);
const CHAT_STREAM_IDLE_TIMEOUT_MS = Number(process.env.CHAT_STREAM_IDLE_TIMEOUT_MS || process.env.CHAT_STREAM_TIMEOUT_MS || 240000);
const DEEP_RESEARCH_TIMEOUT_MS = Number(process.env.DEEP_RESEARCH_TIMEOUT_MS || 600000);
const EXPLORE_THINKING_TIMEOUT_MS = Number(process.env.EXPLORE_THINKING_TIMEOUT_MS || 180000);
const EXPLORE_FALLBACK_TIMEOUT_MS = Number(process.env.EXPLORE_FALLBACK_TIMEOUT_MS || 45000);
const CHAT_ATTACHMENT_MAX_CHARS = 32000;
const CHAT_ATTACHMENT_MAX_COUNT = 8;
const CHAT_IMAGE_INPUT_MAX_COUNT = 8;
const CHAT_MODEL_REQUEST_BODY_LIMIT_BYTES = Number(process.env.CHAT_MODEL_REQUEST_BODY_LIMIT_BYTES || 6 * 1024 * 1024);
const CHAT_MODEL_REQUEST_BODY_TARGET_BYTES = Number(process.env.CHAT_MODEL_REQUEST_BODY_TARGET_BYTES || Math.floor(CHAT_MODEL_REQUEST_BODY_LIMIT_BYTES * 0.9));
const CHAT_CONTEXT_BUDGET_VERSION = "context-budget-v1";
const CHAT_SYSTEM_PROMPT_VERSION = "chat-system-v1";
const CANVAS_TOOL_SCHEMA_VERSION = "canvas-action-tool-schema-v1";
const CANVAS_POLICY_VERSION = "canvas-action-policy-v1";
const CANVAS_FALLBACK_VERSION = "canvas-action-fallback-v1";
const MIMO_DEFAULT_BASE_URL = "https://api.xiaomimimo.com/v1";
const MIMO_DEFAULT_MODEL = "mimo-v2.5-pro";
const IMAGE_SEARCH_MODEL = process.env.IMAGE_SEARCH_MODEL || "qwen3.5-plus";
const ANALYSIS_CANVAS_CARD_MIN = 5;
const ANALYSIS_CANVAS_CARD_MAX = 8;
const EXPLORE_CANVAS_CARD_MIN = 6;
const EXPLORE_CANVAS_CARD_MAX = 10;
const MAX_QUICK_CANVAS_ACTIONS_PER_TURN = 8;
const MAX_THINKING_CANVAS_ACTIONS_PER_TURN = 12;
const MAX_DEEP_RESEARCH_CANVAS_CARDS = 20;
const CANVAS_ACTION_TRACE_LOG_RETENTION = Math.max(50, Math.min(Number(process.env.CANVAS_ACTION_TRACE_LOG_RETENTION || 500), 5000));
const CANVAS_ACTION_TRACE_LOG_FILE = path.join(process.env.STORAGE_PATH || path.join(__dirname, "storage"), "logs", "canvas-action-traces.ndjson");

const prisma = new PrismaClient();
const {
  buildImageSearchConfig,
  buildModelConfig,
  isDemoRole,
  roleHealth
} = createModelConfigHelpers({
  demoMode: DEMO_MODE,
  imageSearchModel: IMAGE_SEARCH_MODEL,
  maxDeepResearchCanvasCards: MAX_DEEP_RESEARCH_CANVAS_CARDS,
  mimoDefaultBaseUrl: MIMO_DEFAULT_BASE_URL,
  mimoDefaultModel: MIMO_DEFAULT_MODEL,
  videoPollIntervalMs: VIDEO_POLL_INTERVAL_MS,
  videoPollAttempts: VIDEO_POLL_ATTEMPTS
});
const {
  chatCompletions,
  streamChatCompletions,
  collectStreamingChatText,
  extractStreamingTextDelta,
  extractStreamingReasoningDelta
} = createModelClients({
  applyRequestOptions,
  isMiMoChatConfig,
  completionTimeoutMs: CHAT_COMPLETION_TIMEOUT_MS,
  streamIdleTimeoutMs: CHAT_STREAM_IDLE_TIMEOUT_MS
});
const {
  realtimeVoiceCompletion,
  transcribeAudio
} = createVoiceServices({
  buildRealtimeInstruction,
  chatCompletions,
  collectChatContent,
  collectStreamingChatText,
  parseJsonFromText,
  stringOr
});
const {
  qwenResponsesRequest,
  streamQwenResponses
} = createResponsesClient({
  applyRequestOptions,
  extractStreamingReasoningDelta,
  extractStreamingTextDelta,
  completionTimeoutMs: CHAT_COMPLETION_TIMEOUT_MS,
  streamIdleTimeoutMs: CHAT_STREAM_IDLE_TIMEOUT_MS
});
const {
  buildDemoImageSearchResults,
  runQwenImageSearch
} = createImageSearchService({
  buildImageSearchConfig,
  extractResponsesText,
  ingestRemoteImageAsUpload,
  qwenResponsesRequest,
  stringOr
});
const {
  extractToolCallActions,
  finalizeChatReply,
  formatReferenceSection,
  visibleChatReplyOrEmpty
} = createChatActionReplies({
  parseJsonFromText,
  stringOr
});

let runtimeConfigs = {
  chat: buildModelConfig("CHAT", {
    provider: "openai-compatible",
    model: MIMO_DEFAULT_MODEL,
    baseUrl: MIMO_DEFAULT_BASE_URL,
    preferApiKeyEnv: true,
    apiKeyEnv: ["MIMO_API_KEY", "CHAT_API_KEY", "CONTROLLER_MODEL_CANDIDATE_MIMO_API_KEY"],
    options: {
      max_tokens: 65536,
      enableWebSearch: false,
      enableWebExtractor: false,
      enableCodeInterpreter: false,
      enableCanvasTools: true,
      enablePreviousResponse: false,
      enableThinkingParam: true,
      showActionPolicyTrace: false
    }
  }),
  analysis: buildModelConfig("ANALYSIS", {
    provider: "openai-compatible",
    model: MIMO_DEFAULT_MODEL,
    baseUrl: MIMO_DEFAULT_BASE_URL,
    preferApiKeyEnv: true,
    apiKeyEnv: ["MIMO_API_KEY", "ANALYSIS_API_KEY", "CONTROLLER_MODEL_CANDIDATE_MIMO_API_KEY"],
    options: {
      max_tokens: 65536,
      enableWebSearch: false,
      jsonObjectResponse: true,
      enableThinkingParam: true
    }
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
  video: buildModelConfig("VIDEO", {
    provider: "dashscope-happyhorse-video",
    model: "happyhorse-1.0-i2v",
    baseUrl: "https://dashscope.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis",
    apiKeyEnv: ["DASHSCOPE_API_KEY", "VIDEO_API_KEY"],
    options: {
      resolution: "720P",
      ratio: "16:9",
      duration: 5,
      watermark: false,
      useReferenceImage: true,
      imageModel: "happyhorse-1.0-i2v",
      textModel: "happyhorse-1.0-t2v",
      pollIntervalMs: VIDEO_POLL_INTERVAL_MS,
      pollAttempts: VIDEO_POLL_ATTEMPTS
    }
  }),
  asr: buildModelConfig("ASR", {
    provider: "dashscope-livetranslate",
    model: "qwen3-livetranslate-flash-2025-12-01",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    apiKeyEnv: ["DASHSCOPE_API_KEY", "ASR_API_KEY"],
    options: { targetLanguage: "auto", chunkMs: 1800 }
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
      smoothOutput: "auto",
      transcriptionModel: "qwen3-asr-flash-realtime",
      chunkMs: 3200,
      silenceThreshold: 0.012
    }
  }),
  deepthink: buildModelConfig("DEEPTHINK", {
    provider: "dashscope-deep-research",
    model: "qwen-deep-research",
    baseUrl: "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation",
    apiKeyEnv: ["DASHSCOPE_API_KEY", "DEEPTHINK_API_KEY"],
    options: {
      sourceCardMode: "cards",
      maxCanvasCards: MAX_DEEP_RESEARCH_CANVAS_CARDS,
      maxReferenceCards: MAX_DEEP_RESEARCH_CANVAS_CARDS,
      liveCanvasCards: 6,
      outputFormat: "model_summary_report",
      incrementalOutput: true
    }
  })
};
const {
  generateDashScopeHappyHorseVideo,
  generateDashScopeQwenImage,
  generateTokenHubImage
} = createMediaGenerators({
  runtimeConfigs,
  imageIncludeDataUrl: IMAGE_INCLUDE_DATA_URL,
  imagePollIntervalMs: IMAGE_POLL_INTERVAL_MS,
  imagePollAttempts: IMAGE_POLL_ATTEMPTS,
  videoPollIntervalMs: VIDEO_POLL_INTERVAL_MS,
  videoPollAttempts: VIDEO_POLL_ATTEMPTS,
  videoSubmitTimeoutMs: VIDEO_SUBMIT_TIMEOUT_MS
});
const {
  runDashScopeDeepResearch
} = createDeepResearchRunner({
  runtimeConfigs,
  timeoutMs: DEEP_RESEARCH_TIMEOUT_MS,
  maxCanvasCards: MAX_DEEP_RESEARCH_CANVAS_CARDS,
  stringOr,
  slug,
  dedupeReferences,
  extractReferencesFromObject,
  extractReferencesFromText
});
const CANVAS_ACTION_TOOL_SCHEMA = {
  type: "function",
  function: {
    name: "canvas_action",
    description: "Execute exactly one ThoughtGrid canvas action: create a reusable card, generate/search media, analyze/research source material, manipulate view/selection/layout, export/save workspace state, or create a bounded subagent task. Use this only when the user asked for an action or when a reusable canvas artifact materially improves the task. Fill complete structured arguments so the app can execute without guessing. You may invoke this tool MULTIPLE times in a single turn when multiple high-value artifacts are genuinely useful.",
    parameters: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: CANVAS_ACTION_TYPES,
          description: [
            "The action type to execute. Available action types:",
            CANVAS_ACTION_TYPES_TEXT,
            "Routing guide:",
            "- Navigation/layout: zoom_in, zoom_out, set_zoom, reset_view, pan_view, focus_node, select_node, move_node, arrange_canvas/auto_layout/tidy_canvas, group_selection, ungroup_selection, deselect.",
            "- Reusable content cards: create_direction for visual/concept directions; create_note/create_plan/create_todo/create_weather/create_map/create_link/create_code/create_table/create_timeline/create_comparison/create_metric/create_quote for structured artifacts; create_web_card for a concrete web/reference card; create_card/new_card only when no specific type fits.",
            "- Media: image_search/text_image_search for public visual reference search from text; reverse_image_search for search from selected/attached image; generate_image for actual image creation/edit/variation; generate_video for actual video/animation creation.",
            "- Source/research: analyze_source for local source analysis; explore_source/research_source/research_node for deeper research; open_references only when a node has references.",
            "- Workspace/UI: search_card, export_report, save_session, new_chat, open_chat/open_chat_history/close_chat, open_history/open_settings/open_upload, set_thinking_mode, set_deep_think_mode.",
            "- Risky: delete_node only when the user explicitly asks to delete/remove a node. create_agent only when agent_controller_mode=true or the user explicitly asks for autonomous/subagent work.",
            "Do not use canvas_action web_search as the built-in internet search tool; it only creates/saves a web-search/reference-intent canvas card. For current information, use the model's built-in web_search when available, then call create_web_card/create_quote/create_note to preserve useful results."
          ].join("\n")
        },
        title: { type: "string", description: "Title for the new card or action" },
        description: { type: "string", description: "Description or body text" },
        prompt: { type: "string", description: "Prompt for image/video generation or detailed instruction. Required for generate_image/generate_video unless title/description already form a complete visual prompt." },
        query: { type: "string", description: "Search query. For image_search this is the internet image search query; for reverse_image_search it can refine the visual search." },
        url: { type: "string", description: "URL for link or web card" },
        imageDataUrl: { type: "string", description: "Optional data URL for image-to-image generation or reverse image search. Usually omitted because the app passes attached/selected images automatically." },
        imageUrl: { type: "string", description: "Optional public image URL for video first-frame or reference use." },
        referenceImageUrl: { type: "string", description: "Optional public reference image URL, especially for generate_video first-frame/reference use." },
        nodeType: { type: "string", enum: ["image", "note", "plan", "todo", "weather", "map", "link", "code", "table", "timeline", "comparison", "metric", "quote"], description: "Node type hint. create_direction defaults to image; rich card actions usually map to their matching type." },
        content: {
          type: "object",
          description: [
            "Structured payload that fills the rich node. REQUIRED for create_plan/create_todo/create_note/create_weather/create_map/create_link/create_web_card/create_code/create_table/create_timeline/create_comparison/create_metric/create_quote - without it the card renders empty. The chat answer must still summarize the useful result. Shape per type:",
            "Prefer concrete data over placeholders; if you only know a query, use query/search actions rather than inventing URLs.",
            "- create_plan: { summary?: string, goal?: string, context?: string, constraints?: (string|object)[], validation?: (string|object)[], progress?: (string|object)[], decisions?: (string|object)[], risks?: (string|object)[], outcomes?: (string|object)[], assumptions?: string[], steps: [{ title: string, description: string, time?: string, priority?: string, owner?: string, status?: string, validation?: string, tips?: string[] }, ...], tips?: string[], budget?: string } — use concise steps for simple plans; use rich fields for complex project/execution plans that need goals, context, constraints, validation, progress, decisions, risks, and expected outcomes. Keep the plan card an overview; split details into supporting cards when necessary",
            "- create_todo: { items: [{ text: string, done: boolean, priority?: string, rationale?: string }, ...] }",
            "- create_note: { text: string, sections?: [{ title: string, body: string }] } — the full note body in markdown. For analytical/research/planning/evaluation notes, include conclusion, evidence/context, implications/tradeoffs, risks/gaps, and next steps rather than a loose summary",
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
        parentNodeId: { type: "string", description: "Exact parent node ID for newly created cards or generated media. Use this to attach output under a specific existing node." },
        parentNodeName: { type: "string", description: "Parent node name/title when exact parentNodeId is uncertain." },
        anchorNodeId: { type: "string", description: "Exact anchor node ID for relative movement/placement." },
        anchorNodeName: { type: "string", description: "Anchor node name/title when exact anchorNodeId is uncertain." },
        target: { type: "string", description: "Target node name or target mode when nodeId is not known. Prefer nodeId when available." },
        direction: { type: "string", description: "Direction for pan_view/move_node/focus_node such as left, right, above, below, upper-left, lower-right." },
        x: { type: "number" },
        y: { type: "number" },
        dx: { type: "number", description: "Horizontal pan delta for pan_view." },
        dy: { type: "number", description: "Vertical pan delta for pan_view." },
        scale: { type: "number" },
        amount: { type: "number" },
        mode: { type: "string", description: "Optional mode hint, e.g. text-to-image, image-to-image, reverse-image-search, style, edit, reference." },
        scope: { type: "string", description: "Optional scope hint, e.g. selection for arranging selected nodes only, all for the whole canvas." },
        layoutHint: { type: "string", description: "Optional layout/style hint for new direction/media cards." },
        avoidOverlap: { type: "boolean", description: "For move_node, ask the app to avoid overlapping other cards when placing the node." },
        batchIndex: { type: "number", description: "Optional zero-based index within a multi-action batch. Usually omit because the app can assign it." },
        batchSize: { type: "number", description: "Optional total size of a multi-action batch. Usually omit because the app can assign it." },
        role: { type: "string", description: "For create_agent: the worker role or specialty, such as researcher, critic, planner, data analyst, writer, visual director, engineer, product strategist, knowledge curator, or QA." },
        skill: { type: "string", enum: AGENT_SKILL_IDS, description: "For create_agent: the skill package to run with. Use one listed skill id." },
        deliverable: { type: "string", description: "For create_agent: the concrete output the worker must return." },
        successCriteria: { type: "string", description: "For create_agent: how the controller should judge whether the subagent result is useful." },
        priority: { type: "string", description: "For create_agent: optional priority such as high, medium, or low." },
        dependencies: {
          type: "array",
          items: { type: "string" },
          description: "For create_agent: optional dependency notes or names of other subagent results this task relies on."
        }
      },
      required: ["type"]
    }
  }
};

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

const {
  buildActionTraceSummary,
  buildCanvasHarnessTrace,
  handleListActionTraceSummaries,
  persistActionTraceSummary
} = createActionTraceStore({
  logFile: CANVAS_ACTION_TRACE_LOG_FILE,
  retention: CANVAS_ACTION_TRACE_LOG_RETENTION,
  versions: {
    chatContextBudget: CHAT_CONTEXT_BUDGET_VERSION,
    chatSystemPrompt: CHAT_SYSTEM_PROMPT_VERSION,
    canvasFallback: CANVAS_FALLBACK_VERSION,
    canvasPolicy: CANVAS_POLICY_VERSION,
    canvasToolSchema: CANVAS_TOOL_SCHEMA_VERSION
  },
  toolSchema: CANVAS_ACTION_TOOL_SCHEMA,
  actionRegistry: CANVAS_ACTION_REGISTRY,
  compactActionTypes: compactPipelineActionTypes,
  defaultModel: () => runtimeConfigs.chat.model,
  defaultProvider: () => runtimeConfigs.chat.provider,
  fallbackSource: () => `${ensureChatFallbackActionsClean}\n${fallbackActionTypesForRequest}\n${buildFallbackActionContent}`
});
const {
  handleChatStream
} = createChatStreamHandler({
  attachContextBudgetDetails,
  buildChatResultFromResponse,
  emergencyFitChatPayloadToModelBudget,
  ingestChatTurn,
  isRequestBodyTooLargeError,
  persistActionTraceSummary,
  runtimeConfigs,
  streamChatCompletions,
  streamQwenResponses,
  writeSse
});

const serveStatic = createStaticFileHandler(publicDir);
const server = http.createServer(createRequestHandler({
  runtimeConfigs,
  appMode,
  roleHealth,
  refreshConfigs,
  serveStatic,
  maxBodyBytes: MAX_BODY_BYTES,
  handlers: {
    handleListActionTraceSummaries,
    handleChat,
    handleChatTitle,
    handleAsr,
    handleRealtimeVoice,
    handleDeepThink,
    handleImageSearch,
    handleRouteTask,
    handleAnalyze,
    handleAnalyzeText,
    handleAnalyzeUrl,
    handleAnalyzeExplore,
    handleGenerate,
    handleGenerateVideo,
    handleExplain
  }
}));

server.listen(PORT, HOST, () => {
  console.log(`ThoughtGrid running at http://${HOST}:${PORT}`);
  console.log(`Model mode: ${appMode()}`);
});

ensureStorageDirs().catch(console.error);
refreshConfigs().catch(console.error);
syncSystemMaterials().catch(console.error);
syncSystemHistory().catch(console.error);

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
      provider: "openai-compatible",
      model: MIMO_DEFAULT_MODEL,
      baseUrl: MIMO_DEFAULT_BASE_URL,
      preferApiKeyEnv: true,
      apiKeyEnv: ["CHAT_API_KEY", "MIMO_API_KEY", "CONTROLLER_MODEL_CANDIDATE_MIMO_API_KEY"],
      options: {
        max_tokens: 65536,
        enableWebSearch: false,
        enableWebExtractor: false,
        enableCodeInterpreter: false,
        enableCanvasTools: true,
        enablePreviousResponse: false,
        enableThinkingParam: true,
        showActionPolicyTrace: false
      }
    }, dbMap.chat);

    runtimeConfigs.analysis = buildModelConfig("ANALYSIS", {
      provider: "openai-compatible",
      model: MIMO_DEFAULT_MODEL,
      baseUrl: MIMO_DEFAULT_BASE_URL,
      preferApiKeyEnv: true,
      apiKeyEnv: ["ANALYSIS_API_KEY", "MIMO_API_KEY", "CONTROLLER_MODEL_CANDIDATE_MIMO_API_KEY"],
      options: {
        max_tokens: 65536,
        enableWebSearch: false,
        jsonObjectResponse: true,
        enableThinkingParam: true
      }
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

    runtimeConfigs.video = buildModelConfig("VIDEO", {
      provider: "dashscope-happyhorse-video",
      model: "happyhorse-1.0-i2v",
      baseUrl: "https://dashscope.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis",
      apiKeyEnv: ["DASHSCOPE_API_KEY", "VIDEO_API_KEY"],
      options: {
        resolution: "720P",
        ratio: "16:9",
        duration: 5,
        watermark: false,
        useReferenceImage: true,
        imageModel: "happyhorse-1.0-i2v",
        textModel: "happyhorse-1.0-t2v",
        pollIntervalMs: VIDEO_POLL_INTERVAL_MS,
        pollAttempts: VIDEO_POLL_ATTEMPTS
      }
    }, dbMap.video);

    runtimeConfigs.asr = buildModelConfig("ASR", {
      provider: "dashscope-livetranslate",
      model: "qwen3-livetranslate-flash-2025-12-01",
      baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
      apiKeyEnv: ["DASHSCOPE_API_KEY", "ASR_API_KEY"],
      options: { targetLanguage: "auto", chunkMs: 1800 }
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
        smoothOutput: "auto",
        transcriptionModel: "qwen3-asr-flash-realtime",
        chunkMs: 3200,
        silenceThreshold: 0.012
      }
    }, dbMap.realtime);

    runtimeConfigs.deepthink = buildModelConfig("DEEPTHINK", {
      provider: "dashscope-deep-research",
      model: "qwen-deep-research",
      baseUrl: "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation",
      apiKeyEnv: ["DASHSCOPE_API_KEY", "DEEPTHINK_API_KEY"],
      options: {
        sourceCardMode: "cards",
        maxCanvasCards: MAX_DEEP_RESEARCH_CANVAS_CARDS,
        maxReferenceCards: MAX_DEEP_RESEARCH_CANVAS_CARDS,
        liveCanvasCards: 6,
        outputFormat: "model_summary_report",
        incrementalOutput: true
      }
    }, dbMap.deepthink);
  } catch (err) {
    console.warn("[refreshConfigs] Database unavailable, using env defaults:", err.message);
  }
}

function applyAnalysisJsonObjectResponseMode(payload) {
  return applyJsonObjectResponseMode(payload, runtimeConfigs.analysis, runtimeConfigs.analysis.options?.jsonObjectResponse === true);
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
  const modes = [runtimeConfigs.chat, runtimeConfigs.analysis, runtimeConfigs.image, runtimeConfigs.video, runtimeConfigs.asr, runtimeConfigs.realtime, runtimeConfigs.deepthink].map((config) => roleHealth(config).mode);
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

  const lang = body?.language === "en" ? "en" : "zh";
  const result = await realtimeVoiceCompletion(runtimeConfigs.realtime, {
    audioDataUrl,
    pcmBase64,
    sampleRate: Number(body?.sampleRate) || 16000,
    language: lang,
    selectedContext: body?.selectedContext || null,
    analysis: normalizeChatAnalysis(body?.analysis),
    messages: normalizeChatMessages(body?.messages),
    canvas: body?.canvas && typeof body.canvas === "object" ? body.canvas : {}
  });
  const transcript = stringOr(result?.transcript, "");
  const reply = stringOr(result?.reply, "");
  const voiceActionPipeline = runCanvasActionPipeline({
    rawActions: Array.isArray(result?.actions) ? result.actions : [],
    message: transcript,
    reply,
    lang,
    thinkingMode: "no-thinking",
    model: runtimeConfigs.realtime.model,
    provider: runtimeConfigs.realtime.provider,
    sessionId: typeof body?.sessionId === "string" ? body.sessionId.trim() : "",
    selectedContext: body?.selectedContext || null,
    canvas: body?.canvas && typeof body.canvas === "object" ? body.canvas : {},
    analysis: normalizeChatAnalysis(body?.analysis),
    maxActions: MAX_QUICK_CANVAS_ACTIONS_PER_TURN,
    dependencies: canvasActionPipelineDependencies()
  });
  const actions = voiceActionPipeline.actions;

  return sendJson(res, 200, {
    provider: "api",
    model: runtimeConfigs.realtime.model,
    ...result,
    actions,
    actionPolicy: voiceActionPipeline.actionPolicy
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
  const searchConfig = buildImageSearchConfig();
  if (!query && !imageDataUrl) {
    return sendJson(res, 400, { error: "query or imageDataUrl is required" });
  }
  if (isDemoRole(searchConfig) || !isDashScopeQwenConfig(searchConfig)) {
    return sendJson(res, 200, buildDemoImageSearchResults(query, lang));
  }

  const result = await runQwenImageSearch({
    config: searchConfig,
    query,
    imageDataUrl,
    lang,
    limit: Math.max(1, Math.min(Number(body?.limit) || 8, 12))
  });
  return sendJson(res, 200, result);
}

async function handleChatTitle(body, res) {
  const message = cleanString(body?.message, 2400);
  const lang = body?.language === "en" ? "en" : "zh";
  if (!message) {
    return sendJson(res, 400, { error: "message is required" });
  }

  const fallback = fallbackChatTitle(message, lang);
  if (isDemoRole(runtimeConfigs.chat)) {
    return sendJson(res, 200, {
      provider: "demo",
      model: runtimeConfigs.chat.model,
      title: fallback
    });
  }

  try {
    const title = await generateChatTitle(message, lang);
    return sendJson(res, 200, {
      provider: "api",
      model: runtimeConfigs.chat.model,
      title: title || fallback
    });
  } catch (error) {
    console.warn("[handleChatTitle] title generation failed:", error.message);
    return sendJson(res, 200, {
      provider: "fallback",
      model: runtimeConfigs.chat.model,
      title: fallback
    });
  }
}

async function generateChatTitle(message, lang = "zh") {
  const zh = lang !== "en";
  const instructions = zh
    ? "你是织境 ThoughtGrid 的会话命名助手。请根据用户第一次对话意图，总结一个自然、具体、便于回看历史的画布标题。只返回标题本身，不要解释、不要引号、不要 Markdown。标题 3 到 18 个中文字符，避免直接照抄用户开头。"
    : "You name ThoughtGrid chat/canvas sessions. Summarize the user's first message into a natural, specific title for history browsing. Return only the title, no quotes, no Markdown, no explanation. Use 3 to 8 words and avoid copying the opening words verbatim.";
  const userPrompt = zh
    ? `用户第一次对话：${message}\n\n请输出会话标题。`
    : `First user message: ${message}\n\nReturn the session title.`;

  let text = "";
  if (isDashScopeQwenConfig(runtimeConfigs.chat)) {
    const payload = applyRequestOptions({
      model: runtimeConfigs.chat.model,
      instructions,
      input: [{ role: "user", content: userPrompt }]
    }, runtimeConfigs.chat);
    applyReasoningMode(payload, runtimeConfigs.chat, "no-thinking");
    const raw = await qwenResponsesRequest(runtimeConfigs.chat, payload);
    text = collectChatContent(responsesToChatCompletion(raw, runtimeConfigs.chat));
  } else {
    const payload = {
      messages: [
        { role: "system", content: instructions },
        { role: "user", content: userPrompt }
      ]
    };
    applyReasoningMode(payload, runtimeConfigs.chat, "no-thinking");
    const response = await chatCompletions(runtimeConfigs.chat, payload, { timeoutMs: 15000 });
    text = collectChatContent(response);
  }
  return normalizeGeneratedChatTitle(text, fallbackChatTitle(message, lang), lang);
}

function normalizeGeneratedChatTitle(value, fallback = "", lang = "zh") {
  let title = String(value || "").trim();
  try {
    const parsed = JSON.parse(title);
    title = String(parsed?.title || parsed?.name || title).trim();
  } catch {}
  title = title
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .replace(/^(标题|会话标题|title|session title)\s*[:：-]\s*/i, "")
    .replace(/[《》「」“”"']/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!title) title = fallback;
  const max = lang === "en" ? 56 : 24;
  title = title.replace(/[。.!?？；;，,]+$/g, "").slice(0, max).trim();
  return title || fallback || (lang === "en" ? "New session" : "新会话");
}

function fallbackChatTitle(message, lang = "zh") {
  let title = String(message || "")
    .replace(/^[\s/]+/, "")
    .replace(/^(请|帮我|麻烦你|请你|能不能|可以帮我|please|help me|can you)\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!title) return lang === "en" ? "New session" : "新会话";
  if (lang === "en") {
    const words = title.split(" ").filter(Boolean).slice(0, 7).join(" ");
    return words.length > 56 ? `${words.slice(0, 53)}...` : words;
  }
  return title.length > 18 ? `${title.slice(0, 18)}…` : title;
}

async function handleChat(body, res) {
  const message = typeof body?.message === "string" ? body.message.trim().slice(0, 32000) : "";
  const imageDataUrl = normalizeDataUrl(body?.imageDataUrl);
  const imageDataUrls = normalizeImageDataUrls(body?.imageDataUrls || body?.images || body?.imagesDataUrls, imageDataUrl);
  const videoDataUrl = normalizeVideoDataUrl(body?.videoDataUrl);
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
  const chatDocumentAttachments = await normalizeChatDocumentAttachments(body?.chatAttachments || body?.attachments, lang);
  const attachmentContext = buildChatAttachmentContext(chatDocumentAttachments, lang);
  if (attachmentContext) {
    systemContext = systemContext
      ? `${systemContext}\n\n${attachmentContext}`
      : attachmentContext;
  }
  if (chatDocumentAttachments.length) {
    ingestChatDocumentAttachments(sessionId, chatDocumentAttachments).catch((e) =>
      console.warn("[handleChat] document attachment ingest failed:", e.message)
    );
  }
  const ingestUserMessage = attachmentContext ? `${message}\n\n${attachmentContext.slice(0, 4000)}` : message;

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

  const chatOptions = runtimeConfigs.chat.options || {};
  const activeAgentSkill = normalizeAgentSkill(body?.agentSkill, "", message);
  const activeAgentSkillTools = agentSkillToolFlags(activeAgentSkill);
  const webSearchEnabled = chatOptions.enableWebSearch !== false && (activeAgentSkillTools.webSearch || shouldUseWebSearchReadable(message, canvas, selectedContext));
  const webSearchForced = chatOptions.enableWebSearch !== false && (activeAgentSkillTools.webSearch || shouldForceWebSearchReadable(message));
  const subagentsEnabled = body?.subagentsEnabled === true;
  const agentMode = subagentsEnabled && (body?.agentMode === true || shouldUseAgentModeReadable(message));
  const hasVideoInput = Boolean(videoDataUrl);
  const effectivePreviousResponseId = hasVideoInput || chatOptions.enablePreviousResponse === false ? "" : previousResponseId;
  const promptMessages = effectivePreviousResponseId ? [] : messages;
  const context = buildChatSystemContext(lang, analysis, promptMessages);
  const userPrompt = buildChatUserPrompt({
    message,
    analysis,
    selectedContext,
    canvas,
    messages: promptMessages,
    systemContext,
    thinkingMode,
    webSearchEnabled,
    agentMode,
    agentSkill: activeAgentSkill,
    lang
  });
  const contextTiers = buildChatContextBudgetTiers({
    message,
    selectedContext,
    canvas,
    messages: promptMessages,
    systemContext,
    attachmentContext,
    retrieved,
    imageDataUrls,
    videoDataUrl
  });

  const content = [
    { type: "input_text", text: userPrompt }
  ];
  for (const imageUrl of imageDataUrls) {
    content.push({ type: "input_image", image_url: imageUrl });
  }

  if (hasVideoInput) {
    const videoChatPayload = buildVideoChatCompletionsPayload({
      instructions: context,
      userPrompt,
      imageDataUrl,
      imageDataUrls,
      videoDataUrl,
      message,
      webSearchEnabled: webSearchEnabled || webSearchForced,
      thinkingMode,
      agentMode,
      agentSkill: activeAgentSkill
    });
    applyChatQualityRequestOptions(videoChatPayload, runtimeConfigs.chat, message, {
      webSearchEnabled: webSearchEnabled || webSearchForced,
      agentMode
    });
    const videoBudget = attachContextBudgetDetails(fitChatPayloadToModelBudget(videoChatPayload, runtimeConfigs.chat, {
      stream: body?.stream === true,
      transport: "chat-completions",
      lang
    }), contextTiers);

    if (body?.stream === true) {
      return await handleChatStream({
        payload: videoChatPayload,
        message,
        thinkingMode,
        agentMode,
        lang,
        selectedContext,
        canvas,
        analysis,
        sessionId,
        ingestMessage: ingestUserMessage,
        retrievedCount: retrieved.length,
        webSearchEnabled: webSearchEnabled || webSearchForced,
        transport: "chat-completions",
        resetPreviousResponseId: true,
        contextBudget: videoBudget,
        systemPrompt: context
      }, res);
    }

    let response;
    let effectiveVideoBudget = videoBudget;
    try {
      response = await chatCompletions(runtimeConfigs.chat, videoChatPayload, {
        timeoutMs: CHAT_COMPLETION_TIMEOUT_MS
      });
    } catch (error) {
      if (!isRequestBodyTooLargeError(error)) throw error;
      effectiveVideoBudget = attachContextBudgetDetails(emergencyFitChatPayloadToModelBudget(videoChatPayload, runtimeConfigs.chat, {
        stream: false,
        transport: "chat-completions",
        lang,
        previousBudget: videoBudget
      }), contextTiers);
      response = await chatCompletions(runtimeConfigs.chat, videoChatPayload, {
        timeoutMs: CHAT_COMPLETION_TIMEOUT_MS
      });
    }
    const finalPayload = buildChatResultFromResponse({
      response,
      message,
      thinkingMode,
      agentMode,
      lang,
      selectedContext,
      canvas,
      analysis,
      webSearchEnabled: webSearchEnabled || webSearchForced,
      contextBudget: effectiveVideoBudget,
      systemPrompt: context,
      sessionId
    });
    delete finalPayload.responseId;
    delete finalPayload.previousResponseId;
    finalPayload.resetPreviousResponseId = true;
    if (retrieved.length) finalPayload.retrievedContext = retrieved.length;
    persistActionTraceSummary({ source: "chat_video", sessionId, message, payload: finalPayload, transport: "chat-completions" });
    ingestChatTurn(sessionId, ingestUserMessage, finalPayload.reply || "").catch((e) =>
      console.warn("[handleChat] chat turn ingest failed:", e.message)
    );
    return sendJson(res, 200, finalPayload);
  }

  const chatTransport = shouldUseQwenResponsesTransport(runtimeConfigs.chat) ? "responses" : "chat-completions";
  const chatPayload = chatTransport === "responses"
    ? buildChatResponsesPayload({
        instructions: buildChatSystemContext(lang, analysis, promptMessages),
        content,
        message,
        previousResponseId: effectivePreviousResponseId,
        webSearchEnabled: webSearchEnabled || webSearchForced,
        thinkingMode,
        agentMode,
        agentSkill: activeAgentSkill
      })
    : buildTextChatCompletionsPayload({
        instructions: context,
        userPrompt,
        imageDataUrl,
        imageDataUrls,
        message,
        webSearchEnabled: webSearchEnabled || webSearchForced,
        thinkingMode,
        agentMode,
        agentSkill: activeAgentSkill
      });
  applyChatQualityRequestOptions(chatPayload, runtimeConfigs.chat, message, {
    webSearchEnabled: webSearchEnabled || webSearchForced,
    agentMode
  });
  const contextBudget = attachContextBudgetDetails(fitChatPayloadToModelBudget(chatPayload, runtimeConfigs.chat, {
    stream: body?.stream === true,
    transport: chatTransport,
    lang
  }), contextTiers);

  if (body?.stream === true) {
    return await handleChatStream({
      payload: chatPayload,
      message,
      thinkingMode,
      agentMode,
      lang,
      selectedContext,
      canvas,
      analysis,
      sessionId,
      ingestMessage: ingestUserMessage,
      retrievedCount: retrieved.length,
      webSearchEnabled: webSearchEnabled || webSearchForced,
      contextBudget,
      systemPrompt: chatPayload.instructions || context,
      transport: chatTransport
    }, res);
  }

  let rawChatResponse;
  let effectiveContextBudget = contextBudget;
  try {
    rawChatResponse = chatTransport === "responses"
      ? await qwenResponsesRequest(runtimeConfigs.chat, applyRequestOptions({
          model: runtimeConfigs.chat.model,
          ...chatPayload
        }, runtimeConfigs.chat))
      : await chatCompletions(runtimeConfigs.chat, chatPayload);
  } catch (error) {
    if (!isRequestBodyTooLargeError(error)) throw error;
    effectiveContextBudget = attachContextBudgetDetails(emergencyFitChatPayloadToModelBudget(chatPayload, runtimeConfigs.chat, {
      stream: false,
      transport: chatTransport,
      lang,
      previousBudget: contextBudget
    }), contextTiers);
    rawChatResponse = chatTransport === "responses"
      ? await qwenResponsesRequest(runtimeConfigs.chat, applyRequestOptions({
          model: runtimeConfigs.chat.model,
          ...chatPayload
        }, runtimeConfigs.chat))
      : await chatCompletions(runtimeConfigs.chat, chatPayload);
  }

  const response = chatTransport === "responses"
    ? responsesToChatCompletion(rawChatResponse, runtimeConfigs.chat)
    : rawChatResponse;

  const references = extractResponseReferences(response);
  const rawReply = collectChatContent(response);
  const inlineActions = extractInlineCanvasActionsFromReply(rawReply, { allowedTypes: CANVAS_ACTION_TYPES });
  const visibleRawReply = inlineActions.length ? removeInlineCanvasActionBlocks(rawReply, { allowedTypes: CANVAS_ACTION_TYPES }) : rawReply;
  const thinkingContent = thinkingMode === "thinking" ? sanitizeReasoningContent(collectReasoningContent(response), rawReply) : "";
  const reply = visibleChatReplyOrEmpty(normalizeCitationMarkers(stripReasoningEchoFromResponseText(visibleRawReply, thinkingContent).trim(), references));
  const toolActions = extractToolCallActions(response);
  const rawActions = [...toolActions, ...inlineActions];
  const actionPipeline = runCanvasActionPipeline({
    rawActions,
    message,
    reply,
    response,
    lang,
    thinkingMode,
    model: runtimeConfigs.chat.model,
    provider: runtimeConfigs.chat.provider,
    sessionId,
    toolActions,
    inlineActions,
    thinkingMentionedActionTypes: compactMentionedCanvasActionTypes(thinkingContent),
    agentMode,
    selectedContext,
    canvas,
    analysis,
    webSearchEnabled: webSearchEnabled || webSearchForced,
    maxActions: canvasActionLimitForThinkingMode(thinkingMode),
    harness: buildCanvasHarnessTrace({ systemPrompt: chatPayload.instructions, contextBudget: effectiveContextBudget }),
    dependencies: canvasActionPipelineDependencies()
  });
  const actions = actionPipeline.actions;
  logCanvasActionPipelineDiagnostics({
    source: "chat",
    message,
    reply,
    thinkingMode,
    rawActions,
    inlineActions,
    thinkingContent,
    actionPipeline
  });
  const finalReply = finalizeChatReply(reply, actions, lang, references) || (lang === "en" ? "Got it. We can keep exploring from here." : "我读到了，我们可以继续从这里展开。");

  // Fire-and-forget: persist this turn into the session context pool.
  ingestChatTurn(sessionId, ingestUserMessage, finalReply).catch((e) =>
    console.warn("[handleChat] chat turn ingest failed:", e.message)
  );

  const finalPayload = {
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
    actionPolicy: actionPipeline.actionPolicy,
    actionTrace: actionPipeline.trace,
    contextBudget: effectiveContextBudget,
    retrievedContext: retrieved.length ? retrieved.length : undefined
  };
  persistActionTraceSummary({ source: "chat", sessionId, message, payload: finalPayload, transport: "responses" });
  return sendJson(res, 200, finalPayload);
}

async function normalizeChatDocumentAttachments(value, lang = "zh") {
  const raw = Array.isArray(value) ? value : (value ? [value] : []);
  const results = [];
  const seen = new Set();
  for (const item of raw.slice(0, CHAT_ATTACHMENT_MAX_COUNT)) {
    if (!item || typeof item !== "object") continue;
    const kind = String(item.type || item.kind || "").toLowerCase();
    if (kind.includes("image")) continue;
    const fileName = String(item.fileName || item.name || item.title || "document").trim().slice(0, 180);
    const mimeType = String(item.mimeType || "").trim().slice(0, 180);
    const source = String(item.source || "").trim().slice(0, 120);
    const nodeId = String(item.nodeId || item.id || "").trim().slice(0, 120);
    if (kind.includes("video") || mimeType.startsWith("video/")) {
      const normalized = {
        type: "video",
        fileName: fileName || "video",
        mimeType,
        ext: extensionFromFileName(fileName) || extensionFromMimeType(mimeType) || "video",
        source,
        nodeId,
        text: "",
        truncated: false,
        totalPages: 0,
        isScanned: false,
        parseError: "",
        duration: Number.isFinite(Number(item.duration)) ? Number(item.duration) : 0,
        size: Number.isFinite(Number(item.size)) ? Number(item.size) : 0
      };
      const key = chatAttachmentDedupeKey(normalized);
      if (!seen.has(key)) {
        seen.add(key);
        results.push(normalized);
      }
      continue;
    }
    const dataUrl = typeof item.dataUrl === "string" ? item.dataUrl.trim() : "";
    let ext = extensionFromFileName(fileName) || extensionFromMimeType(mimeType) || "";
    let text = typeof item.text === "string" ? item.text.trim() : "";
    let totalPages = 0;
    let isScanned = false;
    let parseError = "";

    if (dataUrl && !text) {
      try {
        const document = await extractDocumentTextFromDataUrl(dataUrl, fileName);
        ext = ext || document.ext || "txt";
        text = document.text || "";
        totalPages = document.totalPages || 0;
        isScanned = Boolean(document.isScanned);
      } catch (error) {
        parseError = error.message || "Failed to parse attachment.";
      }
    }

    const truncated = text.length > CHAT_ATTACHMENT_MAX_CHARS;
    const normalized = {
      fileName,
      mimeType,
      ext,
      source,
      nodeId,
      text: text.slice(0, CHAT_ATTACHMENT_MAX_CHARS),
      truncated,
      totalPages,
      isScanned,
      parseError: parseError.slice(0, 240)
    };
    const key = chatAttachmentDedupeKey({
      ...normalized,
      dataUrl,
      size: Number.isFinite(Number(item.size)) ? Number(item.size) : 0
    });
    if (!seen.has(key)) {
      seen.add(key);
      results.push(normalized);
    }
  }
  return results.filter((item) => item.fileName || item.text || item.parseError);
}

function chatAttachmentDedupeKey(item = {}) {
  const contentKey = dataUrlDedupeKey(item.dataUrl || item.text || item.assetUrl || item.url || item.hash || "");
  return [
    item.type || item.kind || "file",
    item.source || "",
    item.nodeId || item.id || "",
    item.fileName || item.name || item.title || "",
    item.mimeType || "",
    Number.isFinite(Number(item.size)) ? Number(item.size) : 0,
    Number.isFinite(Number(item.duration)) ? Math.round(Number(item.duration) * 1000) : 0,
    contentKey
  ].join("|");
}

async function extractDocumentTextFromDataUrl(dataUrl, fileName = "") {
  const parsedDataUrl = parseDataUrl(dataUrl);
  const ext = extensionFromFileName(fileName) || parsedDataUrl.ext || "txt";
  const extracted = await extractDocumentTextFromBuffer(parsedDataUrl.buffer, ext);
  return {
    ...parsedDataUrl,
    ...extracted,
    ext
  };
}

async function extractDocumentTextFromBuffer(buffer, ext) {
  let structuredMeta = {};
  try {
    const structured = await parseFileStructured(buffer, ext);
    structuredMeta = {
      totalPages: structured.totalPages || 0,
      isScanned: Boolean(structured.isScanned)
    };
    const text = structured.allText || "";
    if (text.trim()) {
      return { text, ...structuredMeta };
    }
  } catch {}
  const extracted = extractTextFromBuffer(buffer, ext);
  return {
    text: extracted?.text || "",
    totalPages: structuredMeta.totalPages || 0,
    isScanned: Boolean(structuredMeta.isScanned)
  };
}

function buildChatAttachmentContext(attachments, lang = "zh") {
  if (!attachments.length) return "";
  const isEn = lang === "en";
  const textAttachments = attachments.filter((attachment) => attachment.type !== "video");
  const perAttachmentReserve = textAttachments.length > 1
    ? Math.max(1200, Math.floor(CHAT_ATTACHMENT_MAX_CHARS / Math.min(textAttachments.length, CHAT_ATTACHMENT_MAX_COUNT)))
    : CHAT_ATTACHMENT_MAX_CHARS;
  let sharedRemaining = CHAT_ATTACHMENT_MAX_CHARS;
  const lines = [
    isEn ? "# Document Context" : "# 文档上下文",
    isEn
      ? "Use these uploaded or selected source-card document contents as first-class context for the current answer. Multiple documents are sampled fairly so later files are not silently ignored. If extraction is limited, state that limitation clearly."
      : "请把这些上传或选中的源卡片文档内容作为本轮回答的一等上下文使用。多个文档会公平采样，避免后面的文件被静默忽略；如果提取受限，请在回答中明确说明局限。"
  ];

  for (const attachment of attachments) {
    const title = attachment.fileName || (isEn ? "document" : "文档");
    const meta = [
      attachment.ext ? `type=${attachment.ext}` : "",
      attachment.totalPages ? (isEn ? `pages/slides=${attachment.totalPages}` : `页/张=${attachment.totalPages}`) : "",
      attachment.duration ? (isEn ? `duration=${Math.round(attachment.duration)}s` : `时长=${Math.round(attachment.duration)}秒`) : "",
      attachment.isScanned ? (isEn ? "scanned=true" : "扫描件=true") : ""
    ].filter(Boolean).join(", ");
    lines.push("", `## ${title}${meta ? ` (${meta})` : ""}`);
    if (attachment.type === "video") {
      lines.push(isEn ? "Video attachment metadata is listed here; one selected/attached video may be sent separately as direct model video input, while additional videos remain represented by canvas metadata." : "这里列出视频附件元数据；一个选中/附加视频可能会作为模型视频输入单独发送，其余视频会以画布元数据形式保留。");
      continue;
    }
    if (attachment.parseError) {
      lines.push(isEn ? `Extraction warning: ${attachment.parseError}` : `提取警告：${attachment.parseError}`);
    }
    if (attachment.text && sharedRemaining > 0) {
      const limit = Math.min(perAttachmentReserve, sharedRemaining);
      const chunk = attachment.text.slice(0, limit);
      lines.push(isEn ? "Extracted content:" : "提取内容：", chunk);
      sharedRemaining -= chunk.length;
      if (attachment.truncated || chunk.length < attachment.text.length || sharedRemaining <= 0) {
        lines.push(isEn ? "[Content truncated for prompt length.]" : "【因提示词长度限制，内容已截断。】");
      }
    } else if (!attachment.text) {
      lines.push(isEn ? "No readable text was extracted from this attachment." : "未能从该附件中提取到可读文本。");
    }
  }
  return lines.join("\n").slice(0, CHAT_ATTACHMENT_MAX_CHARS + 2000);
}

async function ingestChatDocumentAttachments(sessionId, attachments) {
  if (!sessionId || !isEmbeddingConfigured()) return;
  for (let index = 0; index < attachments.length; index += 1) {
    const attachment = attachments[index];
    const text = String(attachment?.text || "").trim();
    if (text.length < 30) continue;
    const identity = [
      attachment.nodeId || "",
      attachment.source || "",
      attachment.fileName || "",
      dataUrlDedupeKey(text).slice(0, 48),
      index
    ].filter(Boolean).join(":");
    await ingestText({
      sessionId,
      kind: CONTEXT_KINDS.FILE,
      text,
      sourceId: `chat-file:${identity || Date.now()}`,
      sourceMeta: {
        fileName: attachment.fileName || "",
        mimeType: attachment.mimeType || "",
        ext: attachment.ext || ""
      },
      replace: true
    });
  }
}

function byteLength(value) {
  return Buffer.byteLength(typeof value === "string" ? value : JSON.stringify(value || ""), "utf8");
}

function contextTier(name, priority, value, extra = {}) {
  return {
    name,
    priority,
    bytes: byteLength(value),
    retained: true,
    ...extra
  };
}

function buildChatContextBudgetTiers({ message = "", selectedContext = null, canvas = {}, messages = [], systemContext = "", attachmentContext = "", retrieved = [], imageDataUrls = [], videoDataUrl = "" } = {}) {
  const nodes = Array.isArray(canvas?.nodes) ? canvas.nodes : (Array.isArray(canvas?.visibleNodes) ? canvas.visibleNodes : []);
  const edges = Array.isArray(canvas?.links) ? canvas.links : (Array.isArray(canvas?.edges) ? canvas.edges : []);
  const tiers = [
    contextTier("user_message", 1, message),
    contextTier("selected_card", 2, selectedContext || {}, { itemCount: selectedContext ? 1 : 0 }),
    contextTier("active_canvas_summary", 3, { nodes, edges }, { itemCount: nodes.length }),
    contextTier("recent_chat_turns", 4, messages, { itemCount: Array.isArray(messages) ? messages.length : 0 }),
    contextTier("retrieved_session_memory", 5, retrieved, { itemCount: Array.isArray(retrieved) ? retrieved.length : 0 }),
    contextTier("attachment_context", 5, attachmentContext),
    contextTier("tool_action_policy_contract", 6, CANVAS_ACTION_TYPES_TEXT),
    contextTier("app_system_context", 6, systemContext),
    contextTier("large_raw_artifacts", 7, "", {
      itemCount: imageDataUrls.length + (videoDataUrl ? 1 : 0),
      bytes: imageDataUrls.reduce((sum, item) => sum + byteLength(item), 0) + byteLength(videoDataUrl),
      retained: true
    })
  ];
  return {
    version: CHAT_CONTEXT_BUDGET_VERSION,
    tiers,
    totalTierBytes: tiers.reduce((sum, tier) => sum + tier.bytes, 0)
  };
}

function attachContextBudgetDetails(budget, contextTiers) {
  if (!budget) return budget;
  return {
    ...budget,
    version: CHAT_CONTEXT_BUDGET_VERSION,
    tiers: contextTiers?.tiers || [],
    totalTierBytes: contextTiers?.totalTierBytes || 0
  };
}

function buildChatResultFromResponse({ response, message, thinkingMode, agentMode, lang, streamedReasoning = "", webSearchEnabled = false, selectedContext = null, canvas = {}, analysis = {}, contextBudget = null, systemPrompt = "", sessionId = "" }) {
  const references = extractResponseReferences(response);
  const rawReply = collectChatContent(response);
  const inlineActions = extractInlineCanvasActionsFromReply(rawReply, { allowedTypes: CANVAS_ACTION_TYPES });
  const visibleRawReply = inlineActions.length ? removeInlineCanvasActionBlocks(rawReply, { allowedTypes: CANVAS_ACTION_TYPES }) : rawReply;
  const thinkingContent = thinkingMode === "thinking" ? sanitizeReasoningContent(streamedReasoning || collectReasoningContent(response), rawReply) : "";
  const reply = visibleChatReplyOrEmpty(normalizeCitationMarkers(stripReasoningEchoFromResponseText(visibleRawReply, thinkingContent).trim(), references));
  const toolActions = extractToolCallActions(response);
  const rawActions = [...toolActions, ...inlineActions];
  const actionPipeline = runCanvasActionPipeline({
    rawActions,
    message,
    reply,
    response,
    lang,
    thinkingMode,
    model: runtimeConfigs.chat.model,
    provider: runtimeConfigs.chat.provider,
    sessionId,
    toolActions,
    inlineActions,
    thinkingMentionedActionTypes: compactMentionedCanvasActionTypes(thinkingContent),
    agentMode,
    selectedContext,
    canvas,
    analysis,
    webSearchEnabled,
    maxActions: canvasActionLimitForThinkingMode(thinkingMode),
    harness: buildCanvasHarnessTrace({ systemPrompt, contextBudget }),
    dependencies: canvasActionPipelineDependencies()
  });
  const actions = actionPipeline.actions;
  logCanvasActionPipelineDiagnostics({
    source: "chat_stream",
    message,
    reply,
    thinkingMode,
    rawActions,
    inlineActions,
    thinkingContent,
    actionPipeline
  });
  const finalReply = finalizeChatReply(reply, actions, lang, references) || (lang === "en" ? "Got it. We can keep exploring from here." : "我读到了，我们可以继续从这里展开。");
  return {
    provider: "api",
    model: runtimeConfigs.chat.model,
    reply: finalReply,
    actions,
    artifacts: buildChatArtifacts(response, actions, agentMode),
    thinkingContent,
    thinkingTrace: [],
    responseId: response?.id || undefined,
    previousResponseId: response?.id || undefined,
    references,
    actionPolicy: actionPipeline.actionPolicy,
    actionTrace: actionPipeline.trace,
    contextBudget
  };
}

function fitChatPayloadToModelBudget(payload, config, { stream = false, transport = "responses", lang = "zh" } = {}) {
  const target = Math.max(1024 * 1024, Math.min(CHAT_MODEL_REQUEST_BODY_TARGET_BYTES, CHAT_MODEL_REQUEST_BODY_LIMIT_BYTES - 64 * 1024));
  const budget = {
    beforeBytes: estimateModelRequestBytes(payload, config, { stream, transport }),
    afterBytes: 0,
    targetBytes: target,
    limitBytes: CHAT_MODEL_REQUEST_BODY_LIMIT_BYTES,
    droppedImages: 0,
    droppedVideo: false,
    compactedText: false,
    reduced: false
  };
  if (budget.beforeBytes <= target) {
    budget.afterBytes = budget.beforeBytes;
    return budget;
  }

  const notice = lang === "en"
    ? "\n\n[Context budget note: some large media or long context was compacted before sending to the model. Use visible canvas metadata and ask for a focused re-analysis if exact pixels/video details are needed.]"
    : "\n\n【上下文预算提示：部分大媒体或长上下文在发送给模型前已压缩/降级。若需要精确像素或视频细节，请让用户聚焦某张图/某段视频重新分析。】";

  if (estimateModelRequestBytes(payload, config, { stream, transport }) > target && largestVideoPartBytes(payload) > target * 0.45 && removeVideoPart(payload)) {
    budget.droppedVideo = true;
    budget.reduced = true;
    appendPromptNotice(payload, notice);
  }

  const textLimits = [48000, 32000, 24000, 16000, 10000, 7000, 5000, 3500];
  for (const limit of textLimits) {
    if (estimateModelRequestBytes(payload, config, { stream, transport }) <= target) break;
    if (compactLargestTextPart(payload, limit, notice)) {
      budget.compactedText = true;
      budget.reduced = true;
    } else {
      break;
    }
  }

  if (estimateModelRequestBytes(payload, config, { stream, transport }) > target && removeVideoPart(payload)) {
    budget.droppedVideo = true;
    budget.reduced = true;
    appendPromptNotice(payload, notice);
  }

  while (estimateModelRequestBytes(payload, config, { stream, transport }) > target && removeLastImagePart(payload)) {
    budget.droppedImages += 1;
    budget.reduced = true;
  }

  budget.afterBytes = estimateModelRequestBytes(payload, config, { stream, transport });
  return budget;
}

function emergencyFitChatPayloadToModelBudget(payload, config, { stream = false, transport = "responses", lang = "zh", previousBudget = null } = {}) {
  const target = Math.max(512 * 1024, Math.min(Math.floor(CHAT_MODEL_REQUEST_BODY_LIMIT_BYTES * 0.55), CHAT_MODEL_REQUEST_BODY_TARGET_BYTES));
  const budget = {
    beforeBytes: previousBudget?.beforeBytes || estimateModelRequestBytes(payload, config, { stream, transport }),
    afterBytes: 0,
    targetBytes: target,
    limitBytes: CHAT_MODEL_REQUEST_BODY_LIMIT_BYTES,
    droppedImages: previousBudget?.droppedImages || 0,
    droppedVideo: Boolean(previousBudget?.droppedVideo),
    compactedText: Boolean(previousBudget?.compactedText),
    emergencyRetry: true,
    reduced: true
  };
  const notice = lang === "en"
    ? "\n\n[Emergency context budget note: the provider rejected the first request as too large. All raw media was removed from the retry and long context was compressed. Rely on canvas metadata and ask for focused media re-analysis when exact visual details matter.]"
    : "\n\n【紧急上下文预算提示：供应商拒绝了首次请求，原因是请求体过大。重试时已移除原始媒体并压缩长上下文；需要精确视觉细节时，请让用户聚焦具体图片/视频重新分析。】";

  while (removeLastImagePart(payload)) budget.droppedImages += 1;
  while (removeVideoPart(payload)) budget.droppedVideo = true;
  appendPromptNotice(payload, notice);

  const textLimits = [24000, 16000, 10000, 7000, 5000, 3500, 2400, 1600];
  for (const limit of textLimits) {
    if (estimateModelRequestBytes(payload, config, { stream, transport }) <= target) break;
    if (compactLargestTextPart(payload, limit, notice)) budget.compactedText = true;
  }

  budget.afterBytes = estimateModelRequestBytes(payload, config, { stream, transport });
  return budget;
}

function isRequestBodyTooLargeError(error) {
  return /TooLarge|Exceeded limit|max bytes|request body|413|BadRequst\.TooLarge/i.test(String(error?.message || error || ""));
}

function estimateModelRequestBytes(payload, config, { stream = false, transport = "responses" } = {}) {
  const requestPayload = {
    model: config.model,
    ...payload
  };
  if (stream) {
    requestPayload.stream = true;
    if (transport === "chat-completions") {
      requestPayload.stream_options = {
        ...(payload.stream_options || {}),
        include_usage: false
      };
    }
  }
  if (requestPayload.temperature === undefined && typeof config?.temperature === "number") {
    requestPayload.temperature = config.temperature;
  }
  const options = config?.options || {};
  if (requestPayload.top_p === undefined && typeof options.top_p === "number") {
    requestPayload.top_p = options.top_p;
  }
  if (requestPayload.max_tokens === undefined && Number.isInteger(options.max_tokens)) {
    requestPayload.max_tokens = options.max_tokens;
  }
  return Buffer.byteLength(JSON.stringify(requestPayload), "utf8");
}

function removeLastImagePart(payload) {
  const containers = getModelContentContainers(payload);
  for (let i = containers.length - 1; i >= 0; i -= 1) {
    const content = containers[i];
    for (let j = content.length - 1; j >= 0; j -= 1) {
      if (isImageContentPart(content[j])) {
        content.splice(j, 1);
        return true;
      }
    }
  }
  return false;
}

function removeVideoPart(payload) {
  const containers = getModelContentContainers(payload);
  for (const content of containers) {
    const index = content.findIndex((part) => isVideoContentPart(part));
    if (index >= 0) {
      content.splice(index, 1);
      return true;
    }
  }
  return false;
}

function largestVideoPartBytes(payload) {
  let max = 0;
  for (const content of getModelContentContainers(payload)) {
    for (const part of content) {
      if (!isVideoContentPart(part)) continue;
      max = Math.max(max, Buffer.byteLength(JSON.stringify(part), "utf8"));
    }
  }
  return max;
}

function compactLargestTextPart(payload, maxChars, notice = "") {
  let best = null;
  for (const content of getModelContentContainers(payload)) {
    for (const part of content) {
      const text = getContentPartText(part);
      if (text.length > maxChars && (!best || text.length > best.text.length)) {
        best = { part, text };
      }
    }
  }
  if (!best) return false;
  setContentPartText(best.part, compactTextPreserveEnds(best.text, maxChars, notice));
  return true;
}

function appendPromptNotice(payload, notice) {
  const containers = getModelContentContainers(payload);
  for (let i = containers.length - 1; i >= 0; i -= 1) {
    for (const part of containers[i]) {
      const text = getContentPartText(part);
      if (text) {
        setContentPartText(part, `${text}${notice}`);
        return true;
      }
    }
  }
  return false;
}

function getModelContentContainers(payload) {
  const containers = [];
  const inputContent = payload?.input?.[0]?.content;
  if (Array.isArray(inputContent)) containers.push(inputContent);
  const messages = Array.isArray(payload?.messages) ? payload.messages : [];
  for (const message of messages) {
    if (Array.isArray(message?.content)) containers.push(message.content);
  }
  return containers;
}

function isImageContentPart(part) {
  if (!part || typeof part !== "object") return false;
  return part.type === "input_image" || part.type === "image_url" || Boolean(part.image_url && !part.video_url);
}

function isVideoContentPart(part) {
  if (!part || typeof part !== "object") return false;
  return part.type === "video_url" || Boolean(part.video_url);
}

function getContentPartText(part) {
  if (!part || typeof part !== "object") return "";
  if (typeof part.text === "string") return part.text;
  if (typeof part.content === "string") return part.content;
  return "";
}

function setContentPartText(part, text) {
  if (!part || typeof part !== "object") return;
  if (typeof part.text === "string" || part.type === "input_text" || part.type === "text") {
    part.text = text;
  } else {
    part.content = text;
  }
}

function compactTextPreserveEnds(text, maxChars, notice = "") {
  const value = String(text || "");
  if (value.length <= maxChars) return value;
  const marker = notice || "\n\n[Context compacted.]\n\n";
  const remaining = Math.max(1000, maxChars - marker.length);
  const head = Math.ceil(remaining * 0.68);
  const tail = Math.max(500, remaining - head);
  return `${value.slice(0, head)}${marker}\n\n${value.slice(-tail)}`;
}

function buildChatResponsesPayload({ instructions, content, message, previousResponseId, webSearchEnabled, thinkingMode, agentMode = false, wrappedCanvasTool = false, agentSkill = "" }) {
  const tools = buildResponsesTools(message, webSearchEnabled, { wrappedCanvasTool, agentMode, agentSkill, thinkingMode });
  const payload = {
    instructions,
    input: [
      {
        role: "user",
        content
      }
    ]
  };
  if (tools.length) {
    payload.tools = tools;
    payload.tool_choice = "auto";
  }
  if (previousResponseId) payload.previous_response_id = previousResponseId;
  applyReasoningMode(payload, runtimeConfigs.chat, thinkingMode);
  if (tools.some((tool) => tool.type === "web_search" || tool.type === "web_extractor" || tool.type === "code_interpreter")) {
    payload.enable_thinking = true;
  }
  return payload;
}

function buildVideoChatCompletionsPayload({ instructions, userPrompt, imageDataUrl, imageDataUrls = [], videoDataUrl, message, webSearchEnabled, thinkingMode, agentMode = false, agentSkill = "" }) {
  const content = [
    { type: "video_url", video_url: { url: videoDataUrl }, fps: 2 }
  ];
  const images = normalizeImageDataUrls(imageDataUrls, imageDataUrl);
  for (const imageUrl of images) {
    content.push({ type: "image_url", image_url: { url: imageUrl } });
  }
  content.push({ type: "text", text: userPrompt });

  const payload = {
    messages: [
      { role: "system", content: instructions },
      { role: "user", content }
    ]
  };
  const chatOptions = runtimeConfigs.chat.options || {};
  const skillTools = agentSkillToolFlags(agentSkill);
  const canvasPolicy = buildCanvasActionPolicy(message, { agentMode, agentSkill, thinkingMode });
  if (chatOptions.enableCanvasTools !== false && canvasPolicy.allowCanvasTool) {
    payload.tools = [buildChatCompletionsCanvasToolSchema(canvasPolicy)];
    payload.tool_choice = "auto";
  }
  applyReasoningMode(payload, runtimeConfigs.chat, thinkingMode);
  applyWebSearchMode(payload, runtimeConfigs.chat, webSearchEnabled);
  if (skillTools.codeInterpreter && chatOptions.enableCodeInterpreter !== false) {
    payload.tools = payload.tools || [];
    if (!payload.tools.some((tool) => tool.type === "code_interpreter")) payload.tools.push({ type: "code_interpreter" });
    payload.tool_choice = "auto";
  }
  return payload;
}

function buildTextChatCompletionsPayload({ instructions, userPrompt, imageDataUrl, imageDataUrls = [], message, webSearchEnabled, thinkingMode, agentMode = false, agentSkill = "" }) {
  const content = [{ type: "text", text: userPrompt }];
  const images = normalizeImageDataUrls(imageDataUrls, imageDataUrl);
  for (const imageUrl of images) {
    content.push({ type: "image_url", image_url: { url: imageUrl } });
  }
  const payload = {
    messages: [
      { role: "system", content: instructions },
      { role: "user", content }
    ]
  };
  const chatOptions = runtimeConfigs.chat.options || {};
  const skillTools = agentSkillToolFlags(agentSkill);
  const canvasPolicy = buildCanvasActionPolicy(message, { agentMode, agentSkill, thinkingMode });
  if (chatOptions.enableCanvasTools !== false && canvasPolicy.allowCanvasTool) {
    payload.tools = [buildChatCompletionsCanvasToolSchema(canvasPolicy)];
    payload.tool_choice = "auto";
  }
  applyReasoningMode(payload, runtimeConfigs.chat, thinkingMode);
  applyWebSearchMode(payload, runtimeConfigs.chat, webSearchEnabled);
  if (skillTools.codeInterpreter && chatOptions.enableCodeInterpreter !== false && isDashScopeQwenConfig(runtimeConfigs.chat)) {
    payload.tools = payload.tools || [];
    if (!payload.tools.some((tool) => tool.type === "code_interpreter")) payload.tools.push({ type: "code_interpreter" });
    payload.tool_choice = "auto";
  }
  return payload;
}

function buildResponsesTools(message, webSearchEnabled = false, options = {}) {
  const tools = [];
  const chatOptions = runtimeConfigs.chat.options || {};
  const skillTools = agentSkillToolFlags(options.agentSkill);
  if ((webSearchEnabled || skillTools.webSearch) && chatOptions.enableWebSearch !== false) tools.push({ type: "web_search" });
  if (chatOptions.enableWebExtractor !== false && (skillTools.webExtractor || shouldUseWebExtractor(message))) tools.push({ type: "web_extractor" });
  if (chatOptions.enableCodeInterpreter !== false && (skillTools.codeInterpreter || shouldUseCodeInterpreter(message))) tools.push({ type: "code_interpreter" });
  const canvasPolicy = buildCanvasActionPolicy(message, options);
  if (chatOptions.enableCanvasTools !== false && canvasPolicy.allowCanvasTool) {
    tools.push(buildResponsesCanvasToolSchema(canvasPolicy, { wrapped: options.wrappedCanvasTool }));
  }
  return tools;
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

const CANVAS_ACTION_SELECTION_GUIDE = {
  create_plan: "Use for structured steps, itineraries, roadmaps, schedules, implementation plans, and complex project plans.",
  create_todo: "Use for actionable checklists with completion state, priorities, or follow-up tasks.",
  create_note: "Use for narrative synthesis, analysis briefs, substantive research/planning/evaluation notes, and reusable text artifacts with conclusion, evidence, implications, and next steps.",
  create_table: "Use when rows and columns materially improve reuse: datasets, matrices, schedules, resources, or metrics.",
  create_timeline: "Use for chronological milestones, phased roadmaps, history, schedules, and processes.",
  create_comparison: "Use for option tradeoffs, pros/cons, decision matrices, ranked choices, and visual comparisons.",
  create_metric: "Use for KPI snapshots, benchmarks, scores, measurements, and progress indicators.",
  create_quote: "Use for citations, excerpts, source-backed claims, and quote collections.",
  create_code: "Use for reusable code snippets with language, explanation, or usage notes.",
  create_web_card: "Use only when there is a concrete URL to preserve as a reference card.",
  web_search: "Use only when the user explicitly asks to find current/latest/official sources or references.",
  image_search: "Use for public visual reference search from text, not for generating a new image.",
  reverse_image_search: "Use for searching similar visuals from a selected or attached image.",
  text_image_search: "Use for text-driven image reference search when visual evidence or examples help.",
  generate_image: "Use only for actual image creation, editing, or variation requests; never as a substitute for planning or analysis.",
  generate_video: "Use only for actual video or animation generation requests.",
  create_direction: "Use for visual/concept direction cards that can later be compared or generated.",
  delete_node: "Use only when the user explicitly asks to delete or remove a node.",
  create_agent: "Use only when agent controller mode is enabled or the user explicitly asks for autonomous/subagent work."
};

function actionPolicyTypeDescription(policy) {
  const allowed = policy.allowedActionTypes.join(", ");
  const groups = Array.from(new Set(policy.allowedActionTypes.map((type) => CANVAS_ACTION_REGISTRY[type]?.group).filter(Boolean))).join(", ");
  const loop = policy.loopControl || {};
  const guidance = policy.allowedActionTypes
    .map((type) => CANVAS_ACTION_SELECTION_GUIDE[type] ? `- ${type}: ${CANVAS_ACTION_SELECTION_GUIDE[type]}` : "")
    .filter(Boolean)
    .join("\n");
  return [
    CANVAS_ACTION_TOOL_SCHEMA.function.parameters.properties.type.description,
    "",
    "Allowed action guidance:",
    guidance || "- No canvas actions are allowed for this turn.",
    "",
    "Dynamic action policy for this turn:",
    `- taskType=${policy.intent.taskType}`,
    `- automaticCardMode=${policy.intent.automaticCardMode ? "true" : "false"}`,
    `- maxActions=${policy.maxActions}`,
    `- maxModelSteps=${loop.maxModelSteps || 1}`,
    `- maxActionSteps=${loop.maxActionSteps || 1}`,
    `- repeatLimitPerActionKey=${loop.repeatLimitPerKey || 1}`,
    `- maxOpenWorldActions=${loop.maxOpenWorldActions ?? 0}`,
    `- allowedGroups=${groups || "none"}`,
    `- allowedActionTypes=${allowed || "none"}`,
    `- stopAfterActionTypes=${Array.isArray(loop.stopAfterActionTypes) ? loop.stopAfterActionTypes.join(", ") : "none"}`,
    "Do not call an action type outside this per-turn allowedActionTypes list.",
    "Avoid duplicate action keys; after a stop-after action, do not propose additional canvas actions in the same turn."
  ].join("\n");
}

function applyCanvasActionPolicyToSchema(schema, policy, { wrapped = false } = {}) {
  const parameters = wrapped ? schema.function?.parameters : schema.function?.parameters || schema.parameters;
  const typeProperty = parameters?.properties?.type;
  if (typeProperty) {
    typeProperty.enum = policy.allowedActionTypes;
    typeProperty.description = actionPolicyTypeDescription(policy);
  }
  const target = wrapped ? schema.function : schema.function || schema;
  if (target?.description) {
    target.description = [
      target.description,
      "",
      `This turn is governed by a canvas action policy. Allowed action count: ${policy.maxActions}.`,
      `Allowed action types: ${policy.allowedActionTypes.join(", ") || "none"}.`
    ].join("\n");
  }
  return schema;
}

function buildResponsesCanvasToolSchema(policy, { wrapped = false } = {}) {
  const schema = cloneJson(wrapped ? RESPONSES_CANVAS_TOOL_SCHEMA_WRAPPED : RESPONSES_CANVAS_TOOL_SCHEMA);
  return applyCanvasActionPolicyToSchema(schema, policy, { wrapped });
}

function buildChatCompletionsCanvasToolSchema(policy) {
  const schema = cloneJson(CANVAS_ACTION_TOOL_SCHEMA);
  return applyCanvasActionPolicyToSchema(schema, policy, { wrapped: true });
}

function normalizeIntentText(message) {
  return String(message || "").normalize("NFKC").trim();
}

function wantsStructuredCanvasDeliverable(message) {
  const text = normalizeIntentText(message);
  return /(做|制定|生成|创建|整理|输出|列|写一份|给我一份|帮我做|make|create|build|generate|draft|produce|turn\s+.*\s+into).{0,18}(计划|规划|清单|待办|表格|时间线|路线图|报告|提纲|矩阵|对比表|checklist|todo|table|timeline|roadmap|report|outline|matrix|comparison)/i.test(text);
}

function classifyChatIntent(message, options = {}) {
  return classifyCanvasActionIntent(message, options);
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

function canvasActionLimitForThinkingMode(thinkingMode = "no-thinking") {
  return thinkingMode === "thinking" ? MAX_THINKING_CANVAS_ACTIONS_PER_TURN : MAX_QUICK_CANVAS_ACTIONS_PER_TURN;
}

function recordCanvasActionRepair(context, event) {
  if (!context || !Array.isArray(context.repairEvents) || !event) return;
  context.repairEvents.push(event);
}

function repairCanvasActions(actions, message, reply = "", lang = "zh", context = null) {
  if (!Array.isArray(actions) || !actions.length) return actions;
  return actions
    .map((action) => repairCanvasAction(action, message, reply, lang, context))
    .filter(Boolean);
}

function repairCanvasAction(action, message, reply = "", lang = "zh", context = null) {
  if (!action || typeof action !== "object" || !action.type) return null;
  const text = [action.description, action.prompt, reply, message]
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .join("\n\n");

  if (action.type === "delete_node" && !action.nodeId && !action.nodeName && !action.target) {
    const selectedNodeId = context?.selectedContext?.nodeId || context?.selectedContext?.id || "";
    if (selectedNodeId) {
      recordCanvasActionRepair(context, { type: action.type, reason: "filled_delete_target_from_selection", field: "nodeId", from: "missing", to: "selectedContext.nodeId" });
      return { ...action, nodeId: selectedNodeId };
    }
    recordCanvasActionRepair(context, { type: action.type, reason: "dropped_unrecoverable_action", field: "nodeId", from: "missing", to: "required" });
    return null;
  }

  if (["image_search", "text_image_search", "reverse_image_search"].includes(action.type) && !action.query) {
    recordCanvasActionRepair(context, { type: action.type, reason: "derived_missing_query", field: "query", from: "missing", to: "message_or_prompt" });
    return {
      ...action,
      query: deriveSearchQueryClean(message) || stringOr(action.prompt || action.description || action.title, message).slice(0, 240)
    };
  }

  if (["generate_image", "generate_video"].includes(action.type) && !action.prompt) {
    recordCanvasActionRepair(context, { type: action.type, reason: "derived_missing_prompt", field: "prompt", from: "missing", to: "title_or_description" });
    return {
      ...action,
      prompt: stringOr(action.description || action.title, message).slice(0, 1600)
    };
  }
  if (action.type === "create_direction") {
    const prompt = stringOr(action.prompt || action.description, "");
    if (plainCardText(prompt).length < 100) {
      recordCanvasActionRepair(context, { type: action.type, reason: "expanded_direction_prompt", field: "prompt", from: "thin_or_missing", to: "message_reply_context" });
      return {
        ...action,
        prompt: [action.title, action.description, reply, message].map((item) => stringOr(item, "")).filter(Boolean).join("\n\n").slice(0, 1600)
      };
    }
  }

  if (WEB_REFERENCE_ACTION_TYPES.has(action.type)) {
    return repairWebReferenceAction(action, message, text, lang, context);
  }

  if (!STRUCTURED_CONTENT_ACTION_TYPES.has(action.type)) return action;

  const content = normalizeStructuredContentForAction(action.type, action.content, text, action, lang);
  if (action.type === "create_plan" && !Array.isArray(action.content?.steps) && Array.isArray(action.content?.items) && Array.isArray(content.steps)) {
    recordCanvasActionRepair(context, { type: action.type, reason: "converted_items_to_steps", field: "content.steps", from: "content.items", to: "content.steps" });
  }
  if (action.type === "create_todo" && !Array.isArray(action.content?.items) && Array.isArray(action.content?.steps) && Array.isArray(content.items)) {
    recordCanvasActionRepair(context, { type: action.type, reason: "converted_steps_to_items", field: "content.items", from: "content.steps", to: "content.items" });
  }
  const polished = polishStructuredAction({ ...action, content }, text, message, reply, lang);
  if (hasUsableStructuredContent(action.type, polished.content)) {
    return polished;
  }

  const fallbackContent = buildFallbackActionContent(action.type, action.title || deriveSearchQueryClean(message), text || message);
  if (fallbackContent) recordCanvasActionRepair(context, { type: action.type, reason: "filled_missing_structured_content", field: "content", from: "missing_or_unusable", to: "fallback_content" });
  return fallbackContent ? { ...action, content: fallbackContent } : action;
}

function polishStructuredAction(action, text, message, reply, lang = "zh") {
  if (action?.type !== "create_comparison") return action;
  return polishComparisonAction(action, [text, reply, message].filter(Boolean).join("\n\n"), lang);
}

function polishComparisonAction(action, sourceText, lang = "zh") {
  const content = action.content && typeof action.content === "object" && !Array.isArray(action.content)
    ? { ...action.content }
    : {};
  const extractedItems = extractPhotoComparisonItems(sourceText, 8);
  const rawItems = Array.isArray(content.items) ? content.items : [];
  const normalizedItems = rawItems.map((item, index) => normalizeComparisonItem(item, index, lang)).filter((item) => item.title || item.summary);
  const mergedItems = mergeComparisonItems(normalizedItems, extractedItems, lang);
  if (mergedItems.length) content.items = mergedItems;

  const fallbackTitle = extractedItems.length
    ? (lang === "en" ? "Photo comparison" : "照片对比结论")
    : (lang === "en" ? "Comparison" : "对比结论");
  const currentTitle = plainCardText(action.title || content.title || "", 120);
  const title = isMechanicalComparisonTitle(currentTitle, content.items)
    ? fallbackTitle
    : (currentTitle || fallbackTitle);

  const recommendation = plainCardText(content.recommendation || content.summary || "", 700);
  if (recommendation) content.recommendation = recommendation;
  if (plainCardText(content.summary || "", 260)) content.summary = plainCardText(content.summary, 260);
  const derivedDescription = comparisonDescriptionFromItems(content.items || [], recommendation, lang);
  const currentDescription = plainCardText(action.description || content.description || "", 260);
  const description = isMechanicalComparisonDescription(currentDescription, content.items)
    ? derivedDescription
    : (currentDescription || derivedDescription);

  return {
    ...action,
    title,
    description,
    content
  };
}

function normalizeComparisonItem(item, index, lang = "zh") {
  if (item && typeof item === "object" && !Array.isArray(item)) {
    const title = plainCardText(item.title || item.name || item.option || item.label || "", 120)
      || (lang === "en" ? `Item ${index + 1}` : `项目 ${index + 1}`);
    const summary = plainCardText(item.summary || item.description || item.notes || item.detail || item.value || "", 520);
    const pros = normalizeComparisonList(item.pros || item.advantages || item.strengths || item.优点 || item.优势);
    const cons = normalizeComparisonList(item.cons || item.risks || item.weaknesses || item.缺点 || item.风险 || item.不足);
    return {
      ...item,
      title,
      summary: summary || [...pros, ...cons].slice(0, 2).join("；"),
      pros,
      cons,
      score: plainCardText(item.score || item.rating || item.stars || "", 80)
    };
  }
  const title = plainCardText(item || "", 120) || (lang === "en" ? `Item ${index + 1}` : `项目 ${index + 1}`);
  return { title, summary: title };
}

function normalizeComparisonList(value) {
  const raw = Array.isArray(value) ? value : (value ? String(value).split(/[；;。\n]/) : []);
  return raw.map((item) => plainCardText(item, 180)).filter(Boolean).slice(0, 6);
}

function mergeComparisonItems(items = [], extracted = [], lang = "zh") {
  const merged = [];
  const used = new Set();
  const byPhotoNumber = new Map();
  extracted.forEach((item, index) => {
    const number = photoNumberFromTitle(item.title);
    if (number) byPhotoNumber.set(number, { item, index });
  });
  const maxLength = Math.max(items.length, extracted.length);
  for (let index = 0; index < maxLength; index += 1) {
    const existing = items[index] || null;
    const existingNumber = photoNumberFromTitle(existing?.title);
    const extractedMatch = existingNumber && byPhotoNumber.has(existingNumber)
      ? byPhotoNumber.get(existingNumber)
      : (extracted[index] ? { item: extracted[index], index } : null);
    const extractedItem = extractedMatch?.item || null;
    if (extractedMatch) used.add(extractedMatch.index);
    if (existing || extractedItem) {
      merged.push(mergeComparisonItem(existing, extractedItem, index, lang));
    }
  }
  extracted.forEach((item, index) => {
    if (!used.has(index)) merged.push(mergeComparisonItem(null, item, merged.length, lang));
  });
  return merged.filter((item) => item.title || item.summary);
}

function mergeComparisonItem(existing, extracted, index, lang = "zh") {
  const fallbackTitle = lang === "en" ? `Item ${index + 1}` : `项目 ${index + 1}`;
  const title = betterComparisonTitle(existing?.title, extracted?.title, fallbackTitle);
  const summary = betterComparisonSummary(existing?.summary, extracted?.summary, title);
  const pros = (existing?.pros && existing.pros.length ? existing.pros : extracted?.pros) || [];
  const cons = (existing?.cons && existing.cons.length ? existing.cons : extracted?.cons) || [];
  return {
    ...(extracted || {}),
    ...(existing || {}),
    title,
    summary,
    pros,
    cons
  };
}

function betterComparisonTitle(current, extracted, fallback) {
  const a = plainCardText(current, 120);
  const b = plainCardText(extracted, 120);
  if (!a || /^项目\s*\d+$/.test(a) || /^item\s*\d+$/i.test(a)) return b || fallback;
  if (/^照片\s*[0-9一二两三四五六七八九十]+$/.test(a) && b && b.length > a.length + 2) return b;
  return a;
}

function betterComparisonSummary(current, extracted, title) {
  const a = plainCardText(current, 520);
  const b = plainCardText(extracted, 520);
  if (!a) return b;
  if (isMechanicalComparisonDescription(a, [{ title }]) && b) return b;
  if (/^照片\s*[0-9一二两三四五六七八九十]+$/.test(a) && b) return b;
  return a;
}

function photoNumberFromTitle(value) {
  const match = String(value || "").normalize("NFKC").match(/照片\s*([0-9一二两三四五六七八九十]+)|photo\s*([0-9]+)/i);
  return match ? String(match[1] || match[2] || "").trim() : "";
}

function isMechanicalComparisonTitle(title, items = []) {
  const text = plainCardText(title, 180);
  if (!text) return true;
  if (/^(照片\s*[0-9一二两三四五六七八九十]+(?:\s*[、,， ]\s*|\s+))*照片\s*[0-9一二两三四五六七八九十]+$/i.test(text)) return true;
  if ((text.match(/照片\s*[0-9一二两三四五六七八九十]+/g) || []).length >= 3 && text.length > 18) return true;
  const itemNames = (Array.isArray(items) ? items : [])
    .map((item) => plainCardText(item?.title || item?.name || item?.option || "", 80))
    .filter(Boolean);
  if (itemNames.length >= 2) {
    const joined = itemNames.join(" ");
    if (text === joined || joined.includes(text)) return true;
  }
  return false;
}

function isMechanicalComparisonDescription(description, items = []) {
  const text = plainCardText(description, 260);
  if (!text) return true;
  if (/^共\s*\d+\s*项对比/.test(text)) return true;
  if ((text.match(/照片\s*[0-9一二两三四五六七八九十]+/g) || []).length >= 3 && text.length < 80) return true;
  const itemNames = (Array.isArray(items) ? items : [])
    .map((item) => plainCardText(item?.title || item?.name || item?.option || "", 80))
    .filter(Boolean);
  if (itemNames.length >= 2 && text.replace(/\s+/g, "") === itemNames.join("").replace(/\s+/g, "")) return true;
  return false;
}

function comparisonDescriptionFromItems(items = [], recommendation = "", lang = "zh") {
  const rec = plainCardText(recommendation, 220);
  if (rec && !isMechanicalComparisonDescription(rec, items)) return rec;
  const parts = (Array.isArray(items) ? items : [])
    .map((item) => {
      const title = plainCardText(item?.title || item?.name || item?.option || "", 60);
      const summary = plainCardText(item?.summary || item?.description || item?.notes || "", 140);
      if (!title || !summary || title === summary) return summary || title;
      return `${title}: ${summary}`;
    })
    .filter(Boolean)
    .slice(0, 4);
  if (parts.length) return parts.join("；").slice(0, 260);
  return lang === "en" ? "Structured comparison card." : "结构化整理本轮对比结论。";
}

function repairWebReferenceAction(action, message, text, lang, context = null) {
  const url = stringOr(action.url || action.content?.url, extractFirstUrl(text || message));
  if (url) {
    return enrichWebCardAction({
      ...action,
      url,
      content: {
        ...(action.content && typeof action.content === "object" ? action.content : {}),
        url
      }
    }, message);
  }

  const query = stringOr(action.query, deriveSearchQueryClean(text || message)).slice(0, 240);
  if (action.type === "create_web_card" && query) {
    recordCanvasActionRepair(context, { type: action.type, reason: "converted_web_card_without_url_to_search", field: "type", from: "create_web_card", to: "web_search" });
    return {
      type: "web_search",
      title: action.title || (lang === "en" ? "Web search" : "网页搜索"),
      description: action.description || (lang === "en" ? "Search intent card for finding concrete references." : "用于查找具体参考来源的搜索意图卡。"),
      query
    };
  }

  const noteText = text || action.description || action.title || query;
  recordCanvasActionRepair(context, { type: action.type, reason: "converted_reference_without_url_to_note", field: "type", from: action.type, to: "create_note" });
  return {
    type: "create_note",
    title: action.title || (lang === "en" ? "Reference note" : "参考笔记"),
    description: lang === "en" ? "Converted from a reference action without a concrete URL." : "由缺少具体 URL 的参考动作转换而来。",
    content: buildFallbackActionContent("create_note", action.title || query, noteText)
  };
}

function normalizeTodoItems(items = [], sourceText = "", lang = "zh") {
  const normalized = (Array.isArray(items) ? items : []).map((item, index) => {
    const text = stringOr(item?.text || item?.title || item?.description || item, "").slice(0, 220);
    const rationale = stringOr(item?.rationale || item?.description || item?.body || item?.reason, "").slice(0, 260);
    return {
      ...(item && typeof item === "object" && !Array.isArray(item) ? item : {}),
      text,
      done: Boolean(item?.done),
      priority: stringOr(item?.priority || item?.impact || "", index < 2 ? (lang === "en" ? "high" : "高") : ""),
      rationale: rationale || text
    };
  }).filter((item) => plainCardText(item.text).length >= 4);
  const existing = new Set(normalized.map((item) => plainCardText(item.text, 80)));
  for (const item of genericItemsFromText(sourceText, 10)) {
    if (normalized.length >= 6) break;
    const text = plainCardText(item.description || item.title, 220);
    if (!text || existing.has(plainCardText(text, 80))) continue;
    existing.add(plainCardText(text, 80));
    normalized.push({
      text,
      done: false,
      priority: normalized.length < 2 ? (lang === "en" ? "high" : "高") : (lang === "en" ? "medium" : "中"),
      rationale: plainCardText(item.title, 180) || text
    });
  }
  return normalized;
}

function normalizeTableRows(columns = [], rows = [], sourceText = "", lang = "zh") {
  const safeColumns = Array.isArray(columns) && columns.length >= 2
    ? columns.map((column) => stringOr(column, "")).filter(Boolean).slice(0, 6)
    : (lang === "en" ? ["Item", "Details", "Evidence / next step"] : ["项目", "细节", "依据/下一步"]);
  const normalizedRows = (Array.isArray(rows) ? rows : []).map((row) => {
    if (Array.isArray(row)) {
      return Object.fromEntries(safeColumns.map((column, index) => [column, stringOr(row[index], "")]));
    }
    if (row && typeof row === "object") return { ...row };
    return { [safeColumns[0]]: stringOr(row, ""), [safeColumns[1]]: stringOr(row, "") };
  }).filter((row) => plainCardText(row).length >= 6);
  const existing = new Set(normalizedRows.map((row) => plainCardText(row, 120)));
  for (const item of genericItemsFromText(sourceText, 10)) {
    if (normalizedRows.length >= 5) break;
    const title = plainCardText(item.title, 140);
    const detail = plainCardText(item.description || item.title, 320);
    const key = plainCardText(`${title} ${detail}`, 120);
    if (!detail || existing.has(key)) continue;
    existing.add(key);
    normalizedRows.push({
      [safeColumns[0]]: title || `${normalizedRows.length + 1}`,
      [safeColumns[1]]: detail,
      [safeColumns[2] || safeColumns[1]]: detail
    });
  }
  return { columns: safeColumns, rows: normalizedRows };
}

function normalizeTimelineItems(items = [], sourceText = "", lang = "zh") {
  const normalized = (Array.isArray(items) ? items : []).map((item, index) => ({
    ...(item && typeof item === "object" && !Array.isArray(item) ? item : {}),
    phase: stringOr(item?.time || item?.phase || item?.date, `${index + 1}`),
    title: stringOr(item?.title || item?.text || item, `${index + 1}`).slice(0, 160),
    description: stringOr(item?.description || item?.body || item?.detail || item?.text || "", "").slice(0, 420)
  })).filter((item) => plainCardText(`${item.title} ${item.description}`).length >= 6);
  const existing = new Set(normalized.map((item) => plainCardText(`${item.title} ${item.description}`, 120)));
  for (const item of genericItemsFromText(sourceText, 10)) {
    if (normalized.length >= 5) break;
    const title = plainCardText(item.title, 160) || `${normalized.length + 1}`;
    const description = plainCardText(item.description || item.title, 420);
    const key = plainCardText(`${title} ${description}`, 120);
    if (!description || existing.has(key)) continue;
    existing.add(key);
    normalized.push({
      phase: `${normalized.length + 1}`,
      title,
      description
    });
  }
  if (normalized.length === 1 && plainCardText(normalized[0].description).length < 80) {
    normalized[0].description = lang === "en"
      ? `${normalized[0].description} Clarify owner, timing, evidence, and acceptance criteria before execution.`
      : `${normalized[0].description} 执行前需要补齐负责人、时间、证据来源和验收标准。`;
  }
  return normalized;
}

function normalizeStructuredContentForAction(type, content, fallbackText, action = {}, lang = "zh") {
  const base = content && typeof content === "object" && !Array.isArray(content) ? { ...content } : {};
  if (type === "create_plan") {
    if (!Array.isArray(base.steps) && Array.isArray(base.items)) {
      base.steps = base.items.map((item, index) => ({
        title: stringOr(item?.title || item?.text, `${index + 1}`),
        description: stringOr(item?.description || item?.body || item?.text || item, fallbackText)
      }));
    }
    if (!Array.isArray(base.steps) && (base.goal || base.summary || fallbackText)) {
      base.steps = [{ title: lang === "en" ? "Plan overview" : "计划概览", description: stringOr(base.summary || base.goal, fallbackText) }];
    }
    base.summary = stringOr(base.summary || base.overview || base.description, "");
    base.goal = stringOr(base.goal || base.objective, "");
    base.context = stringOr(base.context || base.background, "");
    for (const key of ["constraints", "validation", "progress", "decisions", "risks", "outcomes", "assumptions", "tips"]) {
      if (!Array.isArray(base[key])) continue;
      base[key] = base[key].slice(0, 12).map((item) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) return stringOr(item, "");
        return {
          title: stringOr(item.title || item.name || item.label, ""),
          description: stringOr(item.description || item.body || item.text || item.summary || item.value, ""),
          status: stringOr(item.status || item.state, ""),
          owner: stringOr(item.owner || item.role, ""),
          priority: stringOr(item.priority, "")
        };
      }).filter((item) => typeof item === "string" ? item : (item.title || item.description || item.status || item.owner || item.priority));
    }
    if (Array.isArray(base.steps)) {
      base.steps = base.steps.slice(0, 16).map((step, index) => ({
        ...(step && typeof step === "object" && !Array.isArray(step) ? step : {}),
        title: stringOr(step?.title || step?.name || step?.text || step, `${index + 1}`),
        description: stringOr(step?.description || step?.body || step?.detail || step?.text || "", ""),
        time: stringOr(step?.time || step?.date || step?.phase, ""),
        priority: stringOr(step?.priority, ""),
        owner: stringOr(step?.owner || step?.role, ""),
        status: stringOr(step?.status || step?.state, ""),
        validation: stringOr(step?.validation || step?.successCriteria || step?.check, "")
      }));
    }
  }
  if (type === "create_todo" && !Array.isArray(base.items) && Array.isArray(base.steps)) {
    base.items = base.steps.map((step) => ({
      text: stringOr(step?.title || step?.text, ""),
      done: Boolean(step?.done),
      priority: stringOr(step?.priority, ""),
      rationale: stringOr(step?.description || step?.time, "")
    }));
  }
  if (type === "create_todo") {
    base.items = normalizeTodoItems(base.items, [fallbackText, action.title, action.description].filter(Boolean).join("\n\n"), lang);
  }
  if (type === "create_note") {
    base.text = stringOr(base.text || base.markdown || base.body || base.description, fallbackText);
    if (shouldUpgradeNoteContent(base)) {
      const sections = buildSubstantiveNoteSections(action.title || action.description || "", base.text || fallbackText, lang);
      base.sections = sections;
      base.text = noteTextFromSections(sections).slice(0, 8000);
    } else if (Array.isArray(base.sections) && !base.text) {
      base.text = noteTextFromSections(base.sections).slice(0, 8000);
    }
  }
  if (type === "create_code") {
    base.language = stringOr(base.language, "text");
    base.code = stringOr(base.code || base.text, fallbackText);
  }
  if (type === "create_weather") {
    base.location = stringOr(base.location || action.query || action.title, deriveSearchQueryClean(fallbackText));
    base.forecast = stringOr(base.forecast || base.description || base.summary, fallbackText);
    base.temp = stringOr(base.temp || base.temperature, "");
  }
  if (type === "create_map") {
    base.address = stringOr(base.address || base.location || action.query || action.title, deriveSearchQueryClean(fallbackText));
  }
  if (type === "create_table" && !Array.isArray(base.rows) && Array.isArray(base.items)) {
    const columns = Array.isArray(base.columns) && base.columns.length ? base.columns : (lang === "en" ? ["Item", "Details"] : ["项目", "细节"]);
    base.columns = columns;
    base.rows = base.items.map((item) => ({
      [columns[0]]: stringOr(item?.title || item?.label || item, ""),
      [columns[1]]: stringOr(item?.description || item?.value || item?.summary || "", "")
    }));
  }
  if (type === "create_table") {
    const normalized = normalizeTableRows(base.columns, base.rows, [fallbackText, action.title, action.description].filter(Boolean).join("\n\n"), lang);
    base.columns = normalized.columns;
    base.rows = normalized.rows;
  }
  if (type === "create_timeline" && !Array.isArray(base.items) && Array.isArray(base.steps)) {
    base.items = base.steps.map((step, index) => ({
      phase: stringOr(step?.time || step?.phase, `${index + 1}`),
      title: stringOr(step?.title || step?.text, `${index + 1}`),
      description: stringOr(step?.description || step?.body || step?.text, "")
    }));
  }
  if (type === "create_timeline") {
    base.items = normalizeTimelineItems(base.items, [fallbackText, action.title, action.description].filter(Boolean).join("\n\n"), lang);
  }
  if (type === "create_comparison" && !Array.isArray(base.items) && Array.isArray(base.options)) {
    base.items = base.options.map((option) => ({
      title: stringOr(option?.title || option?.name || option, ""),
      summary: stringOr(option?.summary || option?.description || option, "")
    }));
  }
  if (type === "create_metric" && !Array.isArray(base.metrics) && Array.isArray(base.items)) {
    base.metrics = base.items.map((item) => ({
      label: stringOr(item?.label || item?.title || item, ""),
      value: stringOr(item?.value || item?.summary || item?.description || "", "")
    }));
  }
  if (type === "create_quote" && !Array.isArray(base.quotes) && Array.isArray(base.items)) {
    base.quotes = base.items.map((item) => ({
      text: stringOr(item?.text || item?.quote || item?.description || item, ""),
      source: stringOr(item?.source || item?.title || "", "")
    }));
  }
  return base;
}

function hasUsableStructuredContent(type, content) {
  if (!content || typeof content !== "object" || Array.isArray(content)) return false;
  if (type === "create_plan") return Array.isArray(content.steps) && content.steps.some((step) => step?.title || step?.description || step?.text);
  if (type === "create_todo") return Array.isArray(content.items) && content.items.some((item) => item?.text || item?.title);
  if (type === "create_note") return Boolean(stringOr(content.text || content.markdown || content.body, "")) || (Array.isArray(content.sections) && content.sections.length > 0);
  if (type === "create_weather") return Boolean(content.location || content.forecast || content.temp);
  if (type === "create_map") return Boolean(content.address || content.location || content.lat || content.lng);
  if (type === "create_link" || type === "create_web_card") return Boolean(content.url);
  if (type === "create_code") return Boolean(content.code);
  if (type === "create_table") return Array.isArray(content.columns) && content.columns.length > 0 && Array.isArray(content.rows) && content.rows.length > 0;
  if (type === "create_timeline") return Array.isArray(content.items) && content.items.length > 0;
  if (type === "create_comparison") return Array.isArray(content.items) && content.items.length > 0;
  if (type === "create_metric") return Array.isArray(content.metrics) && content.metrics.length > 0;
  if (type === "create_quote") return Array.isArray(content.quotes) && content.quotes.length > 0;
  return Object.keys(content).length > 0;
}

function enrichCanvasActions(actions, message, reply = "", lang = "zh", thinkingMode = "no-thinking", context = null) {
  if (!Array.isArray(actions) || !actions.length) return actions;
  let expanded = repairCanvasActions([...actions], message, reply, lang, context);
  const planAction = expanded.find((action) => action?.type === "create_plan" && Array.isArray(action?.content?.steps));
  if (planAction) {
    const splitPlan = shouldSplitPlanAction(planAction);
    const examOrLearning = isExamOrLearningRequest(message);
    const planningRequest = isPlanningRequest(message);
    if (splitPlan || examOrLearning || planningRequest) {
      const sourceActions = expanded;
      const hasNote = sourceActions.some((action) => action?.type === "create_note");
      const hasTodo = sourceActions.some((action) => action?.type === "create_todo");
      const hasTimeline = sourceActions.some((action) => action?.type === "create_timeline");
      const hasTable = sourceActions.some((action) => action?.type === "create_table");
      expanded = [];
      for (const action of sourceActions) {
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
  expanded = enrichImageContextActions(expanded, message, reply, lang);
  return dedupeCanvasActions(expanded).slice(0, canvasActionLimitForThinkingMode(thinkingMode));
}

function finalizeAgentControllerActions(actions, message, lang) {
  const usable = Array.isArray(actions) ? actions : [];
  const agents = [];
  const others = [];
  for (const action of usable) {
    if (action?.type === "create_agent") agents.push(normalizeAgentAction(action, message, lang, agents.length));
    else others.push(action);
  }
  return [...others, ...agents.filter(Boolean).slice(0, 4)];
}

function normalizeAgentAction(action, message, lang, index = 0) {
  const title = stringOr(action.title || action.nodeName, lang === "en" ? `Subagent ${index + 1}` : `子 Agent ${index + 1}`).slice(0, 80);
  const role = stringOr(action.role, inferAgentRole(title, action.prompt || action.description || message, lang)).slice(0, 80);
  const skill = normalizeAgentSkill(action.skill || action.agentSkill, role, `${title}\n${action.prompt || action.description || message}`);
  const deliverable = stringOr(action.deliverable, lang === "en" ? "A concise, evidence-aware result that the controller can synthesize." : "一份可供控制器综合使用的简洁、有依据的结果。").slice(0, 360);
  const successCriteria = stringOr(action.successCriteria, lang === "en" ? "Result is specific, bounded, actionable, and notes uncertainties." : "结果具体、有边界、可执行，并说明不确定性。").slice(0, 500);
  const prompt = [
    stringOr(action.prompt || action.description || action.query, message),
    "",
    lang === "en" ? `Role: ${role}` : `角色：${role}`,
    lang === "en" ? `Skill: ${skill}` : `技能：${skill}`,
    lang === "en" ? `Deliverable: ${deliverable}` : `交付物：${deliverable}`,
    lang === "en" ? `Success criteria: ${successCriteria}` : `成功标准：${successCriteria}`
  ].filter(Boolean).join("\n").slice(0, 1600);
  return {
    ...action,
    type: "create_agent",
    title,
    role,
    skill,
    prompt,
    description: stringOr(action.description, deliverable).slice(0, 700),
    deliverable,
    successCriteria,
    priority: stringOr(action.priority, index === 0 ? "high" : "medium").slice(0, 40)
  };
}

function inferAgentRole(title, text, lang) {
  const haystack = `${title} ${text}`.toLowerCase();
  if (/critic|review|risk|审查|批判|风险|质检|qa/.test(haystack)) return "critic";
  if (/research|source|web|资料|来源|研究|检索/.test(haystack)) return "researcher";
  if (/data|metric|table|数据|指标|表格/.test(haystack)) return "data analyst";
  if (/write|draft|copy|文案|写作|草稿/.test(haystack)) return "writer";
  if (/visual|image|design|视觉|图片|设计/.test(haystack)) return "visual director";
  if (/plan|roadmap|步骤|计划|规划/.test(haystack)) return "planner";
  return lang === "en" ? "worker" : "执行者";
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
  const structuredDeliverable = wantsStructuredCanvasDeliverable(requestText);
  if (!wantsArtifact && !structuredDeliverable) return actions;
  const typeNeedsBundle = isPlanningRequest(requestText) || isResearchRequest(requestText) || isDataOrCodeRequest(requestText) || (structuredDeliverable && (isComparisonRequest(requestText) || isGeneralMultiCardRequest(requestText)));
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

function enrichImageContextActions(actions, message, reply = "", lang = "zh") {
  const existing = Array.isArray(actions) ? actions : [];
  if (!existing.length) return existing;
  if (existing.some((action) => ["image_search", "reverse_image_search", "text_image_search", "generate_image"].includes(action?.type))) return existing;
  if (!existing.some((action) => REUSABLE_CARD_ACTION_TYPES.includes(action?.type))) return existing;

  const requestText = String(message || "").normalize("NFKC");
  const answerText = String(reply || "").normalize("NFKC");
  const combinedText = `${requestText}\n${answerText}`.trim();
  if (!shouldAddGeneralVisualSupport(requestText, combinedText)) return existing;

  const query = deriveSearchQueryClean(requestText) || requestText.slice(0, 160);
  if (!query) return existing;
  const generate = shouldGenerateGeneralVisual(requestText, combinedText);
  const title = generate
    ? (lang === "en" ? "Concept visualization" : "概念可视化")
    : (lang === "en" ? "Visual references" : "视觉参考");
  const description = generate
    ? (lang === "en" ? "Generated concept image to make an abstract or speculative idea easier to inspect on the canvas." : "生成一张概念图，把抽象或推演性的想法转成可查看的画面。")
    : (lang === "en" ? "Internet image search for real-world visual references that can support the current task." : "联网搜索真实视觉参考，用于支撑当前任务。");
  const action = generate
    ? {
        type: "generate_image",
        title,
        description,
        prompt: `${query}\n\n${lang === "en" ? "Create a useful, high-signal visual concept image for this workspace task. Avoid text-heavy layouts." : "为这个工作区任务生成一张有信息量、便于继续讨论的概念图，避免大量文字排版。"}`
      }
    : {
        type: "image_search",
        title,
        description,
        query
      };
  return [...existing, action];
}

function shouldAddGeneralVisualSupport(requestText, combinedText) {
  const text = String(combinedText || requestText || "");
  if (!text.trim()) return false;
  if (/(不要.*(图片|图像|照片|视觉|配图)|无需.*(图片|图像|照片|视觉|配图)|no images?|without images?|text only)/i.test(text)) return false;
  const explicitVisual = /(图片|图像|照片|插图|配图|参考图|视觉|画面|外观|造型|构图|色彩|风格|渲染|草图|分镜|image|photo|picture|visual|illustration|render|sketch|moodboard|styleboard|storyboard)/i.test(text);
  const visualizableWork = /(地点|空间|场景|角色|人物|产品|品牌|建筑|展览|装置|服装|食物|动植物|地形|路线|界面|海报|封面|包装|原型|设计|创作|世界观|概念|location|place|space|scene|character|product|brand|building|exhibit|installation|fashion|food|animal|plant|terrain|route|interface|poster|cover|package|prototype|design|creative|concept)/i.test(text);
  const substantialTask = isPlanningRequest(requestText) || isResearchRequest(requestText) || isComparisonRequest(requestText) || isGeneralMultiCardRequest(requestText);
  const notMostlyCodeOrData = !isDataOrCodeRequest(requestText) || /(界面|可视化|图表|设计|ui|ux|visuali[sz]ation|diagram|chart|design)/i.test(text);
  return notMostlyCodeOrData && (explicitVisual || (substantialTask && visualizableWork));
}

function shouldGenerateGeneralVisual(requestText, combinedText) {
  const text = String(combinedText || requestText || "");
  const creativeOrSpeculative = /(成图|创作|画|绘制|渲染|概念图|概念设计|幻想|想象|虚构|设定|分镜|角色设计|场景设计|世界观|原型图|草图|draw|render|concept art|concept design|imaginary|fictional|speculative|storyboard|character design|scene design|prototype visual|sketch)/i.test(text);
  const asksForReality = /(真实|现实|现有|最新|来源|证据|参考|照片|案例|资料|新闻|官方|real|existing|current|source|evidence|reference|photo|case study|official|news)/i.test(text);
  return creativeOrSpeculative && !asksForReality;
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
  const photoItems = extractPhotoComparisonItems(text, limit);
  if (photoItems.length >= Math.min(2, limit)) return photoItems;
  const items = extractFallbackListItems(text).slice(0, limit);
  if (items.length) return items;
  return String(text || "")
    .split(/[。！？.!?]\s*/)
    .map((part) => part.trim())
    .filter((part) => part.length > 8)
    .slice(0, limit)
    .map((part, index) => ({ title: `${index + 1}`, description: part.slice(0, 700) }));
}

function usefulSentencesFromText(text, limit = 8) {
  return String(text || "")
    .normalize("NFKC")
    .replace(/\r\n?/g, "\n")
    .split(/(?:\n+|(?<=[。！？.!?；;])\s*)/)
    .map((part) => plainCardText(part, 700))
    .filter((part) => part.length >= 10)
    .slice(0, limit);
}

function buildSubstantiveNoteSections(title, text, lang = "zh") {
  const isEn = lang === "en";
  const body = String(text || title || "").trim();
  const sentences = usefulSentencesFromText(body, 10);
  const items = genericItemsFromText(body, 6);
  const first = sentences[0] || items[0]?.description || items[0]?.title || body.slice(0, 700);
  const evidence = items.slice(0, 4)
    .map((item) => {
      const itemTitle = plainCardText(item.title, 90);
      const itemBody = plainCardText(item.description || item.title, 260);
      if (!itemTitle || itemTitle === itemBody) return itemBody;
      return `- **${itemTitle}**：${itemBody}`;
    })
    .filter(Boolean)
    .join("\n") || sentences.slice(0, 3).map((sentence) => `- ${sentence}`).join("\n");
  const riskSentences = sentences.filter((sentence) => /(风险|约束|缺口|冲突|成本|不确定|验证|核实|risk|constraint|gap|conflict|cost|uncertain|verify)/i.test(sentence));
  const nextSeeds = sentences.filter((sentence) => /(下一步|建议|行动|验证|核实|优先|推进|落地|next|action|validate|verify|priorit)/i.test(sentence));
  const implications = (riskSentences.length ? riskSentences : sentences.slice(1, 4))
    .slice(0, 3)
    .map((sentence) => `- ${sentence}`)
    .join("\n") || (isEn
      ? "- Clarify assumptions, evidence gaps, dependencies, and tradeoffs before committing resources."
      : "- 在投入资源前，先澄清假设、证据缺口、依赖关系和关键取舍。");
  const nextSteps = (nextSeeds.length ? nextSeeds : items.slice(0, 4).map((item) => item.description || item.title))
    .slice(0, 4)
    .map((sentence, index) => `- ${plainCardText(sentence, 220) || (isEn ? `Follow-up ${index + 1}` : `后续动作 ${index + 1}`)}`)
    .join("\n") || (isEn
      ? "- Turn the key assumptions into owners, deadlines, and acceptance checks.\n- Revisit this note after the next concrete evidence source is available."
      : "- 把关键假设拆成 owner、截止时间和验收检查。\n- 拿到下一份具体证据后回到这张笔记更新判断。");
  return isEn
    ? [
        { title: "Conclusion", body: first },
        { title: "Evidence and context", body: evidence },
        { title: "Implications and risks", body: implications },
        { title: "Next steps", body: nextSteps }
      ]
    : [
        { title: "结论", body: first },
        { title: "依据与上下文", body: evidence },
        { title: "影响、权衡与风险", body: implications },
        { title: "下一步", body: nextSteps }
      ];
}

function noteTextFromSections(sections = []) {
  return sections
    .map((section) => {
      const title = stringOr(section?.title, "");
      const body = stringOr(section?.body || section?.text || section?.description, "");
      return [title ? `## ${title}` : "", body].filter(Boolean).join("\n\n");
    })
    .filter(Boolean)
    .join("\n\n");
}

function shouldUpgradeNoteContent(content = {}) {
  const text = stringOr(content.text || content.markdown || content.body, "");
  const sections = Array.isArray(content.sections) ? content.sections : [];
  const plain = plainCardText([text, noteTextFromSections(sections)].filter(Boolean).join("\n\n"));
  if (plain.length < 220) return true;
  if (!sections.length && plain.length < 420) return true;
  if (sections.length && sections.some((section) => plainCardText(section?.body || section?.text || section?.description || "").length < 40)) return true;
  if (/(待补充|暂无|无具体|placeholder|tbd|details are available|详细内容已写入画布卡片|从回答中抽取)/i.test(plain)) return true;
  return false;
}

function buildGenericNoteAction(message, text, lang) {
  const sections = buildSubstantiveNoteSections(message, text, lang);
  return {
    type: "create_note",
    title: genericCardTitle(message, lang === "en" ? "notes" : "要点笔记", lang),
    description: lang === "en" ? "Reusable brief preserving the key judgment, evidence, risks, and next steps." : "保留关键判断、依据、风险和下一步的可复用简报。",
    content: {
      sections,
      text: noteTextFromSections(sections).slice(0, 6000)
    }
  };
}

function buildGenericTodoAction(message, text, lang) {
  const items = ensureFallbackWorkItems(genericItemsFromText(text, 10), text, message, 4, 10).map((item, index) => ({
    text: String(item.description || item.title).slice(0, 220),
    done: false,
    priority: index < 2 ? (lang === "en" ? "high" : "高") : (lang === "en" ? "medium" : "中"),
    rationale: String(item.title || "").slice(0, 180)
  })).filter((item) => item.text);
  return {
    type: "create_todo",
    title: genericCardTitle(message, lang === "en" ? "checklist" : "执行清单", lang),
    description: lang === "en" ? "Operational checklist for turning the result into concrete follow-up work." : "把本轮结论落到后续动作的执行清单。",
    content: { items }
  };
}

function buildGenericTableAction(message, text, lang) {
  const columns = lang === "en" ? ["Item", "Details", "Next step"] : ["项目", "细节", "下一步"];
  const rows = ensureFallbackWorkItems(genericItemsFromText(text, 8), text, message, 3, 8).map((item) => ({
    [columns[0]]: item.title,
    [columns[1]]: item.description || item.title,
    [columns[2]]: item.nextStep || item.description || item.title
  }));
  return {
    type: "create_table",
    title: genericCardTitle(message, lang === "en" ? "table" : "结构化表格", lang),
    description: lang === "en" ? "Structured table for comparing facts, constraints, owners, or evidence." : "用于对照事实、约束、负责人或证据的结构化表格。",
    content: { columns, rows }
  };
}

function buildGenericTimelineAction(message, text, lang) {
  const items = ensureFallbackWorkItems(genericItemsFromText(text, 10), text, message, 3, 10).map((item, index) => ({
    phase: `${index + 1}`,
    title: item.title,
    description: item.description || item.title
  }));
  return {
    type: "create_timeline",
    title: genericCardTitle(message, lang === "en" ? "timeline" : "时间线", lang),
    description: lang === "en" ? "Sequential timeline for tracking phases, dependencies, and checkpoints." : "用于追踪阶段、依赖和检查点的顺序时间线。",
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
    description: lang === "en" ? "Decision-support comparison card with options, tradeoffs, and recommendation." : "包含选项、取舍和推荐的决策支持对比卡。",
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
    description: lang === "en" ? "Metric card for preserving key values, deltas, and interpretation." : "用于保留关键数值、变化和解释的指标卡。",
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
    description: lang === "en" ? "Source-backed excerpt card for preserving claims that need evidence." : "用于保留需要证据支撑的观点和摘录的引用卡。",
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
    const title = normalizeActionDedupeText(action.title || action.nodeName || action.target);
    const body = normalizeActionDedupeText(action.url || action.query || action.prompt || action.description || actionContentForDedupe(action));
    const parent = normalizeActionDedupeText(action.parentNodeId || action.parentNodeName || action.anchorNodeId || action.anchorNodeName);
    const role = normalizeActionDedupeText(action.role || action.skill || action.deliverable);
    const key = action.type === "create_agent"
      ? `${action.type}:${title || role}:${body}`.slice(0, 320)
      : `${action.type}:${title}:${body}:${parent}`.slice(0, 320);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(action);
  }
  return result;
}

function normalizeActionDedupeText(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s"'“”‘’`_*#>()[\]{}，。！？、；：:;,.!?|/\\-]+/g, " ")
    .replace(/\b(search query|query|note|plan|research report|report)\b/gi, " ")
    .replace(/\b(搜索 query|搜索线索|研究报告|报告|笔记|计划)\b/gi, " ")
    .trim()
    .slice(0, 220);
}

function actionContentForDedupe(action) {
  if (!action?.content || typeof action.content !== "object") return "";
  try {
    return JSON.stringify(action.content).slice(0, 700);
  } catch {
    return "";
  }
}

function canvasActionPipelineDependencies() {
  return {
    normalizeActions: normalizeVoiceActions,
    applyPolicy: ({ actions, message, context }) => filterCanvasActionsForUserIntent(actions, message, context),
    ensureMediaGenerationActions,
    ensureCommittedCanvasActions,
    cleanupFallbackActions: ({ message, actions, reply }) => ensureChatFallbackActionsClean(message, actions, reply),
    mergeReferenceActions: ({ actions, response, message, webSearchEnabled }) => mergeReferenceActions(actions, response, message, webSearchEnabled),
    enrichActions: ({ actions, message, reply, lang, thinkingMode, context }) => enrichCanvasActions(actions, message, reply, lang, thinkingMode, context),
    finalizeAgentActions: ({ actions, message, lang, agentMode }) => (
      agentMode ? finalizeAgentControllerActions(actions, message, lang) : actions.filter((action) => action.type !== "create_agent")
    ),
    ensureAutomaticSmartCardActions: ({ actions, message, reply, lang, thinkingMode }) => ensureAutomaticSmartCardActions(actions, message, reply, lang, thinkingMode),
    compactActionPolicyTrace
  };
}

function filterCanvasActionsForUserIntent(actions, message, context = {}) {
  const usable = Array.isArray(actions) ? actions : [];
  if (!usable.length) return usable;
  const policy = buildCanvasActionPolicy(message, {
    agentMode: context.agentMode,
    agentSkill: context.agentSkill,
    thinkingMode: context.thinkingMode,
    selectedContext: context.selectedContext,
    canvas: context.canvas
  });
  const result = filterCanvasActionsByPolicy(usable, policy);
  if (Array.isArray(context.policyTraces)) {
    context.policyTraces.push(summarizeCanvasActionPolicy(policy, {
      proposed: usable,
      final: result.actions,
      rejected: result.rejected,
      loop: result.loop
    }));
  }
  return result.actions;
}

function compactActionPolicyTrace(traces = []) {
  const list = Array.isArray(traces) ? traces.filter(Boolean) : [];
  if (!list.length) return undefined;
  const final = list[list.length - 1];
  return {
    taskType: final.taskType,
    confidence: final.confidence,
    automaticCardMode: final.automaticCardMode,
    maxActions: final.maxActions,
    allowedActionTypes: final.allowedActionTypes,
    proposedActionTypes: Array.from(new Set(list.flatMap((item) => item.proposedActionTypes || []))),
    finalActionTypes: final.finalActionTypes || [],
    rejected: list.flatMap((item) => item.rejected || []).slice(0, 16),
    loop: final.loop,
    events: list.flatMap((item) => item.events || []).slice(-28)
  };
}

function compactMentionedCanvasActionTypes(text = "") {
  const value = String(text || "");
  if (!value) return [];
  return CANVAS_ACTION_TYPES.filter((type) => value.includes(type)).slice(0, 24);
}

function logCanvasActionPipelineDiagnostics({
  source = "chat",
  message = "",
  reply = "",
  thinkingMode = "no-thinking",
  rawActions = [],
  inlineActions = [],
  thinkingContent = "",
  actionPipeline = {}
} = {}) {
  const stages = Array.isArray(actionPipeline?.stages) ? actionPipeline.stages : [];
  const finalActions = Array.isArray(actionPipeline?.actions) ? actionPipeline.actions : [];
  if (rawActions.length && finalActions.length) return;
  const stageSummary = stages
    .map((stage) => `${stage.name}:${stage.inputCount}->${stage.outputCount}[${(stage.actionTypes || []).join(",")}]`)
    .join(" | ");
  const policy = actionPipeline?.actionPolicy || {};
  console.warn("[canvas-actions] pipeline diagnostic", {
    source,
    thinkingMode,
    rawActionTypes: compactPipelineActionTypes(rawActions),
    inlineActionTypes: compactPipelineActionTypes(inlineActions),
    finalActionTypes: compactPipelineActionTypes(finalActions),
    thinkingMentionedActionTypes: compactMentionedCanvasActionTypes(thinkingContent),
    taskType: policy.taskType,
    automaticCardMode: policy.automaticCardMode,
    rejected: policy.rejected || [],
    stages: stageSummary,
    messageSnippet: String(message || "").slice(0, 160),
    replySnippet: String(reply || "").slice(0, 160)
  });
}

function automaticCardLimitForIntent(intent, thinkingMode = "no-thinking") {
  if (intent?.visualComparison) return thinkingMode === "thinking" ? 3 : 2;
  if (intent?.visualEvaluation) return 2;
  return thinkingMode === "thinking" ? 5 : 3;
}

function ensureAutomaticSmartCardActions(actions, message, reply, lang = "zh", thinkingMode = "no-thinking") {
  const existing = Array.isArray(actions) ? actions : [];
  if (isExplicitNoteCardRequest(message) && !existing.some((action) => action?.type === "create_note")) {
    return [buildGenericNoteAction(message, reply || message, lang)];
  }
  if (existing.length) return existing;
  const intent = classifyChatIntent(message);
  if (!intent.automaticCardMode || intent.noCanvas) return existing;
  const replyText = String(reply || "").trim();
  const minimumLength = intent.visualEvaluation ? 120 : 260;
  if (replyText.length < minimumLength) return existing;
  const builtActions = buildAutomaticSmartCardActions(message, replyText, lang, intent);
  if (!builtActions.length) return existing;
  const maxAutoCards = automaticCardLimitForIntent(intent, thinkingMode);
  return dedupeCanvasActions(builtActions).slice(0, maxAutoCards);
}

function buildAutomaticSmartCardActions(message, reply, lang, intent) {
  if (intent.visualComparison) {
    const items = genericItemsFromText(reply, 5).map((item, index) => ({
      title: item.title && item.title !== `${index + 1}` ? item.title : (lang === "en" ? `Point ${index + 1}` : `要点 ${index + 1}`),
      summary: String(item.description || item.title || "").slice(0, 420)
    })).filter((item) => item.summary);
    return [{
      type: "create_comparison",
      title: lang === "en" ? "Photo comparison" : "照片对比结论",
      description: lang === "en" ? "A concise card preserving the visual comparison result." : "保存本轮图片评价与推荐结论。",
      content: {
        criteria: lang === "en"
          ? ["Composition", "Light", "Focus", "Color", "Mood", "Overall recommendation"]
          : ["构图", "光线", "焦点", "色彩", "氛围", "总体推荐"],
        items: items.length ? items : [{ title: lang === "en" ? "Conclusion" : "结论", summary: reply.slice(0, 520) }],
        recommendation: reply.slice(0, 700)
      }
    }];
  }
  if (intent.visualEvaluation) {
    return [
      buildGenericNoteAction(message, reply, lang),
      buildGenericMetricAction(message, reply, lang)
    ].filter(Boolean);
  }
  if (isPlanningRequest(message)) {
    return [
      buildGenericTimelineAction(message, reply, lang),
      buildGenericTodoAction(message, reply, lang),
      buildGenericNoteAction(message, reply, lang)
    ].filter(Boolean);
  }
  if (isComparisonRequest(message)) {
    return [
      buildGenericComparisonAction(message, reply, lang),
      buildGenericMetricAction(message, reply, lang),
      buildGenericNoteAction(message, reply, lang)
    ].filter(Boolean);
  }
  if (isResearchRequest(message)) {
    return [
      buildGenericNoteAction(message, reply, lang),
      buildGenericQuoteAction(message, reply, lang),
      buildGenericTableAction(message, reply, lang)
    ].filter(Boolean);
  }
  if (isDataOrCodeRequest(message) && /(表格|数据|table|data|matrix|csv)/i.test(message)) {
    return [
      buildGenericTableAction(message, reply, lang),
      buildGenericNoteAction(message, reply, lang),
      buildGenericTodoAction(message, reply, lang)
    ].filter(Boolean);
  }
  if (/(代码|程序|脚本|函数|bug|code|program|script|function|debug)/i.test(message)) {
    return [
      buildGenericNoteAction(message, reply, lang),
      buildGenericTodoAction(message, reply, lang)
    ].filter(Boolean);
  }
  return [buildGenericNoteAction(message, reply, lang)].filter(Boolean);
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

  const prompt = buildAnalysisPrompt(lang, taskType, body?.contentType || "image");

  const analysisPayload = {
    max_tokens: 4096,
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
  applyAnalysisJsonObjectResponseMode(analysisPayload);

  try {
    const response = await callAnalysisCompletion(analysisPayload, { timeoutMs: ANALYSIS_FAST_TIMEOUT_MS });
    const { parsed, repaired } = await parseAnalysisResponseJson(response, { lang, includeReferences: false });
    const normalized = normalizeAnalysis(parsed, body?.fileName);
    if (repaired) normalized.warningCode = "analysis_json_repaired";
    normalized.provider = "api";
    normalized.model = response?.model || runtimeConfigs.analysis.model;
    normalized.taskType = taskType;
    return sendJson(res, 200, normalized);
  } catch (error) {
    console.error("[handleAnalyze] error:", error);
    const fallback = buildDemoAnalysis(body?.fileName || "source image");
    fallback.provider = "fallback";
    fallback.model = runtimeConfigs.analysis.model;
    fallback.taskType = taskType;
    fallback.warningCode = "analysis_fallback";
    fallback.warning = error.message || "Analysis model failed; returned fallback cards.";
    return sendJson(res, 200, fallback);
  }
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
        "User-Agent": "ThoughtGrid/0.1 link-analyzer",
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

  const lang = body?.language === "en" ? "en" : "zh";
  let extractedText = "";
  if (dataUrl && fileName) {
    try {
      const document = await extractDocumentTextFromDataUrl(dataUrl, fileName);
      extractedText = document.text || "";
    } catch {
      extractedText = "";
    }
  }

  if (isDemoRole(runtimeConfigs.analysis)) {
    if ((text || extractedText || dataUrl) && !imageDataUrl && !url) {
      const demo = buildDocumentFallbackExplore({
        fileName,
        text: text || extractedText,
        lang,
        warning: "Demo mode: returned parser-derived document exploration cards.",
        model: runtimeConfigs.analysis.model,
        taskType: "research"
      });
      demo.provider = "demo";
      return sendJson(res, 200, demo);
    }
    return sendJson(res, 200, buildDemoExplore(fileName));
  }

  const primaryContent = text || extractedText || url || imageDataUrl || "";
  const contentType = body?.contentType || (imageDataUrl ? "image" : text ? "text" : url ? "url" : "text");

  const { taskType, confidence, wasFallback } = await routeContent({
    content: primaryContent,
    contentType,
    fileName,
    lang,
    config: runtimeConfigs.chat
  });
  console.log(`[route] ${taskType} (confidence: ${confidence}, fallback: ${wasFallback})`);

  const prompt = buildExplorePrompt(lang, taskType, contentType);
  const fallbackExplore = () => {
    const fallback = buildDemoExplore(fileName || url || "source");
    fallback.provider = "fallback";
    fallback.model = runtimeConfigs.analysis.model;
    fallback.taskType = taskType;
    fallback.warningCode = "explore_fallback";
    return fallback;
  };

  let content;
  let pageText = "";
  try {
    pageText = url ? await fetchPublicPageText(url).catch(() => "") : "";
    content = buildExploreContent({ prompt, imageDataUrl, url, pageText, text: text || extractedText, dataUrl: text || extractedText ? "" : dataUrl, fileName, parseDataUrl, extensionFromFileName, extractTextFromBuffer });
  } catch (parseErr) {
    return sendJson(res, 400, { error: parseErr.message || "Failed to parse uploaded file." });
  }

  const analysisPayload = {
    messages: [{ role: "user", content }]
  };

  const isDocumentExplore = Boolean((text || extractedText || dataUrl) && !imageDataUrl && !url);
  const effectiveExploreThinkingMode = thinkingMode;

  applyReasoningMode(analysisPayload, runtimeConfigs.analysis, effectiveExploreThinkingMode);
  applyWebSearchMode(analysisPayload, runtimeConfigs.analysis, Boolean(url));
  applyAnalysisJsonObjectResponseMode(analysisPayload);

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

  const primaryExploreTimeout = isDocumentExplore
    ? (effectiveExploreThinkingMode === "thinking" ? FILE_EXPLORE_THINKING_TIMEOUT_MS : FILE_ANALYSIS_TIMEOUT_MS)
    : (effectiveExploreThinkingMode === "thinking" ? EXPLORE_THINKING_TIMEOUT_MS : CHAT_COMPLETION_TIMEOUT_MS);
  const fallbackExploreTimeout = isDocumentExplore ? FILE_EXPLORE_FALLBACK_TIMEOUT_MS : EXPLORE_FALLBACK_TIMEOUT_MS;

  try {
    const response = await callAnalysisCompletion(analysisPayload, {
      timeoutMs: primaryExploreTimeout
    });
    const { parsed, repaired } = await parseAnalysisResponseJson(response, { lang, includeReferences: true });
    const normalized = normalizeExplore(parsed, fileName, isDocumentExplore
      ? buildDocumentFallbackExplore({ fileName, text: text || extractedText, lang, model: runtimeConfigs.analysis.model, taskType })
      : null);
    if (repaired) normalized.warningCode = "explore_json_repaired";
    normalized.provider = "api";
    normalized.model = response?.model || runtimeConfigs.analysis.model;
    normalized.taskType = taskType;
    ingestExploreSources();
    return sendJson(res, 200, normalized);
  } catch (error) {
    if (effectiveExploreThinkingMode === "thinking" && shouldRetryExploreWithoutThinking(error)) {
      console.info("[handleAnalyzeExplore] thinking path failed, retrying without thinking:", error.message);
      try {
        const fallbackPayload = applyWebSearchMode(
          applyReasoningMode({ messages: analysisPayload.messages }, runtimeConfigs.analysis, "no-thinking"),
          runtimeConfigs.analysis,
          Boolean(url)
        );
        applyAnalysisJsonObjectResponseMode(fallbackPayload);
        const response = await callAnalysisCompletion(fallbackPayload, {
          timeoutMs: fallbackExploreTimeout
        });
        const { parsed, repaired } = await parseAnalysisResponseJson(response, { lang, includeReferences: true, timeoutMs: fallbackExploreTimeout });
        const normalized = normalizeExplore(parsed, fileName, isDocumentExplore
          ? buildDocumentFallbackExplore({ fileName, text: text || extractedText, lang, model: runtimeConfigs.analysis.model, taskType })
          : null);
        if (repaired) normalized.warningCode = "explore_json_repaired";
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
    const fallback = isDocumentExplore
      ? buildDocumentFallbackExplore({
          fileName,
          text: text || extractedText,
          lang,
          warning: error.message || "Explore analysis failed; returned parser-derived fallback cards.",
          model: runtimeConfigs.analysis.model,
          taskType
        })
      : fallbackExplore();
    fallback.warning = error.message || "Explore analysis failed; returned fallback cards.";
    return sendJson(res, 200, fallback);
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
  const prompt = buildUrlAnalysisPrompt({ url, domain, pageText, lang, taskType });

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
  applyAnalysisJsonObjectResponseMode(analysisPayload);

  try {
    const response = await callAnalysisCompletion(analysisPayload, { timeoutMs: ANALYSIS_FAST_TIMEOUT_MS });
    const { parsed, repaired } = await parseAnalysisResponseJson(response, { lang, includeReferences: false });
    const normalized = normalizeAnalysis(parsed, domain);
    if (repaired) normalized.warningCode = "analysis_json_repaired";
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
    const fallback = buildDemoAnalysis(domain);
    fallback.provider = "fallback";
    fallback.model = runtimeConfigs.analysis.model;
    fallback.taskType = taskType;
    fallback.domain = domain;
    fallback.warningCode = "analysis_fallback";
    fallback.warning = error.message || "URL analysis failed; returned fallback cards.";
    return sendJson(res, 200, fallback);
  }
}

async function handleAnalyzeText(body, res) {
  const fileName = typeof body?.fileName === "string" ? body.fileName.trim() : "";
  const safeFileName = fileName || "document";
  const thinkingMode = body?.thinkingMode === "thinking" ? "thinking" : "no-thinking";
  const sessionId = typeof body?.sessionId === "string" ? body.sessionId.trim() : "";
  const lang = body?.language === "en" ? "en" : "zh";

  let extractedText = "";
  let storedHash = null;

  if (typeof body?.text === "string" && body.text.trim().length >= 10) {
    extractedText = body.text.trim();
  } else if (typeof body?.dataUrl === "string" && body.dataUrl.startsWith("data:")) {
    try {
      const document = await extractDocumentTextFromDataUrl(body.dataUrl, safeFileName);
      extractedText = document.text;

      // Store the original file for history browser
      try {
        const stored = await storeFile(document.buffer, { kind: "upload", ext: document.ext || "bin" });
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

  let taskType = "research";
  let confidence = 0;
  let wasFallback = true;

  if (isDemoRole(runtimeConfigs.analysis)) {
    const demo = buildDocumentFallbackAnalysis({
      fileName: safeFileName,
      text: extractedText,
      lang,
      warning: "Demo mode: returned parser-derived document cards.",
      model: runtimeConfigs.analysis.model,
      taskType
    });
    demo.provider = "demo";
    if (storedHash) demo.sourceHash = storedHash;
    return sendJson(res, 200, demo);
  }

  ({ taskType, confidence, wasFallback } = await routeContent({
    content: extractedText,
    contentType: body?.contentType || "text",
    fileName,
    lang,
    config: runtimeConfigs.chat
  }));
  console.log(`[route] ${taskType} (confidence: ${confidence}, fallback: ${wasFallback})`);

  const prompt = buildTextAnalysisPrompt({
    extractedText,
    lang,
    taskType,
    contentType: body?.contentType || "text"
  });

  const analysisPayload = {
    messages: [
      {
        role: "user",
        content: prompt
      }
    ]
  };

  applyReasoningMode(analysisPayload, runtimeConfigs.analysis, thinkingMode);
  applyAnalysisJsonObjectResponseMode(analysisPayload);

  try {
    const response = await callAnalysisCompletion(analysisPayload, { timeoutMs: FILE_ANALYSIS_TIMEOUT_MS });
    const { parsed, repaired } = await parseAnalysisResponseJson(response, { lang, includeReferences: false });
    const normalized = normalizeAnalysis(parsed, safeFileName, buildDocumentFallbackAnalysis({
      fileName: safeFileName,
      text: extractedText,
      lang,
      model: runtimeConfigs.analysis.model,
      taskType
    }));
    if (repaired) normalized.warningCode = "analysis_json_repaired";
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
  } catch (error) {
    console.error("[handleAnalyzeText] error:", error);
    const fallback = buildDocumentFallbackAnalysis({
      fileName: safeFileName,
      text: extractedText,
      lang,
      warning: error.message || "Text analysis failed; returned parser-derived fallback cards.",
      model: runtimeConfigs.analysis.model,
      taskType
    });
    if (storedHash) fallback.sourceHash = storedHash;
    return sendJson(res, 200, fallback);
  }
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
  if (!option) {
    return sendJson(res, 400, { error: "option is required" });
  }
  if (maskDataUrl && !imageDataUrl && !body?.imageUrl) {
    return sendJson(res, 400, { error: "imageDataUrl or imageUrl is required for masked image editing" });
  }

  const lang = body?.language === "en" ? "en" : "zh";
  const hasReferenceImage = Boolean(imageDataUrl || body?.imageUrl);
  const blueprint = normalizeBlueprintPayload(body?.blueprint);
  const chatContext = normalizeGenerateChatContext(body?.chatContext);
  const prompt = buildGeneratePrompt(lang, { ...option, generationMode: hasReferenceImage ? "image-to-image" : "text-to-image", blueprint, chatContext });

  if (isDemoRole(runtimeConfigs.image)) {
    return sendJson(res, 200, {
      provider: "demo",
      model: runtimeConfigs.image.model,
      prompt,
      imageDataUrl: buildDemoImage(option)
    });
  }

  // thinkingMode is accepted for consistency but image generation APIs don't support it directly.
  const result = isDashScopeQwenImageConfig(runtimeConfigs.image)
    ? await generateDashScopeQwenImage(prompt, body?.imageUrl || null, imageDataUrl, { maskDataUrl, size: sizeOverride })
    : await generateTokenHubImage(prompt, body?.imageUrl || null, imageDataUrl);

  const generatedImage = result.imageDataUrl || result.imageUrl || "";
  if (!generatedImage) {
    return sendJson(res, 502, { error: "Image generation did not return an image." });
  }

  let stored;
  try {
    stored = await storeGeneratedImage(generatedImage);
  } catch (storeError) {
    console.error("[handleGenerate] failed to store generated image:", storeError);
    return sendJson(res, 502, {
      error: "Generated image could not be downloaded or cached.",
      message: storeError.message || String(storeError)
    });
  }
  if (!stored?.hash) {
    return sendJson(res, 502, { error: "Generated image could not be cached." });
  }

  return sendJson(res, 200, {
    provider: "api",
    model: runtimeConfigs.image.model,
    prompt,
    imageDataUrl: `/api/assets/${stored.hash}?kind=generated`,
    hash: stored.hash,
    imageUrl: result.imageUrl,
    revisedPrompt: result.revisedPrompt
  });
}

async function handleGenerateVideo(body, res) {
  const imageDataUrl = normalizeDataUrl(body?.imageDataUrl);
  const imageUrl = publicHttpUrl(body?.imageUrl || body?.referenceImageUrl || "");
  const rawOption = body?.option && typeof body.option === "object" ? body.option : {};
  const option = normalizeOption(body?.option);
  if (!option) {
    return sendJson(res, 400, { error: "option is required" });
  }

  const lang = body?.language === "en" ? "en" : "zh";
  const publicReferenceImageUrl = imageUrl && runtimeConfigs.video.options?.useReferenceImage !== false ? imageUrl : "";
  const blueprint = normalizeBlueprintPayload(body?.blueprint);
  const chatContext = normalizeGenerateChatContext(body?.chatContext);
  const prompt = buildVideoGenerationPrompt(lang, {
    ...option,
    generationMode: publicReferenceImageUrl ? "image-to-video" : "text-to-video",
    blueprint,
    chatContext,
    hasLocalReferenceImage: Boolean(imageDataUrl && !publicReferenceImageUrl)
  });

  if (isDemoRole(runtimeConfigs.video)) {
    return sendJson(res, 503, {
      error: "Video generation requires a DashScope API key.",
      provider: "demo",
      model: runtimeConfigs.video.model,
      prompt
    });
  }

  if (!isDashScopeHappyHorseVideoConfig(runtimeConfigs.video)) {
    return sendJson(res, 400, { error: "Configured video provider is not supported." });
  }

  let result;
  try {
    result = await generateDashScopeHappyHorseVideo(prompt, publicReferenceImageUrl, {
      duration: body?.duration ?? rawOption?.duration,
      resolution: body?.resolution ?? rawOption?.resolution,
      ratio: body?.ratio ?? rawOption?.ratio,
      watermark: body?.watermark ?? rawOption?.watermark,
      seed: body?.seed ?? rawOption?.seed
    });
  } catch (error) {
    console.error("[handleGenerateVideo] generation failed:", error);
    return sendJson(res, 502, {
      error: "Video generation failed.",
      message: error.message || String(error)
    });
  }

  const generatedVideo = result.videoUrl || result.videoDataUrl || "";
  if (!generatedVideo) {
    return sendJson(res, 502, { error: "Video generation did not return a video." });
  }

  let stored;
  try {
    stored = await storeGeneratedVideo(generatedVideo);
  } catch (storeError) {
    console.error("[handleGenerateVideo] failed to store generated video:", storeError);
    return sendJson(res, 502, {
      error: "Generated video could not be downloaded or cached.",
      message: storeError.message || String(storeError)
    });
  }
  if (!stored?.hash) {
    return sendJson(res, 502, { error: "Generated video could not be cached." });
  }

  return sendJson(res, 200, {
    provider: "api",
    model: result.model || runtimeConfigs.video.model,
    prompt,
    videoDataUrl: `/api/assets/${stored.hash}?kind=generated`,
    videoUrl: result.videoUrl || "",
    hash: stored.hash,
    mimeType: stored.mimeType || "video/mp4",
    taskId: result.taskId || "",
    status: result.status || "SUCCEEDED",
    usage: result.usage || null,
    revisedPrompt: result.revisedPrompt || ""
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

  const downloadController = new AbortController();
  const downloadTimeout = setTimeout(() => downloadController.abort(), 60000);
  let response;
  try {
    response = await fetch(imageReference, { signal: downloadController.signal });
  } finally {
    clearTimeout(downloadTimeout);
  }
  if (!response.ok) {
    throw new Error(`Failed to download generated image ${response.status}: ${response.statusText}`);
  }

  const contentType = response.headers.get("content-type") || "";
  const ext = extensionFromContentType(contentType) || extensionFromUrl(imageReference) || "jpg";
  const buffer = Buffer.from(await response.arrayBuffer());
  return storeFile(buffer, { kind: "generated", ext });
}

async function storeGeneratedVideo(videoReference) {
  if (typeof videoReference !== "string" || !videoReference) {
    return null;
  }

  if (videoReference.startsWith("data:")) {
    const parsed = parseDataUrl(videoReference);
    if (!/^video\//i.test(parsed.mimeType)) {
      throw new Error("Generated asset is not a video.");
    }
    const stored = await storeFile(parsed.buffer, { kind: "generated", ext: parsed.ext || "mp4" });
    return { ...stored, mimeType: parsed.mimeType };
  }

  if (!/^https?:\/\//i.test(videoReference)) {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), VIDEO_DOWNLOAD_TIMEOUT_MS);
  try {
    const response = await fetch(videoReference, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Failed to download generated video ${response.status}: ${response.statusText}`);
    }
    const contentType = (response.headers.get("content-type") || "").split(";")[0].trim();
    const ext = extensionFromContentType(contentType) || extensionFromUrl(videoReference) || "mp4";
    const buffer = Buffer.from(await response.arrayBuffer());
    const stored = await storeFile(buffer, { kind: "generated", ext });
    return { ...stored, mimeType: contentType || mimeTypeFromExtension(ext) || "video/mp4" };
  } finally {
    clearTimeout(timeout);
  }
}

function buildVideoGenerationPrompt(lang, option = {}) {
  const blueprintContext = formatVideoBlueprintContext(lang, option.blueprint);
  const chatContext = formatVideoChatContext(lang, option.chatContext);
  const localReferenceHint = option.hasLocalReferenceImage
    ? (lang === "en" ? "A local reference image was selected, but only text can be sent to the video model unless the image has a public URL. Reflect the user's described intent instead of claiming exact pixel fidelity." : "用户选中了本地参考图，但视频模型只能接收公网首帧 URL；请根据用户描述意图生成，不要承诺精确保留本地图像像素。")
    : "";
  return lang === "en"
    ? [
        "# Role",
        "You are a video generation prompt engineer.",
        "",
        "# Mission",
        option.generationMode === "image-to-video"
          ? "Generate a short video from the provided first-frame image and user direction, preserving the key subject while adding coherent motion."
          : "Generate a short video from the user's text direction with coherent motion, camera movement, and visual continuity.",
        "",
        "# Direction",
        "Title:",
        option.title || "",
        "",
        "Description:",
        option.description || "",
        "",
        "Detailed prompt:",
        option.prompt || "",
        "",
        localReferenceHint,
        "",
        blueprintContext,
        "",
        chatContext,
        "",
        "# Context Boundaries",
        CONTEXT_BOUNDARY_DIRECTIVES.en,
        "",
        "# Output Requirements",
        "- Cinematic, physically plausible motion.",
        "- Keep the main subject clear and temporally stable.",
        "- Avoid captions, watermarks, UI frames, or explanatory text unless explicitly requested."
      ].join("\n")
    : [
        "# 角色",
        "你是视频生成提示词工程师。",
        "",
        "# 使命",
        option.generationMode === "image-to-video"
          ? "请基于提供的首帧图片和用户方向生成一段短视频，保留关键主体，并加入连贯自然的运动。"
          : "请根据用户的文字方向生成一段短视频，保证运动、镜头和视觉连续性自然可信。",
        "",
        "# 方向",
        "标题：",
        option.title || "",
        "",
        "说明：",
        option.description || "",
        "",
        "详细提示词：",
        option.prompt || "",
        "",
        localReferenceHint,
        "",
        blueprintContext,
        "",
        chatContext,
        "",
        "# 上下文边界",
        CONTEXT_BOUNDARY_DIRECTIVES.zh,
        "",
        "# 输出要求",
        "- 电影感、物理运动自然可信。",
        "- 主体清晰，时序稳定。",
        "- 除非用户明确要求，不要出现字幕、水印、UI 边框或说明文字。"
      ].join("\n");
}

function formatVideoBlueprintContext(lang, blueprint) {
  if (!blueprint || typeof blueprint !== "object") return "";
  const cards = Array.isArray(blueprint.cards) ? blueprint.cards : [];
  const relationships = Array.isArray(blueprint.relationships) ? blueprint.relationships : [];
  const overallDescription = String(blueprint.overallDescription || "").trim();
  if (!cards.length && !relationships.length && !overallDescription) return "";
  const titleById = new Map(cards.map((card) => [card.id, card.title || card.id]));
  const lines = [
    lang === "en" ? "# Canvas Blueprint Context" : "# 画布蓝图上下文",
    cards.length ? `${lang === "en" ? "Cards" : "卡片"}: ${cards.map((card) => {
      const summary = String(card.summary || "").trim();
      return `${card.title || card.id}${summary ? ` — ${summary.slice(0, 180)}` : ""}`;
    }).join(lang === "en" ? "; " : "；")}` : "",
    overallDescription ? `${lang === "en" ? "Overall supplement" : "整体补充"}: ${overallDescription}` : "",
    ...relationships.slice(0, 12).map((relationship) => {
      const from = titleById.get(relationship.from) || relationship.from;
      const to = titleById.get(relationship.to) || relationship.to;
      const note = relationship.note ? ` — ${relationship.note}` : "";
      return `- ${from} -> ${to}${note}`;
    })
  ];
  return lines.filter(Boolean).join("\n");
}

function formatVideoChatContext(lang, messages) {
  if (!Array.isArray(messages) || !messages.length) return "";
  const lines = messages.slice(-6).map((message) => {
    const role = message.role === "assistant" ? (lang === "en" ? "Assistant" : "助手") : (lang === "en" ? "User" : "用户");
    return `- ${role}: ${String(message.content || "").slice(0, 500)}`;
  });
  return [lang === "en" ? "# Recent Chat Context" : "# 最近对话上下文", ...lines].join("\n");
}

async function ingestRemoteImageAsUpload(imageUrl) {
  if (typeof imageUrl !== "string" || !/^https?:\/\//i.test(imageUrl)) return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    const response = await fetch(imageUrl, { signal: controller.signal, headers: { "User-Agent": "ThoughtGrid-Search/1.0" } });
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
  create_direction: /方向|方案|概念方向|视觉概念|风格方向|direction|option|concept/i,
  create_plan: /计划|日程|行程|规划|itinerary|schedule|plan/i,
  create_todo: /任务|待办|清单|checklist|todo|task list/i,
  create_note: /笔记|记录|备忘|建议|总结卡片|情绪板|可行性|分析卡片|评价卡片|note|brief|moodboard|jot down|recommendation|feasibility/i,
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
  arrange_canvas: /整理.{0,12}(画布|布局)|排列.{0,12}(画布|布局)|避免?重叠|不?要重叠|arrange|layout|tidy|overlap/i,
  move_node: /移动|往左|往右|往上|往下|move/i,
  focus_node: /聚焦|定位到|focus/i,
  delete_node: /删除|移除|删掉|delete|remove/i,
  zoom_in: /放大|zoom in|enlarge/i,
  zoom_out: /缩小|zoom out|shrink/i,
  reset_view: /重置视图|reset[_ ]view|恢复默认视图/i
};

function ensureChatFallbackActionsClean(message, actions, reply = "") {
  const normalized = Array.isArray(actions) ? [...actions] : [];
  const fallbackOnlyAfterRejection = normalized.length > 0;

  const requestText = String(message || "").normalize("NFKC");
  const combinedText = requestText + " " + String(reply || "").normalize("NFKC");
  const intent = classifyChatIntent(requestText);
  const url = extractFirstUrl(requestText);
  const directionIntent = intent.taskType === "direction_generation" || shouldCreateDirectionActions(requestText, reply);
  const hasDirectionAction = normalized.some((action) => action?.type === "create_direction");
  if (directionIntent && hasDirectionAction) return normalized;
  if (intent.taskType === "workspace") {
    const workspaceFallback = buildWorkspaceFallbackAction(requestText);
    if (workspaceFallback && !normalized.some((action) => action?.type === workspaceFallback.type)) return [workspaceFallback];
  }
  if (!directionIntent && (intent.taskType === "writing" || intent.summaryRequest) && !normalized.some((action) => ["create_note", "create_table", "create_todo"].includes(action?.type))) {
    return [{
      type: "create_note",
      title: requestText.slice(0, 48),
      content: buildFallbackActionContent("create_note", requestText.slice(0, 48), requestText)
    }];
  }
  if (!directionIntent && isExplicitNoteCardRequest(requestText) && !normalized.some((action) => action?.type === "create_note")) {
    return [{
      type: "create_note",
      title: requestText.slice(0, 48),
      content: buildFallbackActionContent("create_note", requestText.slice(0, 48), requestText)
    }];
  }
  if (intent.taskType === "planning" && !normalized.some((action) => ["create_plan", "create_timeline", "create_todo", "create_table"].includes(action?.type))) {
    const type = /(时间线|timeline)/i.test(requestText) ? "create_timeline" : "create_plan";
    return [{
      type,
      title: requestText.slice(0, 48),
      content: buildFallbackActionContent(type, requestText.slice(0, 48), requestText)
    }];
  }
  if (intent.webResearch && url && !normalized.some((action) => ["create_web_card", "create_link", "create_note", "web_search"].includes(action?.type))) {
    return [
      {
        type: "create_web_card",
        title: readableWebTitle(url, deriveSearchQueryClean(requestText) || url).slice(0, 80),
        description: String(reply || requestText).slice(0, 420),
        url,
        query: deriveSearchQueryClean(requestText) || requestText.slice(0, 180)
      },
      ...normalized.filter((action) => action?.type !== "generate_image").slice(0, 3)
    ];
  }
  const wantsArtifact = !intent.noCanvas && !intent.trivial && (
    intent.explicitCanvas ||
    intent.structuredDeliverable ||
    isPlanningRequest(requestText) ||
    isComparisonRequest(requestText) ||
    isResearchRequest(requestText) ||
    isDataOrCodeRequest(requestText) ||
    /(画布|卡片|节点|创建|新建|生成.*(卡片|节点|方向|方案)|保存成|保存一个|保存为|放到画布|整理到画布|canvas|card|node|create|add|save.*card|generate.*(?:direction|option|concept))/i.test(requestText)
  );
  const matchedTypes = [];

  for (const [actionType, regex] of Object.entries(FALLBACK_KEYWORDS)) {
    if (regex.test(combinedText)) {
      if (isWorkspaceFallbackAction(actionType) && intent.taskType === "workspace") return [{ type: actionType }];
      if (!wantsArtifact) break;
      matchedTypes.push(actionType);
    }
  }
  if (/agent|代理|子\s*agent|subagent/i.test(requestText) && !normalized.some((action) => action?.type === "create_agent")) {
    return [buildAgentFallbackAction(requestText), ...normalized.filter((action) => action?.type !== "generate_image").slice(0, 3)];
  }
  if (intent.mediaSearch && !normalized.some((action) => ["image_search", "reverse_image_search", "text_image_search"].includes(action?.type))) return [buildMediaSearchFallbackAction(requestText)];
  if (intent.mediaGeneration && !normalized.some((action) => ["generate_image", "generate_video"].includes(action?.type))) return [buildMediaGenerationFallbackAction(requestText)];
  const shouldCompleteBundle = fallbackOnlyAfterRejection && wantsArtifact && shouldCompleteRequestedCardBundle(requestText, matchedTypes, normalized);
  if (fallbackOnlyAfterRejection && !shouldCompleteBundle && !shouldRecoverFromRejectedActions(requestText, normalized)) return normalized;
  if (!wantsArtifact) return normalized;
  const fallbackTypes = uniqueActionTypes([
    ...fallbackActionTypesForRequest(requestText, matchedTypes),
    ...(shouldCompleteBundle ? matchedTypes.filter((type) => !isWorkspaceFallbackAction(type) && !isViewOnlyFallbackAction(type)) : [])
  ]);
  const title = requestText.slice(0, 48);
  for (const actionType of fallbackTypes.slice(0, 4)) {
    const safeType = (actionType === "create_web_card" || actionType === "create_link") && !url ? "create_note" : actionType;
    if (normalized.some((action) => action?.type === safeType)) continue;
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

function shouldCompleteRequestedCardBundle(text, matchedTypes = [], actions = []) {
  const requestText = String(text || "");
  const existingTypes = new Set((Array.isArray(actions) ? actions : []).map((action) => action?.type).filter(Boolean));
  const requestedTypes = uniqueActionTypes(matchedTypes.filter((type) => !isWorkspaceFallbackAction(type) && !isViewOnlyFallbackAction(type)));
  const missingTypes = requestedTypes.filter((type) => !existingTypes.has(type));
  if (missingTypes.length === 0) return false;
  if (/(卡片包|工作区卡片|报告包|至少|分别|都要|同时|以及|并给|和|、|bundle|pack|at least|separate)/i.test(requestText)) return true;
  return requestedTypes.length >= 2 && /(创建|生成|整理|做成|保存成|create|generate|build|make)/i.test(requestText);
}

function shouldRecoverFromRejectedActions(text, actions) {
  const requestText = String(text || "");
  if (!Array.isArray(actions) || actions.length === 0) return false;
  if (isWorkspaceLayoutRequest(requestText)) return true;
  if (/(保存成|保存一个|保存为|卡片|节点|save.*card|as.*card)/i.test(requestText)) return true;
  if (extractFirstUrl(requestText) && /(网页|网址|链接|url|参考|来源|引用|总结|保存成|卡片|web|link|reference|source|citation|summari[sz]e|save)/i.test(requestText)) return true;
  return false;
}

function fallbackActionTypesForRequest(text, matchedTypes = []) {
  const primary = matchedTypes.find((type) => !isViewOnlyFallbackAction(type));
  if (isVisualCritiqueRequest(text)) return uniqueActionTypes([primary && primary !== "create_direction" ? primary : "create_note", "create_metric"]);
  if (isWorkspaceLayoutRequest(text)) return uniqueActionTypes([primary || "arrange_canvas"]);
  if (extractFirstUrl(text) && /(网页|网址|链接|url|参考|来源|引用|总结|保存成|卡片|web|link|reference|source|citation|summari[sz]e|save)/i.test(String(text || ""))) return uniqueActionTypes([primary || "create_web_card"]);
  if (isDirectionRequest(text)) return uniqueActionTypes([primary || "create_direction"]);
  if (isExplicitNoteCardRequest(text)) return uniqueActionTypes(["create_note", primary, "create_table"]);
  if (isPlanningRequest(text)) return uniqueActionTypes([primary || "create_plan", "create_timeline", "create_todo", "create_table"]);
  if (isComparisonRequest(text)) return uniqueActionTypes([primary || "create_comparison", "create_metric", "create_todo"]);
  if (isResearchRequest(text)) return uniqueActionTypes([primary || "create_note", "create_quote", "create_table"]);
  if (isDataOrCodeRequest(text)) return uniqueActionTypes([primary || "create_table", "create_note", "create_todo"]);
  if (isGeneralMultiCardRequest(text)) return uniqueActionTypes([primary || "create_note", "create_table", "create_todo"]);
  return uniqueActionTypes([primary || "create_note"]);
}

function isExplicitNoteCardRequest(text) {
  return /(笔记卡|笔记|总结卡片|情绪板总结|情绪板|简报|brief|note card|note|moodboard)/i.test(String(text || ""))
    && /(创建|生成|整理|写|保存成|做成|create|generate|draft|write|save|turn)/i.test(String(text || ""));
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

function isWorkspaceFallbackAction(actionType) {
  return ["arrange_canvas", "move_node", "focus_node", "delete_node", "zoom_in", "zoom_out", "reset_view"].includes(actionType);
}

function buildMediaSearchFallbackAction(text) {
  const requestText = String(text || "");
  const type = /(反向|相似|以图|reverse)/i.test(requestText) ? "reverse_image_search" : "image_search";
  return {
    type,
    title: requestText.slice(0, 48),
    query: requestText.slice(0, 180)
  };
}

function buildMediaGenerationFallbackAction(text) {
  const requestText = String(text || "");
  const type = /(视频|动画|短片|动态镜头|video|animation|clip)/i.test(requestText) ? "generate_video" : "generate_image";
  return {
    type,
    title: requestText.slice(0, 48),
    prompt: requestText.slice(0, 1200)
  };
}

function buildAgentFallbackAction(text) {
  const requestText = String(text || "");
  return {
    type: "create_agent",
    title: requestText.slice(0, 48),
    description: requestText,
    prompt: requestText
  };
}

function buildWorkspaceFallbackAction(text) {
  const requestText = String(text || "");
  if (isWorkspaceLayoutRequest(requestText)) return { type: "arrange_canvas" };
  if (/(删除|移除|删掉|delete|remove)/i.test(requestText) && !/(不要|不准|别|无需|do\s+not|don't|dont|without).{0,12}(删除|移除|删掉|delete|remove)/i.test(requestText)) return { type: "delete_node", target: "selected" };
  if (/(重置.{0,8}视图|默认缩放|reset[_ ]?view)/i.test(requestText)) return { type: "reset_view" };
  if (/(聚焦|定位到|focus)/i.test(requestText)) return { type: "focus_node" };
  if (/(放大|zoom in|enlarge)/i.test(requestText)) return { type: "zoom_in" };
  if (/(缩小|zoom out|shrink)/i.test(requestText)) return { type: "zoom_out" };
  if (/(移动|往左|往右|往上|往下|move)/i.test(requestText)) return { type: "move_node" };
  return null;
}

function isWorkspaceLayoutRequest(text) {
  return /(整理|排列|排版|布局|重叠|arrange|layout|tidy|overlap)/i.test(String(text || ""))
    && /(画布|布局|重叠|节点|canvas|layout|overlap|node)/i.test(String(text || ""));
}

function isDirectionRequest(text) {
  return /(方向|方案|概念方向|视觉概念|direction|option|concept)/i.test(String(text || ""))
    && /(生成|创建|新建|做|整理|产出|发散|展开|拆出|列出|设计|组合|generate|create|make|produce|brainstorm|develop|propose)/i.test(String(text || ""));
}

function isVisualCritiqueRequest(text) {
  return /(照片|图片|图像|画面|摄影|这张图|这幅图|这张海报|这幅海报|photo|picture|image|shot|visual)/i.test(String(text || ""))
    && /(点评|评价|评估|打分|建议|诊断|可行性|critique|review|evaluate|score|recommendation|feasibility)/i.test(String(text || ""))
    && !/(几张|多张|两张|三张|哪张|哪个更|最好|更好|比较|对比|compare|comparison|rank|best|better)/i.test(String(text || ""));
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
    const items = ensureFallbackWorkItems(extractFallbackListItems(body), body, title, 4, 12)
      .map((item, index) => ({
        text: item.description || item.title,
        done: false,
        priority: index < 2 ? "高" : "中",
        rationale: item.title || body.slice(0, 160)
      }));
    return { items: items.length ? items : [{ text: body.slice(0, 300), done: false }] };
  }
  if (actionType === "create_note") {
    const sections = buildSubstantiveNoteSections(title, body, "zh");
    return {
      sections,
      text: noteTextFromSections(sections).slice(0, 6000)
    };
  }
  if (actionType === "create_weather") {
    return {
      location: title || body.slice(0, 80),
      temp: "",
      forecast: body.slice(0, 700)
    };
  }
  if (actionType === "create_map") {
    return {
      address: title || body.slice(0, 180)
    };
  }
  if (actionType === "create_link" || actionType === "create_web_card") {
    const url = extractFirstUrl(body);
    if (!url) return undefined;
    const source = webSourceName(url);
    return {
      title: readableWebTitle(url, title),
      url,
      description: body.slice(0, 420),
      source,
      faviconUrl: webFaviconUrl(url)
    };
  }
  if (actionType === "create_code") {
    const code = body.match(/```[a-z0-9_-]*\n([\s\S]*?)```/i)?.[1] || body;
    return { language: "text", code: code.slice(0, 6000), explanation: body.slice(0, 1200) };
  }
  if (actionType === "create_table") {
    const items = ensureFallbackWorkItems(genericItemsFromText(body, 8), body, title, 3, 8);
    return {
      columns: ["项目", "细节", "下一步"],
      rows: (items.length ? items : [{ title, description: body.slice(0, 700) }]).map((item, index) => ({
        项目: item.title || `${index + 1}`,
        细节: item.description || item.title,
        下一步: item.nextStep || item.description || item.title
      }))
    };
  }
  if (actionType === "create_timeline") {
    const items = ensureFallbackWorkItems(genericItemsFromText(body, 8), body, title, 3, 8);
    return { items: (items.length ? items : [{ title, description: body.slice(0, 700) }]).map((item, index) => ({ phase: `${index + 1}`, title: item.title, description: item.description || item.title })) };
  }
  if (actionType === "create_comparison") {
    const items = genericItemsFromText(body, 6);
    return { items: (items.length ? items : [{ title, description: body.slice(0, 700) }]).map((item) => ({ title: item.title, summary: item.description || item.title })) };
  }
  if (actionType === "create_metric") return { metrics: [{ label: title || "Metric", value: body.slice(0, 80), note: body.slice(0, 400) }] };
  if (actionType === "create_quote") return { quotes: [{ text: body.slice(0, 900) }] };
  return undefined;
}

function extractFallbackListItems(text) {
  const lines = normalizeGeneratedMarkdownForExtraction(text)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const items = [];
  for (const line of lines) {
    const cleaned = plainCardText(line.replace(/^#{1,6}\s+/, "").replace(/^[-*•]\s+/, "").replace(/^\d+[.)、]\s+/, "").trim(), 900);
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

function ensureFallbackWorkItems(items = [], body = "", title = "", minItems = 3, maxItems = 8) {
  const normalized = (Array.isArray(items) ? items : [])
    .map((item) => ({
      title: plainCardText(item?.title || item, 100),
      description: plainCardText(item?.description || item?.summary || item?.title || item, 520),
      nextStep: plainCardText(item?.nextStep || item?.action || "", 220)
    }))
    .filter((item) => item.title || item.description);
  const source = plainCardText(`${title || ""} ${body || ""}`, 1200);
  const fragments = source
    .split(/[。；;]|(?:,|，|、)(?=(?:并|和|以及|同时|不要|需要|必须|要|风险|验证|索引|边界|下一步|问题|解决方案|差异化|商业模式|材质|色彩|镜头|禁用))/)
    .map((item) => plainCardText(item, 260))
    .filter((item) => item.length >= 8);
  for (const fragment of fragments) {
    if (normalized.length >= minItems) break;
    normalized.push({
      title: fragment.slice(0, 60),
      description: fragment,
      nextStep: `围绕「${fragment.slice(0, 32)}」补齐负责人、证据和验收标准。`
    });
  }
  const generic = [
    ["验证口径", "核对输入数据、边界条件、样例结果和异常分支，避免只保存结论。"],
    ["风险与依赖", "列出前置依赖、潜在误判、成本约束和需要人工确认的部分。"],
    ["执行下一步", "把结论拆成可交付动作，明确负责人、截止时间和成功标准。"],
    ["复盘更新", "执行后回填结果、证据链接和下一轮需要调整的假设。"]
  ];
  for (const [genericTitle, description] of generic) {
    if (normalized.length >= minItems) break;
    normalized.push({
      title: genericTitle,
      description,
      nextStep: description
    });
  }
  return normalized.slice(0, maxItems);
}

function normalizeGeneratedMarkdownForExtraction(text) {
  let value = String(text || "").normalize("NFKC").replace(/\r\n?/g, "\n");
  value = value.replace(/([^\n])\s*(#{1,6})(?=\S)/g, "$1\n\n$2 ");
  value = value.replace(/(^|\n)(#{1,6})(?=\S)/g, "$1$2 ");
  value = value.replace(/([^\n])\s*((?:\*\*)?(?:优势|优点|不足|缺点|风险|小结|结论|类型|整体风格|视觉风格特征|色彩风格|构图风格|光影处理|推荐|建议|适合)[:：]?(?:\*\*)?)/g, "$1\n$2");
  value = value.replace(/([^\n])\s*((?:📸\s*)?(?:\*\*)?(?:照片|Photo)\s*[0-9一二两三四五六七八九十]+(?:\*\*)?\s*[：:、.)-]?)/gi, "$1\n\n$2");
  return value.replace(/\n{3,}/g, "\n\n");
}

function plainCardText(value, max = 0) {
  let text = String(value || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*]\([^)]+\)/g, " ")
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replace(/<\/?[^>]+>/g, " ")
    .replace(/[#*_`~>|]/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n+\s*/g, " ")
    .trim();
  text = text.replace(/\s{2,}/g, " ").trim();
  return max > 0 ? text.slice(0, max).trim() : text;
}

function extractPhotoComparisonItems(text, limit = 8) {
  const normalized = normalizeGeneratedMarkdownForExtraction(text);
  const re = /(?:^|\n)\s*(?:#{1,6}\s*)?(?:📸\s*)?(?:\*\*)?(照片|photo)\s*([0-9一二两三四五六七八九十]+)(?:\*\*)?\s*[：:、.)-]?\s*([^\n]*)/gi;
  const matches = [];
  let match;
  while ((match = re.exec(normalized))) {
    matches.push({
      index: match.index,
      end: re.lastIndex,
      label: match[1],
      number: match[2],
      suffix: match[3] || ""
    });
  }
  if (!matches.length) return [];
  return matches.slice(0, limit).map((entry, index) => {
    const next = matches[index + 1];
    const section = normalized.slice(entry.index, next ? next.index : normalized.length);
    const title = cleanPhotoComparisonTitle(`${entry.label}${entry.number}${entry.suffix ? ` ${entry.suffix}` : ""}`, entry.number);
    const pros = extractLabeledList(section, ["优势", "优点", "亮点"]);
    const cons = extractLabeledList(section, ["不足", "缺点", "风险", "问题"]);
    const summary = extractPhotoSummary(section, title, pros, cons);
    return {
      title,
      summary,
      pros,
      cons
    };
  }).filter((item) => item.title || item.summary);
}

function cleanPhotoComparisonTitle(rawTitle, number) {
  let title = plainCardText(rawTitle, 140)
    .replace(/^(photo)\s*/i, "Photo ")
    .replace(/^照片\s+/, "照片")
    .trim();
  title = title.replace(/\s*(整体风格|视觉风格特征|色彩风格|构图风格|光影处理|优势|优点|不足|风险|小结|结论|类型)[:：]?.*$/i, "").trim();
  if (!title || /^照片\s*$/.test(title)) title = `照片${number}`;
  return title.slice(0, 120);
}

function extractLabeledList(section, labels = []) {
  const snippet = extractLabeledSnippet(section, labels);
  if (!snippet) return [];
  return snippet
    .split(/[；;。\n]/)
    .map((item) => plainCardText(item, 160))
    .filter((item) => item && !labels.some((label) => item === label))
    .slice(0, 4);
}

function extractLabeledSnippet(section, labels = []) {
  if (!labels.length) return "";
  const labelSource = labels.map(escapeRegExp).join("|");
  const labelRe = new RegExp(`(?:^|\\n)\\s*(?:#{1,6}\\s*)?(?:\\*\\*)?(?:${labelSource})\\s*[:：]?\\s*(?:\\*\\*)?\\s*`, "i");
  const match = labelRe.exec(section);
  if (!match) return "";
  const rest = section.slice(match.index + match[0].length);
  const stop = rest.search(/\n\s*(?:#{1,6}\s*)?(?:\*\*)?(?:优势|优点|亮点|不足|缺点|风险|问题|小结|结论|类型|整体风格|视觉风格特征|色彩风格|构图风格|光影处理|推荐|建议|适合|照片\s*[0-9一二两三四五六七八九十]+|photo\s*[0-9]+)\s*[:：]?(?:\*\*)?/i);
  return (stop >= 0 ? rest.slice(0, stop) : rest).trim();
}

function extractPhotoSummary(section, title, pros = [], cons = []) {
  const labeledSummary = extractLabeledSnippet(section, ["小结", "结论", "推荐", "建议"]);
  if (labeledSummary) return plainCardText(labeledSummary, 420);
  const normalizedTitle = plainCardText(title);
  const lines = normalizeGeneratedMarkdownForExtraction(section)
    .split(/\n+/)
    .map((line) => plainCardText(line, 420))
    .filter(Boolean)
    .filter((line) => line !== normalizedTitle && !/^照片\s*[0-9一二两三四五六七八九十]+$/i.test(line))
    .filter((line) => !/^(优势|优点|亮点|不足|缺点|风险|问题|小结|结论|类型|整体风格|视觉风格特征|色彩风格|构图风格|光影处理|推荐|建议|适合)[:：]?$/i.test(line));
  const firstUseful = lines.find((line) => !line.includes("----") && line.length > 3);
  if (firstUseful) return firstUseful.slice(0, 420);
  return [...pros, ...cons].slice(0, 2).join("；").slice(0, 420);
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
      summary: action.description || action.deliverable || action.prompt || action.query || "",
      status: action.role || "no-thinking",
      role: action.role || "",
      skill: action.skill || "",
      deliverable: action.deliverable || "",
      successCriteria: action.successCriteria || "",
      priority: action.priority || ""
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
  if (/agent|subagent|代理|子代理|自主|自动执行|多步/.test(text)) {
    actions.push({
      type: "create_agent",
      title: "Demo subagent",
      role: "researcher",
      skill: "research",
      prompt: String(message || "").slice(0, 500),
      deliverable: "A focused demo result for the controller.",
      successCriteria: "Specific, bounded, and actionable.",
      priority: "medium"
    });
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

function normalizeDeepThinkActions(value) {
  return normalizeVoiceActions(value).slice(0, MAX_DEEP_RESEARCH_CANVAS_CARDS);
}

async function callAnalysisCompletion(payload, options = {}) {
  try {
    return await chatCompletions(runtimeConfigs.analysis, payload, options);
  } catch (error) {
    if (!payload?.response_format || !/response_format|json_object|unsupported|invalid/i.test(String(error?.message || ""))) {
      throw error;
    }
    const fallbackPayload = { ...payload };
    delete fallbackPayload.response_format;
    return chatCompletions(runtimeConfigs.analysis, fallbackPayload, options);
  }
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
  return dedupeTextParts([
    normalizeReasoningPart(message.reasoning_content, "reasoning"),
    normalizeReasoningPart(message.reasoningContent, "reasoning"),
    normalizeReasoningPart(message.thinking_content, "thinking"),
    normalizeReasoningPart(message.thinkingContent, "thinking"),
    normalizeReasoningPart(message.reasoning, "reasoning"),
    normalizeReasoningPart(message.thinking, "thinking"),
    normalizeReasoningPart(message.thoughts, "thinking"),
    normalizeReasoningPart(response?.reasoning_content, "reasoning"),
    normalizeReasoningPart(response?.reasoning, "reasoning")
  ]);
}

function normalizeReasoningPart(value, contextType = "") {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) {
    return value
      .map((part) => normalizeReasoningPart(part, contextType))
      .filter(Boolean)
      .join("\n");
  }
  if (typeof value !== "object") return "";

  const type = String(value.type || value.kind || contextType || "");
  const isReasoningTyped = /reasoning|thinking/i.test(type);
  const explicit = value.reasoning_content ?? value.reasoningContent ?? value.thinking_content ?? value.thinkingContent;
  if (typeof explicit === "string") return explicit.trim();
  if (explicit) return normalizeReasoningPart(explicit, "reasoning");

  if (isReasoningTyped) {
    const text = value.text ?? value.content ?? value.summary ?? value.reasoning ?? value.thinking;
    if (typeof text === "string") return text.trim();
    if (Array.isArray(text)) return normalizeReasoningPart(text, type);
  }

  return "";
}

function extensionFromContentType(contentType) {
  const normalized = String(contentType).split(";")[0].trim().toLowerCase();
  return {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/svg+xml": "svg",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
    "video/x-m4v": "m4v",
    "video/ogg": "ogv"
  }[normalized] || "";
}

function mimeTypeFromExtension(ext) {
  const normalized = String(ext || "").replace(/^\./, "").toLowerCase();
  return {
    mp4: "video/mp4",
    webm: "video/webm",
    mov: "video/quicktime",
    m4v: "video/x-m4v",
    ogv: "video/ogg",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
    svg: "image/svg+xml"
  }[normalized] || "";
}

function extensionFromUrl(url) {
  try {
    const ext = path.extname(new URL(url).pathname).replace(/^\./, "").toLowerCase();
    if (["jpg", "jpeg", "png", "webp", "gif", "svg", "mp4", "webm", "mov", "m4v", "ogv"].includes(ext)) {
      return ext === "jpeg" ? "jpg" : ext;
    }
  } catch {
  }
  return "";
}

function publicHttpUrl(value) {
  const raw = String(value || "").trim();
  if (!/^https?:\/\//i.test(raw)) return "";
  try {
    const parsed = new URL(raw);
    const host = parsed.hostname.toLowerCase();
    if (host === "localhost" || host === "0.0.0.0" || host === "::1" || host.endsWith(".local")) return "";
    if (/^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host)) return "";
    const private172 = /^172\.(1[6-9]|2\d|3[0-1])\./.test(host);
    if (private172) return "";
    return raw;
  } catch {
    return "";
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseJsonFromText(text) {
  const raw = String(text || "").trim();
  if (!raw) {
    throw new Error("The analysis model returned empty text.");
  }

  for (const candidate of jsonTextCandidates(raw)) {
    const parsed = tryParseJsonCandidate(candidate);
    if (parsed !== undefined) return parsed;
  }
  throw new Error("Could not parse analysis JSON from model output.");
}

function jsonTextCandidates(text) {
  const normalized = String(text || "").replace(/^\uFEFF/, "").trim();
  const candidates = [normalized];
  const fencePattern = /```(?:json)?\s*([\s\S]*?)```/gi;
  let fence;
  while ((fence = fencePattern.exec(normalized))) {
    candidates.push(fence[1]);
  }
  candidates.push(...extractBalancedJsonSubstrings(normalized));
  const first = normalized.indexOf("{");
  const last = normalized.lastIndexOf("}");
  if (first >= 0 && last > first) candidates.push(normalized.slice(first, last + 1));
  return Array.from(new Set(candidates.map((item) => String(item || "").trim()).filter(Boolean)));
}

function tryParseJsonCandidate(candidate) {
  const cleaned = cleanJsonCandidate(candidate);
  const variants = [String(candidate || "").trim(), cleaned];
  for (const variant of variants) {
    if (!variant) continue;
    try {
      return JSON.parse(variant);
    } catch {
    }
  }
  return undefined;
}

function cleanJsonCandidate(candidate) {
  return String(candidate || "")
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .replace(/[\u201C\u201D]/g, "\"")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/,\s*([}\]])/g, "$1")
    .trim();
}

function extractBalancedJsonSubstrings(text) {
  const results = [];
  let start = -1;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let index = 0; index < text.length; index += 1) {
    const ch = text[index];
    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === "\\") {
        escape = true;
      } else if (ch === "\"") {
        inString = false;
      }
      continue;
    }
    if (ch === "\"") {
      inString = true;
      continue;
    }
    if (ch === "{") {
      if (depth === 0) start = index;
      depth += 1;
    } else if (ch === "}" && depth > 0) {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        results.push(text.slice(start, index + 1));
        start = -1;
      }
    }
  }
  return results;
}

async function parseAnalysisResponseJson(response, { lang = "zh", includeReferences = false, timeoutMs = 30000 } = {}) {
  const text = collectChatContent(response);
  try {
    return { parsed: parseJsonFromText(text), repaired: false, rawText: text };
  } catch (parseError) {
    const repairedText = await repairAnalysisJsonText(text, { lang, includeReferences, timeoutMs });
    try {
      return { parsed: parseJsonFromText(repairedText), repaired: true, rawText: text };
    } catch (repairError) {
      repairError.message = repairError.message + "; initial parse failed: " + parseError.message;
      throw repairError;
    }
  }
}

async function repairAnalysisJsonText(text, { lang = "zh", includeReferences = false, timeoutMs = 30000 } = {}) {
  const isEn = lang === "en";
  const schema = includeReferences
    ? '{"title":"...","summary":"...","detectedSubjects":["..."],"moodKeywords":["..."],"options":[{"id":"...","title":"...","description":"...","prompt":"...","tone":"...","layoutHint":"...","purpose":"visual|exploration|plan|research|content|tool","nodeType":"image|note|plan|todo|weather|map|link|code|table|timeline|comparison|metric|quote","content":{}}],"references":[{"title":"...","url":"https://example.com","description":"...","type":"web|doc|image"}]}'
    : '{"title":"...","summary":"...","detectedSubjects":["..."],"moodKeywords":["..."],"options":[{"id":"...","title":"...","description":"...","prompt":"...","tone":"...","layoutHint":"...","purpose":"visual|exploration|plan|research|content|tool","nodeType":"image|note|plan|todo|weather|map|link|code|table|timeline|comparison|metric|quote","content":{}}]}';
  const payload = {
    max_tokens: includeReferences ? 8192 : 6144,
    temperature: 0,
    messages: [
      {
        role: "system",
        content: "Repair malformed analysis output into one valid JSON object. Preserve the original meaning and concrete observations. Return JSON only."
      },
      {
        role: "user",
        content: "Required schema:\n" + schema + "\n\nMalformed model output:\n" + String(text || "").slice(0, 24000)
      }
    ]
  };
  applyReasoningMode(payload, runtimeConfigs.analysis, "no-thinking");
  applyAnalysisJsonObjectResponseMode(payload);
  const response = await callAnalysisCompletion(payload, { timeoutMs });
  return collectChatContent(response);
}

function normalizeAnalysis(value, fileName = "source image", fallbackOverride = null) {
  const fallback = fallbackOverride || buildDemoAnalysis(fileName);
  const options = ensureOptionRange(
    Array.isArray(value?.options) ? value.options : fallback.options,
    fallback.options,
    ANALYSIS_CANVAS_CARD_MIN,
    ANALYSIS_CANVAS_CARD_MAX
  );

  return {
    provider: "api",
    title: stringOr(value?.title, fallback.title),
    summary: stringOr(value?.summary, fallback.summary),
    detectedSubjects: arrayOfStrings(value?.detectedSubjects, fallback.detectedSubjects).slice(0, 6),
    moodKeywords: arrayOfStrings(value?.moodKeywords, fallback.moodKeywords).slice(0, 8),
    options: options.slice(0, ANALYSIS_CANVAS_CARD_MAX).map((option, index) => ({
      id: slug(option?.id || option?.title || `option-${index + 1}`),
      title: stringOr(option?.title, fallback.options[index % fallback.options.length].title).slice(0, 20),
      description: stringOr(option?.description, fallback.options[index % fallback.options.length].description),
      prompt: stringOr(option?.prompt, fallback.options[index % fallback.options.length].prompt),
      tone: stringOr(option?.tone, fallback.options[index % fallback.options.length].tone),
      layoutHint: stringOr(option?.layoutHint, fallback.options[index % fallback.options.length].layoutHint),
      purpose: normalizeAnalysisPurpose(option?.purpose),
      nodeType: normalizeAnalysisNodeType(option?.nodeType),
      content: normalizeStructuredContent(option?.content)
    }))
  };
}

function normalizeExplore(value, fileName = "source image", fallbackOverride = null) {
  const fallback = fallbackOverride || buildDemoExplore(fileName);
  const options = ensureOptionRange(
    Array.isArray(value?.options) ? value.options : fallback.options,
    fallback.options,
    EXPLORE_CANVAS_CARD_MIN,
    EXPLORE_CANVAS_CARD_MAX
  );
  const references = Array.isArray(value?.references) ? value.references : fallback.references;

  return {
    provider: "api",
    title: stringOr(value?.title, fallback.title),
    summary: stringOr(value?.summary, fallback.summary),
    detectedSubjects: arrayOfStrings(value?.detectedSubjects, fallback.detectedSubjects).slice(0, 6),
    moodKeywords: arrayOfStrings(value?.moodKeywords, fallback.moodKeywords).slice(0, 8),
    options: options.slice(0, EXPLORE_CANVAS_CARD_MAX).map((option, index) => ({
      id: slug(option?.id || option?.title || `option-${index + 1}`),
      title: stringOr(option?.title, fallback.options[index % fallback.options.length].title).slice(0, 20),
      description: stringOr(option?.description, fallback.options[index % fallback.options.length].description),
      prompt: stringOr(option?.prompt, fallback.options[index % fallback.options.length].prompt),
      tone: stringOr(option?.tone, fallback.options[index % fallback.options.length].tone),
      layoutHint: stringOr(option?.layoutHint, fallback.options[index % fallback.options.length].layoutHint),
      purpose: normalizeAnalysisPurpose(option?.purpose),
      nodeType: normalizeAnalysisNodeType(option?.nodeType),
      content: normalizeStructuredContent(option?.content)
    })),
    references: references.slice(0, EXPLORE_CANVAS_CARD_MAX).map((ref, index) => {
      const fallbackRef = fallback.references?.[index % fallback.references.length] || {};
      return {
      title: stringOr(ref?.title, fallbackRef.title || "参考资料").slice(0, 80),
      url: stringOr(ref?.url, fallbackRef.url || "").slice(0, 512),
      description: stringOr(ref?.description, fallbackRef.description || "").slice(0, 200),
      type: ["web", "doc", "image"].includes(ref?.type) ? ref.type : "web"
      };
    })
  };
}

function ensureOptionRange(options, fallbackOptions, min, max) {
  const normalized = (Array.isArray(options) ? options : [])
    .filter((option) => option && typeof option === "object")
    .slice(0, max);
  const seen = new Set(normalized.map((option) => slug(option?.id || option?.title || option?.prompt || "")));
  for (const fallback of Array.isArray(fallbackOptions) ? fallbackOptions : []) {
    if (normalized.length >= min || normalized.length >= max) break;
    const key = slug(fallback?.id || fallback?.title || fallback?.prompt || "");
    if (key && seen.has(key)) continue;
    normalized.push(fallback);
    if (key) seen.add(key);
  }
  return normalized.slice(0, max);
}

const ANALYSIS_PURPOSES = new Set(["visual", "exploration", "plan", "research", "content", "tool"]);
const ANALYSIS_NODE_TYPES = new Set(["image", "note", "plan", "todo", "weather", "map", "link", "code", "table", "timeline", "comparison", "metric", "quote"]);

function normalizeAnalysisPurpose(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return ANALYSIS_PURPOSES.has(normalized) ? normalized : undefined;
}

function normalizeAnalysisNodeType(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return ANALYSIS_NODE_TYPES.has(normalized) ? normalized : undefined;
}

function normalizeStructuredContent(value, depth = 0) {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed.slice(0, 4000) : undefined;
  }
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (depth >= 5) return undefined;
  if (Array.isArray(value)) {
    const items = value
      .slice(0, 40)
      .map((item) => normalizeStructuredContent(item, depth + 1))
      .filter((item) => item !== undefined);
    return items.length ? items : undefined;
  }
  if (typeof value === "object") {
    const out = {};
    for (const [key, item] of Object.entries(value).slice(0, 60)) {
      const safeKey = String(key || "").trim().slice(0, 80);
      if (!safeKey) continue;
      const normalized = normalizeStructuredContent(item, depth + 1);
      if (normalized !== undefined) out[safeKey] = normalized;
    }
    return Object.keys(out).length ? out : undefined;
  }
  return undefined;
}

function normalizeDeepThinkPlan(value, prompt, lang) {
  const fallback = buildDemoDeepThinkPlan(prompt, lang, runtimeConfigs.deepthink.model);
  const cards = Array.isArray(value?.cards) ? value.cards : fallback.cards;
  const links = Array.isArray(value?.links) ? value.links : fallback.links;
  const allowedTypes = new Set(["direction", "web", "image", "file", "api", "note", "plan", "todo", "weather", "map", "link", "code", "table", "timeline", "comparison", "metric", "quote"]);

  return {
    reply: stringOr(value?.reply, fallback.reply),
    cards: cards.slice(0, MAX_DEEP_RESEARCH_CANVAS_CARDS).map((card, index) => {
      const type = allowedTypes.has(card?.type) ? card.type : "note";
      const title = stringOr(card?.title, fallback.cards[index % fallback.cards.length].title).slice(0, 48);
      const summary = stringOr(card?.summary || card?.description, fallback.cards[index % fallback.cards.length].summary).slice(0, 240);
      return {
        id: slug(card?.id || `${type}-${title}-${index + 1}`),
        type,
        nodeType: normalizeAnalysisNodeType(card?.nodeType),
        title,
        summary,
        prompt: stringOr(card?.prompt, summary).slice(0, 1200),
        query: stringOr(card?.query, "").slice(0, 240),
        url: stringOr(card?.url, "").slice(0, 512),
        content: normalizeStructuredContent(card?.content)
      };
    }),
    links: links.slice(0, MAX_DEEP_RESEARCH_CANVAS_CARDS).map((link) => ({
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

function normalizeBlueprintPayload(blueprint) {
  if (!blueprint || typeof blueprint !== "object") return null;
  const referenceStrength = cleanOptionalNumber(blueprint.referenceStrength, 0.1, 1) ?? 0.7;
  const cards = Array.isArray(blueprint.cards)
    ? blueprint.cards.slice(0, 8).map((card) => ({
        id: cleanString(card?.id, 80),
        title: cleanString(card?.title, 120),
        summary: cleanString(card?.summary, 500)
      })).filter((card) => card.id || card.title)
    : [];
  const relationships = Array.isArray(blueprint.relationships)
    ? blueprint.relationships.slice(0, 20).map((relationship) => ({
        from: cleanString(relationship?.from, 80),
        to: cleanString(relationship?.to, 80),
        type: ["upstream", "downstream", "parallel"].includes(relationship?.type) ? relationship.type : "parallel",
        note: cleanString(relationship?.note, 1000)
      })).filter((relationship) => relationship.from && relationship.to)
    : [];
  const overallDescription = cleanString(blueprint.overallDescription, 2000);
  if (!cards.length && !relationships.length && !overallDescription) return null;
  return {
    junctionId: cleanString(blueprint.junctionId, 80),
    referenceStrength: Math.round(referenceStrength * 10) / 10,
    overallDescription,
    cards,
    relationships
  };
}

function normalizeGenerateChatContext(messages) {
  if (!Array.isArray(messages)) return [];
  return messages.slice(-8).map((message) => ({
    role: message?.role === "assistant" ? "assistant" : "user",
    content: cleanString(message?.content, 1200)
  })).filter((message) => message.content);
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
      ? value.options.slice(0, ANALYSIS_CANVAS_CARD_MAX).map((option) => ({
          title: stringOr(option?.title, "生成方向"),
          description: stringOr(option?.description, ""),
          tone: stringOr(option?.tone, ""),
          layoutHint: stringOr(option?.layoutHint, ""),
          purpose: normalizeAnalysisPurpose(option?.purpose),
          nodeType: normalizeAnalysisNodeType(option?.nodeType)
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

function buildFollowupResponse(message, analysis) {
  if (/生成|出图|图片|画/.test(message)) {
    const best = analysis.options?.[0];
    return `可以继续走「${best?.title || "视觉方向"}」。我会把它转成更明确的生成提示词，并建议你先做 2-3 个风格变体。`;
  }
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

function buildDocumentFallbackAnalysis({ fileName = "document", text = "", lang = "zh", warning = "", model = "", taskType = "research" } = {}) {
  const isEn = lang === "en";
  const name = fileName || (isEn ? "document" : "文档");
  const baseTitle = name.replace(/\.[^.]+$/, "") || name;
  const cleaned = compactDocumentText(text);
  const excerpt = cleaned.slice(0, isEn ? 700 : 520);
  const keywords = documentFallbackKeywords(cleaned, isEn);
  const subjects = keywords.length ? keywords : [isEn ? "document theme" : "文档主题", isEn ? "key points" : "关键要点"];
  const summary = isEn
    ? `Parsed ${name} locally and extracted document-based directions from its readable text.`
    : `已基于 ${name} 的可读文本生成文档分析方向。`;
  const keyPointText = excerpt || (isEn ? "No detailed excerpt was available." : "未提取到更长的正文节选。");
  return {
    provider: "fallback",
    model,
    taskType,
    warningCode: "analysis_fallback",
    warning,
    title: isEn ? `${baseTitle} document analysis` : `${baseTitle} 文档分析`,
    summary,
    detectedSubjects: subjects.slice(0, 6),
    moodKeywords: keywords.slice(0, 8),
    options: [
      {
        id: "document-summary",
        title: isEn ? "Document Summary" : "文档摘要",
        description: isEn ? "Create a reusable summary card grounded in the extracted document text." : "基于已提取正文生成可复用摘要卡。",
        prompt: isEn ? `Summarize ${name} with key conclusions, evidence, and follow-up questions.` : `总结 ${name} 的核心结论、依据和后续问题。`,
        tone: "research",
        layoutHint: "board",
        purpose: "content",
        nodeType: "note",
        content: { text: keyPointText }
      },
      {
        id: "key-points-table",
        title: isEn ? "Key Points" : "要点表格",
        description: isEn ? "Turn the document into a table of themes, evidence, and implications." : "把文档整理成主题、依据和启示表格。",
        prompt: isEn ? `Extract the main themes, supporting evidence, and implications from ${name}.` : `从 ${name} 中提取主要主题、支撑依据和启示。`,
        tone: "research",
        layoutHint: "board",
        purpose: "research",
        nodeType: "table",
        content: {
          columns: isEn ? ["Theme", "Evidence", "Implication"] : ["主题", "依据", "启示"],
          rows: documentFallbackRows(keywords, excerpt, isEn)
        }
      },
      {
        id: "followup-research",
        title: isEn ? "Follow-up Research" : "后续研究",
        description: isEn ? "List what should be verified, expanded, or compared next." : "列出下一步需要核实、扩展或对比的内容。",
        prompt: isEn ? `Design follow-up research questions based on ${name}.` : `基于 ${name} 设计后续研究问题。`,
        tone: "research",
        layoutHint: "board",
        purpose: "research",
        nodeType: "note",
        content: { text: documentFallbackResearchText(keywords, isEn) }
      },
      {
        id: "execution-plan",
        title: isEn ? "Action Plan" : "行动计划",
        description: isEn ? "Convert the document into concrete next steps." : "把文档内容转成可执行的下一步。",
        prompt: isEn ? `Create an execution plan from the useful findings in ${name}.` : `根据 ${name} 中的有效信息制定执行计划。`,
        tone: "plan",
        layoutHint: "board",
        purpose: "plan",
        nodeType: "plan",
        content: {
          summary: isEn ? `Plan derived from ${name}` : `基于 ${name} 的执行计划`,
          steps: documentFallbackSteps(isEn)
        }
      },
      {
        id: "presentation-outline",
        title: isEn ? "Report Outline" : "汇报提纲",
        description: isEn ? "Reframe the document into an outline suitable for sharing or presentation." : "把文档改写成适合分享或汇报的结构。",
        prompt: isEn ? `Build a presentation/report outline from ${name}.` : `基于 ${name} 生成汇报或报告提纲。`,
        tone: "editorial",
        layoutHint: "board",
        purpose: "content",
        nodeType: "timeline",
        content: {
          items: documentFallbackOutline(keywords, isEn)
        }
      }
    ]
  };
}

function buildDocumentFallbackExplore({ fileName = "document", text = "", lang = "zh", warning = "", model = "", taskType = "research" } = {}) {
  const base = buildDocumentFallbackAnalysis({ fileName, text, lang, warning, model, taskType });
  const isEn = lang === "en";
  return {
    ...base,
    warningCode: "explore_fallback",
    title: isEn ? `${fileName.replace(/\.[^.]+$/, "") || "Document"} exploration` : `${fileName.replace(/\.[^.]+$/, "") || "文档"} 深度探索`,
    summary: isEn ? `${base.summary} Added exploration, comparison, and reference-gathering directions.` : `${base.summary} 已补充探索、对比和资料收集方向。`,
    options: [
      ...base.options,
      {
        id: "comparison-angle",
        title: isEn ? "Compare Angles" : "对比视角",
        description: isEn ? "Compare the document's claims or themes across alternative viewpoints." : "从不同视角对比文档中的观点或主题。",
        prompt: isEn ? `Compare the main claims in ${fileName} with alternative perspectives and identify tensions.` : `对比 ${fileName} 中的主要观点与其他可能视角，识别分歧和张力。`,
        tone: "comparison",
        layoutHint: "board",
        purpose: "research",
        nodeType: "comparison",
        content: {
          criteria: isEn ? ["Evidence", "Risk", "Opportunity"] : ["证据", "风险", "机会"],
          items: [
            { title: isEn ? "Original document" : "原文观点", summary: base.summary },
            { title: isEn ? "Further verification" : "待核实方向", summary: isEn ? "Check assumptions, missing data, and comparable cases." : "核实假设、缺失数据和可对比案例。" }
          ]
        }
      }
    ],
    references: []
  };
}

function compactDocumentText(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function documentFallbackKeywords(text, isEn = false) {
  const value = compactDocumentText(text).toLowerCase();
  const terms = isEn
    ? (value.match(/[a-z][a-z0-9-]{3,}/g) || [])
    : (value.match(/[\u4e00-\u9fff]{2,6}|[a-z][a-z0-9-]{3,}/g) || []);
  const stops = new Set(isEn
    ? ["this", "that", "with", "from", "have", "will", "would", "should", "document", "content", "analysis"]
    : ["这个", "进行", "通过", "根据", "需要", "可以", "以及", "内容", "文档", "分析", "研究", "文件"]);
  const counts = new Map();
  for (const term of terms) {
    if (stops.has(term) || term.length < 2) continue;
    counts.set(term, (counts.get(term) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([term]) => term).slice(0, 8);
}

function documentFallbackRows(keywords, excerpt, isEn = false) {
  const items = keywords.length ? keywords.slice(0, 4) : (isEn ? ["Core theme", "Evidence", "Next step"] : ["核心主题", "支撑依据", "下一步"]);
  return items.map((item, index) => ({
    [isEn ? "Theme" : "主题"]: item,
    [isEn ? "Evidence" : "依据"]: index === 0 ? excerpt.slice(0, isEn ? 180 : 120) : (isEn ? "Derived from extracted document text." : "来自已提取文档正文。"),
    [isEn ? "Implication" : "启示"]: isEn ? "Needs review, synthesis, or follow-up action." : "可继续复核、整理或转成行动。"
  }));
}

function documentFallbackResearchText(keywords, isEn = false) {
  const focus = keywords.length ? keywords.join(isEn ? ", " : "、") : (isEn ? "the document's key themes" : "文档核心主题");
  return isEn
    ? `Follow-up research should verify ${focus}, compare it with external references, identify missing evidence, and turn the strongest findings into reusable canvas cards.`
    : `后续研究应围绕 ${focus} 展开：核实关键事实，补充外部资料，对比相似案例，并把最有价值的发现整理成可复用画布卡片。`;
}

function documentFallbackSteps(isEn = false) {
  return isEn
    ? [
        { title: "Review extracted text", description: "Confirm the parser captured the important parts of the document." },
        { title: "Group key themes", description: "Cluster repeated topics, claims, data points, and open questions." },
        { title: "Create deliverables", description: "Turn the strongest themes into summary, plan, table, or research cards." }
      ]
    : [
        { title: "核对提取文本", description: "确认解析器捕获了文档中的重要内容。" },
        { title: "归纳关键主题", description: "聚类反复出现的主题、观点、数据点和开放问题。" },
        { title: "生成交付卡片", description: "把最有价值的主题转成摘要、计划、表格或研究卡片。" }
      ];
}

function documentFallbackOutline(keywords, isEn = false) {
  const topics = keywords.length ? keywords.slice(0, 4) : (isEn ? ["Context", "Findings", "Actions"] : ["背景", "发现", "行动"]);
  return topics.map((topic, index) => ({
    title: topic,
    description: isEn ? `Section ${index + 1}: explain ${topic} with evidence and next steps.` : `第 ${index + 1} 部分：围绕「${topic}」补充依据和下一步。`
  }));
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
        layoutHint: "board",
        purpose: "visual",
        nodeType: "image"
      },
      {
        id: "editorial-poster",
        title: "杂志海报",
        description: "保留原图最强的视觉记忆点，重组成一张留白克制的编辑海报，适合做封面或视觉提案。",
        prompt: "将参考图转化为高端杂志编辑海报，保留主要主体轮廓和关键色彩，使用克制排版、自然颗粒、柔和阴影和精致留白，不要出现可读文字。",
        tone: "editorial",
        layoutHint: "portrait",
        purpose: "visual",
        nodeType: "image"
      },
      {
        id: "cinematic-still",
        title: "电影剧照",
        description: "把当前图片延展为一帧电影镜头，强调空间、灯光和情绪，让画面像故事中的关键一秒。",
        prompt: "基于参考图生成电影剧照风格图像，保留主体和场景关系，加入自然镜头景深、环境光、微妙雾气和叙事张力，真实摄影，35mm film still。",
        tone: "cinematic",
        layoutHint: "landscape",
        purpose: "visual",
        nodeType: "image"
      },
      {
        id: "surreal-memory",
        title: "梦境记忆",
        description: "将原图中的物体和氛围抽离成梦境化场景，画面更诗性，像记忆被重新拼贴。",
        prompt: "把参考图转化为超现实梦境场景，保留核心主体但让背景、光影和比例产生诗性变化，细腻材质，柔和边缘，安静而神秘。",
        tone: "surreal",
        layoutHint: "square",
        purpose: "visual",
        nodeType: "image"
      },
      {
        id: "product-system",
        title: "视觉系统",
        description: "把原图拆成一套视觉资产：主图、色卡、材质片段和构图小样，适合继续做品牌或概念板。",
        prompt: "基于参考图生成一张视觉系统概念板，包含主视觉、局部材质切片、色彩样本、构图缩略图和整洁网格，现代设计工作室风格，不要出现真实文字。",
        tone: "graphic",
        layoutHint: "board",
        purpose: "visual",
        nodeType: "image"
      },
      {
        id: "research-brief",
        title: "背景线索",
        description: "把原始素材转成一张研究简报，整理主体来源、可能语境、风格参照和下一步需要核实的问题。",
        prompt: "围绕当前素材建立研究简报：主体可能语境、风格参照、关键观察、需要核实的问题和可继续探索的资料方向。",
        tone: "research",
        layoutHint: "board",
        purpose: "research",
        nodeType: "note",
        content: {
          text: "整理当前素材的背景线索、风格参照、关键观察和后续核实问题。"
        }
      },
      {
        id: "execution-plan",
        title: "执行计划",
        description: "把素材延展成可执行的小项目计划：目标、阶段、素材准备、生成/编辑步骤和验收标准。",
        prompt: "基于当前素材制定一个可执行的视觉探索计划，包含目标、阶段、素材准备、生成与编辑步骤、验收标准。",
        tone: "plan",
        layoutHint: "board",
        purpose: "plan",
        nodeType: "plan",
        content: {
          summary: "把当前素材继续做成可执行项目。",
          steps: [
            { title: "明确目标", description: "确定这组卡片最终要服务于海报、提案、研究、故事板还是视觉系统。" },
            { title: "补充素材", description: "列出需要继续收集的参考、色彩、构图和文字信息。" },
            { title: "生成与筛选", description: "按方向生成候选图或富内容卡，并用统一标准筛掉弱分支。" }
          ]
        }
      },
      {
        id: "comparison-matrix",
        title: "方向对比",
        description: "用对比矩阵评估各个方向的视觉冲击、执行难度、信息价值和后续扩展空间。",
        prompt: "为当前素材的多个探索方向建立对比矩阵，比较视觉冲击、执行难度、信息价值和扩展空间。",
        tone: "comparison",
        layoutHint: "board",
        purpose: "content",
        nodeType: "comparison",
        content: {
          items: [
            { title: "视觉方向", summary: "适合需要强画面记忆点的输出。" },
            { title: "研究方向", summary: "适合需要证据、背景和来源支撑的输出。" },
            { title: "计划方向", summary: "适合把素材推进成项目或交付流程。" }
          ]
        }
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

function normalizeDataUrl(value) {
  if (typeof value !== "string") return null;
  if (!/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(value) && !/^data:image\/svg\+xml(?:;[^,]*)?,/i.test(value)) {
    return null;
  }
  return value;
}

function normalizeImageDataUrls(value, first = "") {
  const raw = Array.isArray(value) ? value : (value ? [value] : []);
  const urls = [];
  const seen = new Set();
  for (const item of [first, ...raw]) {
    const dataUrl = normalizeDataUrl(item);
    if (!dataUrl) continue;
    const key = dataUrlDedupeKey(dataUrl);
    if (seen.has(key)) continue;
    seen.add(key);
    urls.push(dataUrl);
    if (urls.length >= CHAT_IMAGE_INPUT_MAX_COUNT) break;
  }
  return urls;
}

function dataUrlDedupeKey(value) {
  const text = String(value || "");
  if (!text) return "";
  if (text.length <= 4096) return `${text.length}:${text}`;
  const chunkSize = 768;
  const starts = [
    0,
    Math.max(0, Math.floor(text.length * 0.25) - Math.floor(chunkSize / 2)),
    Math.max(0, Math.floor(text.length * 0.5) - Math.floor(chunkSize / 2)),
    Math.max(0, Math.floor(text.length * 0.75) - Math.floor(chunkSize / 2)),
    Math.max(0, text.length - chunkSize)
  ];
  let hash = 2166136261;
  for (const start of starts) {
    const end = Math.min(text.length, start + chunkSize);
    for (let index = start; index < end; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
  }
  return `${text.length}:${(hash >>> 0).toString(36)}:${text.slice(0, 64)}:${text.slice(-64)}`;
}

function normalizeVideoDataUrl(value) {
  if (typeof value !== "string") return null;
  if (!/^data:video\/[a-z0-9.+-]+(?:;[^,]*)?;base64,[a-zA-Z0-9+/=]+$/i.test(value)) {
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
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.ms-powerpoint": "ppt",
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
    "audio/l16": "pcm",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
    "video/x-m4v": "m4v",
    "video/ogg": "ogv"
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
