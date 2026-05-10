const PIPELINE_STAGE_LIMIT = 14;
const PIPELINE_ACTION_TYPE_LIMIT = 24;
const PIPELINE_REJECTION_LIMIT = 10;
const TRACE_SNIPPET_LIMIT = 240;
export const CANVAS_ACTION_TRACE_VERSION = 1;

export function compactPipelineActionTypes(actions = []) {
  return (Array.isArray(actions) ? actions : [])
    .map((action) => action?.type || action?.name || "")
    .filter(Boolean)
    .slice(0, PIPELINE_ACTION_TYPE_LIMIT);
}

export function recordActionPipelineStage(stages, name, inputActions, outputActions, extra = {}) {
  if (!Array.isArray(stages)) return;
  const input = Array.isArray(inputActions) ? inputActions : [];
  const output = Array.isArray(outputActions) ? outputActions : [];
  stages.push({
    name,
    inputCount: input.length,
    outputCount: output.length,
    actionTypes: compactPipelineActionTypes(output),
    ...extra
  });
}

export function policyRejectedSince(policyTraces = [], startIndex = 0) {
  return policyTraces
    .slice(startIndex)
    .flatMap((trace) => trace?.rejected || [])
    .map((item) => ({ type: item.type, reason: item.reason, group: item.group || "" }))
    .slice(0, PIPELINE_REJECTION_LIMIT);
}

export function attachActionPipelineTrace(actionPolicy, stages = []) {
  if (!actionPolicy && !stages.length) return actionPolicy;
  return {
    ...(actionPolicy || {}),
    stages: stages.slice(0, PIPELINE_STAGE_LIMIT)
  };
}

function snippet(value, limit = TRACE_SNIPPET_LIMIT) {
  return String(value || "").normalize("NFKC").replace(/\s+/g, " ").trim().slice(0, limit);
}

function stableHash(value) {
  const text = String(value || "");
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function compactStage(stage = {}) {
  return {
    name: String(stage.name || ""),
    inputCount: Number(stage.inputCount) || 0,
    outputCount: Number(stage.outputCount) || 0,
    actionTypes: Array.isArray(stage.actionTypes) ? stage.actionTypes.slice(0, PIPELINE_ACTION_TYPE_LIMIT) : [],
    rejected: Array.isArray(stage.rejected) ? stage.rejected.slice(0, PIPELINE_REJECTION_LIMIT) : []
  };
}

function compactFrontendResult(result = {}) {
  return {
    type: String(result.type || ""),
    success: result.success !== false,
    nodeId: String(result.nodeId || "").slice(0, 96),
    nodeIds: Array.isArray(result.nodeIds) ? result.nodeIds.map((id) => String(id || "").slice(0, 96)).filter(Boolean).slice(0, 24) : [],
    title: String(result.title || "").slice(0, 120),
    error: String(result.error || "").slice(0, 240),
    errorCode: String(result.errorCode || "").slice(0, 80)
  };
}

function compactIntent(actionPolicy = {}, policyTraces = []) {
  const first = policyTraces.find((trace) => trace && typeof trace === "object") || {};
  return {
    taskType: actionPolicy.taskType || first.taskType || "",
    confidence: actionPolicy.confidence ?? first.confidence,
    automaticCardMode: Boolean(actionPolicy.automaticCardMode ?? first.automaticCardMode),
    allowCanvasTool: actionPolicy.allowCanvasTool ?? first.allowCanvasTool,
    allowedActionTypes: Array.isArray(actionPolicy.allowedActionTypes)
      ? actionPolicy.allowedActionTypes.slice(0, PIPELINE_ACTION_TYPE_LIMIT)
      : (Array.isArray(first.allowedActionTypes) ? first.allowedActionTypes.slice(0, PIPELINE_ACTION_TYPE_LIMIT) : []),
    maxActions: actionPolicy.maxActions ?? first.maxActions
  };
}

export function buildCanvasActionTrace({
  traceId = "",
  sessionId = "",
  messageId = "",
  model = "",
  provider = "",
  thinkingMode = "no-thinking",
  message = "",
  reply = "",
  rawActions = [],
  toolActions = null,
  inlineActions = [],
  thinkingMentionedActionTypes = [],
  actionPolicy = {},
  policyTraces = [],
  stages = [],
  finalActions = [],
  frontendResults = []
} = {}) {
  const rawToolActionTypes = compactPipelineActionTypes(Array.isArray(toolActions) ? toolActions : rawActions);
  const finalActionTypes = compactPipelineActionTypes(finalActions);
  const identity = [
    sessionId,
    messageId,
    model,
    thinkingMode,
    snippet(message),
    rawToolActionTypes.join(","),
    finalActionTypes.join(",")
  ].join("|");
  return {
    version: CANVAS_ACTION_TRACE_VERSION,
    traceId: traceId || `cat_${stableHash(identity)}`,
    sessionId: String(sessionId || ""),
    messageId: String(messageId || ""),
    model: String(model || ""),
    provider: String(provider || ""),
    thinkingMode,
    intent: compactIntent(actionPolicy, policyTraces),
    modelOutput: {
      rawToolActionTypes,
      inlineActionTypes: compactPipelineActionTypes(inlineActions),
      thinkingMentionedActionTypes: Array.isArray(thinkingMentionedActionTypes)
        ? thinkingMentionedActionTypes.map((type) => String(type || "")).filter(Boolean).slice(0, PIPELINE_ACTION_TYPE_LIMIT)
        : []
    },
    pipelineStages: stages.map(compactStage).slice(0, PIPELINE_STAGE_LIMIT),
    finalActionTypes,
    frontendResults: (Array.isArray(frontendResults) ? frontendResults : []).map(compactFrontendResult).slice(0, 32),
    snippets: {
      message: snippet(message),
      reply: snippet(reply)
    }
  };
}

function identityActions(actions) {
  return Array.isArray(actions) ? actions : [];
}

function applyPolicyPipelineStage(actions, message, policyContext, stages, name, dependencies) {
  const beforeTraceCount = Array.isArray(policyContext.policyTraces) ? policyContext.policyTraces.length : 0;
  const filtered = dependencies.applyPolicy
    ? dependencies.applyPolicy({ actions, message, context: policyContext, stage: name })
    : actions;
  recordActionPipelineStage(stages, name, actions, filtered, {
    rejected: policyRejectedSince(policyContext.policyTraces || [], beforeTraceCount)
  });
  return filtered;
}

export function finalizeCanvasActions({
  rawActions = [],
  message = "",
  reply = "",
  response = null,
  lang = "zh",
  thinkingMode = "no-thinking",
  agentMode = false,
  selectedContext = null,
  canvas = {},
  analysis = {},
  webSearchEnabled = false,
  maxActions = 8,
  traceId = "",
  sessionId = "",
  messageId = "",
  model = "",
  provider = "",
  inlineActions = [],
  toolActions = null,
  thinkingMentionedActionTypes = [],
  frontendResults = [],
  dependencies = {}
} = {}) {
  const policyTraces = [];
  const stages = [];
  const policyContext = { agentMode, selectedContext, canvas, analysis, thinkingMode, policyTraces };
  const normalizeActions = dependencies.normalizeActions || identityActions;
  let actions = normalizeActions(rawActions);
  recordActionPipelineStage(stages, "raw_model_actions", [], actions);

  actions = applyPolicyPipelineStage(actions, message, policyContext, stages, "policy_initial", dependencies);

  const beforeMediaGuard = actions;
  actions = dependencies.ensureMediaGenerationActions
    ? dependencies.ensureMediaGenerationActions({
        message,
        actions,
        reply,
        selectedContext,
        canvas,
        analysis,
        lang,
        maxActions
      })
    : actions;
  recordActionPipelineStage(stages, "media_generation_guard", beforeMediaGuard, actions);

  const beforeReliabilityGuard = actions;
  actions = dependencies.ensureCommittedCanvasActions
    ? dependencies.ensureCommittedCanvasActions({
        message,
        actions,
        reply,
        analysis,
        lang,
        maxActions
      })
    : actions;
  recordActionPipelineStage(stages, "committed_canvas_guard", beforeReliabilityGuard, actions);

  const beforeFallbackClean = actions;
  actions = dependencies.cleanupFallbackActions
    ? dependencies.cleanupFallbackActions({ message, actions, reply })
    : actions;
  recordActionPipelineStage(stages, "fallback_recovery", beforeFallbackClean, actions);

  if (response && dependencies.mergeReferenceActions) {
    const beforeReferences = actions;
    actions = dependencies.mergeReferenceActions({ actions, response, message, webSearchEnabled });
    recordActionPipelineStage(stages, "reference_merge", beforeReferences, actions);
  }

  const beforeEnrich = actions;
  actions = dependencies.enrichActions
    ? dependencies.enrichActions({ actions, message, reply, lang, thinkingMode })
    : actions;
  recordActionPipelineStage(stages, "action_enrichment", beforeEnrich, actions);

  const beforeAgentFinalize = actions;
  actions = dependencies.finalizeAgentActions
    ? dependencies.finalizeAgentActions({ actions, message, lang, agentMode })
    : actions;
  recordActionPipelineStage(stages, "agent_finalize", beforeAgentFinalize, actions);

  actions = applyPolicyPipelineStage(actions, message, policyContext, stages, "policy_after_enrichment", dependencies);

  const beforeAutomaticCards = actions;
  actions = dependencies.ensureAutomaticSmartCardActions
    ? dependencies.ensureAutomaticSmartCardActions({ actions, message, reply, lang, thinkingMode })
    : actions;
  recordActionPipelineStage(stages, "automatic_smart_cards", beforeAutomaticCards, actions);

  actions = applyPolicyPipelineStage(actions, message, policyContext, stages, "policy_final", dependencies);

  const compactPolicy = dependencies.compactActionPolicyTrace
    ? dependencies.compactActionPolicyTrace(policyTraces)
    : undefined;
  const actionPolicy = attachActionPipelineTrace(compactPolicy, stages);
  const trace = buildCanvasActionTrace({
    traceId,
    sessionId,
    messageId,
    model,
    provider,
    thinkingMode,
    message,
    reply,
    rawActions,
    toolActions,
    inlineActions,
    thinkingMentionedActionTypes,
    actionPolicy,
    policyTraces,
    stages,
    finalActions: actions,
    frontendResults
  });
  return {
    actions,
    policyTraces,
    stages,
    actionPolicy,
    trace
  };
}
