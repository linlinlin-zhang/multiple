import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const STORAGE_DIR = process.env.STORAGE_PATH || path.join(process.cwd(), "storage");
const UPLOADS_DIR = path.join(STORAGE_DIR, "upload");
const GENERATED_DIR = path.join(STORAGE_DIR, "generated");
const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif", "svg"];

/**
 * Ensure storage directories exist.
 */
export async function ensureStorageDirs() {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
  await fs.mkdir(GENERATED_DIR, { recursive: true });
}

/**
 * Compute SHA-256 hash of a buffer.
 */
export function hashBuffer(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

/**
 * Store a file on disk using SHA-256 content addressing.
 * Returns { hash, filePath, size }.
 * If the file already exists, skips writing.
 */
export async function storeFile(buffer, { kind = "upload", ext = "jpg" } = {}) {
  const storageKind = normalizeKind(kind);
  const fileExt = normalizeExt(ext);
  const hash = hashBuffer(buffer);
  const dir = path.join(STORAGE_DIR, storageKind, hash.slice(0, 2), hash.slice(2, 4));
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `${hash.slice(4)}.${fileExt}`);

  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, buffer);
  }

  return { hash, filePath, size: buffer.length };
}

/**
 * Read a file by its hash and kind.
 * Returns the file buffer.
 */
export async function readFile(hash, { kind = "upload" } = {}) {
  const filePath = await findFilePathForHash(hash, { kind });
  return fs.readFile(filePath);
}

/**
 * Get a deterministic path for a hash and extension.
 * Does not verify existence.
 */
export function filePathForHash(hash, { kind = "upload", ext = "jpg" } = {}) {
  validateHash(hash);
  return path.join(
    STORAGE_DIR,
    normalizeKind(kind),
    hash.slice(0, 2),
    hash.slice(2, 4),
    `${hash.slice(4)}.${normalizeExt(ext)}`
  );
}

/**
 * Resolve the stored path for a hash regardless of image extension.
 */
export async function findFilePathForHash(hash, { kind = "upload" } = {}) {
  validateHash(hash);
  const dir = path.join(STORAGE_DIR, normalizeKind(kind), hash.slice(0, 2), hash.slice(2, 4));
  const prefix = `${hash.slice(4)}.`;

  let entries;
  try {
    entries = await fs.readdir(dir);
  } catch (error) {
    error.message = `Stored asset directory not found for hash ${hash}`;
    throw error;
  }

  const fileName = entries.find((entry) => entry.startsWith(prefix) && entry.length > prefix.length);

  if (!fileName) {
    const error = new Error(`Stored asset not found for hash ${hash}`);
    error.code = "ENOENT";
    throw error;
  }

  return path.join(dir, fileName);
}

/**
 * Extract image bytes from a data URL and store them as a file.
 * Returns { hash, filePath, size, mimeType }.
 */
export async function storeDataUrl(dataUrl, { kind = "upload", ext } = {}) {
  const parsed = parseImageDataUrl(dataUrl);
  const result = await storeFile(parsed.buffer, { kind, ext: ext || parsed.ext });
  return { ...result, mimeType: parsed.mimeType };
}

export function isSupportedImageDataUrl(dataUrl) {
  try {
    parseImageDataUrl(dataUrl);
    return true;
  } catch {
    return false;
  }
}

export function parseImageDataUrl(dataUrl) {
  if (typeof dataUrl !== "string") {
    throw new Error("Invalid data URL format");
  }

  const rasterMatch = /^data:image\/(png|jpe?g|webp|gif);base64,([a-zA-Z0-9+/=]+)$/i.exec(dataUrl);
  if (rasterMatch) {
    const subtype = rasterMatch[1].toLowerCase();
    const ext = subtype === "jpeg" ? "jpg" : subtype;
    return {
      buffer: Buffer.from(rasterMatch[2], "base64"),
      mimeType: ext === "jpg" ? "image/jpeg" : `image/${subtype}`,
      ext
    };
  }

  const svgMatch = /^data:image\/svg\+xml((?:;[^,]*)?),(.*)$/is.exec(dataUrl);
  if (svgMatch) {
    const metadata = svgMatch[1] || "";
    const payload = svgMatch[2] || "";
    const buffer = /;base64/i.test(metadata)
      ? Buffer.from(payload, "base64")
      : Buffer.from(decodeURIComponent(payload), "utf8");
    return {
      buffer,
      mimeType: "image/svg+xml",
      ext: "svg"
    };
  }

  throw new Error("Invalid data URL format");
}

/**
 * Parse any data URL (not just images). Returns { buffer, mimeType, ext }.
 */
export function parseDataUrl(value) {
  if (typeof value !== "string") {
    throw new Error("Invalid data URL format");
  }
  const match = /^data:([a-z0-9+/.-]+)(?:;[^,]*)?;base64,([a-zA-Z0-9+/=]+)$/i.exec(value);
  if (match) {
    const mimeType = match[1].toLowerCase();
    const buffer = Buffer.from(match[2], "base64");
    const ext = extFromMime(mimeType);
    return { buffer, mimeType, ext };
  }
  throw new Error("Invalid data URL format");
}

function extFromMime(mimeType) {
  const map = {
    "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
    "image/gif": "gif", "image/svg+xml": "svg",
    "application/pdf": "pdf",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.ms-powerpoint": "ppt",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
    "text/plain": "txt",
    "video/mp4": "mp4", "video/webm": "webm"
  };
  return map[mimeType] || "bin";
}

function validateHash(hash) {
  if (!/^[a-f0-9]{64}$/i.test(hash)) {
    throw new Error("Invalid hash format");
  }
}

function normalizeKind(kind) {
  return kind === "generated" ? "generated" : "upload";
}

function normalizeExt(ext) {
  const normalized = String(ext || "jpg").replace(/^\./, "").toLowerCase();
  if (!IMAGE_EXTENSIONS.includes(normalized)) {
    throw new Error("Unsupported image extension");
  }
  return normalized === "jpeg" ? "jpg" : normalized;
}
