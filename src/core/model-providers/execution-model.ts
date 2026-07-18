import "server-only";
import { productFeatureArtifactResultSchema, webPageArtifactResultSchema, writingArtifactResultSchema } from "@/core/schemas";
import { assertModelConfigured, getExecutionImageConfig, getExecutionModelConfig } from "@/core/model-providers/config";
import { callStructuredModel, ModelOutputError, ModelRequestError } from "@/core/model-providers/openai-compatible";
import type { ArtifactResult, ArtifactSpec, CanvasDocument } from "@/types/universal";

const system = [
  "你是创作工作流中的执行模型。",
  "你只能根据已经确认的 ArtifactSpec 生成最终成果。",
  "不得改变 selectedDirection、decisions 或 constraints，不得新增未经确认的业务事实。",
  "mustInclude 和 mustKeep 必须落实，mustAvoid 必须严格避开。",
  "只能输出一个 JSON 对象，不得输出 JSON 之外的文字或 Markdown 代码围栏。",
].join("\n");

export async function executeArtifactWithModel(spec: ArtifactSpec, canvas?: CanvasDocument): Promise<ArtifactResult> {
  if (spec.artifactKind === "image") throw new Error("图片成果应通过图片执行驱动生成");
  const outputContract = spec.artifactKind === "writing"
    ? "{ artifactKind: 'writing', title: string, markdown: string, outline: string[] }。markdown 必须是完整可发布正文，不是大纲。"
    : spec.artifactKind === "web-page"
      ? "{ artifactKind: 'web-page', pageSpec: object, files: { html: string, css: string, javascript?: string } }。必须输出完整 HTML/CSS；禁止外部脚本、外部网络请求、eval 和 new Function。"
      : "{ artifactKind: 'product-feature', markdown: string, structuredData: object }。markdown 必须包含问题、用户、范围、流程、页面状态、数据、风险、验收标准和测试用例。";
  const prompt = [
    `任务：执行 ${spec.artifactKind} ArtifactSpec，生成最终成果。`,
    `输出合同：${outputContract}`,
    "ArtifactSpec：",
    JSON.stringify(spec),
    canvas ? "用户与 AI 已共同编辑并确认的通用画布。画布是最新的内容组织与表达意图，执行时必须落实；若与 ArtifactSpec 约束冲突，仍以约束为准：" : "",
    canvas ? JSON.stringify(canvas) : "",
  ].join("\n\n");
  const config = getExecutionModelConfig();
  const result: ArtifactResult = spec.artifactKind === "writing"
    ? await callStructuredModel({ config, task: "execute:writing", system, prompt, schema: writingArtifactResultSchema, temperature: 0.45 })
    : spec.artifactKind === "web-page"
      ? await callStructuredModel({ config, task: "execute:web-page", system, prompt, schema: webPageArtifactResultSchema, temperature: 0.2 })
      : await callStructuredModel({ config, task: "execute:product-feature", system, prompt, schema: productFeatureArtifactResultSchema, temperature: 0.2 });
  if (result.artifactKind !== spec.artifactKind) throw new ModelOutputError("执行模型返回的成果类型与 ArtifactSpec 不一致");
  if (result.artifactKind === "web-page") assertSafeWebArtifact(result.files);
  if (result.artifactKind === "product-feature" && spec.artifactKind === "product-feature") return { ...result, structuredData: spec.feature };
  return result;
}

export async function requestExecutionImage(prompt: string, negativePrompt?: string) {
  const config = getExecutionImageConfig();
  assertModelConfigured(config, "image");
  const endpoint = buildImagesEndpoint(config.baseUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.apiKey}` },
      body: JSON.stringify({ model: config.model, prompt, negative_prompt: negativePrompt, size: "1024x1024", response_format: "url" }),
      signal: controller.signal,
    });
    const raw = await response.text();
    if (!response.ok) throw new ModelRequestError(`执行模型图片请求失败（HTTP ${response.status}）`, response.status);
    const data = JSON.parse(raw) as { data?: Array<{ url?: string; b64_json?: string }> };
    const item = data.data?.[0];
    const url = item?.url ?? (item?.b64_json ? `data:image/png;base64,${item.b64_json}` : "");
    if (!url) throw new ModelOutputError("图片执行接口没有返回图片");
    return { url };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw new ModelRequestError("执行模型图片请求超时", 504);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function assertSafeWebArtifact(files: { html: string; css: string; javascript?: string }) {
  const source = `${files.html}\n${files.css}\n${files.javascript ?? ""}`;
  const forbidden = [/<script[^>]+src\s*=/i, /<link\b/i, /<iframe\b/i, /https?:\/\//i, /@import\s+/i, /\bfetch\s*\(/i, /XMLHttpRequest/i, /WebSocket/i, /\beval\s*\(/i, /new\s+Function/i, /javascript\s*:/i];
  if (forbidden.some((pattern) => pattern.test(source))) throw new ModelOutputError("执行模型生成的网页包含被禁止的外部请求或动态代码");
}

function buildImagesEndpoint(baseUrl: string) {
  const normalized = baseUrl.replace(/\/+$/, "").replace(/\/chat\/completions\/?$/, "").replace(/\/images\/generations\/?$/, "");
  return `${normalized}/images/generations`;
}
