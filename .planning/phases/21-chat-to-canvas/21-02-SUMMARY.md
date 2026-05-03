---
phase: 21-chat-to-canvas
plan: 02
status: complete
completed: "2026-05-03"
---

# Plan 02 Summary: Tool Calling Refactor

## What was built

Replaced the dual-prompt JSON-orchestrator architecture with OpenAI-style tool calling. The chat endpoint now sends a conversational system prompt plus a `tools` array describing the `canvas_action` function. The LLM returns free-form markdown in `message.content` and structured canvas actions in `message.tool_calls`. Hard "1-3 sentences" length caps were removed from chat prompts, and `max_tokens` defaulted to 4096.

## Key files

- **Modified**: `server.js`
  - Added `CANVAS_ACTION_TOOL_SCHEMA` and `CANVAS_TOOLS = [CANVAS_ACTION_TOOL_SCHEMA]`
  - Added `extractToolCallActions(response)` helper to parse `tool_calls[].function.arguments`
  - Removed `applyJsonObjectResponseMode` and JSON-parsing of replies in `handleChat`
  - Added `chatPayload.tools = CANVAS_TOOLS; chatPayload.tool_choice = "auto"` to chat + chat-stream payloads
  - System prompt switched from `buildChatActionSystemPrompt` to `buildChatSystemContext`
  - `runtimeConfigs.chat.options.max_tokens = 4096`
  - Streaming `collectStreamingChatPayload` accumulates `delta.tool_calls` chunks into the final response
  - Extended fallback inference (`FALLBACK_KEYWORDS`) to match plan/todo/note/weather/map/link/code/zoom keywords
- **Modified**: `src/prompts/chat.js`
  - `buildChatSystemContext` length directive replaced with adaptive guidance ("brief for casual chat, detailed for tasks")
  - Removed `buildChatActionSystemPrompt` (no other callers)
- **Modified**: `src/prompts/shared.js`
  - `META_DIRECTIVES` length guidance generalised to "Adapt depth to context"

## Commits

1. `0f85b18` — feat(21): Waves 1-2 — tool calling, streaming, markdown rendering

## Acceptance criteria

- [x] `chatPayload.tools = CANVAS_TOOLS` and `tool_choice: "auto"` set in handleChat + handleChatStream
- [x] `extractToolCallActions` defined and used in both handlers
- [x] `applyJsonObjectResponseMode` removed from chat path
- [x] `parseJsonFromText` removed from chat reply parsing
- [x] `buildChatActionSystemPrompt` no longer referenced anywhere in the repo
- [x] `1-3 sentences` / `1-3 句` removed from `src/prompts/chat.js`
- [x] `1-2 sentences` / `1-2句` removed from `src/prompts/shared.js`
- [x] `runtimeConfigs.chat.options.max_tokens` ≥ 4096
- [x] Streaming `tool_calls` accumulator merges argument chunks correctly
- [x] Fallback inference covers plan/todo/note/weather/map/link/code + zoom_in/zoom_out/reset_view

## Self-Check

- No backwards-compatibility shims — old JSON-only path is removed entirely
- Single tool schema (`canvas_action`) keeps the surface small while supporting every action type via the `type` enum
- `tool_choice: "auto"` keeps casual chat free of spurious tool calls
- `extractToolCallActions` returns `[]` on missing/malformed tool_calls; fallback keyword inference fills the gap when needed
