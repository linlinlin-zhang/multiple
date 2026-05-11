# MiMo 主控与复杂场景 Harness Eval 计划

**Date:** 2026-05-11
**Scope:** ThoughtGrid / 织境 chat、视觉理解、canvas action、文件/素材混合输入
**Status:** Approved plan; implementation in progress

## 1. Decision

主控模型切换为 MiMo V2.5 Pro，用于：

- Chat controller：普通对话、画布动作选择、工具调用、流式回复。
- Vision understanding：图片分析、图片比较、源卡片探索、图文混合输入理解。
- Harness eval target：真实模型 smoke/stress eval 默认优先跑 MiMo，再与 Qwen/Kimi/DeepSeek 候选模型做对照。

保留非主控专用模型链路：

- 图片生成仍使用 image role。
- 视频生成仍使用 video role。
- 深度研究仍使用 deepthink role，除非后续明确迁移。
- 图片搜索链路暂时按独立能力处理，不与主控模型强绑定。

## 2. External Notes Checked

- XiaomiMiMo/MiMo-V2.5-Pro model card describes MiMo V2.5 Pro as an agentic, long-context model with up to 1M token context and tool-use-oriented deployment guidance.
- OpenRouter's MiMo V2.5 Pro page lists an OpenAI-compatible API surface and `xiaomi/mimo-v2.5-pro` style routing.
- Public Xiaomi MiMo integration notes point to OpenAI-compatible `/v1` APIs and mention tool calling / structured output support. Because provider behavior can vary, ThoughtGrid should keep compatibility switches explicit and covered by evals.

## 3. Implementation Work Before Large Testing

### 3.1 Must-fix local harness failures

- Fix `npm run test:guards` trajectory failure caused by the new workspace-only policy rejecting mixed card actions before loop stop handling.
- Keep the behavioral invariant: destructive workspace requests execute only the destructive target action unless the user explicitly asks for a supported follow-up workflow.
- Update tests to assert the new rejection reason and still assert the stop condition is recorded.

**Implementation status:** Done — `scripts/test-canvas-action-trajectory-eval.js` now asserts the current workspace-only rejection reason while preserving the destructive stop-condition invariant.

### 3.2 MiMo controller adaptation

- Default `CHAT` and `ANALYSIS` roles should use:
  - provider: `openai-compatible`
  - base URL: `https://api.xiaomimimo.com/v1`
  - model: `mimo-v2.5-pro`
  - API key env order: `MIMO_API_KEY`, role-specific key, candidate key, existing shared fallbacks.
- Add MiMo detection from provider/model/base URL.
- Use chat-completions transport for MiMo; keep DashScope Responses transport only for DashScope Qwen.
- Support MiMo thinking mode through `thinking: { type: "enabled" | "disabled" }`.
- Allow JSON object response mode for MiMo analysis when enabled.
- Send standard Bearer auth and MiMo-compatible `api-key` header for xiaomimimo endpoints.
- Keep hidden reasoning stripped from user-visible replies.

**Implementation status:** Done — `server.js` and `src/api/settings.js` default chat/analysis to MiMo, add MiMo detection, thinking mode, JSON object response mode, MiMo-compatible headers, and keep DashScope Responses only for Qwen-specific transports.

### 3.3 Eval command ergonomics

- Add package scripts for:
  - chat system eval
  - chat system stress eval
  - controller model eval
- Keep real model evals skipped by default unless explicit env flags are set.

**Implementation status:** Done — package scripts now expose chat-system, stress, MiMo live, and controller-model evals while preserving explicit opt-in env flags.

## 4. Eval Architecture

We will not make a single monolithic 140-case live-model test. The suite will be layered so failures are attributable.

### Layer A: 100 deterministic complex scenarios

Purpose: fast regression coverage without network/model variability.

Runner direction:

- Existing: `scripts/test-canvas-action-regression.js`
- New or extended fixture file: `scripts/evals/canvas-action-complex-regression.jsonl`
- Blocking: yes, once stable.

Checks:

- intent/task type
- allowed / forbidden action types
- action counts by type
- content paths, such as `content.items[3].summary`
- forbidden visible text patterns, especially leaked planning/thinking phrases
- required trace stages
- rejection reasons
- repair reasons
- action budget and open-world budget

### Layer B: 100 local system scenarios

Purpose: run against `/api/chat` and exercise request construction, streaming, attachments, context budget, trace, and action extraction.

Runner direction:

- Existing: `scripts/run-chat-system-eval.js`
- New or extended fixture file: `scripts/evals/chat-system-complex-100.jsonl`
- Blocking: no by default; can be run before release.

Inputs should cover:

- selected cards
- canvas nodes/links
- recent messages
- system context
- multiple chat attachments
- image data URLs where practical
- stream and non-stream modes

### Layer C: 40 real MiMo model scenarios

Purpose: measure actual MiMo controller behavior across every product category.

Runner direction:

- Existing: `scripts/run-chat-system-eval.js`
- New fixture file: `scripts/evals/chat-system-mimo-live-40.jsonl`
- Run with `RUN_CHAT_SYSTEM_EVALS=1`.
- Recommended repeated trials: 3.

**Implementation status:** Done — initial corpus added at `scripts/evals/chat-system-mimo-live-40.jsonl`; runner now supports `CHAT_SYSTEM_EVAL_TRIALS` and reports pass@1 plus action-type consistency.

Coverage target:

| Category | Cases | Examples |
|---|---:|---|
| Negative/no-canvas | 4 | text-only, no image generation, no search, no card |
| Visual critique/comparison | 5 | single image critique, 4-image comparison, moodboard synthesis |
| Multi-file mixed input | 6 | image + PDF/text + URL + previous chat |
| Planning/rich execution | 4 | rich plan, timeline, todo, risk table |
| Data/code artifacts | 4 | CSV table, SQL/code card, debug checklist, metrics |
| Web/source/references | 4 | existing refs only, URL card, latest official sources, selected source research |
| Media search/generation routing | 4 | image search, reverse search, image generation, video generation |
| Workspace actions | 4 | arrange, focus/zoom, move, delete only |
| Multi-turn/history | 3 | follow-up from previous messages, selected card refinement, branch context |
| Agent/subagent | 2 | create bounded agent, reject agent drift |

Metrics:

- pass@1
- pass rate over repeated trials
- action-type consistency
- forbidden action rate
- duplicate tool-call rate
- tool calls per successful task
- average latency
- rejection/repair reason distribution
- manual review notes for ambiguous failures

## 5. Scenario Design Priorities

High-priority cases from recent product failures:

- Four-photo comparison must produce four usable comparison items, not three.
- Card front title/summary must be readable and content-specific, not mechanical lists like `照片1 照片2 照片3`.
- Markdown normalization must prevent visible broken headings/bold markers in card previews and chat.
- Hidden planning/thinking-like prose must not leak into visible replies.
- Direction-card requests must create direction cards, not immediate images.
- Single-photo critique should not become a comparison card.
- Text-only requests must not create canvas artifacts.
- Delete/workspace requests must not create explanatory cards unless explicitly supported by policy.

## 6. Execution Sequence

1. Repair current guard failure and small config hygiene issues.
2. Switch default chat/analysis configuration to MiMo-compatible OpenAI chat-completions.
3. Add eval npm scripts.
4. Extend deterministic grader capabilities for content path and forbidden text checks.
5. Add first 30 complex deterministic cases.
6. Expand deterministic set to 100 cases.
7. Add 40 MiMo live model cases covering all categories.
8. Run local guards and deterministic tests.
9. Run MiMo live eval manually with env flag and save artifact summary.
10. Promote stable scenario subsets into blocking pre-release tests.

Current progress:

- Steps 1-3 are complete.
- Step 7 initial 40-case corpus is complete.
- Step 8 local validation is complete for syntax checks, skipped-by-default eval scripts, `npm run test:guards`, and `npm test`.
- Steps 4-6 and 9-10 remain open.

## 7. Open Risks

- MiMo API provider behavior may differ by endpoint/token plan, especially for thinking, vision payloads, tool calls, and structured output.
- Live model tests are nondeterministic; failures need trace review, not blind prompt changes.
- Real image/PDF fixtures can become heavy; test data should use small synthetic data URLs and short extracted text wherever possible.
- Image search is currently a separate capability and may need a dedicated provider path if MiMo main chat no longer uses DashScope Responses.
- Long context is useful but expensive; live evals should report token/byte budget and avoid accidental oversized nightly runs.

## 8. Done Criteria

- `npm run test:guards` passes.
- `npm test` passes.
- MiMo default configuration is documented and code-supported.
- Eval commands are discoverable from `package.json`.
- Deterministic complex scenarios can run without model/network calls.
- 40 live MiMo scenarios can run with one env flag and emit a structured artifact.
- Failures include enough trace, policy, repair, and context budget data to debug without rerunning manually.
