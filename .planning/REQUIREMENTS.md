# Requirements: ORYZAE Image Board — Milestone v1.2

**Defined:** 2026-04-26
**Milestone:** v1.2 Interactive Canvas & Deep Analysis
**Core Value:** 用户通过选中卡片与画布深度交互，选择快速分析或深度探索模式，自定义卡片名称，并通过对话框直接控制生成方向。

---

## v1.2 Requirements

### Card Selection & Interaction (SEL)

- [ ] **SEL-01**: 双击卡片可选中卡片，选中后卡片被主题色蓝色细线持久包围（区别于 hover 时的短暂高亮）。对话框的对话始终作用于当前被选中的卡片。再次双击同一卡片取消选中。无选中卡片时对话框禁用输入。
- [ ] **SEL-02**: 当用户尝试在无选中卡片时于对话框中输入，画布上方出现短暂弹窗提示"请先双击选中一张卡片"。
- [ ] **SEL-03**: 卡片右上角悬停显示半透明圆叉删除按钮，点击删除该卡片。初始卡片（source 节点）不可删除，有子节点延伸的卡片不可删除。
- [ ] **SEL-04**: 双击卡片名称区域可编辑卡片名称，便于用户整理脉络。按 Enter 或失焦保存，按 Esc 取消。

### Research Mode (RMOD)

- [ ] **RMOD-01**: 卡片右下方原"分析"按钮改为"研究"按钮，直接点击无法触发，需悬停展开下拉菜单。
- [ ] **RMOD-02**: 下拉菜单包含"分析"和"探索"两个选项，悬停时各自显示气泡提示：
  - 分析：调用大模型 no-thinking 模式，快速视觉分析
  - 探索：调用大模型 thinking 模式，深入思考并搜集相关资料
- [ ] **RMOD-03**: "探索"模式分析时，大模型除返回创作方向外，还搜集相关的网站、资料文档、参考图片等背景资料，这些资料存储在方向卡片的数据中。
- [ ] **RMOD-04**: 对于包含探索资料的方向卡片，双击该卡片弹出资料弹窗，展示该方向所搜集到的相关资源（链接、文档摘要、参考图等），卡片上的文字仍保持为总结方向。

### Dialog & Generation Control (DGEN)

- [ ] **DGEN-01**: 对话框必须绑定到当前选中的卡片：所有对话上下文、生成操作均以选中卡片为锚点。
- [ ] **DGEN-02**: 允许用户不通过研究按钮，而是直接选中任意卡片后在对话框中输入约束/方向描述，系统据此生成新的成图方向节点（作为该卡片的子节点）。
- [ ] **DGEN-03**: 对话框发送按钮左侧添加思考模式切换选择框，默认显示"思考 ∨"，透明样式，悬停时变为半透明并展开选项（thinking / no-thinking）。所选模式影响本次对话及生成请求的模型参数。

### Image Sharing (ISH)

- [ ] **ISH-01**: 在双击图片卡片打开的查看弹窗下方，添加一个圆形分享按钮。
- [ ] **ISH-02**: 点击分享按钮生成一个独立的分享网页（类似现有会话分享，但仅针对单张图片及其 AI 讲解）。
- [ ] **ISH-03**: 分享网页包含：图片、AI 讲解、原图分析摘要、生成方向说明。

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| 多卡片同时选中 | 单选模型足够，多选增加复杂度 |
| 卡片拖拽排序 | 画布已有自由拖拽布局，无需额外排序 |
| 资料自动爬取网页全文 | 仅存储模型返回的资料摘要和链接，不深爬 |

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SEL-01 | Phase 9 | Pending |
| SEL-02 | Phase 9 | Pending |
| SEL-03 | Phase 9 | Pending |
| SEL-04 | Phase 9 | Pending |
| DGEN-01 | Phase 10 | Pending |
| DGEN-02 | Phase 10 | Pending |
| DGEN-03 | Phase 10 | Pending |
| RMOD-01 | Phase 11 | Pending |
| RMOD-02 | Phase 11 | Pending |
| RMOD-03 | Phase 11 | Pending |
| RMOD-04 | Phase 11 | Pending |
| ISH-01 | Phase 12 | Pending |
| ISH-02 | Phase 12 | Pending |
| ISH-03 | Phase 12 | Pending |

**Coverage:**
- v1.2 requirements: 14 total
- Mapped to phases: 14
- Unmapped: 0

---

*Requirements defined: 2026-04-26*
