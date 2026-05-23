export function extractReferencesFromObject(value) {
  const references = [];
  walkJson(value, (item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return;
    if (typeof item.output === "string" && /image_search|web_search_image|web_search|web_extractor|search|extractor/i.test(String(item.type || ""))) {
      try {
        const parsedOutput = JSON.parse(item.output);
        references.push(...extractReferencesFromObject(parsedOutput));
      } catch {
        references.push(...extractReferencesFromText(item.output));
      }
    }
    const url = item.url || item.link || item.uri || item.source_url || item.sourceUrl || item.page_url || item.pageUrl;
    const imageUrl = item.image_url || item.imageUrl || item.img_url || item.imgUrl || item.image || item.thumbnail || item.thumbnail_url || item.thumbnailUrl || item.original_url || item.originalUrl;
    const sourceUrl = item.source_url || item.sourceUrl || item.page_url || item.pageUrl || url;
    if (typeof url === "string" || typeof imageUrl === "string") {
      references.push({
        title: stringOr(item.title || item.name || item.site_name || item.siteName, ""),
        description: stringOr(item.description || item.snippet || item.summary || item.content, ""),
        url: stringOr(url || sourceUrl || imageUrl, ""),
        sourceUrl: stringOr(sourceUrl || url, ""),
        imageUrl: stringOr(imageUrl, ""),
        type: imageUrl ? "image" : "web"
      });
    }
  });
  return references.filter((reference) => reference.url && !reference.url.startsWith("data:"));
}

export function extractReferencesFromText(text) {
  if (typeof text !== "string" || !text) return [];
  const urls = text.match(/https?:\/\/[^\s)）\]】"'<>]+/g) || [];
  return urls.map((url) => ({
    title: url,
    description: "",
    url,
    sourceUrl: url,
    imageUrl: "",
    type: /\.(png|jpe?g|webp|gif)(?:$|[?#])/i.test(url) ? "image" : "web"
  }));
}

export function dedupeReferences(references) {
  const seen = new Set();
  const result = [];
  for (const reference of references || []) {
    const imageUrl = stringOr(reference?.imageUrl, "").trim();
    const url = stringOr(reference?.url || reference?.sourceUrl || imageUrl, "").trim();
    const key = imageUrl || url;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push({
      title: stringOr(reference.title, "").slice(0, 120),
      description: stringOr(reference.description, "").slice(0, 500),
      url: url || imageUrl,
      sourceUrl: stringOr(reference.sourceUrl || url, "").slice(0, 512),
      imageUrl: imageUrl.slice(0, 512),
      type: reference.type === "image" || imageUrl ? "image" : "web"
    });
  }
  return result;
}

export function walkJson(value, visitor, seen = new Set()) {
  if (!value || typeof value !== "object") return;
  if (seen.has(value)) return;
  seen.add(value);
  visitor(value);
  if (Array.isArray(value)) {
    value.forEach((item) => walkJson(item, visitor, seen));
  } else {
    Object.values(value).forEach((item) => walkJson(item, visitor, seen));
  }
}

function stringOr(value, fallback) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}
