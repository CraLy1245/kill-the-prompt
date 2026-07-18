import "server-only";
import { assertSafeCanvasHtml } from "@/core/canvas-html";
import { getAnalysisModelConfig } from "@/core/model-providers/config";
import { callTextModel } from "@/core/model-providers/openai-compatible";
import type { ArtifactSpec, CanvasDocument, CanvasHtmlEditResult } from "@/types/universal";

const system = [
  "你是通用创作方案页的 HTML 设计与编辑模型。",
  "你要把 ArtifactSpec 变成一个清晰、专业、可阅读的完整 HTML 页面，供用户在安全 iframe 中确认方案。",
  "页面不是最终文章、网页或 PRD，而是对目标、方向、决策、约束和成果结构的可视化说明。",
  "只返回完整的 <!doctype html> 页面并包含内嵌 CSS，不要返回 JSON、解释文字或 Markdown 代码围栏。",
  "禁止 JavaScript、script、事件处理器、iframe、object、embed、表单提交、外部 URL、外部字体、外部图片和网络请求。",
  "页面必须响应式，桌面与 390px 宽度都可读；使用语义化 HTML、清晰标题、分组、列表、标签、表格或时间线。",
  "视觉调性使用暖白纸张背景、深墨文字、梅紫强调、细灰褐分隔线、小圆角和克制阴影；中文展示标题使用衬线字体回退，正文使用系统无衬线字体。",
  "不得显示 JSON、字段 ID、枚举 ID、代码块、Schema、模型提示词或实现细节；必须把它们改写成自然的中文业务文案。",
  "不得改变 ArtifactSpec 的 selectedDirection、decisions、mustInclude、mustAvoid 或 mustKeep，只能改善信息结构、视觉表达和解释方式。",
  "不要展开推理；立即输出页面。页面最多 6 个主要区块，HTML 总长度控制在 8000 字符以内。",
].join("\n");

export async function editCanvasHtmlWithModel(params: { instruction: string; document: CanvasDocument; spec: ArtifactSpec }): Promise<CanvasHtmlEditResult> {
  const currentHtml = params.document.htmlSource === "ai" ? params.document.html?.slice(0, 12_000) : "";
  const prompt = [
    `页面修改目标：${params.instruction}`,
    "请返回完整新页面，不要只返回局部片段。最多 6 个主要区块，HTML 控制在 8000 字符以内。",
    "不可违反的方案上下文：",
    JSON.stringify(canvasHtmlContext(params.spec)),
    currentHtml ? "当前 AI HTML 页面，请在其基础上修改：" : "当前没有 AI HTML 页面，请从零生成：",
    currentHtml,
  ].join("\n\n");
  const config = { ...getAnalysisModelConfig(), timeoutMs: 175_000 };
  const raw = await callTextModel({ config, task: "canvas:html-edit", system, prompt, temperature: 0 });
  const html = extractHtml(raw);
  assertSafeCanvasHtml(html);
  return { summary: summarizeInstruction(params.instruction), html };
}

function canvasHtmlContext(spec: ArtifactSpec) {
  const analysis = spec.analysis as Record<string, unknown>;
  return {
    artifactKind: spec.artifactKind,
    rawInput: spec.rawInput,
    analysis: { intent: analysis.intent, goal: analysis.goal, audience: analysis.audience },
    selectedDirection: spec.selectedDirection,
    decisions: spec.decisions,
    constraints: spec.constraints,
    plan: compactPlan(spec),
  };
}

function compactPlan(spec: ArtifactSpec) {
  if (spec.artifactKind === "writing") return { topic: spec.writing.topic, platform: spec.writing.platform, purpose: spec.writing.purpose, thesis: spec.writing.thesis, structure: spec.writing.structure.map((item) => ({ title: item.title, purpose: item.purpose, keyPoints: item.keyPoints })), tone: spec.writing.tone, targetLength: spec.writing.targetLength };
  if (spec.artifactKind === "image") return { subject: spec.image.subject, scene: spec.image.scene, style: spec.image.style, composition: spec.image.composition, lighting: spec.image.lighting, colors: spec.image.colors, aspectRatio: spec.image.aspectRatio, requiredText: spec.image.requiredText };
  if (spec.artifactKind === "web-page") return { productName: spec.webPage.productName, productPurpose: spec.webPage.productPurpose, primaryGoal: spec.webPage.primaryGoal, sections: spec.webPage.sections.map((item) => ({ title: item.title, purpose: item.purpose })), visualSystem: spec.webPage.visualSystem, responsiveRules: spec.webPage.responsiveRules };
  return { featureName: spec.feature.featureName, problem: spec.feature.problem, targetUsers: spec.feature.targetUsers, userValue: spec.feature.userValue, scope: spec.feature.scope, userFlow: spec.feature.userFlow, screens: spec.feature.screens, risks: spec.feature.risks, successMetrics: spec.feature.successMetrics, acceptanceCriteria: spec.feature.acceptanceCriteria };
}

function extractHtml(raw: string) {
  const cleaned = raw.trim().replace(/^```(?:html)?\s*/i, "").replace(/\s*```$/, "");
  const start = cleaned.search(/<!doctype html>|<html\b/i);
  if (start < 0) throw new Error("分析模型没有返回完整 HTML 页面");
  return cleaned.slice(start);
}

function summarizeInstruction(instruction: string) {
  const concise = instruction.replace(/\s+/g, " ").trim().slice(0, 72);
  return `AI 已按“${concise}”更新 HTML 页面`;
}
