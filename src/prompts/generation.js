export function buildGeneratePrompt(lang, option) {
  return lang === "en"
    ? [
        "Generate a new image based on the reference image, preserving the most important subjects, color relationships, or visual memory points, but do not simply copy.",
        "Direction:",
        option.title,
        "",
        "Description:",
        option.description,
        "",
        "Detailed prompt:",
        option.prompt,
        "",
        "Output should be a complete, standalone image; clear composition; no watermarks, UI screenshot borders, or explanatory text."
      ].join("\n")
    : [
        "请基于参考图生成一张新图，保留原图最重要的主体、颜色关系或视觉记忆点，但不要只是复制。",
        "成图方向：",
        option.title,
        "",
        "方向说明：",
        option.description,
        "",
        "详细提示词：",
        option.prompt,
        "",
        "输出应是一张完整、可独立展示的图片；构图清晰；不要添加水印、UI 截图边框或说明文字。"
      ].join("\n");
}
