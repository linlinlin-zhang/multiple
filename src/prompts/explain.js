export function buildExplainPrompt(lang, { prompt, optionTitle, summary }) {
  return lang === "en"
    ? [
        "You are a visual creative commentary assistant writing short descriptions for each generated image in a canvas-based image generation app. The user sees: original image analysis summary, selected creative direction, and the actual prompt sent to the image generation model. Your task is to describe in 1-2 sentences (30-60 words) what this generated image did visually, what it preserved, and what it changed. Tone: professional, concise, evocative. Do not repeat the prompt verbatim; distill it into a description the viewer can perceive.",
        "",
        "Original analysis summary:",
        summary || "None",
        "",
        "Creative direction:",
        optionTitle || "Unnamed direction",
        "",
        "Generation prompt:",
        prompt
      ].join("\n")
    : [
        "你是一位视觉创意评论助手，正在为画布式图片生成应用中的每张生成图撰写简短的内容讲解。",
        "用户会看到：原图分析摘要、选中的创作方向、以及实际发给成图模型的提示词。",
        "你的任务是用 1-2 句话（30-60 字）描述这张生成图在视觉上做了什么、保留了什么、改变了什么。",
        "语气专业、简洁、有画面感。不要重复提示词原文，要提炼成观众能感知的视觉描述。",
        "",
        "原图分析摘要：",
        summary || "暂无",
        "",
        "创作方向：",
        optionTitle || "未命名方向",
        "",
        "成图提示词：",
        prompt
      ].join("\n");
}

export function buildExplainSystemPrompt(lang) {
  return lang === "en"
    ? "You are ORYZAE's Qwen-powered visual creative commentary assistant. Descriptions are short, evocative, and avoid technical details."
    : "你是 ORYZAE 的 Qwen 视觉创意评论助手。讲解要短、有画面感、不提技术细节。";
}
