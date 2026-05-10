import assert from "node:assert/strict";
import { CANVAS_ACTION_TYPES } from "../src/prompts/shared.js";
import {
  CANVAS_ACTION_REGISTRY,
  actionRegistryCoverage,
  buildCanvasActionPolicy,
  filterCanvasActionsByPolicy
} from "../src/lib/canvasActionPolicy.js";

{
  const coverage = actionRegistryCoverage();
  assert.deepEqual(coverage.missing, [], `Missing registry entries: ${coverage.missing.join(", ")}`);
  assert.deepEqual(coverage.extra, [], `Extra registry entries: ${coverage.extra.join(", ")}`);
  for (const type of CANVAS_ACTION_TYPES) {
    const meta = CANVAS_ACTION_REGISTRY[type];
    assert.equal(typeof meta.group, "string", `${type} group`);
    assert.equal(typeof meta.annotations.readOnlyHint, "boolean", `${type} readOnlyHint`);
    assert.equal(typeof meta.annotations.destructiveHint, "boolean", `${type} destructiveHint`);
    assert.equal(typeof meta.annotations.idempotentHint, "boolean", `${type} idempotentHint`);
    assert.equal(typeof meta.annotations.openWorldHint, "boolean", `${type} openWorldHint`);
  }
}

{
  const policy = buildCanvasActionPolicy("我上传了几张照片，帮我分析哪张拍得比较好", { thinkingMode: "no-thinking" });
  assert.equal(policy.intent.taskType, "visual_evaluation");
  assert.equal(policy.allowCanvasTool, true);
  assert.equal(policy.maxActions, 2);
  assert.equal(policy.allowedActionSet.has("create_comparison"), true);
  assert.equal(policy.allowedActionSet.has("create_metric"), true);
  assert.equal(policy.allowedActionSet.has("research_node"), false);
  assert.equal(policy.allowedActionSet.has("web_search"), false);

  const result = filterCanvasActionsByPolicy([
    { type: "create_comparison", title: "照片对比" },
    { type: "research_node", title: "深入研究" },
    { type: "generate_image", prompt: "生成一张图" }
  ], policy);
  assert.deepEqual(result.actions.map((action) => action.type), ["create_comparison"]);
  assert.deepEqual(result.rejected.map((item) => item.type).sort(), ["generate_image", "research_node"]);
}

{
  const policy = buildCanvasActionPolicy("请总结这份材料，并整理成几个可继续工作的画布卡片", { thinkingMode: "thinking" });
  assert.equal(policy.allowCanvasTool, true);
  assert.equal(policy.allowedActionSet.has("create_note"), true);
  assert.equal(policy.allowedActionSet.has("create_table"), true);
  assert.equal(policy.allowedActionSet.has("create_todo"), true);
  assert.equal(policy.allowedActionSet.has("research_node"), false);
}

{
  const policy = buildCanvasActionPolicy("能不能帮我组合一下这两张卡片生成几个成图方向的卡片呢", { thinkingMode: "thinking" });
  assert.equal(policy.intent.taskType, "direction_generation");
  assert.equal(policy.allowedActionSet.has("create_direction"), true);
  assert.equal(policy.allowedActionSet.has("generate_image"), false);
}

{
  const policy = buildCanvasActionPolicy("请深入研究当前选中的源卡片，并整理参考资料", { thinkingMode: "thinking" });
  assert.equal(policy.intent.taskType, "source_research");
  assert.equal(policy.allowedActionSet.has("research_node"), true);
  assert.equal(policy.allowedActionSet.has("web_search"), true);
  assert.equal(policy.allowedActionSet.has("create_web_card"), true);
}

{
  const policy = buildCanvasActionPolicy("请删除当前选中的节点", { thinkingMode: "no-thinking" });
  assert.equal(policy.allowedActionSet.has("delete_node"), true);
  assert.equal(CANVAS_ACTION_REGISTRY.delete_node.annotations.destructiveHint, true);
}

{
  const policy = buildCanvasActionPolicy("只要文字回答，不要创建卡片", { thinkingMode: "thinking" });
  assert.equal(policy.allowCanvasTool, false);
  assert.equal(policy.allowedActionTypes.length, 0);
}

console.log("[test] canvas action policy: PASS");
