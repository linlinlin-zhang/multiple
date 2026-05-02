export function buildChatSystemContext(lang, analysis, messages) {
  return lang === "en"
    ? [
        "You are the creative dialogue assistant in this canvas-based image generation app. Your task is to help users understand the current image, compare branch directions, propose new generation ideas, or organize user thoughts into executable visual directions. Answer in English, keep it concise, usually 1-3 sentences. Do not pretend to have generated a new image; if the user wants to generate, suggest clicking a direction node or explain how you would modify the prompt.",
        "",
        "Current image analysis:",
        JSON.stringify(analysis, null, 2),
        "",
        "Recent chat:",
        messages.map((item) => `${item.role}: ${item.content}`).join("\n") || "None"
      ].join("\n")
    : [
        "你是这个画布式图片生成应用里的创意对话助手。你的任务是帮助用户理解当前图片、比较分支方向、提出新的生成建议，或把用户的想法整理成可执行的视觉方向。回答用中文，保持简洁，通常 1-3 句。不要假装已经生成了新图片；如果用户想生成，请建议他点击方向节点或说明你会如何改提示词。",
        "",
        "当前图片分析：",
        JSON.stringify(analysis, null, 2),
        "",
        "最近对话：",
        messages.map((item) => `${item.role}: ${item.content}`).join("\n") || "暂无"
      ].join("\n");
}

export function buildChatActionSystemPrompt(lang = "zh", thinkingMode = "no-thinking") {
  const actionSchema = '{"reply":"short user-facing answer","actions":[{"type":"action_type","nodeId":"optional exact node id","nodeName":"optional card name","parentNodeId":"optional exact parent id","parentNodeName":"optional parent name","anchorNodeId":"optional exact anchor id","anchorNodeName":"optional anchor name","position":"optional position","x":0,"y":0,"dx":0,"dy":0,"scale":1,"amount":180,"mode":"optional mode","title":"optional title","description":"optional description","prompt":"optional prompt","query":"optional research/search query","url":"optional url"}]}';
  const common = [
    "Use the response object requested by the API. Keep reply natural; put app operations in actions.",
    "You are ORYZAE's canvas dialogue and action assistant. The user may chat freely, ask for analysis, or ask the app to manipulate the canvas.",
    "Use actions only when the user clearly asks the app to do something. If the user is just chatting, return an empty actions array.",
    "Prefer exact nodeId values copied from Canvas state. If a card is named but the exact id is uncertain, provide nodeName/query instead; never invent node IDs.",
    "For destructive actions such as delete_node, only act when the user explicitly asks to delete/remove a card.",
    "Reusable action types: zoom_in, zoom_out, set_zoom, reset_view, pan_view, focus_node, arrange_canvas, deselect, select_source, select_analysis, select_node, move_node, create_direction, create_web_card, create_agent, generate_image, analyze_source, explore_source, research_source, research_node, open_references, save_session, new_chat, open_chat_history, close_chat, open_chat, open_history, open_settings, set_thinking_mode, set_deep_think_mode, open_upload, delete_node.",
    "When the user asks for web search or link research, web search is enabled for this turn. Use fresh web evidence and return create_web_card actions with url/title/description for concrete web references.",
    "Only create or mention subagents when agent_controller_mode=true. If agent_controller_mode=false, do not return create_agent and do not claim that an agent/subagent/worker has started; handle the request as a normal assistant.",
    "When agent_controller_mode=true and the task has separable research, planning, writing, image, or canvas-operation subtasks, prefer returning create_agent actions first. Each create_agent action should describe one no-thinking subagent with title, description, and prompt, followed by safe canvas actions that can be executed now.",
    "Position vocabulary: left, right, above, below, center, upper-left, upper-right, lower-left, lower-right, canvas-center, screen-center.",
    thinkingMode === "thinking"
      ? "Reasoning mode may be enabled by the API provider. Do not include a thinkingTrace field in your JSON; any provider-side reasoning will be read from the API response metadata."
      : "Do not include thinkingTrace, reasoning, or hidden analysis fields in your JSON.",
    "Response shape:",
    actionSchema
  ];

  if (lang === "en") {
    return common.join("\n");
  }
  return [
    "请用中文回答用户。",
    ...common,
    "reply 字段要自然、简洁、有帮助；不要声称已经完成没有实际 action 的操作。"
  ].join("\n");
}

export function buildChatUserPrompt({ message, analysis, selectedContext, canvas, messages, systemContext, thinkingMode, webSearchEnabled, agentMode, lang }) {
  const recentMessages = messages.map((item) => `${item.role}: ${item.content}`).join("\n") || (lang === "en" ? "None" : "暂无");
  return [
    lang === "en" ? "User message:" : "用户消息：",
    message,
    "",
    lang === "en" ? "App-level context:" : "应用上下文：",
    systemContext || (lang === "en" ? "None" : "暂无"),
    "",
    lang === "en" ? "Current selected card:" : "当前选中卡片：",
    JSON.stringify(selectedContext || null, null, 2),
    "",
    lang === "en" ? "Current image analysis:" : "当前图像分析：",
    JSON.stringify(analysis || {}, null, 2).slice(0, 2200),
    "",
    lang === "en" ? "Canvas state and reusable capabilities:" : "画布状态与可复用能力：",
    JSON.stringify(canvas || {}, null, 2).slice(0, 4200),
    "",
    lang === "en" ? "Recent dialogue:" : "最近对话：",
    recentMessages,
    "",
    lang === "en" ? "Current mode:" : "当前模式：",
    thinkingMode,
    "",
    "Execution hints:",
    `web_search_enabled=${webSearchEnabled ? "true" : "false"}`,
    `agent_controller_mode=${agentMode ? "true" : "false"}`
  ].join("\n");
}
