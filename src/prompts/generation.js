export function buildGeneratePrompt(lang, option) {
  return lang === "en"
    ? [
        "# Role",
        "You are an image generation prompt engineer.",
        "",
        "# Mission",
        "Generate a new image based on the reference image, preserving the most important subjects, color relationships, or visual memory points, but do not simply copy.",
        "",
        "# Direction",
        "Title:",
        option.title,
        "",
        "Description:",
        option.description,
        "",
        "Detailed prompt:",
        option.prompt,
        "",
        "# Output Requirements",
        "- Complete, standalone image.",
        "- Clear composition.",
        "- No watermarks, UI screenshot borders, or explanatory text."
      ].join("\n")
    : [
        "# 角色",
        "你是图像生成提示词工程师。",
        "",
        "# 使命",
        "请基于参考图生成一张新图，保留原图最重要的主体、颜色关系或视觉记忆点，但不要只是复制。",
        "",
        "# 方向",
        "标题：",
        option.title,
        "",
        "说明：",
        option.description,
        "",
        "详细提示词：",
        option.prompt,
        "",
        "# 输出要求",
        "- 完整、可独立展示的图片。",
        "- 构图清晰。",
        "- 不要添加水印、UI 截图边框或说明文字。"
      ].join("\n");
}
