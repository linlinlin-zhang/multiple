/**
 * Structured file parser for PDF, PPTX, DOCX, and plain text.
 *
 * The parser focuses on robust extraction rather than perfect rendering:
 * text, approximate pages/slides, embedded media references, and simple
 * table-like structures.
 */

import { PDFParse } from "pdf-parse";
import JSZip from "jszip";
import { extractTextFromBuffer } from "./textExtract.js";

const SCANNED_THRESHOLD_CHARS_PER_PAGE = 30;

export async function parseFileStructured(buffer, ext) {
  const normalizedExt = String(ext || "").toLowerCase().replace(/^\./, "");

  switch (normalizedExt) {
    case "txt":
    case "md":
    case "json":
      return parsePlainTextStructured(buffer, normalizedExt);
    case "doc":
      return parseLegacyOfficeStructured(buffer, normalizedExt);
    case "docx":
      return parseDocxStructured(buffer);
    case "pdf":
      return parsePdfStructured(buffer);
    case "ppt":
      return parseLegacyOfficeStructured(buffer, normalizedExt);
    case "pptx":
      return parsePptxStructured(buffer);
    default:
      throw new Error(`Unsupported file format: .${normalizedExt || "unknown"}`);
  }
}

function parsePlainTextStructured(buffer, ext) {
  let text = buffer.toString("utf8");
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const cleaned = cleanText(text);
  const lines = cleaned.split(/\n+/).filter((line) => line.trim());
  const pages = [];

  for (let i = 0; i < Math.max(1, lines.length); i += 40) {
    const chunk = lines.slice(i, i + 40).join("\n") || cleaned;
    pages.push(makePage(Math.floor(i / 40) + 1, chunk, [], detectTablesFromText(chunk)));
    if (!lines.length) break;
  }

  return makeParsed(ext, pages, {}, false);
}

function parseLegacyOfficeStructured(buffer, ext) {
  const extracted = extractTextFromBuffer(buffer, ext);
  const cleaned = cleanText(extracted.text || "");
  const pages = [];
  const pageSize = ext === "ppt" ? 1200 : 2400;
  for (let i = 0; i < Math.max(1, cleaned.length); i += pageSize) {
    const chunk = cleaned.slice(i, i + pageSize);
    pages.push(makePage(Math.floor(i / pageSize) + 1, chunk, [], detectTablesFromText(chunk)));
    if (!cleaned.length) break;
  }
  return makeParsed(ext, pages, {}, cleaned.length < SCANNED_THRESHOLD_CHARS_PER_PAGE);
}

async function parseDocxStructured(buffer) {
  let zip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch {
    return parseDocxFallback(buffer);
  }

  const coreXml = await zip.file("docProps/core.xml")?.async("text");
  const metadata = coreXml
    ? {
        title: extractXmlTag(coreXml, "dc:title"),
        author: extractXmlTag(coreXml, "dc:creator")
      }
    : {};

  const documentXml = await zip.file("word/document.xml")?.async("text");
  if (!documentXml) return parseDocxFallback(buffer);

  const paragraphs = [];
  const paraRegex = /<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g;
  let match;
  while ((match = paraRegex.exec(documentXml)) !== null) {
    const paraText = extractWText(match[1]);
    if (paraText) paragraphs.push(paraText);
  }

  const allImages = detectZipImages(zip, "word/media");
  const allTables = detectDocxTables(documentXml);
  const pages = [];
  for (let i = 0; i < Math.max(1, paragraphs.length); i += 8) {
    const chunk = paragraphs.slice(i, i + 8).join("\n");
    const pageNo = Math.floor(i / 8) + 1;
    pages.push(makePage(pageNo, chunk, pageNo === 1 ? allImages : [], pageNo === 1 ? allTables : []));
    if (!paragraphs.length) break;
  }

  return makeParsed("docx", pages, metadata, false);
}

function parseDocxFallback(buffer) {
  const raw = buffer.toString("latin1");
  const runs = raw.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
  const text = runs.map((run) => run.replace(/<w:t[^>]*>([^<]*)<\/w:t>/, "$1")).join(" ");
  const cleaned = cleanText(text);
  return makeParsed("docx", [makePage(1, cleaned, [], [])], {}, false);
}

async function parsePdfStructured(buffer) {
  let parser;
  try {
    parser = new PDFParse({ data: buffer });
  } catch {
    return parsePdfFallback(buffer);
  }

  try {
    const textResult = await parser.getText();
    const infoResult = await parser.getInfo();
    const totalPages = Math.max(1, textResult.total || infoResult.total || textResult.pages?.length || 1);
    const pages = [];

    let doc = null;
    try {
      doc = await parser.load();
    } catch {
      doc = null;
    }

    for (let i = 1; i <= totalPages; i++) {
      const pageText = cleanText(textResult.pages?.[i - 1]?.text || "");
      let tables = detectPdfTables(pageText);

      if (doc && typeof parser.getPageTables === "function") {
        try {
          const page = await doc.getPage(i);
          const tableResult = await parser.getPageTables(page);
          page.cleanup?.();
          if (tableResult?.tables?.length) {
            tables = tableResult.tables.map((table) => ({
              rowCount: table.rows?.length || 0,
              colCount: table.rows?.[0]?.length || 0,
              cells: table.rows || []
            }));
          }
        } catch {
          // Some PDFs fail table extraction; text heuristics above remain useful.
        }
      }

      pages.push(makePage(i, pageText, [], tables));
    }

    await parser.destroy();

    const parsed = makeParsed("pdf", pages, {
      title: infoResult.info?.Title || infoResult.metadata?.title || "",
      author: infoResult.info?.Author || infoResult.metadata?.author || ""
    });
    const avgCharsPerPage = parsed.allText.length / Math.max(1, parsed.totalPages);
    parsed.isScanned = avgCharsPerPage < SCANNED_THRESHOLD_CHARS_PER_PAGE;
    return parsed;
  } catch (error) {
    console.warn("[parsePdfStructured] pdf-parse failed, falling back:", error.message);
    if (parser) await parser.destroy().catch(() => {});
    return parsePdfFallback(buffer);
  }
}

function parsePdfFallback(buffer) {
  const raw = buffer.toString("latin1");
  const pageMatches = raw.match(/\/Type\s*\/Page\b/g) || [];
  const pagesObjectMatches = raw.match(/\/Type\s*\/Pages\b/g) || [];
  const totalPages = Math.max(1, pageMatches.length - pagesObjectMatches.length);
  const titleMatch = raw.match(/\/Title\s*\(([^)]*)\)/);
  const authorMatch = raw.match(/\/Author\s*\(([^)]*)\)/);

  const parts = [];
  const btBlocks = raw.match(/BT[\s\S]*?ET/g) || [];
  for (const block of btBlocks) {
    const tjMatches = block.match(/\(([^)]{2,})\)\s*Tj/g) || [];
    for (const item of tjMatches) {
      const text = item.replace(/^\((.*)\)\s*Tj$/, "$1");
      if (isReadable(text)) parts.push(text);
    }
    const arrayMatches = block.match(/\[([^\]]+)\]\s*TJ/g) || [];
    for (const item of arrayMatches) {
      const inner = item.replace(/^\[([^\]]+)\]\s*TJ$/, "$1");
      const innerMatches = inner.match(/\(([^)]{2,})\)/g) || [];
      for (const innerItem of innerMatches) {
        const text = innerItem.replace(/^\((.*)\)$/, "$1");
        if (isReadable(text)) parts.push(text);
      }
    }
  }

  if (!parts.length) {
    const fallback = raw.match(/\(([^)]{3,})\)/g) || [];
    parts.push(...fallback.map((item) => item.slice(1, -1)).filter(isReadable));
  }

  const pages = [];
  const perPage = Math.max(1, Math.ceil(parts.length / totalPages));
  for (let i = 0; i < totalPages; i++) {
    const chunk = cleanText(parts.slice(i * perPage, (i + 1) * perPage).join(" "));
    pages.push(makePage(i + 1, chunk, [], detectPdfTables(chunk)));
  }

  const parsed = makeParsed("pdf", pages, {
    title: titleMatch?.[1] || "",
    author: authorMatch?.[1] || ""
  });
  parsed.isScanned = parsed.allText.length / Math.max(1, parsed.totalPages) < SCANNED_THRESHOLD_CHARS_PER_PAGE;
  return parsed;
}

async function parsePptxStructured(buffer) {
  let zip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch {
    return parsePptxFallback(buffer);
  }

  const presentationXml = await zip.file("ppt/presentation.xml")?.async("text");
  const slideCount = presentationXml?.match(/<p:sldId\b/g)?.length || countSlideXmlFiles(zip) || 1;
  const coreXml = await zip.file("docProps/core.xml")?.async("text");
  const metadata = coreXml
    ? {
        title: extractXmlTag(coreXml, "dc:title"),
        author: extractXmlTag(coreXml, "dc:creator")
      }
    : {};

  const slideImages = await buildPptxSlideImageMap(zip);
  const pages = [];
  for (let i = 1; i <= slideCount; i++) {
    const slideXml = await zip.file(`ppt/slides/slide${i}.xml`)?.async("text");
    if (!slideXml) {
      pages.push(makePage(i, "", slideImages.get(i) || [], []));
      continue;
    }
    const textMatches = slideXml.match(/<a:t>([^<]*)<\/a:t>/g) || [];
    const text = cleanText(textMatches.map((item) => item.replace(/<a:t>([^<]*)<\/a:t>/, "$1")).join(" "));
    pages.push(makePage(i, text, slideImages.get(i) || [], detectPptxTables(slideXml)));
  }

  return makeParsed("pptx", pages, metadata, false);
}

function parsePptxFallback(buffer) {
  const raw = buffer.toString("latin1");
  const matches = raw.match(/<a:t>([^<]*)<\/a:t>/g) || [];
  const text = cleanText(matches.map((item) => item.replace(/<a:t>([^<]*)<\/a:t>/, "$1")).join(" "));
  return makeParsed("pptx", [makePage(1, text, [], [])], {}, false);
}

function extractWText(paraXml) {
  const runs = paraXml.match(/<w:t\b[^>]*>([^<]*)<\/w:t>/g) || [];
  return runs.map((run) => run.replace(/<w:t\b[^>]*>([^<]*)<\/w:t>/, "$1")).join("");
}

function extractXmlTag(xml, tagName) {
  const match = xml.match(new RegExp(`<${tagName}>([^<]*)<\\/${tagName}>`));
  return match?.[1] || "";
}

function detectZipImages(zip, folderPath) {
  const images = [];
  zip.folder(folderPath)?.forEach((relativePath) => {
    if (/\.(png|jpg|jpeg|gif|webp|bmp|emf|svg)$/i.test(relativePath)) {
      const name = relativePath.split("/").pop();
      images.push({ name, type: name.split(".").pop()?.toLowerCase() });
    }
  });
  return images;
}

function detectDocxTables(documentXml) {
  const tables = [];
  const tableMatches = documentXml.match(/<w:tbl\b[^>]*>[\s\S]*?<\/w:tbl>/g) || [];
  for (const table of tableMatches) {
    const rows = table.match(/<w:tr\b[^>]*>[\s\S]*?<\/w:tr>/g) || [];
    const cells = rows.map((row) => {
      const rowCells = row.match(/<w:t\b[^>]*>([^<]*)<\/w:t>/g) || [];
      return rowCells.map((cell) => cell.replace(/<w:t\b[^>]*>([^<]*)<\/w:t>/, "$1"));
    });
    if (cells.length) tables.push(makeTable(cells));
  }
  return tables;
}

function detectPptxTables(slideXml) {
  const tables = [];
  const tableMatches = slideXml.match(/<a:tbl\b[^>]*>[\s\S]*?<\/a:tbl>/g) || [];
  for (const table of tableMatches) {
    const rows = table.match(/<a:tr\b[^>]*>[\s\S]*?<\/a:tr>/g) || [];
    const cells = rows.map((row) => {
      const rowCells = row.match(/<a:t>([^<]*)<\/a:t>/g) || [];
      return rowCells.map((cell) => cell.replace(/<a:t>([^<]*)<\/a:t>/, "$1"));
    });
    if (cells.length) tables.push(makeTable(cells));
  }
  return tables;
}

async function buildPptxSlideImageMap(zip) {
  const allMedia = detectZipImages(zip, "ppt/media");
  const map = new Map();

  for (const path of Object.keys(zip.files)) {
    const match = path.match(/^ppt\/slides\/_rels\/slide(\d+)\.xml\.rels$/);
    if (!match) continue;
    const slideNo = Number(match[1]);
    const relXml = await zip.file(path)?.async("text");
    if (!relXml) continue;
    const targets = [...relXml.matchAll(/Target="\.\.\/media\/([^"]+)"/g)].map((m) => m[1]);
    const images = targets.map((name) => ({ name, type: name.split(".").pop()?.toLowerCase() }));
    if (images.length) map.set(slideNo, images);
  }

  if (map.size || !allMedia.length) return map;

  const slideCount = countSlideXmlFiles(zip) || 1;
  const perSlide = Math.max(1, Math.ceil(allMedia.length / slideCount));
  for (let i = 1; i <= slideCount; i++) {
    map.set(i, allMedia.slice((i - 1) * perSlide, i * perSlide));
  }
  return map;
}

function countSlideXmlFiles(zip) {
  return Object.keys(zip.files).filter((path) => /^ppt\/slides\/slide\d+\.xml$/.test(path)).length;
}

function detectPdfTables(text) {
  return detectTablesFromText(text);
}

function detectTablesFromText(text) {
  const tables = [];
  const lines = String(text || "").split("\n");
  let block = [];

  for (const line of lines) {
    const trimmed = line.trim();
    const looksLikeTable =
      /^\|?\s*[\w\u4e00-\u9fff].*\|/.test(trimmed) ||
      /\t/.test(trimmed) ||
      (trimmed.includes("  ") && /[\d\u4e00-\u9fff]/.test(trimmed));

    if (looksLikeTable) {
      block.push(trimmed);
    } else {
      flushTableBlock(block, tables);
      block = [];
    }
  }
  flushTableBlock(block, tables);
  return tables;
}

function flushTableBlock(block, tables) {
  if (!block || block.length < 2) return;
  const cells = block.map((line) => line.split(/\s{2,}|\t|\|/).map((cell) => cell.trim()).filter(Boolean));
  const colCount = Math.max(...cells.map((row) => row.length), 0);
  if (colCount >= 2) tables.push(makeTable(cells));
}

function makeTable(cells) {
  return {
    rowCount: cells.length,
    colCount: Math.max(...cells.map((row) => row.length), 0),
    cells
  };
}

function makePage(pageNumber, text, images = [], tables = []) {
  const cleaned = cleanText(text);
  return {
    pageNumber,
    text: cleaned,
    wordCount: countWords(cleaned),
    images,
    tables
  };
}

function makeParsed(type, pages, metadata = {}, isScanned = false) {
  const normalizedPages = pages.length ? pages : [makePage(1, "", [], [])];
  const allText = cleanText(normalizedPages.map((page) => page.text).join("\n"));
  return {
    type,
    totalPages: normalizedPages.length,
    isScanned,
    metadata,
    pages: normalizedPages,
    allText,
    keyPhrases: extractKeyPhrases(allText)
  };
}

function cleanText(text) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[\t\f\v]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function isReadable(str) {
  if (!str || str.length < 2) return false;
  const printable = (str.match(/[\x20-\x7E\u4e00-\u9fff]/g) || []).length;
  return printable / str.length > 0.6;
}

function countWords(text) {
  if (!text) return 0;
  const cjk = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const latin = (text.match(/[a-zA-Z0-9_]+/g) || []).length;
  return cjk + latin;
}

function extractKeyPhrases(text, max = 12) {
  if (!text) return [];
  const cleaned = text.toLowerCase();
  const cnStops = new Set([
    "我们", "可以", "这个", "进行", "通过", "根据", "需要", "使用", "以下", "以及",
    "对于", "一个", "并且", "如果", "那么", "因为", "所以", "虽然", "但是", "其中",
    "包括", "相关", "基于", "采用", "实现", "方法", "系统", "数据", "信息", "结果",
    "分析", "研究", "本文", "作者", "年份", "页面", "文件", "文档", "内容", "问题"
  ]);
  const enStops = new Set([
    "the", "and", "for", "are", "but", "not", "you", "all", "can", "this", "that",
    "with", "from", "into", "about", "using", "used", "use", "will", "would", "should",
    "could", "there", "their", "these", "those", "have", "has", "had", "was", "were"
  ]);

  const cnFreq = new Map();
  for (const phrase of cleaned.match(/[\u4e00-\u9fff]{2,4}/g) || []) {
    if (!cnStops.has(phrase)) cnFreq.set(phrase, (cnFreq.get(phrase) || 0) + 1);
  }

  const words = cleaned.match(/[a-z]{3,}/g) || [];
  const enFreq = new Map();
  for (let i = 0; i < words.length - 1; i++) {
    if (enStops.has(words[i]) || enStops.has(words[i + 1])) continue;
    const bigram = `${words[i]} ${words[i + 1]}`;
    enFreq.set(bigram, (enFreq.get(bigram) || 0) + 1);
  }

  const cn = [...cnFreq.entries()].sort((a, b) => b[1] - a[1]).map(([phrase]) => phrase);
  const en = [...enFreq.entries()].sort((a, b) => b[1] - a[1]).map(([phrase]) => phrase);
  return [...new Set([...cn, ...en])].slice(0, max);
}
