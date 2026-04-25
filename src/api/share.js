import { prisma } from "../lib/prisma.js";

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-cache"
  });
  res.end(JSON.stringify(data));
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
