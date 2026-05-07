export const AGENT_SKILLS = [
  {
    id: "generalist",
    label: { zh: "通用执行", en: "Generalist" },
    roles: ["worker", "synthesizer"],
    when: { zh: "跨领域任务、综合整理、没有明显专门技能归属的子任务。", en: "Cross-domain work, synthesis, and tasks without a clear specialist fit." },
    toolStrategy: { zh: "按任务需要使用画布卡片；只有在需要实时资料、代码计算或视觉能力时才调用对应工具。", en: "Use canvas cards as needed; call web, code, or visual tools only when the task requires them." },
    outputContract: { zh: "给出结论、依据、可执行下一步和不确定性。", en: "Return conclusions, rationale, next actions, and uncertainties." },
    canvasActions: ["create_note", "create_plan", "create_todo"],
    toolFlags: {}
  },
  {
    id: "research",
    label: { zh: "研究检索", en: "Research" },
    roles: ["researcher", "source scout", "fact checker"],
    when: { zh: "需要来源、资料、网页、论文、政策、价格、时间、官方信息或事实核查。", en: "Needs sources, web pages, papers, policy, price, schedule, official information, or fact checking." },
    toolStrategy: { zh: "优先联网搜索和网页提取；区分来源事实与推断；保存关键来源卡和引用摘录。", en: "Prefer web search and web extraction; separate source facts from inference; save key source cards and quotes." },
    outputContract: { zh: "返回发现摘要、来源列表、可信度、局限性和后续检索 query。", en: "Return findings, source list, confidence, limitations, and follow-up queries." },
    canvasActions: ["create_web_card", "create_quote", "create_note", "create_table"],
    toolFlags: { webSearch: true, webExtractor: true }
  },
  {
    id: "analysis",
    label: { zh: "数据分析", en: "Analysis" },
    roles: ["data analyst", "analyst", "metric analyst"],
    when: { zh: "需要数据整理、表格、指标、计算、统计、对比矩阵或代码解释器。", en: "Needs data structuring, tables, metrics, calculations, statistics, comparison matrices, or code interpreter." },
    toolStrategy: { zh: "优先结构化数据；需要计算时使用代码解释器；把结论沉淀成 table/metric/comparison。", en: "Structure data first; use code interpreter for calculations; preserve results as table, metric, or comparison cards." },
    outputContract: { zh: "返回方法、结果表、关键指标、假设、异常值和验证方式。", en: "Return method, result table, key metrics, assumptions, outliers, and validation steps." },
    canvasActions: ["create_table", "create_metric", "create_comparison", "create_code"],
    toolFlags: { codeInterpreter: true }
  },
  {
    id: "planning",
    label: { zh: "规划执行", en: "Planning" },
    roles: ["planner", "project manager", "operator"],
    when: { zh: "需要拆解目标、阶段、里程碑、清单、流程、路线图或执行计划。", en: "Needs goal decomposition, phases, milestones, checklists, workflows, roadmaps, or execution plans." },
    toolStrategy: { zh: "把复杂目标拆成总览计划、待办、时间线、风险和资源卡。", en: "Split complex goals into overview plans, todos, timelines, risks, and resource cards." },
    outputContract: { zh: "返回目标、假设、阶段、依赖、风险、下一步和验收标准。", en: "Return goals, assumptions, phases, dependencies, risks, next actions, and acceptance criteria." },
    canvasActions: ["create_plan", "create_todo", "create_timeline", "create_note"],
    toolFlags: {}
  },
  {
    id: "critique",
    label: { zh: "批判审查", en: "Critique" },
    roles: ["critic", "qa", "reviewer", "risk analyst"],
    when: { zh: "需要找漏洞、风险、反例、质量检查、安全边界或改进建议。", en: "Needs gaps, risks, counterexamples, QA, safety boundaries, or improvement recommendations." },
    toolStrategy: { zh: "从假设、证据、边界、用户目标和失败模式审查；必要时生成修复清单。", en: "Review assumptions, evidence, boundaries, user goals, and failure modes; create remediation checklists when useful." },
    outputContract: { zh: "返回高/中/低风险、原因、影响、修复建议和未决问题。", en: "Return high/medium/low risks, reasons, impact, fixes, and open questions." },
    canvasActions: ["create_comparison", "create_todo", "create_note", "create_metric"],
    toolFlags: {}
  },
  {
    id: "writing",
    label: { zh: "写作产出", en: "Writing" },
    roles: ["writer", "editor", "copywriter"],
    when: { zh: "需要文案、报告、提纲、润色、改写、脚本、故事或多版本表达。", en: "Needs copy, reports, outlines, polishing, rewriting, scripts, stories, or variants." },
    toolStrategy: { zh: "先产出可用草稿，再给语气、结构、变体和修改建议。", en: "Draft usable text first, then provide tone, structure, variants, and revision suggestions." },
    outputContract: { zh: "返回成稿、结构说明、可选版本和下一轮修改方向。", en: "Return draft, structure notes, optional variants, and next revision directions." },
    canvasActions: ["create_note", "create_table", "create_comparison"],
    toolFlags: {}
  },
  {
    id: "visual",
    label: { zh: "视觉创意", en: "Visual" },
    roles: ["visual director", "image director", "designer"],
    when: { zh: "需要视觉方向、参考图、分镜、风格、图片生成 prompt、视频生成或图像评审。", en: "Needs visual direction, references, storyboards, style, image prompts, video generation, or image critique." },
    toolStrategy: { zh: "结合选中图像和画布语境；可搜索参考图、生成图片/视频，并沉淀视觉 prompt。", en: "Use selected images and canvas context; search visual references, generate images/videos, and preserve visual prompts." },
    outputContract: { zh: "返回视觉目标、构图/风格、参考建议、生成 prompt 和迭代方向。", en: "Return visual goal, composition/style, references, generation prompt, and iteration directions." },
    canvasActions: ["image_search", "generate_image", "generate_video", "create_note", "create_comparison"],
    toolFlags: { webSearch: true }
  },
  {
    id: "implementation",
    label: { zh: "代码实现", en: "Implementation" },
    roles: ["engineer", "developer", "debugger", "integrator"],
    when: { zh: "需要实现功能、排查 bug、设计接口、拆解技术方案、检查代码风险或准备测试。", en: "Needs feature implementation, bug diagnosis, API design, technical decomposition, code risk review, or test planning." },
    toolStrategy: { zh: "先界定目标和约束，再拆成可验证改动；优先产出代码片段、接口契约、测试清单和回滚风险。", en: "Clarify goals and constraints first, then split into verifiable changes; prefer code snippets, API contracts, test checklists, and rollback risks." },
    outputContract: { zh: "返回实现方案、关键文件/模块、伪代码或代码、测试方式、风险和未决问题。", en: "Return implementation plan, key files/modules, pseudocode or code, tests, risks, and open questions." },
    canvasActions: ["create_code", "create_plan", "create_todo", "create_note"],
    toolFlags: { codeInterpreter: true }
  },
  {
    id: "product",
    label: { zh: "产品体验", en: "Product UX" },
    roles: ["product strategist", "ux researcher", "interaction designer"],
    when: { zh: "需要澄清需求、用户旅程、交互流程、功能优先级、验收标准或产品风险。", en: "Needs requirements, user journeys, interaction flows, feature prioritization, acceptance criteria, or product risk analysis." },
    toolStrategy: { zh: "围绕用户目标、场景、边界和失败路径组织；把结论沉淀成流程、对比、需求和验收卡。", en: "Organize around user goals, scenarios, boundaries, and failure paths; preserve findings as flow, comparison, requirement, and acceptance cards." },
    outputContract: { zh: "返回目标用户、核心场景、用户流程、优先级、验收标准、风险和下一步。", en: "Return target users, core scenarios, user flow, priorities, acceptance criteria, risks, and next steps." },
    canvasActions: ["create_plan", "create_comparison", "create_todo", "create_table", "create_note"],
    toolFlags: {}
  },
  {
    id: "knowledge",
    label: { zh: "知识整理", en: "Knowledge Synthesis" },
    roles: ["knowledge curator", "summarizer", "librarian"],
    when: { zh: "需要整理长文档、会议记录、资料库、学习材料、术语表、分类体系或知识地图。", en: "Needs long-document synthesis, meeting notes, source libraries, learning material, glossaries, taxonomies, or knowledge maps." },
    toolStrategy: { zh: "先聚类主题和证据，再抽取定义、引用、时间线、关系和待补资料；避免把推断当事实。", en: "Cluster themes and evidence first, then extract definitions, quotes, timelines, relationships, and missing sources; avoid treating inference as fact." },
    outputContract: { zh: "返回结构化摘要、主题分类、关键引用、概念关系、未决问题和后续阅读建议。", en: "Return structured summary, taxonomy, key quotes, concept relationships, open questions, and follow-up reading." },
    canvasActions: ["create_note", "create_table", "create_quote", "create_timeline", "create_comparison"],
    toolFlags: { webExtractor: true }
  }
];

export const AGENT_SKILL_IDS = AGENT_SKILLS.map((skill) => skill.id);

const AGENT_SKILL_BY_ID = new Map(AGENT_SKILLS.map((skill) => [skill.id, skill]));

const AGENT_SKILL_ALIASES = new Map([
  ["auto", ""],
  ["general", "generalist"],
  ["worker", "generalist"],
  ["synthesizer", "generalist"],
  ["researcher", "research"],
  ["source", "research"],
  ["fact", "research"],
  ["data", "analysis"],
  ["analyst", "analysis"],
  ["metric", "analysis"],
  ["planner", "planning"],
  ["plan", "planning"],
  ["pm", "planning"],
  ["critic", "critique"],
  ["qa", "critique"],
  ["review", "critique"],
  ["risk", "critique"],
  ["writer", "writing"],
  ["editor", "writing"],
  ["copywriter", "writing"],
  ["visual", "visual"],
  ["designer", "visual"],
  ["image", "visual"],
  ["engineer", "implementation"],
  ["developer", "implementation"],
  ["debugger", "implementation"],
  ["code", "implementation"],
  ["implementation", "implementation"],
  ["product", "product"],
  ["ux", "product"],
  ["pm", "product"],
  ["knowledge", "knowledge"],
  ["summary", "knowledge"],
  ["summarizer", "knowledge"],
  ["taxonomy", "knowledge"],
  ["通用", "generalist"],
  ["综合", "generalist"],
  ["研究", "research"],
  ["检索", "research"],
  ["资料", "research"],
  ["数据", "analysis"],
  ["分析", "analysis"],
  ["规划", "planning"],
  ["计划", "planning"],
  ["执行", "planning"],
  ["批判", "critique"],
  ["审查", "critique"],
  ["质检", "critique"],
  ["风险", "critique"],
  ["写作", "writing"],
  ["文案", "writing"],
  ["编辑", "writing"],
  ["视觉", "visual"],
  ["设计", "visual"],
  ["图片", "visual"],
  ["代码", "implementation"],
  ["实现", "implementation"],
  ["开发", "implementation"],
  ["调试", "implementation"],
  ["接口", "implementation"],
  ["产品", "product"],
  ["体验", "product"],
  ["交互", "product"],
  ["需求", "product"],
  ["知识", "knowledge"],
  ["整理", "knowledge"],
  ["总结", "knowledge"],
  ["分类", "knowledge"],
  ["术语", "knowledge"]
]);

export function getAgentSkill(skillId) {
  return AGENT_SKILL_BY_ID.get(skillId) || AGENT_SKILL_BY_ID.get("generalist");
}

export function agentSkillLabel(skillId, lang = "zh") {
  const skill = getAgentSkill(skillId);
  return skill.label?.[lang === "en" ? "en" : "zh"] || skill.id;
}

export function normalizeAgentSkillId(value) {
  const raw = String(value || "").normalize("NFKC").trim().toLowerCase();
  if (!raw) return "";
  if (AGENT_SKILL_BY_ID.has(raw)) return raw;
  return AGENT_SKILL_ALIASES.get(raw) || "";
}

export function inferAgentSkill(role = "", text = "") {
  const haystack = `${role} ${text}`.normalize("NFKC").toLowerCase();
  if (/research|source|fact|citation|reference|web|paper|policy|official|latest|资料|来源|研究|检索|引用|论文|政策|官方|最新/.test(haystack)) return "research";
  if (/data|metric|table|stat|csv|xlsx|calculate|analysis|数据|指标|表格|统计|计算|分析/.test(haystack)) return "analysis";
  if (/plan|planner|roadmap|workflow|schedule|milestone|todo|执行|规划|计划|路线图|流程|日程|里程碑|清单/.test(haystack)) return "planning";
  if (/critic|critique|qa|review|risk|test|审查|批判|质检|风险|漏洞|反例|测试/.test(haystack)) return "critique";
  if (/write|writer|editor|copy|draft|article|script|文案|写作|编辑|草稿|文章|脚本|润色/.test(haystack)) return "writing";
  if (/product|ux|user journey|requirement|acceptance criteria|feature|priority|产品|体验|交互|用户旅程|需求|验收|功能|优先级/.test(haystack)) return "product";
  if (/code|implement|developer|debug|bug|api|sdk|integration|refactor|代码|实现|开发|调试|缺陷|接口|集成|重构/.test(haystack)) return "implementation";
  if (/knowledge|summari[sz]e|taxonomy|glossary|organize|meeting notes|知识|总结|摘要|整理|分类|术语|会议纪要|知识图谱/.test(haystack)) return "knowledge";
  if (/visual|image|design|style|storyboard|video|prompt|视觉|图片|图像|设计|风格|分镜|视频/.test(haystack)) return "visual";
  return "generalist";
}

export function normalizeAgentSkill(value, role = "", text = "") {
  return normalizeAgentSkillId(value) || inferAgentSkill(role, text);
}

export function agentSkillToolFlags(skillId) {
  return { ...(getAgentSkill(skillId).toolFlags || {}) };
}

export function formatAgentSkillDirectory(lang = "zh") {
  const key = lang === "en" ? "en" : "zh";
  return AGENT_SKILLS.map((skill) => [
    `- ${skill.id} (${skill.label[key]})`,
    `  Roles: ${skill.roles.join(", ")}`,
    `  When: ${skill.when[key]}`,
    `  Tools: ${skill.toolStrategy[key]}`,
    `  Output: ${skill.outputContract[key]}`,
    `  Canvas actions: ${skill.canvasActions.join(", ")}`
  ].join("\n")).join("\n");
}

export function formatAgentSkillBrief(skillId, lang = "zh") {
  const key = lang === "en" ? "en" : "zh";
  const skill = getAgentSkill(skillId);
  return [
    `Agent skill: ${skill.id} (${skill.label[key]})`,
    `Typical roles: ${skill.roles.join(", ")}`,
    `When to use: ${skill.when[key]}`,
    `Tool strategy: ${skill.toolStrategy[key]}`,
    `Output contract: ${skill.outputContract[key]}`,
    `Preferred canvas actions: ${skill.canvasActions.join(", ")}`
  ].join("\n");
}
