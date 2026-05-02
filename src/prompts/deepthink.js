export function buildDeepThinkSystemPrompt(lang) {
  const schema = [
    "{",
    '  "reply": "short user-facing summary",',
    '  "cards": [',
    "    {",
    '      "type": "direction|web|image|file|api|note",',
    '      "title": "short card title",',
    '      "summary": "what this card contributes to the canvas",',
    '      "prompt": "generation-ready visual prompt or research instruction",',
    '      "query": "optional search query or API action name",',
    '      "url": "optional external URL when already known"',
    "    }",
    "  ],",
    '  "links": [{"from": 0, "to": 1, "label": "optional relationship"}],',
    '  "actions": [{"type": "optional reusable canvas action", "nodeId": "optional exact node id", "nodeName": "optional card name", "position": "optional target position", "prompt": "optional prompt"}]',
    "}"
  ].join("\n");

  if (lang === "en") {
    return [
      "You are ORYZAE's deep-thinking canvas planner.",
      "Return strict JSON only, with no Markdown.",
      "Do not expose private chain-of-thought. Instead, create visible workspace traces: web cards, image-reference cards, file cards, API/action cards, notes, and generation directions.",
      "If you have not actually browsed or called a tool, describe the card as a search/action plan using query and prompt fields rather than claiming it is already collected.",
      "The frontend will turn every card into a canvas node. Make cards concrete, divergent, and useful for image exploration.",
      "You may optionally include reusable canvas actions, using the same action types as realtime voice, when they help arrange, focus, or generate from the created work.",
      "Provide 4-8 cards and 2-6 links.",
      "Schema:",
      schema
    ].join("\n");
  }

  return [
    "你是 ORYZAE 的深度思考画布规划器。",
    "只返回严格 JSON，不要 Markdown。",
    "不要暴露私有思维链。你需要把思考外化为可见的工作区痕迹：网页卡片、图片参考卡片、文件卡片、API/动作卡片、笔记卡片、成图方向卡片。",
    "如果你并没有真实浏览网页或调用工具，不要声称已经搜集完成；请把卡片写成可执行的搜索/动作计划，并使用 query 和 prompt 字段。",
    "前端会把每张卡变成画布节点。卡片要具体、发散，并且能服务于图片探索。",
    "输出 4-8 张卡片和 2-6 条关系。",
    "Schema:",
    schema
  ].join("\n");
}

export function buildDeepThinkUserPrompt({ prompt, analysis, selectedContext, canvas, messages, lang }) {
  const label = lang === "en"
    ? {
        goal: "User goal",
        analysis: "Current image/file analysis",
        selected: "Selected canvas card",
        canvas: "Visible canvas state",
        dialogue: "Recent dialogue"
      }
    : {
        goal: "用户目标",
        analysis: "当前图片/文件分析",
        selected: "当前选中的画布卡片",
        canvas: "当前可见画布状态",
        dialogue: "最近对话"
      };

  return [
    `${label.goal}: ${prompt}`,
    "",
    `${label.analysis}:`,
    JSON.stringify(analysis, null, 2).slice(0, 2400),
    "",
    `${label.selected}:`,
    selectedContext ? JSON.stringify(selectedContext, null, 2).slice(0, 1200) : "None",
    "",
    `${label.canvas}:`,
    JSON.stringify(canvas || {}, null, 2).slice(0, 1800),
    "",
    `${label.dialogue}:`,
    JSON.stringify(messages || [], null, 2).slice(0, 1600)
  ].join("\n");
}
