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

  it("builds video timeline understanding from key frames and transcript", async () => {
    const tinyFrame = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2w==";
    const result = await buildFileUnderstanding(Buffer.from("fake-video-bytes"), "demo-video.mp4", "mp4", {
      lang: "en",
      apiKey: "",
      videoMetadata: {
        type: "video",
        durationSeconds: 14,
        width: 1280,
        height: 720,
        mimeType: "video/mp4"
      },
      videoFrames: [
        { time: 0.2, timeLabel: "00:00", dataUrl: tinyFrame, width: 1280, height: 720 },
        { time: 6.5, timeLabel: "00:07", dataUrl: tinyFrame, width: 1280, height: 720 },
        { time: 12.4, timeLabel: "00:12", dataUrl: tinyFrame, width: 1280, height: 720 }
      ],
      transcript: "Welcome to the demo. This clip shows the canvas turning video evidence into timeline cards."
    });

    assert.equal(result.ok, true);
    assert.equal(result.documentPreview.type, "video");
    assert.ok(result.videoTimeline.scenes.length >= 3);
    assert.ok(result.videoTimeline.transcript.includes("Welcome to the demo"));
    assert.ok(result.canvasCards.some((card) => card.id === "video-timeline"));
    const timeline = result.canvasCards.find((card) => card.id === "video-timeline");
    assert.equal(timeline.nodeType, "timeline");
    assert.ok(timeline.content.items[0].frameDataUrl.startsWith("data:image/"));
    assert.equal(result.qaHints.citationStyle, "timestamp");
  });
});
