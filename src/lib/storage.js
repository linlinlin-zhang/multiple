import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const STORAGE_DIR = process.env.STORAGE_PATH || path.join(process.cwd(), "storage");
const UPLOADS_DIR = path.join(STORAGE_DIR, "uploads");
const GENERATED_DIR = path.join(STORAGE_DIR, "generated");

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
 * If the file already exists, skips writing (deduplication).
 */
export async function storeFile(buffer, { kind = "upload", ext = "jpg" } = {}) {
  const hash = hashBuffer(buffer);
  const dir = path.join(STORAGE_DIR, kind, hash.slice(0, 2), hash.slice(2, 4));
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `${hash.slice(4)}.${ext}`);

  try {
    await fs.access(filePath);
    // File already exists — deduplication win
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
  const filePath = filePathForHash(hash, { kind });
  return fs.readFile(filePath);
}

/**
 * Get the absolute filesystem path for a hash.
 * Does NOT verify existence.
 */
export function filePathForHash(hash, { kind = "upload" } = {}) {
  if (!/^[a-f0-9]{64}$/i.test(hash)) {
    throw new Error("Invalid hash format");
  }
  return path.join(STORAGE_DIR, kind, hash.slice(0, 2), hash.slice(2, 4), `${hash.slice(4)}`);
}

/**
 * Extract base64 data from a data URL and store it as a file.
 * Returns { hash, filePath, size, mimeType }.
 */
export async function storeDataUrl(dataUrl, { kind = "upload", ext } = {}) {
  const match = /^data:image\/(png|jpe?g|webp|gif);base64,([a-zA-Z0-9+/=]+)$/.exec(dataUrl);
  if (!match) {
    throw new Error("Invalid data URL format");
  }
  const mimeType = `image/${match[1]}`;
  const detectedExt = match[1] === "jpeg" ? "jpg" : match[1];
  const buffer = Buffer.from(match[2], "base64");
  const result = await storeFile(buffer, { kind, ext: ext || detectedExt });
  return { ...result, mimeType };
}
