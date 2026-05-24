import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const publicApp = fs.readFileSync(path.join(repoRoot, "public", "app.js"), "utf8");
const styles = fs.readFileSync(path.join(repoRoot, "public", "styles.css"), "utf8");

const requiredFunctions = [
  "projectTemplateDefinitions",
  "createProjectTemplateWorkspace",
  "launchProjectTemplate",
  "renderProjectTemplatePicker"
];

for (const functionName of requiredFunctions) {
  assert.ok(publicApp.includes(`function ${functionName}`), `${functionName} must exist`);
}

const templateIds = [
  "academic-research",
  "product-competitive",
  "video-script",
  "visual-style",
  "course-plan",
  "event-plan"
];

for (const id of templateIds) {
  assert.ok(publicApp.includes(`"${id}"`), `template id must exist: ${id}`);
}

for (const key of [
  "projectTemplate.title",
  "projectTemplate.academic.title",
  "projectTemplate.competitive.title",
  "projectTemplate.video.title",
  "projectTemplate.visual.title",
  "projectTemplate.course.title",
  "projectTemplate.event.title"
]) {
  assert.ok(publicApp.includes(key), `translation key must exist: ${key}`);
}

assert.ok(publicApp.includes("PROJECT_TEMPLATE_IDS"), "template id registry must exist");
assert.ok(publicApp.includes("workflow: \"research-agent\""), "research-heavy templates must start the research agent workflow");
assert.ok(publicApp.includes("workflow: \"chat-agent\""), "planning/creative templates must use the chat agent workflow");
assert.ok(publicApp.includes("setSubagentsMode(true, { silent: true })"), "chat-agent templates must enable subagents before execution");
assert.ok(publicApp.includes("skipActionConfirmation: true"), "templates should be one-click usable");
assert.ok(publicApp.includes("renderProjectTemplatePicker()"), "chat empty state must render project templates");
assert.ok(styles.includes(".project-template-grid"), "project template grid must be styled");
assert.ok(styles.includes("@media (max-width: 820px)"), "responsive rules must exist for the workbench layout");

console.log("[test] project templates: PASS");
