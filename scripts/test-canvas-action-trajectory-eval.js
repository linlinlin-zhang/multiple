import assert from "node:assert/strict";
import {
  buildCanvasActionPolicy,
  filterCanvasActionsByPolicy,
  summarizeCanvasActionPolicy
} from "../src/lib/canvasActionPolicy.js";

function evaluateTrajectory(name, message, proposed, options = {}) {
  const policy = buildCanvasActionPolicy(message, options);
  const result = filterCanvasActionsByPolicy(proposed, policy);
  const trace = summarizeCanvasActionPolicy(policy, {
    proposed,
    final: result.actions,
    rejected: result.rejected,
    loop: result.loop
  });
  return { name, policy, result, trace };
}

function rejectedReasons(trace, type) {
  return trace.rejected.filter((item) => item.type === type).map((item) => item.reason);
}

{
  const { result, trace } = evaluateTrajectory(
    "visual comparison rejects research drift",
    "我上传了几张照片，帮我分析一下哪张拍得比较好",
    [
      { type: "create_comparison", title: "照片优劣对比", content: { items: [{ title: "A" }, { title: "B" }] } },
      { type: "create_metric", title: "拍摄评分", content: { metrics: [{ label: "构图", value: "8" }] } },
      { type: "create_note", title: "额外说明", content: { text: "补充点评" } },
      { type: "research_node", title: "研究照片" },
      { type: "web_search", query: "摄影构图研究" },
      { type: "generate_image", prompt: "生成一张示例照片" }
    ],
    { thinkingMode: "no-thinking" }
  );
  assert.deepEqual(result.actions.map((action) => action.type), ["create_comparison", "create_metric"]);
  assert.equal(rejectedReasons(trace, "research_node").includes("not_allowed_for_intent"), true);
  assert.equal(rejectedReasons(trace, "generate_image").includes("not_allowed_for_intent"), true);
  assert.equal(rejectedReasons(trace, "create_note").includes("over_step_action_budget"), true);
  assert.equal(trace.events.some((event) => event.event === "model_actions_proposed"), true);
}

{
  const { result, trace } = evaluateTrajectory(
    "source research allows explicit open-world path",
    "请深入研究当前选中的源卡片，并整理参考资料",
    [
      { type: "web_search", query: "城市绿地 心理健康 研究" },
      { type: "create_web_card", title: "参考论文", url: "https://example.com/paper" },
      { type: "research_node", title: "深入研究当前卡片" },
      { type: "generate_image", prompt: "生成一张城市绿地图" }
    ],
    { thinkingMode: "thinking" }
  );
  assert.deepEqual(result.actions.map((action) => action.type), ["web_search", "create_web_card", "research_node"]);
  assert.equal(rejectedReasons(trace, "generate_image").includes("not_allowed_for_intent"), true);
  assert.equal(trace.loop.stoppedBy.type, "research_node");
}

{
  const { result, trace } = evaluateTrajectory(
    "destructive action stops later card creation",
    "请删除当前选中的节点，并创建一张备注卡片说明原因",
    [
      { type: "delete_node", nodeId: "node-1" },
      { type: "create_note", title: "删除说明", content: { text: "已删除不再需要的节点。" } }
    ],
    { thinkingMode: "no-thinking" }
  );
  assert.deepEqual(result.actions.map((action) => action.type), ["delete_node"]);
  assert.equal(rejectedReasons(trace, "create_note").includes("not_allowed_for_intent"), true);
  assert.equal(trace.loop.stoppedBy.type, "delete_node");
}

{
  const { result, trace } = evaluateTrajectory(
    "duplicate card actions are circuit-broken",
    "请创建几张总结卡片，整理这段材料",
    [
      { type: "create_note", title: "总结", content: { text: "同一张卡片" } },
      { type: "create_note", title: "总结", content: { text: "同一张卡片" } },
      { type: "create_note", title: "总结", content: { text: "同一张卡片" } }
    ],
    { thinkingMode: "thinking" }
  );
  assert.deepEqual(result.actions.map((action) => action.type), ["create_note"]);
  assert.equal(trace.rejected.filter((item) => item.reason === "duplicate_circuit_breaker").length, 2);
}

{
  const { result, trace } = evaluateTrajectory(
    "media generation allows distinct prompts and rejects duplicate prompt",
    "请生成三张不同风格的海报图片",
    [
      { type: "generate_image", prompt: "未来主义海报，蓝色光线" },
      { type: "generate_image", prompt: "未来主义海报，蓝色光线" },
      { type: "generate_image", prompt: "极简主义海报，黑白构成" }
    ],
    { thinkingMode: "thinking" }
  );
  assert.deepEqual(result.actions.map((action) => action.type), ["generate_image", "generate_image"]);
  assert.equal(trace.rejected.some((item) => item.reason === "duplicate_circuit_breaker"), true);
}

{
  const { result, trace } = evaluateTrajectory(
    "analysis-first request rejects immediate generation",
    "先分析一下这张图能不能改成商业海报，不要直接出图",
    [
      { type: "generate_image", prompt: "商业海报改图" },
      { type: "create_note", title: "改图可行性分析", content: { text: "先分析，不执行成图。" } }
    ],
    { thinkingMode: "thinking" }
  );
  assert.deepEqual(result.actions.map((action) => action.type), ["create_note"]);
  assert.equal(rejectedReasons(trace, "generate_image").includes("not_allowed_for_intent"), true);
  assert.equal(trace.taskType, "visual_critique");
}

{
  const { result, trace } = evaluateTrajectory(
    "explicit four-image generation allows distinct outputs",
    "请生成4张不同风格的海报图片",
    [
      { type: "generate_image", prompt: "未来主义海报，蓝色光线" },
      { type: "generate_image", prompt: "极简主义海报，黑白构成" },
      { type: "generate_image", prompt: "手绘插画海报，温暖色彩" },
      { type: "generate_image", prompt: "复古拼贴海报，高对比" }
    ],
    { thinkingMode: "thinking" }
  );
  assert.equal(trace.taskType, "media_generation");
  assert.deepEqual(result.actions.map((action) => action.type), ["generate_image", "generate_image", "generate_image", "generate_image"]);
}

{
  const { result, trace } = evaluateTrajectory(
    "existing references do not imply web search",
    "请整理已有参考资料，做成摘要卡片",
    [
      { type: "web_search", query: "相关资料" },
      { type: "create_note", title: "已有参考摘要", content: { text: "只整理已有资料。" } }
    ],
    { thinkingMode: "thinking" }
  );
  assert.deepEqual(result.actions.map((action) => action.type), ["create_note"]);
  assert.equal(rejectedReasons(trace, "web_search").includes("not_allowed_for_intent"), true);
}

{
  const { result, trace } = evaluateTrajectory(
    "explicit latest research allows web search",
    "帮我找最新资料和官方来源，整理成参考卡",
    [
      { type: "web_search", query: "最新 官方 来源" },
      { type: "create_web_card", title: "官方来源", url: "https://example.com/official" },
      { type: "create_note", title: "资料摘要", content: { text: "汇总最新资料。" } }
    ],
    { thinkingMode: "thinking" }
  );
  assert.equal(trace.taskType, "web_research");
  assert.deepEqual(result.actions.map((action) => action.type), ["web_search", "create_web_card", "create_note"]);
}

{
  const { result, trace } = evaluateTrajectory(
    "no-canvas request rejects proposed canvas action",
    "只要文字回答，不要创建卡片",
    [{ type: "create_note", title: "不该出现" }],
    { thinkingMode: "thinking" }
  );
  assert.deepEqual(result.actions, []);
  assert.equal(rejectedReasons(trace, "create_note").includes("not_allowed_for_intent"), true);
}

console.log("[test] canvas action trajectory eval: PASS");
