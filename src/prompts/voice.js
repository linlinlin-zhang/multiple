export function buildRealtimeInstruction(context) {
  const lang = context.language === "en" ? "English" : "Chinese";
  const recentMessages = context.messages
    .map((item) => `${item.role}: ${item.content}`)
    .join("\n") || "None";
  const selected = context.selectedContext
    ? JSON.stringify(context.selectedContext).slice(0, 1200)
    : "None";
  const canvas = JSON.stringify(context.canvas || {}).slice(0, 3600);

  return [
    `You are the realtime voice action planner for ORYZAE, a canvas-based image exploration app. Understand the user's spoken command in ${lang}.`,
    "Return strict JSON only. Do not wrap it in Markdown.",
    "You may return a short spoken reply plus at most 3 app actions. Use actions only when the user clearly asks the app to do something.",
    "Prefer exact nodeId values copied from Canvas state. If the user names a card but the id is uncertain, provide nodeName/query instead; never invent node IDs.",
    "For destructive actions such as delete_node, only act when the spoken command explicitly asks to delete/remove a card.",
    "Position vocabulary: left, right, above, below, center, upper-left, upper-right, lower-left, lower-right, canvas-center, screen-center.",
    "Reusable action types:",
    "zoom_in, zoom_out, set_zoom, reset_view, pan_view, focus_node, arrange_canvas, deselect, select_source, select_analysis, select_node, move_node, create_direction, create_web_card, create_agent, generate_image, image_search, reverse_image_search, text_image_search, analyze_source, explore_source, research_source, research_node, open_references, save_session, new_chat, open_chat_history, close_chat, open_chat, open_history, open_settings, set_thinking_mode, set_deep_think_mode, open_upload, delete_node.",
    "When web search is needed, include create_web_card actions with real URLs, concise titles, and descriptions so the canvas can preserve references.",
    "When similar images, reverse-image lookup, or visual references would help, include image_search, reverse_image_search, or text_image_search actions.",
    "Schema:",
    '{"transcript":"recognized user speech","reply":"short spoken response","actions":[{"type":"action_type","nodeId":"exact optional id","nodeName":"optional spoken card name","parentNodeId":"optional exact parent id","parentNodeName":"optional parent name","anchorNodeId":"optional exact anchor id","anchorNodeName":"optional anchor name","position":"optional position","x":0,"y":0,"dx":0,"dy":0,"scale":1,"amount":180,"mode":"optional mode","title":"optional title","description":"optional description","prompt":"optional prompt","query":"optional research/search query","url":"optional url"}]}',
    "",
    "Current selected card:",
    selected,
    "",
    "Current analysis:",
    JSON.stringify(context.analysis || {}).slice(0, 1600),
    "",
    "Canvas state:",
    canvas,
    "",
    "Recent dialogue:",
    recentMessages
  ].join("\n");
}
