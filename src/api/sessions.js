import { prisma } from "../lib/prisma.js";
import { storeDataUrl } from "../lib/storage.js";

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-cache"
  });
  res.end(JSON.stringify(data));
}

function serializeState(state, sessionId = undefined) {
  const nodeEntries = Array.from(state.nodes?.values?.() || []);
  const nodes = nodeEntries.map((n) => ({
    nodeId: n.id,
    type:
      n.id === "source"
        ? "source"
        : n.id === "analysis"
          ? "analysis"
          : n.generated
            ? "generated"
            : "option",
    x: n.x,
    y: n.y,
    width: n.width || 318,
    height: n.height || 220,
    data:
      n.option
        ? { option: n.option, imageHash: n.imageHash || null }
        : n.id === "source"
          ? { fileName: state.fileName }
          : n.id === "analysis"
            ? {
                summary: state.latestAnalysis?.summary,
                detectedSubjects: state.latestAnalysis?.detectedSubjects,
                moodKeywords: state.latestAnalysis?.moodKeywords
              }
            : {},
    collapsed: state.collapsed?.has?.(n.id) || false
  }));

  const links = (state.links || []).map((l) => ({
    fromNodeId: l.from,
    toNodeId: l.to,
    kind: l.kind || "option"
  }));

  const chatMessages = (state.chatMessages || []).map((m) => ({
    role: m.role,
    content: m.content
  }));

  return { nodes, links, chatMessages };
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

    // 1. Serialize nodes/links/messages from state
    const { nodes, links, chatMessages } = serializeState(state);

    // 2. Store images BEFORE transaction (files can't be rolled back)
    const assetRecords = [];

    // Source image
    if (typeof state.sourceImage === "string" && state.sourceImage.length > 0) {
      const stored = await storeDataUrl(state.sourceImage, { kind: "upload" });
      assetRecords.push({
        hash: stored.hash,
        kind: "upload",
        mimeType: stored.mimeType,
        fileSize: stored.size,
        fileName: state.fileName || null
      });
    }

    // Generated images inside nodes
    for (const n of nodes) {
      if (n.type === "generated" && n.data?.option && n.data?.imageHash) {
        // imageHash already stored — skip
        continue;
      }
      // If node carries a raw data URL (shouldn't in normal flow), store it
      if (n.type === "generated" && typeof n.data?.imageDataUrl === "string") {
        const stored = await storeDataUrl(n.data.imageDataUrl, { kind: "generated" });
        n.data.imageHash = stored.hash;
        delete n.data.imageDataUrl;
        assetRecords.push({
          hash: stored.hash,
          kind: "generated",
          mimeType: stored.mimeType,
          fileSize: stored.size,
          fileName: null
        });
      }
    }

    // 3. Transaction: create session + related rows
    // TODO: orphaned file cleanup job — if file write succeeds but transaction fails,
    // the stored file is not rolled back. Acceptable for v1, add cleanup later.
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

    // Store new images BEFORE transaction
    const assetRecords = [];

    if (typeof state.sourceImage === "string" && state.sourceImage.length > 0) {
      // Check if already stored by looking for hash prefix pattern
      // If it's a data URL, store it; if it's already /api/assets/..., skip
      if (state.sourceImage.startsWith("data:")) {
        const stored = await storeDataUrl(state.sourceImage, { kind: "upload" });
        assetRecords.push({
          hash: stored.hash,
          kind: "upload",
          mimeType: stored.mimeType,
          fileSize: stored.size,
          fileName: state.fileName || null
        });
      }
    }

    for (const n of nodes) {
      if (n.type === "generated" && typeof n.data?.imageDataUrl === "string") {
        const stored = await storeDataUrl(n.data.imageDataUrl, { kind: "generated" });
        n.data.imageHash = stored.hash;
        delete n.data.imageDataUrl;
        assetRecords.push({
          hash: stored.hash,
          kind: "generated",
          mimeType: stored.mimeType,
          fileSize: stored.size,
          fileName: null
        });
      }
    }

    // TODO: orphaned file cleanup job — if file write succeeds but transaction fails,
    // the stored file is not rolled back. Acceptable for v1, add cleanup later.
    const session = await prisma.$transaction(async (tx) => {
      // Delete existing related rows
      await tx.node.deleteMany({ where: { sessionId } });
      await tx.link.deleteMany({ where: { sessionId } });
      await tx.chatMessage.deleteMany({ where: { sessionId } });

      // Re-create
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
