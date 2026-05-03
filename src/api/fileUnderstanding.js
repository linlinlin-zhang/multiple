/**
 * File Understanding API handlers
 * POST /api/file-understanding — trigger understanding for a material/asset
 * GET /api/file-understanding/:hash — get cached understanding result
 */

import { prisma } from "../lib/prisma.js";
import { readFile, hashBuffer } from "../lib/storage.js";
import { buildFileUnderstanding } from "../lib/fileUnderstanding.js";

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-cache"
  });
  res.end(JSON.stringify(data));
}

/**
 * POST /api/file-understanding
 * Body: { hash, fileName?, mimeType?, dataUrl? }
 * If hash is provided, reads from storage. If dataUrl is provided, parses and uses that.
 */
export async function handleCreateFileUnderstanding(body, res) {
  try {
    const hash = typeof body?.hash === "string" ? body.hash : "";
    let fileName = typeof body?.fileName === "string" ? body.fileName : "";
    let mimeType = typeof body?.mimeType === "string" ? body.mimeType : "";
    const dataUrl = typeof body?.dataUrl === "string" ? body.dataUrl : "";
    const lang = body?.language === "en" ? "en" : "zh";

    let buffer;
    let ext = "";
    let resolvedHash = hash;

    if (resolvedHash) {
      // Try to read from material storage first, then upload storage
      try {
        buffer = await readFile(resolvedHash, { kind: "upload" });
      } catch {
        const materialItem = await prisma.materialItem.findFirst({ where: { hash: resolvedHash } });
        if (materialItem?.filePath) {
          const fs = await import("node:fs/promises");
          buffer = await fs.readFile(materialItem.filePath);
        } else {
          return sendJson(res, 404, { error: "File not found for the given hash" });
        }
      }
      if (!fileName) {
        const materialItem = await prisma.materialItem.findFirst({ where: { hash: resolvedHash } });
        fileName = materialItem?.fileName || `document-${resolvedHash.slice(0, 8)}`;
        mimeType = materialItem?.mimeType || mimeType || "application/octet-stream";
      }
      ext = fileName.split(".").pop()?.toLowerCase() || "";
    } else if (dataUrl) {
      const match = /^data:([^;]+);base64,([a-zA-Z0-9+/=]+)$/i.exec(dataUrl);
      if (!match) {
        return sendJson(res, 400, { error: "Invalid dataUrl" });
      }
      buffer = Buffer.from(match[2], "base64");
      mimeType = mimeType || match[1];
      ext = fileName.split(".").pop()?.toLowerCase() || extFromMime(mimeType) || "bin";
      resolvedHash = hashBuffer(buffer);
    } else {
      return sendJson(res, 400, { error: "hash or dataUrl is required" });
    }

    // Check cache first
    const cached = await prisma.fileUnderstanding.findUnique({ where: { hash: resolvedHash } });
    if (cached) {
      return sendJson(res, 200, {
        ok: true,
        cached: true,
        hash: cached.hash,
        result: serializeUnderstanding(cached)
      });
    }

    // Build understanding
    const result = await buildFileUnderstanding(buffer, fileName, ext, {
      lang,
      apiKey: process.env.ANALYSIS_API_KEY || process.env.DASHSCOPE_API_KEY,
      baseUrl: process.env.ANALYSIS_API_BASE_URL,
      model: process.env.ANALYSIS_MODEL
    });

    // Store in DB
    const stored = await prisma.fileUnderstanding.create({
      data: {
        hash: resolvedHash,
        fileName,
        mimeType: mimeType || "application/octet-stream",
        summary: result.summary || "",
        abstract: result.abstract || "",
        structure: result.structure || {},
        keyMaterials: result.keyMaterials || {},
        actionableDirections: result.actionableDirections || [],
        isScanned: result.isScanned || false,
        metadata: {
          ...(result.metadata || {}),
          keyPhrases: result.keyPhrases || result.metadata?.keyPhrases || []
        }
      }
    });

    return sendJson(res, 200, {
      ok: true,
      cached: false,
      hash: stored.hash,
      result: serializeUnderstanding(stored)
    });
  } catch (error) {
    console.error("[handleCreateFileUnderstanding]", error);
    return sendJson(res, 500, { error: error.message || "File understanding failed" });
  }
}

/**
 * GET /api/file-understanding/:hash
 */
export async function handleGetFileUnderstanding(req, res) {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);
    const segments = url.pathname.split("/");
    const hash = segments[segments.length - 1];

    if (!/^[a-f0-9]{64}$/i.test(hash)) {
      return sendJson(res, 400, { error: "Invalid hash format" });
    }

    const cached = await prisma.fileUnderstanding.findUnique({ where: { hash } });
    if (!cached) {
      return sendJson(res, 404, { error: "File understanding not found. Trigger it first via POST /api/file-understanding" });
    }

    return sendJson(res, 200, {
      ok: true,
      hash: cached.hash,
      result: serializeUnderstanding(cached)
    });
  } catch (error) {
    console.error("[handleGetFileUnderstanding]", error);
    return sendJson(res, 500, { error: error.message || "Failed to get file understanding" });
  }
}

function serializeUnderstanding(record) {
  return {
    summary: record.summary,
    abstract: record.abstract,
    keyPhrases: record.metadata?.keyPhrases || [],
    structure: record.structure || { totalPages: 0, outline: [], sections: [] },
    keyMaterials: record.keyMaterials || { images: [], tables: [], charts: [] },
    actionableDirections: record.actionableDirections || [],
    isScanned: record.isScanned,
    metadata: record.metadata || {},
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

function extFromMime(mimeType) {
  const map = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
    "text/plain": "txt",
    "text/markdown": "md",
    "application/json": "json"
  };
  return map[mimeType] || "";
}
