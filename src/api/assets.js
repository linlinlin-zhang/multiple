import fs from "node:fs/promises";
import { prisma } from "../lib/prisma.js";
import { storeDataUrl, readFile, parseDataUrl, hashBuffer } from "../lib/storage.js";
import { syncToMaterialLibrary, storeMaterialFile } from "./materials.js";

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-cache"
  });
  res.end(JSON.stringify(data));
}

/**
 * POST /api/assets
 * Body: { dataUrl, kind?: "upload" | "generated", fileName? }
 */
export async function handleStoreAsset(body, res) {
  try {
    const dataUrl = typeof body?.dataUrl === "string" ? body.dataUrl : "";
    const kind = body?.kind === "generated" ? "generated" : "upload";
    const fileName = typeof body?.fileName === "string" ? body.fileName : "";

    let result;
    let mimeType;

    // Try image-specific storage first (existing behavior)
    try {
      result = await storeDataUrl(dataUrl, { kind });
      mimeType = result.mimeType;
    } catch (imageError) {
      // If storeDataUrl fails, try general data URL parsing (for PDF, docx, etc.)
      const parsed = parseDataUrl(dataUrl);
      const hash = hashBuffer(parsed.buffer);
      const filePath = await storeMaterialFile(parsed.buffer, hash, parsed.ext);
      result = { hash, filePath, size: parsed.buffer.length };
      mimeType = parsed.mimeType;
    }

    // Sync to material library for upload kind only
    if (kind === "upload") {
      syncToMaterialLibrary({
        hash: result.hash,
        fileName: fileName || `upload-${result.hash.slice(0, 8)}`,
        mimeType,
        fileSize: result.size,
        filePath: result.filePath
      }).catch(err => console.error("[handleStoreAsset] material sync failed:", err));
    }

    return sendJson(res, 200, {
      ok: true,
      hash: result.hash,
      mimeType,
      size: result.size
    });
  } catch (error) {
    console.error("[handleStoreAsset]", error);
    return sendJson(res, 400, { error: error.message || "Failed to store asset" });
  }
}

/**
 * GET /api/assets/:hash?kind=upload|generated
 */
export async function handleGetAsset(req, res) {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);
    const segments = url.pathname.split("/");
    const hash = segments[segments.length - 1];
    const kind = url.searchParams.get("kind") === "generated" ? "generated" : "upload";

    if (!/^[a-f0-9]{64}$/i.test(hash)) {
      return sendJson(res, 400, { error: "Invalid hash format" });
    }

    let buffer;
    let contentType = "";
    let downloadName = "";
    try {
      buffer = await readFile(hash, { kind });
      contentType = detectMimeType(buffer);
    } catch (storageError) {
      const item = await prisma.materialItem.findFirst({ where: { hash } });
      if (!item?.filePath) throw storageError;
      buffer = await fs.readFile(item.filePath);
      contentType = item.mimeType || detectMimeType(buffer);
      downloadName = item.fileName || "";
    }

    const isDownload = url.searchParams.get("download") === "1";
    const headers = {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable"
    };
    if (isDownload) {
      const ext = contentType.split("/").pop()?.replace("jpeg", "jpg") || "png";
      const safeName = downloadName || `oryzae_${hash.slice(0, 8)}.${ext}`;
      headers["Content-Disposition"] = `attachment; filename*=UTF-8''${encodeURIComponent(safeName)}`;
    }

    res.writeHead(200, headers);
    res.end(buffer);
  } catch (error) {
    console.error("[handleGetAsset]", error);
    if (error.code === "ENOENT" || /no such file/i.test(error.message)) {
      return sendJson(res, 404, { error: "Asset not found" });
    }
    return sendJson(res, 500, { error: error.message || "Failed to read asset" });
  }
}

function detectMimeType(buffer) {
  if (buffer.length >= 4) {
    const header = buffer.slice(0, 4).toString("hex");
    if (header.startsWith("89504e47")) return "image/png";
    if (header.startsWith("ffd8ff")) return "image/jpeg";
    if (header.startsWith("52494646")) return "image/webp";
    if (header.startsWith("47494638")) return "image/gif";
    if (header.startsWith("25504446")) return "application/pdf";
    if (header.startsWith("504b0304")) return "application/vnd.openxmlformats-officedocument";
  }

  const textPrefix = buffer.slice(0, 128).toString("utf8").trimStart();
  if (textPrefix.startsWith("<svg") || textPrefix.startsWith("<?xml")) {
    return "image/svg+xml";
  }

  return "application/octet-stream";
}
