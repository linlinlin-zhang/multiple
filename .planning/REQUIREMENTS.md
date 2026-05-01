# Requirements: ORYZAE Image Board — v2.0 Multi-Card Canvas Interaction

**Milestone:** v2.0
**Date:** 2026-05-02

---

## v2.0 Requirements

### Multi-Card (MC)

- [x] **MC-01**: 用户可通过 `/` 功能区的"新建卡片"命令在画布上创建一张空白卡片
- [x] **MC-02**: 新建卡片与初始卡片不同，可以被用户删除
- [x] **MC-03**: 用户可从卡片拖出连接线条到另一张卡片，建立连接关系
- [x] **MC-04**: 当两张卡片通过线条连接后，连接处自动生成一个聚合节点
- [x] **MC-05**: 聚合节点在视觉上与普通卡片有区分（颜色和阴影不同）
- [x] **MC-06**: 当第三张卡片连接到已有连接的两张卡片之一时，自动归入该聚合节点
- [x] **MC-07**: 单个聚合节点最多连接 5 张卡片
- [ ] **MC-08**: 用户双击聚合节点可打开蓝图弹窗
- [ ] **MC-09**: 蓝图弹窗内展示该聚合节点关联的所有卡片
- [ ] **MC-10**: 蓝图弹窗内支持拖动卡片位置
- [ ] **MC-11**: 蓝图弹窗内支持在卡片之间绘制连线，定义上下游或并列关系
- [ ] **MC-12**: 蓝图弹窗内的连线关系可用于指导下一步的探索或成图
- [x] **MC-13**: `/` 功能区移除"放大"命令（zoom-in）
- [x] **MC-14**: `/` 功能区移除"缩小"命令（zoom-out）
- [x] **MC-15**: `/` 功能区移除"历史浏览器"命令（history）
- [x] **MC-16**: `/` 功能区移除"设置"命令（settings）

---

## Future Requirements

- **SRCH-01**: 按关键词搜索历史会话标题和内容
- **SRCH-02**: 按日期范围筛选会话
- **SRCH-03**: 会话文件夹/标签分类
- **SHAR-04**: 分享链接设置过期时间
- **SHAR-05**: 批量导出多个会话为 zip 归档

---

## Out of Scope

- 用户认证与多账户系统 — 当前为单用户本地/自托管场景
- 实时多人协作编辑画布 — 需要 WebSocket + 冲突解决
- 移动端 App — Web 优先，移动端适配仅保证可用性

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| MC-01 | Phase 16 | Done |
| MC-02 | Phase 16 | Done |
| MC-03 | Phase 17 | Done |
| MC-04 | Phase 17 | Done |
| MC-05 | Phase 17 | Done |
| MC-06 | Phase 17 | Done |
| MC-07 | Phase 17 | Done |
| MC-08 | Phase 18 | Pending |
| MC-09 | Phase 18 | Pending |
| MC-10 | Phase 18 | Pending |
| MC-11 | Phase 18 | Pending |
| MC-12 | Phase 18 | Pending |
| MC-13 | Phase 16 | Done |
| MC-14 | Phase 16 | Done |
| MC-15 | Phase 16 | Done |
| MC-16 | Phase 16 | Done |

---

*Created: 2026-05-02*
