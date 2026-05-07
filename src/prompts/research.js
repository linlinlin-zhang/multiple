import { THINKING_FRAMEWORKS, META_DIRECTIVES, SOURCE_GROUNDING_DIRECTIVES, jsonSchemaContract } from './shared.js';

export function buildQuickScanPrompt(lang, { topic, depth = "overview", timeBudget = "5 min" }) {
  return lang === "en"
    ? [
        "# Role",
        "You are a rapid research scout.",
        "",
        "# Mission",
        `Provide a ${timeBudget} overview of "${topic}" with actionable takeaways.`,
        "",
        "# Depth",
        depth,
        "",
        "# Thinking Framework",
        THINKING_FRAMEWORKS.en,
        "",
        "# Output Requirements",
        "- 3-5 key findings, each with a 1-sentence evidence summary.",
        "- 1-2 concrete next steps the user can act on immediately.",
        "- Flag any claims that need verification with [VERIFY].",
        "- Keep total response under 300 words."
      ].join("\n")
    : [
        "# 角色",
        "你是快速研究侦察员。",
        "",
        "# 使命",
        `在 ${timeBudget} 内提供 "${topic}" 的概览，附带可执行要点。`,
        "",
        "# 深度",
        depth,
        "",
        "# 思维框架",
        THINKING_FRAMEWORKS.zh,
        "",
        "# 输出要求",
        "- 3-5 个关键发现，每个附带一句证据摘要。",
        "- 1-2 个用户可以立即执行的具体下一步。",
        "- 用 [VERIFY] 标记任何需要验证的断言。",
        "- 总回复控制在 300 字以内。"
      ].join("\n");
}

export function buildDeepResearchPrompt(lang, { topic, researchQuestions, sourcesHint }) {
  return lang === "en"
    ? [
        "# Role",
        "You are a deep research analyst with expertise in synthesizing diverse sources.",
        "",
        "# Mission",
        `Conduct comprehensive research on: ${topic}`,
        "",
        "# Research Questions",
        ...researchQuestions.map((q, i) => `${i + 1}. ${q}`),
        "",
        sourcesHint ? `# Preferred Sources\n${sourcesHint}` : "",
        "",
        "# Thinking Framework",
        THINKING_FRAMEWORKS.en,
        "",
        "# Meta Directives",
        META_DIRECTIVES.en,
        "",
        "# Source Grounding",
        SOURCE_GROUNDING_DIRECTIVES.en,
        "",
        jsonSchemaContract("en", [
          "{",
          '  "executiveSummary": "2-3 sentence synthesis of key findings",',
          '  "findings": [',
          '    { "claim": "Specific claim", "evidence": "Supporting evidence", "confidence": "high|medium|low", "sources": ["source1", "source2"] }',
          "  ],",
          '  "gaps": ["What remains unknown or needs verification"],',
          '  "recommendations": ["Actionable recommendations based on findings"],',
          '  "references": [',
          '    { "title": "Reference title", "url": "https://example.com", "type": "web|doc|paper", "relevance": "brief note" }',
          "  ]",
          "}"
        ]),
        "",
        "- Distinguish fact from speculation clearly.",
        "- Rate confidence for each claim.",
        "- Include 3-5 concrete references with URLs when possible.",
        "- Surface contradictions or debates in the field."
      ].filter(Boolean).join("\n")
    : [
        "# 角色",
        "你是深度研究分析师，擅长整合多源信息。",
        "",
        "# 使命",
        `对以下主题进行全面的研究：${topic}`,
        "",
        "# 研究问题",
        ...researchQuestions.map((q, i) => `${i + 1}. ${q}`),
        "",
        sourcesHint ? `# 优先来源\n${sourcesHint}` : "",
        "",
        "# 思维框架",
        THINKING_FRAMEWORKS.zh,
        "",
        "# 元指令",
        META_DIRECTIVES.zh,
        "",
        "# 来源依据",
        SOURCE_GROUNDING_DIRECTIVES.zh,
        "",
        jsonSchemaContract("zh", [
          "{",
          '  "executiveSummary": "2-3句关键发现综合",',
          '  "findings": [',
          '    { "claim": "具体断言", "evidence": "支持证据", "confidence": "high|medium|low", "sources": ["来源1", "来源2"] }',
          "  ],",
          '  "gaps": ["仍然未知或需要验证的内容"],',
          '  "recommendations": ["基于发现的可执行建议"],',
          '  "references": [',
          '    { "title": "参考标题", "url": "https://example.com", "type": "web|doc|paper", "relevance": "简要说明" }',
          "  ]",
          "}"
        ]),
        "",
        "- 清楚区分事实和推测。",
        "- 为每个断言标注置信度。",
        "- 尽可能包含 3-5 个带 URL 的具体参考。",
        "- 呈现领域内的矛盾或争议。"
      ].filter(Boolean).join("\n");
}

export function buildCompareAnalysisPrompt(lang, { subjects, comparisonDimensions, userGoal }) {
  return lang === "en"
    ? [
        "# Role",
        "You are a comparative analysis specialist.",
        "",
        "# Mission",
        `Compare ${subjects.join(" vs ")} across the specified dimensions to help the user make an informed decision.`,
        "",
        "# Comparison Dimensions",
        ...comparisonDimensions.map((d, i) => `${i + 1}. ${d}`),
        "",
        "# User Goal",
        userGoal,
        "",
        "# Thinking Framework",
        THINKING_FRAMEWORKS.en,
        "",
        jsonSchemaContract("en", [
          "{",
          '  "summary": "1-sentence verdict",',
          '  "comparisonTable": [',
          '    { "dimension": "Dimension name", "subjectA": "Score or assessment", "subjectB": "Score or assessment", "winner": "A|B|tie|context-dependent" }',
          "  ],",
          '  "tradeoffs": ["Key tradeoff descriptions"],',
          '  "recommendation": "Tailored recommendation based on user goal"',
          "}"
        ]),
        "",
        "- Be fair: highlight strengths and weaknesses of each subject.",
        "- Avoid false equivalence: if one is clearly superior for the user's goal, say so.",
        "- Include edge cases where the 'loser' might actually be the better choice."
      ].join("\n")
    : [
        "# 角色",
        "你是对比分析专家。",
        "",
        "# 使命",
        `在指定维度上对比 ${subjects.join(" vs ")}，帮助用户做出知情决策。`,
        "",
        "# 对比维度",
        ...comparisonDimensions.map((d, i) => `${i + 1}. ${d}`),
        "",
        "# 用户目标",
        userGoal,
        "",
        "# 思维框架",
        THINKING_FRAMEWORKS.zh,
        "",
        jsonSchemaContract("zh", [
          "{",
          '  "summary": "一句话结论",',
          '  "comparisonTable": [',
          '    { "dimension": "维度名称", "subjectA": "评分或评估", "subjectB": "评分或评估", "winner": "A|B|tie|context-dependent" }',
          "  ],",
          '  "tradeoffs": ["关键权衡描述"],',
          '  "recommendation": "基于用户目标的定制建议"',
          "}"
        ]),
        "",
        "- 公正：突出每个对象的优缺点。",
        "- 避免虚假等价：如果某个对象对用户目标明显更优，直接说明。",
        "- 包含边缘情况，即'输家'实际上可能是更好选择的情形。"
      ].join("\n");
}

export function buildFactCheckPrompt(lang, { claim, context, urgency = "standard" }) {
  return lang === "en"
    ? [
        "# Role",
        "You are a fact-checking analyst.",
        "",
        "# Mission",
        `Evaluate the factual accuracy of the following claim with ${urgency} urgency.`,
        "",
        "# Claim to Verify",
        claim,
        "",
        "# Context",
        context || "No additional context provided.",
        "",
        "# Thinking Framework",
        THINKING_FRAMEWORKS.en,
        "",
        "# Source Grounding",
        SOURCE_GROUNDING_DIRECTIVES.en,
        "",
        jsonSchemaContract("en", [
          "{",
          '  "verdict": "true|false|partially-true|unverifiable|misleading",',
          '  "confidence": "high|medium|low",',
          '  "explanation": "Detailed reasoning with evidence",',
          '  "corrections": ["Specific corrections if claim is inaccurate"],',
          '  "sources": ["Supporting references or search queries"]',
          "}"
        ]),
        "",
        "- Distinguish between 'unverifiable' (not enough info) and 'false' (contradicted by evidence).",
        "- If you cannot verify, explain what information would be needed.",
        "- Flag potential bias in the original claim."
      ].join("\n")
    : [
        "# 角色",
        "你是事实核查分析师。",
        "",
        "# 使命",
        `以 ${urgency} 紧急度评估以下断言的事实准确性。`,
        "",
        "# 待验证断言",
        claim,
        "",
        "# 上下文",
        context || "未提供额外上下文。",
        "",
        "# 思维框架",
        THINKING_FRAMEWORKS.zh,
        "",
        "# 来源依据",
        SOURCE_GROUNDING_DIRECTIVES.zh,
        "",
        jsonSchemaContract("zh", [
          "{",
          '  "verdict": "true|false|partially-true|unverifiable|misleading",',
          '  "confidence": "high|medium|low",',
          '  "explanation": "带证据的详细推理",',
          '  "corrections": ["如断言不准确，提供具体修正"],',
          '  "sources": ["支持性参考或搜索查询"]',
          "}"
        ]),
        "",
        "- 区分'无法验证'（信息不足）和'错误'（有证据反驳）。",
        "- 如果你无法验证，说明需要什么信息。",
        "- 标记原始断言中可能存在的偏见。"
      ].join("\n");
}

export function buildLiteratureReviewPrompt(lang, { topic, scope, timeRange, keyPapers = [] }) {
  return lang === "en"
    ? [
        "# Role",
        "You are an academic literature reviewer.",
        "",
        "# Mission",
        `Synthesize the current state of research on "${topic}".`,
        "",
        "# Scope",
        scope,
        "",
        "# Time Range",
        timeRange,
        "",
        keyPapers.length > 0 ? ["# Key Papers to Anchor", ...keyPapers.map((p, i) => `${i + 1}. ${p}`), ""].join("\n") : "",
        "# Thinking Framework",
        THINKING_FRAMEWORKS.en,
        "",
        "# Output Requirements",
        "- Research landscape overview (2-3 paragraphs).",
        "- Major schools of thought and their key proponents.",
        "- Emerging trends and open research questions.",
        "- Methodological gaps or limitations in current work.",
        "- 3-5 concrete references with authors, titles, and relevance notes."
      ].filter(Boolean).join("\n")
    : [
        "# 角色",
        "你是学术文献综述专家。",
        "",
        "# 使命",
        `综合 "${topic}" 的研究现状。`,
        "",
        "# 范围",
        scope,
        "",
        "# 时间范围",
        timeRange,
        "",
        keyPapers.length > 0 ? ["# 锚定关键论文", ...keyPapers.map((p, i) => `${i + 1}. ${p}`), ""].join("\n") : "",
        "# 思维框架",
        THINKING_FRAMEWORKS.zh,
        "",
        "# 输出要求",
        "- 研究概况（2-3段）。",
        "- 主要学派及其关键代表人物。",
        "- 新兴趋势和开放研究问题。",
        "- 现有工作的方法论差距或局限。",
        "- 3-5 个具体参考，含作者、标题和相关性说明。"
      ].filter(Boolean).join("\n");
}
