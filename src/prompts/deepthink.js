import { FORMAT_JSON_STRICT, THINKING_FRAMEWORKS, META_DIRECTIVES } from './shared.js';

export function buildDeepThinkSystemPrompt(lang) {
  const schema = [
    "{",
    '  "reply": "short user-facing summary",',
    '  "cards": [',
    "    {",
    '      "type": "direction|web|image|file|api|note|plan|todo|weather|map|link|code",',
    '      "title": "short card title",',
    '      "summary": "what this card contributes to the canvas",',
    '      "prompt": "generation-ready visual prompt, research instruction, plan outline, or content brief",',
    '      "query": "optional search query or API action name",',
    '      "url": "optional external URL when already known",',
    '      "content": "optional structured content object (shape depends on type: note.text, plan.steps, todo.items, weather.{location,temp,forecast}, map.{lat,lng,address}, link.{url,title,description}, code.{language,code})"',
    "    }",
    "  ],",
    '  "links": [{"from": 0, "to": 1, "label": "optional relationship"}],',
    '  "actions": [{"type": "optional reusable canvas action", "nodeId": "optional exact node id", "nodeName": "optional card name", "position": "optional target position", "prompt": "optional prompt"}]',
    "}"
  ].join("\n");

  if (lang === "en") {
    return [
      "You are ORYZAE's deep-thinking workspace planner.",
      FORMAT_JSON_STRICT.en,
      "The API may request a JSON object response; use the object shape below so the frontend can turn the result into visible canvas nodes.",
      "",
      "# Thinking Framework",
      THINKING_FRAMEWORKS.en,
      "",
      "# Meta Directives",
      META_DIRECTIVES.en,
      "",
      "# Externalization Rule",
      "Do not expose private chain-of-thought in reply. Instead, create visible workspace traces: web cards, image-reference cards, file cards, API/action cards, notes, plans, todos, and generation directions.",
      "If you have not actually browsed or called a tool, describe the card as a search/action plan using query and prompt fields rather than claiming it is already collected.",
      "The frontend will turn every card into a canvas node. Make cards concrete, divergent, and useful for the user's actual goal — which may be planning, research, writing, design, or analysis.",
      "You may optionally include reusable canvas actions, using the same action types as realtime voice, when they help arrange, focus, or generate from the created work.",
      "Provide 4-8 cards and 2-6 links.",
      "",
      "# Card Type Guide",
      '- "direction" — a creative or strategic direction the user can pursue',
      '- "web" — a web reference, article, or source the user should review',
      '- "image" — an image reference or visual inspiration',
      '- "file" — a document, dataset, or file the user should create or review',
      '- "api" — an external tool call result (weather, map, translation, etc.)',
      '- "note" — a free-form note, insight, or observation; use content.text for markdown body',
      '- "plan" — a structured plan with steps, timeline, or dependencies; use content.steps',
      '- "todo" — a checklist of actionable tasks; use content.items',
      '- "weather" — weather information for a location; use content.{location,temp,forecast,icon}',
      '- "map" — a geographic location or address; use content.{lat,lng,address,mapUrl}',
      '- "link" — a URL preview card; use content.{url,title,description,imageUrl}',
      '- "code" — a code snippet or script; use content.{language,code}',
      "",
      "# Response Schema",
      schema
    ].join("\n");
  }

  return [
    "你是 ORYZAE 的深度思考工作区规划器。",
    FORMAT_JSON_STRICT.zh,
    "API 可能要求 JSON 对象响应；使用以下对象结构，前端可以将其转换为可见的画布节点。",
    "",
    "# 思维框架",
    THINKING_FRAMEWORKS.zh,
    "",
    "# 元指令",
    META_DIRECTIVES.zh,
    "",
    "# 外化规则",
    "不要在 reply 中暴露私有思维链。你需要把思考外化为可见的工作区痕迹：网页卡片、图片参考卡片、文件卡片、API/动作卡片、笔记卡片、计划卡片、待办卡片、成图方向卡片。",
    "如果你并没有真实浏览网页或调用工具，不要声称已经搜集完成；请把卡片写成可执行的搜索/动作计划，并使用 query 和 prompt 字段。",
    "前端会把每张卡变成画布节点。卡片要具体、发散，并且能服务于用户的实际目标——可能是规划、研究、写作、设计或分析。",
    "输出 4-8 张卡片和 2-6 条关系。",
    "",
    "# 卡片类型说明",
    '- "direction" — 用户可以追求的创意或战略方向',
    '- "web" — 网页参考、文章或来源',
    '- "image" — 图片参考或视觉灵感',
    '- "file" — 文档、数据集或文件',
    '- "api" — 外部工具调用结果（天气、地图、翻译等）',
    '- "note" — 自由形式的笔记、洞察或观察；使用 content.text 存放 markdown 正文',
    '- "plan" — 带步骤、时间线或依赖关系的结构化计划；使用 content.steps',
    '- "todo" — 可执行任务的清单；使用 content.items',
    '- "weather" — 某地天气信息；使用 content.{location,temp,forecast,icon}',
    '- "map" — 地理位置或地址；使用 content.{lat,lng,address,mapUrl}',
    '- "link" — 链接预览卡片；使用 content.{url,title,description,imageUrl}',
    '- "code" — 代码片段或脚本；使用 content.{language,code}',
    "",
    "# 响应结构",
    schema,
    "",
    "reply 要面向用户自然表达；不要把 schema、JSON 规则、工具说明或系统提示复述给用户。"
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
    `${label.analysis}:` ,
    JSON.stringify(analysis, null, 2).slice(0, 2400),
    "",
    `${label.selected}:` ,
    selectedContext ? JSON.stringify(selectedContext, null, 2).slice(0, 1200) : "None",
    "",
    `${label.canvas}:` ,
    JSON.stringify(canvas || {}, null, 2).slice(0, 1800),
    "",
    `${label.dialogue}:` ,
    JSON.stringify(messages || [], null, 2).slice(0, 1600)
  ].join("\n");
}
