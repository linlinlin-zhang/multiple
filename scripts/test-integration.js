import { spawn } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";

const BASE_URL = "http://127.0.0.1:3001";
const SERVER_CMD = ["node", "server.js"];
const SERVER_ENV = { ...process.env, HOST: "127.0.0.1", PORT: "3001", NODE_ENV: "test" };
const SERVER_STARTUP_TIMEOUT_MS = 30000;

let server;
let failed = 0;
const errors = [];
const cookieJar = new Map();
let serverOutput = "";

function log(msg) {
  console.log("[test] " + msg);
}

function fail(msg) {
  failed++;
  errors.push(msg);
  console.error("[FAIL] " + msg);
}

async function request(method, path, body) {
  const url = BASE_URL + path;
  const opts = { method, headers: {} };
  const cookieHeader = serializeCookies();
  if (cookieHeader) opts.headers.Cookie = cookieHeader;
  if (body) {
    opts.body = typeof body === "string" ? body : JSON.stringify(body);
    opts.headers["Content-Type"] = "application/json";
  }
  const res = await fetch(url, opts);
  captureCookies(res);
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  return { status: res.status, data };
}

async function fetchWithCookies(path, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  const cookieHeader = serializeCookies();
  if (cookieHeader) headers.Cookie = cookieHeader;
  const res = await fetch(BASE_URL + path, { ...opts, headers });
  captureCookies(res);
  return res;
}

function captureCookies(res) {
  const setCookies = typeof res.headers.getSetCookie === "function"
    ? res.headers.getSetCookie()
    : (res.headers.get("set-cookie") ? [res.headers.get("set-cookie")] : []);
  for (const raw of setCookies) {
    const pair = String(raw || "").split(";")[0];
    const index = pair.indexOf("=");
    if (index > 0) cookieJar.set(pair.slice(0, index).trim(), pair.slice(index + 1).trim());
  }
}

function serializeCookies() {
  return [...cookieJar.entries()].map(([key, value]) => `${key}=${value}`).join("; ");
}

function startServer() {
  return new Promise((resolve, reject) => {
    server = spawn(SERVER_CMD[0], SERVER_CMD.slice(1), {
      env: SERVER_ENV,
      stdio: "pipe"
    });
    server.stdout.on("data", (chunk) => {
      serverOutput += String(chunk);
    });
    server.stderr.on("data", (chunk) => {
      serverOutput += String(chunk);
    });
    let ready = false;
    const timer = setTimeout(() => {
      if (!ready) reject(new Error(`Server startup timeout${serverOutput ? `\n${serverOutput.trim()}` : ""}`));
    }, SERVER_STARTUP_TIMEOUT_MS);
    const check = setInterval(async () => {
      try {
        const headers = {};
        const cookieHeader = serializeCookies();
        if (cookieHeader) headers.Cookie = cookieHeader;
        const res = await fetch(BASE_URL + "/api/health", { headers });
        captureCookies(res);
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
  });
}

function stopServer() {
  return new Promise((resolve) => {
    if (!server) return resolve();
    server.kill("SIGTERM");
    const t = setTimeout(() => { server.kill("SIGKILL"); resolve(); }, 3000);
    server.on("exit", () => { clearTimeout(t); resolve(); });
  });
}

async function main() {
  const startTime = Date.now();
  log("Starting integration tests...");
  try {
    await startServer();
    log("Server started on " + BASE_URL);
  } catch (err) {
    fail("Server failed to start: " + err.message);
    console.log("\n=== RESULT ===");
    console.log("Passed: 0, Failed: " + failed);
    errors.forEach((e) => console.error("  - " + e));
    process.exit(1);
  }

  // Test 1: Health
  {
    const { status, data } = await request("GET", "/api/health");
    if (status === 200 && data?.ok === true) log("Health check: PASS");
    else fail("Health check failed: status=" + status);
  }

  // Test 2: Asset upload
  let assetHash;
  {
    const smallJpeg = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCHwAB//9k=";
    const { status, data } = await request("POST", "/api/assets", { dataUrl: smallJpeg, kind: "upload" });
    if (status === 200 && data?.ok === true && /^[a-f0-9]{64}$/i.test(data.hash)) {
      assetHash = data.hash;
      log("Asset upload: PASS (hash=" + data.hash.slice(0, 16) + "...)");
    } else fail("Asset upload failed: status=" + status);
  }

  // Test 3: Asset file on disk
  if (assetHash) {
    const dir = "storage/upload/" + assetHash.slice(0, 2) + "/" + assetHash.slice(2, 4);
    const prefix = assetHash.slice(4) + ".";
    const fileName = existsSync(dir) ? readdirSync(dir).find((entry) => entry.startsWith(prefix)) : "";
    if (fileName) log("Asset file on disk: PASS (" + dir + "/" + fileName + ")");
    else fail("Asset file not found under " + dir);

    const response = await fetch(BASE_URL + "/api/assets/" + assetHash + "?kind=upload");
    if (response.status === 200 && (response.headers.get("content-type") || "").startsWith("image/")) {
      log("Asset read endpoint: PASS");
    } else {
      fail("Asset read endpoint failed: status=" + response.status);
    }
  }

  // Test 4: Session create
  let sessionId;
  {
    const sampleState = {
      sourceImage: null, fileName: "test.jpg",
      latestAnalysis: { summary: "测试摘要", detectedSubjects: ["主体1"], moodKeywords: ["关键词1"], options: [] },
      chatMessages: [{ role: "user", content: "你好" }],
      nodes: {
        source: { id: "source", x: 96, y: 88, width: 318, height: 326, generated: false, option: null, imageHash: null },
        analysis: { id: "analysis", x: 452, y: 96, width: 318, height: 220, generated: false, option: null, imageHash: null }
      },
      links: [{ from: "source", to: "analysis", kind: "analysis" }],
      collapsed: [], generatedCount: 0, view: { x: 0, y: 0, scale: 0.86 }
    };
    const { status, data } = await request("POST", "/api/sessions", { state: sampleState, title: "测试会话" });
    if (status === 200 && data?.ok === true && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.sessionId)) {
      sessionId = data.sessionId;
      log("Session create: PASS (id=" + sessionId + ")");
    } else fail("Session create failed: status=" + status);
  }

  // Test 5: Session read
  if (sessionId) {
    const { status, data } = await request("GET", "/api/sessions/" + sessionId);
    if (status === 200 && Array.isArray(data?.nodes) && data.nodes.length === 2 &&
        Array.isArray(data?.links) && data.links.length === 1 &&
        Array.isArray(data?.chatMessages) && data.chatMessages.length === 1) {
      log("Session read: PASS (nodes=" + data.nodes.length + ", links=" + data.links.length + ")");
    } else fail("Session read failed: status=" + status);
  }

  // Test 6: History list
  if (sessionId) {
    const { status, data } = await request("GET", "/api/history?limit=5");
    if (status === 200 && data?.ok === true && Array.isArray(data.sessions) &&
        data.sessions.length >= 1 && data.sessions[0].id === sessionId && data.sessions[0].nodeCount === 2) {
      log("History list: PASS (nodeCount=" + data.sessions[0].nodeCount + ")");
    } else fail("History list failed: status=" + status);
  }

  // Test 7: Session update
  if (sessionId) {
    const updateState = {
      sourceImage: null, fileName: "test.jpg",
      latestAnalysis: { summary: "更新摘要", detectedSubjects: [], moodKeywords: [], options: [] },
      chatMessages: [],
      nodes: { source: { id: "source", x: 100, y: 100, width: 318, height: 326, generated: false, option: null, imageHash: null } },
      links: [], collapsed: [], generatedCount: 0, view: { x: 10, y: 20, scale: 1.0 }
    };
    const { status, data } = await request("PUT", "/api/sessions/" + sessionId, { state: updateState });
    if (status === 200 && data?.ok === true) log("Session update: PASS");
    else fail("Session update failed: status=" + status);

    const { status: gs, data: gd } = await request("GET", "/api/sessions/" + sessionId);
    if (gs === 200 && gd?.viewState?.scale === 1.0) log("Session update verify: PASS (scale=" + gd.viewState.scale + ")");
    else fail("Session update verify failed: scale=" + (gd?.viewState?.scale));
  }

  // Test 8: Import/export/share management
  if (sessionId) {
    const preview = await request("GET", "/api/sessions/" + sessionId + "/export/preview");
    if (preview.status === 200 && preview.data?.ok === true && preview.data.nodeCount === 1) {
      log("Export preview: PASS (nodes=" + preview.data.nodeCount + ", assets=" + preview.data.assetCount + ")");
    } else {
      fail("Export preview failed: status=" + preview.status);
    }

    const share = await request("POST", "/api/sessions/" + sessionId + "/share", { expiresInDays: 7 });
    const shareToken = share.data?.token;
    if (share.status === 200 && share.data?.ok === true && shareToken && share.data.expiresAt) {
      log("Share create with expiry: PASS");
    } else {
      fail("Share create with expiry failed: status=" + share.status);
    }

    if (shareToken) {
      const view = await request("GET", "/api/share/" + shareToken);
      if (view.status === 200 && view.data?.ok === true && view.data.accessCount >= 1) {
        log("Share access stats increment: PASS (accessCount=" + view.data.accessCount + ")");
      } else {
        fail("Share access stats failed: status=" + view.status);
      }

      const listed = await request("GET", "/api/sessions/" + sessionId + "/shares");
      const listedShare = listed.data?.shares?.find((item) => item.token === shareToken);
      if (listed.status === 200 && listedShare?.accessCount >= 1) {
        log("Share list stats: PASS");
      } else {
        fail("Share list stats failed: status=" + listed.status);
      }
    }

    const exported = await fetchWithCookies("/api/sessions/" + sessionId + "/export");
    const archiveBuffer = Buffer.from(await exported.arrayBuffer());
    if (exported.status === 200 && archiveBuffer.length > 100) {
      log("Session export archive: PASS (" + archiveBuffer.length + " bytes)");
    } else {
      fail("Session export archive failed: status=" + exported.status);
    }

    if (archiveBuffer.length > 0) {
      const importPreviewRes = await fetchWithCookies("/api/import/preview", {
        method: "POST",
        headers: { "Content-Type": "application/zip" },
        body: archiveBuffer
      });
      const importPreview = await importPreviewRes.json();
      if (importPreviewRes.status === 200 && importPreview?.ok === true && importPreview.title) {
        log("Import preview: PASS (title=" + importPreview.title + ")");
      } else {
        fail("Import preview failed: status=" + importPreviewRes.status);
      }

      const batch = await request("POST", "/api/import/batch", {
        packages: [{ name: "copy.zip", archiveBase64: archiveBuffer.toString("base64") }],
        conflictStrategy: "rename"
      });
      if (batch.status === 200 && batch.data?.importedCount === 1 && batch.data.results?.[0]?.sessionId) {
        log("Batch import with conflict rename: PASS (id=" + batch.data.results[0].sessionId + ")");
      } else {
        fail("Batch import failed: status=" + batch.status);
      }
    }

    const historySystem = await request("GET", "/api/history?source=system&includeHidden=1");
    if (historySystem.status === 200 && historySystem.data?.ok === true && Array.isArray(historySystem.data.sessions)) {
      log("System history management list: PASS");
    } else {
      fail("System history management list failed: status=" + historySystem.status);
    }

    const materialSystem = await request("GET", "/api/materials?source=system&includeHidden=1");
    if (materialSystem.status === 200 && materialSystem.data?.ok === true && Array.isArray(materialSystem.data.items)) {
      log("System material management list: PASS");
    } else {
      fail("System material management list failed: status=" + materialSystem.status);
    }
  }

  // Test 9: Asset dedup
  {
    const smallJpeg = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCHwAB//9k=";
    const r1 = await request("POST", "/api/assets", { dataUrl: smallJpeg, kind: "upload" });
    const r2 = await request("POST", "/api/assets", { dataUrl: smallJpeg, kind: "upload" });
    if (r1.status === 200 && r2.status === 200 && r1.data?.hash === r2.data?.hash) log("Asset dedup: PASS");
    else fail("Asset dedup failed");
  }

  await stopServer();
  log("Server stopped");
  const elapsed = Date.now() - startTime;
  console.log("\n========================================");
  console.log("Integration Tests: " + (failed === 0 ? "ALL PASSED" : failed + " FAILED"));
  console.log("Elapsed: " + elapsed + "ms");
  if (errors.length) { console.log("\nErrors:"); errors.forEach((e) => console.error("  - " + e)); }
  console.log("========================================");
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Test runner error:", err);
  stopServer().then(() => process.exit(1));
});
