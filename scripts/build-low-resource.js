import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appDir = path.join(root, "app");
const binExt = process.platform === "win32" ? ".cmd" : "";
const heapMb = String(process.env.BUILD_NODE_HEAP_MB || "640");
const niceLevel = String(process.env.BUILD_NICE || "15");
const ioniceClass = String(process.env.BUILD_IONICE_CLASS || "2");
const ioniceLevel = String(process.env.BUILD_IONICE_LEVEL || "7");
const pauseMs = Number(process.env.BUILD_STEP_PAUSE_MS || "1200");

function hasCommand(name) {
  if (process.platform === "win32") return false;
  return spawnSync("sh", ["-c", `command -v ${name} >/dev/null 2>&1`], { stdio: "ignore" }).status === 0;
}

function managedNodeOptions(current) {
  const cleaned = String(current || "")
    .replace(/--max-old-space-size=\S+/g, "")
    .replace(/--max-semi-space-size=\S+/g, "")
    .trim();
  return [cleaned, `--max-old-space-size=${heapMb}`, "--max-semi-space-size=16"].filter(Boolean).join(" ");
}

function lowResourceEnv() {
  return {
    ...process.env,
    NODE_OPTIONS: managedNodeOptions(process.env.NODE_OPTIONS),
    VITE_LOW_RESOURCE_BUILD: process.env.VITE_LOW_RESOURCE_BUILD || "1",
    GOMAXPROCS: process.env.GOMAXPROCS || "1",
    UV_THREADPOOL_SIZE: process.env.UV_THREADPOOL_SIZE || "2",
    npm_config_jobs: process.env.npm_config_jobs || "1",
    CI: process.env.CI || "1",
    FORCE_COLOR: process.env.FORCE_COLOR || "0",
    NO_COLOR: process.env.NO_COLOR || "1"
  };
}

function limitedCommand(command, args) {
  let nextCommand = command;
  let nextArgs = args;
  if (hasCommand("nice")) {
    nextArgs = ["-n", niceLevel, nextCommand, ...nextArgs];
    nextCommand = "nice";
  }
  if (hasCommand("ionice")) {
    nextArgs = ["-c", ioniceClass, "-n", ioniceLevel, nextCommand, ...nextArgs];
    nextCommand = "ionice";
  }
  return { command: nextCommand, args: nextArgs };
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function runStep(step, env) {
  return new Promise((resolve, reject) => {
    const limited = limitedCommand(step.command, step.args);
    console.log(`[build:low] ${step.name}`);
    const child = spawn(limited.command, limited.args, {
      cwd: step.cwd,
      env,
      stdio: "inherit"
    });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${step.name} failed${signal ? ` with signal ${signal}` : ` with exit code ${code}`}`));
    });
  });
}

const steps = [
  {
    name: "TypeScript check",
    command: path.join(appDir, "node_modules", ".bin", `tsc${binExt}`),
    args: ["-b"],
    cwd: appDir
  },
  {
    name: "Vite bundle",
    command: path.join(appDir, "node_modules", ".bin", `vite${binExt}`),
    args: ["build"],
    cwd: appDir
  },
  {
    name: "Copy history dist",
    command: process.execPath,
    args: [path.join(root, "scripts", "copy-history-dist.js")],
    cwd: root
  }
];

const env = lowResourceEnv();
console.log(`[build:low] heap=${heapMb}MB nice=${niceLevel} ionice=${ioniceClass}:${ioniceLevel} gomaxprocs=${env.GOMAXPROCS}`);

try {
  for (const [index, step] of steps.entries()) {
    await runStep(step, env);
    if (index < steps.length - 1 && Number.isFinite(pauseMs) && pauseMs > 0) await wait(pauseMs);
  }
} catch (error) {
  console.error(`[build:low] ${error.message}`);
  process.exit(1);
}
