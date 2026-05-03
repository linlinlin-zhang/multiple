---
phase: 21-chat-to-canvas
plan: 01
status: complete
completed: "2026-05-03"
---

# Plan 01 Summary: Whitelist Reconciliation

## What was built

Replaced the hardcoded `CANVAS_TOOL_TYPES` array in `server.js` with an import of `CANVAS_ACTION_TYPES` from `src/prompts/shared.js`, giving the backend and the prompt module a single source of truth. The new whitelist now exposes all 7 rich node types (`create_note`, `create_plan`, `create_todo`, `create_weather`, `create_map`, `create_link`, `create_code`) and the 4 zoom actions (`zoom_in`, `zoom_out`, `set_zoom`, `reset_view`), unblocking actions that the LLM was already instructed to emit.

## Key files

- **Modified**: `server.js` — removed hardcoded `CANVAS_TOOL_TYPES` array; added import for `CANVAS_ACTION_TYPES, CANVAS_ACTION_TYPES_TEXT` from `./src/prompts/index.js`; `VOICE_ACTION_TYPES` Set now built from `CANVAS_ACTION_TYPES`
- **Modified**: `src/prompts/shared.js` — verified the array contains all required types (length ≥ 35); added the missing rich-node + zoom entries
- **Modified**: `src/prompts/index.js` — re-export `CANVAS_ACTION_TYPES` and `CANVAS_ACTION_TYPES_TEXT` for backend consumption

## Commits

1. `0f85b18` — feat(21): Waves 1-2 — tool calling, streaming, markdown rendering (whitelist reconciliation included)

## Acceptance criteria

- [x] `server.js` imports `CANVAS_ACTION_TYPES` from `./src/prompts/index.js`
- [x] `server.js` contains no hardcoded `CANVAS_TOOL_TYPES` array
- [x] `VOICE_ACTION_TYPES = new Set(CANVAS_ACTION_TYPES)`
- [x] `CANVAS_ACTION_TYPES` includes `create_note`, `create_plan`, `create_todo`, `create_weather`, `create_map`, `create_link`, `create_code`
- [x] `CANVAS_ACTION_TYPES` includes `zoom_in`, `zoom_out`, `set_zoom`, `reset_view`
- [x] `normalizeVoiceActions` source unchanged — only Set contents changed
- [x] Server starts without syntax errors

## Self-Check

- Single source of truth restored: any future addition to `CANVAS_ACTION_TYPES` automatically propagates to the backend whitelist
- No frontend changes needed — `executeCanvasAction` already supported all newly-whitelisted types
- Zero regression risk: all previous types remain in the whitelist
