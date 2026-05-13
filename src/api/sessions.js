import fs from "node:fs/promises";
import JSZip from "jszip";
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
  const junctions = normalizeRecordMap(state.junctions);
  const rawLinks = Array.isArray(state.links) ? state.links : [];
  const linkedJunctionIds = new Set(
    rawLinks
      .filter((l) => l?.kind === "junction")
      .map((l) => l.to || l.toNodeId)
      .filter(Boolean)
  );

  const nodes = nodeEntries.map((n) => {
    const junctionNode = isJunctionNode(n, junctions, linkedJunctionIds);
    const junction = junctionNode ? normalizeJunctionRecord(n.junction || junctions[n.id] || n) : null;
    const rotation = Number.isFinite(n.rotation) ? n.rotation : 0;
    return {
      nodeId: n.id,
      type:
        n.id === "source"
          ? "source"
          : n.id === "analysis"
            ? "analysis"
            : junctionNode
              ? "junction"
              : n.sourceCard
                ? "source-card"
                : n.generated
                  ? "generated"
                  : "option",
      x: Number.isFinite(n.x) ? n.x : 0,
      y: Number.isFinite(n.y) ? n.y : 0,
      width: n.width || (junctionNode ? 40 : 318),
      height: n.height || (junctionNode ? 40 : 220),
      data:
        junctionNode
          ? {
              isJunction: true,
              junction,
              rotation,
              connectedCardIds: junction.connectedCardIds,
              maxCapacity: junction.maxCapacity
            }
          : n.sourceCard
            ? {
                sourceCard: n.sourceCard,
                rotation,
                imageHash: n.sourceCard?.imageHash || n.imageHash || extractAssetHash(n.sourceCard?.imageUrl) || null,
                imageUrl: n.sourceCard?.imageUrl || null,
                sourceVideoHash: n.sourceCard?.sourceVideoHash || n.sourceCard?.videoHash || extractAssetHash(n.sourceCard?.sourceVideoUrl || n.sourceCard?.videoUrl) || null,
                sourceVideoUrl: n.sourceCard?.sourceVideoUrl || n.sourceCard?.videoUrl || null,
                sourceVideoMimeType: n.sourceCard?.sourceVideoMimeType || null,
                sourceUrl: n.sourceCard?.sourceUrl || null,
                fileName: n.sourceCard?.fileName || n.sourceCard?.title || null,
                summary: n.sourceCard?.summary || null,
                sourceType: n.sourceCard?.sourceType || null,
                sourceText: n.sourceCard?.sourceText || null,
                sourceDataUrlHash: n.sourceCard?.sourceDataUrlHash || null,
                mimeType: n.sourceCard?.mimeType || null
              }
            : n.option
              ? {
                  option: n.option,
                  rotation,
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
                    rotation,
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
                      rotation,
                      summary: state.latestAnalysis?.summary,
                      detectedSubjects: state.latestAnalysis?.detectedSubjects,
                      moodKeywords: state.latestAnalysis?.moodKeywords
                    }
                  : {},
      collapsed: collapsedIds.has(n.id)
    };
  });

  const links = rawLinks.map((l) => ({
    fromNodeId: l.from || l.fromNodeId,
    toNodeId: l.to || l.toNodeId,
    kind: l.kind || "option"
  }));

  const chatMessages = (Array.isArray(state.chatMessages) ? state.chatMessages : []).map((m) => {
    const content = typeof m.content === "string" ? m.content : "";
    const thinking = sanitizePersistedThinkingContent(
      typeof m.thinkingContent === "string" ? m.thinkingContent : (typeof m.thinking === "string" ? m.thinking : null),
      content
    );
    const refs = Array.isArray(m.references) ? m.references : null;
    return {
      role: m.role === "assistant" ? "assistant" : "user",
      content,
      thinkingContent: thinking && thinking.trim() ? thinking : null,
      references: refs && refs.length ? refs : null
    };
  }).filter((m) => m.content);

  return { nodes, links, chatMessages };
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

function persistedTextFingerprint(value) {
  return String(value || "").normalize("NFKC").replace(/\s+/g, " ").trim();
}

function sanitizePersistedThinkingContent(value, reply = "") {
  const thinking = typeof value === "string" ? value.trim() : "";
  const content = typeof reply === "string" ? reply.trim() : "";
  if (!thinking || !content) return thinking;
  const thinkingKey = persistedTextFingerprint(thinking);
  const contentKey = persistedTextFingerprint(content);
  if (!thinkingKey || !contentKey) return thinking;
  if (thinkingKey === contentKey) return "";
  const shorter = thinkingKey.length < contentKey.length ? thinkingKey : contentKey;
  const longer = thinkingKey.length < contentKey.length ? contentKey : thinkingKey;
  if (shorter.length > 80 && longer.includes(shorter) && shorter.length / Math.max(longer.length, 1) > 0.9) return "";
  return thinking;
}

function normalizePersistedChatMessages(messages) {
  const raw = Array.isArray(messages) ? messages : [];
  return raw.slice(-500).map((m) => {
    const content = typeof m?.content === "string" ? m.content : "";
    const rawThinkingContent = typeof m?.thinkingContent === "string"
      ? m.thinkingContent
      : (typeof m?.reasoningContent === "string" ? m.reasoningContent : "");
    const thinkingContent = sanitizePersistedThinkingContent(rawThinkingContent, content);
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

function normalizeAutoHiddenReasons(value) {
  const raw = Array.isArray(value)
    ? Object.fromEntries(value.filter((item) => Array.isArray(item) && item.length >= 2))
    : normalizeRecordMap(value);
  return Object.fromEntries(
    Object.entries(raw)
      .map(([id, reason]) => [String(id || "").trim(), String(reason || "").trim().slice(0, 80)])
      .filter(([id]) => id)
  );
}

function dbChatMessagesToPayload(messages = []) {
  return (Array.isArray(messages) ? messages : []).map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: typeof m.content === "string" ? m.content : "",
    thinkingContent: sanitizePersistedThinkingContent(m.thinkingContent || "", m.content || "") || null,
    thinkingTrace: cloneJsonArray(m.thinkingTrace || m.trace, 24, 64000),
    attachments: cloneJsonArray(m.attachments, 12, 256000),
    branchNodeId: typeof m?.branchNodeId === "string" ? m.branchNodeId : null,
    actions: cloneJsonArray(m.actions, 48, 128000),
    actionResults: cloneJsonArray(m.actionResults, 48, 96000),
    actionPolicy: cloneJsonObject(m.actionPolicy, 160000),
    artifacts: cloneJsonArray(m.artifacts || m.materials || m.cards, 48, 160000),
    references: Array.isArray(m.references) ? m.references : null,
    responseId: typeof m?.responseId === "string" ? m.responseId.slice(0, 160) : "",
    pending: false,
    createdAt: typeof m?.createdAt === "string" ? m.createdAt : null
  })).filter((m) => (
    m.content ||
    m.attachments.length ||
    m.thinkingContent ||
    m.actions.length ||
    m.actionResults.length ||
    m.actionPolicy ||
    m.artifacts.length ||
    m.references?.length
  ));
}

function sessionChatMessagesForPayload(session = {}) {
  const snapshotMessages = session.viewState?.stateSnapshot?.chatMessages;
  if (Array.isArray(snapshotMessages) && snapshotMessages.length > 0) {
    return normalizePersistedChatMessages(snapshotMessages);
  }
  return dbChatMessagesToPayload(session.chatMessages);
}

function buildPersistedViewState(state) {
  const view = state?.view && typeof state.view === "object" ? state.view : {};
  const snapshot = {
    sessionTitle: typeof state.sessionTitle === "string" ? state.sessionTitle.trim().slice(0, 80) : "",
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
    autoHiddenReasons: normalizeAutoHiddenReasons(state.autoHiddenReasons),
    contentHidden: Array.isArray(state.contentHidden) ? state.contentHidden : [],
    junctions: state.junctions || {},
    blueprints: state.blueprints || {},
    groups: state.groups || {},
    chatMessages: normalizePersistedChatMessages(state.chatMessages),
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

function normalizeRecordMap(value) {
  if (!value) return {};
  if (!Array.isArray(value) && typeof value.entries === "function") return Object.fromEntries(value);
  if (typeof value === "object" && !Array.isArray(value)) return value;
  return {};
}

function normalizeJunctionRecord(value = {}) {
  const connectedCardIds = Array.isArray(value.connectedCardIds)
    ? [...new Set(value.connectedCardIds.map((id) => String(id || "").trim()).filter(Boolean))]
    : [];
  const maxCapacity = Number.isFinite(value.maxCapacity) ? value.maxCapacity : 5;
  return { connectedCardIds, maxCapacity };
}

function isJunctionNode(node, junctions = {}, linkedJunctionIds = new Set()) {
  if (!node?.id) return false;
  return Boolean(node.isJunction || node.junction || junctions[node.id] || linkedJunctionIds.has(node.id));
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
    if (node.type === "source-card") {
      const sourceCard = node.data?.sourceCard || {};
      const fileName = sourceCard.fileName || sourceCard.title || null;
      if (typeof sourceCard.sourceDataUrl === "string" && sourceCard.sourceDataUrl.startsWith("data:")) {
        const parsed = parseDataUrl(sourceCard.sourceDataUrl);
        const stored = await storeFile(parsed.buffer, { kind: "upload", ext: parsed.ext || "bin" });
        sourceCard.sourceDataUrlHash = stored.hash;
        sourceCard.sourceDataUrl = null;
        node.data.sourceDataUrlHash = stored.hash;
        addAssetRecord(assetRecords, {
          hash: stored.hash,
          kind: "upload",
          mimeType: parsed.mimeType,
          fileSize: stored.size,
          fileName
        });
      } else if (sourceCard.sourceDataUrlHash || node.data?.sourceDataUrlHash) {
        const record = await assetRecordFromStoredHash(sourceCard.sourceDataUrlHash || node.data.sourceDataUrlHash, {
          kind: "upload",
          fileName,
          mimeType: sourceCard.mimeType || ""
        });
        addAssetRecord(assetRecords, record);
      }
    }
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

function safeArchiveName(value, fallback = "session") {
  return String(value || fallback)
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "_")
    .replace(/\s+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60) || fallback;
}

function extensionFromMimeType(mimeType) {
  const map = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/svg+xml": "svg",
    "application/pdf": "pdf",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.ms-powerpoint": "ppt",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
    "text/plain": "txt",
    "text/markdown": "md",
    "application/json": "json",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
    "video/x-m4v": "m4v",
    "video/ogg": "ogv"
  };
  return map[String(mimeType || "").toLowerCase()] || "";
}

function extensionFromAsset(asset, mimeType = "") {
  const nameExt = String(asset?.fileName || asset?.path || "").split(/[?#]/)[0].split(".").pop()?.toLowerCase() || "";
  if (/^[a-z0-9]{1,8}$/.test(nameExt) && nameExt !== String(asset?.fileName || asset?.path || "").toLowerCase()) return nameExt === "jpeg" ? "jpg" : nameExt;
  return extensionFromMimeType(mimeType || asset?.mimeType) || "bin";
}

function normalizeAssetKind(kind) {
  return kind === "generated" ? "generated" : "upload";
}

function addUniqueAssetRecord(records, record) {
  if (!record?.hash || !/^[a-f0-9]{64}$/i.test(record.hash)) return;
  const kind = normalizeAssetKind(record.kind);
  const key = `${kind}:${record.hash}`;
  if (records.some((item) => `${normalizeAssetKind(item.kind)}:${item.hash}` === key)) return;
  records.push({ ...record, kind });
}

function assetArchivePath(asset, mimeType = "") {
  const ext = extensionFromAsset(asset, mimeType);
  const kind = normalizeAssetKind(asset.kind);
  const name = safeArchiveName(asset.fileName || asset.hash.slice(0, 12), asset.hash.slice(0, 12));
  return `assets/${kind}/${asset.hash.slice(0, 2)}/${asset.hash}.${name}.${ext}`;
}

function collectApiAssetReferences(value, records) {
  const visit = (item) => {
    if (!item) return;
    if (typeof item === "string") {
      const regex = /\/api\/assets\/([a-f0-9]{64})(?:\?([^"'`\s<>]*))?/gi;
      let match;
      while ((match = regex.exec(item))) {
        const params = new URLSearchParams(match[2] || "");
        addUniqueAssetRecord(records, {
          hash: match[1],
          kind: params.get("kind") === "generated" ? "generated" : "upload",
          mimeType: "",
          fileSize: 0,
          fileName: null
        });
      }
      return;
    }
    if (Array.isArray(item)) {
      item.forEach(visit);
      return;
    }
    if (typeof item === "object") {
      Object.values(item).forEach(visit);
    }
  };
  visit(value);
}

function collectNodeAssetReferences(nodes, records) {
  for (const node of nodes || []) {
    const data = node?.data || {};
    const sourceCard = data.sourceCard || {};
    const add = (hash, kind, fileName = null, mimeType = "") => addUniqueAssetRecord(records, { hash, kind, fileName, mimeType, fileSize: 0 });
    if (node.type === "generated") {
      add(data.imageHash, "generated");
      add(data.videoHash, "generated", null, data.videoMimeType || "");
    } else {
      add(data.imageHash || sourceCard.imageHash, "upload", sourceCard.fileName || sourceCard.title || data.fileName || null, sourceCard.mimeType || data.mimeType || "");
      add(data.sourceDataUrlHash || sourceCard.sourceDataUrlHash, "upload", sourceCard.fileName || sourceCard.title || data.fileName || null, sourceCard.mimeType || data.mimeType || "");
      add(data.sourceVideoHash || sourceCard.sourceVideoHash || sourceCard.videoHash, "upload", sourceCard.fileName || sourceCard.title || data.fileName || null, sourceCard.sourceVideoMimeType || sourceCard.mimeType || "");
    }
  }
}

function replaceStringsDeep(value, replacements) {
  if (!replacements?.size) return value;
  if (typeof value === "string") {
    let next = value;
    for (const [from, to] of replacements) next = next.split(from).join(to);
    return next;
  }
  if (Array.isArray(value)) return value.map((item) => replaceStringsDeep(item, replacements));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, replaceStringsDeep(item, replacements)]));
  }
  return value;
}

async function collectMaterialUrlAssets(value, records, visitorId) {
  const materialIds = new Set();
  const visit = (item) => {
    if (typeof item === "string") {
      const regex = /\/api\/materials\/([^/?#]+)\/file/g;
      let match;
      while ((match = regex.exec(item))) {
        try {
          materialIds.add(decodeURIComponent(match[1]));
        } catch {
          materialIds.add(match[1]);
        }
      }
      return;
    }
    if (Array.isArray(item)) return item.forEach(visit);
    if (item && typeof item === "object") Object.values(item).forEach(visit);
  };
  visit(value);
  if (!materialIds.size) return new Map();
  const items = await prisma.materialItem.findMany({
    where: {
      id: { in: Array.from(materialIds) },
      OR: [
        { visitorId: visitorId || "legacy" },
        { source: "system" }
      ]
    }
  });
  const replacements = new Map();
  for (const item of items) {
    addUniqueAssetRecord(records, {
      hash: item.hash,
      kind: "upload",
      mimeType: item.mimeType,
      fileSize: item.fileSize,
      fileName: item.fileName
    });
    replacements.set(`/api/materials/${item.id}/file`, `/api/assets/${item.hash}?kind=upload`);
  }
  return replacements;
}

async function collectInlineDataUrlAssets(value, records) {
  const dataUrls = new Set();
  const visit = (item) => {
    if (typeof item === "string") {
      if (/^data:[a-z0-9+/.-]+(?:;[^,]*)?;base64,/i.test(item)) dataUrls.add(item);
      return;
    }
    if (Array.isArray(item)) return item.forEach(visit);
    if (item && typeof item === "object") Object.values(item).forEach(visit);
  };
  visit(value);
  const replacements = new Map();
  for (const dataUrl of dataUrls) {
    try {
      const parsed = parseDataUrl(dataUrl);
      const stored = await storeFile(parsed.buffer, { kind: "upload", ext: parsed.ext || "bin" });
      addUniqueAssetRecord(records, {
        hash: stored.hash,
        kind: "upload",
        mimeType: parsed.mimeType,
        fileSize: stored.size,
        fileName: null
      });
    } catch {}
  }
  return replacements;
}

async function readAssetBuffer(asset) {
  try {
    return await readFile(asset.hash, { kind: asset.kind });
  } catch (storageError) {
    const item = await prisma.materialItem.findFirst({ where: { hash: asset.hash } });
    if (!item?.filePath) throw storageError;
    return fs.readFile(item.filePath);
  }
}

/**
 * POST /api/sessions
 */
export async function handleCreateSession(body, res, options = {}) {
  try {
    const state = body?.state;
    if (!state || typeof state !== "object") {
      return sendJson(res, 400, { error: "state is required" });
    }

    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const isDemo = body?.isDemo === true;
    const isManualTitle = body?.manualTitle === true && Boolean(title);
    const visitorId = options.visitorId || "legacy";
    const viewState = buildPersistedViewState(state);

    const { nodes, links, chatMessages } = serializeState(state);
    const resolvedTitle = isManualTitle
      ? title.slice(0, 160)
      : resolveSessionTitle({ requestedTitle: title, chatMessages });
    const assetRecords = [];
    await collectSourceAsset(state, assetRecords);
    await collectGeneratedAssets(nodes, assetRecords);

    const session = await prisma.$transaction(async (tx) => {
      const session = await tx.session.create({
        data: {
          visitorId,
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
async function loadSystemSessionFromZip(sessionId) {
  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session || session.source !== "system") return null;
  const archivePath = session.viewState?.systemArchivePath;
  if (!archivePath) return null;
  try {
    console.log(`[loadSystemSessionFromZip] Loading system session from: ${archivePath}`);
    const buffer = await fs.readFile(archivePath);
    const zip = await JSZip.loadAsync(buffer);
    const sessionJson = zip.file("session.json");
    if (!sessionJson) {
      console.warn(`[loadSystemSessionFromZip] No session.json found in: ${archivePath}`);
      return null;
    }
    const json = JSON.parse(await sessionJson.async("text"));
    const payload = json.session || {};
    // Assets are stored at the top level of the JSON (json.assets), not inside json.session
    const topLevelAssets = Array.isArray(json.assets) ? json.assets : [];
    console.log(`[loadSystemSessionFromZip] payload has ${payload.nodes?.length || 0} nodes, ${topLevelAssets.length} assets`);

    // Restore assets from zip into storage so /api/assets/{hash} works
    let assets = topLevelAssets.filter((a) => !a.missing);

    // Fallback: if session.json has no assets array, scan the zip for asset files
    // This handles legacy exports that included asset files but not the assets manifest.
    if (assets.length === 0) {
      const scannedAssets = [];
      const assetRegex = /^assets\/(upload|generated)\/[a-f0-9]{2}\/([a-f0-9]{64})\./i;
      for (const fileName of Object.keys(zip.files)) {
        const match = assetRegex.exec(fileName);
        if (match && !zip.files[fileName].dir) {
          scannedAssets.push({
            hash: match[2],
            kind: match[1],
            mimeType: "",
            fileSize: 0,
            fileName: null,
            path: fileName
          });
        }
      }
      if (scannedAssets.length > 0) {
        console.log(`[loadSystemSessionFromZip] Scanned ${scannedAssets.length} assets from zip (legacy format)`);
        assets = scannedAssets;
      }
    }

    for (const asset of assets) {
      try {
        const ext = extensionFromAsset(asset, asset.mimeType);
        const kind = normalizeAssetKind(asset.kind);
        const name = safeArchiveName(asset.fileName || asset.hash.slice(0, 12), asset.hash.slice(0, 12));
        const zipPath = asset.path || `assets/${kind}/${asset.hash.slice(0, 2)}/${asset.hash}.${name}.${ext}`;
        const zipFile = zip.file(zipPath);
        if (zipFile) {
          const fileBuffer = await zipFile.async("nodebuffer");
          try {
            await storeFile(fileBuffer, { kind, ext });
          } catch (storeError) {
            if (storeError.message?.includes("Unsupported file extension")) {
              console.warn(`[loadSystemSessionFromZip] Unsupported ext "${ext}" for ${asset.hash}, falling back to "bin"`);
              await storeFile(fileBuffer, { kind, ext: "bin" });
            } else {
              throw storeError;
            }
          }
        } else {
          console.warn(`[loadSystemSessionFromZip] Asset not found in zip at path: ${zipPath} (hash=${asset.hash}, name=${asset.fileName || ""})`);
        }
      } catch (assetError) {
        console.warn("[loadSystemSessionFromZip] Failed to restore asset:", asset.hash, assetError.message);
      }
    }

    const restoredCount = assets.length;
    console.log(`[loadSystemSessionFromZip] Restored ${restoredCount} assets for session ${sessionId}`);

    // Build full chatMessages from the best available source in the zip
    const zipChatMessages = (() => {
      const fromSnapshot = payload.viewState?.stateSnapshot?.chatMessages;
      if (Array.isArray(fromSnapshot) && fromSnapshot.length > 0) {
        return normalizePersistedChatMessages(fromSnapshot);
      }
      const fromSession = payload.chatMessages;
      if (Array.isArray(fromSession) && fromSession.length > 0) {
        return normalizePersistedChatMessages(fromSession);
      }
      return [];
    })();

    return {
      ...session,
      nodes: (payload.nodes || []).map((n) => ({
        id: n.nodeId,
        sessionId: session.id,
        nodeId: n.nodeId,
        type: n.type,
        x: n.x,
        y: n.y,
        width: n.width,
        height: n.height,
        data: n.data,
        collapsed: n.collapsed,
        createdAt: session.createdAt
      })),
      links: (payload.links || []).map((l) => ({
        id: `${l.fromNodeId}-${l.toNodeId}`,
        sessionId: session.id,
        fromNodeId: l.fromNodeId,
        toNodeId: l.toNodeId,
        kind: l.kind,
        createdAt: session.createdAt
      })),
      assets: assets.map((a) => ({
        id: a.hash,
        sessionId: session.id,
        hash: a.hash,
        kind: normalizeAssetKind(a.kind),
        mimeType: a.mimeType,
        fileSize: a.fileSize,
        fileName: a.fileName,
        createdAt: session.createdAt
      })),
      chatMessages: zipChatMessages.map((m, i) => ({
        id: `msg-${i}`,
        sessionId: session.id,
        role: m.role,
        content: m.content,
        thinkingContent: m.thinkingContent || null,
        thinkingTrace: m.thinkingTrace || null,
        attachments: m.attachments || null,
        branchNodeId: m.branchNodeId || null,
        actions: m.actions || null,
        actionResults: m.actionResults || null,
        actionPolicy: m.actionPolicy || null,
        artifacts: m.artifacts || null,
        references: m.references || null,
        responseId: m.responseId || "",
        pending: false,
        createdAt: m.createdAt || session.createdAt
      })),
      viewState: (() => {
        const vs = payload.viewState || session.viewState;
        if (!vs || typeof vs !== "object") return vs;
        // Deep-clone to avoid mutating the parsed JSON object
        const cloned = JSON.parse(JSON.stringify(vs));
        // Clear any pending flags in persisted chat messages so the client
        // does not show a stuck "thinking" indicator for imported sessions.
        if (Array.isArray(cloned.stateSnapshot?.chatMessages)) {
          for (const m of cloned.stateSnapshot.chatMessages) {
            if (m && typeof m === "object") m.pending = false;
          }
        }
        return cloned;
      })()
    };
  } catch (e) {
    console.error("[loadSystemSessionFromZip]", e);
    return null;
  }
}

export async function handleGetSession(sessionId, res, options = {}) {
  try {
    if (!sessionId || typeof sessionId !== "string") {
      return sendJson(res, 400, { error: "sessionId is required" });
    }

    let session = await prisma.session.findFirst({
      where: { id: sessionId, visitorId: options.visitorId || "legacy" },
      include: {
        nodes: true,
        links: true,
        assets: true,
        chatMessages: { orderBy: { createdAt: "asc" } }
      }
    });

    // 如果是系统会话，从 zip 加载
    if (!session) {
      session = await loadSystemSessionFromZip(sessionId);
    }

    if (!session) {
      return sendJson(res, 404, { error: "Session not found" });
    }

    const title = isGenericSessionTitle(session.title)
      ? resolveSessionTitle({ requestedTitle: session.title, chatMessages: session.chatMessages, fallbackTitle: session.title })
      : session.title;

    return sendJson(res, 200, {
      ...session,
      chatMessages: sessionChatMessagesForPayload(session),
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
export async function handleUpdateSession(sessionId, body, res, options = {}) {
  try {
    if (!sessionId || typeof sessionId !== "string") {
      return sendJson(res, 400, { error: "sessionId is required" });
    }

    const state = body?.state;
    if (!state || typeof state !== "object") {
      return sendJson(res, 400, { error: "state is required" });
    }

    const title = typeof body?.title === "string" ? body.title.trim() : undefined;
    const isManualTitle = body?.manualTitle === true && Boolean(title);
    const visitorId = options.visitorId || "legacy";
    const viewState = buildPersistedViewState(state);

    const { nodes, links, chatMessages } = serializeState(state);
    const assetRecords = [];
    await collectSourceAsset(state, assetRecords);
    await collectGeneratedAssets(nodes, assetRecords);

    const session = await prisma.$transaction(async (tx) => {
      const existing = await tx.session.findFirst({
        where: { id: sessionId, visitorId },
        select: { title: true }
      });
      if (!existing) {
        throw new Error("Session not found");
      }
      const resolvedTitle = title === undefined
        ? undefined
        : (isManualTitle ? title.slice(0, 160) : resolveSessionTitle({ requestedTitle: title, chatMessages, fallbackTitle: existing.title || "未命名会话" }));
      const shouldUpdateTitle = resolvedTitle !== undefined && (isManualTitle || !isGenericSessionTitle(title) || isGenericSessionTitle(existing.title));
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
export async function handleExportSession(sessionId, res, options = {}) {
  try {
    if (!sessionId || typeof sessionId !== "string") {
      return sendJson(res, 400, { error: "sessionId is required" });
    }

    let session = await prisma.session.findFirst({
      where: { id: sessionId, visitorId: options.visitorId || "legacy" },
      include: {
        nodes: true,
        links: true,
        assets: true,
        chatMessages: { orderBy: { createdAt: "asc" } }
      }
    });

    // 系统会话直接返回 zip 文件
    if (!session) {
      const systemSession = await prisma.session.findUnique({ where: { id: sessionId } });
      if (systemSession?.source === "system" && systemSession.viewState?.systemArchivePath) {
        const archiveBuffer = await fs.readFile(systemSession.viewState.systemArchivePath);
        const safeTitle = String(systemSession.title || "session").replace(/[\\/:*?"<>|]+/g, "_").replace(/\s+/g, "_").slice(0, 60) || "session";
        const asciiSafeTitle = safeTitle.replace(/[^\x20-\x7E]/g, "_");
        const encodedTitle = encodeURIComponent(`${systemSession.title || "session"}_${sessionId.slice(0, 8)}.zip`);
        res.writeHead(200, {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="${asciiSafeTitle}_${sessionId.slice(0, 8)}.zip"; filename*=UTF-8''${encodedTitle}`,
          "Cache-Control": "public, max-age=86400",
          "Content-Length": archiveBuffer.length
        });
        res.end(archiveBuffer);
        return;
      }
    }

    if (!session) {
      return sendJson(res, 404, { error: "Session not found" });
    }

    const zip = new JSZip();
    const exportPayload = {
      version: 1,
      packageVersion: 2,
      format: "thoughtgrid-session-package",
      exportedAt: new Date().toISOString(),
      originalSessionId: session.id,
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
        chatMessages: sessionChatMessagesForPayload(session)
      },
      assets: []
    };

    const assetRecords = [];
    for (const asset of session.assets) {
      addUniqueAssetRecord(assetRecords, {
        hash: asset.hash,
        kind: asset.kind,
        mimeType: asset.mimeType,
        fileSize: asset.fileSize,
        fileName: asset.fileName
      });
    }
    collectNodeAssetReferences(exportPayload.session.nodes, assetRecords);
    const materialReplacements = await collectMaterialUrlAssets(exportPayload.session, assetRecords, options.visitorId);
    exportPayload.session = replaceStringsDeep(exportPayload.session, materialReplacements);
    const inlineAssetReplacements = await collectInlineDataUrlAssets(exportPayload.session, assetRecords);
    exportPayload.session = replaceStringsDeep(exportPayload.session, inlineAssetReplacements);
    collectApiAssetReferences(exportPayload.session, assetRecords);

    for (const asset of assetRecords) {
      try {
        const buffer = await readAssetBuffer(asset);
        const mimeType = asset.mimeType || detectMimeType(buffer);
        const archivePath = assetArchivePath(asset, mimeType);
        zip.file(archivePath, buffer);
        exportPayload.assets.push({
          hash: asset.hash,
          kind: normalizeAssetKind(asset.kind),
          mimeType,
          fileSize: buffer.length,
          fileName: asset.fileName,
          path: archivePath,
          missing: false
        });
      } catch {
        exportPayload.assets.push({
          hash: asset.hash,
          kind: normalizeAssetKind(asset.kind),
          mimeType: asset.mimeType,
          fileSize: asset.fileSize,
          fileName: asset.fileName,
          path: null,
          missing: true
        });
      }
    }

    zip.file("session.json", JSON.stringify(exportPayload, null, 2));
    const archive = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 }
    });

    const safeTitle = safeArchiveName(session.title || "session");
    const asciiSafeTitle = safeTitle.replace(/[^\x20-\x7E]/g, "_");
    const encodedTitle = encodeURIComponent(`${session.title || "session"}_${sessionId.slice(0, 8)}.zip`);
    res.writeHead(200, {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${asciiSafeTitle}_${sessionId.slice(0, 8)}.zip"; filename*=UTF-8''${encodedTitle}`,
      "Cache-Control": "no-cache"
    });
    res.end(archive);
  } catch (error) {
    console.error("[handleExportSession]", error);
    return sendJson(res, 500, { error: error.message || "Failed to export session" });
  }
}
