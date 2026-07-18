import "server-only";
import { z } from "zod";
import {
  artifactSpecSchema,
  imageArtifactSpecSchema,
  productFeatureArtifactSpecSchema,
  runtimeDecisionModuleSchema,
  webPageArtifactSpecSchema,
  workflowAnalysisResultSchema,
  writingArtifactSpecSchema,
  artifactSpecPatchSchema,
} from "@/core/schemas";
import { getAnalysisModelConfig } from "@/core/model-providers/config";
import { normalizeArtifactDraft } from "@/core/model-providers/artifact-draft-normalizer";
import { callStructuredModel, ModelOutputError } from "@/core/model-providers/openai-compatible";
import type { ArtifactSpec, ArtifactSpecPatch, CreationPack, CreativeDirection } from "@/types/universal";

const system = [
  "你是创作工作流中的分析模型。",
  "你只负责理解需求、区分事实与假设、提出不同方向、生成决策项、构建结构化方案或修改补丁。",
  "不得生成最终文章、最终网页代码、最终 PRD 文档或图片。",
  "只能输出一个 JSON 对象，不得输出 Markdown、解释文字或代码块。",
  "用户未提供的信息必须放入 uncertainPoints 或 assumptions，不得伪造事实。",
].join("\n");

const constraintsSchema = z.object({ mustInclude: z.array(z.string()), mustAvoid: z.array(z.string()), mustKeep: z.array(z.string()) });
const artifactDraftSchema = z.discriminatedUnion("artifactKind", [
  z.object({ artifactKind: z.literal("image"), constraints: constraintsSchema, image: imageArtifactSpecSchema.shape.image }),
  z.object({ artifactKind: z.literal("writing"), constraints: constraintsSchema, writing: writingArtifactSpecSchema.shape.writing }),
  z.object({ artifactKind: z.literal("web-page"), constraints: constraintsSchema, webPage: webPageArtifactSpecSchema.shape.webPage }),
  z.object({ artifactKind: z.literal("product-feature"), constraints: constraintsSchema, feature: productFeatureArtifactSpecSchema.shape.feature }),
]);
const decisionModulesResultSchema = z.object({ decisionModules: z.array(runtimeDecisionModuleSchema) });

export async function analyzeWithModel(params: { rawInput: string; inputValues: Record<string, unknown>; pack: CreationPack }) {
  const directionCount = params.pack.flow.directionConfig?.count ?? 3;
  const prompt = [
    "任务：分析用户需求，输出需求分析、候选方向和运行时决策模块。",
    `成果类型：${params.pack.artifactKind}`,
    `方向数量必须刚好为 ${directionCount}。`,
    `方向差异维度：${JSON.stringify(params.pack.flow.directionConfig?.differenceDimensions ?? [])}`,
    "decisionModules 必须与创作包定义的模块 ID、controlType、required 和 optionSource 一致。ai-generated 模块的每组选项必须紧扣当前用户需求，不得套用固定通用答案；数量必须等于 optionCount。preset 模块才允许原样保留预设 options。",
    "输出结构：{ analysis: { intent, goal, audience: string[], explicitRequirements: string[], constraints: string[], uncertainPoints: string[], assumptions: string[] }, directions: [{ id, title, summary, differences: string[], recommended? }], decisionModules: [...] }",
    "创作包：",
    JSON.stringify(params.pack),
    "用户输入字段：",
    JSON.stringify(params.inputValues),
    "用户原始需求：",
    params.rawInput,
  ].join("\n\n");
  const result = await callStructuredModel({ config: getAnalysisModelConfig(), task: "analyze", system, prompt, schema: workflowAnalysisResultSchema });
  if (result.directions.length !== directionCount) throw new ModelOutputError(`分析模型必须返回 ${directionCount} 个方向，实际返回 ${result.directions.length} 个`);
  const decisionModules = mergeDecisionModules(params.pack, result.decisionModules);
  return { ...result, decisionModules };
}

export async function generateDecisionModulesWithModel(params: { rawInput: string; inputValues: Record<string, unknown>; pack: CreationPack; analysis: Record<string, unknown>; selectedDirection?: CreativeDirection }) {
  const dynamicDefinitions = params.pack.decisionModules.filter((module) => module.optionSource === "ai-generated").map(({ options: _options, ...module }) => module);
  if (!dynamicDefinitions.length) return mergeDecisionModules(params.pack, []);
  const prompt = [
    "任务：只生成运行时决策选项，不要重新分析需求，也不要生成新的方向。",
    "每组候选答案必须针对当前主题、已填信息、分析结果和所选方向具体设计；不同项目应得到不同答案。",
    "选项之间必须代表实质不同的执行路径，避免只替换形容词。标签控制在 4 至 10 个汉字，description 控制在 24 至 48 个汉字并说明选择后的具体影响。",
    "模块 ID、controlType、required 和 optionSource 必须与定义一致；每组 options 数量必须严格等于 optionCount，ID 在本组内唯一。",
    "输出结构：{ decisionModules: [{ id, title, controlType, required, optionSource, optionCount, options: [{ id, label, description, recommended? }] }] }",
    "需要动态生成的模块：",
    JSON.stringify(dynamicDefinitions),
    "当前上下文：",
    JSON.stringify({ rawInput: params.rawInput, inputValues: params.inputValues, analysis: params.analysis, selectedDirection: params.selectedDirection }),
  ].join("\n\n");
  const result = await callStructuredModel({ config: getAnalysisModelConfig(), task: "decision-options", system, prompt, schema: decisionModulesResultSchema, temperature: 0.35 });
  return mergeDecisionModules(params.pack, result.decisionModules);
}

function mergeDecisionModules(pack: CreationPack, generatedModules: z.infer<typeof runtimeDecisionModuleSchema>[]) {
  const runtimeById = new Map(generatedModules.map((module) => [module.id, module]));
  return pack.decisionModules.map((definition) => {
    if (definition.optionSource === "preset") return { ...definition, options: definition.options ?? [] };
    const generated = runtimeById.get(definition.id);
    if (!generated) throw new ModelOutputError(`分析模型缺少决策模块：${definition.id}`);
    const expected = definition.optionCount ?? 3;
    if (generated.options.length < expected) throw new ModelOutputError(`决策模块 ${definition.title} 必须生成 ${expected} 个选项`);
    const options = generated.options.slice(0, expected);
    if (new Set(options.map((option) => option.id)).size !== options.length) throw new ModelOutputError(`决策模块 ${definition.title} 的选项 ID 重复`);
    return { ...definition, options };
  });
}

export async function buildSpecWithModel(params: { projectId: string; pack: CreationPack; rawInput: string; inputValues: Record<string, unknown>; analysis: Record<string, unknown>; selectedDirection?: CreativeDirection; decisions: Record<string, unknown> }): Promise<ArtifactSpec> {
  const writingDefaults = getWritingDefaults(params.pack, params.inputValues);
  const prompt = [
    "任务：把已确认的需求、方向与决策转换成可供执行模型消费的结构化 ArtifactSpec 草稿。",
    `artifactKind 必须是 ${params.pack.artifactKind}。`,
    "只输出成果类型专属字段和 constraints，不要生成最终成果。",
    "草稿结构必须是以下四者之一：",
    "image: { artifactKind, constraints, image }",
    "writing: { artifactKind, constraints, writing }",
    "web-page: { artifactKind, constraints, webPage }",
    "product-feature: { artifactKind, constraints, feature }",
    "constraints 必须包含 mustInclude、mustAvoid、mustKeep 三个字符串数组。",
    params.pack.artifactKind === "writing" ? `writing 必须严格包含：{ topic: string, platform: string, audience: string[], purpose: string, thesis: string, supportingClaims: string[], counterArguments: string[], structure: [{ id: string, title: string, purpose: string, keyPoints: string[] }], tone: string[], targetLength: integer, formattingRules: string[], confirmedFacts: string[], uncertainFacts: string[] }。structure 不得使用字符串数组。platform 默认使用“${writingDefaults.platform}”，tone 必须是字符串数组。` : "",
    "输入：",
    JSON.stringify(params),
  ].join("\n\n");
  const draft = await callStructuredModel({ config: getAnalysisModelConfig(), task: "build-spec", system, prompt, schema: artifactDraftSchema, normalize: (value) => normalizeArtifactDraft(value, writingDefaults) });
  if (draft.artifactKind !== params.pack.artifactKind) throw new ModelOutputError("分析模型返回的成果类型与创作包不一致");
  const now = new Date().toISOString();
  return artifactSpecSchema.parse({
    ...draft,
    schemaVersion: "1.0",
    projectId: params.projectId,
    packId: params.pack.id,
    packVersion: params.pack.version,
    rawInput: params.rawInput,
    analysis: params.analysis,
    selectedDirection: params.selectedDirection,
    decisions: params.decisions,
    createdAt: now,
    updatedAt: now,
  }) as ArtifactSpec;
}

function getWritingDefaults(pack: CreationPack, inputValues: Record<string, unknown>) {
  const rawTone = inputValues.tone;
  const tone = Array.isArray(rawTone) ? rawTone.filter((item): item is string => typeof item === "string" && Boolean(item.trim())) : typeof rawTone === "string" && rawTone.trim() ? [rawTone.trim()] : ["清晰", "克制"];
  const requestedLength = Number(inputValues.target_length);
  return {
    platform: /zhihu|知乎/i.test(`${pack.id} ${pack.name}`) ? "知乎" : pack.name,
    tone,
    targetLength: Number.isFinite(requestedLength) && requestedLength >= 200 ? Math.round(requestedLength) : 1600,
  };
}

export async function buildPatchWithModel(params: { instruction: string; spec: ArtifactSpec }): Promise<ArtifactSpecPatch> {
  const root = params.spec.artifactKind === "image" ? "/image" : params.spec.artifactKind === "writing" ? "/writing" : params.spec.artifactKind === "web-page" ? "/webPage" : "/feature";
  const prompt = [
    "任务：把用户修改要求转换成 JSON Patch 风格的 ArtifactSpecPatch。",
    `只允许修改 ${root} 或 /constraints 下的字段。`,
    "禁止修改 schemaVersion、projectId、artifactKind、packId、packVersion、rawInput、analysis、selectedDirection、decisions、createdAt、updatedAt。",
    "输出：{ reason: string, operations: [{ op: 'replace' | 'add' | 'remove', path: string, value?: unknown }] }。",
    "当前 ArtifactSpec：",
    JSON.stringify(params.spec),
    "用户修改要求：",
    params.instruction,
  ].join("\n\n");
  return callStructuredModel({ config: getAnalysisModelConfig(), task: "build-patch", system, prompt, schema: artifactSpecPatchSchema });
}
