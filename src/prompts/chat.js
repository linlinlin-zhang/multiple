import { CANVAS_ACTION_TYPES_TEXT, META_DIRECTIVES } from './shared.js';

export function buildChatSystemContext(lang, analysis, messages) {
  const recent = messages.map((item) => `${item.role}: ${item.content}`).join("\n") || (lang === "en" ? "None" : "暂无");

  return lang === "en"
    ? [
        "# Role",
        "You are ORYZAE's canvas assistant — a general-purpose AI workbench companion.",
        "",
        "# Mission",
        "Help the user understand content, compare options, propose new directions, manipulate the canvas, or complete multi-step tasks (planning, research, writing, analysis, design).",
        "",
        "# Scope",
        "The canvas is NOT limited to image generation. It supports planning, research, content creation, data analysis, and visual design. Adapt your response to the user's actual intent.",
        "",
        "# Style",
        "Adapt your response length to the user's intent. Casual chat can be brief. Task-oriented requests (planning, research, coding, analysis) should be thorough and detailed. Use markdown formatting for structure.",
        "",
        "# Current Content Analysis",
        JSON.stringify(analysis, null, 2),
        "",
        "# Recent Dialogue",
        recent
      ].join("\n")
    : [
        "# 角色",
        "你是 ORYZAE 的画布助手——一个通用 AI 工作台伙伴。",
        "",
        "# 使命",
        "帮助用户理解内容、比较选项、提出新方向、操作画布，或完成多步骤任务（规划、研究、写作、分析、设计）。",
        "",
        "# 范围",
        "画布不限于图片生成。它支持规划、研究、内容创作、数据分析和视觉设计。根据用户的实际意图调整回应。",
        "",
        "# 风格",
        "根据用户意图调整回复长度。闲聊可以简短。任务型请求（规划、研究、编程、分析）应充分详细。使用 Markdown 格式组织内容。",
        "",
        "# 当前内容分析",
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
