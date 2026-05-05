import { prisma } from "../lib/prisma.js";
import { storeDataUrl, readFile, parseDataUrl, storeFile } from "../lib/storage.js";
import { isGenericSessionTitle, resolveSessionTitle } from "../lib/sessionTitle.js";

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
            imageHash: n.sourceCard?.imageHash || n.imageHash || null,
            imageUrl: n.sourceCard?.imageUrl || null,
            sourceVideoHash: n.sourceCard?.sourceVideoHash || n.sourceCard?.videoHash || null,
            sourceVideoUrl: n.sourceCard?.sourceVideoUrl || n.sourceCard?.videoUrl || null,
            sourceVideoMimeType: n.sourceCard?.sourceVideoMimeType || null,
            sourceUrl: n.sourceCard?.sourceUrl || null,
            fileName: n.sourceCard?.fileName || n.sourceCard?.title || null,
            summary: n.sourceCard?.summary || null,
            sourceType: n.sourceCard?.sourceType || null,
            sourceText: n.sourceCard?.sourceText || null
          }
        : n.option
        ? {
            option: n.option,
            imageHash: n.imageHash || null,
            imageDataUrl: n.imageDataUrl || null,
            videoHash: n.videoHash || null,
            videoUrl: n.videoUrl || null,
            videoMimeType: n.videoMimeType || null,
            explanation: n.explanation || null,
            references: Array.isArray(n.option?.references) ? n.option.references : [],
            layoutHint: n.option?.layoutHint || null,
            deepThinkType: n.option?.deepThinkType || null,
            tone: n.option?.tone || null,
            title: n.option?.title || null,
            description: n.option?.description || null
          }
        : n.id === "source"
          ? {
              fileName: state.fileName || null,
              imageHash: state.sourceImageHash || extractAssetHash(state.sourceImage) || null,
              sourceVideoHash: state.sourceVideoHash || extractAssetHash(state.sourceVideo) || null,
              sourceVideoMimeType: state.sourceVideoMimeType || null,
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

  const chatMessages = (Array.isArray(state.chatMessages) ? state.chatMessages : []).map((m) => {
    const thinking = typeof m.thinkingContent === "string" ? m.thinkingContent : (typeof m.thinking === "string" ? m.thinking : null);
    const refs = Array.isArray(m.references) ? m.references : null;
    return {
      role: m.role === "assistant" ? "assistant" : "user",
      content: typeof m.content === "string" ? m.content : "",
      thinkingContent: thinking && thinking.trim() ? thinking : null,
      references: refs && refs.length ? refs : null
    };
  }).filter((m) => m.content);

  return { nodes, links, chatMessages };
}

function buildPersistedViewState(state) {
  const view = state?.view && typeof state.view === "object" ? state.view : {};
  const snapshot = {
    sourceType: state.sourceType || "image",
    sourceImageHash: state.sourceImageHash || extractAssetHash(state.sourceImage) || null,
    sourceText: typeof state.sourceText === "string" ? state.sourceText : null,
    sourceDataUrlHash: state.sourceDataUrlHash || null,
    sourceDataUrl: typeof state.sourceDataUrl === "string" && state.sourceDataUrl.length < 256000 ? state.sourceDataUrl : null,
    sourceVideoHash: state.sourceVideoHash || extractAssetHash(state.sourceVideo) || null,
    sourceVideo: typeof state.sourceVideo === "string" && !state.sourceVideo.startsWith("data:") ? state.sourceVideo : null,
    sourceVideoMimeType: state.sourceVideoMimeType || null,
    sourceUrl: state.sourceUrl || null,
    fileName: state.fileName || "",
    latestAnalysis: state.latestAnalysis || null,
    fileUnderstanding: state.fileUnderstanding || null,
    selectedNodeId: state.selectedNodeId || null,
    selectedNodeIds: Array.isArray(state.selectedNodeIds) ? state.selectedNodeIds : [],
    collapsed: Array.isArray(state.collapsed) ? state.collapsed : [],
    selectiveHidden: Array.isArray(state.selectiveHidden) ? state.selectiveHidden : [],
    blueprints: state.blueprints || {},
    groups: state.groups || {},
    chatThreads: view.chatThreads || state.chatThreads || [],
    activeChatThreadId: view.activeChatThreadId || state.activeChatThreadId || null
  };
  return {
    ...view,
    stateSnapshot: snapshot
  };
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
  if (typeof state.sourceDataUrl === "string" && state.sourceDataUrl.startsWith("data:")) {
    const parsed = parseDataUrl(state.sourceDataUrl);
    const stored = await storeFile(parsed.buffer, { kind: "upload", ext: parsed.ext || "bin" });
    addAssetRecord(assetRecords, {
      hash: stored.hash,
      kind: "upload",
      mimeType: parsed.mimeType,
      fileSize: stored.size,
      fileName
    });
    state.sourceDataUrlHash = stored.hash;
    return;
  }

  if (state.sourceDataUrlHash) {
    const record = await assetRecordFromStoredHash(state.sourceDataUrlHash, { kind: "upload", fileName });
    addAssetRecord(assetRecords, record);
    return;
  }

  if (typeof state.sourceVideo === "string" && state.sourceVideo.startsWith("data:")) {
    const parsed = parseDataUrl(state.sourceVideo);
    const stored = await storeFile(parsed.buffer, { kind: "upload", ext: parsed.ext || "mp4" });
    addAssetRecord(assetRecords, {
      hash: stored.hash,
      kind: "upload",
      mimeType: parsed.mimeType,
      fileSize: stored.size,
      fileName
    });
    state.sourceVideoHash = stored.hash;
    state.sourceVideoMimeType = parsed.mimeType;
    return;
  }

  const videoHash = state.sourceVideoHash || extractAssetHash(state.sourceVideo);
  if (videoHash) {
    const record = await assetRecordFromStoredHash(videoHash, {
      kind: "upload",
      fileName,
      mimeType: state.sourceVideoMimeType || ""
    });
    addAssetRecord(assetRecords, record);
    return;
  }

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
    if (node.type === "source-card" && (node.data?.sourceVideoHash || node.data?.sourceCard?.sourceVideoHash || node.data?.sourceCard?.videoHash)) {
      const videoHash = node.data.sourceVideoHash || node.data.sourceCard?.sourceVideoHash || node.data.sourceCard?.videoHash;
      const record = await assetRecordFromStoredHash(videoHash, {
        kind: "upload",
        fileName: node.data.sourceCard?.fileName || node.data.sourceCard?.title || null,
        mimeType: node.data.sourceCard?.sourceVideoMimeType || ""
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

    if (node.data?.videoHash) {
      const record = await assetRecordFromStoredHash(node.data.videoHash, {
        kind: "generated",
        mimeType: node.data.videoMimeType || "video/mp4"
      });
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
    try {
      const materialItem = await prisma.materialItem.findFirst({ where: { hash } });
      if (materialItem) {
        return {
          hash,
          kind,
          mimeType: mimeType || materialItem.mimeType || "application/octet-stream",
          fileSize: materialItem.fileSize || 0,
          fileName: fileName || materialItem.fileName || null
        };
      }
    } catch {}
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
    if (header.startsWith("25504446")) return "application/pdf";
    if (header.startsWith("504b0304")) return "application/vnd.openxmlformats-officedocument";
    if (header.startsWith("1a45dfa3")) return "video/webm";
  }
  if (buffer.length >= 12 && buffer.slice(4, 8).toString("ascii") === "ftyp") {
    const brand = buffer.slice(8, 12).toString("ascii").toLowerCase();
    if (brand.includes("qt")) return "video/quicktime";
    return "video/mp4";
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
    const viewState = buildPersistedViewState(state);

    const { nodes, links, chatMessages } = serializeState(state);
    const resolvedTitle = resolveSessionTitle({ requestedTitle: title, chatMessages });
    const assetRecords = [];
    await collectSourceAsset(state, assetRecords);
    await collectGeneratedAssets(nodes, assetRecords);

    const session = await prisma.$transaction(async (tx) => {
      const session = await tx.session.create({
        data: {
          title: resolvedTitle,
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
            content: m.content,
            thinkingContent: m.thinkingContent,
            references: m.references
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

    const title = isGenericSessionTitle(session.title)
      ? resolveSessionTitle({ requestedTitle: session.title, chatMessages: session.chatMessages, fallbackTitle: session.title })
      : session.title;

    return sendJson(res, 200, {
      ...session,
      title,
      state: session.viewState?.stateSnapshot || null
    });
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
    const viewState = buildPersistedViewState(state);

    const { nodes, links, chatMessages } = serializeState(state);
    const assetRecords = [];
    await collectSourceAsset(state, assetRecords);
    await collectGeneratedAssets(nodes, assetRecords);

    const session = await prisma.$transaction(async (tx) => {
      const existing = await tx.session.findUnique({
        where: { id: sessionId },
        select: { title: true }
      });
      if (!existing) {
        throw new Error("Session not found");
      }
      const resolvedTitle = title === undefined
        ? undefined
        : resolveSessionTitle({ requestedTitle: title, chatMessages, fallbackTitle: existing.title || "未命名会话" });
      const shouldUpdateTitle = resolvedTitle !== undefined && (!isGenericSessionTitle(title) || isGenericSessionTitle(existing.title));
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
            content: m.content,
            thinkingContent: m.thinkingContent,
            references: m.references
          }))
        });
      }

      return tx.session.update({
        where: { id: sessionId },
        data: {
          ...(shouldUpdateTitle ? { title: resolvedTitle } : {}),
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
        state: session.viewState?.stateSnapshot || null,
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
          content: m.content,
          thinkingContent: m.thinkingContent || null,
          references: Array.isArray(m.references) ? m.references : null
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
