# Canvas Action Evals

ThoughtGrid keeps canvas-action evals separated by purpose.

## Regression evals

- File: `canvas-action-regression.jsonl`
- Complex file: `canvas-action-complex-regression.jsonl`
- Runner: `node scripts/test-canvas-action-regression.js`
- Package scripts: `npm run test:canvas-actions`, `npm run test:canvas-actions:complex`
- Purpose: deterministic pipeline and policy regression checks.
- Default: blocking; included in `npm run test:guards`.
- Network/model calls: none.

The complex corpus contains 106 deterministic cases and also checks deep action fields, array lengths, required/forbidden text patterns, and canonical trace stages. It targets failures such as incomplete multi-photo comparison items, mechanical titles, visible markdown residue, leaked planning text, false workspace routing, and direction-vs-generation confusion.

## Capability smoke evals

- File: `canvas-action-capability-smoke.jsonl`
- Runner: `node scripts/run-canvas-action-capability-smoke.js`
- Package script: `npm run eval:canvas-actions:smoke`
- Purpose: manually measure real configured model behavior through `/api/chat`.
- Default: skipped unless `RUN_MODEL_SMOKE_EVALS=1` is set.
- Report: `scripts/evals/artifacts/canvas-action-capability-smoke-report.json`.

Repeated trials:

- Environment: `CANVAS_ACTION_SMOKE_TRIALS=3`
- Report fields: `passAt1`, `passRate`, `averageConsistency`, and per-fixture action-type signatures.

Example:

```bash
RUN_MODEL_SMOKE_EVALS=1 CANVAS_ACTION_SMOKE_TRIALS=3 CANVAS_ACTION_SMOKE_ENDPOINT=http://127.0.0.1:3000/api/chat npm run eval:canvas-actions:smoke
```

Capability smoke evals are intentionally non-blocking by default because model behavior is non-deterministic and depends on local provider configuration.

## Chat system evals

- File: `chat-system-eval.jsonl`
- Stress file: `chat-system-stress-eval.jsonl`
- MiMo live file: `chat-system-mimo-live-40.jsonl`
- Runner: `node scripts/run-chat-system-eval.js`
- Package scripts: `npm run eval:chat-system`, `npm run eval:chat-system:stress`, `npm run eval:chat-system:mimo`
- Purpose: exercise `/api/chat` end to end, including request construction, selected context, attachments, streaming, action extraction, policy traces, and frontend-facing action payloads.
- Default: skipped unless `RUN_CHAT_SYSTEM_EVALS=1` is set.
- Repeated trials: set `CHAT_SYSTEM_EVAL_TRIALS=3` to report pass@1, pass rate, and action-type consistency.

Example:

```bash
RUN_CHAT_SYSTEM_EVALS=1 CHAT_SYSTEM_EVAL_TRIALS=3 npm run eval:chat-system:mimo
```

## Controller model tool evals

- File: `controller-model-tool-eval.jsonl`
- Runner: `node scripts/run-controller-model-tool-eval.js`
- Package script: `npm run eval:controller-models`
- Purpose: compare raw OpenAI-compatible tool-call selection across configured controller candidates.
- Default: skipped unless `RUN_CONTROLLER_MODEL_EVALS=1` is set.
