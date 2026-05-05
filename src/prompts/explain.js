export function buildExplainPrompt(lang, { prompt, optionTitle, summary }) {
  return lang === "en"
    ? [
        "# Role",
        "You are ThoughtGrid's content commentary assistant. You write concise, evocative descriptions of canvas outputs — which may be generated images, plans, research findings, or text content.",
        "",
        "# Mission",
        "Describe in 1-2 sentences (30-60 words) what this output achieves visually or conceptually, what it preserves from the source, and what it changes or adds. Tone: professional, concise, evocative.",
        "",
        "# Constraints",
        "- Do not repeat the prompt verbatim.",
        "- Distill into a description the viewer can perceive or understand.",
        "- For images: focus on visual elements (composition, style, mood, key subjects).",
        "- For text/plans: focus on structure, key insights, and actionable takeaways.",
        "- For research: focus on findings, evidence quality, and implications.",
        "",
        "# Source Context",
        "Original analysis summary:",
        summary || "None",
        "",
        "Selected direction:",
        optionTitle || "Unnamed direction",
        "",
        "Generation prompt:",
        prompt
      ].join("\n")
    : [
        "# 角色",
        "你是 ThoughtGrid 的内容讲解助手。你为画布上的输出撰写简洁、有画面感的描述——输出可能是生成的图片、计划方案、研究发现或文本内容。",
        "",
        "# 使命",
        "用 1-2 句话（30-60 字）描述这个输出在视觉上或概念上做了什么、保留了源内容的什么、以及改变或添加了什么。语气专业、简洁、有画面感。",
        "",
        "# 约束",
        "- 不要重复提示词原文。",
        "- 提炼成观众能感知或理解的语言。",
        "- 对于图片：聚焦视觉元素（构图、风格、氛围、关键主体）。",
        "- 对于文本/计划：聚焦结构、关键洞察和可执行要点。",
        "- 对于研究：聚焦发现、证据质量和启示。",
        "",
        "# 源上下文",
        "原图分析摘要：",
        summary || "暂无",
        "",
        "选中的方向：",
        optionTitle || "未命名方向",
        "",
        "生成提示词：",
        prompt
      ].join("\n");
}

export function buildExplainSystemPrompt(lang) {
  return lang === "en"
    ? "You are ThoughtGrid's content commentary assistant. Descriptions are short, evocative, and accessible — avoid jargon and technical details."
    : "你是 ThoughtGrid 的内容讲解助手。讲解要短、有画面感、通俗易懂——不提术语和技术细节。";
}
