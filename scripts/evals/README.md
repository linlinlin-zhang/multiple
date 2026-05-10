# Canvas Action Evals

ThoughtGrid keeps canvas-action evals separated by purpose.

## Regression evals

- File: `canvas-action-regression.jsonl`
- Runner: `node scripts/test-canvas-action-regression.js`
- Package script: `npm run test:canvas-actions`
- Purpose: deterministic pipeline and policy regression checks.
- Default: blocking; included in `npm run test:guards`.
- Network/model calls: none.

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
