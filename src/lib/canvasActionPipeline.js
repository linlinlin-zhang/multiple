const PIPELINE_STAGE_LIMIT = 14;
const PIPELINE_ACTION_TYPE_LIMIT = 24;
const PIPELINE_REJECTION_LIMIT = 10;

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
  recordActionPipelineStage(stages, "fallback_cleanup", beforeFallbackClean, actions);

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
  return {
    actions,
    policyTraces,
    stages,
    actionPolicy: attachActionPipelineTrace(compactPolicy, stages)
  };
}
