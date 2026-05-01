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
 * GET /api/materials?q=keyword&sort=date|added|name|size
 */
export async function handleListMaterials(query, res) {
  try {
    const q = typeof query?.q === "string" ? query.q.trim() : "";
    const sort = query?.sort || "added";

    const where = {};
    if (q) {
      where.fileName = { contains: q, mode: "insensitive" };
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
export async function handleCreateMaterial(body, res) {
  try {
    const fileName = typeof body?.fileName === "string" ? body.fileName.trim() : "";
    const mimeType = typeof body?.mimeType === "string" ? body.mimeType.trim() : "application/octet-stream";
    const dataUrl = typeof body?.dataUrl === "string" ? body.dataUrl : "";

    if (!fileName || !dataUrl) {
      return sendJson(res, 400, { error: "fileName and dataUrl are required" });
    }

    // Check file count limit (LIB-03, D-09)
    const count = await prisma.materialItem.count();
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
 * DELETE /api/materials/:id
 */
export async function handleDeleteMaterial(materialId, res) {
  try {
    if (!materialId || typeof materialId !== "string") {
      return sendJson(res, 400, { error: "materialId is required" });
    }

    const item = await prisma.materialItem.findUnique({ where: { id: materialId } });
    if (!item) {
      return sendJson(res, 404, { error: "Material not found" });
    }

    // Delete file from disk (D-08)
    try {
      await fs.unlink(item.filePath);
    } catch (unlinkError) {
      console.warn("[handleDeleteMaterial] file unlink failed:", unlinkError.message);
    }

    // Delete DB record
    await prisma.materialItem.delete({ where: { id: materialId } });

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
async function storeMaterialFile(buffer, hash, ext) {
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

function extFromMimeType(mimeType) {
  const map = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/svg+xml": "svg",
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
    "text/plain": "txt",
    "video/mp4": "mp4",
    "video/webm": "webm"
  };
  return map[mimeType] || "";
}
