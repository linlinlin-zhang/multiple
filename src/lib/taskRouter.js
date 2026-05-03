import { buildAnalysisPrompt, buildExplorePrompt, buildUrlAnalysisPrompt, buildTextAnalysisPrompt } from '../prompts/index.js';

const TASK_TYPES = ['image_generation', 'research', 'planning', 'creative', 'content', 'tool', 'general'];

function buildClassificationPrompt({ content, contentType, fileName, lang }) {
  const preview = content ? String(content).slice(0, 2000) : '';
  const isImage = contentType?.startsWith('image/') || String(content).startsWith('data:image/');

  if (lang === 'en') {
    return [
      '# Task',
      'Classify the uploaded content into exactly one task type.',
      '',
      '# Available Types',
      TASK_TYPES.map(t => `- "${t}"`).join('\n'),
      '',
      '# Definitions',
      '- "image_generation" — the user wants to generate, edit, or transform images.',
      '- "research" — the user wants to investigate, analyze data, or gather information.',
      '- "planning" — the user wants a structured plan, schedule, workflow, or roadmap.',
      '- "creative" — the user wants creative writing, brainstorming, or artistic exploration.',
      '- "content" — the user wants text content like articles, summaries, scripts, or reports.',
      '- "tool" — the user wants to use an external tool (weather, map, translation, code execution).',
      '- "general" — none of the above clearly apply, or the intent is ambiguous.',
      '',
      '# Content Preview',
      `fileName: ${fileName || 'unknown'}`,
      `contentType: ${contentType || 'unknown'}`,
      `isImage: ${isImage}`,
      '',
      preview ? `Content (first 2000 chars):\n${preview}` : 'No text preview available for this content.',
      '',
      '# Output Format',
      'Return ONLY a JSON object with these exact keys (no markdown, no explanation):',
      '{',
      '  "taskType": "one of the available types",',
      '  "confidence": 0.0 to 1.0,',
      '  "rationale": "1-2 sentence explanation of why this type was chosen"',
      '}'
    ].join('\n');
  }

  return [
    '# 任务',
    '将上传的内容分类到唯一的任务类型。',
    '',
    '# 可选类型',
    TASK_TYPES.map(t => `- "${t}"`).join('\n'),
    '',
    '# 定义',
    '- "image_generation" — 用户想要生成、编辑或转换图片。',
    '- "research" — 用户想要调查、分析数据或收集信息。',
    '- "planning" — 用户想要结构化计划、日程、工作流或路线图。',
    '- "creative" — 用户想要创意写作、头脑风暴或艺术探索。',
    '- "content" — 用户想要文本内容，如文章、摘要、脚本或报告。',
    '- "tool" — 用户想要使用外部工具（天气、地图、翻译、代码执行）。',
    '- "general" — 以上都不明确适用，或意图模糊。',
    '',
    '# 内容预览',
    `fileName: ${fileName || 'unknown'}`,
    `contentType: ${contentType || 'unknown'}`,
    `isImage: ${isImage}`,
    '',
    preview ? `内容（前2000字符）：\n${preview}` : '此内容没有可用的文本预览。',
    '',
    '# 输出格式',
    '仅返回一个 JSON 对象，包含以下精确键（不要 markdown，不要解释）：',
    '{',
    '  "taskType": "可选类型之一",',
    '  "confidence": 0.0 到 1.0 的数字,',
    '  "rationale": "1-2句话解释为什么选择此类型"',
    '}'
  ].join('\n');
}

async function callChatCompletion(config, payload, timeoutMs = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: config.model,
        ...payload
      }),
      signal: controller.signal
    });
    const text = await response.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }
    if (!response.ok) {
      const detail = json?.error?.message || text || response.statusText;
      throw new Error(`Classification API ${response.status}: ${detail}`);
    }
    return json;
  } finally {
    clearTimeout(timer);
  }
}

function collectContent(response) {
  const choice = response?.choices?.[0];
  return choice?.message?.content || choice?.message?.reasoning_content || '';
}

function parseJsonFromText(text) {
  const cleaned = String(text || '').replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    try {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]);
    } catch {}
    return null;
  }
}

export async function classifyContent({ content, contentType, fileName, lang, config }) {
  if (!config || !config.apiKey) {
    throw new Error('classifyContent requires a valid config with apiKey');
  }

  const prompt = buildClassificationPrompt({ content, contentType, fileName, lang });
  const payload = {
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 256
  };

  const response = await callChatCompletion(config, payload, 30000);
  const text = collectContent(response);
  const parsed = parseJsonFromText(text);

  if (!parsed || !parsed.taskType) {
    return {
      taskType: 'general',
      confidence: 0,
      rationale: 'LLM response did not contain valid classification JSON'
    };
  }

  const taskType = TASK_TYPES.includes(parsed.taskType) ? parsed.taskType : 'general';
  const confidence = typeof parsed.confidence === 'number'
    ? Math.max(0, Math.min(1, parsed.confidence))
    : 0.5;

  return {
    taskType,
    confidence,
    rationale: String(parsed.rationale || '').slice(0, 300)
  };
}

export function getFallbackTaskType({ contentType, fileName }) {
  const ct = String(contentType || '').toLowerCase();
  const fn = String(fileName || '').toLowerCase();

  if (ct.startsWith('image/')) return { taskType: 'image_generation' };
  if (ct === 'application/pdf') return { taskType: 'research' };
  if (ct.startsWith('text/')) return { taskType: 'research' };
  if (ct.startsWith('application/vnd.')) return { taskType: 'research' };
  if (ct.startsWith('audio/') || ct.startsWith('video/')) return { taskType: 'content' };

  if (/\.(jpg|jpeg|png|gif|webp|bmp|svg|ico)$/i.test(fn)) return { taskType: 'image_generation' };
  if (/\.(pdf|doc|docx|txt|md|rst|epub|rtf)$/i.test(fn)) return { taskType: 'research' };
  if (/\.(mp3|wav|ogg|flac|mp4|avi|mov|mkv)$/i.test(fn)) return { taskType: 'content' };
  if (/\.(xls|xlsx|csv|json|xml|yaml|yml)$/i.test(fn)) return { taskType: 'research' };
  if (/\.(py|js|ts|java|c|cpp|go|rs|rb|php)$/i.test(fn)) return { taskType: 'tool' };

  return { taskType: 'general' };
}

export function resolveTaskType(classificationResult, fallbackResult, threshold = 0.6) {
  if (classificationResult && classificationResult.confidence >= threshold) {
    return {
      taskType: classificationResult.taskType,
      confidence: classificationResult.confidence,
      wasFallback: false,
      rationale: classificationResult.rationale
    };
  }
  return {
    taskType: fallbackResult?.taskType || 'general',
    confidence: 0,
    wasFallback: true,
    rationale: `Confidence ${classificationResult?.confidence ?? 0} below threshold ${threshold}; using fallback`
  };
}

export function getPromptForTaskType(taskType, lang) {
  switch (taskType) {
    case 'image_generation':
      return () => buildAnalysisPrompt(lang);
    case 'research':
      return () => buildExplorePrompt(lang);
    case 'planning':
      return () => buildAnalysisPrompt(lang);
    case 'creative':
      return () => buildAnalysisPrompt(lang);
    case 'content':
      return () => buildAnalysisPrompt(lang);
    case 'tool':
      return () => buildAnalysisPrompt(lang);
    case 'general':
    default:
      return () => buildAnalysisPrompt(lang);
  }
}

export async function routeContent({ content, contentType, fileName, lang, config }) {
  let classification;
  if (config && config.apiKey) {
    try {
      classification = await classifyContent({ content, contentType, fileName, lang, config });
    } catch (err) {
      console.warn('[routeContent] classification failed:', err.message);
      classification = { taskType: 'general', confidence: 0, rationale: err.message };
    }
  } else {
    classification = { taskType: 'general', confidence: 0, rationale: 'No config provided' };
  }
  const fallback = getFallbackTaskType({ contentType, fileName });
  return resolveTaskType(classification, fallback);
}
