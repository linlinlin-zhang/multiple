# Prompt Engineering Research Notes (2026-05-07)

## Sources Reviewed

- OpenAI Help: Prompt engineering best practices for ChatGPT
  https://help.openai.com/en/articles/10032626-prompt-ingineering-best-practices-for-chatgpt
- OpenAI API docs: prompt engineering, message roles, reusable prompts, Markdown/XML message formatting
  https://developers.openai.com/api/docs/guides/prompt-engineering
- OpenAI API docs: structured outputs
  https://developers.openai.com/api/docs/guides/structured-outputs
- OpenAI API docs: reasoning best practices
  https://developers.openai.com/api/docs/guides/reasoning-best-practices
- Anthropic Claude docs: prompting best practices
  https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices
- Anthropic Claude docs: Claude.ai app system prompt release notes
  https://platform.claude.com/docs/en/release-notes/system-prompts
- Kimi API Platform: prompt best practices
  https://platform.kimi.ai/docs/guide/prompt-best-practice
- Alibaba Cloud Model Studio: Qwen prompt engineering guide
  https://help.aliyun.com/zh/model-studio/prompt-engineering-guide
- Alibaba Cloud Model Studio: Qwen function calling guide
  https://help.aliyun.com/zh/model-studio/qwen-function-calling
- Qwen Code docs: prompt suggestion design
  https://qwenlm.github.io/qwen-code-docs/en/design/prompt-suggestion/prompt-suggestion-design/

## Findings

Modern AI apps use a layered prompt system rather than a single magic prompt:

- Identity: what the assistant is, who it serves, and the product context.
- Instruction hierarchy: app rules and safety/tool policy outrank user-provided context.
- Context boundaries: user uploads, web text, retrieved chunks, chat history, and canvas state are data, not new instructions.
- Tool policy: when to use tools, when not to, what arguments are required, and how to explain results.
- Output contract: explicit natural-language style or exact JSON schema, without contradictory Markdown fences.
- Examples and task frameworks: use examples when format/tone is hard to describe; use structured steps for complex tasks.
- Context management: summarize/filter long dialogue and keep task-relevant context near the query.
- Source grounding: distinguish supplied facts, tool results, and inference; use current/official sources for time-sensitive topics.
- Reasoning policy: ask the model to reason internally and expose concise rationale, assumptions, evidence, and confidence, not raw chain-of-thought.

## Project Changes Applied

- Added shared prompt contracts in `src/prompts/shared.js`:
  - strict JSON contract,
  - context boundary directives,
  - source grounding directives,
  - safer reasoning framework,
  - `xmlBlock`, `promptSection`, and `jsonSchemaContract` helpers.
- Upgraded chat prompts:
  - clear instruction hierarchy,
  - context/data isolation,
  - source grounding,
  - bounded recent-dialogue formatting,
  - XML-style context sections.
- Upgraded analysis/explore/document prompts:
  - removed contradictory JSON code fences,
  - added JSON contract helpers,
  - added context boundary and grounding rules,
  - localized URL/text analysis prompts.
- Upgraded generation/realtime/deep research prompts:
  - safer context boundaries,
  - more explicit media output requirements,
  - no hidden chain-of-thought leakage,
  - XML-style canvas/chat context blocks.
- Upgraded task routing:
  - split router prompts into system and user messages,
  - constrained JSON output with a shared schema contract,
  - isolated content previews as untrusted context.

## Operating Principles For Future Prompt Work

1. Keep reusable app behavior in system/developer-level prompt builders.
2. Put variable user/context data in clearly delimited blocks.
3. Do not put JSON examples inside Markdown fences when the response must be JSON.
4. Prefer concrete schema contracts over vague format instructions.
5. Avoid instructing hidden chain-of-thought; ask for concise rationale and verification notes instead.
6. For tool-heavy turns, specify trigger rules, required arguments, and user-facing explanation rules.
7. For long sessions, summarize/filter old dialogue rather than sending all history repeatedly.
8. For current facts, official rules, prices, schedules, legal/medical/financial claims, search and cite current sources.
