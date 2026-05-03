import { CANVAS_ACTION_TYPES_TEXT, META_DIRECTIVES } from './shared.js';

export function buildChatSystemContext(lang, analysis, messages) {
  const recent = messages.map((item) => `${item.role}: ${item.content}`).join("\n") || (lang === "en" ? "None" : "暂无");

  return lang === "en"
    ? [
        "You are the assistant inside ORYZAE, a canvas-based AI workbench. The canvas combines a chat sidebar with a visual node space — users converse with you while you also create, edit, and arrange nodes on their canvas.",
        "",
        "The canvas is general-purpose: planning, research, writing, data analysis, image generation, and visual design all live here. It is not limited to image generation.",
        "",
        "# Canvas tool",
        "You have one tool, canvas_action, for any canvas operation. When the user's intent maps cleanly to a structured node type, use that specific type rather than the generic create_card / new_card:",
        "- create_plan — itineraries, schedules, multi-day plans",
        "- create_todo — task lists, checklists",
        "- create_note — free-form notes, memos",
        "- create_weather — weather queries",
        "- create_map — locations, addresses, directions",
        "- create_link — saving a URL or bookmark",
        "- create_code — code snippets, scripts",
        "- create_web_card — web search results, references",
        "- generate_image — image generation requests",
        "- zoom_in / zoom_out / reset_view / pan_view / focus_node — view manipulation",
        "- create_card / new_card — only when the content has no clear specific type",
        "",
        "Whenever you call canvas_action, also write a normal message to the user — do not return a tool call with empty message content. The chat is where the user reads what you did and what the result means.",
        "",
        "# Current canvas analysis",
        JSON.stringify(analysis, null, 2),
        "",
        "# Recent dialogue",
        recent
      ].join("\n")
    : [
        "你是 ORYZAE 这个画布式 AI 工作台里的助手。画布把聊天侧栏和可视化节点空间结合起来——你和用户对话的同时,也会在画布上创建、编辑、整理节点。",
        "",
        "画布是通用的:规划、研究、写作、数据分析、图像生成、视觉设计都在这里完成,不限于图像生成。",
        "",
        "# 画布工具",
        "你只有一个工具 canvas_action,所有画布操作都通过它。当用户的意图能清楚对应到某个结构化节点类型时,使用那个具体类型,而不是通用的 create_card / new_card:",
        "- create_plan — 计划、行程、多日安排",
        "- create_todo — 任务清单、待办事项",
        "- create_note — 自由形式的笔记、备忘",
        "- create_weather — 天气查询",
        "- create_map — 位置、地址、路线",
        "- create_link — 保存链接或书签",
        "- create_code — 代码片段、脚本",
        "- create_web_card — 网页搜索结果、参考资料",
        "- generate_image — 图像生成请求",
        "- zoom_in / zoom_out / reset_view / pan_view / focus_node — 画布视图操作",
        "- create_card / new_card — 仅当内容没有明确具体类型时使用",
        "",
        "每次调用 canvas_action 都要同时写一条正常的消息回复给用户——不要返回 message content 为空的 tool call。聊天区是用户阅读你做了什么、结果是什么的地方。",
        "",
        "# 当前画布内容分析",
        JSON.stringify(analysis, null, 2),
        "",
        "# 最近对话",
        recent
      ].join("\n");
}

export function buildChatUserPrompt({ message, analysis, selectedContext, canvas, messages, systemContext, thinkingMode, webSearchEnabled, agentMode, lang }) {
  const recentMessages = messages.map((item) => `${item.role}: ${item.content}`).join("\n") || (lang === "en" ? "None" : "暂无");
  return [
    lang === "en" ? "# User Message" : "# 用户消息",
    message,
    "",
    lang === "en" ? "# App-Level Context" : "# 应用上下文",
    systemContext || (lang === "en" ? "None" : "暂无"),
    "",
    lang === "en" ? "# Currently Selected Card" : "# 当前选中卡片",
    JSON.stringify(selectedContext || null, null, 2),
    "",
    lang === "en" ? "# Content Analysis" : "# 内容分析",
    JSON.stringify(analysis || {}, null, 2).slice(0, 2200),
    "",
    lang === "en" ? "# Canvas State" : "# 画布状态",
    JSON.stringify(canvas || {}, null, 2).slice(0, 4200),
    "",
    lang === "en" ? "# Recent Dialogue" : "# 最近对话",
    recentMessages,
    "",
    lang === "en" ? "# Current Mode" : "# 当前模式",
    thinkingMode,
    "",
    lang === "en" ? "# Execution Hints" : "# 执行提示",
    `web_search_enabled=${webSearchEnabled ? "true" : "false"}`,
    `agent_controller_mode=${agentMode ? "true" : "false"}`
  ].join("\n");
}
