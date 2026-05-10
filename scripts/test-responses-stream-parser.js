import assert from "node:assert/strict";
import { extractResponsesReasoningDelta, extractResponsesTextDelta } from "../src/lib/responsesStreamParser.js";

const reasoningDelta = {
  type: "response.reasoning_summary_text.delta",
  delta: "The user is asking for a photo comparison."
};

assert.equal(
  extractResponsesReasoningDelta("response.reasoning_summary_text.delta", reasoningDelta),
  reasoningDelta.delta,
  "reasoning summary delta should be captured as thinking"
);
assert.equal(
  extractResponsesTextDelta("response.reasoning_summary_text.delta", reasoningDelta),
  "",
  "reasoning summary delta must not be captured as visible reply text"
);

const reasoningDone = {
  type: "response.reasoning_summary_text.done",
  text: "The user is asking for a photo comparison."
};

assert.equal(
  extractResponsesReasoningDelta("response.reasoning_summary_text.done", reasoningDone),
  "",
  "reasoning summary done is a completed snapshot, not an incremental thinking delta"
);
assert.equal(
  extractResponsesTextDelta("response.reasoning_summary_text.done", reasoningDone),
  "",
  "reasoning summary done must not be captured as visible reply text"
);

const outputText = {
  type: "response.output_text.delta",
  delta: "我认为第一张照片最好。"
};

assert.equal(
  extractResponsesTextDelta("response.output_text.delta", outputText),
  outputText.delta,
  "output text delta should be captured as visible reply text"
);
assert.equal(
  extractResponsesReasoningDelta("response.output_text.delta", outputText),
  "",
  "output text delta should not be captured as thinking"
);

console.log("responses stream parser tests passed");
