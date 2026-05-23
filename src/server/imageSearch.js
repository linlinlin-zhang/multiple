import { dedupeReferences, extractReferencesFromObject, extractReferencesFromText } from "./references.js";

export function createImageSearchService({
  buildImageSearchConfig,
  extractResponsesText,
  ingestRemoteImageAsUpload,
  qwenResponsesRequest,
  stringOr
}) {
  async function runQwenImageSearch({ config = buildImageSearchConfig(), query, imageDataUrl, lang, limit }) {
    const basePrompt = query || (lang === "en" ? "Find visually similar images and useful visual references." : "搜索相似图片和可参考的视觉素材。");
    const prompt = lang === "en"
      ? `${basePrompt}\n\nUse online image search and return concrete image results with title, thumbnail/image URL, source URL, and short description.`
      : `${basePrompt}\n\n请调用联网图片搜索工具，并返回具体图片结果：标题、缩略图/图片 URL、来源 URL 和简短说明。`;
    const content = [{ type: "input_text", text: prompt }];
    if (imageDataUrl) content.push({ type: "input_image", image_url: imageDataUrl });
    const basePayload = {
      model: config.model,
      input: imageDataUrl ? [{ role: "user", content }] : prompt
    };
    let bestResult = null;
    let lastError;
    const toolTypes = imageDataUrl ? ["image_search", "web_search_image"] : ["web_search_image", "image_search"];
    const toolChoices = ["required", "auto", ""];
    searchLoop:
    for (const toolType of toolTypes) {
      for (const toolChoice of toolChoices) {
        try {
          const payload = {
            ...basePayload,
            tools: [{ type: toolType }]
          };
          if (toolChoice) payload.tool_choice = toolChoice;
          const responseJson = await qwenResponsesRequest(config, payload);
          const summary = extractResponsesText(responseJson);
          const references = dedupeReferences([
            ...extractReferencesFromObject(responseJson),
            ...extractReferencesFromText(summary)
          ]);
          const results = buildImageSearchResults(references, { query: basePrompt, summary, limit });
          const candidate = { responseJson, summary, references, results };
          if (!bestResult || candidate.results.length > bestResult.results.length || (!bestResult.summary && candidate.summary)) {
            bestResult = candidate;
          }
          if (results.length) break searchLoop;
        } catch (error) {
          lastError = error;
        }
      }
    }
    if (!bestResult && lastError) throw lastError;
    const summary = bestResult?.summary || "";
    const results = bestResult?.results || [];

    await Promise.all(results.map(async (result) => {
      const remoteImage = result.imageUrl;
      if (!remoteImage || !/^https?:\/\//i.test(remoteImage)) return;
      const stored = await ingestRemoteImageAsUpload(remoteImage);
      if (stored?.hash) {
        result.imageHash = stored.hash;
        result.localImageUrl = `/api/assets/${stored.hash}?kind=upload`;
        result.mimeType = stored.mimeType;
        result.fileSize = stored.fileSize;
      }
    }));

    return {
      provider: "api",
      model: config.model,
      query: basePrompt,
      summary,
      results
    };
  }

  function buildImageSearchResults(references, { query, summary, limit }) {
    const items = [];
    for (const reference of references || []) {
      const rawUrl = stringOr(reference?.url, "");
      const rawImageUrl = stringOr(reference?.imageUrl, "");
      const imageUrl = rawImageUrl || (isLikelyImageUrl(rawUrl) ? rawUrl : "");
      const sourceUrl = stringOr(reference?.sourceUrl, "") || (rawUrl && rawUrl !== imageUrl ? rawUrl : "") || rawUrl || imageUrl;
      if (!imageUrl && !sourceUrl) continue;
      items.push({
        title: stringOr(reference.title, query || "Image reference").slice(0, 80),
        description: stringOr(reference.description, summary).slice(0, 240),
        imageUrl,
        sourceUrl,
        url: sourceUrl || imageUrl,
        type: "image"
      });
    }
    return items.slice(0, limit).map((item, index) => ({
      id: `image-search-${index + 1}`,
      ...item
    }));
  }

  return {
    buildDemoImageSearchResults,
    runQwenImageSearch
  };
}

function buildDemoImageSearchResults(query, lang = "zh") {
  const zh = lang !== "en";
  return {
    provider: "demo",
    model: "demo",
    query,
    summary: zh ? "演示模式下返回占位视觉参考。" : "Demo image-search references.",
    results: [
      {
        id: "demo-reference-1",
        title: zh ? "视觉参考线索" : "Visual reference lead",
        description: query || (zh ? "围绕当前任务寻找构图、色彩和材质参考。" : "Search composition, color, and material references around the current task."),
        imageUrl: "",
        sourceUrl: "",
        url: "",
        type: "image"
      }
    ]
  };
}

function isLikelyImageUrl(url) {
  const value = typeof url === "string" ? url.trim() : "";
  if (!/^https?:\/\//i.test(value)) return false;
  if (extensionFromUrl(value)) return true;
  try {
    const parsed = new URL(value);
    const text = `${parsed.pathname} ${parsed.search}`.toLowerCase();
    return /(?:image|img|thumb|thumbnail|photo|picture|media)/.test(text)
      && !/\.(?:html?|php|aspx?)(?:$|[?#])/i.test(parsed.pathname);
  } catch {
    return false;
  }
}

function extensionFromUrl(url) {
  try {
    const parsed = new URL(url);
    return extensionFromPath(parsed.pathname);
  } catch {
    return "";
  }
}

function extensionFromPath(value) {
  const match = String(value || "").match(/\.([a-z0-9]{2,5})(?:$|[?#])/i);
  return match ? match[1].toLowerCase() : "";
}
