import { SAFETY_DIRECTIVES } from './shared.js';

function formatBlueprintGenerationContext(lang, blueprint) {
  if (!blueprint || typeof blueprint !== "object") return "";
  const strength = Number.isFinite(Number(blueprint.referenceStrength)) ? Number(blueprint.referenceStrength) : 0.7;
  const cards = Array.isArray(blueprint.cards) ? blueprint.cards : [];
  const relationships = Array.isArray(blueprint.relationships) ? blueprint.relationships : [];
  if (!cards.length && !relationships.length) return "";
  const titleById = new Map(cards.map((card) => [card.id, card.title || card.id]));
  const relationLabel = (type) => {
    if (lang === "en") return type === "upstream" ? "upstream dependency" : type === "downstream" ? "downstream influence" : "parallel relationship";
    return type === "upstream" ? "上游依赖" : type === "downstream" ? "下游影响" : "并列关系";
  };
  const lines = lang === "en"
    ? [
        "# Blueprint Context",
        `Reference strength: ${strength} / 1. Use this value as how strictly the image should follow the blueprint relationships and current chat context.`,
        cards.length ? `Cards: ${cards.map((card) => card.title || card.id).join("; ")}` : "",
        ...relationships.map((relationship) => {
          const from = titleById.get(relationship.from) || relationship.from;
          const to = titleById.get(relationship.to) || relationship.to;
          const note = relationship.note ? ` — ${relationship.note}` : "";
          return `- ${from} -> ${to} (${relationLabel(relationship.type)})${note}`;
        })
      ]
    : [
        "# 蓝图上下文",
        `参照强度：${strength} / 1。请将该数值理解为成图时对蓝图关系和当前对话上下文的严格参考程度。`,
        cards.length ? `卡片：${cards.map((card) => card.title || card.id).join("；")}` : "",
        ...relationships.map((relationship) => {
          const from = titleById.get(relationship.from) || relationship.from;
          const to = titleById.get(relationship.to) || relationship.to;
          const note = relationship.note ? ` —— ${relationship.note}` : "";
          return `- ${from} -> ${to}（${relationLabel(relationship.type)}）${note}`;
        })
      ];
  return lines.filter(Boolean).join("\n");
}

function formatGenerateChatContext(lang, messages) {
  if (!Array.isArray(messages) || messages.length === 0) return "";
  const lines = messages.slice(-8).map((message) => {
    const role = message.role === "assistant"
      ? (lang === "en" ? "Assistant" : "助手")
      : (lang === "en" ? "User" : "用户");
    return `- ${role}: ${message.content}`;
  });
  return [
    lang === "en" ? "# Recent Chat Context" : "# 最近对话上下文",
    ...lines
  ].filter(Boolean).join("\n");
}

export function buildGeneratePrompt(lang, option) {
  const textToImage = option?.generationMode === "text-to-image";
  const blueprintContext = formatBlueprintGenerationContext(lang, option?.blueprint);
  const chatContext = formatGenerateChatContext(lang, option?.chatContext);
  return lang === "en"
    ? [
        "# Role",
        "You are an image generation prompt engineer.",
        "",
        "# Mission",
        textToImage
          ? "Generate a new image from the user's text direction. Do not assume a hidden reference image."
          : "Generate a new image based on the reference image, preserving the most important subjects, color relationships, or visual memory points, but do not simply copy.",
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
        blueprintContext,
        "",
        chatContext,
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
        textToImage
          ? "请根据用户的文字方向直接生成一张新图，不要假设存在隐藏参考图。"
          : "请基于参考图生成一张新图，保留原图最重要的主体、颜色关系或视觉记忆点，但不要只是复制。",
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
        blueprintContext,
        "",
        chatContext,
        "",
        "# 输出要求",
        "- 完整、可独立展示的图片。",
        "- 构图清晰。",
        "- 不要添加水印、UI 截图边框或说明文字。"
      ].join("\n");
}

export function buildStyleTransferGenerationPrompt(lang, { sourceDescription, targetStyle, preserveElements = [], option }) {
  const preserve = preserveElements.length > 0
    ? (lang === "en" ? `Preserve these elements: ${preserveElements.join(", ")}` : `保留以下元素：${preserveElements.join("、")}`)
    : "";

  const base = lang === "en"
    ? [
        "# Role",
        "You are a style transfer generation engineer.",
        "",
        "# Mission",
        "Generate an image that applies a new visual style to the source content while preserving its core structure and subjects.",
        "",
        "# Source Description",
        sourceDescription,
        "",
        "# Target Style",
        targetStyle,
        "",
        preserve,
        "",
        "# Direction",
        "Title:",
        option?.title || "Style Transfer",
        "Description:",
        option?.description || "Reimagine in a new style",
        "Detailed prompt:",
        option?.prompt || targetStyle,
        "",
        "# Output Requirements",
        "- Maintain spatial relationships and key subjects from the source.",
        "- Apply the target style consistently across all elements.",
        "- No watermarks, UI elements, or explanatory text."
      ]
    : [
        "# 角色",
        "你是风格迁移生成工程师。",
        "",
        "# 使命",
        "生成一张将新视觉风格应用于源内容的图片，同时保留其核心结构和主体。",
        "",
        "# 源内容描述",
        sourceDescription,
        "",
        "# 目标风格",
        targetStyle,
        "",
        preserve,
        "",
        "# 方向",
        "标题：",
        option?.title || "风格迁移",
        "说明：",
        option?.description || "用新风格重新想象",
        "详细提示词：",
        option?.prompt || targetStyle,
        "",
        "# 输出要求",
        "- 保持源内容的空间关系和关键主体。",
        "- 在所有元素上一致地应用目标风格。",
        "- 不要添加水印、UI 元素或说明文字。"
      ];

  return base.filter(Boolean).join("\n");
}

export function buildVariantGenerationPrompt(lang, { basePrompt, variantAxis, intensity = "moderate", option }) {
  return lang === "en"
    ? [
        "# Role",
        "You are a creative variation engineer.",
        "",
        "# Mission",
        `Generate a variant of the base concept, pushing the "${variantAxis}" axis to a ${intensity} degree of change.`,
        "",
        "# Base Concept",
        basePrompt,
        "",
        "# Variant Direction",
        `Axis: ${variantAxis}`,
        `Intensity: ${intensity}`,
        "",
        "# Direction",
        "Title:",
        option?.title || "Variant",
        "Description:",
        option?.description || `Exploring ${variantAxis} variation`,
        "Detailed prompt:",
        option?.prompt || basePrompt,
        "",
        "# Output Requirements",
        "- Preserve the core essence while exploring the variant axis.",
        "- The result must feel like an intentional creative exploration, not a mistake.",
        "- No watermarks, UI elements, or explanatory text."
      ].join("\n")
    : [
        "# 角色",
        "你是创意变体工程师。",
        "",
        "# 使命",
        `生成基础概念的一个变体，将 "${variantAxis}" 维度推向 ${intensity} 程度的变化。`,
        "",
        "# 基础概念",
        basePrompt,
        "",
        "# 变体方向",
        `维度：${variantAxis}`,
        `强度：${intensity}`,
        "",
        "# 方向",
        "标题：",
        option?.title || "变体",
        "说明：",
        option?.description || `探索 ${variantAxis} 变体`,
        "详细提示词：",
        option?.prompt || basePrompt,
        "",
        "# 输出要求",
        "- 保留核心本质，同时探索变体维度。",
        "- 结果必须像是有意的创意探索，而非失误。",
        "- 不要添加水印、UI 元素或说明文字。"
      ].join("\n");
}

export function buildMultimodalGenerationPrompt(lang, { primaryMedium, supportingMedia, narrativeGoal, option }) {
  return lang === "en"
    ? [
        "# Role",
        "You are a multimodal generation coordinator.",
        "",
        "# Mission",
        `Generate a ${primaryMedium} output that is designed to work in concert with ${supportingMedia.join(", ")}.`,
        "",
        "# Narrative Goal",
        narrativeGoal,
        "",
        "# Direction",
        "Title:",
        option?.title || "Multimodal Creation",
        "Description:",
        option?.description || "Cross-medium creative output",
        "Detailed prompt:",
        option?.prompt || narrativeGoal,
        "",
        "# Output Requirements",
        "- The output must make sense as part of a larger multimodal experience.",
        "- Consider how the user will encounter this in sequence with other media.",
        "- No watermarks, UI elements, or explanatory text."
      ].join("\n")
    : [
        "# 角色",
        "你是多模态生成协调员。",
        "",
        "# 使命",
        `生成一个 ${primaryMedium} 输出，它旨在与 ${supportingMedia.join("、")} 协同工作。`,
        "",
        "# 叙事目标",
        narrativeGoal,
        "",
        "# 方向",
        "标题：",
        option?.title || "多模态创作",
        "说明：",
        option?.description || "跨媒介创意输出",
        "详细提示词：",
        option?.prompt || narrativeGoal,
        "",
        "# 输出要求",
        "- 输出必须作为更大的多模态体验的一部分而合理。",
        "- 考虑用户将如何按顺序与其他媒介接触此输出。",
        "- 不要添加水印、UI 元素或说明文字。"
      ].join("\n");
}
