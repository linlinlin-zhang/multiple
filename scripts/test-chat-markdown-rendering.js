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

assert.equal(
  normalizeChatMarkdown("## # 构图：框式结构与纵深层次"),
  "## 构图：框式结构与纵深层次",
  "duplicate heading markers should not leave a visible #"
);

assert.equal(
  normalizeChatMarkdown("## 光线与影调"),
  "## 光线与影调",
  "level two headings should remain level two"
);

assert.equal(
  normalizeChatMarkdown("### 三级标题"),
  "### 三级标题",
  "level three headings should not be split into broken markers"
);

assert.equal(
  normalizeChatMarkdown("\u200b# 光线与影调：高对比的戏剧性"),
  "# 光线与影调：高对比的戏剧性",
  "hidden characters before a heading marker should be removed"
);

assert.equal(
  normalizeChatMarkdown("##\u00a0色彩与氛围"),
  "## 色彩与氛围",
  "non-breaking spaces after a heading marker should become normal spaces"
);

assert.equal(
  normalizeChatMarkdown("\\# 色彩与质感：低饱和的都市灰蓝"),
  "# 色彩与质感：低饱和的都市灰蓝",
  "escaped heading markers should render as headings"
);

assert.equal(
  repairRenderedMarkdownHeadings("<p># 构图：框式结构与纵深层次</p>"),
  "<h1>构图：框式结构与纵深层次</h1>",
  "paragraph headings should be repaired"
);

assert.equal(
  stripRenderedHeadingMarkerPrefixes("<h2># 光线与影调：高对比的戏剧性</h2>"),
  "<h2>光线与影调：高对比的戏剧性</h2>",
  "rendered headings should not retain visible markers"
);

assert.equal(
  stripRenderedHeadingMarkerPrefixes("<h3>\\# 色彩与质感：低饱和的都市灰蓝</h3>"),
  "<h3>色彩与质感：低饱和的都市灰蓝</h3>",
  "escaped markers inside rendered headings should be stripped"
);

console.log("[test] chat markdown rendering: PASS");
