import "server-only";
import { canvasActionListSchema } from "@/core/schemas";
import { summarizeCanvasForModel } from "@/core/canvas";
import { getAnalysisModelConfig } from "@/core/model-providers/config";
import { callStructuredModel } from "@/core/model-providers/openai-compatible";
import type { ArtifactSpec, CanvasDocument, CanvasEditResult } from "@/types/universal";

const system = [
  "你是通用创作画布的编辑模型。",
  "画布由通用节点组成，不得假设存在知乎、网页、PRD 或图片专用模板。",
  "你需要根据用户目标自主创建、修改、移动、缩放或删除节点，让画布成为清晰可执行的创作方案。",
  "只返回受支持的 CanvasAction，不得输出 DOM、JavaScript、CSS、代码节点、Markdown 代码围栏或解释文字。",
  "对象和数组必须保存在 content.data 中，让前端以字段、标签、列表和分组 GUI 展示；不要把对象序列化成 content.text。",
  "不得修改锁定节点，不得绕过 ArtifactSpec 中的 mustInclude、mustAvoid 和 mustKeep。",
  "新增节点 ID 必须唯一，只能使用英文字母、数字、点、下划线和短横线。",
  "画布宽度为 1120，节点必须完整位于画布内：x 不小于 0，且 x + width 不得超过 1120；纵向可以自由延伸到 5000。节点宽度至少 120、高度至少 56。",
].join("\n");

export async function editCanvasWithModel(params: { instruction: string; document: CanvasDocument; spec: ArtifactSpec; selectedNodeIds?: string[] }): Promise<CanvasEditResult> {
  const selected = (params.selectedNodeIds ?? []).filter((id) => params.document.nodes.some((node) => node.id === id));
  const prompt = [
    `编辑目标：${params.instruction}`,
    selected.length ? `优先编辑的节点：${selected.join(", ")}` : "未限定节点，可以自主整理整张画布。",
    "返回格式：{ summary: string, actions: CanvasAction[] }。summary 用一句中文说明修改结果。",
    "可用操作：insert、update、move、resize、remove。",
    "当前通用画布语义树：",
    JSON.stringify(summarizeCanvasForModel(params.document)),
    "不可违反的结构化上下文：",
    JSON.stringify({ artifactKind: params.spec.artifactKind, rawInput: params.spec.rawInput, selectedDirection: params.spec.selectedDirection, decisions: params.spec.decisions, constraints: params.spec.constraints }),
  ].join("\n\n");
  return callStructuredModel({ config: getAnalysisModelConfig(), task: "canvas:edit", system, prompt, schema: canvasActionListSchema, temperature: 0.2 });
}
