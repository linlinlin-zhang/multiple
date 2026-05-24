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
  "academic-paper-explorer",
  "video-storyboarding-assistant",
  "product-competitive-analysis",
  "visual-style-exploration-lab",
  "course-learning-plan-studio"
];

for (const id of templateIds) {
  assert.ok(publicApp.includes(`"${id}"`), `template id must exist: ${id}`);
}

for (const key of [
  "projectTemplate.title",
  "projectTemplate.defaultInputs",
  "projectTemplate.agentWorkflow",
  "projectTemplate.layoutStrategy",
  "projectTemplate.reportFormat",
  "projectTemplate.academicPaper.title",
  "projectTemplate.videoStoryboard.title",
  "projectTemplate.competitiveAnalysis.title",
  "projectTemplate.visualStyle.title",
  "projectTemplate.learningPlan.title"
]) {
  assert.ok(publicApp.includes(key), `translation key must exist: ${key}`);
}

assert.ok(publicApp.includes("PROJECT_TEMPLATE_IDS"), "template id registry must exist");
assert.ok(publicApp.includes("scenarioTaskPackage"), "templates must be upgraded to scenario task packages");
assert.ok(publicApp.includes("defaultInputs"), "scenario packages must declare default input materials");
assert.ok(publicApp.includes("agentWorkflow"), "scenario packages must declare recommended agent workflow");
assert.ok(publicApp.includes("layoutStrategy"), "scenario packages must declare canvas layout strategy");
assert.ok(publicApp.includes("reportFormat"), "scenario packages must declare report format");
assert.ok(publicApp.includes("Academic Paper Explorer"), "academic scenario must be present");
assert.ok(publicApp.includes("Video Storyboarding Assistant"), "video scenario must be present");
assert.ok(publicApp.includes("Product Competitive Analysis"), "competitive scenario must be present");
assert.ok(publicApp.includes("workflow: \"research-agent\""), "research-heavy templates must start the research agent workflow");
assert.ok(publicApp.includes("workflow: \"chat-agent\""), "planning/creative templates must use the chat agent workflow");
assert.ok(publicApp.includes("setSubagentsMode(true, { silent: true })"), "chat-agent templates must enable subagents before execution");
assert.ok(publicApp.includes("skipActionConfirmation: true"), "templates should be one-click usable");
assert.ok(publicApp.includes("renderProjectTemplatePicker()"), "chat empty state must render project templates");
assert.ok(styles.includes(".project-template-grid"), "project template grid must be styled");
assert.ok(styles.includes(".project-template-meta"), "project template cards must show package metadata");
assert.ok(styles.includes("@media (max-width: 820px)"), "responsive rules must exist for the workbench layout");

console.log("[test] project templates: PASS");
