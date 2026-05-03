# Phase 21 Research: Chat-to-Canvas Reliability & Conversational UX

**Phase:** 21 — Chat-to-Canvas Reliability & Conversational UX
**Researched:** 2026-05-03
**Researcher:** Claude (manual codebase analysis)

---

## 1. Executive Summary

Phase 21 addresses four interrelated problems discovered through full-chain inspection:

1. **Chat cannot create rich nodes** — `server.js` whitelist excludes 7 rich node types (`create_note`/`plan`/`todo`/`weather`/`map`/`link`/`code`) and 4 zoom actions, silently dropping them after the LLM correctly returns them.
2. **Replies are artificially short** — Three layers of hard length constraints (prompt style, META_DIRECTIVES, JSON schema) + forced JSON object mode + system prompt overwritten by action orchestrator prompt.
3. **No streaming in default mode** — Frontend only streams in thinking mode; no-thinking uses blocking POST.
4. **No markdown rendering** — Chat messages rendered as plain text via `textContent`.

**Solution architecture:**
- Single source of truth for canvas actions (`src/prompts/shared.js CANVAS_ACTION_TYPES` imported by server)
- OpenAI tool calling replaces dual-prompt JSON orchestrator (free-form markdown reply + `tool_calls` for actions)
- Default mode streams via SSE (same as thinking mode)
- `micromark` + `DOMPurify` render sanitized HTML from markdown
- Fallback inference extended to all rich node types + inline feedback cards

---

## 2. Root Cause Analysis

### 2.1 Whitelist Mismatch (CC-01, CC-02)

**server.js:96-137** defines `CANVAS_TOOL_TYPES`:
```js
const CANVAS_TOOL_TYPES = [
  "pan_view", "focus_node", "select_node", "move_node", "arrange_canvas",
  "auto_layout", "tidy_canvas", "group_selection", "ungroup_selection",
  "search_card", "export_report", "deselect", "select_source",
  "select_analysis", "create_card", "new_card", "create_direction",
  "create_web_card", "web_search", "create_agent", "generate_image",
  "image_search", "reverse_image_search", "text_image_search",
  "analyze_source", "explore_source", "research_source", "research_node",
  "open_references", "save_session", "new_chat", "open_chat_history",
  "close_chat", "open_chat", "open_history", "open_settings",
  "set_thinking_mode", "set_deep_think_mode", "open_upload", "delete_node"
];
```

**Missing from CANVAS_TOOL_TYPES (present in prompt module):**
- Rich node actions: `create_note`, `create_plan`, `create_todo`, `create_weather`, `create_map`, `create_link`, `create_code`
- Zoom actions: `zoom_in`, `zoom_out`, `set_zoom`, `reset_view`

**src/prompts/shared.js:45-55** defines `CANVAS_ACTION_TYPES` with all 35 actions including the missing ones.

**server.js:2358** creates the filter:
```js
const VOICE_ACTION_TYPES = new Set(CANVAS_TOOL_TYPES);
```

**server.js:2409** filters them out:
```js
.filter((action) => action && VOICE_ACTION_TYPES.has(action.type));
```

**Impact:** The LLM (via `buildChatActionSystemPrompt`) is told to use `create_note`/`create_plan`/etc., but `normalizeVoiceActions` silently drops them. The frontend (`public/app.js:4037`) supports these actions perfectly via `createDirectionFromAction` + `nodeTypeMap`, but never receives them from the backend.

### 2.2 Replies Too Short (CC-03, CC-04)

**Four independent constraints compress output:**

1. **Prompt style constraint** (`src/prompts/chat.js:18`):
   ```js
   "Concise, direct, actionable. Usually 1-3 sentences for chat replies."
   ```

2. **META_DIRECTIVES** (`src/prompts/shared.js:36`):
   ```js
   "根据上下文调整深度：闲聊用1-2句，复杂任务用结构化细节。"
   ```

3. **JSON schema constraint** (`src/prompts/chat.js:48`):
   ```js
   const actionSchema = '{"reply":"short user-facing answer","actions":[...]}';
   ```

4. **JSON object mode forcing** (`server.js:1056`):
   ```js
   applyJsonObjectResponseMode(chatPayload, runtimeConfigs.chat, thinkingMode !== "thinking");
   ```
   Which sets `payload.response_format = { type: "json_object" }` for DashScope Qwen configs.

5. **System prompt overwrite** (`server.js:1052`):
   ```js
   chatPayload.messages[0].content = buildChatActionSystemPrompt(lang, thinkingMode);
   ```
   The conversational system context from `buildChatSystemContext` is completely replaced by the action orchestrator prompt.

### 2.3 No Streaming in Default Mode (CC-05)

**public/app.js:3411-3413**:
```js
const data = effectiveThinkingMode === "thinking"
  ? await postStreamingChat("/api/chat", chatPayload, pendingAssistant)
  : await postJson("/api/chat", chatPayload);
```

**Backend supports streaming** (`server.js:1058-1068`):
```js
if (body?.stream === true) {
  return await handleChatStream({ payload: chatPayload, ... }, res);
}
```

The frontend simply does not set `stream: true` in the payload for no-thinking mode.

### 2.4 No Markdown Rendering (CC-06)

**public/app.js:5719-5723**:
```js
if (message.content) {
  const text = document.createElement("span");
  text.className = "chat-text";
  text.textContent = message.content;
  line.appendChild(text);
}
```

Content is injected as plain text via `textContent`. No markdown parsing, no HTML rendering, no sanitization.

### 2.5 Fallback Too Narrow (CC-07)

**server.js:2023-2040** `ensureChatFallbackActionsClean`:
```js
function ensureChatFallbackActionsClean(message, actions, reply = "") {
  const normalized = Array.isArray(actions) ? [...actions] : [];
  if (normalized.some((action) => action.type === "create_web_card")) return normalized;
  // ... only checks for web card keywords
}
```

Only fallback for `create_web_card`. No fallback for plan/todo/note/weather/map/link/code.

---

## 3. Implementation Guidance per Sub-Plan

### Plan 01: Whitelist Reconciliation

**Files:** `server.js`, `src/prompts/shared.js`

**Action:** Replace `CANVAS_TOOL_TYPES` in `server.js` with import from `src/prompts/shared.js`.

```js
// server.js — BEFORE
const CANVAS_TOOL_TYPES = [/* 32 items, missing rich nodes and zoom */];
const CANVAS_ACTION_TYPES_TEXT = CANVAS_TOOL_TYPES.join(", ");

// server.js — AFTER
import { CANVAS_ACTION_TYPES, CANVAS_ACTION_TYPES_TEXT } from "./src/prompts/shared.js";
const CANVAS_TOOL_TYPES = CANVAS_ACTION_TYPES; // or rename VOICE_ACTION_TYPES to use CANVAS_ACTION_TYPES directly
```

**Caution:** `CANVAS_TOOL_TYPES` is used to build `CANVAS_ACTION_TYPES_TEXT` (line 138) and `VOICE_ACTION_TYPES` (line 2358). The replacement is a pure superset — all existing values are preserved, only additions. Zero breaking changes for existing actions.

**Verification:** After change, typing "做个计划" in chat should result in backend returning an action with `type: "create_plan"` instead of filtering it to empty actions.

---

### Plan 02: Tool Calling Refactor

**Files:** `server.js`, `src/prompts/chat.js`, `src/prompts/shared.js`

#### 2A. Prompt Architecture Change

**Current architecture (broken):**
- System prompt = action orchestrator (`buildChatActionSystemPrompt`)
- User prompt = full context dump
- Response format = forced JSON object `{"reply", "actions"}`
- Reply is compressed because JSON schema says `"short user-facing answer"`

**Target architecture:**
- System prompt = conversational assistant (`buildChatSystemContext` or new variant)
- Tools = canvas actions defined via OpenAI `tools` parameter
- Response = free-form markdown in `message.content` + structured `tool_calls`
- No JSON object mode forcing

#### 2B. Tool Definition

OpenAI tool schema for canvas actions:
```json
{
  "type": "function",
  "function": {
    "name": "canvas_action",
    "description": "Execute a canvas action such as creating a card, zooming, or searching.",
    "parameters": {
      "type": "object",
      "properties": {
        "type": {
          "type": "string",
          "enum": ["create_note","create_plan",...],
          "description": "Action type"
        },
        "title": {"type": "string"},
        "description": {"type": "string"},
        "prompt": {"type": "string"},
        "nodeType": {"type": "string", "enum": ["note","plan","todo","weather","map","link","code"]},
        "content": {"type": "object"},
        "query": {"type": "string"},
        "url": {"type": "string"},
        "position": {"type": "string"},
        "nodeId": {"type": "string"},
        "nodeName": {"type": "string"}
      },
      "required": ["type"]
    }
  }
}
```

#### 2C. Backend Changes

**server.js:1045-1100** (handleChat) must be restructured:

1. Build payload with conversational system prompt (not action orchestrator)
2. Add `tools: [canvasActionTool]` to payload
3. Set `tool_choice: "auto"`
4. Remove `applyJsonObjectResponseMode` for chat endpoint
5. Parse response:
   - `message.content` → free-form markdown reply
   - `message.tool_calls` → canvas actions (map `function.arguments` to action objects)
6. If `tool_calls` missing or empty → treat as chat-only reply

**server.js:1187-1220** (handleChatStream) similarly updated to:
1. Parse SSE deltas for both `content` (streaming markdown) and `tool_calls` (arrive at end)
2. Emit `reply` delta events + final `actions` in `final` event

#### 2D. Prompt Changes

**src/prompts/chat.js:**
- Remove `buildChatActionSystemPrompt` entirely (or keep as deprecated)
- Update `buildChatSystemContext` to:
  - Remove "Usually 1-3 sentences" style constraint
  - Remove "1-2句" from Chinese version
  - Add: "Adapt reply length to user intent. Casual chat can be brief. Task-oriented requests should be thorough and detailed."
- Remove action catalog from prompts (now in tool definition)

**src/prompts/shared.js:**
- Update `META_DIRECTIVES` to remove hard length caps:
  - Change "Adapt depth to context: use 1-2 sentences for casual chat" → "Adapt depth to context: brief for casual chat, detailed for complex tasks."

#### 2E. Default max_tokens

**server.js:724** `applyRequestOptions` already reads `options.max_tokens` from config. The runtime config for chat role should default to ≥ 4096. Check `runtimeConfigs.chat` initialization and ensure default max_tokens is sufficient.

**Verification:**
- Chat-only message → `tool_calls` is empty or absent, `reply` is multi-paragraph markdown
- "做个去日本7天计划" → `tool_calls` contains `create_plan` with proper arguments
- No `response_format: {type: "json_object"}` in chat payload

---

### Plan 03: Streaming Default

**Files:** `public/app.js`, `server.js`

#### 3A. Frontend Change

**public/app.js:3396-3413:**
- Always include `stream: true` in `chatPayload`
- Always call `postStreamingChat` regardless of thinking mode
- Remove conditional `effectiveThinkingMode === "thinking" ? postStreamingChat : postJson`

```js
// BEFORE
const data = effectiveThinkingMode === "thinking"
  ? await postStreamingChat("/api/chat", chatPayload, pendingAssistant)
  : await postJson("/api/chat", chatPayload);

// AFTER
chatPayload.stream = true;
const data = await postStreamingChat("/api/chat", chatPayload, pendingAssistant);
```

**Also update** the voice/realtime chat call at `public/app.js:4637`:
```js
// Also streams
```

#### 3B. Backend Change

**server.js:1058-1068:** Already supports `body?.stream === true`. The handleChatStream function at `server.js:1187` streams via SSE. With tool calling, the stream must:
1. Emit `reply` deltas as they arrive (for progressive character rendering)
2. Collect `tool_calls` (they arrive at the end of the stream, not incrementally)
3. Emit final `actions` in the `final` SSE event

**Important:** Tool calls in OpenAI streaming arrive as `tool_calls` array on the final message chunk (or as `delta.tool_calls` on assistant chunks). The `streamChatCompletions` function at `server.js:3031` and `collectStreamingChatPayload` must be verified to capture `tool_calls` from the stream.

#### 3C. SSE Event Schema

Current SSE events from `handleChatStream`:
- `event: thinking` — reasoning delta
- `event: final` — complete response object

For default mode with tool calling:
- `event: reply` — text delta (same progressive rendering as thinking mode)
- `event: final` — `{ reply: "...", actions: [...] }`

**public/app.js** `postStreamingChat` must handle `reply` events in addition to `thinking` events.

**Verification:**
- Type message in no-thinking mode → characters appear progressively
- Network tab shows SSE stream with `event: reply` lines
- Final event contains complete reply + actions

---

### Plan 04: Markdown Rendering

**Files:** `public/index.html`, `public/app.js`

#### 4A. Dependency Loading

`package.json` has no frontend build step for `public/app.js`. The file is served directly as a static script.

**Option A: CDN via ESM (recommended)**
Change `public/index.html` script tag from:
```html
<script src="app.js"></script>
```
To module script with imports:
```html
<script type="module" src="app.js"></script>
```

In `public/app.js`, add at top:
```js
import { micromark } from "https://esm.sh/micromark@4";
import { gfm, gfmHtml } from "https://esm.sh/micromark-extension-gfm@4";
```

DOMPurify via CDN UMD (exposes global `DOMPurify`):
```html
<script src="https://cdn.jsdelivr.net/npm/dompurify@3.0.8/dist/purify.min.js"></script>
```

**Option B: npm + build step (overkill)**
Add Vite build for public/ — too much scope creep for this phase.

**Option C: Inline minimal markdown parser**
Not recommended — user explicitly chose micromark.

**Recommendation:** Use Option A (ESM from CDN). The app already requires internet for AI APIs, so CDN dependencies are acceptable. `esm.sh` is reliable and caches aggressively.

#### 4B. Rendering Flow

**For streaming messages:**
```js
// In postStreamingChat's onDelta handler
let rawMarkdown = "";

onReplyDelta(delta) {
  rawMarkdown += delta;
  const html = DOMPurify.sanitize(micromark(rawMarkdown));
  textElement.innerHTML = html;
}
```

**For completed messages:**
```js
// In renderChatMessage
if (message.content) {
  const text = document.createElement("span");
  text.className = "chat-text markdown-body";
  const html = DOMPurify.sanitize(micromark(message.content));
  text.innerHTML = html;
  line.appendChild(text);
}
```

#### 4C. Code Block Copy Button

After sanitization, find `<pre><code>` blocks and inject copy buttons:
```js
function addCopyButtons(container) {
  container.querySelectorAll("pre code").forEach((codeBlock) => {
    const pre = codeBlock.parentElement;
    const button = document.createElement("button");
    button.className = "chat-code-copy";
    button.textContent = "Copy";
    button.onclick = () => {
      navigator.clipboard.writeText(codeBlock.textContent);
      button.textContent = "Copied!";
      setTimeout(() => button.textContent = "Copy", 1500);
    };
    pre.appendChild(button);
  });
}
```

#### 4D. CSS for Markdown

Add minimal CSS for markdown elements in chat:
```css
.chat-text.markdown-body h1, .chat-text.markdown-body h2 { ... }
.chat-text.markdown-body pre { position: relative; background: #f5f5f5; padding: 12px; border-radius: 6px; }
.chat-text.markdown-body code { font-family: 'Space Mono', monospace; }
.chat-text.markdown-body pre .chat-code-copy { position: absolute; top: 4px; right: 4px; }
```

**Verification:**
- Assistant message with `## Heading` renders as `<h2>`
- Code block ```js ... ``` renders with copy button
- Links render as clickable `<a>` tags
- XSS attempt `<script>alert(1)</script>` is sanitized to plain text

---

### Plan 05: Fallback & Action Feedback

**Files:** `server.js`, `public/app.js`

#### 5A. Extended Fallback Inference

**server.js:2023-2040** `ensureChatFallbackActionsClean`:

Replace with keyword→action mapping:
```js
const FALLBACK_KEYWORDS = {
  create_plan: /计划|日程|行程|规划| itinerary | schedule | plan /i,
  create_todo: /任务|待办|清单| checklist | todo | task list /i,
  create_note: /笔记|记录|备忘| note | jot down /i,
  create_weather: /天气|气温| forecast | weather /i,
  create_map: /地图|位置|地址|导航| map | location /i,
  create_link: /链接|收藏|书签| link | bookmark /i,
  create_code: /代码|脚本|程序| snippet | code /i,
  create_web_card: /卡片|网页|资料|搜索| web | search /i
};
```

Logic: If LLM returns no actions (or malformed), scan `message` and `reply` for keywords. Create corresponding action with derived title/description from the message text.

#### 5B. Inline Action Feedback Cards

**public/app.js:5728-5733** currently shows a plain text summary:
```js
actions.textContent = t("chat.actionsApplied", { count: message.actions.length });
```

Replace with clickable feedback cards:
```js
message.actions.forEach((action) => {
  const card = document.createElement("div");
  card.className = "chat-action-feedback";
  const label = ACTION_LABELS[action.type] || action.type;
  card.innerHTML = `<span class="chat-action-icon">${ACTION_ICONS[action.type]}</span>
    <span class="chat-action-label">${label}</span>
    <span class="chat-action-title">${action.title || ""}</span>`;
  card.onclick = () => {
    if (action.nodeId) focusNodeById(action.nodeId);
  };
  line.appendChild(card);
});
```

When `createDirectionFromAction` creates a node, the returned `nodeId` should be added back to the action object so the feedback card can link to it.

**Verification:**
- Typing "帮我写个待办清单" with malformed LLM output → fallback creates `create_todo` action
- After action executes, chat shows "✓ 已创建 todo 卡片：待办清单" with click-to-focus

---

### Plan 06: E2E Verification

**Files:** `scripts/test-chat-canvas.js` (new)

#### 6A. Test Scenarios (≥ 12)

| # | Scenario | Expected Action |
|---|----------|-----------------|
| 1 | "做个去日本7天计划" | `create_plan` |
| 2 | "列个今天的任务" | `create_todo` |
| 3 | "记个笔记" | `create_note` |
| 4 | "查一下北京天气" | `create_weather` |
| 5 | "打开上海地图" | `create_map` |
| 6 | "保存这个链接 https://..." | `create_link` |
| 7 | "写个快速排序代码" | `create_code` |
| 8 | "放大画布" | `zoom_in` |
| 9 | "重置视图" | `reset_view` |
| 10 | "选中 analysis 卡片" | `select_analysis` |
| 11 | "随便聊聊" (no action) | empty actions, normal reply |
| 12 | Malformed JSON response + "做个计划" | fallback `create_plan` |

#### 6B. Test Architecture

Since there is no browser automation framework in the project, use Node.js integration tests that call the API directly:

```js
// scripts/test-chat-canvas.js
const tests = [
  { message: "做个去日本7天计划", expectAction: "create_plan" },
  ...
];

for (const test of tests) {
  const res = await fetch("http://localhost:3000/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: test.message, stream: false })
  });
  const data = await res.json();
  assert(data.actions.some(a => a.type === test.expectAction));
}
```

**Verification:**
- `npm test` or `node scripts/test-chat-canvas.js` exits 0 with all 12+ passes
- Each test asserts both action type and non-empty reply

---

## 4. Cross-Plan Dependencies

```
Plan 01 (Whitelist) ──┐
                      ├──→ Plan 02 (Tool Calling) ──→ Plan 03 (Streaming)
Plan 02 also covers ──┘     └──→ Plan 04 (Markdown)
                                  └──→ Plan 05 (Fallback)
                                            └──→ Plan 06 (E2E)
```

**Wave 1:** Plans 01, 02 (backend core changes)
**Wave 2:** Plans 03, 04 (frontend UX changes — can be parallel)
**Wave 3:** Plan 05 (integration layer)
**Wave 4:** Plan 06 (verification)

Plan 02 is the largest and most complex. It must be completed before Plans 03-05 because:
- Plan 03 depends on tool calling stream format being stable
- Plan 04 depends on markdown reply format from tool calling
- Plan 05 depends on action objects from tool calling

---

## 5. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| DashScope tool calling API differs from OpenAI spec | Medium | High | Test with actual API call; have JSON fallback ready |
| micromark ESM CDN unavailable | Low | Medium | Cache locally or use markdown-it as fallback |
| Streaming + tool calls produces fragmented tool_calls | Medium | Medium | Collect all deltas before parsing; validate JSON |
| Removing JSON object mode breaks other endpoints | Low | High | Only remove for `/api/chat`; analysis endpoints keep JSON mode |
| Frontend ESM module change breaks other imports | Low | Medium | Test all existing functionality after script type change |

---

## 6. Reference Code Locations

| File | Lines | What |
|------|-------|------|
| `server.js` | 96-137 | `CANVAS_TOOL_TYPES` (whitelist to replace) |
| `server.js` | 2358 | `VOICE_ACTION_TYPES` Set |
| `server.js` | 2371-2414 | `normalizeVoiceActions` filter function |
| `server.js` | 1045-1100 | `handleChat` endpoint (JSON object mode) |
| `server.js` | 1056 | `applyJsonObjectResponseMode` call |
| `server.js` | 1187-1220 | `handleChatStream` SSE endpoint |
| `server.js` | 2023-2040 | `ensureChatFallbackActionsClean` (narrow fallback) |
| `server.js` | 2978-3024 | `chatCompletions` fetch wrapper |
| `server.js` | 3031-3093 | `streamChatCompletions` SSE wrapper |
| `src/prompts/shared.js` | 45-55 | `CANVAS_ACTION_TYPES` (source of truth) |
| `src/prompts/shared.js` | 28-42 | `META_DIRECTIVES` (length constraints) |
| `src/prompts/chat.js` | 1-45 | `buildChatSystemContext` (style constraints) |
| `src/prompts/chat.js` | 47-245 | `buildChatActionSystemPrompt` (orchestrator prompt) |
| `public/app.js` | 3396-3413 | Chat request dispatch (conditional streaming) |
| `public/app.js` | 4001-4064 | `executeCanvasAction` (frontend supports all actions) |
| `public/app.js` | 4351-4400 | `createDirectionFromAction` + `nodeTypeMap` |
| `public/app.js` | 5719-5733 | Chat message rendering (`textContent`) |
| `public/index.html` | 1-10 | Script tag (needs module type for ESM imports) |
