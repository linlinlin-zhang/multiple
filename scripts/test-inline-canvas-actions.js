import assert from "node:assert/strict";
import { extractInlineCanvasActionsFromReply, removeInlineCanvasActionBlocks } from "../src/lib/inlineCanvasActions.js";

const allowedTypes = ["create_note", "create_comparison", "generate_image"];

const reply = [
  "我为你创建了一张点评笔记卡片。",
  "",
  "```json",
  "{",
  "  \"action\": \"create_note\",",
  "  \"title\": \"照片点评：秋叶与建筑\",",
  "  \"content\": { \"text\": \"# 照片点评\\n\\n## 亮点\\n- 光影通透\" }",
  "}",
  "```"
].join("\n");

const actions = extractInlineCanvasActionsFromReply(reply, { allowedTypes });
assert.equal(actions.length, 1);
assert.equal(actions[0].type, "create_note");
assert.equal(actions[0].title, "照片点评：秋叶与建筑");
assert.equal(actions[0].content.text, "# 照片点评\n\n## 亮点\n- 光影通透");

const cleaned = removeInlineCanvasActionBlocks(reply, { allowedTypes });
assert.match(cleaned, /我为你创建/);
assert.doesNotMatch(cleaned, /```json/);
assert.doesNotMatch(cleaned, /"action"/);

const plainCode = [
  "这里是普通 JSON 示例：",
  "```json",
  "{ \"hello\": \"world\" }",
  "```"
].join("\n");
assert.deepEqual(extractInlineCanvasActionsFromReply(plainCode, { allowedTypes }), []);
assert.equal(removeInlineCanvasActionBlocks(plainCode, { allowedTypes }), plainCode);

console.log("inline canvas action tests passed");
