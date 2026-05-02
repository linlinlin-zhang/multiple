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
| PM-01 | TBD | Pending |
| PM-02 | TBD | Pending |
| PM-03 | TBD | Pending |
| RT-01 | TBD | Pending |
| RT-02 | TBD | Pending |
| RT-03 | TBD | Pending |
| RT-04 | TBD | Pending |
| DY-01 | TBD | Pending |
| DY-02 | TBD | Pending |
| DY-03 | TBD | Pending |
| FR-01 | TBD | Pending |
| FR-02 | TBD | Pending |
| FR-03 | TBD | Pending |
| CT-01 | TBD | Pending |
| CT-02 | TBD | Pending |
| CT-03 | TBD | Pending |
| PG-01 | TBD | Pending |
| PG-02 | TBD | Pending |
| PG-03 | TBD | Pending |

---

*Created: 2026-05-02*
