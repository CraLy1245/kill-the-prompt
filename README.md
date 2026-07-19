# 让提示词去死

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6)](https://www.typescriptlang.org/)

中文 | [English](README_EN.md)

> 「让提示词去死」不是一个提示词收藏工具，也不只是一个生图工具。它通过可自定义的创作包，把模糊需求转换为结构化方案，再生成图片、文章、网页或产品功能文档。用户负责表达目标和做关键选择，系统负责处理复杂的模型指令与执行细节。

「让提示词去死」基于 [CraLy1245/ai-logo-decision-funnel](https://github.com/CraLy1245/ai-logo-decision-funnel) 增量改造而来。原有 Logo 决策漏斗和图片生成接口保留为兼容路径，Logo 现在也有对应的 `image.logo` 内置创作包。

副标题：**说出想法，做出选择，剩下的交给 AI**

![通用创作工作台首页](design-qa-artifacts/home-desktop.png)

## 快速开始

环境要求：Node.js 20.9 或更高版本、npm 10 或更高版本。

```powershell
git clone https://github.com/CraLy1245/ai-logo-decision-funnel.git
Set-Location ai-logo-decision-funnel
npm install
npm run dev
```

打开 `http://localhost:3000`。进入 `http://localhost:3000/settings`，填写 OpenAI-compatible 端点和 API Key，获取模型列表后分别选择分析模型、执行模型和可选图片模型。真实密钥只保存在本机且不会提交到 Git。

也可以复制 `.env.local.example` 使用环境变量配置：

```powershell
Copy-Item .env.local.example .env.local
```

## 核心流程

```text
用户模糊需求
  → AI 意图分析
  → 多方向探索
  → 用户做关键选择
  → ArtifactSpec
  → AI HTML 方案页（安全预览 + 自然语言修改）
  → 成果编译器
  → 图片 / Markdown / 安全 HTML 预览 / PRD
  → ArtifactSpec Patch 继续修改
```

Prompt、系统指令、网页代码约束和文档结构都是内部编译结果。确认步骤由分析模型直接生成完整 HTML 方案页，并在隔离的 iframe 中渲染；用户看到的是适配当前产品调性的真实页面，而不是 JSON、源码或固定模板。用户可切换桌面、平板和手机预览，用自然语言要求 AI 重排版式、突出重点或强化约束，也可撤销到上一版本。执行模型会同时消费已确认的 `ArtifactSpec` 与 HTML 方案页语义。

内置创作包只定义需要用户做出的高杠杆决策类别，不内置固定答案。每个决策模块的候选选项都由分析模型结合当前输入、需求分析和已选方向动态生成；用户可在决策步骤重新生成整组选项，重新生成会清空旧选择并使下游方案回到待确认状态。自定义创作包仍可明确使用 `preset`，用于确实需要固定合规枚举的业务场景。

## 支持的四类成果

| 类型 | 初版输出 | 编译器 |
| --- | --- | --- |
| `image` | 图片指令和图片结果 | `ImageArtifactCompiler` |
| `writing` | Markdown 文章 | `WritingArtifactCompiler` |
| `web-page` | `WebPageSpec`、HTML、CSS、有限 JS、sandbox 预览 | `WebPageArtifactCompiler` |
| `product-feature` | PRD Markdown 和结构化功能 JSON | `ProductFeatureArtifactCompiler` |

初版内置创作包：

- `image.general`：通用图片创作
- `image.logo`：Logo 设计，迁移原 Logo 流程
- `writing.zhihu-answer`：知乎回答
- `web.saas-landing-page`：SaaS 落地页
- `feature.app-feature`：App 功能设计

## 架构说明

核心层位于 `src/core/`：

- `types/universal.ts`：`ArtifactKind`、`CreationPack`、`ArtifactSpec`、`CanvasDocument`、`CanvasAction`、`ArtifactResult`、Patch 和项目类型。
- `core/schemas.ts`：创作包、四类 ArtifactSpec、通用画布、四类 ArtifactResult 和 Patch 的独立 Zod Schema。
- `core/canvas.ts` / `core/canvas-core.ts` / `core/canvas-html.ts`：HTML 方案页初始化、版本更新、安全校验与模型上下文摘要；旧画布语义节点继续保留用于兼容。
- `core/flow-engine.ts`：动态步骤、流程顺序校验、回退和决策模块适用性。
- `core/pack-registry/`：内置创作包注册中心。
- `core/storage/`：`StorageAdapter` 与 `FileStorageAdapter`，业务层不直接散落使用 `fs`。
- `core/compilers/`：四类成果编译器。
- `core/patch.ts`：受 Schema 验证的受控 Patch 应用器。

页面和状态位于：

- `src/app/`：首页、统一工作区、项目页、创作包管理页和 API 路由。
- `src/components/universal/`：工作区、动态字段、成果预览和安全 iframe。
- `src/store/useWorkspaceStore.ts`：统一工作区状态，替代新流程对 `useLogoFlowStore` 的依赖。
- `src/packs/built-in/*.json`：声明式 JSON 创作包。

通用画布 API：

- `GET /api/canvas/:projectId`：读取 HTML 方案页；旧项目会先生成安全基础页，再由分析模型生成正式页面。
- `PUT /api/canvas/:projectId`：保留给旧版语义节点动作的兼容接口。
- `DELETE /api/canvas/:projectId`：撤销到上一个持久化版本。
- `POST /api/canvas/:projectId/edit`：让分析模型根据自然语言重写完整 HTML 页面，校验安全性后保存为新版本。

## 创作包格式

创作包只能是 JSON，不能携带 JavaScript、TypeScript、Shell、动态 import、React 组件路径或 Node 模块路径。它只能引用系统已注册的字段、步骤、决策模块、成果类型、编译器、渲染器和导出器。

最小结构示例：

```json
{
  "schemaVersion": "1.0",
  "id": "writing.my-answer",
  "name": "我的回答",
  "description": "一个结构化写作流程",
  "version": "1.0.0",
  "artifactKind": "writing",
  "source": "custom",
  "inputFields": [
    { "id": "topic", "label": "主题", "type": "textarea", "required": true }
  ],
  "flow": {
    "steps": [
      { "id": "input", "enabled": true },
      { "id": "analysis", "enabled": true },
      { "id": "review", "enabled": true },
      { "id": "generate", "enabled": true },
      { "id": "refine", "enabled": true }
    ]
  },
  "decisionModules": [],
  "outputConfig": { "formats": ["md", "json"], "preview": "markdown", "allowRefine": true },
  "compilerConfig": { "compilerId": "writing", "rendererId": "writing", "exporterIds": ["markdown", "json"] },
  "validationRules": [],
  "createdAt": "2026-07-18T00:00:00.000Z",
  "updatedAt": "2026-07-18T00:00:00.000Z"
}
```

字段 ID 必须匹配 `^[a-z][a-zA-Z0-9_]{1,40}$`，同一个创作包内不得重复。方向步骤可以关闭；启用时方向数量只能是 2 至 8。`input`、`review`、`generate` 必须启用，步骤顺序由 Schema 和 FlowEngine 校验。

## 本地数据目录

运行后项目数据透明保存在仓库根目录：

```text
.local-data/
├── custom-packs/             # 用户导入或保存的合法 JSON 创作包
├── projects/
│   └── project-id/
│       ├── project.json      # 项目元数据
│       ├── spec.json         # 通过 Zod 的 ArtifactSpec
│       ├── revisions.json    # Patch 修改历史
│       ├── assets/           # 后续本地资产
│       └── outputs/
│           └── result.json   # 通过 Zod 的 ArtifactResult
└── cache/
```

`.local-data/` 已加入忽略规则，不会提交到 Git。相比把项目全塞进 `localStorage`，目录文件更容易备份、移动、导出和排查。

## HTML 方案页与网页成果预览安全说明

确认步骤的 AI HTML 方案页不显示或编辑源码。模型返回的 HTML 在服务端经过白名单式安全检查，禁止脚本、事件处理器、外部资源、网络请求、嵌套页面和动态代码执行；浏览器端再通过无权限 `sandbox` 与严格 CSP 双重隔离。方案页仅允许内联 CSS 和 `data:` 图片。

网页成果不执行任意 React 或 Node.js 代码。预览流程是 `WebPageArtifactSpec → 内置 WebPageCompiler → HTML/CSS/有限 JS → iframe sandbox`。

- iframe 仅使用 `sandbox="allow-scripts"`，不授予主页面同源访问权限。
- 初版不允许外部脚本、网络请求、文件系统访问、Cookie、localStorage、顶层跳转、npm 依赖、`eval` 或 `new Function`。
- 编译器只生成菜单开关等有限交互，脚本独立导出为 `javascript`，预览和导出使用同一份结果。
- CSS 使用 `uc-` 前缀隔离页面样式。

## 开发与验证

```powershell
npm test
npm run typecheck
npm run build
```

设置页先通过 `GET /models` 获取列表，再从下拉框分别选择分析文本模型、执行文本模型和可选的图片模型；服务端会再次校验选择确实来自当前端点。端点既可以是 API 根地址，也可以是完整的 `/chat/completions` 或 `/responses` 地址。

`.env.local.example` 仍保留为部署环境或高级配置的后备方式。设置页保存的本机配置优先于环境变量，通用工作流不会在模型缺失时静默回退到演示结果。

模型职责只分为两个业务角色：

- `analysis`：分析需求、生成方向与决策、构建 `ArtifactSpec`、解析修改 Patch。
- `execution`：只消费已确认的 `ArtifactSpec`，生成文章、网页、PRD 或图片。图片通过 execution 角色下的图片 API 驱动调用。

设置页提交的 API Key 只会发送到本机服务端，并写入被 Git 忽略的 `.local-data/model-settings.json`；公开状态接口不会返回密钥。生产部署应使用受控的服务端密钥存储或环境变量，不应提交本机配置文件。

## 已完成

- 通用成果类型、独立 Zod Schema、声明式创作包和 FlowEngine。
- 五个内置创作包，包含 Logo 迁移包。
- 本地项目目录存储、创作包注册/导入/导出 API、项目 API。
- 统一首页和工作区：流程轨、动态方向、动态决策、ArtifactSpec 确认、成果预览、修改 Patch。
- AI HTML 方案页：模型直接生成完整页面、安全 iframe 展示、桌面/平板/手机预览、版本撤销与自然语言 AI 重写。
- Markdown、PRD JSON、HTML/CSS 导出。
- 安全 iframe 网页预览和有限菜单交互。
- 原 Logo 页面/API 路由保留，旧项目不会因为初版迁移被整体删除。

## 当前限制与下一步

- 通用 AI 工作流已经接入 `core/model-providers/`：分析模型和执行模型独立配置，严格校验 JSON，并在首次格式失败后进行一次修复请求。
- 自定义创作包的可视化编辑器已预留路由，目前可通过安全 JSON API 导入/导出；没有执行任意配置代码的入口。
- 生成图片会复制到项目资产目录，模型调用状态记录在 `model-runs.json`；项目压缩包导出和完整版本回退仍可继续补齐。
- 建议继续增加真实供应商的 staging 合同测试和四类成果的固定回归样例。

## 从旧 Logo 项目迁移

旧流程仍由 `src/store/useLogoFlowStore.ts` 和 `/understanding`、`/directions`、`/details`、`/plan`、`/result` 使用，保证已有图片生成能力不中断。新入口 `/` 使用 `useWorkspaceStore`，Logo 能力对应 `image.logo` 创作包；后续待迁移项目验证完毕后，再删除旧 Logo 专属状态和页面。
