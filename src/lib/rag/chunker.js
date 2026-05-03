/**
 * Text chunker for session-scoped RAG.
 *
 * Splits long mixed Chinese/English text into compact chunks with a small
 * overlap. Boundaries prefer paragraph, sentence, comma, and whitespace.
 */

const DEFAULT_CHUNK_CHARS = 600;
const DEFAULT_OVERLAP_CHARS = 80;
const MIN_CHUNK_CHARS = 80;

const SENTENCE_BREAKS = /[。！？!?；;\.\n]+/g;
const SOFT_BREAKS = /[，、,]/g;

export function chunkText(text, opts = {}) {
  const chunkSize = Math.max(120, Number(opts.chunkSize) || DEFAULT_CHUNK_CHARS);
  const overlap = Math.max(0, Math.min(chunkSize - 40, Number(opts.overlap) ?? DEFAULT_OVERLAP_CHARS));

  const cleaned = String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\0/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!cleaned) return [];
  if (cleaned.length <= chunkSize) return [cleaned];

  const chunks = [];
  let i = 0;
  while (i < cleaned.length) {
    let end = Math.min(i + chunkSize, cleaned.length);

    if (end < cleaned.length) {
      const window = cleaned.slice(i, end);
      const cut = pickBoundary(
        window.length,
        window.lastIndexOf("\n\n"),
        lastMatchIndex(window, SENTENCE_BREAKS),
        lastMatchIndex(window, SOFT_BREAKS),
        window.lastIndexOf(" ")
      );
      if (cut !== -1) end = i + cut + 1;
    }

    const piece = cleaned.slice(i, end).trim();
    if (piece.length >= MIN_CHUNK_CHARS || chunks.length === 0) {
      chunks.push(piece);
    } else {
      chunks[chunks.length - 1] = `${chunks[chunks.length - 1]} ${piece}`.trim();
    }

    if (end >= cleaned.length) break;
    i = Math.max(end - overlap, i + 1);
  }

  return chunks;
}

function lastMatchIndex(text, regex) {
  regex.lastIndex = 0;
  let last = -1;
  let match;
  while ((match = regex.exec(text)) !== null) {
    last = match.index;
    if (regex.lastIndex === match.index) regex.lastIndex++;
  }
  return last;
}

function pickBoundary(windowLen, paragraph, sentence, soft, space) {
  const half = Math.floor(windowLen / 2);
  for (const candidate of [paragraph, sentence, soft, space]) {
    if (candidate >= half) return candidate;
  }
  return -1;
}

export function estimateTokens(text) {
  const str = String(text || "");
  if (!str) return 0;
  const cjk = (str.match(/[\u4e00-\u9fff]/g) || []).length;
  const ascii = str.length - cjk;
  return Math.ceil(cjk / 0.75 + ascii / 4);
}
