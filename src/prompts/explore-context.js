export function buildExploreContent({ prompt, imageDataUrl, url, pageText, text, dataUrl, fileName, parseDataUrl, extensionFromFileName, extractTextFromBuffer }) {
  const content = [];
  if (imageDataUrl) {
    content.push({ type: "text", text: prompt });
    content.push({ type: "image_url", image_url: { url: imageDataUrl } });
  } else if (url) {
    content.push({
      type: "text",
      text: [
        prompt,
        "",
        `URL: ${url}`,
        pageText
          ? `Fetched page text excerpt:\n${pageText.slice(0, 6000)}`
          : "Server-side page fetch failed. If web search is available, use it to ground references and directions."
      ].join("\n")
    });
  } else if (text) {
    content.push({ type: "text", text: `${prompt}\n\n文档内容：\n${text.slice(0, 6000)}` });
  } else if (dataUrl) {
    const parsed = parseDataUrl(dataUrl);
    const ext = extensionFromFileName(fileName) || parsed.ext || "txt";
    const result = extractTextFromBuffer(parsed.buffer, ext);
    content.push({ type: "text", text: `${prompt}\n\n文档内容：\n${result.text.slice(0, 6000)}` });
  }
  return content;
}
