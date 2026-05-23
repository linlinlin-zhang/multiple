export const REUSABLE_CARD_ACTION_TYPES = ["create_plan", "create_todo", "create_note", "create_code", "create_web_card", "create_link", "create_table", "create_timeline", "create_comparison", "create_metric", "create_quote"];
export const STRUCTURED_CONTENT_ACTION_TYPES = new Set([
  "create_plan", "create_todo", "create_note", "create_weather", "create_map",
  "create_link", "create_web_card", "create_code", "create_table",
  "create_timeline", "create_comparison", "create_metric", "create_quote"
]);
export const WEB_REFERENCE_ACTION_TYPES = new Set(["create_link", "create_web_card"]);

const ACTION_REPLY_TEMPLATES = {
  zh: {
    create_plan: (a) => `已为你创建 plan 卡片${a.title ? `「${a.title}」` : ""},你可以点击下方反馈卡跳转查看。`,
    create_todo: (a) => `已为你创建 todo 清单${a.title ? `「${a.title}」` : ""}。`,
    create_note: (a) => `已为你创建 note 笔记${a.title ? `「${a.title}」` : ""}。`,
    create_weather: (a) => `已为你创建 weather 卡片${a.title ? `「${a.title}」` : ""}。`,
    create_map: (a) => `已为你创建 map 卡片${a.title ? `「${a.title}」` : ""}。`,
    create_link: (a) => `已为你创建 link 卡片${a.title ? `「${a.title}」` : ""}。`,
    create_code: (a) => `已为你创建 code 卡片${a.title ? `「${a.title}」` : ""}。`,
    create_web_card: (a) => `已为你创建 web 卡片${a.title ? `「${a.title}」` : ""}。`,
    create_table: (a) => `已为你创建 table 卡片${a.title ? `「${a.title}」` : ""}。`,
    create_timeline: (a) => `已为你创建 timeline 卡片${a.title ? `「${a.title}」` : ""}。`,
    create_comparison: (a) => `已为你创建 comparison 卡片${a.title ? `「${a.title}」` : ""}。`,
    create_metric: (a) => `已为你创建 metric 卡片${a.title ? `「${a.title}」` : ""}。`,
    create_quote: (a) => `已为你创建 quote 卡片${a.title ? `「${a.title}」` : ""}。`,
    create_card: (a) => `已为你创建卡片${a.title ? `「${a.title}」` : ""}。`,
    new_card: (a) => `已为你创建卡片${a.title ? `「${a.title}」` : ""}。`,
    create_direction: (a) => `已添加方向卡片${a.title ? `「${a.title}」` : ""}。`,
    create_agent: (a) => `已启动子 Agent${a.title ? `「${a.title}」` : ""}，将以 ${a.role || "worker"} 角色执行独立任务。`,
    generate_image: () => "已开始生成图片,稍候请查看画布上的新节点。",
    generate_video: () => "已开始生成视频,稍候请查看画布上的新节点。",
    zoom_in: () => "已放大画布。",
    zoom_out: () => "已缩小画布。",
    reset_view: () => "已重置视图。"
  },
  en: {
    create_plan: (a) => `Created a plan card${a.title ? ` "${a.title}"` : ""}. Click the feedback card below to focus on it.`,
    create_todo: (a) => `Created a todo list${a.title ? ` "${a.title}"` : ""}.`,
    create_note: (a) => `Created a note${a.title ? ` "${a.title}"` : ""}.`,
    create_weather: (a) => `Created a weather card${a.title ? ` "${a.title}"` : ""}.`,
    create_map: (a) => `Created a map card${a.title ? ` "${a.title}"` : ""}.`,
    create_link: (a) => `Created a link card${a.title ? ` "${a.title}"` : ""}.`,
    create_code: (a) => `Created a code card${a.title ? ` "${a.title}"` : ""}.`,
    create_web_card: (a) => `Created a web card${a.title ? ` "${a.title}"` : ""}.`,
    create_table: (a) => `Created a table card${a.title ? ` "${a.title}"` : ""}.`,
    create_timeline: (a) => `Created a timeline card${a.title ? ` "${a.title}"` : ""}.`,
    create_comparison: (a) => `Created a comparison card${a.title ? ` "${a.title}"` : ""}.`,
    create_metric: (a) => `Created a metric card${a.title ? ` "${a.title}"` : ""}.`,
    create_quote: (a) => `Created a quote card${a.title ? ` "${a.title}"` : ""}.`,
    create_card: (a) => `Created a card${a.title ? ` "${a.title}"` : ""}.`,
    new_card: (a) => `Created a card${a.title ? ` "${a.title}"` : ""}.`,
    create_direction: (a) => `Added a direction card${a.title ? ` "${a.title}"` : ""}.`,
    create_agent: (a) => `Started a subagent${a.title ? ` "${a.title}"` : ""} as ${a.role || "worker"}.`,
    generate_image: () => "Image generation started — check the canvas for the new node.",
    generate_video: () => "Video generation started — check the canvas for the new node.",
    zoom_in: () => "Zoomed in.",
    zoom_out: () => "Zoomed out.",
    reset_view: () => "View reset."
  }
};

export function createChatActionReplies({ parseJsonFromText, stringOr }) {
  function extractToolCallActions(response) {
    const toolCalls = response?.choices?.[0]?.message?.tool_calls || [];
    return toolCalls
      .filter((tc) => tc.type === "function" && tc.function?.name === "canvas_action")
      .map((tc) => parseToolArguments(tc.function.arguments))
      .filter(Boolean);
  }

  function parseToolArguments(value) {
    if (value && typeof value === "object" && !Array.isArray(value)) return value;
    const text = String(value || "").trim();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      try {
        return parseJsonFromText(text);
      } catch {
        return null;
      }
    }
  }

  function synthesizeReplyFromActions(actions, lang, references = []) {
    if (!Array.isArray(actions) || actions.length === 0) return "";
    const rich = synthesizeRichActionReply(actions, lang, references);
    if (rich) return rich;
    const templates = ACTION_REPLY_TEMPLATES[lang === "en" ? "en" : "zh"];
    const lines = [];
    for (const action of actions.slice(0, 3)) {
      const tpl = templates[action?.type];
      if (tpl) lines.push(tpl(action));
    }
    return lines.join(" ").slice(0, 400);
  }

  function synthesizeRichActionReply(actions, lang, references = []) {
    const action = actions.find((item) => REUSABLE_CARD_ACTION_TYPES.includes(item?.type));
    if (!action) return "";
    if (action.type === "create_plan") return [synthesizePlanActionReply(action, lang, references), formatActionBundleSection(actions, lang)].filter(Boolean).join("\n\n");
    if (action.type === "create_todo") return synthesizeTodoActionReply(action, lang);
    if (action.type === "create_note") return synthesizeNoteActionReply(action, lang);
    if (action.type === "create_code") return synthesizeCodeActionReply(action, lang);
    if (["create_table", "create_timeline", "create_comparison", "create_metric", "create_quote"].includes(action.type)) return synthesizeStructuredCardReply(action, lang);
    return synthesizeReferenceActionReply(action, lang);
  }

  function planRichReplyItem(item) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return stringOr(item, "");
    return [
      stringOr(item.title || item.name || item.label, ""),
      stringOr(item.description || item.body || item.text || item.summary || item.value, ""),
      stringOr(item.status || item.state, ""),
      stringOr(item.owner || item.role, ""),
      stringOr(item.priority, "")
    ].filter(Boolean).join(" — ");
  }

  function planRichReplySection(title, value) {
    const items = Array.isArray(value) ? value.map(planRichReplyItem).filter(Boolean).slice(0, 8) : [];
    const text = !Array.isArray(value) ? stringOr(value, "") : "";
    if (!items.length && !text) return "";
    return [`## ${title}`, "", items.length ? items.map((item) => `- ${item}`).join("\n") : text].join("\n");
  }

  function synthesizePlanActionReply(action, lang, references = []) {
    const content = action?.content && typeof action.content === "object" ? action.content : {};
    const steps = Array.isArray(content.steps) ? content.steps : [];
    if (!steps.length) return "";
    const title = action.title || (lang === "en" ? "Plan" : "计划");
    const summary = stringOr(content.summary || action.description || action.prompt, "").trim();
    const richSections = lang === "en"
      ? [
          planRichReplySection("Goal", content.goal),
          planRichReplySection("Context", content.context),
          planRichReplySection("Constraints", content.constraints),
          planRichReplySection("Assumptions", content.assumptions),
          planRichReplySection("Validation", content.validation),
          planRichReplySection("Progress", content.progress),
          planRichReplySection("Decisions", content.decisions),
          planRichReplySection("Risks", content.risks),
          planRichReplySection("Outcomes", content.outcomes),
          planRichReplySection("Tips", content.tips)
        ].filter(Boolean)
      : [
          planRichReplySection("目标", content.goal),
          planRichReplySection("背景", content.context),
          planRichReplySection("约束", content.constraints),
          planRichReplySection("假设", content.assumptions),
          planRichReplySection("验证", content.validation),
          planRichReplySection("进展", content.progress),
          planRichReplySection("决策", content.decisions),
          planRichReplySection("风险", content.risks),
          planRichReplySection("产出", content.outcomes),
          planRichReplySection("提醒", content.tips)
        ].filter(Boolean);
    const stepLines = steps.slice(0, 10).map((step, index) => {
      const stepTitle = stringOr(step?.title, `${lang === "en" ? "Step" : "步骤"} ${index + 1}`);
      const detail = stringOr(step?.description || step?.body || step?.text, "").replace(/\s+/g, " ").slice(0, 520);
      return { title: stepTitle, detail, time: stringOr(step?.time, ""), priority: stringOr(step?.priority, "") };
    });
    const tips = Array.isArray(content.tips) ? content.tips.map(planRichReplyItem).filter(Boolean).slice(0, 3) : [];
    if (lang === "en") {
      return [
        `# ${title}`,
        "",
        summary || "I created a reusable plan card and summarized the structured deliverable below.",
        "",
        richSections.join("\n\n"),
        richSections.length ? "" : "",
        "| Section | Focus | Notes |",
        "|---|---|---|",
        ...stepLines.slice(0, 6).map((step, index) => `| ${index + 1} | ${escapeMarkdownTableCell(step.title)} | ${escapeMarkdownTableCell(step.detail || step.time || step.priority)} |`),
        "",
        ...stepLines.map((step, index) => `## ${index + 1}. ${step.title}\n\n${step.detail || "Details are available in the canvas card."}`),
        content.budget ? `\n## Budget\n\n${content.budget}` : "",
        tips.length ? `\n## Practical tips\n\n${tips.map((tip) => `- ${tip}`).join("\n")}` : "",
        formatReferenceSection(references, lang),
        "\nI also created the canvas plan card so you can inspect, rearrange, and iterate each step visually."
      ].filter(Boolean).join("\n");
    }
    return [
      `# ${title}`,
      "",
      summary || "我已创建可复用的 plan 卡片,并把可直接阅读的结构化交付物整理在下面。",
      "",
      richSections.join("\n\n"),
      richSections.length ? "" : "",
      "| 阶段/步骤 | 主题 | 核心内容 |",
      "|---|---|---|",
      ...stepLines.slice(0, 6).map((step, index) => `| ${index + 1} | ${escapeMarkdownTableCell(step.title)} | ${escapeMarkdownTableCell(step.detail || step.time || step.priority)} |`),
      "",
      ...stepLines.map((step, index) => `## ${index + 1}. ${step.title}\n\n${step.detail || "详细内容已写入画布卡片。"}`),
      content.budget ? `\n## 资源/成本参考\n\n${content.budget}` : "",
      tips.length ? `\n## 实用提醒\n\n${tips.map((tip) => `- ${tip}`).join("\n")}` : "",
      formatReferenceSection(references, lang),
      "\n我也已同步创建画布 plan 卡片,方便你继续在画布上按阶段/步骤细化、重排和迭代。"
    ].filter(Boolean).join("\n");
  }

  function synthesizeTodoActionReply(action, lang) {
    const items = Array.isArray(action?.content?.items) ? action.content.items : [];
    if (!items.length) return "";
    const lines = items.slice(0, 12).map((item) => {
      const text = stringOr(item?.text || item?.title, "").slice(0, 220);
      const rationale = stringOr(item?.rationale, "").slice(0, 220);
      const priority = stringOr(item?.priority, "");
      return text ? `- **${text}**${priority ? ` (${priority})` : ""}${rationale ? `：${rationale}` : ""}` : "";
    }).filter(Boolean);
    return lang === "en"
      ? [`# ${action.title || "Todo"}`, "", "I created a reusable todo card. Here are the actionable items:", "", ...lines].join("\n")
      : [`# ${action.title || "待办"}`, "", "我已创建可复用的 todo 卡片。下面是可执行事项:", "", ...lines].join("\n");
  }

  function synthesizeNoteActionReply(action, lang) {
    const sections = Array.isArray(action?.content?.sections) ? action.content.sections : [];
    const text = stringOr(action?.content?.text || action.description || action.prompt, "").trim();
    if (!text && !sections.length) return "";
    const sectionText = sections.slice(0, 8)
      .map((section) => {
        const title = stringOr(section?.title, "");
        const body = stringOr(section?.body || section?.text || section?.description, "");
        return title || body ? `## ${title || (lang === "en" ? "Section" : "小节")}\n\n${body}` : "";
      })
      .filter(Boolean)
      .join("\n\n");
    const body = sectionText || text;
    return lang === "en"
      ? `# ${action.title || "Note"}\n\n${body.slice(0, 2400)}${body.length > 2400 ? "\n\nOpen the card to continue reading or editing." : ""}`
      : `# ${action.title || "笔记"}\n\n${body.slice(0, 2400)}${body.length > 2400 ? "\n\n可打开卡片继续阅读或编辑。" : ""}`;
  }

  function synthesizeCodeActionReply(action, lang) {
    const content = action?.content && typeof action.content === "object" ? action.content : {};
    const explanation = stringOr(content.explanation || action.description || action.prompt, "").trim();
    if (!explanation && !content.code) return "";
    return lang === "en"
      ? [`Created a code card **${action.title || "Code"}**.`, explanation || "The runnable code is available in the canvas card.", content.usage ? `Usage: ${content.usage}` : ""].filter(Boolean).join("\n\n")
      : [`已创建 code 卡片 **${action.title || "代码"}**。`, explanation || "可运行代码已放在画布卡片中。", content.usage ? `用法: ${content.usage}` : ""].filter(Boolean).join("\n\n");
  }

  function synthesizeReferenceActionReply(action, lang) {
    const title = action.title || action.url || (lang === "en" ? "Reference" : "参考资料");
    const description = stringOr(action.description || action.prompt || action.query, "").trim();
    return lang === "en"
      ? [`Created a reference card **${title}**.`, description].filter(Boolean).join("\n\n")
      : [`已创建参考卡片 **${title}**。`, description].filter(Boolean).join("\n\n");
  }

  function synthesizeStructuredCardReply(action, lang) {
    const type = String(action?.type || "").replace(/^create_/, "");
    const title = action.title || type;
    const description = stringOr(action.description || action.prompt, "").trim();
    return lang === "en"
      ? [`Created a reusable ${type} card **${title}**.`, description || "Open the canvas card to inspect the structured content and continue editing."].join("\n\n")
      : [`已创建可复用的 ${type} 卡片 **${title}**。`, description || "可打开画布卡片查看结构化内容并继续编辑。"].join("\n\n");
  }

  function finalizeChatReply(reply, actions, lang, references = []) {
    const text = String(reply || "").trim();
    if (!Array.isArray(actions) || actions.length === 0) return appendReferencesIfMissing(text, references, lang);
    const planAction = actions.find((action) => action?.type === "create_plan" && Array.isArray(action?.content?.steps) && action.content.steps.length);
    if (planAction && shouldUpgradePlanReply(text, lang)) {
      return appendReferencesIfMissing([synthesizePlanActionReply(planAction, lang, references), formatActionBundleSection(actions, lang)].filter(Boolean).join("\n\n"), references, lang);
    }
    if (isSubstantiveActionReply(text, lang)) return text;
    return appendReferencesIfMissing(synthesizeReplyFromActions(actions, lang, references) || text, references, lang);
  }

  function isInternalPlanningReply(reply) {
    const text = String(reply || "").trim();
    if (!text) return false;
    return /^(the user (is asking|wants|asked)|i need to|i should|we need to|\*\*?plan\*\*?\s*:|plan\s*:)/i.test(text)
      || /^(用户(正在|要求|想要|询问)|我需要|我应该|我们需要|计划\s*[:：]|内部计划\s*[:：])/i.test(text)
      || /\bI will create\b.{0,180}\b(create_|canvas_action|card|node|comparison)\b/is.test(text);
  }

  function visibleChatReplyOrEmpty(reply) {
    return isInternalPlanningReply(reply) ? "" : String(reply || "").trim();
  }

  function formatActionBundleSection(actions, lang) {
    const reusable = Array.isArray(actions)
      ? actions.filter((action) => REUSABLE_CARD_ACTION_TYPES.includes(action?.type))
      : [];
    if (reusable.length <= 1) return "";
    const lines = reusable.slice(0, 8).map((action) => {
      const type = String(action.type || "").replace(/^create_/, "");
      const title = stringOr(action.title || action.url || action.query, type);
      return `- **${type}**: ${title}`;
    });
    return lang === "en"
      ? ["## Canvas card split", "", "I split the reusable work into multiple cards instead of one oversized card:", "", ...lines].join("\n")
      : ["## 画布卡片拆分", "", "我把可复用内容拆成多张卡片,避免塞进一张超长卡:", "", ...lines].join("\n");
  }

  function isSubstantiveActionReply(reply, lang) {
    if (!reply) return false;
    const text = String(reply).trim();
    if (text.length >= 220) return true;
    if (/^#{1,3}\s|\n[-*]\s|\n\d+[.)]\s/.test(text)) return true;
    if (lang === "en") {
      if (/^(sure|okay|ok|let me|i('|’)ll|i will|i can|i('|’)m going to).{0,180}(create|generate|add|make|render|put|split).{0,120}(card|node|canvas|direction|option|image|video|artifact)/is.test(text)) return false;
      return !/^created\s+(a|an|the)?.{0,80}(card|node)/i.test(text);
    }
    if (/^(好的|好|可以|没问题|我来|我会|接下来|马上|我可以|我将).{0,180}(创建|新建|生成|添加|放到|整理|拆成|产出|成图|出图).{0,120}(卡片|节点|画布|方向|方案|图片|视频|产物)/is.test(text)) return false;
    return !/^(已为你创建|已创建|已经创建|已添加).{0,80}(卡片|节点|plan|todo|note|code|web)/i.test(text);
  }

  function shouldUpgradePlanReply(reply, lang) {
    const text = String(reply || "").trim();
    if (!text) return true;
    const hasMarkdownTable = /(^|\n)\|.+\|\s*\n\|[\s:|,-]+\|/m.test(text);
    const sectionCount = (text.match(/^#{1,3}\s+/gm) || []).length;
    const structuredSectionCount = (text.match(/(^|\n)(Step\s*\d+|Phase\s*\d+|Milestone\s*\d+|步骤\s*\d+|阶段\s*\d+|里程碑|目标|假设|风险|下一步|验证|资源|成本)/gi) || []).length;
    const ackPattern = lang === "en"
      ? /^(sure|okay|done|i('|’)ve|i have).{0,260}(created|canvas|card|plan|weather|map)/is
      : /^(好的|好|可以|已|我已|我已经|我来|没问题).{0,260}(创建|画布|卡片|计划|行程|天气|地图)/is;
    if (ackPattern.test(text)) return true;
    if (text.length < 700) return true;
    if (text.length < 1200 && !hasMarkdownTable) return true;
    return !(hasMarkdownTable && (sectionCount >= 2 || structuredSectionCount >= 2 || text.length >= 1200));
  }

  function appendReferencesIfMissing(reply, references = [], lang) {
    const text = String(reply || "").trim();
    if (!text || !Array.isArray(references) || references.length === 0) return text;
    if (/\[ref_\d+\]|\[\d+\]/i.test(text)) return text;
    const section = formatReferenceSection(references, lang);
    return section ? `${text}\n\n${section}` : text;
  }

  function formatReferenceSection(references = [], lang) {
    const usable = Array.isArray(references) ? references.filter((reference) => reference?.url).slice(0, 5) : [];
    if (!usable.length) return "";
    const title = lang === "en" ? "## References" : "## 参考来源";
    const lines = usable.map((reference, index) => {
      const label = stringOr(reference.title || reference.description, reference.url).replace(/\s+/g, " ").slice(0, 120);
      return `- [ref_${index + 1}] ${label}`;
    });
    return [title, "", ...lines].join("\n");
  }

  return {
    extractToolCallActions,
    finalizeChatReply,
    formatReferenceSection,
    synthesizeReplyFromActions,
    visibleChatReplyOrEmpty
  };
}

function escapeMarkdownTableCell(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/\|/g, "\\|")
    .slice(0, 180);
}
