import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "../lib/prisma.js";
import { hashBuffer } from "../lib/storage.js";

const STORAGE_DIR = process.env.STORAGE_PATH || path.join(process.cwd(), "storage");
const MATERIAL_DIR = path.join(STORAGE_DIR, "material");

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-cache"
  });
  res.end(JSON.stringify(data));
}

const MATERIAL_FILE_LIMIT = 100;

/**
 * GET /api/materials?q=keyword&sort=date|added|name|size&favorited=1
 */
export async function handleListMaterials(query, res, options = {}) {
  try {
    const q = typeof query?.q === "string" ? query.q.trim() : "";
    const sort = query?.sort || "added";
    const favoritedOnly = query?.favorited === "1" || query?.favorited === "true";
    const visitorId = options.visitorId || "legacy";

    const where = { visitorId };
    if (q) {
      where.fileName = { contains: q, mode: "insensitive" };
    }
    if (favoritedOnly) {
      where.favorited = true;
    }

    let orderBy;
    switch (sort) {
      case "date": orderBy = { updatedAt: "desc" }; break;
      case "name": orderBy = { fileName: "asc" }; break;
      case "size": orderBy = { fileSize: "desc" }; break;
      default:     orderBy = { addedAt: "desc" }; break;
    }

    const [items, total] = await Promise.all([
      prisma.materialItem.findMany({ where, orderBy }),
      prisma.materialItem.count({ where })
    ]);

    return sendJson(res, 200, { ok: true, items, total });
  } catch (error) {
    console.error("[handleListMaterials]", error);
    return sendJson(res, 500, { error: error.message || "Failed to list materials" });
  }
}

/**
 * POST /api/materials
 * Body: { fileName, mimeType, fileSize, dataUrl }
 */
export async function handleCreateMaterial(body, res, options = {}) {
  try {
    const fileName = typeof body?.fileName === "string" ? body.fileName.trim() : "";
    const mimeType = typeof body?.mimeType === "string" ? body.mimeType.trim() : "application/octet-stream";
    const dataUrl = typeof body?.dataUrl === "string" ? body.dataUrl : "";
    const visitorId = options.visitorId || "legacy";

    if (!fileName || !dataUrl) {
      return sendJson(res, 400, { error: "fileName and dataUrl are required" });
    }

    // Check file count limit (LIB-03, D-09)
    const count = await prisma.materialItem.count({ where: { visitorId } });
    if (count >= MATERIAL_FILE_LIMIT) {
      return sendJson(res, 409, { error: "Material library is full (100 items max)" });
    }

    // Decode dataUrl to buffer
    const match = /^data:[^;]+;base64,(.+)$/i.exec(dataUrl);
    if (!match) {
      return sendJson(res, 400, { error: "Invalid dataUrl format" });
    }
    const buffer = Buffer.from(match[1], "base64");
    const fileSize = buffer.length;
    const hash = hashBuffer(buffer);

    // Determine file extension from mimeType or fileName
    const ext = extFromMimeType(mimeType) || fileName.split(".").pop()?.toLowerCase() || "bin";

    // Store file on disk using direct write (avoids storage.js image-only restriction)
    const filePath = await storeMaterialFile(buffer, hash, ext);

    // Create DB record
    const item = await prisma.materialItem.create({
      data: {
        visitorId,
        fileName,
        mimeType,
        fileSize,
        hash,
        filePath
      }
    });

    return sendJson(res, 200, { ok: true, item });
  } catch (error) {
    console.error("[handleCreateMaterial]", error);
    return sendJson(res, 500, { error: error.message || "Failed to create material" });
  }
}

/**
 * PUT /api/materials/:id
 * Body: { fileName?, favorited? }
 *
 * Both fields are optional; whichever is supplied is updated. Sending neither
 * is rejected so the client doesn't accidentally produce a no-op call.
 */
export async function handleUpdateMaterial(materialId, body, res, options = {}) {
  try {
    if (!materialId || typeof materialId !== "string") {
      return sendJson(res, 400, { error: "materialId is required" });
    }

    const visitorId = options.visitorId || "legacy";
    const data = {};
    if (typeof body?.fileName === "string") {
      const fileName = body.fileName.trim().slice(0, 240);
      if (!fileName) {
        return sendJson(res, 400, { error: "fileName must not be empty" });
      }
      data.fileName = fileName;
    }
    if (typeof body?.favorited === "boolean") {
      data.favorited = body.favorited;
    }

    if (Object.keys(data).length === 0) {
      return sendJson(res, 400, { error: "fileName or favorited is required" });
    }

    const existing = await prisma.materialItem.findFirst({
      where: { id: materialId, visitorId },
      select: { id: true }
    });
    if (!existing) {
      return sendJson(res, 404, { error: "Material not found" });
    }

    const item = await prisma.materialItem.update({
      where: { id: materialId },
      data
    });

    return sendJson(res, 200, { ok: true, item });
  } catch (error) {
    console.error("[handleUpdateMaterial]", error);
    return sendJson(res, 500, { error: error.message || "Failed to update material" });
  }
}

/**
 * DELETE /api/materials/:id
 */
export async function handleDeleteMaterial(materialId, res, options = {}) {
  try {
    if (!materialId || typeof materialId !== "string") {
      return sendJson(res, 400, { error: "materialId is required" });
    }

    const visitorId = options.visitorId || "legacy";
    const item = await prisma.materialItem.findFirst({ where: { id: materialId, visitorId } });
    if (!item) {
      return sendJson(res, 404, { error: "Material not found" });
    }

    await prisma.materialItem.delete({ where: { id: materialId } });
    const remainingRefs = await prisma.materialItem.count({ where: { filePath: item.filePath } });
    if (remainingRefs === 0 && item.filePath.startsWith(MATERIAL_DIR)) {
      try {
        await fs.unlink(item.filePath);
      } catch (unlinkError) {
        console.warn("[handleDeleteMaterial] file unlink failed:", unlinkError.message);
      }
    }

    return sendJson(res, 200, { ok: true });
  } catch (error) {
    console.error("[handleDeleteMaterial]", error);
    return sendJson(res, 500, { error: error.message || "Failed to delete material" });
  }
}

/**
 * Store a material file directly on disk using hash-based addressing.
 * Bypasses storage.js which only supports image extensions.
 * Returns the absolute file path.
 */
export async function storeMaterialFile(buffer, hash, ext) {
  const dir = path.join(MATERIAL_DIR, hash.slice(0, 2), hash.slice(2, 4));
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `${hash.slice(4)}.${ext}`);

  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, buffer);
  }

  return filePath;
}

/**
 * GET /api/materials/:id/file
 * Streams the material file from disk.
 */
export async function handleGetMaterialFile(materialId, res, options = {}) {
  try {
    if (!materialId || typeof materialId !== "string") {
      return sendJson(res, 400, { error: "materialId is required" });
    }

    const item = await prisma.materialItem.findFirst({ where: { id: materialId, visitorId: options.visitorId || "legacy" } });
    if (!item) {
      return sendJson(res, 404, { error: "Material not found" });
    }

    try {
      await fs.access(item.filePath);
    } catch {
      return sendJson(res, 404, { error: "File not found on disk" });
    }

    const fileBuffer = await fs.readFile(item.filePath);
    const headers = {
      "Content-Type": item.mimeType || "application/octet-stream",
      "Cache-Control": "public, max-age=86400",
      "Content-Length": fileBuffer.length
    };
    if (options.download) {
      const safeName = String(item.fileName || "material").replace(/[\r\n"]/g, "_");
      headers["Content-Disposition"] = `attachment; filename*=UTF-8''${encodeURIComponent(safeName)}`;
    }
    res.writeHead(200, headers);
    res.end(fileBuffer);
  } catch (error) {
    console.error("[handleGetMaterialFile]", error);
    return sendJson(res, 500, { error: error.message || "Failed to serve file" });
  }
}

function extFromMimeType(mimeType) {
  const map = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/svg+xml": "svg",
    "application/pdf": "pdf",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.ms-powerpoint": "ppt",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
    "text/plain": "txt",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
    "video/x-m4v": "m4v",
    "video/ogg": "ogv"
  };
  return map[mimeType] || "";
}

const SUPPORTED_MATERIAL_MIMES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-m4v",
  "video/ogg"
]);

function isSupportedMaterialMime(mimeType) {
  if (mimeType.startsWith("image/")) return true;
  return SUPPORTED_MATERIAL_MIMES.has(mimeType);
}

/**
 * Sync an uploaded asset to the material library.
 * Best-effort: returns null on failure without throwing.
 */
export async function syncToMaterialLibrary({ hash, fileName, mimeType, fileSize, filePath, visitorId = "legacy" }) {
  try {
    if (!isSupportedMaterialMime(mimeType)) {
      return null;
    }

    // Dedup: if MaterialItem with same hash exists, skip
    const existing = await prisma.materialItem.findFirst({ where: { hash, visitorId } });
    if (existing) {
      return existing;
    }

    // 100-item limit check
    const count = await prisma.materialItem.count({ where: { visitorId } });
    if (count >= MATERIAL_FILE_LIMIT) {
      console.warn("[syncToMaterialLibrary] Material library full (100 items), skipping sync for", fileName);
      return null;
    }

    const item = await prisma.materialItem.create({
      data: { visitorId, fileName, mimeType, fileSize, hash, filePath }
    });

    return item;
  } catch (error) {
    console.error("[syncToMaterialLibrary]", error);
    return null;
  }
}
