import JSZip from "jszip";
import { prisma } from "../lib/prisma.js";
import { parseDataUrl, storeFile } from "../lib/storage.js";

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-cache"
  });
  res.end(JSON.stringify(data));
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

/**
 * POST /api/import
 */
export async function handleImportSession(body, res, options = {}) {
  try {
    const payload = await normalizeImportPayload(body);
    if (!payload || typeof payload !== "object") {
      return sendJson(res, 400, { error: "Invalid request body" });
    }

    const version = Number(payload.version);
    if (version !== 1 && version !== 2) {
      return sendJson(res, 400, { error: "Unsupported export version" });
    }

    const session = payload.session;
    if (!session || !Array.isArray(session.nodes) || !Array.isArray(session.links) || !Array.isArray(session.chatMessages)) {
      return sendJson(res, 400, { error: "Invalid session data" });
    }

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
    const restoredViewState = restoredSession.viewState || { x: 0, y: 0, scale: 0.86 };

    const newSession = await prisma.$transaction(async (tx) => {
      const sessionRecord = await tx.session.create({
        data: {
          visitorId: options.visitorId || "legacy",
          title: restoredSession.title || "导入的会话",
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

    return sendJson(res, 200, {
      ok: true,
      sessionId: newSession.id,
      title: newSession.title,
      createdAt: newSession.createdAt
    });
  } catch (error) {
    console.error("[handleImportSession]", error);
    return sendJson(res, 500, { error: error.message || "Failed to import session" });
  }
}
