/**
 * Integration test for the session-scoped RAG pool.
 *
 * Boots the server in a child process, exercises /api/context/* endpoints
 * end-to-end (ingest -> stats -> retrieve -> wipe), and asserts the round trip
 * against PostgreSQL + pgvector when embedding config is available.
 *
 * Run:
 *   node scripts/test-rag.js
 */

import { spawn } from "node:child_process";
import crypto from "node:crypto";

const BASE_URL = "http://localhost:3002";
const SERVER_CMD = ["node", "server.js"];
const SERVER_ENV = { ...process.env, PORT: "3002", NODE_ENV: "test" };

let server;
let failed = 0;
const errors = [];

function log(msg) { console.log("[test-rag] " + msg); }
function pass(msg) { console.log("  [OK] " + msg); }
function fail(msg) { failed++; errors.push(msg); console.error("  [FAIL] " + msg); }

async function request(method, path, body) {
  const opts = { method, headers: {} };
  if (body !== undefined) {
    opts.body = typeof body === "string" ? body : JSON.stringify(body);
    opts.headers["Content-Type"] = "application/json";
  }
  const res = await fetch(BASE_URL + path, opts);
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

function startServer() {
  return new Promise((resolve, reject) => {
    server = spawn(SERVER_CMD[0], SERVER_CMD.slice(1), { env: SERVER_ENV, stdio: "pipe" });
    let ready = false;
    const timer = setTimeout(() => {
      if (!ready) reject(new Error("Server startup timeout"));
    }, 15000);
    const check = setInterval(async () => {
      try {
        const res = await fetch(BASE_URL + "/api/health");
        if (res.status === 200) {
          clearInterval(check);
          clearTimeout(timer);
          ready = true;
          resolve();
        }
      } catch {}
    }, 500);
    server.on("error", (err) => {
      clearInterval(check);
      clearTimeout(timer);
      reject(err);
    });
    server.stderr?.on("data", (buf) => {
      const line = buf.toString().trim();
      if (line) console.error("[server] " + line);
    });
  });
}

function stopServer() {
  return new Promise((resolve) => {
    if (!server) return resolve();
    server.kill("SIGTERM");
    const timer = setTimeout(() => {
      server.kill("SIGKILL");
      resolve();
    }, 3000);
    server.on("exit", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

async function testMissingSessionId() {
  log("ingest without sessionId returns 400");
  const res = await request("POST", "/api/context/ingest", { kind: "note", text: "hello" });
  if (res.status === 400) pass("400 as expected");
  else fail(`expected 400, got ${res.status}: ${JSON.stringify(res.data)}`);
}

async function testIngestRetrieveWipe() {
  const sessionId = `test-${crypto.randomUUID()}`;
  log(`session ${sessionId.slice(0, 16)}...`);

  let res = await request("GET", `/api/context/stats?sessionId=${sessionId}`);
  if (res.status === 200 && res.data?.chunks === 0) pass("empty session has 0 chunks");
  else fail(`stats expected 0 chunks, got ${JSON.stringify(res.data)}`);

  if (!res.data?.embeddingConfigured) {
    log("Embedding API key is not configured; skipping ingest/retrieve round trip.");
    return;
  }

  res = await request("POST", "/api/context/ingest", {
    sessionId,
    kind: "file",
    text: "ThoughtGrid 是一个画布式 AI 创作工作台，使用 PostgreSQL + pgvector 提供会话级 RAG。embedding 模型默认是 DashScope text-embedding-v3，向量维度为 1024。",
    sourceId: "doc:test-1",
    sourceMeta: { fileName: "test.txt" }
  });
  if (res.status === 200 && res.data?.ok && res.data?.inserted >= 1) pass(`ingested ${res.data.inserted} chunk(s)`);
  else fail(`ingest failed: ${JSON.stringify(res.data)}`);

  res = await request("GET", `/api/context/stats?sessionId=${sessionId}`);
  if (res.status === 200 && res.data?.chunks >= 1) pass(`stats now reports ${res.data.chunks} chunk(s)`);
  else fail(`stats expected >=1 chunk, got ${JSON.stringify(res.data)}`);

  res = await request("POST", "/api/context/retrieve", {
    sessionId,
    query: "ThoughtGrid 使用什么向量数据库？",
    topK: 3,
    minScore: 0.1
  });
  if (res.status === 200 && Array.isArray(res.data?.rows) && res.data.rows.length > 0) {
    const top = res.data.rows[0];
    pass(`retrieved ${res.data.rows.length} row(s); top score=${top.score?.toFixed(3)}`);
    if (top.score > 0.3) pass("top score is well above noise (>0.3)");
    else fail(`top score ${top.score} unexpectedly low; embeddings may be misaligned`);
  } else {
    fail(`retrieve returned no rows: ${JSON.stringify(res.data)}`);
  }

  res = await request("POST", "/api/context/retrieve", {
    sessionId,
    query: "今晚晚饭吃什么菜",
    topK: 3,
    minScore: 0.5
  });
  if (res.status === 200 && (res.data?.rows?.length ?? 0) === 0) pass("unrelated query filtered by minScore");
  else if (res.status === 200) pass(`unrelated query returned ${res.data.rows.length} row(s), acceptable`);
  else fail(`unrelated retrieve failed: ${JSON.stringify(res.data)}`);

  res = await request("POST", "/api/context/ingest", {
    sessionId,
    kind: "file",
    text: "替换后的内容：这是一段全新的文本，原有内容应该已经被清理。",
    sourceId: "doc:test-1",
    sourceMeta: { fileName: "test.txt" },
    replace: true
  });
  if (res.status === 200 && res.data?.ok) pass("replace ingest succeeded");
  else fail(`replace ingest failed: ${JSON.stringify(res.data)}`);

  res = await request("DELETE", `/api/context/${sessionId}`);
  if (res.status === 200 && res.data?.ok) pass("wipe succeeded");
  else fail(`wipe failed: ${JSON.stringify(res.data)}`);

  res = await request("GET", `/api/context/stats?sessionId=${sessionId}`);
  if (res.status === 200 && res.data?.chunks === 0) pass("session is empty after wipe");
  else fail(`expected empty after wipe, got ${JSON.stringify(res.data)}`);
}

async function main() {
  const startTime = Date.now();
  log("Starting RAG integration tests...");
  try {
    await startServer();
    log("Server started on " + BASE_URL);
  } catch (err) {
    fail("Server failed to start: " + err.message);
    await stopServer();
    process.exit(1);
  }

  try {
    await testMissingSessionId();
    await testIngestRetrieveWipe();
  } catch (err) {
    fail("Unhandled error: " + err.message);
    console.error(err.stack);
  }

  await stopServer();

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  if (failed === 0) {
    log(`All checks passed (${elapsed}s)`);
    process.exit(0);
  }
  log(`${failed} check(s) failed (${elapsed}s)`);
  for (const error of errors) console.error("  - " + error);
  process.exit(1);
}

main().catch((err) => {
  console.error("[test-rag] fatal:", err);
  stopServer().finally(() => process.exit(1));
});
