---
phase: 21-chat-to-canvas
plan: 06
status: deferred
deferred_to: phase-26-responses-api-migration
completed: "2026-05-04"
---

# Plan 06 Summary: E2E Verification — Deferred to Phase 26

## Outcome

Plan 06 (12+ chat→canvas E2E scenarios) was **deferred**. Phase 21 ships
without the dedicated `scripts/test-chat-canvas.js` test harness. The
phase 21 verification task (gsd-verifier subagent) was also skipped at
the user's direction.

## Why deferred

The Plan 06 harness was designed against the current Chat Completions
chat backend. Phase 26 (Responses API Migration) — the keystone of the
v3.2 Qwen Web Parity milestone — replaces that backend wholesale:

- New endpoint: `/api/v2/apps/protocols/compatible-mode/v1/responses`
- New output shape: structured `output[]` array with text /
  tool_call / web_search_result / code_interpreter_result blocks
  (vs. today's `choices[0].message.content` + `tool_calls[]`)
- Multi-turn switches from resending `messages[]` to passing
  `previous_response_id`
- Builtin `web_search` + `code_interpreter` + `web_extractor` tools
  coexist with `CANVAS_TOOLS` function tools (this is the whole point
  of the migration — removes the agent-mode-vs-tools tradeoff that
  forced the path-B fix this session)

A test harness written against the Chat Completions shape would need
to be rewritten end-to-end in phase 26. Investing in it now is
single-use throwaway work. Better to write the E2E suite once, against
the Responses API, as part of phase 26's deliverables.

## What ships from Phase 21 without Plan 06

The full chat-to-canvas reliability stack from Plans 01-05 is in
production:

1. Whitelist reconciliation — server.js imports `CANVAS_ACTION_TYPES`
   from `src/prompts/shared.js` (single source of truth)
2. OpenAI tool calling — chat replies are free-form markdown, canvas
   actions arrive as `tool_calls`
3. Streaming default — SSE for no-thinking mode
4. Markdown rendering — micromark + GFM extension + DOMPurify in
   chat replies, including tables / task-lists / strikethrough
5. Action feedback cards — every successful canvas action renders as
   an inline clickable card in the chat sidebar that focuses the
   created node
6. Path-B chat 400 fix — `search_strategy: agent_max → max` so
   custom `tools` and web search coexist (commit 41e3dc9)

Manual smoke testing during Plan 05 development (chat sidebar,
multi-turn conversations, all 7 rich node types, zoom/reset, mixed
chat+action turns) covered the core scenarios that the formal harness
would have exercised.

## Risk accepted

| Risk | Mitigation |
|------|------------|
| Untested chat→canvas regressions sneak in before Phase 26 lands | Manual smoke testing via the live UI; Phase 26 will introduce the formal E2E harness on the new backend |
| `max` search strategy could be rejected by future qwen3.6-plus snapshots | Production smoke test at next user session; fallback path (drop `search_strategy` entirely) is one line |
| No automated coverage for the 12+ canonical scenarios | Phase 26 plan 26-07 (or equivalent) will recreate the harness against Responses API — tracked in the v3.2 milestone backlog |

## Critical Anti-Patterns (preserved from .continue-here.md)

- **Adopting an undocumented private API tier from a network capture.**
  `agent_max` was Qwen-web internal — not in DashScope public docs.
  → Cite official docs when configuring SDK params; if the value is
  undocumented, treat as research/spike rather than production code.
- **Combining LLM features without checking compatibility matrix.**
  `tools: [...]` + `enable_search: true` (with agent_*) are mutually
  exclusive in DashScope Chat Completions; only the Responses API
  allows them to coexist. → Check the API's compatibility matrix
  before wiring multiple advanced features together.

## Commits

1. `41e3dc9` — fix(21): fall back search_strategy to max to unblock CANVAS_TOOLS coexistence (path-B)
2. `<this commit>` — ship(21): close Phase 21 — defer Plan 06 E2E to Phase 26 Responses API rewrite

## Verification Criteria (deferred)

- [ ] `scripts/test-chat-canvas.js` exists and runs via `npm run test:chat` — **DEFERRED to Phase 26**
- [ ] ≥ 12 scenarios defined and executed — **DEFERRED to Phase 26**
- [ ] All 7 rich node types have passing tests — **DEFERRED to Phase 26**
- [ ] Zoom actions have passing tests — **DEFERRED to Phase 26**
- [ ] Chat-only scenario has passing test — **DEFERRED to Phase 26**
- [ ] Fallback scenario has passing test — **DEFERRED to Phase 26**

## Phase 21 Closure

With Plans 01-05 shipped and Plan 06 explicitly deferred, **Phase 21
is closed**. v3.1 progresses to 6/7 phases (Phase 22 Dynamic Directions
remains; Phases 23-25 also remain, but the user pivoted to v3.2 Qwen
Web Parity for the next milestone — phases 22-25 may be revisited or
absorbed into v3.2 phases as the work unfolds).

Next milestone: v3.2 Qwen Web Parity (phases 26-32).
First action: `/gsd-new-milestone v3.2 "Qwen Web Parity"` then
`/gsd-phase` already covered → `/gsd-plan-phase 26`.
