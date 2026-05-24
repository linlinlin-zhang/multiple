/**
 * File Understanding API handlers
 * POST /api/file-understanding — trigger understanding for a material/asset
 * GET /api/file-understanding/:hash — get cached understanding result
 */

import { prisma } from "../lib/prisma.js";
import { readFile, hashBuffer, parseDataUrl } from "../lib/storage.js";
import { answerFileQuestion, buildFileUnderstanding } from "../lib/fileUnderstanding.js";

const ASYNC_THRESHOLD_BYTES = Number(process.env.FILE_UNDERSTANDING_ASYNC_BYTES || 5 * 1024 * 1024);
const JOB_RETENTION_MS = Number(process.env.FILE_UNDERSTANDING_JOB_RETENTION_MS || 30 * 60 * 1000);
const jobs = new Map();

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
    const lang = body?.language === "en" ? "en" : "zh";
    const input = await resolveFileInput(body);
    const { buffer, fileName, mimeType, ext, resolvedHash } = input;

    // Check cache first
    const cached = await prisma.fileUnderstanding.findUnique({ where: { hash: resolvedHash } });
    if (cached && !body?.refresh && cached.metadata?.documentPreview) {
      return sendJson(res, 200, {
        ok: true,
        cached: true,
        hash: cached.hash,
        result: serializeUnderstanding(cached)
      });
    }

    const forceAsync = body?.async === true || body?.background === true;
    if (forceAsync || buffer.length >= ASYNC_THRESHOLD_BYTES) {
      const job = enqueueUnderstandingJob(input, { lang });
      return sendJson(res, 202, {
        ok: true,
        async: true,
        jobId: job.id,
        status: job.status,
        hash: resolvedHash,
        fileName,
        fileSize: buffer.length,
        message: "File understanding is running in the background."
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
    const stored = await storeUnderstandingRecord({ resolvedHash, fileName, mimeType, result });

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

export async function handleGetFileUnderstandingJob(req, res) {
  try {
    cleanupJobs();
    const url = new URL(req.url || "/", `http://${req.headers.host}`);
    const jobId = url.pathname.split("/").pop();
    const job = jobs.get(jobId);
    if (!job) return sendJson(res, 404, { error: "File understanding job not found" });
    return sendJson(res, 200, serializeJob(job));
  } catch (error) {
    console.error("[handleGetFileUnderstandingJob]", error);
    return sendJson(res, 500, { error: error.message || "Failed to get file understanding job" });
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

export async function handleAskFileQuestion(body, res) {
  try {
    const question = typeof body?.question === "string" ? body.question.trim().slice(0, 1000) : "";
    if (!question) return sendJson(res, 400, { error: "question is required" });
    const lang = body?.language === "en" ? "en" : "zh";
    const input = await resolveFileInput(body);
    const answer = await answerFileQuestion(input.buffer, input.fileName, input.ext, question, {
      lang,
      apiKey: process.env.ANALYSIS_API_KEY || process.env.DASHSCOPE_API_KEY,
      baseUrl: process.env.ANALYSIS_API_BASE_URL,
      model: process.env.ANALYSIS_MODEL
    });
    return sendJson(res, 200, {
      ...answer,
      hash: input.resolvedHash,
      fileName: input.fileName
    });
  } catch (error) {
    console.error("[handleAskFileQuestion]", error);
    const status = /required|invalid|not found/i.test(error.message || "") ? 400 : 500;
    return sendJson(res, status, { error: error.message || "File question answering failed" });
  }
}

function serializeUnderstanding(record) {
  const metadata = record.metadata || {};
  return {
    summary: record.summary,
    abstract: record.abstract,
    keyPhrases: metadata.keyPhrases || [],
    structure: record.structure || { totalPages: 0, outline: [], sections: [] },
    keyMaterials: record.keyMaterials || { images: [], tables: [], charts: [] },
    actionableDirections: record.actionableDirections || [],
    documentPreview: metadata.documentPreview || null,
    canvasCards: metadata.canvasCards || [],
    canvasLinks: metadata.canvasLinks || [],
    qaHints: metadata.qaHints || null,
    ocr: metadata.ocr || null,
    isScanned: record.isScanned,
    metadata,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

async function resolveFileInput(body = {}) {
  const hash = typeof body?.hash === "string" ? body.hash : "";
  let fileName = typeof body?.fileName === "string" ? body.fileName : "";
  let mimeType = typeof body?.mimeType === "string" ? body.mimeType : "";
  const dataUrl = typeof body?.dataUrl === "string" ? body.dataUrl : "";

  let buffer;
  let ext = "";
  let resolvedHash = hash;

  if (resolvedHash) {
    try {
      buffer = await readFile(resolvedHash, { kind: "upload" });
    } catch {
      const materialItem = await prisma.materialItem.findFirst({ where: { hash: resolvedHash } });
      if (materialItem?.filePath) {
        const fs = await import("node:fs/promises");
        buffer = await fs.readFile(materialItem.filePath);
      } else {
        throw new Error("File not found for the given hash");
      }
    }
    if (!fileName || !mimeType) {
      const materialItem = await prisma.materialItem.findFirst({ where: { hash: resolvedHash } });
      fileName = fileName || materialItem?.fileName || `document-${resolvedHash.slice(0, 8)}`;
      mimeType = mimeType || materialItem?.mimeType || "application/octet-stream";
    }
    ext = fileName.split(".").pop()?.toLowerCase() || extFromMime(mimeType) || "bin";
  } else if (dataUrl) {
    const parsed = parseDataUrl(dataUrl);
    buffer = parsed.buffer;
    mimeType = mimeType || parsed.mimeType;
    ext = fileName.split(".").pop()?.toLowerCase() || parsed.ext || extFromMime(mimeType) || "bin";
    resolvedHash = hashBuffer(buffer);
    fileName = fileName || `document-${resolvedHash.slice(0, 8)}.${ext}`;
  } else {
    throw new Error("hash or dataUrl is required");
  }

  return {
    buffer,
    fileName,
    mimeType: mimeType || "application/octet-stream",
    ext,
    resolvedHash
  };
}

function enqueueUnderstandingJob(input, options = {}) {
  cleanupJobs();
  const id = `fu_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const now = Date.now();
  const job = {
    id,
    status: "queued",
    progress: 0,
    hash: input.resolvedHash,
    fileName: input.fileName,
    fileSize: input.buffer.length,
    createdAt: now,
    updatedAt: now,
    result: null,
    error: ""
  };
  jobs.set(id, job);
  runUnderstandingJob(job, input, options).catch((error) => {
    job.status = "failed";
    job.error = error.message || "File understanding job failed";
    job.updatedAt = Date.now();
  });
  return job;
}

async function runUnderstandingJob(job, input, options = {}) {
  job.status = "running";
  job.progress = 10;
  job.updatedAt = Date.now();
  const result = await buildFileUnderstanding(input.buffer, input.fileName, input.ext, {
    lang: options.lang,
    apiKey: process.env.ANALYSIS_API_KEY || process.env.DASHSCOPE_API_KEY,
    baseUrl: process.env.ANALYSIS_API_BASE_URL,
    model: process.env.ANALYSIS_MODEL
  });
  job.progress = 85;
  job.updatedAt = Date.now();
  const stored = await storeUnderstandingRecord({
    resolvedHash: input.resolvedHash,
    fileName: input.fileName,
    mimeType: input.mimeType,
    result
  });
  job.status = "completed";
  job.progress = 100;
  job.result = serializeUnderstanding(stored);
  job.updatedAt = Date.now();
}

async function storeUnderstandingRecord({ resolvedHash, fileName, mimeType, result }) {
  return prisma.fileUnderstanding.upsert({
    where: { hash: resolvedHash },
    create: understandingRecordData({ resolvedHash, fileName, mimeType, result }),
    update: understandingRecordData({ resolvedHash, fileName, mimeType, result })
  });
}

function understandingRecordData({ resolvedHash, fileName, mimeType, result }) {
  return {
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
      keyPhrases: result.keyPhrases || result.metadata?.keyPhrases || [],
      documentPreview: result.documentPreview || result.metadata?.documentPreview || null,
      canvasCards: result.canvasCards || result.metadata?.canvasCards || [],
      canvasLinks: result.canvasLinks || result.metadata?.canvasLinks || [],
      qaHints: result.qaHints || result.metadata?.qaHints || null,
      ocr: result.ocr || result.metadata?.ocr || null
    }
  };
}

function serializeJob(job) {
  return {
    ok: true,
    async: true,
    jobId: job.id,
    status: job.status,
    progress: job.progress,
    hash: job.hash,
    fileName: job.fileName,
    fileSize: job.fileSize,
    result: job.result,
    error: job.error || "",
    createdAt: new Date(job.createdAt).toISOString(),
    updatedAt: new Date(job.updatedAt).toISOString()
  };
}

function cleanupJobs() {
  const cutoff = Date.now() - JOB_RETENTION_MS;
  for (const [id, job] of jobs.entries()) {
    if (job.updatedAt < cutoff && (job.status === "completed" || job.status === "failed")) {
      jobs.delete(id);
    }
  }
}

function extFromMime(mimeType) {
  const map = {
    "application/pdf": "pdf",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.ms-powerpoint": "ppt",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
    "text/plain": "txt",
    "text/markdown": "md",
    "application/json": "json"
  };
  return map[mimeType] || "";
}
