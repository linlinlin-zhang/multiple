import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const publicApp = fs.readFileSync(path.join(repoRoot, "public", "app.js"), "utf8");

function extractFunction(source, name) {
  const index = source.indexOf(`function ${name}`);
  assert.notEqual(index, -1, `${name} must exist`);
  const bodyStart = source.indexOf("{", index);
  let depth = 0;
  for (let pos = bodyStart; pos < source.length; pos += 1) {
    const char = source[pos];
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    if (depth === 0) return source.slice(index, pos + 1);
  }
  assert.fail(`${name} body was not closed`);
}

const snippet = [
  extractFunction(publicApp, "normalizeChatHeadingMarker"),
  extractFunction(publicApp, "repairRenderedMarkdownHeadings"),
  extractFunction(publicApp, "stripRenderedHeadingMarkerPrefixes"),
  `
    globalThis.__chatMarkdown = {
      repairRenderedMarkdownHeadings,
      stripRenderedHeadingMarkerPrefixes
    };
  `
].join("\n\n");

const sandbox = {};
vm.runInNewContext(snippet, sandbox, { filename: "debug-heading.js" });

const { repairRenderedMarkdownHeadings, stripRenderedHeadingMarkerPrefixes } = sandbox.__chatMarkdown;

// Simulate what micromark would output for a heading
const micromarkOutput = "<h1># 如果后续想调整</h1><ul><li>如果想突出人物</li></ul>";

console.log("Input:", micromarkOutput);
console.log("After stripRenderedHeadingMarkerPrefixes:", stripRenderedHeadingMarkerPrefixes(micromarkOutput));

// Also test repair
const paragraphHeading = "<p># 如果后续想调整</p>";
console.log("\nParagraph input:", paragraphHeading);
console.log("After repairRenderedMarkdownHeadings:", repairRenderedMarkdownHeadings(paragraphHeading));

// Test with newlines inside heading
const newlineHeading = "<h1>\n# 如果后续想调整\n</h1>";
console.log("\nNewline heading input:", JSON.stringify(newlineHeading));
console.log("After strip:", stripRenderedHeadingMarkerPrefixes(newlineHeading));

// Test with class attribute
const classHeading = '<h1 class="foo"># 如果后续想调整</h1>';
console.log("\nClass heading input:", classHeading);
console.log("After strip:", stripRenderedHeadingMarkerPrefixes(classHeading));
