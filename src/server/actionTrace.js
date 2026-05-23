import fs from "node:fs";
import path from "node:path";
import { sendJson } from "./http.js";

export function createActionTraceStore({
  logFile,
  retention = 500,
  versions = {},
  toolSchema = {},
  actionRegistry = {},
  fallbackSource = () => "",
  compactActionTypes = (actions) => (Array.isArray(actions) ? actions.map((action) => action?.type).filter(Boolean) : []),
  defaultModel = () => "",
  defaultProvider = () => ""
} = {}) {
  if (!logFile) {
    throw new Error("createActionTraceStore requires logFile.");
  }

  function buildCanvasHarnessTrace({ systemPrompt = "", contextBudget = null } = {}) {
    return {
      systemPrompt: { version: versions.chatSystemPrompt || "", hash: stableHarnessHash(systemPrompt) },
      toolSchema: { version: versions.canvasToolSchema || "", hash: stableHarnessHash(toolSchema) },
      policy: { version: versions.canvasPolicy || "", hash: stableHarnessHash(actionRegistry) },
      fallback: { version: versions.canvasFallback || "", hash: stableHarnessHash(fallbackSource()) },
      contextBudget: { version: contextBudget?.version || versions.chatContextBudget || "", hash: stableHarnessHash(contextBudget || {}) }
    };
  }

  function buildActionTraceSummary({ source = "chat", sessionId = "", message = "", payload = {}, transport = "responses" } = {}) {
    const trace = payload?.actionTrace || payload?.trace || null;
    const policy = payload?.actionPolicy || null;
    if (!trace && !policy && !payload?.contextBudget) return null;
    const stages = Array.isArray(trace?.pipelineStages) ? trace.pipelineStages : (Array.isArray(policy?.stages) ? policy.stages : []);
    const repairs = stages.flatMap((stage) => Array.isArray(stage.repairs) ? stage.repairs : []);
    const stageRejected = stages.flatMap((stage) => Array.isArray(stage.rejected) ? stage.rejected : []);
    const policyRejected = Array.isArray(policy?.rejected) ? policy.rejected : [];
    const actions = Array.isArray(payload?.actions) ? payload.actions : [];
    const finalActionTypes = Array.isArray(trace?.finalActionTypes) && trace.finalActionTypes.length
      ? trace.finalActionTypes
      : (Array.isArray(policy?.finalActionTypes) && policy.finalActionTypes.length ? policy.finalActionTypes : compactActionTypes(actions));
    return {
      at: new Date().toISOString(),
      source: String(source || "chat").slice(0, 40),
      transport: String(transport || "").slice(0, 40),
      traceId: String(trace?.traceId || "").slice(0, 120),
      sessionId: String(trace?.sessionId || sessionId || "").slice(0, 120),
      messageId: String(trace?.messageId || "").slice(0, 120),
      model: String(trace?.model || payload?.model || defaultModel() || "").slice(0, 120),
      provider: String(trace?.provider || payload?.provider || defaultProvider() || "").slice(0, 80),
      thinkingMode: String(trace?.thinkingMode || "").slice(0, 40),
      intent: {
        taskType: String(trace?.intent?.taskType || policy?.taskType || "").slice(0, 80),
        automaticCardMode: Boolean(trace?.intent?.automaticCardMode ?? policy?.automaticCardMode),
        maxActions: trace?.intent?.maxActions ?? policy?.maxActions
      },
      rawActionTypes: Array.isArray(trace?.modelOutput?.rawToolActionTypes) ? trace.modelOutput.rawToolActionTypes.slice(0, 24) : [],
      finalActionTypes: finalActionTypes.slice(0, 24),
      stageCount: stages.length,
      rejectedCount: policyRejected.length || stageRejected.length,
      repairCount: repairs.length,
      stageNames: stages.map((stage) => String(stage.name || "")).filter(Boolean).slice(0, 16),
      rejectedReasons: [...policyRejected, ...stageRejected].map((item) => String(item?.reason || "")).filter(Boolean).slice(0, 12),
      repairReasons: repairs.map((item) => String(item?.reason || "")).filter(Boolean).slice(0, 12),
      harness: actionTraceHarnessHashes(trace?.harness),
      contextBudget: payload?.contextBudget ? {
        version: String(payload.contextBudget.version || "").slice(0, 80),
        beforeBytes: payload.contextBudget.beforeBytes || 0,
        afterBytes: payload.contextBudget.afterBytes || 0,
        targetBytes: payload.contextBudget.targetBytes || 0,
        reduced: Boolean(payload.contextBudget.reduced),
        totalTierBytes: payload.contextBudget.totalTierBytes || 0,
        tiers: Array.isArray(payload.contextBudget.tiers)
          ? payload.contextBudget.tiers.map((tier) => ({
              name: String(tier.name || "").slice(0, 80),
              bytes: tier.bytes || 0,
              retained: tier.retained !== false
            })).slice(0, 16)
          : []
      } : null,
      snippets: {
        message: actionTraceSnippet(trace?.snippets?.message || message),
        reply: actionTraceSnippet(trace?.snippets?.reply || payload?.reply)
      }
    };
  }

  function persistActionTraceSummary(input) {
    const summary = buildActionTraceSummary(input);
    if (!summary) return;
    const run = actionTraceLogWrite
      .then(() => appendActionTraceSummary(summary))
      .catch((error) => {
        console.warn("[action-trace-log] previous write failed:", error.message);
        return appendActionTraceSummary(summary);
      })
      .catch((error) => console.warn("[action-trace-log] write failed:", error.message));
    actionTraceLogWrite = run.catch(() => {});
  }

  async function appendActionTraceSummary(summary) {
    await fs.promises.mkdir(path.dirname(logFile), { recursive: true });
    await fs.promises.appendFile(logFile, `${JSON.stringify(summary)}\n`, "utf8");
    await pruneActionTraceLog();
  }

  async function pruneActionTraceLog() {
    if (!Number.isFinite(retention) || retention <= 0) return;
    const text = await fs.promises.readFile(logFile, "utf8").catch((error) => {
      if (error?.code === "ENOENT") return "";
      throw error;
    });
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (lines.length <= retention) return;
    await fs.promises.writeFile(logFile, `${lines.slice(-retention).join("\n")}\n`, "utf8");
  }

  async function readActionTraceSummaries({ limit = 50, sessionId = "", traceId = "", messageId = "" } = {}) {
    const text = await fs.promises.readFile(logFile, "utf8").catch((error) => {
      if (error?.code === "ENOENT") return "";
      throw error;
    });
    const max = Math.max(1, Math.min(Number(limit) || 50, 200));
    const rows = text
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .reverse()
      .filter((item) => {
        if (sessionId && item.sessionId !== sessionId) return false;
        if (traceId && item.traceId !== traceId) return false;
        if (messageId && item.messageId !== messageId) return false;
        return true;
      })
      .slice(0, max);
    return rows;
  }

  async function handleListActionTraceSummaries(url, res) {
    const limit = Number(url.searchParams.get("limit") || 50);
    const sessionId = url.searchParams.get("sessionId") || "";
    const traceId = url.searchParams.get("traceId") || "";
    const messageId = url.searchParams.get("messageId") || "";
    const items = await readActionTraceSummaries({ limit, sessionId, traceId, messageId });
    return sendJson(res, 200, {
      items,
      count: items.length,
      retention,
      redaction: "summary_only_no_hidden_reasoning"
    });
  }

  return {
    buildActionTraceSummary,
    buildCanvasHarnessTrace,
    handleListActionTraceSummaries,
    persistActionTraceSummary,
    readActionTraceSummaries
  };
}

let actionTraceLogWrite = Promise.resolve();

function stableJson(value) {
  if (!value || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
}

function stableHarnessHash(value) {
  const text = typeof value === "string" ? value : stableJson(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function actionTraceSnippet(value, limit = 180) {
  return String(value || "").normalize("NFKC").replace(/\s+/g, " ").trim().slice(0, limit);
}

function actionTraceHarnessHashes(harness = {}) {
  return Object.fromEntries(
    Object.entries(harness && typeof harness === "object" ? harness : {})
      .map(([key, value]) => [key, {
        version: String(value?.version || "").slice(0, 80),
        hash: String(value?.hash || "").slice(0, 80)
      }])
  );
}
