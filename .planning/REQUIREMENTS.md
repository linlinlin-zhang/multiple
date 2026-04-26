# Requirements: ORYZAE Image Board — Milestone v1.1

**Defined:** 2026-04-26
**Milestone:** v1.1 Canvas Intelligence & Rich Input
**Core Value:** 用户上传一张图，就能在画布上获得 AI 驱动的创作方向并生成新图；刷新页面后历史会话不丢失，可随时翻阅过往探索并查看 AI 对每张生成图的讲解。

---

## v1.1 Requirements

### Canvas Interaction (CANV)

- [ ] **CANV-01**: 工作台对话框背景框删除，仅保留刚好包围对话框大小的背景
- [ ] **CANV-02**: 画布网格密度提高（当前网格间距缩小约 50%）
- [ ] **CANV-03**: 每个卡片左上角装饰圆点移除
- [ ] **CANV-04**: 节点折叠/展开交互：选择方向生成图片后，未选择的方向卡片自动隐藏到连接点处；单击连接点收纳该节点后未成图的卡片；双击收纳该节点后的全部卡片；三击展开全部节点
- [ ] **CANV-05**: 鼠标滚动画布：直接向上/向下滚动 = 画布内容向上/向下平移；Ctrl + 向上滚动 = 放大画布；Ctrl + 向下滚动 = 缩小画布

### Multi-format Input (INPT)

- [ ] **INPT-01**: 支持上传文本文件（Word / TXT / PDF / PPT），提取文本内容后调用大模型 API 分析，生成创作方向；初始卡片展示文件截图或图标占位
- [x] **INPT-02
**: 支持上传网页链接，调用大模型 API 的网页搜索/摘要能力分析网站内容，生成创作方向；初始卡片展示网页截图或图标占位

### Settings (SETT)

- [ ] **SETT-01**: 设置面板允许用户配置分析 / 对话 / 成图三个角色的 API endpoint、model、API key、 temperature 等参数
- [ ] **SETT-02**: 深色模式切换：全局主题可在 light / dark 之间切换，画布、历史浏览器、设置面板均适配
- [ ] **SETT-03**: 中英文语言切换：UI 文本支持 i18n，用户可在中文/英文之间切换

### Canvas Intelligence & Image Tools (TOOL)

- [x] **TOOL-01
**: 一键整理画布：使用算法自动收缩所有未成图节点，将剩余节点按树形或层级排布得更美观整洁
- [ ] **TOOL-02**: 图片查看弹窗：点击卡片中的图片时，弹出模态框放大展示图片及相关描述
- [x] **TOOL-03
**: 图片修改：在图片查看弹窗中加入「修改」按钮，点击后提供两个选项——一键自动重新生成，或在文本框中输入自定义修改 prompt
- [x] **TOOL-04
**: 图片下载：在图片查看弹窗中加入「下载」按钮，点击后下载原始图片文件

---

## v2 Requirements (Future)

### Search & Organization

- **SRCH-01**: 按关键词搜索历史会话标题和内容
- **SRCH-02**: 按日期范围筛选会话
- **SRCH-03**: 会话文件夹/标签分类

### Advanced Sharing

- **SHAR-04**: 分享链接设置过期时间
- **SHAR-05**: 批量导出多个会话为 zip 归档

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| 用户认证与多账户系统 | 当前为单用户本地/自托管场景，认证会增加不必要的复杂度 |
| 实时多人协作编辑画布 | 需要 WebSocket + 冲突解决，超出当前范围 |
| 移动端 App | Web 优先，移动端适配仅保证可用性 |
| 视频生成 | 仅支持图片生成 |
| 第三方 OAuth 登录 | 邮件/密码都未引入，OAuth 更不需要 |
| S3/对象存储 | 本地文件存储足够，S3 可作为未来配置项 |
| 实时语音输入 | 超出当前 milestone 范围 |

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CANV-01 | Phase 5 | Pending |
| CANV-02 | Phase 5 | Pending |
| CANV-03 | Phase 5 | Pending |
| CANV-04 | Phase 5 | Pending |
| CANV-05 | Phase 5 | Pending |
| INPT-01 | Phase 6 | Pending |
| INPT-02 | Phase 6 | Pending |
| SETT-01 | Phase 7 | Pending |
| SETT-02 | Phase 7 | Pending |
| SETT-03 | Phase 7 | Pending |
| TOOL-01 | Phase 8 | Pending |
| TOOL-02 | Phase 8 | Pending |
| TOOL-03 | Phase 8 | Pending |
| TOOL-04 | Phase 8 | Pending |

**Coverage:**
- v1.1 requirements: 14 total
- Mapped to phases: 14
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-26*
