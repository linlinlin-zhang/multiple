import assert from "node:assert/strict";
import { finalizeCanvasActions } from "../src/lib/canvasActionPipeline.js";

function typeList(actions) {
  return actions.map((action) => action.type);
}

{
  const result = finalizeCanvasActions({
    rawActions: [{ type: "create_note", title: "Raw" }],
    message: "帮我整理并找一个参考来源",
    reply: "好的",
    response: { id: "resp_1" },
    webSearchEnabled: true,
    dependencies: {
      normalizeActions: (raw) => raw,
      applyPolicy: ({ actions, context, stage }) => {
        context.policyTraces.push({
          proposedActionTypes: typeList(actions),
          finalActionTypes: typeList(actions),
          rejected: [],
          events: [{ event: stage }]
        });
        return actions;
      },
      ensureMediaGenerationActions: ({ actions }) => [...actions, { type: "generate_image", prompt: "support visual" }],
      ensureCommittedCanvasActions: ({ actions }) => actions,
      cleanupFallbackActions: ({ actions }) => actions,
      mergeReferenceActions: ({ actions }) => [...actions, { type: "create_web_card", url: "https://example.com" }],
      enrichActions: ({ actions }) => actions,
      finalizeAgentActions: ({ actions }) => actions,
      ensureAutomaticSmartCardActions: ({ actions }) => actions,
      compactActionPolicyTrace: (traces) => ({ taskType: "test", traceCount: traces.length })
    }
  });

  assert.deepEqual(typeList(result.actions), ["create_note", "generate_image", "create_web_card"]);
  assert.deepEqual(result.stages.map((stage) => stage.name), [
    "raw_model_actions",
    "policy_initial",
    "media_generation_guard",
    "committed_canvas_guard",
    "fallback_recovery",
    "reference_merge",
    "action_enrichment",
    "agent_finalize",
    "policy_after_enrichment",
    "automatic_smart_cards",
    "policy_final"
  ]);
  assert.equal(result.actionPolicy.traceCount, 3);
  assert.equal(result.actionPolicy.stages.find((stage) => stage.name === "reference_merge").outputCount, 3);
  assert.equal(result.trace.version, 1);
  assert.deepEqual(result.trace.finalActionTypes, ["create_note", "generate_image", "create_web_card"]);
  assert.equal(result.trace.pipelineStages.length, result.stages.length);
}

{
  const result = finalizeCanvasActions({
    rawActions: [{ type: "create_note", title: "Maybe" }],
    message: "只要文字回答，不要创建卡片",
    dependencies: {
      normalizeActions: (raw) => raw,
      applyPolicy: ({ actions, context, stage }) => {
        if (stage === "policy_final") {
          context.policyTraces.push({
            rejected: [{ type: "create_note", reason: "not_allowed_for_intent", group: "card" }],
            events: [{ event: "guardrail_rejected" }]
          });
          return [];
        }
        context.policyTraces.push({ rejected: [] });
        return actions;
      },
      finalizeAgentActions: ({ actions }) => actions,
      compactActionPolicyTrace: (traces) => ({
        taskType: "no_canvas",
        rejected: traces.flatMap((trace) => trace.rejected || [])
      })
    }
  });

  assert.deepEqual(result.actions, []);
  const finalStage = result.actionPolicy.stages.find((stage) => stage.name === "policy_final");
  assert.equal(finalStage.inputCount, 1);
  assert.equal(finalStage.outputCount, 0);
  assert.deepEqual(finalStage.rejected, [{ type: "create_note", reason: "not_allowed_for_intent", group: "card" }]);
}

console.log("[test] canvas action pipeline: PASS");
