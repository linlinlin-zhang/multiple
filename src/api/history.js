import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "../lib/prisma.js";
import { isGenericSessionTitle, resolveSessionTitle } from "../lib/sessionTitle.js";

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
export async function handleListHistory(query, res, options = {}) {
  try {
    const parsedLimit = Number(query?.limit);
    const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.floor(parsedLimit) : null;
    const offset = Math.max(Number(query?.offset) || 0, 0);
    const includeDemo = query?.includeDemo === "true";
    const sourceFilter = ["user", "system", "all"].includes(query?.source) ? query.source : "all";
    const includeHidden = query?.includeHidden === "1" || query?.includeHidden === "true";
    const visitorId = options.visitorId || "legacy";

    if (!supportsSystemSessions()) {
      if (sourceFilter === "system") {
        return sendJson(res, 200, { ok: true, sessions: [], total: 0 });
      }
      const where = { visitorId };
      if (!includeDemo) where.isDemo = false;
      const [sessions, total] = await Promise.all([
        prisma.session.findMany({
          where,
          orderBy: { updatedAt: "desc" },
          skip: offset,
          ...(limit ? { take: limit } : {}),
          select: {
            id: true,
            title: true,
            isDemo: true,
            createdAt: true,
            updatedAt: true,
            chatMessages: {
              orderBy: { createdAt: "asc" },
              take: 2,
              select: {
                role: true,
                content: true
              }
            },
            _count: {
              select: { nodes: true, assets: true }
            }
          }
        }),
        prisma.session.count({ where })
      ]);

      return sendJson(res, 200, {
        ok: true,
        sessions: sessions.map((s) => formatHistorySession(s)),
        total
      });
    }

    // 获取该用户已隐藏的系统会话ID
    const hiddenRecords = await prisma.sessionHidden.findMany({
      where: { visitorId },
      select: { sessionId: true }
    });
    const hiddenIds = hiddenRecords.map(h => h.sessionId);

    const clauses = [];
    if (sourceFilter !== "system") clauses.push({ visitorId, source: "user" });
    if (sourceFilter !== "user") {
      const systemClause = { source: "system" };
      if (!includeHidden && hiddenIds.length > 0) {
        systemClause.id = { notIn: hiddenIds };
      }
      clauses.push(systemClause);
    }
    const where = { OR: clauses.length ? clauses : [{ visitorId, source: "user" }] };
    if (!includeDemo) {
      where.OR = where.OR.map(clause => ({ ...clause, isDemo: false }));
    }

    const [sessions, total] = await Promise.all([
      prisma.session.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: offset,
        ...(limit ? { take: limit } : {}),
        select: {
          id: true,
          title: true,
          isDemo: true,
          source: true,
          createdAt: true,
          updatedAt: true,
          chatMessages: {
            orderBy: { createdAt: "asc" },
            take: 2,
            select: {
              role: true,
              content: true
            }
          },
          _count: {
            select: { nodes: true, assets: true }
          },
          hiddenBy: {
            where: { visitorId },
            select: { id: true },
            take: 1
          },
          viewState: true
        }
      }),
      prisma.session.count({ where })
    ]);

    const formatted = sessions.map((s) => formatHistorySession(s));

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
export async function handleRenameSession(sessionId, body, res, options = {}) {
  try {
    if (!sessionId || typeof sessionId !== "string") {
      return sendJson(res, 400, { error: "sessionId is required" });
    }
    const title = typeof body?.title === "string" ? body.title.trim().slice(0, 160) : "";
    if (!title) {
      return sendJson(res, 400, { error: "title is required" });
    }

    const existing = await prisma.session.findFirst({
      where: supportsSystemSessions()
        ? { id: sessionId, visitorId: options.visitorId || "legacy", source: "user" }
        : { id: sessionId, visitorId: options.visitorId || "legacy" },
      select: { id: true }
    });
    if (!existing) {
      return sendJson(res, 404, { error: "Session not found" });
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

export async function handleDeleteSession(sessionId, res, options = {}) {
  try {
    if (!sessionId || typeof sessionId !== "string") {
      return sendJson(res, 400, { error: "sessionId is required" });
    }

    const visitorId = options.visitorId || "legacy";
    if (!supportsSystemSessions()) {
      const result = await prisma.session.deleteMany({
        where: { id: sessionId, visitorId }
      });
      if (result.count === 0) {
        return sendJson(res, 404, { error: "Session not found" });
      }
      return sendJson(res, 200, { ok: true });
    }

    const item = await prisma.session.findUnique({ where: { id: sessionId } });

    if (!item) {
      return sendJson(res, 404, { error: "Session not found" });
    }

    // 系统会话：仅对该用户隐藏，不删实际文件
    if (item.source === "system") {
      await prisma.sessionHidden.upsert({
        where: { visitorId_sessionId: { visitorId, sessionId } },
        update: {},
        create: { visitorId, sessionId }
      });
      return sendJson(res, 200, { ok: true });
    }

    const result = await prisma.session.deleteMany({
      where: { id: sessionId, visitorId: options.visitorId || "legacy" }
    });
    if (result.count === 0) {
      return sendJson(res, 404, { error: "Session not found" });
    }

    return sendJson(res, 200, { ok: true });
  } catch (error) {
    console.error("[handleDeleteSession]", error);
    if (error?.code === "P2025") {
      return sendJson(res, 404, { error: "Session not found" });
    }
    return sendJson(res, 500, { error: error.message || "Failed to delete session" });
  }
}

export async function handleRestoreSession(sessionId, res, options = {}) {
  try {
    if (!sessionId || typeof sessionId !== "string") {
      return sendJson(res, 400, { error: "sessionId is required" });
    }

    if (!supportsSystemSessions()) {
      return sendJson(res, 200, { ok: true });
    }

    await prisma.sessionHidden.deleteMany({
      where: {
        visitorId: options.visitorId || "legacy",
        sessionId
      }
    });
    return sendJson(res, 200, { ok: true });
  } catch (error) {
    console.error("[handleRestoreSession]", error);
    return sendJson(res, 500, { error: error.message || "Failed to restore session" });
  }
}

const SYSTEM_HISTORY_DIR = path.join(process.cwd(), "history_material");

/**
 * Scan the project-level history_material/ directory and register zip files as system sessions.
 */
export async function syncSystemHistory() {
  try {
    if (!supportsSystemSessions()) {
      console.log("[syncSystemHistory] Prisma client does not expose system session models, skipping");
      return;
    }

    const dirStat = await fs.stat(SYSTEM_HISTORY_DIR).catch(() => null);
    if (!dirStat || !dirStat.isDirectory()) {
      console.log("[syncSystemHistory] No history_material/ directory found, skipping");
      return;
    }

    const entries = await fs.readdir(SYSTEM_HISTORY_DIR);
    let registered = 0;
    let skipped = 0;

    for (const fileName of entries) {
      if (!fileName.endsWith(".zip")) continue;
      const fullPath = path.join(SYSTEM_HISTORY_DIR, fileName);
      const stat = await fs.stat(fullPath).catch(() => null);
      if (!stat || !stat.isFile()) continue;

      // 用文件路径的 hash 作为 session id（保持稳定）
      const crypto = await import("node:crypto");
      const hash = crypto.createHash("sha256").update(fullPath).digest("hex");
      const sessionId = hash.slice(0, 32);

      // 读取 zip 中的 session.json 获取元数据
      let title = fileName.replace(/\.zip$/i, "");
      let nodeCount = 0;
      let assetCount = 0;
      try {
        const zipBuffer = await fs.readFile(fullPath);
        const JSZip = await loadJSZip();
        const zip = await JSZip.loadAsync(zipBuffer);
        const sessionJson = zip.file("session.json");
        if (sessionJson) {
          const json = JSON.parse(await sessionJson.async("text"));
          title = json?.session?.title || title;
          nodeCount = json?.session?.nodes?.length || 0;
          assetCount = json?.session?.assets?.length || 0;
        }
      } catch (e) {
        console.warn(`[syncSystemHistory] Failed to parse ${fileName}:`, e.message);
      }

      const existing = await prisma.session.findFirst({
        where: { id: sessionId, source: "system" }
      });
      if (existing) {
        // 更新元数据（包括 viewState 中的 nodeCount / assetCount）
        await prisma.session.update({
          where: { id: sessionId },
          data: {
            title,
            updatedAt: new Date(),
            viewState: {
              ...(existing.viewState || {}),
              systemArchivePath: fullPath,
              nodeCount,
              assetCount
            }
          }
        });
        skipped++;
        continue;
      }

      await prisma.session.create({
        data: {
          id: sessionId,
          visitorId: "__system__",
          title,
          isDemo: false,
          source: "system",
          viewState: { systemArchivePath: fullPath, nodeCount, assetCount }
        }
      });
      registered++;
    }

    console.log(`[syncSystemHistory] Registered ${registered}, updated ${skipped}`);
  } catch (error) {
    console.error("[syncSystemHistory]", error);
  }
}

function supportsSystemSessions() {
  return Boolean(prisma.sessionHidden);
}

function formatHistorySession(session) {
  const source = session.source || "user";
  return {
    id: session.id,
    title: isGenericSessionTitle(session.title)
      ? resolveSessionTitle({ requestedTitle: session.title, chatMessages: session.chatMessages, fallbackTitle: session.title })
      : session.title,
    isDemo: session.isDemo,
    source,
    hidden: Boolean(session.hiddenBy?.length),
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    nodeCount: source === "system"
      ? (session.viewState?.nodeCount ?? session._count.nodes)
      : session._count.nodes,
    assetCount: source === "system"
      ? (session.viewState?.assetCount ?? session._count.assets)
      : session._count.assets
  };
}

async function loadJSZip() {
  const module = await import("jszip");
  return module.default;
}
