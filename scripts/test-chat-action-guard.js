import assert from "node:assert/strict";
import {
  ensureMediaGenerationActions,
  isDirectImageGenerationRequest,
  isDirectVideoGenerationRequest
} from "../src/lib/chatActionGuard.js";

const visualCanvas = {
  selectedNodeId: "",
  selectedNodeIds: [],
  visibleNodes: [
    {
      id: "option-1",
      type: "option",
      nodeType: "image",
      purpose: "visual",
      title: "方向1：黑暗哥特奇幻",
      summary: "黑暗哥特奇幻风格",
      prompt: "老年智者、金色法器、神秘氛围，黑暗哥特奇幻，电影感光线"
    },
    {
      id: "option-2",
      type: "option",
      nodeType: "image",
      purpose: "visual",
      title: "方向2：赛博朋克法师",
      summary: "赛博朋克视觉风格",
      prompt: "老年智者与法器，赛博朋克霓虹，未来宗教场景"
    },
    {
      id: "option-plan",
      type: "option",
      nodeType: "plan",
      purpose: "plan",
      title: "从概念到成图流程",
      summary: "计划卡，不应该被当成成图方向",
      prompt: "收集风格参考图，撰写 prompt，评估方案"
    }
  ]
};

{
  const actions = ensureMediaGenerationActions({
    message: "帮我生成这几个方向的成图卡片吧",
    actions: [{ type: "create_comparison", title: "错误的对比卡" }],
    canvas: visualCanvas,
    lang: "zh",
    maxActions: 8
  });
  assert.equal(actions.length, 2);
  assert.deepEqual(actions.map((action) => action.type), ["generate_image", "generate_image"]);
  assert.deepEqual(actions.map((action) => action.nodeId), ["option-1", "option-2"]);
}

{
  const actions = ensureMediaGenerationActions({
    message: "帮我生成这个方向",
    actions: [],
    selectedContext: {
      id: "option-2",
      type: "option",
      title: "方向2：赛博朋克法师",
      summary: "赛博朋克视觉风格",
      prompt: "赛博朋克霓虹，未来宗教场景"
    },
    canvas: { ...visualCanvas, selectedNodeId: "option-2", selectedNodeIds: ["option-2"] },
    lang: "zh"
  });
  assert.equal(actions.length, 1);
  assert.equal(actions[0].type, "generate_image");
  assert.equal(actions[0].nodeId, "option-2");
}

{
  assert.equal(isDirectImageGenerationRequest("帮我搜一些哥特法师参考图"), false);
  assert.equal(isDirectImageGenerationRequest("帮我写一个图片生成 prompt"), false);
  assert.equal(isDirectImageGenerationRequest("帮我把这个方向直接成图"), true);
  assert.equal(isDirectVideoGenerationRequest("基于这张图生成一段 5 秒动画"), true);
}

{
  const actions = ensureMediaGenerationActions({
    message: "基于这张图再生成一个暗黑风变体",
    actions: [],
    selectedContext: {
      id: "generated-1",
      type: "generated",
      title: "已生成图片",
      summary: "上一张生成图",
      prompt: "上一张图的说明"
    },
    canvas: {
      selectedNodeId: "generated-1",
      selectedNodeIds: ["generated-1"],
      visibleNodes: [
        {
          id: "generated-1",
          type: "generated",
          title: "已生成图片",
          summary: "上一张生成图",
          prompt: "上一张图的说明",
          generated: true
        }
      ]
    },
    lang: "zh"
  });
  assert.equal(actions.length, 1);
  assert.equal(actions[0].type, "generate_image");
  assert.equal(actions[0].nodeId, "generated-1");
  assert.match(actions[0].prompt, /暗黑风变体/);
  assert.match(actions[0].prompt, /不要做成对比决策卡/);
}

{
  const actions = ensureMediaGenerationActions({
    message: "帮我把当前方向直接成图",
    actions: [],
    selectedContext: {
      id: "option-plan",
      type: "option",
      nodeType: "plan",
      purpose: "plan",
      title: "从概念到成图流程",
      summary: "计划卡，不应该被当成成图方向",
      prompt: "收集风格参考图，撰写 prompt，评估方案"
    },
    canvas: {
      selectedNodeId: "option-plan",
      selectedNodeIds: ["option-plan"],
      visibleNodes: [
        {
          id: "option-plan",
          type: "option",
          nodeType: "plan",
          purpose: "plan",
          title: "从概念到成图流程",
          summary: "计划卡，不应该被当成成图方向",
          prompt: "收集风格参考图，撰写 prompt，评估方案"
        }
      ]
    },
    lang: "zh"
  });
  assert.equal(actions.length, 1);
  assert.equal(actions[0].type, "generate_image");
  assert.equal(actions[0].nodeId, undefined);
  assert.match(actions[0].prompt, /完整、可独立展示的图片/);
}

{
  const actions = ensureMediaGenerationActions({
    message: "帮我生成五张场景不一样风格不一样的主角战斗图片",
    actions: [{ type: "generate_image", title: "Epic cyberpunk battle scene", prompt: "Epic cyberpunk battle scene, protagonist wielding a glowing blade" }],
    selectedContext: {
      id: "source",
      type: "source",
      title: "主角参考图",
      summary: "岩石地形上的主角，阴暗神秘场景"
    },
    canvas: {
      selectedNodeId: "source",
      selectedNodeIds: ["source"],
      visibleNodes: [
        {
          id: "source",
          type: "source",
          title: "主角参考图",
          summary: "岩石地形上的主角，阴暗神秘场景"
        }
      ]
    },
    lang: "zh",
    maxActions: 8
  });
  assert.equal(actions.length, 5);
  assert.equal(actions.every((action) => action.type === "generate_image"), true);
  assert.equal(actions[0].parentNodeId, "source");
  assert.equal(new Set(actions.map((action) => action.prompt)).size, 5);
  assert.match(actions[1].prompt, /第 2 张结果|场景、风格、色彩/);
  assert.match(actions[4].prompt, /外星地表|太空遗迹|科幻尺度/);
  assert.match(actions[4].prompt, /完整、可独立展示的图片/);
}

{
  const actions = ensureMediaGenerationActions({
    message: "按刚才说的都生成图片",
    reply: "我会同时生成这5张图片，并在画布上创建相应节点。",
    actions: [{ type: "generate_image", title: "第一张", prompt: "第一张图片" }],
    lang: "zh",
    maxActions: 8
  });
  assert.equal(actions.length, 5);
  assert.equal(actions.every((action) => action.type === "generate_image"), true);
}

console.log("[test] chat action guard: PASS");
