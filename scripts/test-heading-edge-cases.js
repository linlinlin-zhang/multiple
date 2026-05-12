import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const publicApp = fs.readFileSync(path.join(repoRoot, "public", "app.js"), "utf8");

function extractConst(source, name) {
  const index = source.indexOf(`const ${name}`);
  assert.notEqual(index, -1, `${name} must exist`);
  const end = source.indexOf(";\n", index);
  assert.notEqual(end, -1, `${name} must end with a semicolon`);
  return source.slice(index, end + 1);
}

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
  extractConst(publicApp, "CHAT_MARKDOWN_SECTION_LABEL_RE"),
  extractConst(publicApp, "CHAT_MARKDOWN_HEADING_MARKER_RE"),
  extractConst(publicApp, "CHAT_MARKDOWN_HEADING_SPACE_RE"),
  extractFunction(publicApp, "normalizeChatHeadingMarker"),
  extractFunction(publicApp, "stripChatMarkdownHeadingPrefixArtifacts"),
  extractFunction(publicApp, "stripDuplicateChatHeadingMarkers"),
  extractFunction(publicApp, "normalizeChatMarkdownHeadingLine"),
  extractFunction(publicApp, "normalizeChatMarkdownHeadings"),
  extractFunction(publicApp, "normalizeChatSectionHeadings"),
  extractFunction(publicApp, "normalizeChatLooseLabelLines"),
  extractFunction(publicApp, "normalizeChatMarkdownText"),
  extractFunction(publicApp, "repairInlineMarkdownTableLine"),
  extractFunction(publicApp, "isMarkdownTableSeparatorCell"),
  extractFunction(publicApp, "normalizeMarkdownTableSeparator"),
  extractFunction(publicApp, "formatMarkdownTableRow"),
  extractFunction(publicApp, "normalizeChatMarkdown"),
  extractFunction(publicApp, "repairRenderedMarkdownHeadings"),
  extractFunction(publicApp, "stripRenderedHeadingMarkerPrefixes"),
  `
    globalThis.__chatMarkdown = {
      normalizeChatMarkdown,
      repairRenderedMarkdownHeadings,
      stripRenderedHeadingMarkerPrefixes
    };
  `
].join("\n\n");

const sandbox = {};
vm.runInNewContext(snippet, sandbox, { filename: "chat-markdown-rendering.js" });

const {
  normalizeChatMarkdown,
  repairRenderedMarkdownHeadings,
  stripRenderedHeadingMarkerPrefixes
} = sandbox.__chatMarkdown;

const tests = [];
function test(name, input, expected) {
  tests.push({ name, input, expected });
}

// Unicode whitespace after #
test("full-width space after #", "#　光线与影调：高对比的戏剧性", "# 光线与影调：高对比的戏剧性");
test("en-space after #", "# 光线与影调：高对比的戏剧性", "# 光线与影调：高对比的戏剧性");
test("em-space after #", "# 光线与影调：高对比的戏剧性", "# 光线与影调：高对比的戏剧性");
test("multiple nbsp after #", "#  光线与影调：高对比的戏剧性", "# 光线与影调：高对比的戏剧性");
test("tab after #", "#\t光线与影调：高对比的戏剧性", "# 光线与影调：高对比的戏剧性");
test("no space after #", "#光线与影调：高对比的戏剧性", "# 光线与影调：高对比的戏剧性");

// Heading marker variants
test("double-hash", "## 光线与影调", "## 光线与影调");
test("full-width hash", "＃ 光线与影调", "# 光线与影调");
test("html entity hash", "&#35; 光线与影调", "# 光线与影调");
test("escaped hash", "\\# 光线与影调", "# 光线与影调");

// Prefix artifacts
test("zwsp before hash", "​# 光线与影调", "# 光线与影调");
test("nbsp before hash", " # 光线与影调", "# 光线与影调");
test("4 spaces before hash (should stay)", "    # 光线与影调", "    # 光线与影调");
test("3 spaces before hash", "   # 光线与影调", "   # 光线与影调");

// Duplicate markers
test("duplicate markers", "## # 光线与影调", "## 光线与影调");
test("triple markers", "### ## # 光线与影调", "### 光线与影调");

// Repair rendered
test("repair p>h1", "<p># 光线与影调</p>", "<h1>光线与影调</h1>");
test("repair p>h2", "<p>## 光线与影调</p>", "<h2>光线与影调</h2>");
test("repair p with nbsp", "<p># 光线与影调</p>", "<h1>光线与影调</h1>");

// Strip from rendered headings
test("strip h1 marker", "<h1># 光线与影调</h1>", "<h1>光线与影调</h1>");
test("strip h2 marker", "<h2># 光线与影调</h2>", "<h2>光线与影调</h2>");
test("strip escaped marker", "<h2>\\# 光线与影调</h2>", "<h2>光线与影调</h2>");
test("strip full-width marker", "<h2>＃ 光线与影调</h2>", "<h2>光线与影调</h2>");

// Complex cases from screenshot
test("screenshot-like heading 1", "# 光线与影调：高对比的戏剧性", "# 光线与影调：高对比的戏剧性");
test("screenshot-like heading 2", "# 色彩与质感：低饱和的都市灰蓝", "# 色彩与质感：低饱和的都市灰蓝");
test("screenshot-like heading 3", "# 主题与情绪：孤独的诗意", "# 主题与情绪：孤独的诗意");

// Edge cases that might break repairRenderedMarkdownHeadings
test("heading with bold inside p", "<p># **光线与影调**：高对比的戏剧性</p>", "<p># **光线与影调**：高对比的戏剧性</p>");
test("heading with br inside p", "<p># 光线与影调<br>高对比的戏剧性</p>", "<p># 光线与影调<br>高对比的戏剧性</p>");
test("heading with span inside p", "<p># <span>光线与影调</span></p>", "<p># <span>光线与影调</span></p>");

// Inline heading after text (should be split)
test("inline heading after text", "正文# 光线与影调", "正文\n\n# 光线与影调");

// Multiple headings in sequence
test("two headings no blank", "# 标题1\n# 标题2", "# 标题1\n# 标题2");

let passed = 0;
let failed = 0;
for (const t of tests) {
  try {
    let result;
    if (t.input.startsWith("<p>") || t.input.startsWith("<h")) {
      if (t.input.startsWith("<p>")) {
        result = repairRenderedMarkdownHeadings(t.input);
      } else {
        result = stripRenderedHeadingMarkerPrefixes(t.input);
      }
    } else {
      result = normalizeChatMarkdown(t.input);
    }
    assert.equal(result, t.expected, t.name);
    passed++;
  } catch (e) {
    failed++;
    console.log(`FAIL: ${t.name}`);
    console.log(`  input:    ${JSON.stringify(t.input)}`);
    console.log(`  expected: ${JSON.stringify(t.expected)}`);
    console.log(`  actual:   ${JSON.stringify(e.actual !== undefined ? e.actual : "(exception)")}`);
    if (e.message) console.log(`  error:    ${e.message}`);
  }
}

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
