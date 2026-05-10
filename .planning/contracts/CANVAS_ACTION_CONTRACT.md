# Canvas Action Contract

Status: initial architecture-fitness contract.

The canvas action harness has four aligned surfaces:

1. Model-visible action names in `src/prompts/shared.js`.
2. Policy/permission metadata in `src/lib/canvasActionPolicy.js`.
3. Backend normalization and repair in `server.js`.
4. Frontend execution in `public/app.js`.

`scripts/test-canvas-action-contract.js` mechanically checks the first, second, and fourth surfaces:

- Every `CANVAS_ACTION_TYPES` item has a registry entry.
- Every registry entry is model-visible.
- Every action type is handled by the frontend executor, either directly in `executeCanvasAction()` or through `RICH_CARD_ACTION_TYPES`.
- Every rich card type is model-visible and registered.
- The frontend result contract includes `type`, `success`, `nodeId`, `nodeIds`, `title`, `error`, and `errorCode`.

## Contract Notes

- Card-like actions should prefer specific rich types over `create_card`/`new_card`.
- Open-world actions (`web_search`, `image_search`, media generation) must be gated by user intent.
- Costly media generation must not be used as a substitute for planning or direction cards.
- Destructive actions require explicit destructive intent.
- Frontend action executors must return a normalizable result; card-creating actions require a verifiable node ID.
