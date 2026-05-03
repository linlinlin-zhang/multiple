---
phase: 21
slug: chat-to-canvas
status: approved
shadcn_initialized: false
preset: none
created: 2026-05-03
---

# Phase 21 — UI Design Contract

> Visual and interaction contract for Chat-to-Canvas Reliability & Conversational UX.
> Scope: chat message rendering, streaming display, action feedback cards.
> Project uses vanilla JS (public/app.js) — no React/shadcn.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none (vanilla JS) |
| Preset | not applicable |
| Component library | none (custom DOM) |
| Icon library | Unicode emoji + inline SVG |
| Font | 'Space Mono', 'Microsoft YaHei', monospace (inherited from global CSS) |

---

## Spacing Scale

Uses existing project scale (multiples of 4):

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon gaps, inline padding |
| sm | 8px | Compact element spacing, action feedback card padding |
| md | 12px | Chat message bubble padding |
| lg | 16px | Chat message vertical margin |
| xl | 24px | Section breaks |

Exceptions: none — matches existing chat panel spacing.

---

## Typography

Inherited from project global styles. Markdown-rendered content must respect:

| Role | Size | Weight | Line Height | Color |
|------|------|--------|-------------|-------|
| Body (chat text) | 14px | 400 | 1.6 | #1F1F1B |
| Heading 1 (md) | 18px | 600 | 1.4 | #1F1F1B |
| Heading 2 (md) | 16px | 600 | 1.4 | #1F1F1B |
| Code inline | 13px | 400 | 1.5 | #d63384 (monospace) |
| Code block | 13px | 400 | 1.5 | #1F1F1B (monospace, dark bg) |
| Action feedback label | 12px | 500 | 1.4 | #4a4a4a |

---

## Color

Inherited from project palette:

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | #ffffff | Chat panel background |
| Secondary (30%) | #f5f5f5 | Code block background, action feedback card bg |
| Accent (10%) | #1F1F1B | Chat text, borders, primary action icons |
| Destructive | #dc2626 | Delete confirmations only |
| Link | #2563eb | Markdown links (rendered via micromark) |

Accent reserved for: action feedback card icons, streaming cursor.

Dark mode (when active): invert Dominant ↔ Secondary, text becomes #f5f5f5.

---

## Components

### Chat Message (Markdown Rendering)

**Structure:**
```
.chat-message-line
  ├── .chat-avatar (assistant/user icon)
  ├── .chat-bubble
  │   ├── .chat-text.markdown-body  ← innerHTML with sanitized markdown
  │   ├── .chat-thinking-panel (collapsible, existing)
  │   ├── .chat-action-feedback[]  ← NEW
  │   └── .chat-artifacts (existing)
```

**Markdown rendering rules:**
- Headings (h1-h3): bold, larger font, margin-top 12px, margin-bottom 8px
- Paragraphs: margin-bottom 8px
- Lists (ul/ol): padding-left 20px, margin-bottom 8px
- Links: color #2563eb, underline on hover
- Code inline: `background: #f0f0f0; padding: 2px 4px; border-radius: 3px;`
- Code blocks: `background: #f5f5f5; padding: 12px; border-radius: 6px; overflow-x: auto; position: relative;`
- Tables: border-collapse, header row with #f0f0f0 background
- Blockquotes: left border 3px solid #ccc, padding-left 12px, color #666

**Security:**
- All HTML must pass through DOMPurify before innerHTML
- Allow: p, h1-h6, ul, ol, li, strong, em, code, pre, blockquote, table, thead, tbody, tr, th, td, a[href], br, hr
- Disallow: script, style, iframe, form, input, on* event handlers

### Streaming Cursor

**Behavior:**
- During SSE stream, append a subtle blinking cursor after the last character
- Cursor: `|` character, color #1F1F1B, animation blink 1s step-end infinite
- Remove cursor when stream ends (final event received)

**CSS:**
```css
.streaming-cursor {
  display: inline-block;
  width: 2px;
  height: 1em;
  background: #1F1F1B;
  animation: blink 1s step-end infinite;
  vertical-align: text-bottom;
  margin-left: 1px;
}
@keyframes blink { 50% { opacity: 0; } }
```

### Action Feedback Card

**Structure:**
```
.chat-action-feedback
  ├── .chat-action-icon (emoji, 16px)
  ├── .chat-action-label (text, e.g., "已创建 plan 卡片")
  └── .chat-action-title (card title, truncated)
```

**Styling:**
- Background: #f5f5f5
- Border-radius: 6px
- Padding: 8px 12px
- Margin-top: 8px
- Display: flex, align-items: center, gap: 8px
- Cursor: pointer (click to focus node)
- Hover: background darkens to #eaeaea

**Icons per action type:**
| Action | Icon |
|--------|------|
| create_plan | 📋 |
| create_todo | ✅ |
| create_note | 📝 |
| create_weather | 🌤 |
| create_map | 🗺 |
| create_link | 🔗 |
| create_code | 💻 |
| create_web_card | 🌐 |
| zoom_in | 🔍+ |
| zoom_out | 🔍- |
| reset_view | 🎯 |

**Copywriting:**
- Chinese: "已创建 {type} 卡片：{title}"
- English: "Created {type} card: {title}"
- Click hint (tooltip): "点击跳转到画布节点"

### Code Block Copy Button

**Structure:**
```
pre
  ├── code
  └── .chat-code-copy (button, absolute top-right)
```

**Styling:**
- Button: position absolute, top 4px, right 4px
- Background: rgba(0,0,0,0.05)
- Border: 1px solid rgba(0,0,0,0.1)
- Border-radius: 4px
- Padding: 2px 8px
- Font-size: 11px
- Hover: background rgba(0,0,0,0.1)

**Behavior:**
- Click: copy code block text to clipboard
- Feedback: button text changes to "已复制" / "Copied!" for 1.5s, then reverts

---

## Copywriting Contract

| Element | Copy (zh) | Copy (en) |
|---------|-----------|-----------|
| Action feedback default | 已执行 {count} 个动作 | {count} actions applied |
| Action feedback plan | 已创建 plan 卡片：{title} | Created plan card: {title} |
| Action feedback todo | 已创建 todo 卡片：{title} | Created todo card: {title} |
| Action feedback note | 已创建 note 卡片：{title} | Created note card: {title} |
| Action feedback weather | 已创建 weather 卡片：{title} | Created weather card: {title} |
| Action feedback map | 已创建 map 卡片：{title} | Created map card: {title} |
| Action feedback link | 已创建 link 卡片：{title} | Created link card: {title} |
| Action feedback code | 已创建 code 卡片：{title} | Created code card: {title} |
| Copy button default | 复制 | Copy |
| Copy button success | 已复制 | Copied! |
| Streaming placeholder | 思考中... | Thinking... |

---

## Responsive Behavior

Chat panel is a fixed sidebar (existing layout). No responsive changes needed for this phase.

Markdown content should wrap naturally within the chat bubble width (~320px min, ~420px max).

Code blocks should scroll horizontally (`overflow-x: auto`) rather than wrap.

---

## Animation

| Element | Animation | Duration | Easing |
|---------|-----------|----------|--------|
| Streaming cursor | blink | 1s | step-end |
| Action feedback card | fade-in + slide-down | 200ms | ease-out |
| Copy button feedback | text swap | instant | — |

No heavy animations — chat messages must feel snappy.

---

## Accessibility

- Action feedback cards must be keyboard-focusable (`tabindex="0"`, `role="button"`)
- Enter/Space on focused card triggers click (focus node)
- Copy button must have `aria-label="复制代码"` / `aria-label="Copy code"`
- Markdown images from user content must have empty alt text (micromark default) or be stripped

---

## Dependencies

| Package | Source | Version | Purpose |
|---------|--------|---------|---------|
| micromark | esm.sh CDN | 4.x | Markdown → HTML |
| micromark-extension-gfm | esm.sh CDN | 4.x | GitHub Flavored Markdown (tables, strikethrough) |
| DOMPurify | jsDelivr CDN | 3.x | HTML sanitization |

**Loading strategy:**
- DOMPurify: UMD build via `<script src="..."></script>` in index.html (exposes global `DOMPurify`)
- micromark: ESM import from `https://esm.sh/micromark@4` in app.js (requires `<script type="module">`)

**CSP consideration:** CDN scripts require `script-src 'self' https://cdn.jsdelivr.net https://esm.sh;`

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS — all copy defined with i18n
- [x] Dimension 2 Visuals: PASS — components specified with structure + styling
- [x] Dimension 3 Color: PASS — inherits project palette, accent usage defined
- [x] Dimension 4 Typography: PASS — sizes/weights/heights specified
- [x] Dimension 5 Spacing: PASS — 4px grid, matches existing chat panel
- [x] Dimension 6 Registry Safety: PASS — no shadcn/registry usage (vanilla JS)

**Approval:** approved 2026-05-03
