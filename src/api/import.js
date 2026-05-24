import { prisma } from "../lib/prisma.js";
import { parseDataUrl, storeFile } from "../lib/storage.js";

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-cache"
  });
  res.end(JSON.stringify(data));
}

async function loadJSZip() {
  const module = await import("jszip");
  return module.default;
}

function normalizeAssetKind(kind) {
  return kind === "generated" ? "generated" : "upload";
}

function extensionFromMimeType(mimeType) {
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
    "text/markdown": "md",
    "application/json": "json",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
    "video/x-m4v": "m4v",
    "video/ogg": "ogv"
  };
  return map[String(mimeType || "").toLowerCase()] || "";
}

function extensionFromAsset(asset, mimeType = "") {
  const raw = String(asset?.fileName || asset?.path || "");
  const clean = raw.split(/[?#]/)[0];
  const dot = clean.lastIndexOf(".");
  const ext = dot >= 0 ? clean.slice(dot + 1).toLowerCase() : "";
  if (/^[a-z0-9]{1,8}$/.test(ext)) return ext === "jpeg" ? "jpg" : ext;
  return extensionFromMimeType(mimeType || asset?.mimeType) || "bin";
}

function addStoredAsset(records, record) {
  if (!record?.hash || !/^[a-f0-9]{64}$/i.test(record.hash)) return;
  const kind = normalizeAssetKind(record.kind);
  const key = `${kind}:${record.hash}`;
  if (records.some((item) => `${normalizeAssetKind(item.kind)}:${item.hash}` === key)) return;
  records.push({ ...record, kind });
}

function rewriteAssetHashes(value, hashMap) {
  if (!hashMap?.size) return value;
  if (typeof value === "string") {
    let next = value;
    for (const [from, to] of hashMap) next = next.split(from).join(to);
    return next;
  }
  if (Array.isArray(value)) return value.map((item) => rewriteAssetHashes(item, hashMap));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, rewriteAssetHashes(item, hashMap)]));
  }
  return value;
}

async function payloadFromArchive(buffer) {
  const JSZip = await loadJSZip();
  const zip = await JSZip.loadAsync(buffer);
  const sessionFile = zip.file("session.json") || zip.file(/(^|\/)[^/]+\.json$/i)[0];
  if (!sessionFile) throw new Error("Session package does not contain a JSON file.");
  const payload = JSON.parse(await sessionFile.async("string"));
  const assets = Array.isArray(payload.assets) ? payload.assets : [];
  await Promise.all(assets.map(async (asset) => {
    if (!asset?.path || asset.missing) return;
    const file = zip.file(asset.path);
    if (!file) return;
    asset.buffer = await file.async("nodebuffer");
  }));
  return payload;
}

async function normalizeImportPayload(input) {
  if (Buffer.isBuffer(input)) return payloadFromArchive(input);
  if (input?.archiveBase64) return payloadFromArchive(Buffer.from(String(input.archiveBase64), "base64"));
  return input;
}

function importError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function validateImportPayload(payload) {
  if (!payload || typeof payload !== "object") {
    throw importError("Invalid request body", 400);
  }

  const version = Number(payload.version);
  if (version !== 1 && version !== 2) {
    throw importError("Unsupported export version", 400);
  }

  const session = payload.session;
  if (!session || !Array.isArray(session.nodes) || !Array.isArray(session.links) || !Array.isArray(session.chatMessages)) {
    throw importError("Invalid session data", 400);
  }

  return session;
}

function validHash(value) {
  return /^[a-f0-9]{64}$/i.test(String(value || ""));
}

function sessionTitleForImport(session) {
  return String(session?.title || "导入的会话").trim().slice(0, 160) || "导入的会话";
}

async function countExistingTitle(title, visitorId) {
  try {
    return await prisma.session.count({ where: { visitorId, source: "user", title } });
  } catch {
    return prisma.session.count({ where: { visitorId, title } });
  }
}

async function resolveImportedTitle(title, strategy, visitorId) {
  const base = sessionTitleForImport({ title });
  if (strategy !== "rename") return base;

  let candidate = base;
  let suffix = 2;
  while (await countExistingTitle(candidate, visitorId)) {
    candidate = `${base} (导入 ${suffix})`.slice(0, 160);
    suffix += 1;
    if (suffix > 99) {
      candidate = `${base.slice(0, 132)} ${Date.now()}`;
      break;
    }
  }
  return candidate;
}

async function summarizeNormalizedImportPayload(payload, options = {}) {
  const session = validateImportPayload(payload);
  const visitorId = options.visitorId || "legacy";
  const title = sessionTitleForImport(session);
  const assets = Array.isArray(payload.assets) ? payload.assets : [];
  const assetHashes = [...new Set(assets.map((asset) => String(asset?.hash || "").toLowerCase()).filter(validHash))];
  const missingAssets = assets.filter((asset) => asset?.missing || (asset?.path && !asset?.buffer && !asset?.dataUrl && !asset?.hash));
  const totalAssetBytes = assets.reduce((sum, asset) => {
    if (Buffer.isBuffer(asset?.buffer)) return sum + asset.buffer.length;
    const fileSize = Number(asset?.fileSize);
    return sum + (Number.isFinite(fileSize) && fileSize > 0 ? fileSize : 0);
  }, 0);

  const conflicts = [];
  const existingTitleCount = await countExistingTitle(title, visitorId);
  if (existingTitleCount > 0) {
    conflicts.push({
      type: "title",
      severity: "warning",
      title,
      existingCount: existingTitleCount,
      message: "A session with the same title already exists."
    });
  }

  if (assetHashes.length) {
    const [duplicateSessionAssets, duplicateMaterials] = await Promise.all([
      prisma.asset.count({
        where: {
          hash: { in: assetHashes },
          session: { visitorId }
        }
      }).catch(() => 0),
      prisma.materialItem.count({
        where: {
          hash: { in: assetHashes },
          OR: [
            { visitorId },
            { source: "system" }
          ]
        }
      }).catch(() => 0)
    ]);
    if (duplicateSessionAssets || duplicateMaterials) {
      conflicts.push({
        type: "assets",
        severity: "info",
        duplicateSessionAssets,
        duplicateMaterials,
        message: "Some assets already exist and will be deduplicated by content hash."
      });
    }
  }

  const warnings = [];
  if (missingAssets.length) {
    warnings.push({
      type: "missing-assets",
      count: missingAssets.length,
      message: "Some exported assets are marked missing or unavailable in the package."
    });
  }

  return {
    ok: true,
    version: Number(payload.version),
    packageVersion: Number(payload.packageVersion || 1),
    format: payload.format || "thoughtgrid-session-package",
    originalSessionId: payload.originalSessionId || null,
    title,
    nodeCount: session.nodes.length,
    linkCount: session.links.length,
    assetCount: assets.length,
    chatMessageCount: session.chatMessages.length,
    totalAssetBytes,
    conflicts,
    warnings
  };
}

function inputFromBatchPackage(item) {
  if (item?.payload) return item.payload;
  if (typeof item?.json === "string") return JSON.parse(item.json);
  return item;
}

async function storeImportAsset(asset, storedAssets, hashMap) {
  const kind = normalizeAssetKind(asset.kind);
  let buffer = Buffer.isBuffer(asset.buffer) ? asset.buffer : null;
  let mimeType = asset.mimeType || "";
  if (!buffer && typeof asset.dataUrl === "string" && asset.dataUrl.startsWith("data:")) {
    const parsed = parseDataUrl(asset.dataUrl);
    buffer = parsed.buffer;
    mimeType = mimeType || parsed.mimeType;
  }
  if (buffer) {
    const stored = await storeFile(buffer, { kind, ext: extensionFromAsset(asset, mimeType) });
    if (asset.hash && asset.hash !== stored.hash) hashMap.set(asset.hash, stored.hash);
    addStoredAsset(storedAssets, {
      hash: stored.hash,
      kind,
      mimeType: mimeType || asset.mimeType || "application/octet-stream",
      fileSize: stored.size,
      fileName: asset.fileName || null
    });
    return;
  }
  if (asset.hash) {
    addStoredAsset(storedAssets, {
      hash: asset.hash,
      kind,
      mimeType: mimeType || "application/octet-stream",
      fileSize: asset.fileSize || 0,
      fileName: asset.fileName || null
    });
  }
}

async function importSessionPayload(input, options = {}) {
  const payload = await normalizeImportPayload(input);
  const preview = await summarizeNormalizedImportPayload(payload, options);
  const session = validateImportPayload(payload);
  const visitorId = options.visitorId || "legacy";
  const conflictStrategy = options.conflictStrategy === "rename" ? "rename" : "duplicate";

  const storedAssets = [];
  const hashMap = new Map();
  const assets = Array.isArray(payload.assets) ? payload.assets : [];
  for (const asset of assets) {
    try {
      await storeImportAsset(asset, storedAssets, hashMap);
    } catch (err) {
      console.error("[import] failed to store asset:", err.message);
    }
  }

  const restoredSession = rewriteAssetHashes(session, hashMap);
  const restoredTitle = await resolveImportedTitle(restoredSession.title, conflictStrategy, visitorId);
  let restoredViewState = restoredSession.viewState || { x: 0, y: 0, scale: 0.86 };
  if (restoredViewState && typeof restoredViewState === "object" && !Array.isArray(restoredViewState)) {
    const snapshot = restoredViewState.stateSnapshot && typeof restoredViewState.stateSnapshot === "object"
      ? restoredViewState.stateSnapshot
      : null;
    if (snapshot && !Array.isArray(snapshot.chatMessages) && Array.isArray(restoredSession.chatMessages)) {
      restoredViewState = {
        ...restoredViewState,
        stateSnapshot: {
          ...snapshot,
          chatMessages: restoredSession.chatMessages
        }
      };
    }
  }

  const newSession = await prisma.$transaction(async (tx) => {
    const sessionRecord = await tx.session.create({
      data: {
        visitorId,
        title: restoredTitle,
        isDemo: restoredSession.isDemo || false,
        viewState: restoredViewState
      }
    });

    if (storedAssets.length) {
      await tx.asset.createMany({
        data: storedAssets.map((a) => ({ ...a, sessionId: sessionRecord.id }))
      });
    }

    if (restoredSession.nodes?.length) {
      await tx.node.createMany({
        data: restoredSession.nodes.map((n) => ({
          sessionId: sessionRecord.id,
          nodeId: n.nodeId,
          type: n.type,
          x: n.x,
          y: n.y,
          width: n.width || 318,
          height: n.height || 220,
          data: n.data || {},
          collapsed: n.collapsed || false
        }))
      });
    }

    if (restoredSession.links?.length) {
      await tx.link.createMany({
        data: restoredSession.links.map((l) => ({
          sessionId: sessionRecord.id,
          fromNodeId: l.fromNodeId,
          toNodeId: l.toNodeId,
          kind: l.kind || "option"
        }))
      });
    }

    const chatMessages = (restoredSession.chatMessages || []).map((m) => ({
      sessionId: sessionRecord.id,
      role: m.role === "assistant" ? "assistant" : "user",
      content: typeof m.content === "string" ? m.content : "",
      thinkingContent: typeof m.thinkingContent === "string" ? m.thinkingContent : null,
      references: Array.isArray(m.references) ? m.references : null
    })).filter((m) => m.content);
    if (chatMessages.length) {
      await tx.chatMessage.createMany({
        data: chatMessages
      });
    }

    return sessionRecord;
  });

  return {
    ok: true,
    sessionId: newSession.id,
    title: newSession.title,
    createdAt: newSession.createdAt,
    preview,
    conflicts: preview.conflicts,
    warnings: preview.warnings
  };
}

/**
 * POST /api/import/preview
 */
export async function handlePreviewImport(body, res, options = {}) {
  try {
    const payload = await normalizeImportPayload(body);
    const preview = await summarizeNormalizedImportPayload(payload, options);
    return sendJson(res, 200, preview);
  } catch (error) {
    console.error("[handlePreviewImport]", error);
    return sendJson(res, error.status || 500, { error: error.message || "Failed to preview import" });
  }
}

/**
 * POST /api/import
 */
export async function handleImportSession(body, res, options = {}) {
  try {
    const result = await importSessionPayload(body, {
      ...options,
      conflictStrategy: body?.conflictStrategy
    });
    return sendJson(res, 200, result);
  } catch (error) {
    console.error("[handleImportSession]", error);
    return sendJson(res, error.status || 500, { error: error.message || "Failed to import session" });
  }
}

/**
 * POST /api/import/batch
 */
export async function handleBatchImport(body, res, options = {}) {
  try {
    const packages = Array.isArray(body) ? body : (Array.isArray(body?.packages) ? body.packages : []);
    if (!packages.length) {
      return sendJson(res, 400, { error: "packages is required" });
    }
    if (packages.length > 20) {
      return sendJson(res, 400, { error: "Batch import supports up to 20 packages at once" });
    }

    const conflictStrategy = body?.conflictStrategy === "rename" ? "rename" : "duplicate";
    const results = [];
    for (const [index, item] of packages.entries()) {
      const name = typeof item?.name === "string" && item.name.trim()
        ? item.name.trim().slice(0, 240)
        : `package-${index + 1}`;
      try {
        const result = await importSessionPayload(inputFromBatchPackage(item), {
          ...options,
          conflictStrategy
        });
        results.push({ name, ...result });
      } catch (error) {
        results.push({
          ok: false,
          name,
          error: error.message || "Failed to import package"
        });
      }
    }

    const failedCount = results.filter((item) => !item.ok).length;
    return sendJson(res, 200, {
      ok: failedCount === 0,
      importedCount: results.length - failedCount,
      failedCount,
      results
    });
  } catch (error) {
    console.error("[handleBatchImport]", error);
    return sendJson(res, error.status || 500, { error: error.message || "Failed to batch import sessions" });
  }
}
