# AI Logo Decision Funnel

一个把模糊品牌需求逐步收敛为可执行 Logo 方案、生成提示词与成品图片的 AI 设计工作流。

项目不追求“一句话直接出图”，而是将 Logo 设计拆分为六个可以确认、修改和回退的阶段，让用户在生图前完成高价值决策，从而降低随机性，提高方案与品牌需求的一致性。

> 当前版本：`1.1.0`
>
> 技术栈：Next.js 16、React 19、TypeScript、Tailwind CSS、Zustand、Zod

## 项目定位

传统 AI 生图流程通常把用户的一段自然语言直接交给图片模型。需求中缺失的品牌信息、视觉方向和应用约束会被模型自行补全，结果容易出现风格漂移、信息层级混乱或无法落地的问题。

AI Logo Decision Funnel 在最终生成前增加了一条结构化决策链：

```text
输入需求
  → 理解确认
  → 选择方向
  → 收敛细节
  → 方案确认
  → 生成 Logo
```

每个阶段都会保留结构化结果。用户可以返回上一步修改，也可以在中间阶段编辑 AI 给出的内容，再继续生成。

## 当前功能

### 1. Logo 需求输入

- 使用自然语言描述品牌类型、目标用户、视觉气质和应用场景。
- 提供常用示例需求，可快速填入输入框。
- 支持 `Enter` 提交和 `Shift + Enter` 换行。
- 输入完成后调用分析模型生成结构化需求和设计方向。

### 2. AI 理解确认

- 将需求拆分为品牌类型、品牌名称、目标用户、品牌气质、偏好元素、偏好颜色、字体偏好、应用场景、限制条件和不确定信息。
- 使用三栏布局：左侧显示原始输入和识别概况，中间选择字段，右侧修改字段。
- 列表字段支持顿号、逗号、分号或换行分隔。
- 修改后的理解结果会保存在当前流程中，并自动重新生成设计方向。
- 需求发生变化时会清除旧方向之后的细节、方案、Prompt 和图片，避免复用过期内容。

### 3. 设计方向选择

- 默认生成 5 个差异化设计方向。
- 每个方向包含标题、适用描述、视觉关键词、元素、颜色、字体、构图和推荐理由。
- 使用三栏布局：左侧选择方向，中间查看完整方向，右侧修改当前点击的建议项。
- 中栏的元素、颜色、字体、构图和推荐理由均可单独选择并在 Inspector 中编辑。
- 支持“换一批”，可以直接重新生成，也可以输入新的方向要求后再生成。
- 修改方向会清理下游旧方案，避免新旧数据混用。

### 4. 细节收敛

- 根据已选方向生成 9 个设计模块：
  - 图形主题
  - 图形结构
  - 复杂度
  - 线重
  - 字体风格
  - 文字层级
  - 调色板
  - 应用优先级
  - 规避规则
- 支持单选与多选模块。
- 左栏管理模块，中栏选择方案，右栏查看和修改当前选项名称及描述。
- 选择状态、Inspector 内容和底部完成进度实时联动。
- 只有所有模块都完成配置后，才允许生成 Logo 方案。

### 5. Logo 方案确认

- 汇总品牌类型、品牌名称、设计方向、设计关键词、设计说明与应用场景。
- 自动生成 Positive Prompt 和 Negative Prompt。
- 支持正向、负向 Prompt 切换和复制。
- 可以返回细节页继续修改，也可以重新选择设计方向。

### 6. Logo 图片生成

- 使用确认后的 Prompt 调用 OpenAI-compatible 图片生成接口。
- Right Codes 图片服务使用异步任务协议，并自动轮询生成结果。
- 强制单一 Logo 组合，避免主标、缩略标和不同尺寸版本重复出现。
- 服务端检查图片真实尺寸；非方形结果会等比嵌入 `1024 × 1024` 白色画布。
- 页面包含图片展示区、设计理念卡和生成控制区。
- 图片按比例完整嵌入预览框，不拉伸、不裁切。
- 支持重新生成、查看原图和下载图片。

完整生成流程和接口说明见 [Logo 图片生成说明](IMAGE_GENERATION_GUIDE.md)。

### 7. 模型配置与本地状态

- 分别配置分析模型和生图模型的 API Key、Base URL 与模型名称。
- 支持 OpenAI-compatible Chat Completions 和 Images Generations 接口。
- 模型配置与流程数据保存在当前浏览器的 `localStorage` 中。
- 刷新页面后可以恢复流程；重新开始时会清理旧的下游数据。

## 页面与接口

| 页面 | 路径 | 作用 |
| --- | --- | --- |
| 输入需求 | `/` | 输入 Logo 需求并启动分析 |
| 理解确认 | `/understanding` | 检查和编辑结构化需求 |
| 选择方向 | `/directions` | 比较、编辑或重新生成设计方向 |
| 收敛细节 | `/details` | 完成 9 个细节模块的选择 |
| 方案确认 | `/plan` | 查看方案说明与正负 Prompt |
| 生成 Logo | `/result` | 生成、预览、查看和下载图片 |

| API | 方法 | 作用 |
| --- | --- | --- |
| `/api/analyze-logo` | `POST` | 分析需求并生成设计方向 |
| `/api/generate-details` | `POST` | 根据方向生成细节模块 |
| `/api/build-prompt` | `POST` | 汇总选择并生成最终方案和 Prompt |
| `/api/generate-image` | `POST` | 调用图片模型生成 Logo |
| `/api/models` | `GET` | 返回可用模型和默认配置 |

## 快速开始

### 环境要求

- Node.js 20 或更高版本
- npm 10 或更高版本
- 一个支持 OpenAI-compatible 接口的文本模型服务
- 可选：一个支持 OpenAI-compatible 图片生成接口的服务

### 安装

```bash
git clone https://github.com/CraLy1245/ai-logo-decision-funnel.git
cd ai-logo-decision-funnel
npm install
```

复制环境变量模板：

```bash
cp .env.local.example .env.local
```

Windows PowerShell：

```powershell
Copy-Item .env.local.example .env.local
```

启动开发服务器：

```bash
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。

## 模型配置

项目支持两种配置方式。

### 方式一：页面内配置

点击页面顶部的“模型配置”，分别填写：

- API Key
- Base URL，例如 `https://api.example.com/v1`
- 模型名称

配置保存在当前浏览器中，适合本地开发和快速切换服务商。

### 方式二：环境变量

基础兼容变量：

```env
RIGHT_CODES_API_KEY=your_text_api_key
RIGHT_CODES_BASE_URL=https://www.right.codes/codex/v1
RIGHT_CODES_MODEL=gpt-5.5

RIGHT_CODES_IMAGE_API_KEY=your_image_api_key
RIGHT_CODES_IMAGE_BASE_URL=https://www.right.codes/draw/v1
RIGHT_CODES_IMAGE_MODEL=gpt-image-2-vip
```

通用变量：

| 变量 | 说明 |
| --- | --- |
| `LOGO_TEXT_API_KEY` | 文本模型 API Key |
| `LOGO_TEXT_BASE_URL` | 文本模型 Base URL |
| `LOGO_TEXT_DEFAULT_MODEL` | 默认文本模型名称 |
| `LOGO_TEXT_MODELS` | 可用文本模型，多个值用逗号分隔，可写为 `id\|label` |
| `LOGO_IMAGE_API_KEY` | 图片模型 API Key |
| `LOGO_IMAGE_BASE_URL` | 图片模型 Base URL |
| `LOGO_IMAGE_DEFAULT_MODEL` | 默认图片模型名称 |
| `LOGO_IMAGE_MODELS` | 可用图片模型，格式与文本模型相同 |
| `RIGHT_CODES_IMAGE_SIZE` | 默认图片尺寸，未配置时为 `1024x1024` |

页面内填写的配置优先用于当前请求；未提供时，服务端会回退到环境变量配置。

## 接口兼容要求

### 文本模型

项目会根据 Base URL 请求：

```text
POST {BASE_URL}/chat/completions
```

接口需要返回 OpenAI Chat Completions 风格的数据：

```json
{
  "choices": [
    {
      "message": {
        "content": "{...JSON string...}"
      }
    }
  ]
}
```

模型输出会经过 JSON 提取、Zod Schema 校验和最多 4 次重试。分析、细节和方案生成均使用严格的结构化契约。

### 图片模型

项目会根据 Base URL 请求：

```text
POST {BASE_URL}/images/generations
```

Right Codes `/draw/` 接口使用异步模式，提交参数包含 `async: true`、`n: 1`、`size: "1:1"` 和 `imageSize: "1K"`。接口返回 `task_id` 后，项目轮询站点级任务接口，直到获得最终图片。

其他 OpenAI-compatible 图片服务继续使用同步模式。当前版本可读取 URL 或 Base64 图片结果：

```json
{
  "data": [
    {
      "url": "https://example.com/generated-logo.png"
    }
  ]
}
```

生成结果会在服务端检查实际尺寸，并在必要时归一化为 `1024 × 1024` PNG。

## 常用脚本

```bash
npm run dev        # 启动开发环境
npm run build      # 生产构建
npm run start      # 启动生产服务
npm run typecheck  # TypeScript 类型检查
```

## 项目结构

```text
src/
├─ app/
│  ├─ api/                 # AI 分析、细节、Prompt、生图和模型接口
│  ├─ details/             # 细节收敛页
│  ├─ directions/          # 设计方向页
│  ├─ plan/                # 方案确认页
│  ├─ result/              # Logo 生成页
│  ├─ understanding/       # 需求理解页
│  └─ page.tsx             # 首页需求输入
├─ components/             # 三栏工作区、导航、弹窗和通用组件
├─ lib/
│  ├─ aiClient.ts          # 文本模型请求、重试和结果解析
│  ├─ logoSchemas.ts       # Zod 数据结构
│  ├─ modelRegistry.ts     # 模型与服务端配置解析
│  ├─ promptContracts.ts   # 各阶段提示词契约
│  ├─ storage.ts           # 浏览器本地持久化
│  └─ validators.ts        # JSON 提取与校验
├─ store/                  # Zustand 流程状态和下游清理逻辑
└─ types/                  # 共享 TypeScript 类型
```

## 设计原则

1. **先理解，再生成**：在设计方向之前校准品牌需求。
2. **先发散，再收敛**：先比较方向，再处理图形、字体和颜色细节。
3. **中间结果可编辑**：AI 输出不是只读答案，而是可继续修改的设计数据。
4. **下游结果可失效**：上游发生变化时清理旧方案，避免状态不一致。
5. **结构化输出优先**：模型输出必须通过 Schema，减少 UI 因格式漂移而失效。
6. **最终 Prompt 可迁移**：即使不使用内置生图接口，也可以复制 Prompt 到其他工具。

## 适配其他 AI 产品

这个项目的核心不是 Logo，而是“决策漏斗”。保留流程结构并替换领域 Schema，即可用于：

- 商品图：商品理解 → 视觉方向 → 场景/角度/灯光 → 生图 Prompt
- 广告素材：营销目标 → 创意方向 → 文案/画面/CTA → 投放素材
- 短视频：内容目标 → 叙事方向 → 镜头/节奏/台词 → 视频脚本
- 品牌定位：品牌诊断 → 定位方向 → 价值主张/语气/触点 → 品牌方案
- 室内设计：空间需求 → 风格方向 → 材质/色彩/家具 → 效果图 Prompt

建议保留严格 JSON 契约、可编辑中间状态和上游修改后的下游清理机制。

## 当前限制

- 当前界面优先针对桌面端设计，小屏幕主要提供基础可用性。
- 流程数据保存在浏览器本地，没有账号系统和云端同步。
- API Key 可以在浏览器中配置，仅建议在可信的本地环境使用。
- 图片内容仍受模型随机性影响；项目通过单一 Logo Prompt 约束和尺寸校验降低异常概率。
- 生成质量取决于所使用模型、服务商和 Prompt 执行能力。

## 安全说明

- 不要提交 `.env.local` 或任何真实 API Key。
- 不要把生产密钥写入客户端源码。
- 部署到公开环境时，建议只在服务端配置密钥，并增加鉴权、限流和审计。
- 下载和查看功能会使用图片服务返回的外部 URL，请确保来源可信。

## License

[MIT](LICENSE)
