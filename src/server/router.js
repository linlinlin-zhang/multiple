import { handleGetAsset, handleStoreAsset } from "../api/assets.js";
import { handleContextIngest, handleContextRetrieve, handleContextStats, handleContextWipe } from "../api/context.js";
import { handleCreateFileUnderstanding, handleGetFileUnderstanding } from "../api/fileUnderstanding.js";
import { handleDeleteSession, handleListHistory, handleRenameSession } from "../api/history.js";
import { handleImportSession } from "../api/import.js";
import { handleCreateMaterial, handleDeleteMaterial, handleGetMaterialFile, handleListMaterials, handleUpdateMaterial } from "../api/materials.js";
import { handleCreateSession, handleExportSession, handleGetSession, handleUpdateSession } from "../api/sessions.js";
import { handleGetSettings, handleUpdateSettings } from "../api/settings.js";
import { handleCreateImageShare, handleCreateShare, handleGetImageShare, handleGetShare } from "../api/share.js";
import { resolveVisitor } from "../lib/visitor.js";
import { readBodyBuffer, readJson, sendJson } from "./http.js";

export function createRequestHandler({
  runtimeConfigs,
  appMode,
  roleHealth,
  refreshConfigs,
  serveStatic,
  maxBodyBytes,
  handlers
}) {
  return async function handleRequest(req, res) {
    try {
      const url = new URL(req.url || "/", `http://${req.headers.host}`);
      const visitor = resolveVisitor(req, res);

      if (req.method === "GET" && url.pathname === "/api/health") {
        return sendJson(res, 200, {
          ok: true,
          mode: appMode(),
          chat: roleHealth(runtimeConfigs.chat),
          analysis: roleHealth(runtimeConfigs.analysis),
          image: roleHealth(runtimeConfigs.image),
          video: roleHealth(runtimeConfigs.video),
          asr: roleHealth(runtimeConfigs.asr),
          realtime: roleHealth(runtimeConfigs.realtime),
          deepthink: roleHealth(runtimeConfigs.deepthink)
        });
      }

      if (req.method === "GET" && url.pathname === "/api/debug/action-traces") {
        return await handlers.handleListActionTraceSummaries(url, res);
      }

      if (req.method === "GET" && url.pathname === "/api/settings") {
        return await handleGetSettings(res);
      }

      if (req.method === "PUT" && url.pathname === "/api/settings") {
        const body = await readJson(req, { maxBodyBytes });
        const result = await handleUpdateSettings(body, res, req);
        await refreshConfigs();
        return result;
      }

      if (req.method === "POST" && url.pathname === "/api/chat") {
        const body = await readJson(req, { maxBodyBytes });
        return await handlers.handleChat(body, res);
      }

      if (req.method === "POST" && url.pathname === "/api/chat-title") {
        const body = await readJson(req, { maxBodyBytes });
        return await handlers.handleChatTitle(body, res);
      }

      if (req.method === "POST" && url.pathname === "/api/asr") {
        const body = await readJson(req, { maxBodyBytes });
        return await handlers.handleAsr(body, res);
      }

      if (req.method === "POST" && url.pathname === "/api/realtime-voice") {
        const body = await readJson(req, { maxBodyBytes });
        return await handlers.handleRealtimeVoice(body, res);
      }

      if (req.method === "POST" && (url.pathname === "/api/deep-think" || url.pathname === "/api/deep-research")) {
        const body = await readJson(req, { maxBodyBytes });
        return await handlers.handleDeepThink(body, res);
      }

      if (req.method === "POST" && url.pathname === "/api/image-search") {
        const body = await readJson(req, { maxBodyBytes });
        return await handlers.handleImageSearch(body, res);
      }

      if (req.method === "POST" && url.pathname === "/api/route-task") {
        const body = await readJson(req, { maxBodyBytes });
        return await handlers.handleRouteTask(body, res);
      }

      if (req.method === "POST" && url.pathname === "/api/analyze") {
        const body = await readJson(req, { maxBodyBytes });
        return await handlers.handleAnalyze(body, res);
      }

      if (req.method === "POST" && url.pathname === "/api/analyze-text") {
        const body = await readJson(req, { maxBodyBytes });
        return await handlers.handleAnalyzeText(body, res);
      }

      if (req.method === "POST" && url.pathname === "/api/analyze-url") {
        const body = await readJson(req, { maxBodyBytes });
        return await handlers.handleAnalyzeUrl(body, res);
      }

      if (req.method === "POST" && url.pathname === "/api/analyze-explore") {
        const body = await readJson(req, { maxBodyBytes });
        return await handlers.handleAnalyzeExplore(body, res);
      }

      if (req.method === "POST" && url.pathname === "/api/generate") {
        const body = await readJson(req, { maxBodyBytes });
        return await handlers.handleGenerate(body, res);
      }

      if (req.method === "POST" && url.pathname === "/api/generate-video") {
        const body = await readJson(req, { maxBodyBytes });
        return await handlers.handleGenerateVideo(body, res);
      }

      if (req.method === "POST" && url.pathname === "/api/explain") {
        const body = await readJson(req, { maxBodyBytes });
        return await handlers.handleExplain(body, res);
      }

      if (req.method === "POST" && url.pathname === "/api/assets") {
        const body = await readJson(req, { maxBodyBytes });
        return await handleStoreAsset(body, res, visitor);
      }
      if (req.method === "GET" && url.pathname.startsWith("/api/assets/")) {
        return await handleGetAsset(req, res);
      }

      if (req.method === "POST" && url.pathname === "/api/sessions") {
        const body = await readJson(req, { maxBodyBytes });
        return await handleCreateSession(body, res, visitor);
      }
      if (req.method === "GET" && url.pathname.startsWith("/api/sessions/") && url.pathname.endsWith("/export")) {
        const id = url.pathname.split("/")[3];
        return await handleExportSession(id, res, visitor);
      }
      if (req.method === "GET" && /^\/api\/sessions\/[^/]+$/.test(url.pathname)) {
        const id = url.pathname.split("/")[3];
        return await handleGetSession(id, res, visitor);
      }
      if (req.method === "PUT" && /^\/api\/sessions\/[^/]+$/.test(url.pathname)) {
        const id = url.pathname.split("/")[3];
        const body = await readJson(req, { maxBodyBytes });
        return await handleUpdateSession(id, body, res, visitor);
      }
      if (req.method === "DELETE" && /^\/api\/sessions\/[^/]+$/.test(url.pathname)) {
        const id = url.pathname.split("/")[3];
        return await handleDeleteSession(id, res, visitor);
      }

      if (req.method === "POST" && url.pathname === "/api/import") {
        const contentType = String(req.headers["content-type"] || "").toLowerCase();
        const body = /zip|octet-stream/i.test(contentType)
          ? await readBodyBuffer(req, { maxBodyBytes })
          : await readJson(req, { maxBodyBytes });
        return await handleImportSession(body, res, visitor);
      }

      if (req.method === "POST" && url.pathname.startsWith("/api/sessions/") && url.pathname.endsWith("/share")) {
        const id = url.pathname.split("/")[3];
        return await handleCreateShare(id, res, visitor);
      }
      if (req.method === "GET" && url.pathname.startsWith("/api/share/")) {
        const token = url.pathname.split("/")[3];
        return await handleGetShare(token, res);
      }
      if (req.method === "POST" && url.pathname === "/api/share-image") {
        const body = await readJson(req, { maxBodyBytes });
        return await handleCreateImageShare(body, res, visitor);
      }
      if (req.method === "GET" && url.pathname.startsWith("/api/share-image/")) {
        const token = url.pathname.split("/")[3];
        return await handleGetImageShare(token, res);
      }

      if (req.method === "GET" && url.pathname === "/api/history") {
        return await handleListHistory(Object.fromEntries(url.searchParams), res, visitor);
      }
      if (req.method === "PATCH" && /^\/api\/sessions\/[^/]+\/title$/.test(url.pathname)) {
        const id = url.pathname.split("/")[3];
        const body = await readJson(req, { maxBodyBytes });
        return await handleRenameSession(id, body, res, visitor);
      }

      if (req.method === "GET" && url.pathname === "/api/materials") {
        return await handleListMaterials(Object.fromEntries(url.searchParams), res, visitor);
      }
      if (req.method === "POST" && url.pathname === "/api/materials") {
        const body = await readJson(req, { maxBodyBytes });
        return await handleCreateMaterial(body, res, visitor);
      }
      if (req.method === "PUT" && /^\/api\/materials\/[^/]+$/.test(url.pathname)) {
        const id = url.pathname.split("/")[3];
        const body = await readJson(req, { maxBodyBytes });
        return await handleUpdateMaterial(id, body, res, visitor);
      }
      if (req.method === "DELETE" && /^\/api\/materials\/[^/]+$/.test(url.pathname)) {
        const id = url.pathname.split("/")[3];
        return await handleDeleteMaterial(id, res, visitor);
      }
      if (req.method === "GET" && /^\/api\/materials\/[^/]+\/file$/.test(url.pathname)) {
        const id = url.pathname.split("/")[3];
        return await handleGetMaterialFile(id, res, {
          ...visitor,
          download: url.searchParams.get("download") === "1"
        });
      }

      if (req.method === "POST" && url.pathname === "/api/file-understanding") {
        const body = await readJson(req, { maxBodyBytes });
        return await handleCreateFileUnderstanding(body, res);
      }
      if (req.method === "GET" && url.pathname.startsWith("/api/file-understanding/")) {
        return await handleGetFileUnderstanding(req, res);
      }

      if (req.method === "POST" && url.pathname === "/api/context/ingest") {
        const body = await readJson(req, { maxBodyBytes });
        return await handleContextIngest(body, res, visitor);
      }
      if (req.method === "POST" && url.pathname === "/api/context/retrieve") {
        const body = await readJson(req, { maxBodyBytes });
        return await handleContextRetrieve(body, res, visitor);
      }
      if (req.method === "GET" && url.pathname === "/api/context/stats") {
        return await handleContextStats(req, res, visitor);
      }
      if (req.method === "DELETE" && url.pathname.startsWith("/api/context/")) {
        const id = url.pathname.split("/")[3];
        return await handleContextWipe(id, res, visitor);
      }

      if (req.method === "GET") {
        if (url.pathname === "/history") {
          res.writeHead(302, { Location: "/history/" });
          return res.end();
        }
        if (url.pathname === "/history/") {
          return serveStatic("/history/index.html", res);
        }
        if (url.pathname.startsWith("/share/assets/")) {
          return serveStatic(url.pathname.replace(/^\/share/, ""), res);
        }
        if (/^\/share\/[^/]+\/?$/.test(url.pathname)) {
          return serveStatic("/share.html", res);
        }
        if (/^\/share-image\/[^/]+\/?$/.test(url.pathname)) {
          return serveStatic("/share-image.html", res);
        }
        if (url.pathname === "/home.html") {
          return sendJson(res, 404, { error: "Not found" });
        }
        return serveStatic(url.pathname, res);
      }

      return sendJson(res, 405, { error: "Method not allowed" });
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : String(error);
      const isTimeout = /timeout|timed out|abort/i.test(message);
      return sendJson(res, isTimeout ? 504 : 500, {
        error: isTimeout ? "Upstream timeout" : "Server error",
        message
      });
    }
  };
}
