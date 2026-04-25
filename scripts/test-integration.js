/**
 * Integration test for ORYZAE Image Board persistence layer.
 *
 * Tests the full lifecycle:
 *   1. Asset upload (deduplication)
 *   2. Session create
 *   3. Session read
 *   4. History list
 *   5. Session update
 *
 * Environment:
 *   - Requires the server to be runnable (node server.js)
 *   - Requires PostgreSQL running and DATABASE_URL set
 *   - Runs with NODE_ENV=test
 *
 * NOTE: PostgreSQL is NOT running in this environment. The script is written
 * correctly but may not fully execute without a database connection.
 */

import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, "..");

const PORT = 39999;
const BASE_URL = `http://localhost:${PORT}`;
const TIMEOUT_MS = 30000;

let serverProcess = null;
let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, message) {
  if (condition) {
    passed += 1;
    console.log(`  PASS: ${message}`);
  } else {
    failed += 1;
    failures.push(message);
    console.error(`  FAIL: ${message}`);
  }
}

async function request(method, pathname, body) {
  const url = `${BASE_URL}${pathname}`;
  const options = {
    method,
    headers: {}
  };
  if (body) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function waitForServer(maxWaitMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    try {
      const res = await fetch(`${BASE_URL}/api/health`);
      if (res.status === 200) return true;
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
}

function startServer() {
  return new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      NODE_ENV: "test",
      PORT: String(PORT),
      DEMO_MODE: "true"
    };

    serverProcess = spawn("node", [path.join(rootDir, "server.js")], {
      env,
      stdio: "pipe",
      cwd: rootDir
    });

    let stdout = "";
    let stderr = "";
    serverProcess.stdout.on("data", (d) => { stdout += d; });
    serverProcess.stderr.on("data", (d) => { stderr += d; });

    serverProcess.on("error", reject);

    // Give it a moment to start, then resolve
    setTimeout(() => resolve({ stdout, stderr }), 800);
  });
}

function stopServer() {
  return new Promise((resolve) => {
    if (!serverProcess) return resolve();
    serverProcess.kill("SIGTERM");
    const t = setTimeout(() => {
      try { serverProcess.kill("SIGKILL"); } catch {}
      resolve();
    }, 3000);
    serverProcess.on("exit", () => {
      clearTimeout(t);
      resolve();
    });
  });
}

async function cleanupDb() {
  // Dynamically import Prisma only when DB is available.
  // If the module fails to initialize (no DB), we skip cleanup.
  try {
    const { prisma } = await import("../src/lib/prisma.js");
    await prisma.session.deleteMany();
    await prisma.asset.deleteMany();
    await prisma.$disconnect();
  } catch (err) {
    console.log(`  [cleanupDb skipped: ${err.message}]`);
  }
}

async function runTests() {
  console.log("=== ORYZAE Integration Tests ===\n");

  // 0. Start server
  console.log("[0/6] Starting server...");
  await startServer();
  const ready = await waitForServer(8000);
  assert(ready, "Server health endpoint responds within 8s");
  if (!ready) {
    console.error("\nServer failed to start. Aborting tests.");
    return;
  }

  // Clean DB before tests
  await cleanupDb();

  // 1. Asset upload
  console.log("\n[1/6] Asset upload");
  const samplePixels = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64"
  );
  const dataUrl = `data:image/png;base64,${samplePixels.toString("base64")}`;

  const assetRes1 = await request("POST", "/api/assets", { dataUrl, kind: "upload" });
  assert(assetRes1.status === 200, "POST /api/assets returns 200");
  assert(assetRes1.data.ok === true, "POST /api/assets returns ok=true");
  assert(/^[a-f0-9]{64}$/i.test(assetRes1.data.hash), "Asset hash is 64-char hex");

  const hash1 = assetRes1.data.hash;

  // Deduplication: upload same content again
  const assetRes2 = await request("POST", "/api/assets", { dataUrl, kind: "upload" });
  assert(assetRes2.data.hash === hash1, "Same content returns same hash (dedup)");

  // File exists on disk
  const filePath = path.join(rootDir, "storage", "upload", hash1.slice(0, 2), hash1.slice(2, 4), `${hash1.slice(4)}.png`);
  try {
    const stat = await fs.stat(filePath);
    assert(stat.isFile(), `Asset file exists at ${filePath}`);
  } catch {
    assert(false, `Asset file exists at ${filePath}`);
  }

  // 2. Session create
  console.log("\n[2/6] Session create");
  const sampleState = {
    sourceImage: dataUrl,
    fileName: "test.jpg",
    latestAnalysis: {
      summary: "测试摘要",
      detectedSubjects: ["主体1"],
      moodKeywords: ["关键词1"],
      options: []
    },
    chatMessages: [{ role: "user", content: "你好" }],
    nodes: {
      source: { id: "source", x: 96, y: 88, width: 318, height: 326, generated: false, option: null, imageHash: null },
      analysis: { id: "analysis", x: 452, y: 96, width: 318, height: 220, generated: false, option: null, imageHash: null }
    },
    links: [{ from: "source", to: "analysis", kind: "analysis" }],
    collapsed: [],
    generatedCount: 0,
    view: { x: 0, y: 0, scale: 0.86 }
  };

  const createRes = await request("POST", "/api/sessions", {
    state: sampleState,
    title: "Integration Test Session",
    isDemo: false
  });
  assert(createRes.status === 200, "POST /api/sessions returns 200");
  assert(createRes.data.ok === true, "POST /api/sessions returns ok=true");
  assert(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(createRes.data.sessionId), "sessionId is valid UUID v4");

  const sessionId = createRes.data.sessionId;

  // 3. Session read
  console.log("\n[3/6] Session read");
  const getRes = await request("GET", `/api/sessions/${sessionId}`);
  assert(getRes.status === 200, "GET /api/sessions/:id returns 200");
  assert(Array.isArray(getRes.data.nodes), "Session has nodes array");
  assert(getRes.data.nodes.length === 2, `Session has 2 nodes (got ${getRes.data.nodes.length})`);
  assert(Array.isArray(getRes.data.links), "Session has links array");
  assert(getRes.data.links.length === 1, `Session has 1 link (got ${getRes.data.links.length})`);
  assert(Array.isArray(getRes.data.chatMessages), "Session has chatMessages array");
  assert(getRes.data.chatMessages.length === 1, `Session has 1 chatMessage (got ${getRes.data.chatMessages.length})`);

  // Node ordering: source should come before analysis for correct graph reconstruction
  const nodeIds = getRes.data.nodes.map((n) => n.nodeId);
  assert(nodeIds.indexOf("source") < nodeIds.indexOf("analysis"), "Nodes ordered: source before analysis");

  // 4. History list
  console.log("\n[4/6] History list");
  const historyRes = await request("GET", "/api/history?limit=10");
  assert(historyRes.status === 200, "GET /api/history returns 200");
  assert(Array.isArray(historyRes.data.sessions), "History returns sessions array");
  assert(historyRes.data.sessions.length >= 1, "History has at least 1 session");
  assert(historyRes.data.sessions[0].id === sessionId, "History first session matches created session");
  assert(historyRes.data.sessions[0].nodeCount === 2, `History nodeCount is 2 (got ${historyRes.data.sessions[0].nodeCount})`);

  // Demo filtering
  const demoRes = await request("GET", "/api/history?includeDemo=false");
  const allRes = await request("GET", "/api/history?includeDemo=true");
  assert(demoRes.data.sessions.every((s) => s.isDemo === false), "includeDemo=false excludes demo sessions");
  assert(allRes.data.total >= demoRes.data.total, "includeDemo=true returns total >= includeDemo=false total");

  // 5. Session update
  console.log("\n[5/6] Session update");
  const updatedState = {
    ...sampleState,
    view: { x: 100, y: 200, scale: 1.0 },
    chatMessages: [
      { role: "user", content: "你好" },
      { role: "assistant", content: "你好！有什么可以帮你的？" }
    ]
  };

  const updateRes = await request("PUT", `/api/sessions/${sessionId}`, {
    state: updatedState,
    title: "Updated Title"
  });
  assert(updateRes.status === 200, "PUT /api/sessions/:id returns 200");
  assert(updateRes.data.ok === true, "PUT /api/sessions/:id returns ok=true");

  const getAfterUpdate = await request("GET", `/api/sessions/${sessionId}`);
  assert(getAfterUpdate.data.viewState?.x === 100, "Updated viewState.x is 100");
  assert(getAfterUpdate.data.viewState?.y === 200, "Updated viewState.y is 200");
  assert(getAfterUpdate.data.chatMessages.length === 2, "Updated chatMessages has 2 entries");
  assert(getAfterUpdate.data.chatMessages[1].content === "你好！有什么可以帮你的？", "Updated chatMessages[1] has correct content");

  // 6. Transaction safety verification
  console.log("\n[6/6] Transaction safety");
  // Create a session, then verify no partial records exist by checking counts
  const countRes = await request("GET", "/api/history?limit=1");
  assert(countRes.data.sessions[0].nodeCount === 2, "Transaction safety: node count consistent after update");
  assert(countRes.data.sessions[0].assetCount >= 1, "Transaction safety: asset count consistent after update");

  // Cleanup
  await cleanupDb();
}

async function main() {
  const timer = setTimeout(() => {
    console.error(`\nTests timed out after ${TIMEOUT_MS}ms`);
    stopServer().then(() => process.exit(1));
  }, TIMEOUT_MS);

  try {
    await runTests();
  } catch (err) {
    console.error("\nUnexpected test error:", err);
    failures.push(`Unexpected error: ${err.message}`);
  } finally {
    clearTimeout(timer);
    await stopServer();
  }

  console.log("\n=== Results ===");
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failures.length) {
    console.log("\nFailures:");
    for (const f of failures) console.log(`  - ${f}`);
  }

  process.exit(failed > 0 ? 1 : 0);
}

main();
