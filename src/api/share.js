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

function resolveExpiresAt(body, defaultDays = null) {
  const raw = body?.expiresInDays ?? body?.ttlDays ?? body?.expiresDays;
  if (raw === undefined) return defaultDays ? addDays(new Date(), defaultDays) : null;
  if (raw === null || raw === "" || raw === "never" || raw === 0 || raw === "0") return null;
  const days = Math.floor(Number(raw));
  if (!Number.isFinite(days) || days < 1) return defaultDays ? addDays(new Date(), defaultDays) : null;
  return addDays(new Date(), Math.min(days, 365));
}

function cloneJson(value, fallback = null, maxBytes = 65536) {
  if (value === undefined || value === null) return fallback;
  try {
    const json = JSON.stringify(value);
    if (!json || json.length > maxBytes) return fallback;
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

function cloneJsonArray(value, maxItems = 32, maxBytes = 65536) {
  if (!Array.isArray(value)) return [];
  return cloneJson(value.slice(0, maxItems), [], maxBytes) || [];
}

function cloneJsonObject(value, maxBytes = 65536) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return cloneJson(value, null, maxBytes);
}

function snapshotTextFingerprint(value) {
  return String(value || "").normalize("NFKC").replace(/\s+/g, " ").trim();
}

function sanitizeSnapshotThinkingContent(value, reply = "") {
  const thinking = typeof value === "string" ? value.trim() : "";
  const content = typeof reply === "string" ? reply.trim() : "";
  if (!thinking || !content) return thinking;
  const thinkingKey = snapshotTextFingerprint(thinking);
  const contentKey = snapshotTextFingerprint(content);
  if (!thinkingKey || !contentKey) return thinking;
  if (thinkingKey === contentKey) return "";
  const shorter = thinkingKey.length < contentKey.length ? thinkingKey : contentKey;
  const longer = thinkingKey.length < contentKey.length ? contentKey : thinkingKey;
  if (shorter.length > 80 && longer.includes(shorter) && shorter.length / Math.max(longer.length, 1) > 0.9) return "";
  return thinking;
}

function normalizeSnapshotChatMessages(messages = []) {
  return (Array.isArray(messages) ? messages : []).slice(-500).map((m) => {
    const content = typeof m?.content === "string" ? m.content : "";
    const thinkingContent = sanitizeSnapshotThinkingContent(typeof m?.thinkingContent === "string" ? m.thinkingContent : "", content);
    return {
      role: m?.role === "assistant" ? "assistant" : "user",
      content,
      attachments: cloneJsonArray(m?.attachments, 12, 256000),
      branchNodeId: typeof m?.branchNodeId === "string" ? m.branchNodeId : null,
      thinkingTrace: cloneJsonArray(m?.thinkingTrace || m?.trace, 24, 64000),
      thinkingContent: thinkingContent.trim() ? thinkingContent.slice(0, 120000) : "",
      thinkingRequested: Boolean(thinkingContent),
      actions: cloneJsonArray(m?.actions, 48, 128000),
      actionResults: cloneJsonArray(m?.actionResults, 48, 96000),
      actionPolicy: cloneJsonObject(m?.actionPolicy, 160000),
      artifacts: cloneJsonArray(m?.artifacts || m?.materials || m?.cards, 48, 160000),
      references: cloneJsonArray(m?.references, 48, 96000),
      responseId: typeof m?.responseId === "string" ? m.responseId.slice(0, 160) : "",
      pending: false,
      createdAt: typeof m?.createdAt === "string" ? m.createdAt : null
    };
  }).filter((m) => (
    m.content ||
    m.attachments.length ||
    m.thinkingContent ||
    m.actions.length ||
    m.actionResults.length ||
    m.actionPolicy ||
    m.artifacts.length ||
    m.references.length
  ));
}

function sessionChatMessagesForPayload(session = {}) {
  const snapshotMessages = session.viewState?.stateSnapshot?.chatMessages;
  if (Array.isArray(snapshotMessages)) return normalizeSnapshotChatMessages(snapshotMessages);
  return (Array.isArray(session.chatMessages) ? session.chatMessages : []).map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: typeof m.content === "string" ? m.content : "",
    thinkingContent: sanitizeSnapshotThinkingContent(m.thinkingContent || "", m.content || "") || null,
    references: Array.isArray(m.references) ? m.references : null
  })).filter((m) => m.content || m.thinkingContent || m.references?.length);
}

function shareUrlForToken(shareToken) {
  const snapshot = shareToken.snapshotData || {};
  return snapshot.type === "image" ? `/share-image/${shareToken.token}` : `/share/${shareToken.token}`;
}

function formatShareToken(shareToken) {
  const snapshot = shareToken.snapshotData || {};
  return {
    token: shareToken.token,
    type: snapshot.type === "image" ? "image" : "session",
    shareUrl: shareUrlForToken(shareToken),
    title: snapshot.title || snapshot.sessionTitle || null,
    createdAt: shareToken.createdAt,
    expiresAt: shareToken.expiresAt,
    accessCount: shareToken.accessCount || 0,
    lastAccessedAt: shareToken.lastAccessedAt || null
  };
}

/**
 * POST /api/sessions/:id/share
 */
export async function handleCreateShare(sessionId, body, res, options = {}) {
  try {
    if (!sessionId || typeof sessionId !== "string") {
      return sendJson(res, 400, { error: "sessionId is required" });
    }

    const session = await prisma.session.findFirst({
      where: { id: sessionId, visitorId: options.visitorId || "legacy" },
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
      chatMessages: sessionChatMessagesForPayload(session)
    };

    const shareToken = await prisma.shareToken.create({
      data: {
        sessionId,
        snapshotData,
        expiresAt: resolveExpiresAt(body, null)
      }
    });

    return sendJson(res, 200, {
      ok: true,
      shareUrl: `/share/${shareToken.token}`,
      token: shareToken.token,
      createdAt: shareToken.createdAt,
      expiresAt: shareToken.expiresAt,
      accessCount: shareToken.accessCount || 0
    });
  } catch (error) {
    console.error("[handleCreateShare]", error);
    return sendJson(res, 500, { error: error.message || "Failed to create share" });
  }
}

/**
 * GET /api/sessions/:id/shares
 */
export async function handleListSessionShares(sessionId, res, options = {}) {
  try {
    if (!sessionId || typeof sessionId !== "string") {
      return sendJson(res, 400, { error: "sessionId is required" });
    }

    const session = await prisma.session.findFirst({
      where: { id: sessionId, visitorId: options.visitorId || "legacy" },
      select: { id: true }
    });
    if (!session) {
      return sendJson(res, 404, { error: "Session not found" });
    }

    const shares = await prisma.shareToken.findMany({
      where: { sessionId },
      orderBy: { createdAt: "desc" },
      select: {
        token: true,
        snapshotData: true,
        createdAt: true,
        expiresAt: true,
        accessCount: true,
        lastAccessedAt: true
      }
    });

    return sendJson(res, 200, {
      ok: true,
      shares: shares.map(formatShareToken)
    });
  } catch (error) {
    console.error("[handleListSessionShares]", error);
    return sendJson(res, 500, { error: error.message || "Failed to list shares" });
  }
}

/**
 * DELETE /api/share/:token
 */
export async function handleDeleteShare(token, res, options = {}) {
  try {
    if (!token || typeof token !== "string") {
      return sendJson(res, 400, { error: "token is required" });
    }

    const share = await prisma.shareToken.findUnique({
      where: { token },
      include: { session: { select: { visitorId: true } } }
    });
    if (!share || share.session?.visitorId !== (options.visitorId || "legacy")) {
      return sendJson(res, 404, { error: "Share not found" });
    }

    await prisma.shareToken.delete({ where: { token } });
    return sendJson(res, 200, { ok: true });
  } catch (error) {
    console.error("[handleDeleteShare]", error);
    return sendJson(res, 500, { error: error.message || "Failed to delete share" });
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

    const updatedShareToken = await prisma.shareToken.update({
      where: { token },
      data: {
        accessCount: { increment: 1 },
        lastAccessedAt: new Date()
      },
      select: {
        accessCount: true,
        lastAccessedAt: true
      }
    });

    return sendJson(res, 200, {
      ok: true,
      token: shareToken.token,
      createdAt: shareToken.createdAt,
      expiresAt: shareToken.expiresAt,
      accessCount: updatedShareToken.accessCount,
      lastAccessedAt: updatedShareToken.lastAccessedAt,
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
export async function handleCreateImageShare(body, res, options = {}) {
  try {
    const nodeId = typeof body?.nodeId === "string" ? body.nodeId.trim() : "";
    const sessionId = typeof body?.sessionId === "string" ? body.sessionId.trim() : "";

    if (!nodeId || !sessionId) {
      return sendJson(res, 400, { error: "nodeId and sessionId are required" });
    }

    const session = await prisma.session.findFirst({
      where: { id: sessionId, visitorId: options.visitorId || "legacy" },
      include: { nodes: true, assets: true }
    });

    if (!session) {
      return sendJson(res, 404, { error: "Session not found" });
    }

    const analysisNode = session.nodes.find((n) => n.nodeId === "analysis");
    const analysisData = analysisNode?.data || {};
    const node = session.nodes.find((n) => n.nodeId === nodeId);
    const sourceAsset = session.assets.find((a) => a.kind === "upload" && /^image\//i.test(a.mimeType || ""));

    if (nodeId !== "source" && (!node || node.type !== "generated")) {
      return sendJson(res, 404, { error: "Generated node not found" });
    }

    if (nodeId === "source" && !sourceAsset) {
      return sendJson(res, 404, { error: "Source image not found" });
    }

    const nodeData = node?.data || {};
    const isSource = nodeId === "source";
    const snapshotData = {
      type: "image",
      nodeId,
      sessionId,
      imageKind: isSource ? "upload" : "generated",
      imageHash: isSource ? sourceAsset.hash : (nodeData.imageHash || null),
      imageDataUrl: isSource ? null : (nodeData.imageDataUrl || null),
      explanation: isSource ? (analysisData.summary || null) : (nodeData.explanation || null),
      option: isSource
        ? { title: sourceAsset.fileName || session.title || "Source image" }
        : (nodeData.option || null),
      title: isSource ? (sourceAsset.fileName || session.title || "Source image") : (session.title || "Shared Image"),
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
        expiresAt: resolveExpiresAt(body, 30)
      }
    });

    return sendJson(res, 200, {
      ok: true,
      shareUrl: `/share-image/${shareToken.token}`,
      token: shareToken.token,
      createdAt: shareToken.createdAt,
      expiresAt: shareToken.expiresAt,
      accessCount: shareToken.accessCount || 0
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

    const updatedShareToken = await prisma.shareToken.update({
      where: { token },
      data: {
        accessCount: { increment: 1 },
        lastAccessedAt: new Date()
      },
      select: {
        accessCount: true,
        lastAccessedAt: true
      }
    });

    return sendJson(res, 200, {
      ok: true,
      token: shareToken.token,
      createdAt: shareToken.createdAt,
      expiresAt: shareToken.expiresAt,
      accessCount: updatedShareToken.accessCount,
      lastAccessedAt: updatedShareToken.lastAccessedAt,
      imageHash: snapshot.imageHash,
      imageKind: snapshot.imageKind || "generated",
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
