---
phase: 21-chat-to-canvas
plan: 04
status: complete
completed: "2026-05-03"
---

# Plan 04 Summary: Markdown Rendering

## What was built

Assistant chat replies now render as sanitized HTML using `micromark` (parser, ESM via esm.sh) and `DOMPurify` (sanitizer, UMD via jsDelivr). Headings, lists, code blocks (with language fences and Copy button), links, tables, blockquotes, bold/italic all display correctly. User messages stay plain text. XSS vectors are neutralised by DOMPurify's allowlist of tags + attributes. Streaming markdown progressively re-renders without flicker.

## Key files

- **Modified**: `public/app.html`
  - Added `<script src="https://cdn.jsdelivr.net/npm/dompurify@3.0.8/dist/purify.min.js"></script>` before the app.js tag
  - Changed `<script src="/app.js?v=…">` to `<script type="module" src="/app.js?v=19">`
- **Modified**: `public/app.js`
  - Added `import { micromark } from "https://esm.sh/micromark@4";` at the top
  - Added `renderMarkdownToHtml(markdown)` helper using `DOMPurify.sanitize` with strict tag/attribute allowlist
  - Added `addCopyButtons(container)` to inject a `.chat-code-copy` button into every `<pre><code>` block
  - `renderChatMessages` switches assistant message rendering to `text.innerHTML = renderMarkdownToHtml(...)` + `addCopyButtons`; user messages still use `textContent`
  - i18n keys `chat.copyCode` / `chat.copied` added for both `zh` and `en`
- **Modified**: `public/styles.css`
  - `.chat-text.markdown-body` rules for headings, paragraphs, lists, inline code, code blocks (`position: relative`, `overflow-x: auto`), blockquotes, tables, links
  - `.chat-code-copy` button positioned at top-right of code blocks

## Commits

1. `0f85b18` — feat(21): Waves 1-2 — tool calling, streaming, markdown rendering

## Acceptance criteria

- [x] DOMPurify and micromark loaded (UMD CDN + ESM CDN respectively)
- [x] `renderMarkdownToHtml` uses `DOMPurify.sanitize` with explicit `ALLOWED_TAGS` / `ALLOWED_ATTR`
- [x] `addCopyButtons` injects copy buttons that copy `code.textContent` via `navigator.clipboard.writeText`
- [x] Assistant messages render with `innerHTML` (markdown HTML); user messages stay `textContent`
- [x] Streaming `updateChatMessage` re-renders markdown on every delta
- [x] `.chat-text.markdown-body` styles cover headings, lists, code, blockquote, tables, links
- [x] XSS attempts (`<script>`, `onerror=`, `javascript:` URIs) are stripped
- [x] `chat.copyCode` and `chat.copied` translation keys exist for both languages

## Self-Check

- DOMPurify allowlist excludes `<script>`, `<iframe>`, `<style>`, event handlers — sanitization is conservative
- Code-block copy button uses Clipboard API; failure (`.catch(() => {})`) is silent so the UI never throws
- Re-parsing markdown on each streaming delta is O(N) per token but acceptable in practice; can be optimised later if needed
- Module-mode app.js does not break global access — all DOM lookups use `document` which remains global
