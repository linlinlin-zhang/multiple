# Frontend Action Result Contract

Status: initial contract, enforced by `normalizeCanvasActionExecutionResult()` in `public/app.js`.

Every frontend canvas action executor should resolve to a result that can be normalized to this shape:

```json
{
  "type": "create_plan",
  "success": true,
  "nodeId": "node_xxx",
  "nodeIds": [],
  "title": "Plan title",
  "error": "",
  "errorCode": ""
}
```

## Fields

- `type`: canvas action type, usually copied from the action.
- `success`: `true` when the action completed and, for card-creating actions, produced a verifiable canvas node.
- `nodeId`: primary canvas node created or focused by the action.
- `nodeIds`: all canvas nodes created or affected by the action.
- `title`: short display title for chat feedback.
- `error`: user-safe failure explanation.
- `errorCode`: stable machine-readable reason such as `missing_canvas_result` or `execution_failed`.

## Required Behavior

- Card-creating actions must produce `nodeId` or `nodeIds`; otherwise normalization marks them failed.
- Non-card workspace actions may succeed without node IDs.
- Chat feedback must read normalized results instead of assuming an action succeeded.
- Future trace viewer work should attach normalized frontend results to the canvas action trace.
