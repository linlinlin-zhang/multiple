import { micromark } from "https://esm.sh/micromark@4";
import { gfm, gfmHtml } from "https://esm.sh/micromark-extension-gfm@3";

const testCases = [
  "# 光线与影调：高对比的戏剧性\n\n照片拍摄于...",
  "# 光线与影调：高对比的戏剧性\n\n照片拍摄于...",
  "#　光线与影调：高对比的戏剧性\n\n照片拍摄于...",
  "# 光线与影调：高对比的戏剧性\n\n照片拍摄于...",
  "​# 光线与影调：高对比的戏剧性\n\n照片拍摄于...",
  "    # 光线与影调：高对比的戏剧性\n\n照片拍摄于...",
];

for (const tc of testCases) {
  console.log("--- INPUT ---");
  console.log(JSON.stringify(tc));
  const html = micromark(tc, {
    allowDangerousHtml: false,
    extensions: [gfm()],
    htmlExtensions: [gfmHtml()]
  });
  console.log("--- OUTPUT ---");
  console.log(html);
  console.log();
}
