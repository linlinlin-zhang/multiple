import { SAFETY_DIRECTIVES, jsonSchemaContract } from './shared.js';

export function buildStyleTransferPrompt(lang, { sourceDescription, targetStyle, preserveElements = [] }) {
  const preserve = preserveElements.length > 0
    ? (lang === "en" ? `Preserve: ${preserveElements.join(", ")}` : `保留元素：${preserveElements.join("、")}`)
    : "";

  return lang === "en"
    ? [
        "# Role",
        "You are a visual style transfer engineer.",
        "",
        "# Mission",
        "Reimagine the source content in the target style while preserving core subjects and composition.",
        "",
        "# Source Description",
        sourceDescription,
        "",
        "# Target Style",
        targetStyle,
        "",
        preserve,
        "",
        "# Output Requirements",
        "- Maintain spatial relationships and key subjects from the source.",
        "- Apply the target style consistently across all visual elements.",
        "- Do not add watermarks, UI elements, or explanatory text.",
        SAFETY_DIRECTIVES.en
      ].filter(Boolean).join("\n")
    : [
        "# 角色",
        "你是视觉风格迁移工程师。",
        "",
        "# 使命",
        "将源内容用目标风格重新想象，同时保留核心主体和构图。",
        "",
        "# 源内容描述",
        sourceDescription,
        "",
        "# 目标风格",
        targetStyle,
        "",
        preserve,
        "",
        "# 输出要求",
        "- 保持源内容的空间关系和关键主体。",
        "- 在所有视觉元素上一致地应用目标风格。",
        "- 不要添加水印、UI 元素或说明文字。",
        SAFETY_DIRECTIVES.zh
      ].filter(Boolean).join("\n");
}

export function buildConceptFusionPrompt(lang, { concepts, fusionStrategy }) {
  return lang === "en"
    ? [
        "# Role",
        "You are a concept fusion artist.",
        "",
        "# Mission",
        "Blend multiple concepts into a single coherent visual or creative output.",
        "",
        "# Concepts to Fuse",
        ...concepts.map((c, i) => `${i + 1}. ${c}`),
        "",
        "# Fusion Strategy",
        fusionStrategy || "Find the visual or thematic bridge between concepts and create a unified composition.",
        "",
        "# Output Requirements",
        "- The result must feel like a single intentional piece, not a collage.",
        "- Identify the connecting thread between concepts and make it central.",
        "- Balance visual weight so no single concept dominates unintentionally.",
        SAFETY_DIRECTIVES.en
      ].join("\n")
    : [
        "# 角色",
        "你是概念融合艺术家。",
        "",
        "# 使命",
        "将多个概念融合成一个连贯的视觉或创意输出。",
        "",
        "# 待融合概念",
        ...concepts.map((c, i) => `${i + 1}. ${c}`),
        "",
        "# 融合策略",
        fusionStrategy || "找到概念之间的视觉或主题桥梁，创造统一的构图。",
        "",
        "# 输出要求",
        "- 结果必须像一个有意为之的单一作品，而非拼贴。",
        "- 识别概念之间的连接线索并使其成为核心。",
        "- 平衡视觉权重，避免某个概念无意地主导全局。",
        SAFETY_DIRECTIVES.zh
      ].join("\n");
}

export function buildVariantGenerationPrompt(lang, { basePrompt, variantAxes, count = 3 }) {
  return lang === "en"
    ? [
        "# Role",
        "You are a creative variation generator.",
        "",
        "# Mission",
        `Generate ${count} distinct variations of the base concept, each exploring a different axis of change.`,
        "",
        "# Base Concept",
        basePrompt,
        "",
        "# Variation Axes",
        ...variantAxes.map((axis, i) => `${i + 1}. ${axis}`),
        "",
        jsonSchemaContract("en", [
          "{",
          '  "variants": [',
          '    { "id": "v1", "title": "Variant title", "description": "What changes and why", "prompt": "Full generation prompt" }',
          "  ]",
          "}"
        ]),
        "",
        "- Each variant must be clearly different from the base and from each other.",
        "- Preserve the core essence while pushing one axis to a new extreme.",
        "- Include a brief rationale for each creative choice.",
        SAFETY_DIRECTIVES.en
      ].join("\n")
    : [
        "# 角色",
        "你是创意变体生成器。",
        "",
        "# 使命",
        `基于基础概念生成 ${count} 个不同的变体，每个探索一个不同的变化维度。`,
        "",
        "# 基础概念",
        basePrompt,
        "",
        "# 变化维度",
        ...variantAxes.map((axis, i) => `${i + 1}. ${axis}`),
        "",
        jsonSchemaContract("zh", [
          "{",
          '  "variants": [',
          '    { "id": "v1", "title": "变体标题", "description": "改变了什么以及为什么", "prompt": "完整生成提示词" }',
          "  ]",
          "}"
        ]),
        "",
        "- 每个变体必须与基础和彼此明显不同。",
        "- 保留核心本质，同时将一个维度推向新的极端。",
        "- 为每个创意选择包含简短的理由。",
        SAFETY_DIRECTIVES.zh
      ].join("\n");
}

export function buildMultimodalCreativePrompt(lang, { mediums, narrativeGoal, sensoryFocus }) {
  return lang === "en"
    ? [
        "# Role",
        "You are a multimodal creative director.",
        "",
        "# Mission",
        "Design a creative concept that spans multiple mediums (visual, textual, sonic, spatial) with a unified narrative thread.",
        "",
        "# Mediums",
        mediums.join(", "),
        "",
        "# Narrative Goal",
        narrativeGoal,
        "",
        "# Sensory Focus",
        sensoryFocus || "Emphasize atmosphere, texture, and emotional resonance across all mediums.",
        "",
        "# Output Requirements",
        "- Describe how each medium contributes to the whole.",
        "- Identify cross-medium motifs and transitions.",
        "- Suggest specific tools or techniques for each medium.",
        "- Provide a unified creative brief (1-2 paragraphs) that ties everything together.",
        SAFETY_DIRECTIVES.en
      ].join("\n")
    : [
        "# 角色",
        "你是多模态创意总监。",
        "",
        "# 使命",
        "设计一个跨越多种媒介（视觉、文本、声音、空间）的创意概念，保持统一的叙事线索。",
        "",
        "# 媒介",
        mediums.join("、"),
        "",
        "# 叙事目标",
        narrativeGoal,
        "",
        "# 感官焦点",
        sensoryFocus || "强调所有媒介间的大气感、质感和情感共鸣。",
        "",
        "# 输出要求",
        "- 描述每种媒介如何为整体做出贡献。",
        "- 识别跨媒介的主题和过渡。",
        "- 为每种媒介建议具体的工具或技术。",
        "- 提供统一的创意简报（1-2段），将所有内容串联起来。",
        SAFETY_DIRECTIVES.zh
      ].join("\n");
}
