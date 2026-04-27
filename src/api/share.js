import { prisma } from "../lib/prisma.js";

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-cache"
  });
  res.end(JSON.stringify(data));
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * POST /api/sessions/:id/share
 */
export async function handleCreateShare(sessionId, res) {
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

    const snapshotData = {
      title: session.title,
      isDemo: session.isDemo,
      createdAt: session.createdAt,
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
      assets: session.assets.map((a) => ({
        hash: a.hash,
        kind: a.kind,
        mimeType: a.mimeType,
        fileSize: a.fileSize,
        fileName: a.fileName
      })),
      chatMessages: session.chatMessages.map((m) => ({
        role: m.role,
        content: m.content
      }))
    };

    const shareToken = await prisma.shareToken.create({
      data: { sessionId, snapshotData }
    });

    return sendJson(res, 200, {
      ok: true,
      shareUrl: `/share/${shareToken.token}`,
      token: shareToken.token,
      createdAt: shareToken.createdAt
    });
  } catch (error) {
    console.error("[handleCreateShare]", error);
    return sendJson(res, 500, { error: error.message || "Failed to create share" });
  }
}

/**
 * GET /api/share/:token
 */
export async function handleGetShare(token, res) {
  try {
    if (!token || typeof token !== "string") {
      return sendJson(res, 400, { error: "token is required" });
    }

    const shareToken = await prisma.shareToken.findUnique({
      where: { token },
      select: {
        token: true,
        snapshotData: true,
        createdAt: true,
        expiresAt: true
      }
    });

    if (!shareToken) {
      return sendJson(res, 404, { error: "Share not found" });
    }

    if (shareToken.expiresAt && new Date() > shareToken.expiresAt) {
      return sendJson(res, 410, { error: "Share link has expired" });
    }

    return sendJson(res, 200, {
      ok: true,
      token: shareToken.token,
      createdAt: shareToken.createdAt,
      expiresAt: shareToken.expiresAt,
      snapshot: shareToken.snapshotData
    });
  } catch (error) {
    console.error("[handleGetShare]", error);
    return sendJson(res, 500, { error: error.message || "Failed to get share" });
  }
}

/**
 * POST /api/share-image
 */
export async function handleCreateImageShare(body, res) {
  try {
    const nodeId = typeof body?.nodeId === "string" ? body.nodeId.trim() : "";
    const sessionId = typeof body?.sessionId === "string" ? body.sessionId.trim() : "";

    if (!nodeId || !sessionId) {
      return sendJson(res, 400, { error: "nodeId and sessionId are required" });
    }

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { nodes: true }
    });

    if (!session) {
      return sendJson(res, 404, { error: "Session not found" });
    }

    const node = session.nodes.find((n) => n.nodeId === nodeId);
    if (!node || node.type !== "generated") {
      return sendJson(res, 404, { error: "Generated node not found" });
    }

    const analysisNode = session.nodes.find((n) => n.nodeId === "analysis");
    const analysisData = analysisNode?.data || {};

    const nodeData = node.data || {};
    const snapshotData = {
      type: "image",
      nodeId,
      sessionId,
      imageHash: nodeData.imageHash || null,
      imageDataUrl: nodeData.imageDataUrl || null,
      explanation: nodeData.explanation || null,
      option: nodeData.option || null,
      title: session.title || "Shared Image",
      createdAt: session.createdAt,
      analysis: {
        title: analysisData.title || null,
        summary: analysisData.summary || null,
        detectedSubjects: analysisData.detectedSubjects || null,
        moodKeywords: analysisData.moodKeywords || null
      }
    };

    const shareToken = await prisma.shareToken.create({
      data: {
        sessionId,
        snapshotData,
        expiresAt: addDays(new Date(), 30)
      }
    });

    return sendJson(res, 200, {
      ok: true,
      shareUrl: `/share-image/${shareToken.token}`,
      token: shareToken.token,
      createdAt: shareToken.createdAt
    });
  } catch (error) {
    console.error("[handleCreateImageShare]", error);
    return sendJson(res, 500, { error: error.message || "Failed to create image share" });
  }
}

/**
 * GET /api/share-image/:token
 */
export async function handleGetImageShare(token, res) {
  try {
    if (!token || typeof token !== "string") {
      return sendJson(res, 400, { error: "token is required" });
    }

    const shareToken = await prisma.shareToken.findUnique({
      where: { token },
      select: {
        token: true,
        snapshotData: true,
        createdAt: true,
        expiresAt: true
      }
    });

    if (!shareToken) {
      return sendJson(res, 404, { error: "Share not found" });
    }

    if (shareToken.expiresAt && new Date() > shareToken.expiresAt) {
      return sendJson(res, 410, { error: "Share link has expired" });
    }

    const snapshot = shareToken.snapshotData || {};
    if (snapshot.type !== "image") {
      return sendJson(res, 404, { error: "Image share not found" });
    }

    return sendJson(res, 200, {
      ok: true,
      token: shareToken.token,
      createdAt: shareToken.createdAt,
      expiresAt: shareToken.expiresAt,
      imageHash: snapshot.imageHash,
      imageDataUrl: snapshot.imageDataUrl,
      explanation: snapshot.explanation,
      option: snapshot.option,
      title: snapshot.title,
      sessionCreatedAt: snapshot.createdAt,
      analysis: snapshot.analysis || null
    });
  } catch (error) {
    console.error("[handleGetImageShare]", error);
    return sendJson(res, 500, { error: error.message || "Failed to get image share" });
  }
}
