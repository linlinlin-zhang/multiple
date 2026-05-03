# Requirements: ORYZAE Image Board — v2.1 Multi-Scenario Intelligence

**Milestone:** v2.1
**Date:** 2026-05-02

---

## v2.1 Requirements

### Prompt Management (PM)

- [ ] **PM-01**: 将 server.js 中硬编码的 6+ 处 prompt 提取到 `src/prompts/` 模块的模板函数中
- [ ] **PM-02**: Prompt 模板支持 `{{var}}` 变量替换，包含统一的安全指令和输出格式指令
- [ ] **PM-03**: 所有现有 handler（handleAnalyze、handleChat、handleExplore 等）重构为调用 `getPrompt()` 获取 prompt

### Task Routing (RT)

- [ ] **RT-01**: 新增 `POST /api/route-task` 端点，使用 LLM 分析上传内容并返回 `taskType` 分类结果
- [ ] **RT-02**: 支持至少 3 种任务类型：`image_generation`（成图方向）、`research`（内容调研）、`planning`（任务规划）
- [ ] **RT-03**: 分类结果包含置信度分数，低于阈值时自动回退到基于文件格式的默认路由
- [ ] **RT-04**: 前端方向卡片显示任务类型标签（badge），区分不同分析策略的产出

### Chat-Canvas Reliability & Conversational UX (CC)

- [ ] **CC-01**: 后端 server.js 与 prompt 模块共用单一 canvas action 白名单（统一从 shared.js 导入），覆盖全部 7 类富节点（note/plan/todo/weather/map/link/code）及 zoom 类（zoom_in/zoom_out/set_zoom/reset_view）
- [ ] **CC-02**: 用户在对话框输入"做计划/列任务/记笔记/查天气/打开地图/保存链接/写代码片段/放大画布"等自然语言时，对应富节点/视图动作能可靠在画布上落地
- [ ] **CC-03**: chat 端点改为 OpenAI 风格 tool calling 架构：reply 字段为自由 markdown，画布动作通过 tool_calls 抽取；移除"动作编排器 JSON 强制输出"的双重 prompt 覆盖
- [ ] **CC-04**: 移除 "1-3 句"、"闲聊 1-2 句" 等硬性长度约束，改为按用户意图自适应；设置 max_tokens 默认值（≥ 4096），让模型在任务场景输出充分内容
- [ ] **CC-05**: no-thinking 模式默认启用 SSE 流式输出，前端字符级渐进渲染（与 thinking 模式行为一致）
- [ ] **CC-06**: 助手消息内容用 micromark + DOMPurify 渲染为安全 HTML，支持标题、有序/无序列表、代码块（含语言高亮 fence）、链接、表格、粗体/斜体；代码块带复制按钮
- [ ] **CC-07**: 模型异常输出（JSON 解析失败、tool_call 空）时，fallback 动作推断关键词扩展到 plan/todo/note/weather/map/link/code（不仅 web card）
- [ ] **CC-08**: 动作执行后在聊天消息中显示内联反馈卡片（"已创建 plan 卡片：XXX"），点击可跳转到画布对应节点
- [ ] **CC-09**: 端到端验证脚本覆盖至少 12 个 chat→canvas 场景（每类富节点 1 个 + zoom 1 个 + 选中卡片 1 个 + 错误兜底 1 个），全部通过

### Dynamic Directions (DY)

- [ ] **DY-01**: 分析 prompt 改为"根据内容复杂度生成 5-8 条方向"，不再固定 5 条
- [ ] **DY-02**: LLM 响应 JSON 包含 `complexityScore` 字段，反映内容复杂度
- [ ] **DY-03**: 前端画布适配 5-8 张方向卡片的布局，支持动态数量

### File Rendering (FR)

- [ ] **FR-01**: PDF 文件上传后在弹窗中正确渲染预览页面（使用 pdf.js / react-pdf）
- [ ] **FR-02**: 大文件（>20MB）采用服务端流式处理，避免浏览器内存溢出
- [ ] **FR-03**: PPTX 文件支持预览（服务端通过 LibreOffice 转 PDF 渲染，或文本+结构化展示作为回退）

### Context Management (CT)

- [ ] **CT-01**: 共享上下文池：维护一个持久的上下文空间，累积存储会话中的关键信息（分析结果、用户偏好、已生成内容摘要）
- [ ] **CT-02**: 上下文注入策略：将上下文池内容注入 LLM prompt，让模型在充分了解背景的情况下生成方向
- [ ] **CT-03**: 上下文池按主题/卡片组织，支持跨卡片的信息关联（如蓝图关系、聚合节点成员）

### Parallel Generation (PG)

- [ ] **PG-01**: 使用 `Promise.allSettled` 并行生成多条方向，替代当前串行调用
- [ ] **PG-02**: 并发上限控制（默认 3），指数退避重试机制
- [ ] **PG-03**: 部分失败处理：已生成的方向正常展示，失败的方向显示重试按钮

---

## Future Requirements

- **SRCH-01**: 按关键词搜索历史会话标题和内容
- **SRCH-02**: 按日期范围筛选会话
- **SRCH-03**: 会话文件夹/标签分类
- **SHAR-04**: 分享链接设置过期时间
- **SHAR-05**: 批量导出多个会话为 zip 归档

---

## Out of Scope

- 向量数据库（如 Pinecone/Milvus）— PostgreSQL + 共享上下文池足够
- LangChain / LangGraph — 现有 chatCompletions 模式更简洁
- DAG 任务编排 — 线性流程（分类→选prompt→分析→标准化）足够
- 多租户 Prompt 管理 UI — prompt 保持为代码，非用户数据
- 用户可编辑 prompt — 当前为开发者管理的 JSON 文件

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PM-01 | 19 | Pending |
| PM-02 | 19 | Pending |
| PM-03 | 19 | Pending |
| RT-01 | 20 | Pending |
| RT-02 | 20 | Pending |
| RT-03 | 20 | Pending |
| RT-04 | 20 | Pending |
| CC-01 | 21 | Pending |
| CC-02 | 21 | Pending |
| CC-03 | 21 | Pending |
| CC-04 | 21 | Pending |
| CC-05 | 21 | Pending |
| CC-06 | 21 | Pending |
| CC-07 | 21 | Pending |
| CC-08 | 21 | Pending |
| CC-09 | 21 | Pending |
| DY-01 | 22 | Pending |
| DY-02 | 22 | Pending |
| DY-03 | 22 | Pending |
| FR-01 | 23 | Pending |
| FR-02 | 23 | Pending |
| FR-03 | 23 | Pending |
| CT-01 | 24 | Pending |
| CT-02 | 24 | Pending |
| CT-03 | 24 | Pending |
| PG-01 | 25 | Pending |
| PG-02 | 25 | Pending |
| PG-03 | 25 | Pending |

---

*Created: 2026-05-02*
