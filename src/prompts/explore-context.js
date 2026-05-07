import { xmlBlock } from "./shared.js";

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
        xmlBlock("web_page", [
          `URL: ${url}`,
          pageText
            ? `Fetched page text excerpt:\n${pageText.slice(0, 6000)}`
            : "Server-side page fetch failed. If web search is available, use it to ground references and directions."
        ].join("\n"), { trusted: "false" })
      ].join("\n")
    });
  } else if (text) {
    content.push({ type: "text", text: `${prompt}\n\n${xmlBlock("document_text", text.slice(0, 6000), { trusted: "false" })}` });
  } else if (dataUrl) {
    const parsed = parseDataUrl(dataUrl);
    const ext = extensionFromFileName(fileName) || parsed.ext || "txt";
    const result = extractTextFromBuffer(parsed.buffer, ext);
    content.push({ type: "text", text: `${prompt}\n\n${xmlBlock("document_text", result.text.slice(0, 6000), { trusted: "false" })}` });
  }
  return content;
}
