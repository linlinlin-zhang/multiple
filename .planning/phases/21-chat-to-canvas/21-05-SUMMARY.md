---
phase: 21-chat-to-canvas
plan: 05
status: complete
completed: "2026-05-04"
---

# Plan 05 Summary: Action Feedback Cards + Parity-with-Qwen Sub-Track

## What was built

Two pushes landed under Plan 05.

**(A) Plan 05 proper — Action Feedback Cards (CC-08).** When chat actions execute, each successful action's `nodeId` now flows back to the assistant message and renders as an inline feedback card in the chat sidebar. Each card shows an icon (📋 / ✅ / 🌤 / 🗺 / 🔗 / 💻 / 🌐 / 🎨 / 🔍± / 🎯), a localized label ("已创建 plan 卡片"), and the canvas card title. Clicking (or pressing Enter on) the card focuses the corresponding canvas node, closing the chat→canvas loop. Works for all 7 rich node types, web cards, directions, and zoom/reset operations.

**(B) Parity-with-Qwen sub-track.** Mid-session pivot: the user named three concrete gaps vs. the official Qwen 3.6 application — (1) web search depth (Qwen ran 4 rounds and listed 64 sources for "三天深圳行程"), (2) GFM rendering (Qwen replies showed proper 行程概览 / 美食 / 住宿 / 预算 tables), (3) deliverable richness (Qwen's plan card listed every day's steps with addresses + prices). Closed all three plus a Qwen 3.6 window-size correction (991K input / 64K output) that had been silently capped to ~5-7K per turn.

## Key files

- **Modified**: `public/app.js`
  - `executeCanvasAction` now returns each handler's result (nodeId or `{type, success}` for non-creating actions); `applyVoiceActions` collects results into `[{ ...action, result }]` and passes them through `assistantMeta.actionResults`
  - `renderChatMessage` renders `.chat-action-feedback` cards from `actionResults`; each card has `role="button"`, `tabindex="0"`, click + Enter/Space handlers calling `focusNodeById(nodeId)`
  - `ACTION_FEEDBACK_ICONS` map covers all rich node types + zoom + reset
  - `escapeHtml` helper added (DOM-based, safe against `<>"&`)
  - i18n: `chat.actionFeedback.*` keys for both `zh` and `en` covering all action types
  - **New `renderRichNodeContent(element, option)`** — switches on `option.nodeType` and writes structured payloads (plan.steps[{title,description}], todo.items[{text,done}], weather.{location,temp,forecast}, map.{address,lat,lng}, link.{title,url,description}, code.{language,code}, note.{text}) into the new `.option-rich-content` slot. Called from all five option-instantiation paths (createOptionNode, two renderOptions variants, deep-think restore, session restore)
  - Removed duplicate `escapeHtml` declaration at line 2513 that was killing ES module parsing
  - GFM extension: `renderMarkdownToHtml` now passes `micromark-extension-gfm` so tables / task lists / strikethrough render in chat replies; DOMPurify whitelist extended for `del` and `input[type=checkbox][disabled][checked]`
- **Modified**: `public/app.html`
  - `optionTemplate` gained the `.option-rich-content` slot so structured payloads have a place to render (previously template had only tone/title/description + generate button — every rich node landed nearly empty)
- **Modified**: `public/styles.css`
  - `.chat-action-feedback` rules (flex layout, hover/focus states, ellipsis title)
  - `.option-rich-content` + `.option-plan-step` / `.option-todo-item` / `.option-weather-line` / `.option-map-address` / `.option-link-block` / `.option-code-block` rules for the rich-card content slot
  - GFM: `del`, `task-list-item`, overflow-scrollable `.markdown-body table` rules
- **Modified**: `server.js`
  - `synthesizeReplyFromActions` helper — when LLM returns only `tool_calls` with empty content, generate a friendly confirmation reply from the actions ("已为你创建 plan 卡片「XXX」") instead of the generic "我读到了" placeholder. Wired into both sync and streaming paths via `buildChatResultFromResponse`
  - `canvas_action` tool schema: `content` parameter description now spells out the exact shape per rich nodeType; tool description widened to mention multi-invocation per turn
  - chat default `max_tokens` 4096 → 32768 → **65536**; user-message / systemContext / history-depth / per-msg caps loosened to fit Qwen 3.6 Plus 991K input / 64K output (see commit 5d336e5 for the matrix)
  - Web-search heuristic widened to cover travel/lifestyle queries (三天深圳行程, 推荐附近的餐厅, etc.) by default
  - **search_strategy: turbo → agent_max** — match official Qwen multi-round agentic search; `forced_search: true` and `enable_citation: true` (citation_format `[ref_<n>]`); default-on with negation block-list (chitchat / canvas-ops / pure code / pure creative) instead of allow-list
  - Front-end text-paste cap widened to 32K to match server-side window
- **Modified**: `src/prompts/chat.js`
  - Full rewrite to minimal/natural prompt style — removed "Role / Mission / Scope / Style" headers and the "1-3 sentences for chat, longer for tasks" rule. Kept only identity, the canvas_action tool list mapped to specific rich node types, and the invariant "every tool_call must include non-empty message content"
  - Added "Filling the card" + "Multiple actions per turn" sections (en + zh): the rich node IS the deliverable, populate content; don't promise create_weather without firing the call
  - Added Tool Usage section: pick specific rich-node types (create_plan, create_todo, ...) instead of generic create_card; require substantive natural-language reply alongside any tool_call
- **Modified**: `src/prompts/shared.js` — dropped META_DIRECTIVE about adapting depth to context (let the model gauge length itself)
- **Modified**: `src/prompts/analysis.js` — cosmetic trailing-comma fix in two buildAnalysisPrompt JSON-shape strings (no behavioral change)
- **Modified**: `src/prompts/deepthink.js` / `src/prompts/voice.js` — caps matrix updated to match the loosened Qwen 3.6 Plus window

## Commits

1. `807e529` — wip: phase 21 paused — Plan 05 implemented, Plan 06 pending (Plan 05 proper: action feedback cards + Wave 1-2 SUMMARY backfills)
2. `064f7a9` — fix(21): chat tool-call regressions — empty reply + generic action types
3. `e066d87` — refactor(21): adopt minimal/natural prompt style + raise max_tokens to 32768
4. `37759db` — fix(21): document content shapes in canvas_action schema + encourage multi-call
5. `b23d12f` — fix(21): widen web-search heuristic to cover travel/lifestyle queries
6. `0323a67` — feat(21): render GFM tables, task lists, strikethrough in chat replies
7. `be10a88` — feat(21): render plan/todo/weather/map/link/code content inside option cards
8. `5d336e5` — fix(21): loosen input/output caps to fit Qwen 3.6 Plus 991K/64K window
9. `4f60c16` — fix(21): widen text-file paste cap to 32K to match server-side window
10. `807c2db` — fix(21): adopt agent_max search strategy + default-on with block-list

## Acceptance criteria

Plan 05 proper:
- [x] `executeCanvasAction` returns a value for all branches; `createDirectionFromAction` returns `nodeId` propagated through the chain
- [x] `applyVoiceActions` collects `[{ ...action, result }]` and exposes them as `assistantMeta.actionResults`
- [x] `.chat-action-feedback` cards render with icon + label + title; click + Enter/Space focus the corresponding node via `focusNodeById`
- [x] All 7 rich node types + zoom + reset have icons and i18n labels (zh + en)
- [x] `escapeHtml` helper exists, used for titles
- [x] `.chat-action-feedback` CSS includes hover, focus outline, ellipsis truncation
- [x] Action results persist when chat history is re-rendered (lives in `assistantMeta`)

Parity sub-track (acceptance criteria added retroactively to match the pivot):
- [x] Web-search default-on heuristic covers travel/lifestyle queries — block-list, not allow-list
- [x] `search_strategy: agent_max` + `forced_search: true` + `enable_citation: true` wired through `applyWebSearchMode`
- [x] GFM tables / task lists / strikethrough render in assistant chat replies; DOMPurify whitelist extended without admitting `<script>`, `<iframe>`, or event handlers
- [x] `optionTemplate` has `.option-rich-content` slot; `renderRichNodeContent` writes structured payloads for all 7 rich node types
- [x] `canvas_action` tool schema documents `content` shape per nodeType + multi-call per turn
- [x] Chat / deep-think / voice caps matrix sized to Qwen 3.6 Plus 991K input / 64K output (each numeric change in commit 5d336e5 cites the model spec — anti-pattern A)
- [x] Front-end text-paste cap matches server-side window (32K)

## Self-Check

- **Anti-pattern A (caps without citing model spec):** every cap change in commits 5d336e5 + 4f60c16 cites the Qwen 3.6 Plus 991K/64K specification.
- **Anti-pattern B (allow-list heuristic):** web-search heuristic flipped to default-on + negation block-list (commit 807c2db) so any topic the user didn't think of still grounds in fresh sources.
- **Anti-pattern C (undocumented tool param shape):** `canvas_action.content` parameter description in `server.js` now spells out the exact shape per rich nodeType — the model can no longer fire `create_plan` with only a title because the schema told it to fill `steps[]` with `{title, description}`.
- **Browser verification still pending:** `npm run dev` smoke test of "三天深圳行程" — confirm agent_max fires, GFM table renders, plan card shows full step list with addresses. Tracked in Plan 06 E2E script and the production smoke test note in `.continue-here.md` (B2: agent_max may not be supported on every qwen3.6-plus snapshot — fall back to `agent` or `max` if API rejects).
- **Markdown rendering preserves XSS posture:** GFM additions only widened `del` and `input[type=checkbox][disabled][checked]`; DOMPurify still strips `<script>`, `<iframe>`, `<style>`, event handlers, and `javascript:` URIs (Plan 04 invariant intact).
- **Reply synthesizer is a non-regression:** `synthesizeReplyFromActions` runs only when LLM content is empty AND `tool_calls.length > 0`, so non-action replies are unaffected.
