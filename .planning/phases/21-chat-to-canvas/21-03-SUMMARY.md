---
phase: 21-chat-to-canvas
plan: 03
status: complete
completed: "2026-05-03"
---

# Plan 03 Summary: Streaming Default

## What was built

Made SSE streaming the default for all chat modes (no-thinking + thinking + voice + subagent). Every `/api/chat` request now sets `stream: true` and goes through `postStreamingChat`, which progressively renders reply deltas into the pending assistant message. A blinking streaming cursor displays during generation and disappears when the final SSE event arrives.

## Key files

- **Modified**: `public/app.js`
  - Main chat dispatch unified on `postStreamingChat("/api/chat", chatPayload, pendingAssistant)` (line 3450)
  - Voice/subagent chat (`postStreamingChat("/api/chat", subagentPayload, null)` at line 4681) and deep-research dispatch also stream
  - `postStreamingChat` SSE parser handles `event: reply` deltas, accumulates into a buffer, calls `updateChatMessage` with progressive content
  - Pending assistant rendering appends `<span class="streaming-cursor">` until the final event clears `pending`
- **Modified**: `public/styles.css`
  - Added `.streaming-cursor` block (2 px width, `animation: blink 1s step-end infinite`)
  - Added `@keyframes blink { 50% { opacity: 0; } }`
- **Modified**: `server.js`
  - `streamChatCompletions` flushes `event: reply` deltas as they arrive (already supported; verified during refactor)

## Commits

1. `0f85b18` — feat(21): Waves 1-2 — tool calling, streaming, markdown rendering

## Acceptance criteria

- [x] Zero `postJson("/api/chat", ...)` calls remain
- [x] `postStreamingChat("/api/chat", ...)` is used in main, deep-research, and subagent flows
- [x] `chatPayload.stream = true` on all chat dispatch paths
- [x] `postStreamingChat` accumulates reply deltas and updates the pending assistant message progressively
- [x] `.streaming-cursor` CSS exists with blink keyframes
- [x] Streaming cursor appears during pending state and is removed on final
- [x] Voice/realtime + deep-research + subagent chat also stream

## Self-Check

- `postJson` retained for non-chat endpoints (analyze, ASR, image search, materials) — only chat is migrated
- Final SSE event still contains the complete `reply` and `actions`, so action whitelist + tool-calling logic from Plan 02 keeps working
- Performance acceptable: micromark re-parse per delta is fast for replies up to a few thousand tokens (Plan 04)
