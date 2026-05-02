import { prisma } from "../lib/prisma.js";
import { storeDataUrl, readFile } from "../lib/storage.js";

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-cache"
  });
  res.end(JSON.stringify(data));
}

function serializeState(state) {
  const nodeEntries = normalizeNodeEntries(state.nodes);
  const collapsedIds = normalizeCollapsedIds(state.collapsed);

  const nodes = nodeEntries.map((n) => ({
    nodeId: n.id,
    type:
      n.id === "source"
        ? "source"
        : n.id === "analysis"
          ? "analysis"
          : n.sourceCard
            ? "source-card"
            : n.generated
              ? "generated"
              : "option",
    x: Number.isFinite(n.x) ? n.x : 0,
    y: Number.isFinite(n.y) ? n.y : 0,
    width: n.width || 318,
    height: n.height || 220,
    data:
      n.sourceCard
        ? {
            sourceCard: n.sourceCard,
            imageHash: n.sourceCard?.imageHash || n.imageHash || null
          }
        : n.option
        ? {
            option: n.option,
            imageHash: n.imageHash || null,
            imageDataUrl: n.imageDataUrl || null,
            explanation: n.explanation || null,
            references: n.option?.references || null
          }
        : n.id === "source"
          ? {
              fileName: state.fileName || null,
              imageHash: state.sourceImageHash || extractAssetHash(state.sourceImage) || null,
              sourceType: state.sourceType || "image",
              sourceUrl: state.sourceUrl || null,
              sourceText: state.sourceText || null
            }
          : n.id === "analysis"
            ? {
                title: state.latestAnalysis?.title,
                summary: state.latestAnalysis?.summary,
                detectedSubjects: state.latestAnalysis?.detectedSubjects,
                moodKeywords: state.latestAnalysis?.moodKeywords
              }
            : {},
    collapsed: collapsedIds.has(n.id)
  }));

  const links = (Array.isArray(state.links) ? state.links : []).map((l) => ({
    fromNodeId: l.from || l.fromNodeId,
    toNodeId: l.to || l.toNodeId,
    kind: l.kind || "option"
  }));

  const chatMessages = (Array.isArray(state.chatMessages) ? state.chatMessages : []).map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: typeof m.content === "string" ? m.content : ""
  })).filter((m) => m.content);

  return { nodes, links, chatMessages };
}

function normalizeNodeEntries(nodes) {
  if (!nodes) return [];
  if (typeof nodes.values === "function") return Array.from(nodes.values());
  if (Array.isArray(nodes)) return nodes;
  if (typeof nodes === "object") return Object.values(nodes);
  return [];
}

function normalizeCollapsedIds(collapsed) {
  if (!collapsed) return new Set();
  if (typeof collapsed.has === "function") return collapsed;
  if (Array.isArray(collapsed)) return new Set(collapsed);
  return new Set();
}

function addAssetRecord(assetRecords, record) {
  if (!record?.hash || !record?.kind) return;
  const key = `${record.kind}:${record.hash}`;
  if (assetRecords.some((asset) => `${asset.kind}:${asset.hash}` === key)) return;
  assetRecords.push(record);
}

async function collectSourceAsset(state, assetRecords) {
  const fileName = state.fileName || null;
  if (typeof state.sourceImage === "string" && state.sourceImage.startsWith("data:")) {
    const stored = await storeDataUrl(state.sourceImage, { kind: "upload" });
    addAssetRecord(assetRecords, {
      hash: stored.hash,
      kind: "upload",
      mimeType: stored.mimeType,
      fileSize: stored.size,
      fileName
    });
    state.sourceImageHash = stored.hash;
    return;
  }

  const hash = state.sourceImageHash || extractAssetHash(state.sourceImage);
  const record = await assetRecordFromStoredHash(hash, { kind: "upload", fileName });
  addAssetRecord(assetRecords, record);
}

async function collectGeneratedAssets(nodes, assetRecords) {
  for (const node of nodes) {
    if (node.type === "source-card" && node.data?.imageHash) {
      const record = await assetRecordFromStoredHash(node.data.imageHash, {
        kind: "upload",
        fileName: node.data.sourceCard?.fileName || node.data.sourceCard?.title || null
      });
      addAssetRecord(assetRecords, record);
      continue;
    }
    if (node.type !== "generated") continue;

    if (typeof node.data?.imageDataUrl === "string" && node.data.imageDataUrl.startsWith("data:")) {
      const stored = await storeDataUrl(node.data.imageDataUrl, { kind: "generated" });
      node.data.imageHash = stored.hash;
      delete node.data.imageDataUrl;
      addAssetRecord(assetRecords, {
        hash: stored.hash,
        kind: "generated",
        mimeType: stored.mimeType,
        fileSize: stored.size,
        fileName: null
      });
      continue;
    }

    if (node.data?.imageHash) {
      const record = await assetRecordFromStoredHash(node.data.imageHash, { kind: "generated" });
      addAssetRecord(assetRecords, record);
    }

    delete node.data.imageDataUrl;
  }
}

async function assetRecordFromStoredHash(hash, { kind = "upload", fileName = null, mimeType = "" } = {}) {
  if (!/^[a-f0-9]{64}$/i.test(hash || "")) return null;
  try {
    const buffer = await readFile(hash, { kind });
    return {
      hash,
      kind,
      mimeType: mimeType || detectMimeType(buffer),
      fileSize: buffer.length,
      fileName
    };
  } catch {
    return {
      hash,
      kind,
      mimeType: mimeType || "application/octet-stream",
      fileSize: 0,
      fileName
    };
  }
}

function extractAssetHash(value) {
  if (typeof value !== "string") return "";
  const match = value.match(/\/api\/assets\/([a-f0-9]{64})(?:\?|$)/i);
  return match ? match[1] : "";
}

function detectMimeType(buffer) {
  if (buffer.length >= 4) {
    const header = buffer.slice(0, 4).toString("hex");
    if (header.startsWith("89504e47")) return "image/png";
    if (header.startsWith("ffd8ff")) return "image/jpeg";
    if (header.startsWith("52494646")) return "image/webp";
    if (header.startsWith("47494638")) return "image/gif";
  }
  const textPrefix = buffer.slice(0, 128).toString("utf8").trimStart();
  if (textPrefix.startsWith("<svg") || textPrefix.startsWith("<?xml")) return "image/svg+xml";
  return "application/octet-stream";
}

/**
 * POST /api/sessions
 */
export async function handleCreateSession(body, res) {
  try {
    const state = body?.state;
    if (!state || typeof state !== "object") {
      return sendJson(res, 400, { error: "state is required" });
    }

    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const isDemo = body?.isDemo === true;
    const viewState = state.view || { x: 0, y: 0, scale: 0.86 };

    const { nodes, links, chatMessages } = serializeState(state);
    const assetRecords = [];
    await collectSourceAsset(state, assetRecords);
    await collectGeneratedAssets(nodes, assetRecords);

    const session = await prisma.$transaction(async (tx) => {
      const session = await tx.session.create({
        data: {
          title: title || "未命名会话",
          isDemo,
          viewState
        }
      });

      if (assetRecords.length) {
        await tx.asset.createMany({
          data: assetRecords.map((a) => ({ ...a, sessionId: session.id }))
        });
      }

      if (nodes.length) {
        await tx.node.createMany({
          data: nodes.map((n) => ({
            sessionId: session.id,
            nodeId: n.nodeId,
            type: n.type,
            x: n.x,
            y: n.y,
            width: n.width,
            height: n.height,
            data: n.data,
            collapsed: n.collapsed
          }))
        });
      }

      if (links.length) {
        await tx.link.createMany({
          data: links.map((l) => ({
            sessionId: session.id,
            fromNodeId: l.fromNodeId,
            toNodeId: l.toNodeId,
            kind: l.kind
          }))
        });
      }

      if (chatMessages.length) {
        await tx.chatMessage.createMany({
          data: chatMessages.map((m) => ({
            sessionId: session.id,
            role: m.role,
            content: m.content
          }))
        });
      }

      return session;
    });

    return sendJson(res, 200, {
      ok: true,
      sessionId: session.id,
      savedAt: session.updatedAt
    });
  } catch (error) {
    console.error("[handleCreateSession]", error);
    return sendJson(res, 500, { error: error.message || "Failed to create session" });
  }
}

/**
 * GET /api/sessions/:id
 */
export async function handleGetSession(sessionId, res) {
  try {
    if (!sessionId || typeof sessionId !== "string") {
      return sendJson(res, 400, { error: "sessionId is required" });
    }

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        nodes: true,
        links: true,
        assets: true,
        chatMessages: { orderBy: { createdAt: "asc" } }
      }
    });

    if (!session) {
      return sendJson(res, 404, { error: "Session not found" });
    }

    return sendJson(res, 200, session);
  } catch (error) {
    console.error("[handleGetSession]", error);
    return sendJson(res, 500, { error: error.message || "Failed to get session" });
  }
}

/**
 * PUT /api/sessions/:id
 */
export async function handleUpdateSession(sessionId, body, res) {
  try {
    if (!sessionId || typeof sessionId !== "string") {
      return sendJson(res, 400, { error: "sessionId is required" });
    }

    const state = body?.state;
    if (!state || typeof state !== "object") {
      return sendJson(res, 400, { error: "state is required" });
    }

    const title = typeof body?.title === "string" ? body.title.trim() : undefined;
    const viewState = state.view || { x: 0, y: 0, scale: 0.86 };

    const { nodes, links, chatMessages } = serializeState(state);
    const assetRecords = [];
    await collectSourceAsset(state, assetRecords);
    await collectGeneratedAssets(nodes, assetRecords);

    const session = await prisma.$transaction(async (tx) => {
      await tx.node.deleteMany({ where: { sessionId } });
      await tx.link.deleteMany({ where: { sessionId } });
      await tx.chatMessage.deleteMany({ where: { sessionId } });
      await tx.asset.deleteMany({ where: { sessionId } });

      if (assetRecords.length) {
        await tx.asset.createMany({
          data: assetRecords.map((a) => ({ ...a, sessionId }))
        });
      }

      if (nodes.length) {
        await tx.node.createMany({
          data: nodes.map((n) => ({
            sessionId,
            nodeId: n.nodeId,
            type: n.type,
            x: n.x,
            y: n.y,
            width: n.width,
            height: n.height,
            data: n.data,
            collapsed: n.collapsed
          }))
        });
      }

      if (links.length) {
        await tx.link.createMany({
          data: links.map((l) => ({
            sessionId,
            fromNodeId: l.fromNodeId,
            toNodeId: l.toNodeId,
            kind: l.kind
          }))
        });
      }

      if (chatMessages.length) {
        await tx.chatMessage.createMany({
          data: chatMessages.map((m) => ({
            sessionId,
            role: m.role,
            content: m.content
          }))
        });
      }

      return tx.session.update({
        where: { id: sessionId },
        data: {
          ...(title !== undefined ? { title } : {}),
          updatedAt: new Date(),
          viewState
        }
      });
    });

    return sendJson(res, 200, {
      ok: true,
      sessionId,
      savedAt: session.updatedAt
    });
  } catch (error) {
    console.error("[handleUpdateSession]", error);
    return sendJson(res, 500, { error: error.message || "Failed to update session" });
  }
}

/**
 * GET /api/sessions/:id/export
 */
export async function handleExportSession(sessionId, res) {
  try {
    if (!sessionId || typeof sessionId !== "string") {
      return sendJson(res, 400, { error: "sessionId is required" });
    }

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        nodes: true,
        links: true,
        assets: true,
        chatMessages: { orderBy: { createdAt: "asc" } }
      }
    });

    if (!session) {
      return sendJson(res, 404, { error: "Session not found" });
    }

    const exportPayload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      session: {
        title: session.title,
        isDemo: session.isDemo,
        viewState: session.viewState,
        nodes: session.nodes.map((n) => ({
          nodeId: n.nodeId,
          type: n.type,
          x: n.x,
          y: n.y,
          width: n.width,
          height: n.height,
          data: n.data,
          collapsed: n.collapsed
        })),
        links: session.links.map((l) => ({
          fromNodeId: l.fromNodeId,
          toNodeId: l.toNodeId,
          kind: l.kind
        })),
        chatMessages: session.chatMessages.map((m) => ({
          role: m.role,
          content: m.content
        }))
      },
      assets: []
    };

    for (const asset of session.assets) {
      try {
        const buffer = await readFile(asset.hash, { kind: asset.kind });
        const mimeType = asset.mimeType || detectMimeType(buffer);
        exportPayload.assets.push({
          hash: asset.hash,
          kind: asset.kind,
          mimeType,
          fileSize: asset.fileSize,
          fileName: asset.fileName,
          dataUrl: `data:${mimeType};base64,${buffer.toString("base64")}`
        });
      } catch {
        exportPayload.assets.push({
          hash: asset.hash,
          kind: asset.kind,
          mimeType: asset.mimeType,
          fileSize: asset.fileSize,
          fileName: asset.fileName,
          dataUrl: null,
          missing: true
        });
      }
    }

    const safeTitle = (session.title || "session").replace(/[^a-z0-9_-]+/gi, "_").slice(0, 40) || "session";
    const encodedTitle = encodeURIComponent(`${session.title || "session"}_${sessionId.slice(0, 8)}.json`);
    res.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeTitle}_${sessionId.slice(0, 8)}.json"; filename*=UTF-8''${encodedTitle}`,
      "Cache-Control": "no-cache"
    });
    res.end(JSON.stringify(exportPayload, null, 2));
  } catch (error) {
    console.error("[handleExportSession]", error);
    return sendJson(res, 500, { error: error.message || "Failed to export session" });
  }
}
