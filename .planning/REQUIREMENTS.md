# Requirements: ORYZAE Image Board — Milestone v1.3

**Defined:** 2026-05-01
**Core Value:** 用户上传一张图，就能在画布上获得 AI 驱动的创作方向并生成新图；刷新页面后历史会话不丢失，可随时翻阅过往探索并查看 AI 对每张生成图的讲解。

## v1.3 Requirements

### Library Core (LIB)

- [ ] **LIB-01**: 导航栏新增素材库入口，点击后跳转到独立素材库页面
- [ ] **LIB-02**: 工作台上传的文件自动同步到素材库（图片、PDF、PPT、TXT、Word、视频）
- [ ] **LIB-03**: 素材库文件数量上限 100 个，超出时提示用户

### Display (LIB)

- [ ] **LIB-04**: 素材库页面采用瀑布流布局展示文件
- [ ] **LIB-05**: PDF/PPT/视频等非图片文件显示封面或首页缩略图

### Search & Sort (LIB)

- [ ] **LIB-06**: 支持按文件名关键词搜索过滤
- [ ] **LIB-07**: 支持多种排序方式：修改日期、加入日期、文件名字母序、文件大小

### File Management (LIB)

- [ ] **LIB-08**: 支持删除素材库中的文件

## Future Requirements

Deferred to future milestones.

### Search & Classification (existing backlog)

- **SRCH-01**: 按关键词搜索历史会话标题和内容
- **SRCH-02**: 按日期范围筛选会话
- **SRCH-03**: 会话文件夹/标签分类

### Sharing (existing backlog)

- **SHAR-04**: 分享链接设置过期时间
- **SHAR-05**: 批量导出多个会话为 zip 归档

## Out of Scope

| Feature | Reason |
|---------|--------|
| 素材库拖拽到画布 | v1.3 仅做存储管理，拖拽交互延后 |
| 素材库文件编辑 | 素材库为只读存储，编辑在工作台完成 |
| 用户认证与多账户 | 当前为单用户本地场景 |
| 实时多人协作 | 需要 WebSocket + 冲突解决，超出范围 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| LIB-01 | Phase 14 | Pending |
| LIB-02 | Phase 15 | Pending |
| LIB-03 | Phase 13 | Pending |
| LIB-04 | Phase 14 | Pending |
| LIB-05 | Phase 14 | Pending |
| LIB-06 | Phase 14 | Pending |
| LIB-07 | Phase 14 | Pending |
| LIB-08 | Phase 15 | Pending |

**Coverage:**
- v1.3 requirements: 8 total
- Mapped to phases: 8
- Unmapped: 0

---
*Requirements defined: 2026-05-01*
*Last updated: 2026-05-01 — roadmap created, all 8 requirements mapped*
