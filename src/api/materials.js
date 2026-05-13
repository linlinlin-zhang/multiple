import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "../lib/prisma.js";
import { hashBuffer } from "../lib/storage.js";

const STORAGE_DIR = process.env.STORAGE_PATH || path.join(process.cwd(), "storage");
const MATERIAL_DIR = path.join(STORAGE_DIR, "material");
const SYSTEM_MATERIAL_DIR = path.join(process.cwd(), "material");

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-cache"
  });
  res.end(JSON.stringify(data));
}

/**
 * GET /api/materials?q=keyword&sort=date|added|name|size&favorited=1
 */
export async function handleListMaterials(query, res, options = {}) {
  try {
    const q = typeof query?.q === "string" ? query.q.trim() : "";
    const sort = query?.sort || "added";
    const favoritedOnly = query?.favorited === "1" || query?.favorited === "true";
    const visitorId = options.visitorId || "legacy";

    let where;
    if (favoritedOnly) {
      // 收藏视图只显示用户自己收藏的上传素材
      where = { visitorId, source: "user", favorited: true };
    } else {
      // 获取该用户已隐藏的系统素材ID
      const hiddenRecords = await prisma.materialHidden.findMany({
        where: { visitorId },
        select: { materialId: true }
      });
      const hiddenIds = hiddenRecords.map(h => h.materialId);

      where = {
        OR: [
          { visitorId, source: "user" },
          { source: "system" }
        ]
      };
      if (hiddenIds.length > 0) {
        where.OR[1].id = { notIn: hiddenIds };
      }
      if (q) {
        where.fileName = { contains: q, mode: "insensitive" };
      }
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
        filePath,
        source: "user"
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
      where: { id: materialId, visitorId, source: "user" },
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
    const item = await prisma.materialItem.findUnique({ where: { id: materialId } });

    if (!item) {
      return sendJson(res, 404, { error: "Material not found" });
    }

    // 系统素材：仅对该用户隐藏，不删实际文件
    if (item.source === "system") {
      await prisma.materialHidden.upsert({
        where: { visitorId_materialId: { visitorId, materialId } },
        update: {},
        create: { visitorId, materialId }
      });
      return sendJson(res, 200, { ok: true });
    }

    // 用户素材：校验权限后真删除
    if (item.visitorId !== visitorId) {
      return sendJson(res, 403, { error: "Not authorized" });
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

    const item = await prisma.materialItem.findUnique({ where: { id: materialId } });
    if (!item) {
      return sendJson(res, 404, { error: "Material not found" });
    }

    // 系统素材对所有用户开放；用户素材需校验归属
    if (item.source === "user" && item.visitorId !== (options.visitorId || "legacy")) {
      return sendJson(res, 403, { error: "Not authorized" });
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

function mimeFromExt(ext) {
  const map = {
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp",
    gif: "image/gif", svg: "image/svg+xml", pdf: "application/pdf",
    doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ppt: "application/vnd.ms-powerpoint", pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    txt: "text/plain", md: "text/markdown", json: "application/json",
    mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime",
    m4v: "video/x-m4v", ogv: "video/ogg"
  };
  return map[ext.toLowerCase()];
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

    const item = await prisma.materialItem.create({
      data: { visitorId, fileName, mimeType, fileSize, hash, filePath, source: "user" }
    });

    return item;
  } catch (error) {
    console.error("[syncToMaterialLibrary]", error);
    return null;
  }
}

/**
 * Scan the project-level material/ directory and register files as system materials.
 * Safe to call repeatedly: skips files already registered by hash+source.
 */
export async function syncSystemMaterials() {
  try {
    const dirStat = await fs.stat(SYSTEM_MATERIAL_DIR).catch(() => null);
    if (!dirStat || !dirStat.isDirectory()) {
      console.log("[syncSystemMaterials] No material/ directory found, skipping");
      return;
    }

    const entries = await fs.readdir(SYSTEM_MATERIAL_DIR, { recursive: true });
    let registered = 0;
    let skipped = 0;

    for (const relativePath of entries) {
      const fullPath = path.join(SYSTEM_MATERIAL_DIR, relativePath);
      const stat = await fs.stat(fullPath).catch(() => null);
      if (!stat || !stat.isFile()) continue;

      const fileName = path.basename(relativePath);
      const ext = path.extname(fileName).slice(1);
      const mimeType = mimeFromExt(ext) || "application/octet-stream";
      const buffer = await fs.readFile(fullPath);
      const hash = hashBuffer(buffer);
      const fileSize = buffer.length;

      // Skip unsupported types
      if (!isSupportedMaterialMime(mimeType)) {
        skipped++;
        continue;
      }

      // Dedup by hash+source
      const existing = await prisma.materialItem.findFirst({
        where: { hash, source: "system" }
      });
      if (existing) {
        skipped++;
        continue;
      }

      await prisma.materialItem.create({
        data: {
          visitorId: "__system__",
          fileName,
          mimeType,
          fileSize,
          hash,
          filePath: fullPath,
          source: "system"
        }
      });
      registered++;
    }

    console.log(`[syncSystemMaterials] Registered ${registered}, skipped ${skipped}`);
  } catch (error) {
    console.error("[syncSystemMaterials]", error);
  }
}
