import assert from "node:assert/strict";
import { spawn } from "node:child_process";

const PORT = String(3010 + Math.floor(Math.random() * 400));
const BASE_URL = `http://127.0.0.1:${PORT}`;
const SERVER_STARTUP_TIMEOUT_MS = 30000;

let server = null;
let serverOutput = "";

function startServer() {
  return new Promise((resolve, reject) => {
    server = spawn("node", ["server.js"], {
      env: {
        ...process.env,
        DEMO_MODE: "true",
        HOST: "127.0.0.1",
        PORT,
        NODE_ENV: "test"
      },
      stdio: "pipe"
    });
    server.stdout.on("data", (chunk) => {
      serverOutput += String(chunk);
    });
    server.stderr.on("data", (chunk) => {
      serverOutput += String(chunk);
    });
    server.on("error", reject);

    const startedAt = Date.now();
    const timer = setInterval(async () => {
      if (Date.now() - startedAt > SERVER_STARTUP_TIMEOUT_MS) {
        clearInterval(timer);
        reject(new Error(`server startup timeout\n${serverOutput.trim()}`));
        return;
      }
      try {
        const res = await fetch(`${BASE_URL}/api/health`);
        const data = await res.json();
        if (res.ok && data?.ok === true) {
          clearInterval(timer);
          resolve();
        }
      } catch {}
    }, 400);
  });
}

function stopServer() {
  return new Promise((resolve) => {
    if (!server) {
      resolve();
      return;
    }
    const timer = setTimeout(() => {
      server.kill("SIGKILL");
      resolve();
    }, 3000);
    server.on("exit", () => {
      clearTimeout(timer);
      resolve();
    });
    server.kill("SIGTERM");
  });
}

async function postJson(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body)
  });
  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { rawText: text };
  }
  assert.ok(res.ok, `${path} returned ${res.status}: ${text.slice(0, 300)}`);
  return data;
}

async function main() {
  await startServer();
  try {
    const prompt = [
      "任务型调研 Agent 工作流：帮我调研 AI canvas 产品的证据来源、竞品差异和可落地结论。",
      "请把工作过程外化到画布，而不是只写聊天文字。",
      "创建证据卡、结论卡、报告卡和后续行动清单。"
    ].join("\n");
    const data = await postJson("/api/deep-research", {
      message: prompt,
      language: "zh",
      selectedNodeId: "source",
      selectedContext: {
        type: "source",
        title: "测试主题",
        summary: "AI canvas 产品调研"
      },
      canvas: {
        nodes: [{ id: "source", title: "源卡片", type: "source" }],
        links: []
      },
      analysis: {
        title: "测试",
        summary: "AI canvas 产品调研"
      },
      messages: [],
      imageDataUrl: ""
    });
    const cards = Array.isArray(data.cards) ? data.cards : [];
    const links = Array.isArray(data.links) ? data.links : [];
    const types = new Set(cards.map((card) => card?.type || card?.nodeType).filter(Boolean));
    assert.equal(data.provider, "demo");
    assert.ok(cards.length >= 4, `expected at least 4 canvas cards, got ${cards.length}`);
    assert.ok(links.length >= 1, `expected at least 1 canvas link, got ${links.length}`);
    assert.ok(types.has("web") || types.has("note") || types.has("plan"), `unexpected card types: ${Array.from(types).join(", ")}`);
    assert.ok(cards.every((card) => card?.title && (card?.prompt || card?.summary || card?.content)), "cards should have title and useful payload");
    console.log(`[test] research agent full flow: PASS (${cards.length} cards, ${links.length} links, types=${Array.from(types).join(",")})`);
  } finally {
    await stopServer();
  }
}

main().catch(async (error) => {
  console.error("[test] research agent full flow: FAIL");
  console.error(error);
  await stopServer();
  process.exit(1);
});
