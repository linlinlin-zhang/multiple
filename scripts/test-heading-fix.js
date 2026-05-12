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
  assert.notEqual(bodyStart, -1, `${name} must have a body`);

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
vm.runInNewContext(snippet, sandbox, { filename: "chat-markdown-rendering.js" });

const { repairRenderedMarkdownHeadings, stripRenderedHeadingMarkerPrefixes } = sandbox.__chatMarkdown;

const tests = [];
function test(name, fn, input, expected) {
  tests.push({ name, fn, input, expected });
}

// repairRenderedMarkdownHeadings
test("repair plain p heading", repairRenderedMarkdownHeadings, "<p># 光线与影调</p>", "<h1>光线与影调</h1>");
test("repair p with class (should not match)", repairRenderedMarkdownHeadings, '<p class="x"># 光线与影调</p>', '<p class="x"># 光线与影调</p>');
test("repair p with br", repairRenderedMarkdownHeadings, "<p># 光线与影调<br>高对比</p>", "<h1>光线与影调<br>高对比</h1>");
test("repair p with bold markdown", repairRenderedMarkdownHeadings, "<p># **光线与影调**：高对比</p>", "<h1>**光线与影调**：高对比</h1>");
test("repair p with nbsp entity", repairRenderedMarkdownHeadings, "<p>#&nbsp;光线与影调</p>", "<h1>光线与影调</h1>");
test("repair p with leading newline", repairRenderedMarkdownHeadings, "<p>\n# 光线与影调\n</p>", "<h1>光线与影调</h1>");
test("repair p with span", repairRenderedMarkdownHeadings, "<p># <span>光线与影调</span></p>", "<h1><span>光线与影调</span></h1>");
test("repair double hash", repairRenderedMarkdownHeadings, "<p>## 光线与影调</p>", "<h2>光线与影调</h2>");
test("repair two headings", repairRenderedMarkdownHeadings, "<p># 光线与影调</p><p># 色彩与质感</p>", "<h1>光线与影调</h1><h1>色彩与质感</h1>");

// stripRenderedHeadingMarkerPrefixes
test("strip h2 marker", stripRenderedHeadingMarkerPrefixes, "<h2># 光线与影调</h2>", "<h2>光线与影调</h2>");
test("strip h2 with class", stripRenderedHeadingMarkerPrefixes, '<h2 class="rich-md-h2"># 光线与影调</h2>', '<h2 class="rich-md-h2">光线与影调</h2>');
test("strip h2 double hash", stripRenderedHeadingMarkerPrefixes, "<h2>## 光线与影调</h2>", "<h2>光线与影调</h2>");
test("strip h2 no space", stripRenderedHeadingMarkerPrefixes, "<h2>#光线与影调</h2>", "<h2>光线与影调</h2>");
test("strip h2 with nbsp entity", stripRenderedHeadingMarkerPrefixes, "<h2>#&nbsp;光线与影调</h2>", "<h2>光线与影调</h2>");
test("strip escaped marker", stripRenderedHeadingMarkerPrefixes, "<h2>\\# 光线与影调</h2>", "<h2>光线与影调</h2>");
test("strip full-width marker", stripRenderedHeadingMarkerPrefixes, "<h2>＃ 光线与影调</h2>", "<h2>光线与影调</h2>");

let passed = 0;
let failed = 0;
for (const t of tests) {
  try {
    const result = t.fn(t.input);
    assert.equal(result, t.expected, t.name);
    passed++;
  } catch (e) {
    failed++;
    console.log(`FAIL: ${t.name}`);
    console.log(`  input:    ${JSON.stringify(t.input)}`);
    console.log(`  expected: ${JSON.stringify(t.expected)}`);
    console.log(`  actual:   ${JSON.stringify(e.actual !== undefined ? e.actual : "(exception)")}`);
  }
}

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
