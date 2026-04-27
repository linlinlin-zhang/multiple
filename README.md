# ORYZAE / Image Board

一个画布式图片生成探索原型：用户上传图片，后端先调用视觉大模型分析内容，再在画布上生成多条可选择的创作方向。用户点击某个方向后，后端调用成图模型生成图片，并把原本的方向说明移动到生成图下方。

## 运行

```bash
npm run dev
```

打开：

```text
http://localhost:3000
```

## 接入真实模型

复制 `.env.example` 为 `.env`，填入：

```bash
OPENAI_API_KEY=你的 key
```

默认按三类模型拆到不同 API：

```bash
KIMI_API_KEY=Kimi key（对话和视觉理解共用）
CHAT_API_BASE_URL=https://api.moonshot.cn/v1
CHAT_MODEL=kimi-k2.6

ANALYSIS_API_BASE_URL=https://api.moonshot.cn/v1
ANALYSIS_MODEL=kimi-k2.6

TENCENT_TOKENHUB_API_KEY=成图模型 key
IMAGE_API_BASE_URL=https://tokenhub.tencentmaas.com/v1/api/image
IMAGE_MODEL=hy-image-v3.0
```

没有 key 时应用会自动进入 demo 模式：分析结果和成图节点都会用本地模拟数据生成，方便先调交互。

说明：TokenHub HY-Image-V3.0 的参考图参数要求可访问图片 URL。当前本地上传图会先经分析模型转成生成提示词，再提交给成图模型；如果后续接入对象存储或公网图片 URL，可以把 URL 传入生成接口的 `imageUrl`。

## API

- `POST /api/analyze`
  - 入参：`{ imageDataUrl, fileName }`
  - 出参：图片摘要、关键词、创作方向 options

- `POST /api/chat`
  - 入参：`{ message, imageDataUrl, analysis, messages }`
  - 出参：`{ reply, provider, model }`

- `POST /api/generate`
  - 入参：`{ imageDataUrl, option }`
  - 出参：`{ imageDataUrl, prompt, provider }`
