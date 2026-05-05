import { prisma } from "../lib/prisma.js";
import { storeDataUrl } from "../lib/storage.js";

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-cache"
  });
  res.end(JSON.stringify(data));
}

/**
 * POST /api/import
 */
export async function handleImportSession(body, res, options = {}) {
  try {
    if (!body || typeof body !== "object") {
      return sendJson(res, 400, { error: "Invalid request body" });
    }

    if (body.version !== 1) {
      return sendJson(res, 400, { error: "Unsupported export version" });
    }

    const session = body.session;
    if (!session || !Array.isArray(session.nodes) || !Array.isArray(session.links) || !Array.isArray(session.chatMessages)) {
      return sendJson(res, 400, { error: "Invalid session data" });
    }

    const assets = body.assets || [];
    const storedAssets = [];

    for (const asset of assets) {
      if (typeof asset.dataUrl === "string" && asset.dataUrl.startsWith("data:")) {
        try {
          const stored = await storeDataUrl(asset.dataUrl, { kind: asset.kind });
          storedAssets.push({
            hash: stored.hash,
            kind: asset.kind,
            mimeType: asset.mimeType || stored.mimeType,
            fileSize: stored.size,
            fileName: asset.fileName || null
          });
        } catch (err) {
          console.error("[import] failed to store asset:", err.message);
        }
      } else if (asset.hash) {
        storedAssets.push({
          hash: asset.hash,
          kind: asset.kind,
          mimeType: asset.mimeType || "image/jpeg",
          fileSize: asset.fileSize || 0,
          fileName: asset.fileName || null
        });
      }
    }

    const newSession = await prisma.$transaction(async (tx) => {
      const sessionRecord = await tx.session.create({
        data: {
          visitorId: options.visitorId || "legacy",
          title: session.title || "导入的会话",
          isDemo: session.isDemo || false,
          viewState: session.viewState || { x: 0, y: 0, scale: 0.86 }
        }
      });

      if (storedAssets.length) {
        await tx.asset.createMany({
          data: storedAssets.map((a) => ({ ...a, sessionId: sessionRecord.id }))
        });
      }

      if (session.nodes?.length) {
        await tx.node.createMany({
          data: session.nodes.map((n) => ({
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

      if (session.links?.length) {
        await tx.link.createMany({
          data: session.links.map((l) => ({
            sessionId: sessionRecord.id,
            fromNodeId: l.fromNodeId,
            toNodeId: l.toNodeId,
            kind: l.kind || "option"
          }))
        });
      }

      if (session.chatMessages?.length) {
        await tx.chatMessage.createMany({
          data: session.chatMessages.map((m) => ({
            sessionId: sessionRecord.id,
            role: m.role,
            content: m.content
          }))
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
