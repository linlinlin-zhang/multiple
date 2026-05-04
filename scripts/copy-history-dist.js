import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "app", "dist");
const target = path.join(root, "public", "history");

await fs.mkdir(target, { recursive: true });
await fs.rm(target, { recursive: true, force: true });
await fs.mkdir(target, { recursive: true });
await fs.cp(source, target, { recursive: true, force: true });
