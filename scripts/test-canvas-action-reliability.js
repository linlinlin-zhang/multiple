import assert from "node:assert/strict";
import {
  buildDirectionFallbackActions,
  ensureCommittedCanvasActions,
  requestedDirectionCount,
  shouldCreateDirectionActions
} from "../src/lib/canvasActionReliability.js";

{
  assert.equal(shouldCreateDirectionActions("帮我生成 5 个不同风格的视觉概念方向", ""), true);
  assert.equal(shouldCreateDirectionActions("如何生成方向卡？", ""), false);
  assert.equal(requestedDirectionCount("帮我生成 5 个不同风格的视觉概念方向", "", 8), 5);
  assert.equal(requestedDirectionCount("给我几个方向", "", 8), 5);
  assert.equal(requestedDirectionCount("生成 12 个方向", "", 8), 8);
}

{
  const actions = ensureCommittedCanvasActions({
    message: "基于当前素材生成 5 个不同风格的视觉概念方向",
    reply: "我来为你生成 5 个方向。",
    actions: [],
    analysis: {
      options: [
        {
          title: "方向1：黑暗哥特奇幻",
          description: "黑暗哥特奇幻风格",
          prompt: "老年智者、金色法器、神秘氛围，黑暗哥特奇幻，电影感光线",
          nodeType: "image",
          purpose: "visual"
        },
        {
          title: "方向2：赛博朋克法师",
          description: "赛博朋克视觉风格",
          prompt: "老年智者与法器，赛博朋克霓虹，未来宗教场景",
          nodeType: "image",
          purpose: "visual"
        },
        {
          title: "从概念到成图流程",
          description: "流程卡不应作为视觉方向",
          prompt: "收集风格参考图，撰写 prompt，评估方案",
          nodeType: "plan",
          purpose: "plan"
        }
      ]
    },
    lang: "zh",
    maxActions: 8
  });
  assert.equal(actions.length, 5);
  assert.deepEqual(actions.slice(0, 2).map((action) => action.type), ["create_direction", "create_direction"]);
  assert.deepEqual(actions.slice(0, 2).map((action) => action.title), ["方向1：黑暗哥特奇幻", "方向2：赛博朋克法师"]);
  assert.equal(actions.some((action) => /成图流程/.test(action.title)), false);
}

{
  const actions = buildDirectionFallbackActions({
    message: "帮我生成三个产品视觉方案",
    reply: "",
    lang: "zh",
    maxActions: 8
  });
  assert.equal(actions.length, 3);
  assert.equal(actions.every((action) => action.type === "create_direction"), true);
  assert.equal(actions.every((action) => action.prompt && action.nodeType), true);
}

{
  const existing = [{ type: "generate_image", prompt: "一张完整图片" }];
  const actions = ensureCommittedCanvasActions({
    message: "帮我直接成图",
    reply: "已开始生成图片。",
    actions: existing,
    lang: "zh"
  });
  assert.deepEqual(actions, existing);
}

{
  const actions = ensureCommittedCanvasActions({
    message: "能不能帮我组合一下这两张卡片生成几个成图方向的卡片呢",
    reply: "已开始生成图片，稍候请查看画布上的新节点。",
    actions: [{ type: "generate_image", title: "误判成图", prompt: "海岸森林" }],
    lang: "zh",
    maxActions: 8
  });
  assert.equal(actions.length, 5);
  assert.equal(actions.every((action) => action.type === "create_direction"), true);
  assert.equal(actions.some((action) => action.type === "generate_image"), false);
}

{
  const actions = ensureCommittedCanvasActions({
    message: "帮我生成 3 个视觉方向",
    reply: "我为你整理了一个对比。",
    actions: [{ type: "create_comparison", title: "错误的对比卡" }],
    lang: "zh",
    maxActions: 8
  });
  assert.equal(actions.length, 3);
  assert.deepEqual(actions.map((action) => action.type), ["create_direction", "create_direction", "create_direction"]);
}

{
  const actions = ensureCommittedCanvasActions({
    message: "基于当前分支约束，整理 4 个首页视觉方向卡片。",
    reply: "# 基于当前分支约束，整理 4 个首页视觉方向卡片。\n\n基于当前分支约束，整理 4 个首页视觉方向卡片。",
    actions: [
      { type: "create_direction", title: "基于当前分支约束，整理 4 个首页视觉方向卡片。" },
      { type: "create_direction", title: "基于当前分支约束，整理 4 个首页视觉方向卡片。" },
      { type: "create_direction", title: "基于当前分支约束，整理 4 个首页视觉方向卡片。" },
      { type: "create_direction", title: "基于当前分支约束，整理 4 个首页视觉方向卡片。" }
    ],
    lang: "zh",
    maxActions: 8
  });
  assert.equal(actions.length, 4);
  assert.equal(actions.every((action) => action.type === "create_direction"), true);
  assert.equal(actions.some((action) => action.title.includes("首页视觉方向卡片")), false);
  assert.equal(actions.every((action) => action.description && action.prompt), true);
}

{
  const actions = ensureCommittedCanvasActions({
    message: "请整理到画布上",
    reply: "我会把这些内容创建成卡片放到画布上。",
    actions: [],
    lang: "zh"
  });
  assert.equal(actions.length, 1);
  assert.equal(actions[0].type, "create_note");
  assert.match(actions[0].content.text, /创建成卡片/);
}

console.log("[test] canvas action reliability: PASS");
