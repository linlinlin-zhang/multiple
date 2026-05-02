import { prisma } from "../lib/prisma.js";

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-cache"
  });
  res.end(JSON.stringify(data));
}

/**
 * GET /api/history?limit=20&offset=0&includeDemo=false
 */
export async function handleListHistory(query, res) {
  try {
    const limit = Math.min(Number(query?.limit) || 20, 100);
    const offset = Math.max(Number(query?.offset) || 0, 0);
    const includeDemo = query?.includeDemo === "true";

    const where = {};
    if (!includeDemo) {
      where.isDemo = false;
    }

    const [sessions, total] = await Promise.all([
      prisma.session.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: offset,
        take: limit,
        select: {
          id: true,
          title: true,
          isDemo: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: { nodes: true, assets: true }
          }
        }
      }),
      prisma.session.count({ where })
    ]);

    const formatted = sessions.map((s) => ({
      id: s.id,
      title: s.title,
      isDemo: s.isDemo,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      nodeCount: s._count.nodes,
      assetCount: s._count.assets
    }));

    return sendJson(res, 200, {
      ok: true,
      sessions: formatted,
      total
    });
  } catch (error) {
    console.error("[handleListHistory]", error);
    return sendJson(res, 500, { error: error.message || "Failed to list history" });
  }
}

/**
 * PATCH /api/sessions/:id/title
 */
export async function handleRenameSession(sessionId, body, res) {
  try {
    if (!sessionId || typeof sessionId !== "string") {
      return sendJson(res, 400, { error: "sessionId is required" });
    }
    const title = typeof body?.title === "string" ? body.title.trim().slice(0, 160) : "";
    if (!title) {
      return sendJson(res, 400, { error: "title is required" });
    }

    const session = await prisma.session.update({
      where: { id: sessionId },
      data: { title },
      select: {
        id: true,
        title: true,
        updatedAt: true
      }
    });

    return sendJson(res, 200, { ok: true, session });
  } catch (error) {
    console.error("[handleRenameSession]", error);
    return sendJson(res, 500, { error: error.message || "Failed to rename session" });
  }
}
