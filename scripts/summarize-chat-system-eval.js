import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultReportPath = path.join(__dirname, "evals", "artifacts", "chat-system-eval-report.json");
const reportPath = process.argv[2] || defaultReportPath;
const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
const failed = report.results.filter((item) => Array.isArray(item.failures) && item.failures.length);
const buckets = {
  taskType: 0,
  actionCount: 0,
  missingAction: 0,
  forbiddenAction: 0,
  quality: 0,
  keyword: 0,
  http: 0,
  timeout: 0
};

for (const failure of failed) {
  const text = failure.failures.join(" | ");
  if (/taskType/.test(text)) buckets.taskType += 1;
  if (/at least|expected .* actions|got \d+/.test(text)) buckets.actionCount += 1;
  if (/expected any|expected all/.test(text)) buckets.missingAction += 1;
  if (/expected none/.test(text)) buckets.forbiddenAction += 1;
  if (/card quality|thin|quality eval|content card|generic/.test(text)) buckets.quality += 1;
  if (/keywords missing/.test(text)) buckets.keyword += 1;
  if (/HTTP/.test(text)) buckets.http += 1;
  if (/timed out|request failed/.test(text)) buckets.timeout += 1;
}

const byCategory = {};
for (const item of report.results) {
  const category = item.category || "uncategorized";
  byCategory[category] ||= { total: 0, failed: 0, averageCardQuality: 0 };
  byCategory[category].total += 1;
  if (item.failures?.length) byCategory[category].failed += 1;
  byCategory[category].averageCardQuality += Number(item.cardQuality?.averageScore) || 0;
}
for (const summary of Object.values(byCategory)) {
  summary.averageCardQuality = summary.total ? Number((summary.averageCardQuality / summary.total).toFixed(1)) : 0;
}

const weakCards = report.results
  .flatMap((item) => (item.cardQuality?.cards || []).map((card) => ({
    id: item.id,
    type: card.type,
    title: card.title,
    score: card.score,
    issues: card.issues || []
  })))
  .filter((card) => card.score < 70 || card.issues.length)
  .sort((a, b) => a.score - b.score)
  .slice(0, 20);

const summary = {
  reportPath,
  runId: report.runId,
  total: report.total,
  passed: report.passed,
  failed: report.failed,
  passRate: report.passRate,
  averageCardQuality: report.averageCardQuality,
  averageLatencyMs: report.averageLatencyMs,
  progressPath: report.progressPath,
  buckets,
  byCategory,
  topFailures: failed.slice(0, 30).map((item) => ({
    id: item.id,
    category: item.category,
    taskType: item.taskType,
    actionTypes: item.actionTypes,
    averageCardQuality: item.cardQuality?.averageScore,
    failures: item.failures.slice(0, 6)
  })),
  weakCards
};

console.log(JSON.stringify(summary, null, 2));
