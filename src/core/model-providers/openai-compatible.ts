import "server-only";
import type { ZodType } from "zod";
import { extractJsonObject } from "@/lib/validators";
import type { ServerModelConfig } from "@/types/universal";
import { assertModelConfigured, getRoleLabel } from "@/core/model-providers/config";

type StructuredCall<T> = {
  config: ServerModelConfig;
  task: string;
  system: string;
  prompt: string;
  schema: ZodType<T>;
  temperature?: number;
};

export async function callStructuredModel<T>(params: StructuredCall<T>): Promise<T> {
  assertModelConfigured(params.config);
  const first = await requestCompletion(params.config, params.task, params.system, params.prompt, params.temperature ?? 0.15);
  const parsed = parseStructured(params.schema, first);
  if (parsed.success) return parsed.data;

  const repairPrompt = [
    "上一次响应没有通过 JSON Schema 校验。请只输出修复后的一个 JSON 对象，不要解释，不要使用 Markdown 代码块。",
    `校验错误：${parsed.error}`,
    "原始任务：",
    params.prompt,
    "上一次响应：",
    first.slice(0, 16_000),
  ].join("\n\n");
  const repaired = await requestCompletion(params.config, `${params.task}:repair`, params.system, repairPrompt, 0);
  const repairedParsed = parseStructured(params.schema, repaired);
  if (repairedParsed.success) return repairedParsed.data;
  throw new ModelOutputError(`${getRoleLabel(params.config.role)}返回格式无效：${repairedParsed.error}`);
}

async function requestCompletion(config: ServerModelConfig, task: string, system: string, prompt: string, temperature: number) {
  const endpoint = buildChatCompletionsEndpoint(config.baseUrl);
  const startedAt = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.apiKey}` },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: "system", content: system }, { role: "user", content: prompt }],
        temperature,
        stream: false,
      }),
      signal: controller.signal,
    });
    const raw = await response.text();
    if (!response.ok) throw new ModelRequestError(`${getRoleLabel(config.role)}请求失败（HTTP ${response.status}）`, response.status);
    const text = readCompletionText(raw);
    console.info(JSON.stringify({ event: "model_call", role: config.role, task, model: config.model, status: "succeeded", durationMs: Date.now() - startedAt }));
    return text;
  } catch (error) {
    console.error(JSON.stringify({ event: "model_call", role: config.role, task, model: config.model, status: "failed", durationMs: Date.now() - startedAt, error: error instanceof Error ? error.message : String(error) }));
    if (error instanceof ModelRequestError) throw error;
    if (error instanceof Error && error.name === "AbortError") throw new ModelRequestError(`${getRoleLabel(config.role)}请求超时`, 504);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function parseStructured<T>(schema: ZodType<T>, text: string): { success: true; data: T } | { success: false; error: string } {
  try {
    const json = extractJsonObject(text);
    const result = schema.safeParse(json);
    if (result.success) return { success: true, data: result.data };
    return { success: false, error: result.error.issues.map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`).join("; ") };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "无法解析 JSON" };
  }
}

function readCompletionText(raw: string) {
  let data: unknown;
  try { data = JSON.parse(raw); } catch { throw new ModelOutputError("模型接口返回了非 JSON HTTP 响应"); }
  const record = data as { choices?: Array<{ message?: { content?: string | Array<{ text?: string }> } }>; output_text?: string };
  if (typeof record.output_text === "string" && record.output_text.trim()) return record.output_text;
  const content = record.choices?.[0]?.message?.content;
  if (typeof content === "string" && content.trim()) return content;
  if (Array.isArray(content)) {
    const text = content.map((part) => part.text ?? "").join("").trim();
    if (text) return text;
  }
  throw new ModelOutputError("模型接口没有返回有效文本");
}

export function buildChatCompletionsEndpoint(baseUrl: string) {
  const normalized = baseUrl.replace(/\/+$/, "").replace(/\/responses\/?$/, "").replace(/\/chat\/completions\/?$/, "");
  return `${normalized}/chat/completions`;
}

export class ModelRequestError extends Error {
  readonly code = "MODEL_REQUEST_FAILED";
  constructor(message: string, readonly status: number) { super(message); }
}

export class ModelOutputError extends Error {
  readonly code = "MODEL_OUTPUT_INVALID";
}
