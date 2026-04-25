# Requirements: ORYZAE Image Board

**Defined:** 2026-04-25
**Core Value:** 用户上传一张图，就能在画布上获得 AI 驱动的创作方向并生成新图；刷新页面后历史会话不丢失，可随时翻阅过往探索并查看 AI 对每张生成图的讲解。

## v1 Requirements

### Persistence

- [ ] **PERS-01**: 刷新页面后不丢失当前画板工作（节点位置、生成图、聊天记录）
- [ ] **PERS-02**: 每次会话保存后可按时间线回溯历史会话列表
- [ ] **PERS-03**: 历史会话由 AI 自动生成简短标题（基于分析摘要）
- [ ] **PERS-04**: 上传原图和生成图存储在服务端文件系统，不在内存或数据库中保留 base64
- [ ] **PERS-05**: 自动保存：画布状态变化后延迟 2 秒自动写入数据库

### History Browser UI

- [ ] **HIST-01**: 文件柜式历史浏览 UI：顶部文件夹标签 = 历史会话，侧边栏 = 会话内素材列表，右侧 = 详情页
- [ ] **HIST-02**: 侧边栏素材类型支持：生成图片、网页链接、上传文件、聊天记录片段
- [ ] **HIST-03**: 右侧详情页对每张生成图调用大模型 API 生成内容讲解
- [ ] **HIST-04**: 从画布界面可一键跳转到历史浏览器，从历史浏览器可打开会话回到画布
- [ ] **HIST-05**: 历史浏览器渲染只读节点图缩略概览（轻量级，非完整画布）

### Sharing

- [ ] **SHAR-01**: 生成只读分享链接，他人可查看完整会话节点图
- [ ] **SHAR-02**: 分享链接为不可变快照，所有者后续编辑不影响已分享内容
- [ ] **SHAR-03**: 支持导出 JSON 备份文件，可导入恢复会话

### Data Layer

- [ ] **DATA-01**: 使用 PostgreSQL + Prisma ORM 持久化会话、节点、图片元数据
- [ ] **DATA-02**: Prisma schema 包含 Session、Node、Link、Asset、ShareToken 模型
- [ ] **DATA-03**: 数据库操作使用事务包裹多表写入，避免数据不一致
- [ ] **DATA-04**: Demo 模式生成的数据在 schema 中标记，不与真实会话混合

## v2 Requirements

### Search & Organization

- **SRCH-01**: 按关键词搜索历史会话标题和内容
- **SRCH-02**: 按日期范围筛选会话
- **SRCH-03**: 会话文件夹/标签分类

### Advanced Sharing

- **SHAR-04**: 分享链接设置过期时间
- **SHAR-05**: 批量导出多个会话为 zip 归档

## Out of Scope

| Feature | Reason |
|---------|--------|
| 用户认证与多账户系统 | 当前为单用户本地/自托管场景，认证会增加不必要的复杂度 |
| 实时多人协作编辑画布 | 需要 WebSocket + 冲突解决，超出 v1 范围 |
| 移动端 App | Web 优先，移动端适配仅保证可用性 |
| 视频生成 | 仅支持图片生成 |
| 第三方 OAuth 登录 | 邮件/密码都未引入，OAuth 更不需要 |
| S3/对象存储 | 本地文件存储足够，S3 可作为未来配置项 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PERS-01 | Phase 1 | Pending |
| PERS-02 | Phase 1 | Pending |
| PERS-03 | Phase 4 | Pending |
| PERS-04 | Phase 1 | Pending |
| PERS-05 | Phase 1 | Pending |
| HIST-01 | Phase 2 | Pending |
| HIST-02 | Phase 2 | Pending |
| HIST-03 | Phase 4 | Pending |
| HIST-04 | Phase 2 | Pending |
| HIST-05 | Phase 2 | Pending |
| SHAR-01 | Phase 3 | Pending |
| SHAR-02 | Phase 3 | Pending |
| SHAR-03 | Phase 3 | Pending |
| DATA-01 | Phase 1 | Pending |
| DATA-02 | Phase 1 | Pending |
| DATA-03 | Phase 1 | Pending |
| DATA-04 | Phase 1 | Pending |

**Coverage:**
- v1 requirements: 17 total
- Mapped to phases: 17
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-25*
*Last updated: 2026-04-25 after roadmap creation*
