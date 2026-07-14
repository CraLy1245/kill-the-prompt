# Logo 图片生成说明

本文档说明项目当前的 Logo 图片生成流程、输出约束、异常处理和验证方式。

## 目标

生图阶段必须返回一张可直接下载和展示的最终 Logo 图片，并满足以下约束：

- 输出画布为 `1024 × 1024`，比例为 1:1。
- 整张图片只展示一个最终 Logo 组合。
- 图形符号只出现一次，品牌名称最多出现一次。
- 不输出主标与缩略标并排、尺寸对比、Logo 系统页、方案网格、多版本或 mockup。
- Logo 保持原始比例，非方形上游结果不会被拉伸或裁切。

## 生成流程

```text
方案确认页生成 Positive / Negative Prompt
  → 结果页提交 /api/generate-image
  → 服务端补充单一 Logo 与 1:1 约束
  → 提交图片生成任务
  → Right Codes 返回 task_id
  → 服务端轮询任务结果
  → 下载并检查真实图片尺寸
  → 必要时归一化为 1024 × 1024 PNG
  → 返回结果页展示和下载
```

## Right Codes 接口

当图片模型 Base URL 指向 Right Codes 的 `/draw/` 接口时，服务端使用异步协议：

```json
{
  "model": "gpt-image-2-vip",
  "prompt": "...",
  "n": 1,
  "size": "1:1",
  "imageSize": "1K",
  "async": true
}
```

提交成功后，接口返回 `task_id`。项目随后轮询：

```text
GET https://www.right.codes/v1/tasks/{task_id}
```

任务完成后读取 `data[0].url` 或 `data[0].b64_json`。其他 OpenAI-compatible 图片服务仍使用同步 Images Generations 请求。

## 防止重复 Logo

重复 Logo 通常不是前端预览造成的，而是模型把提示词理解成品牌展示板，同时绘制主标、缩略标或多个尺寸版本。

项目在两层提示词中增加了约束：

1. 方案 Prompt 契约要求 Positive Prompt 明确单张方形画布和单一 Logo 组合。
2. 生图接口再次补充中英文约束，并在 Negative Prompt 中禁止重复标志、方案对比、Logo sheet、网格、多版本和 mockup。

图片模型仍然具有一定随机性，但这些约束会显著降低重复标志的概率。

## 1:1 输出保障

仅向模型传递 `size: "1:1"` 不能保证供应商一定返回方图，因此服务端会读取图片的真实元数据：

- 已经是 `1024 × 1024`：保留原始图片 URL。
- 不是 `1024 × 1024`：使用 Sharp 等比缩放并完整嵌入白色方形画布，输出 PNG data URL。

该处理使用 `fit: "contain"`，不会拉伸 Logo，也不会裁掉标志内容。

## 错误与超时

- Right Codes 任务状态为 `queued` 或 `in_progress` 时继续轮询。
- 状态为 `failed` 时返回上游错误信息。
- 任务等待超过约 170 秒时返回超时错误。
- 图片 URL 无法读取、返回内容不是有效图片或接口没有图片结果时，接口返回明确错误，不展示错误比例的图片。

## 验证

提交前建议运行：

```bash
npm run typecheck
npm run build
```

可使用 Sharp 检查下载图片：

```js
const metadata = await sharp("generated-logo.png").metadata();
console.log(metadata.width, metadata.height);
```

预期宽高均为 `1024`。

## 相关文件

- `src/app/api/generate-image/route.ts`：生图提交、异步轮询、结果解析和尺寸归一化。
- `src/lib/promptContracts.ts`：最终 Prompt 的单一 Logo 与 1:1 约束。
- `src/app/result/page.tsx`：生成、预览、查看和下载交互。
