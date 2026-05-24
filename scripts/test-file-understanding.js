import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { answerFileQuestion, buildFileUnderstanding } from "../src/lib/fileUnderstanding.js";
import { parseFileStructured } from "../src/lib/fileParser.js";

const sampleText = [
  "# Launch Plan",
  "This document explains PDF page preview, DOCX and PPTX structured preview, OCR handoff, background jobs, and document Q&A.",
  "",
  "Metric  Value",
  "Pages  12",
  "Tables  3",
  "",
  "The next action is to create canvas cards with citations and page-aware evidence."
].join("\n");

describe("file understanding", () => {
  it("parses plain text into structured page previews and tables", async () => {
    const parsed = await parseFileStructured(Buffer.from(sampleText), "txt");
    assert.equal(parsed.type, "txt");
    assert.equal(parsed.totalPages, 1);
    assert.ok(parsed.pages[0].text.includes("PDF page preview"));
    assert.ok(parsed.pages[0].tables.length >= 1);
  });

  it("returns preview, OCR status, QA hints, and automatic canvas cards", async () => {
    const result = await buildFileUnderstanding(Buffer.from(sampleText), "launch-plan.txt", "txt", {
      lang: "en",
      apiKey: ""
    });
    assert.equal(result.ok, true);
    assert.equal(result.documentPreview.type, "txt");
    assert.equal(result.documentPreview.pages.length, 1);
    assert.equal(result.qaHints.supported, true);
    assert.ok(result.canvasCards.some((card) => card.type === "create_note"));
    assert.ok(result.canvasCards.some((card) => card.type === "create_table"));
    assert.ok(result.metadata.documentPreview.pages[0].label.includes("Page"));
  });

  it("answers document questions with page citations", async () => {
    const result = await answerFileQuestion(Buffer.from(sampleText), "launch-plan.txt", "txt", "What is the next action?", {
      lang: "en",
      apiKey: ""
    });
    assert.equal(result.ok, true);
    assert.ok(result.answer.includes("Page 1"));
    assert.equal(result.citations[0].page, 1);
    assert.ok(result.citations[0].quote.includes("next action"));
  });
});
