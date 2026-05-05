/**
 * Text extraction library for DOCX, TXT, PDF, PPTX.
 * Zero external dependencies — uses only Node.js built-ins.
 */

const MAX_CHARS = 8000;

/**
 * Extract plain text from a file buffer.
 * @param {Buffer} buffer
 * @param {string} ext — file extension without dot (e.g. "txt", "docx", "pdf", "pptx")
 * @returns {{ text: string, truncated: boolean }}
 */
export function extractTextFromBuffer(buffer, ext) {
  const normalizedExt = String(ext || "").toLowerCase().replace(/^\./, "");

  switch (normalizedExt) {
    case "txt":
    case "md":
    case "json":
      return extractPlainText(buffer);
    case "doc":
      return extractLegacyOffice(buffer);
    case "docx":
      return extractDocx(buffer);
    case "pdf":
      return extractPdf(buffer);
    case "ppt":
      return extractLegacyOffice(buffer);
    case "pptx":
      return extractPptx(buffer);
    default:
      throw new Error(`Unsupported file format: .${normalizedExt}`);
  }
}

function extractPlainText(buffer) {
  let text;
  try {
    text = buffer.toString("utf8");
  } catch {
    text = buffer.toString("latin1");
  }

  // Strip BOM
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }

  return finalize(text);
}

function extractDocx(buffer) {
  // DOCX is a ZIP archive. Node has no built-in ZIP, so we use a heuristic:
  // search for <w:t>…</w:t> text runs inside word/document.xml.
  const raw = buffer.toString("latin1");
  const matches = raw.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
  if (!matches) {
    return finalize("");
  }
  const text = matches
    .map((m) => m.replace(/<w:t[^>]*>([^<]*)<\/w:t>/, "$1"))
    .join(" ");
  return finalize(text);
}

function extractPdf(buffer) {
  const raw = buffer.toString("latin1");

  // Strategy 1: BT … ET blocks with Tj / TJ operators
  const btBlocks = raw.match(/BT[\s\S]*?ET/g);
  if (btBlocks) {
    const parts = [];
    for (const block of btBlocks) {
      // Tj operator: (text) Tj
      const tjMatches = block.match(/\(([^)]{2,})\)\s*Tj/g);
      if (tjMatches) {
        for (const m of tjMatches) {
          const text = m.replace(/^\((.*)\)\s*Tj$/, "$1");
          if (isReadable(text)) parts.push(text);
        }
      }
      // TJ operator: [ (text1) (text2) ] TJ
      const tjArrayMatches = block.match(/\[([^\]]+)\]\s*TJ/g);
      if (tjArrayMatches) {
        for (const m of tjArrayMatches) {
          const inner = m.replace(/^\[([^\]]+)\]\s*TJ$/, "$1");
          const innerMatches = inner.match(/\(([^)]{2,})\)/g);
          if (innerMatches) {
            for (const im of innerMatches) {
              const text = im.replace(/^\((.*)\)$/, "$1");
              if (isReadable(text)) parts.push(text);
            }
          }
        }
      }
    }
    if (parts.length) {
      return finalize(parts.join(" "));
    }
  }

  // Strategy 2: fallback — look for readable parenthesized strings
  const fallback = raw.match(/\(([^)]{3,})\)/g);
  if (fallback) {
    const texts = fallback
      .map((m) => m.slice(1, -1))
      .filter(isReadable);
    if (texts.length) {
      return finalize(texts.join(" "));
    }
  }

  return finalize("");
}

function extractPptx(buffer) {
  // PPTX is a ZIP archive. Heuristic: search ppt/slides/*.xml for <a:t> elements.
  const raw = buffer.toString("latin1");
  const matches = raw.match(/<a:t>([^<]*)<\/a:t>/g);
  if (!matches) {
    return finalize("");
  }
  const text = matches
    .map((m) => m.replace(/<a:t>([^<]*)<\/a:t>/, "$1"))
    .join(" ");
  return finalize(text);
}

function extractLegacyOffice(buffer) {
  const raw = buffer.toString("latin1");
  const parts = raw
    .replace(/\0/g, " ")
    .match(/[\x20-\x7E\u4e00-\u9fa5]{4,}/g);
  if (!parts) {
    return finalize("");
  }
  return finalize(parts.filter(isReadable).join(" "));
}

function isReadable(str) {
  // Reject strings that are mostly binary/hex or too short
  if (!str || str.length < 2) return false;
  const printable = (str.match(/[\x20-\x7E\u4e00-\u9fa5]/g) || []).length;
  return printable / str.length > 0.6;
}

function finalize(text) {
  let cleaned = text
    .replace(/\r\n/g, " ")
    .replace(/\n/g, " ")
    .replace(/\r/g, " ")
    .replace(/\t/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const truncated = cleaned.length > MAX_CHARS;
  if (truncated) {
    cleaned = cleaned.slice(0, MAX_CHARS);
  }

  return { text: cleaned, truncated };
}
