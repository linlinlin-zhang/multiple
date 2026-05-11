# Harness Engineering Improvement Plan for ThoughtGrid

**Date:** 2026-05-11
**Scope:** ThoughtGrid / 织境 AI canvas workbench
**Status:** Research-backed improvement backlog; implementation in progress

## 0. Implementation Progress

Updated: 2026-05-11

Completed:

- **HE-P0-01 canonical trace object:** Added `buildCanvasActionTrace()` and `trace` output from `finalizeCanvasActions()` in `src/lib/canvasActionPipeline.js`. The trace records intent, model action types, inline action types, thinking-mentioned action types, pipeline stages, final action types, frontend result slots, and redacted snippets.
- **HE-P0-02 pipeline stage semantics:** Standardized the recovery stage name to `fallback_recovery` and covered the full ordered stage contract in `scripts/test-canvas-action-pipeline.js`.
- **HE-P0-03 deterministic canvas action eval fixtures:** Added deterministic JSONL regression fixtures and runner at `scripts/evals/canvas-action-regression.jsonl` and `scripts/test-canvas-action-regression.js`.
- **HE-P0-04 frontend action result contract:** Normalized frontend execution results to `type/success/nodeId/nodeIds/title/error/errorCode` and documented the contract in `.planning/contracts/FRONTEND_ACTION_RESULTS.md`.
- **HE-P0-05 negative over-triggering tests:** Added no-canvas/trivial negative fixtures to the deterministic regression suite.
- **HE-P1-03 transcript review artifacts:** The regression runner now writes structured failure artifacts to `scripts/evals/artifacts/canvas-action-regression-failures.json` when failures occur.
- **HE-P1-01 JSONL eval corpus:** Expanded the deterministic corpus to 34 balanced fixtures across planning, visual evaluation, web/reference, media, workspace, data/code, loop, trace, and negative cases.
- **HE-P1-02 regression vs capability separation:** Added `scripts/evals/README.md`, kept deterministic regression evals blocking, and added a separate non-blocking capability smoke eval path.
- **HE-P1-04 model-in-the-loop smoke evals:** Added `scripts/evals/canvas-action-capability-smoke.jsonl` and `scripts/run-canvas-action-capability-smoke.js`; it is skipped by default unless `RUN_MODEL_SMOKE_EVALS=1` and reports pass@1/pass-rate/consistency across configurable trials.
- **HE-P1-05 schema/executor audit:** Added `.planning/contracts/CANVAS_ACTION_CONTRACT.md` and `scripts/test-canvas-action-contract.js` to mechanically check registry/schema/frontend executor alignment.
- **HE-P1-06 action description improvements:** Added per-action selection guidance to the dynamic canvas action schema and guarded key guidance with `scripts/test-canvas-action-contract.js`.
- **HE-P1-07 validation and repair reporting:** Pipeline traces now preserve structured `repairs` from action enrichment, including derived prompts/queries, converted plan/todo aliases, fallback content fills, and reference-action conversions.
- **HE-P1-08 context budget tiers:** Chat responses now include deterministic context budget tiers for user message, selected card, canvas summary, recent turns, retrieved memory, attachments, tool contract, app context, and raw media.
- **HE-P1-09 prompt/schema/context version hashes:** Canonical action traces now include harness metadata hashes for system prompt, canvas tool schema, policy, fallback rules, and context budget.
- **HE-P1-10 rich plan mode:** `create_plan` now supports backward-compatible rich execution-plan fields, frontend plan cards render those sections, and regression fixtures distinguish simple concise plans from complex rich plans.
- **HE-P1-11 mechanical action consistency checks:** Added the contract test to `npm run test:guards` so registry, model-visible action types, frontend executors, rich card types, and result fields stay aligned.
- **HE-P2-01 developer action trace viewer:** The debug action trace toggle now renders policy, canonical trace, repair events, harness hashes, context budget tiers, and copyable JSON under assistant messages.
- **HE-P2-03 MiMo controller adaptation:** Switched chat, analysis, and settings defaults to MiMo-compatible OpenAI chat-completions, added MiMo detection/thinking/JSON-mode/header handling, and decoupled image search into an independent DashScope Responses role.
- **HE-P2-04 expanded live eval ergonomics:** Added chat-system/controller-model package scripts, repeated-trial chat eval reporting, and a 40-case MiMo live scenario file covering negative, visual, multi-file, planning, data/code, web/source, media, workspace, history, and agent behaviors.
- **HE-P2-05 complex deterministic regression layer:** Extended the deterministic canvas action runner with deep action-field checks, array-length assertions, required/forbidden text patterns, and trace-stage checks; expanded `scripts/evals/canvas-action-complex-regression.jsonl` to 106 fixtures and wired it into `npm run test:guards`.
- **HE-P2-06 intent reliability hardening:** Tightened direction fallback so existing-direction image generation remains `generate_image`, erroneous comparison cards are not kept beside recovered direction cards, negated delete/search/direction requests do not authorize those actions, and product/code phrases like `产品定位` / `移动平均` no longer trigger workspace routing.

Partial:

- **HE-P2-02 trace summaries:** Compact local NDJSON trace summary logging and `/api/debug/action-traces` lookup are implemented; database persistence and replay tooling are still pending.

Latest pushed baseline:

- `c99c732 Improve MiMo canvas action stress coverage`

---

## 1. Executive Summary

Harness engineering is highly relevant to ThoughtGrid because the product is not a simple chat UI. It is an agentic canvas workbench where model output must be converted into reliable, observable, executable state changes: canvas cards, media jobs, searches, references, memory, sessions, and future agent workflows.

The key framing from recent public discussions is:

> Agent = Model + Harness

In this framing, the model is only one component. The harness includes system prompts, tool schemas, action extraction, policy filters, fallback recovery, execution environments, memory, permissions, observability, evals, and UI feedback loops.

ThoughtGrid already contains many harness components:

- Chat request construction and context budgeting in `server.js`.
- Canvas action schemas and extraction from model responses.
- `runCanvasActionPipeline()` and action policy filtering.
- Fallback recovery for promised or implied canvas actions.
- RAG/session context and persistent history.
- Frontend action execution and action result feedback.
- Agent skills and multi-step research flows.

The project should now treat this layer as a first-class product architecture concern instead of a collection of prompt patches and ad-hoc guards.

---

## 2. Research Findings

### 2.1 Harness definition

External sources consistently define a harness as everything around the model that makes it useful as an agent:

- System prompts and tool descriptions.
- Tool schemas and execution logic.
- State, filesystem, memory, and context compaction.
- Policy, authorization, and permission gates.
- Sandboxes, browsers, logs, and test runners.
- Observability, traces, evals, and feedback loops.

For ThoughtGrid, this means the canvas action system, context assembly, frontend execution, and diagnostics are all harness responsibilities.

### 2.2 Why evals matter

Research on agent evals emphasizes that manual testing works early, but breaks once agent behavior becomes complex. Without evals, teams cannot tell whether a prompt/schema/model/pipeline change improved behavior or caused regressions.

Important eval principles:

- Start with 20-50 tasks from real failures and manual release checks.
- Separate capability evals from regression evals.
- Include positive and negative cases to avoid one-sided optimization.
- Prefer deterministic graders where possible.
- Use LLM graders only for genuinely open-ended quality judgments.
- Read transcripts/traces regularly; evals themselves can be wrong.
- Account for non-determinism with repeated runs for model-in-the-loop evals.

### 2.3 Tool design principles

Useful tools for agents are not always thin wrappers around internal APIs. Effective agent tools should:

- Have clear, distinct purposes.
- Be named in a way that helps model tool selection.
- Return high-signal context, not raw low-level implementation details.
- Support concise/detailed response formats when outputs can be large.
- Have actionable validation and error messages.
- Reduce the context burden by bundling common multi-step operations.
- Be evaluated against the tasks where they matter.

For ThoughtGrid, `canvas_action` is effectively the most important agent-facing API.

### 2.4 Permission and safety patterns

Recent permission-harness work favors structured authorization over natural-language permission prompts.

Relevant patterns:

- Tiered allow rules for low-risk/read-only actions.
- Explicit review or blocking for external, costly, or destructive actions.
- Classify the action against user intent, not against assistant rationalization.
- Strip assistant self-justification and untrusted tool output from permission decisions where possible.
- Deny and continue: a blocked action should return a recoverable tool result, not necessarily halt the entire session.
- Multi-agent handoffs need checks both when delegating work and when accepting returned results.

ThoughtGrid already has action annotations like `destructiveHint`, `openWorldHint`, `idempotentHint`, and `requiresExplicitIntent`; these should become the foundation of a formal permission harness.

### 2.5 Long-running agent lessons

Long-running agents fail when they try to one-shot large tasks, lose state across context windows, or mark work complete prematurely.

Useful patterns:

- Maintain a feature/task list with explicit pass/fail status.
- Require incremental progress rather than broad unfinished rewrites.
- Keep a progress artifact and use git history as durable state.
- Test end-to-end as a user, not only with code-level checks.
- Leave the environment in a clean state after each iteration.

ThoughtGrid's existing `.planning/` and GSD workflow already align with this. The same principles can be productized inside the app for user-facing agent workflows.

---

## 3. Current ThoughtGrid Harness Map

### 3.1 Existing strengths

- **Canvas action pipeline:** Dedicated backend pipeline already exists.
- **Action policy layer:** Intent classification and allowed action types are centralized.
- **Fallback recovery:** There are recovery hooks for missing tool calls and promised cards.
- **Frontend execution loop:** Actions are executed on the canvas with result reporting.
- **Persistent sessions:** Canvas state, chat history, and material assets can survive across work sessions.
- **RAG/context infrastructure:** Existing retrieval and context formatting provide a foundation for context engineering.
- **Planning artifacts:** `.planning/` and phase docs already create durable engineering memory.

### 3.2 Current weaknesses

- **Trace fragmentation:** Backend model output, pipeline decisions, and frontend execution results are not yet unified in one trace object.
- **Regression coverage gaps:** Many agent behaviors are tested manually or through ad-hoc scripts rather than a formal eval corpus.
- **Fallback opacity:** It is not always obvious why fallback did or did not trigger.
- **Tool schema drift risk:** Tool descriptions, policy regexes, and frontend executors can drift from each other.
- **Frontend/backend contract looseness:** `actionResults` are normalized but not treated as a strict contract with stable fields and error categories.
- **Context pressure:** Selected canvas state, session history, RAG, attachments, and tool descriptions can compete for limited context.
- **Permission model is implicit:** Existing annotations are good, but not yet exposed as a clear authorization matrix.
- **No transcript viewer:** Developers cannot easily inspect a full action trajectory from user request to canvas node.

---

## 4. Improvement Backlog

### P0 — Canvas Action Reliability Harness

#### HE-P0-01: Define a canonical canvas action trace object

**Implementation status:** Done — implemented in `src/lib/canvasActionPipeline.js` via `buildCanvasActionTrace()` and emitted as `result.trace` from `finalizeCanvasActions()`. The trace is snippet-limited and includes intent, model action types, inline action types, thinking-mentioned action types, pipeline stages, final actions, and frontend result slots.

**Goal:** Every chat turn that may create or execute canvas actions should produce a structured trace.

**Suggested fields:**

```json
{
  "traceId": "chat_xxx",
  "sessionId": "...",
  "messageId": "...",
  "model": "...",
  "thinkingMode": "thinking",
  "intent": {
    "taskType": "planning",
    "allowCanvasTool": true,
    "allowedActionTypes": ["create_plan", "create_todo"]
  },
  "modelOutput": {
    "rawToolActionTypes": [],
    "inlineActionTypes": [],
    "thinkingMentionedActionTypes": ["create_plan"]
  },
  "pipelineStages": [
    { "name": "raw_model_actions", "inputCount": 0, "outputCount": 0 },
    { "name": "fallback_recovery", "inputCount": 0, "outputCount": 3 },
    { "name": "policy_final", "inputCount": 3, "outputCount": 3 }
  ],
  "finalActionTypes": ["create_plan", "create_timeline", "create_todo"],
  "frontendResults": [
    { "type": "create_plan", "success": true, "nodeId": "..." }
  ]
}
```

**Acceptance criteria:**

- A trace can explain why `actions=[]` happened.
- A trace can explain whether the model failed, policy rejected, fallback skipped, or frontend execution failed.
- Sensitive content is redacted or snippet-limited.

#### HE-P0-02: Standardize pipeline stage names and semantics

**Implementation status:** Done — pipeline stages are recorded centrally by `recordActionPipelineStage()` and the recovery stage is now named `fallback_recovery`. `scripts/test-canvas-action-pipeline.js` asserts the ordered stage contract.

**Goal:** Make the pipeline readable, stable, and testable.

**Target stages:**

1. `raw_model_actions`
2. `policy_initial`
3. `media_generation_guard`
4. `committed_canvas_guard`
5. `fallback_recovery`
6. `reference_merge`
7. `action_enrichment`
8. `agent_finalize`
9. `policy_after_enrichment`
10. `automatic_smart_cards`
11. `policy_final`

**Acceptance criteria:**

- Stage names describe intent, not historical implementation details.
- Each stage records input/output counts and action types.
- Rejections include stable reason codes.

#### HE-P0-03: Create deterministic canvas action eval fixtures

**Implementation status:** Done — added `scripts/test-canvas-action-regression.js` and `scripts/evals/canvas-action-regression.jsonl`, with 25 deterministic fixtures covering historical failures, positive cases, negative no-canvas cases, media generation, source research, workspace actions, and loop guards.

**Goal:** Catch regressions without calling external models.

**Initial fixture categories:**

- Planning requests with no tool calls.
- Planning requests with short acknowledgement replies.
- Model thinking mentions `create_plan` but final tool calls are empty.
- Comparison requests.
- Research synthesis requests.
- Table/data/code requests.
- Explicit `no canvas` negative cases.
- Media generation cases where fallback must not replace image generation with note cards.
- Web/reference cases with and without URLs.

**Example fixture:**

```json
{
  "name": "planning_no_tool_call_fallback",
  "message": "帮我规划一个三天日本旅行攻略",
  "reply": "好的，我来整理。",
  "rawActions": [],
  "expectAny": ["create_plan"],
  "expectNone": ["generate_image"],
  "expectAtLeast": 1
}
```

**Acceptance criteria:**

- Can run locally with `npm test` or a dedicated script.
- Does not call an external AI API.
- Fails with clear diff of expected vs actual action types.

#### HE-P0-04: Define frontend action result contract

**Implementation status:** Done — frontend execution results are normalized in `normalizeCanvasActionResultContract()` and documented in `.planning/contracts/FRONTEND_ACTION_RESULTS.md`.

**Goal:** Make backend returned actions and frontend execution results auditable.

**Required result fields:**

```json
{
  "type": "create_plan",
  "success": true,
  "nodeId": "node_xxx",
  "nodeIds": [],
  "title": "...",
  "error": null,
  "errorCode": null
}
```

**Acceptance criteria:**

- Every action executor returns a normalized result.
- Chat feedback uses the result contract rather than action assumptions.
- Failures include actionable error codes.

#### HE-P0-05: Add negative tests for over-triggering

**Implementation status:** Done — no-canvas/trivial negative fixtures are included in `scripts/evals/canvas-action-regression.jsonl` and run through `npm run test:guards`.

**Goal:** Prevent the fallback system from creating cards when the user explicitly asks for text only.

**Cases:**

- `只要文字回答，不要创建卡片：帮我规划旅行`
- `answer only, no canvas: compare React and Vue`
- `不要调用画布，只给我一个简短建议`

**Acceptance criteria:**

- Final actions are empty.
- The trace explains `noCanvas=true` or equivalent reason.

---

### P1 — Eval and Regression Harness

#### HE-P1-01: Build a small JSONL eval corpus

**Implementation status:** Done — `scripts/evals/canvas-action-regression.jsonl` now has 32 deterministic fixtures, covering balanced positive/negative cases across core product flows.

**Goal:** Convert real failures and release checks into reusable eval tasks.

**Initial target:** 30-50 cases.

**Suggested file:**

```text
scripts/evals/canvas-action-regression.jsonl
```

**Fields:**

```json
{
  "id": "planning.zh.trip.basic",
  "category": "planning",
  "message": "帮我规划一个三天日本旅行攻略",
  "mockReply": "好的。",
  "mockRawActions": [],
  "expected": {
    "any": ["create_plan"],
    "none": ["generate_image"],
    "minCount": 1
  }
}
```

**Acceptance criteria:**

- Includes balanced positive and negative cases.
- Each case is unambiguous.
- Cases come from real bugs, manual checks, and core product flows.

#### HE-P1-02: Separate regression evals from capability evals

**Implementation status:** Done — deterministic regression evals run through `npm run test:canvas-actions` and block guards; capability smoke evals live in a separate skipped-by-default path via `npm run eval:canvas-actions:smoke`.

**Goal:** Avoid mixing different evaluation purposes.

**Regression evals:**

- Must pass nearly 100%.
- Run on every relevant code change.
- Mostly deterministic.

**Capability evals:**

- Can start with low pass rate.
- Measure whether new agent behaviors are improving.
- Can use real model calls and repeated trials.

**Acceptance criteria:**

- Eval files are labeled by purpose.
- CI blocks only on regression evals.
- Capability evals produce reports but do not block by default.

#### HE-P1-03: Add transcript review artifacts

**Implementation status:** Done — the deterministic regression runner now writes structured failure artifacts to `scripts/evals/artifacts/canvas-action-regression-failures.json`, including message, mock output, final actions, policy trace, pipeline stages, rejection reasons, and canonical trace.

**Goal:** Make failed evals debuggable.

**Output per failed case:**

- Message.
- Mock or real model output.
- Raw actions.
- Pipeline stages.
- Final actions.
- Rejection reasons.
- Frontend execution result if applicable.

**Acceptance criteria:**

- Developers can diagnose failures from the artifact without rerunning manually.
- Artifacts are safe to store locally and avoid secrets.

#### HE-P1-04: Add model-in-the-loop smoke evals

**Implementation status:** Done — added `scripts/evals/canvas-action-capability-smoke.jsonl` and `scripts/run-canvas-action-capability-smoke.js`; model calls require `RUN_MODEL_SMOKE_EVALS=1` and the report includes pass@1/pass-rate/consistency across configurable trials.

**Goal:** Measure actual model tool-call behavior separately from deterministic pipeline correctness.

**Metrics:**

- Tool call rate.
- Fallback rate.
- Policy rejection rate.
- Final action success rate.
- Average latency and token usage.

**Acceptance criteria:**

- Runs manually or nightly, not on every commit.
- Supports repeated trials for non-determinism.
- Reports pass@1 and consistency-style metrics for key tasks.

---

### P1 — Tool and Schema Harness

#### HE-P1-05: Audit `canvas_action` schema against actual executors

**Implementation status:** Done — added `.planning/contracts/CANVAS_ACTION_CONTRACT.md` and `scripts/test-canvas-action-contract.js` to check model-visible action names, registry metadata, frontend executor coverage, rich card coverage, and normalized result fields.

**Goal:** Ensure model-facing schema, backend normalization, and frontend execution agree.

**Audit matrix columns:**

| Action type | Schema fields | Backend normalization | Frontend executor | Result fields | Tests |
|-------------|---------------|-----------------------|-------------------|---------------|-------|
| create_plan | content.steps | yes | yes | nodeId | missing |

**Acceptance criteria:**

- Every action type has a documented contract.
- Required fields are either enforced or repaired deterministically.
- Deprecated/ambiguous aliases are listed.

#### HE-P1-06: Improve action descriptions with agent-facing guidance

**Implementation status:** Done — dynamic canvas action schemas now include per-action selection guidance for allowed tools, and `scripts/test-canvas-action-contract.js` guards key guidance from regressing.

**Goal:** Make tool selection more reliable without relying only on system prompt text.

**Guidance to encode:**

- Use `create_plan` for structured steps, itinerary, roadmap, implementation plan.
- Use `create_comparison` for option tradeoffs and decision matrices.
- Use `generate_image` only for actual image generation requests, not as a planning substitute.
- Use `create_note` for narrative synthesis and summaries.
- Use `create_table` when rows/columns materially improve reuse.

**Acceptance criteria:**

- Descriptions are specific enough for a new teammate or agent to understand.
- No two actions have indistinguishable descriptions.
- Tool descriptions are covered by eval cases.

#### HE-P1-07: Add strict validation and repair reporting

**Implementation status:** Done — policy rejection reason codes and structured repair events are included in pipeline traces and eval artifacts.

**Goal:** When malformed actions are repaired, the trace should say how.

**Examples:**

- `create_plan.content.items` converted to `steps`.
- Missing `generate_image.prompt` derived from title/description.
- `create_web_card` without URL converted to `web_search` or `create_note`.

**Acceptance criteria:**

- Repairs are deterministic and logged as trace events.
- Invalid unrecoverable actions produce structured rejection reasons.

---

### P1 — Context Harness

#### HE-P1-08: Define context budget tiers

**Implementation status:** Done — `server.js` now builds deterministic chat context budget tiers and attaches them to chat responses for normal, streaming, and video paths.

**Goal:** Prevent context rot as canvas, RAG, history, and attachments grow.

**Proposed tiers:**

1. User's current message.
2. Selected card and direct neighborhood.
3. Active canvas summary.
4. Recent chat turns.
5. Retrieved session memory/RAG snippets.
6. Tool/action policy contract.
7. Large raw artifacts only by retrieval or reference.

**Acceptance criteria:**

- Context construction records token/byte budget by tier.
- Oversized context is summarized or omitted deterministically.
- Selected/current context is never displaced by low-priority history.

#### HE-P1-09: Store prompt/schema/context version hashes in traces

**Implementation status:** Done — canonical action traces now include `trace.harness` with version/hash metadata for system prompt, tool schema, policy, fallback, and context budget.

**Goal:** Make behavior changes attributable.

**Record:**

- System prompt version/hash.
- Tool schema version/hash.
- Policy version/hash.
- Fallback rules version/hash.
- Context budget version/hash.

**Acceptance criteria:**

- A trace can answer what harness version produced it.
- Regression reports can group failures by version.

---

### P2 — Observability and Debug UX

#### HE-P2-01: Build a developer-only action trace viewer

**Implementation status:** Done — the existing developer/debug action-trace toggle now shows the compact policy trace plus canonical action trace metadata, repair events, harness version/hash values, context budget tiers, frontend results, and a copy-JSON control. Hidden reasoning text is not included in the copied payload.

**Goal:** Debug canvas action behavior without reading raw server logs.

**Display:**

- Intent classification.
- Allowed actions.
- Raw/inline/fallback/final action types.
- Pipeline stage counts.
- Rejections and repair events.
- Frontend execution results.

**Acceptance criteria:**

- Available only in dev/debug mode.
- Can be copied as JSON for bug reports.
- Does not expose hidden reasoning text.

#### HE-P2-02: Persist trace summaries for recent sessions

**Implementation status:** Partial — chat, streaming chat, and video chat paths now write compact redacted summaries to `storage/logs/canvas-action-traces.ndjson`, and `GET /api/debug/action-traces` can filter recent summaries by session/message/trace ID. This intentionally stores summaries only and excludes hidden reasoning. Database persistence and replay tooling remain pending.

**Goal:** Make post-mortems possible after a user reports failure.

**Options:**

- Store in database as compact JSON.
- Store in local logs with trace IDs.
- Store only summaries by default; full trace behind debug flag.

**Acceptance criteria:**

- Can search by session ID or message ID.
- Retention and redaction policy is clear.

#### HE-P2-03: Evaluate external observability tools later

**Candidates:**

- Langfuse.
- Arize Phoenix.
- OpenTelemetry GenAI conventions.
- Helicone.

**Recommendation:** Start with local JSON traces first. Do not adopt a platform before the internal trace schema stabilizes.

---

### P2 — Permission Harness

#### HE-P2-04: Formalize action risk categories

**Goal:** Make automatic vs approval-required actions explicit.

**Suggested categories:**

| Risk | Examples | Default behavior |
|------|----------|------------------|
| read-only | search_card, open_history | allow |
| low-risk create | create_note, create_plan | allow if intent matches |
| external/network | web_search, image_search | allow only with matching intent |
| costly async | generate_image, generate_video | require explicit media intent |
| destructive | delete_node | require explicit destructive intent |
| sensitive external write | future integrations | require approval |

**Acceptance criteria:**

- Every action type maps to a risk category.
- Policy checks use categories rather than scattered special cases.
- Trace records permission decisions.

#### HE-P2-05: Add deny-and-continue behavior for blocked actions

**Goal:** Let the assistant recover when policy blocks an action.

**Example:**

- User asks for analysis only.
- Model proposes `generate_image`.
- Policy blocks it and returns a structured instruction to answer with analysis instead.

**Acceptance criteria:**

- Blocked actions produce user-safe alternatives where possible.
- Repeated blocked attempts escalate to a visible warning or stop condition.

---

### P2 — Long-Running Agent Harness

#### HE-P2-06: Create a user-facing task ledger concept

**Goal:** Support multi-step user projects on the canvas.

**Potential representation:**

- A `task_ledger` card type.
- Or a structured `create_plan` extension with pass/fail statuses.

**Fields:**

```json
{
  "goal": "Build campaign concept board",
  "items": [
    { "description": "Collect references", "status": "pending" },
    { "description": "Generate 3 directions", "status": "in_progress" },
    { "description": "Create final presentation", "status": "pending" }
  ]
}
```

**Acceptance criteria:**

- Agents can update status without rewriting the whole plan.
- Users can visually inspect progress.
- Long-running work can resume from the ledger.

#### HE-P2-07: Add incremental progress protocol for agents

**Goal:** Prevent agent workflows from trying to do too much at once or declaring success early.

**Protocol:**

1. State current goal.
2. Choose one bounded next step.
3. Execute actions.
4. Verify output.
5. Update task ledger.
6. Leave a clean session state.

**Acceptance criteria:**

- Agent mode produces observable progress artifacts.
- Each step has verification or a declared uncertainty.

---

### P3 — Productized Harness Capabilities

#### HE-P3-01: Canvas memory layer

**Goal:** Turn the canvas into structured long-term agent memory.

**Memory types:**

- Episodic: what happened in previous sessions.
- Semantic: reusable user/project knowledge.
- Procedural: how ThoughtGrid should handle recurring task types.

**Acceptance criteria:**

- Memories link back to source cards/sessions.
- Users can inspect and delete memory.
- Retrieval is scoped by current task and session.

#### HE-P3-02: Harness-aware model routing

**Goal:** Route tasks based on harness needs, not only model quality.

**Examples:**

- Cheap model for deterministic summarization.
- Strong model for planning/research synthesis.
- Specialized path for media generation prompts.
- No model call for deterministic fallback recovery.

**Acceptance criteria:**

- Routing decisions are traced.
- Eval metrics compare model+ harness combinations, not models alone.

---

## 5. Suggested Implementation Order

### Phase A: Reliability foundation

1. HE-P0-01 canonical trace object.
2. HE-P0-02 pipeline stage semantics.
3. HE-P0-03 deterministic eval fixtures.
4. HE-P0-04 frontend action result contract.
5. HE-P0-05 negative over-triggering tests.

**Why first:** These directly address current card/action reliability failures.

### Phase B: Eval-driven hardening

1. HE-P1-01 JSONL eval corpus.
2. HE-P1-02 regression vs capability separation.
3. HE-P1-03 transcript artifacts.
4. HE-P1-04 model-in-the-loop smoke evals.

**Why second:** Once traces exist, evals become much easier and more useful.

### Phase C: Tool/context maturity

1. HE-P1-05 schema/executor audit.
2. HE-P1-06 action description improvements.
3. HE-P1-07 validation and repair reporting.
4. HE-P1-08 context budget tiers.
5. HE-P1-09 prompt/schema/context version hashes.

**Why third:** Tool and context changes are safer when regression tests already exist.

### Phase D: Debug UX and governance

1. HE-P2-01 trace viewer.
2. HE-P2-02 trace summaries.
3. HE-P2-04 risk categories.
4. HE-P2-05 deny-and-continue.

**Why fourth:** These turn internal reliability into maintainable operations.

### Phase E: Long-running product workflows

1. HE-P2-06 task ledger.
2. HE-P2-07 incremental progress protocol.
3. HE-P3-01 canvas memory layer.
4. HE-P3-02 harness-aware model routing.

**Why last:** These are product-level capabilities that depend on the previous harness foundation.

---

## 6. Concrete First Sprint Proposal

### Sprint goal

Make canvas action behavior explainable and regression-testable.

### Tasks

1. Create `scripts/evals/canvas-action-regression.jsonl` with 25 initial cases.
2. Create `scripts/test-canvas-action-regression.js` to run deterministic pipeline evals.
3. Promote current pipeline diagnostics into a reusable trace object.
4. Add stable rejection/repair reason codes.
5. Add negative tests for no-canvas requests.
6. Document the frontend `actionResults` contract.

### Done criteria

- `npm run test:canvas-actions` or equivalent passes locally.
- At least one historical failure is captured as a regression case.
- A failed eval prints the pipeline stages and rejection reasons.
- No external AI API is needed for the regression suite.

---

## 7. Open Questions

1. Should traces be returned to the frontend in production, or only in dev mode?
2. Should trace summaries be persisted in PostgreSQL, log files, or session JSON?
3. What is the minimum acceptable frontend action result schema before refactoring executors?
4. Should capability evals call the real configured model or a fixed provider/model only?
5. How should hidden thinking be handled in traces beyond action-type mentions?
6. Should a user-facing task ledger be a new card type or an extension of `create_plan`?
7. What actions should require explicit user confirmation once external integrations expand?

---

## 8. Follow-up Findings from OpenAI, Martin Fowler, and Codex Harness Materials

### 8.1 Source access notes

The original OpenAI `openai.com/index/...` pages for harness engineering, the Codex agent loop, and the Codex App Server remained inaccessible through the research fetcher because they returned HTTP 403. InfoQ continued to return Method Not Allowed, and one GitHub raw path for the OpenAI cookbook returned Not Found.

However, several closely related or mirrored sources were accessible:

- OpenAI Developers: `Run long horizon tasks with Codex`.
- OpenAI Cookbook: `Using PLANS.md for multi-hour problem solving`.
- Martin Fowler: `Harness engineering for coding agent users`.
- Aetos mirror/summary of OpenAI: `Unlocking the Codex harness: how we built the App Server`.
- Milvus summary of OpenAI's harness engineering case study.
- Search-result snippets for the inaccessible OpenAI index articles.

The additions below are based on accessible primary OpenAI developer/cookbook materials where possible, and on clearly labeled secondary summaries where primary access failed.

### 8.2 OpenAI: long-horizon work is an agent loop, not one giant prompt

OpenAI's long-horizon Codex article emphasizes that sustained agent work is less about a single large prompt and more about the loop the model operates inside.

The Codex loop is described as:

1. Plan.
2. Edit code.
3. Run tools such as tests, build, lint, and type checks.
4. Observe results.
5. Repair failures.
6. Update docs and status.
7. Repeat.

For ThoughtGrid, the equivalent loop should be:

1. Understand the user's intent.
2. Decide whether a canvas artifact or tool action is needed.
3. Run the canvas action pipeline.
4. Execute the action on the canvas.
5. Observe frontend action results.
6. Repair or fallback if execution fails.
7. Update session/project memory.
8. Explain the result to the user.

This reinforces that ThoughtGrid should optimize the full action loop, not only the model prompt.

### 8.3 OpenAI: durable project memory

OpenAI's long-running Codex workflow used durable Markdown artifacts to keep the agent coherent across long runs:

- `Prompt.md`: fixed the target, constraints, deliverables, and done-when checks.
- `Plan.md` or `plans.md`: converted open-ended work into milestones with acceptance criteria and validation commands.
- `Implement.md`: acted as the execution runbook, instructing Codex to follow the plan, keep diffs scoped, validate after each milestone, and update documentation.
- `Documentation.md`: served as status, decision log, known issues, run instructions, and audit trail.

ThoughtGrid already has `.planning/` for development work. The product can adapt the same pattern for user-facing canvas projects:

| OpenAI artifact | ThoughtGrid product analogue |
|-----------------|------------------------------|
| `Prompt.md` | Project brief card |
| `Plan.md` | Plan/task ledger card |
| `Implement.md` | Agent execution protocol |
| `Documentation.md` | Session memory, trace log, decision log, and project status card |

This suggests a future canvas-native project memory model where complex user goals are not only answered once, but maintained as living artifacts.

### 8.4 OpenAI Cookbook: ExecPlans must be self-contained, living, and verifiable

The OpenAI Cookbook `PLANS.md` guidance defines an `ExecPlan` as a living document that a stateless agent or novice human can use to implement a working feature end-to-end.

Key transferable principles:

- The plan must be self-contained.
- It must define terms in plain language.
- It must state the user-visible purpose before implementation details.
- It must include exact files, commands, expected outputs, and acceptance criteria.
- It must be continuously updated with progress, discoveries, decisions, and retrospective notes.
- It must produce demonstrably working behavior, not merely code changes.
- It must include idempotence and recovery guidance for safe retries.

For ThoughtGrid, this means `create_plan` should eventually support richer plan artifacts for complex tasks. A lightweight plan card could include:

```json
{
  "goal": "Build campaign concept board",
  "context": "Why this project matters and what already exists",
  "constraints": ["Budget", "deadline", "style direction"],
  "steps": [],
  "validation": [],
  "progress": [],
  "decisionLog": [],
  "risks": [],
  "outcomes": []
}
```

This should not replace simple plans. It should be used when the user asks for complex, reusable, long-running work.

### 8.5 OpenAI Codex App Server: expose the harness through stable conversation primitives

The Codex App Server material describes OpenAI exposing the same Codex harness across CLI, IDE, web, desktop, and partner integrations through a stable bidirectional JSON-RPC protocol.

The important primitives are:

- `Thread`: durable session container.
- `Turn`: one unit of user-initiated agent work.
- `Item`: atomic typed event such as user message, agent message, tool execution, approval request, diff, or artifact.

Each item has a lifecycle:

1. `item/started`
2. optional `item/*/delta`
3. `item/completed`

This is highly relevant to ThoughtGrid because the app currently has chat messages, actions, artifacts, execution results, and canvas nodes, but they are not yet unified as one protocol-level event model.

Potential ThoughtGrid mapping:

| Codex primitive | ThoughtGrid analogue |
|-----------------|----------------------|
| Thread | Chat session / canvas session |
| Turn | One `/api/chat` request and its resulting work |
| Item | User message, model text, tool call, pipeline stage, canvas action, frontend result, generated artifact |

This supports the case for a canonical action trace and eventually a richer event stream that the frontend can render and debug.

### 8.6 Martin Fowler: feedforward guides and feedback sensors

Martin Fowler frames harness engineering as a steering system with two complementary controls:

- **Guides / feedforward controls:** prevent bad outputs before the agent acts.
- **Sensors / feedback controls:** observe after the agent acts and help it self-correct.

For ThoughtGrid:

| Harness control | ThoughtGrid examples |
|-----------------|----------------------|
| Feedforward guide | System prompt, tool schema, action descriptions, intent policy, context budget |
| Feedback sensor | Pipeline trace, policy rejection reasons, action execution result, eval failure, browser/E2E check |

The key lesson is that feedforward-only and feedback-only systems both fail:

- Feedforward-only: rules exist, but no evidence that they worked.
- Feedback-only: the system observes failures, but the model keeps repeating the same mistakes.

ThoughtGrid needs both:

1. Better guides for when to create cards and which action type to use.
2. Better sensors for whether cards were actually created and displayed.

### 8.7 Martin Fowler: computational vs inferential controls

Fowler distinguishes between:

- **Computational controls:** deterministic and cheap; tests, linters, type checks, structural analysis.
- **Inferential controls:** semantic and model-based; AI review, LLM-as-judge, qualitative evaluation.

Recommended application to ThoughtGrid:

- Use computational controls for action type coverage, schema/executor consistency, no-canvas negative tests, and pipeline regression fixtures.
- Use inferential controls only where semantic quality matters, such as judging whether a generated plan is useful, complete, or aligned with the user's constraints.

This supports the recommendation to start with deterministic canvas action evals before adding LLM-as-judge quality evals.

### 8.8 Martin Fowler: keep quality left

Fowler recommends moving fast, cheap checks earlier in the lifecycle.

For ThoughtGrid:

- Run deterministic action pipeline evals before committing.
- Run schema/registry consistency checks in CI.
- Run expensive model-in-the-loop capability evals manually or nightly.
- Run full browser E2E only for key user flows or release candidates.
- Continuously monitor drift with scheduled health checks.

This suggests the project should not wait for users to report action failures; historical failures should become regression checks immediately.

### 8.9 Martin Fowler: maintainability, architecture fitness, and behavior harnesses

Fowler divides harnesses into three useful categories:

- **Maintainability harness:** regulates internal code quality.
- **Architecture fitness harness:** checks that system structure follows intended architecture.
- **Behavior harness:** verifies that the application functionally behaves as intended.

ThoughtGrid should map these categories as follows:

| Category | ThoughtGrid focus |
|----------|-------------------|
| Maintainability | Avoid duplicated fallback logic, oversized functions, stale tests |
| Architecture fitness | Keep action registry, policy, schema, backend normalization, and frontend executors aligned |
| Behavior | Verify that user requests actually produce expected canvas results |

The current card-generation failure is primarily a behavior harness gap, with secondary architecture-fitness symptoms.

### 8.10 Martin Fowler: harnessability and ambient affordances

Fowler uses the idea of harnessability: some systems are easier for agents to govern because their structure is legible and mechanically checkable.

ThoughtGrid can improve harnessability by:

- Keeping action definitions centralized.
- Giving each action a stable contract.
- Creating mechanical coverage tests for action registry/schema/executor alignment.
- Making pipeline stages explicit.
- Keeping trace output structured and compact.
- Turning common project workflows into templates.

The product opportunity is broader: ThoughtGrid itself can make user work more harnessable by turning vague creative/research tasks into structured canvas artifacts.

### 8.11 OpenAI/Milvus: AGENTS.md should be a map, not an encyclopedia

Secondary summaries of OpenAI's harness engineering article describe a failed attempt to make `AGENTS.md` contain every rule and convention. The reported fix was to keep `AGENTS.md` short and use it as a table of contents pointing to structured docs.

For ThoughtGrid:

- Do not put all agent behavior into one giant prompt.
- Keep the base system prompt short and stable.
- Dynamically include only relevant action contracts, context policies, and task guidance.
- Keep detailed harness rules in structured docs/tests that can be verified.

This aligns with the context-budget and prompt/schema versioning recommendations above.

### 8.12 Harness components should have retirement criteria

Secondary summaries also emphasize that good harness components are designed to be deleted. Every guard, fallback, and workaround encodes an assumption about current model limitations. As models improve, some controls may become unnecessary or harmful.

ThoughtGrid should record for each fallback or guardrail:

- What failure it prevents.
- Where it is implemented.
- Which eval cases prove it is needed.
- What would justify removing or simplifying it.

This is especially important because canvas action fallback logic can accumulate and eventually over-trigger.

### 8.13 Additional backlog items from follow-up research

#### HE-P1-10: Add an ExecPlan-like rich plan mode

**Implementation status:** Done — `create_plan` accepts simple step-only plans and richer execution plans with goal/context/constraints/validation/progress/decisions/risks/outcomes. Frontend plan cards render rich sections only when present, and regression fixtures cover both simple and complex modes.

**Goal:** Improve complex planning without overloading simple card creation.

**Acceptance criteria:**

- Simple planning requests still produce concise steps.
- Complex planning requests can include goal, context, constraints, validation, progress, decisions, risks, and outcomes.
- Eval cases distinguish simple plans from complex project plans.

#### HE-P1-11: Add mechanical action consistency checks

**Implementation status:** Done — `scripts/test-canvas-action-contract.js` is now part of `npm run test:guards` and checks registry/model-visible action alignment, frontend executor coverage, rich card registration, and frontend result contract fields.

**Goal:** Improve architecture fitness by ensuring action registry, schema, policy, normalization, tests, and frontend executors stay aligned.

**Acceptance criteria:**

- Every action type in the registry has an allowed policy path or an explicit reason why not.
- Every create-card action has frontend execution support or a documented fallback.
- Every action result type is covered by `normalizeChatActionResults`.
- CI or a local script reports missing coverage.

#### HE-P2-08: Add durable canvas project memory

**Goal:** Create a canvas-native equivalent of `Prompt.md`, `Plan.md`, `Implement.md`, and `Documentation.md` for long-running user projects.

**Acceptance criteria:**

- Complex sessions can create a project brief/status artifact.
- Agent turns can update progress and decisions without rewriting the whole artifact.
- Users can inspect, edit, and delete this memory.
- Future turns can retrieve it as high-priority context.

#### HE-P2-09: Add harness component retirement criteria

**Goal:** Prevent fallback/guardrail accumulation from becoming unmaintainable.

**Acceptance criteria:**

- Each fallback has a linked failure mode and eval case.
- Each fallback has a documented condition for removal or simplification.
- Harness reviews ask whether any rule can be removed after model or schema upgrades.

#### HE-P2-10: Define a ThoughtGrid event primitive model

**Goal:** Use thread/turn/item-style primitives to unify chat, action pipeline, tool execution, artifacts, and frontend results.

**Acceptance criteria:**

- A chat request maps to a `turn`.
- Text, actions, pipeline stages, approvals, artifacts, and frontend results map to typed `items`.
- Each item has a started/delta/completed or equivalent lifecycle.
- The model supports future streaming UI and trace viewer work.

---

## 9. Research Sources Consulted

- LangChain: The Anatomy of an Agent Harness.
- Anthropic: Demystifying evals for AI agents.
- Anthropic: Writing effective tools for agents.
- Anthropic: Claude Code auto mode: a safer way to skip permissions.
- Anthropic: Effective harnesses for long-running agents.
- OpenAI Developers: Run long horizon tasks with Codex.
- OpenAI Cookbook: Using PLANS.md for multi-hour problem solving.
- Martin Fowler: Harness engineering for coding agent users.
- Aetos mirror/summary: Unlocking the Codex harness: how we built the App Server.
- Milvus: Harness Engineering: The Execution Layer AI Agents Actually Need.
- Awesome Harness Engineering curated list.
- Search summaries for OpenAI harness engineering, Martin Fowler harness engineering, and related public discussions.

Note: Some primary OpenAI index pages remained inaccessible during research due to HTTP 403. InfoQ returned Method Not Allowed and one GitHub raw cookbook path returned Not Found. Accessible OpenAI developer/cookbook pages, Martin Fowler's article, and clearly labeled secondary summaries were used for triangulation where necessary.

---

## 10. Decision Recommendation

Adopt harness engineering as the organizing principle for ThoughtGrid's AI reliability work.

The immediate focus should not be broad multi-agent autonomy. It should be:

1. Canvas action traceability.
2. Deterministic action regression evals.
3. Stable frontend/backend action contracts.
4. Explicit context and permission policies.

This will make the existing product more reliable now and create the foundation for more advanced agentic workflows later.
