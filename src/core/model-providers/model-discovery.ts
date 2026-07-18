import "server-only";
import type { ModelRole } from "@/types/universal";

export async function discoverOpenAIModels(params: { endpoint: string; apiKey: string; role: ModelRole }) {
  const baseUrl = normalizeOpenAIBaseUrl(params.endpoint);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(`${baseUrl}/models`, {
      headers: { Authorization: `Bearer ${params.apiKey}`, "Content-Type": "application/json" },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`模型列表请求失败（HTTP ${response.status}）`);
    const body = await response.json() as { data?: Array<{ id?: string }> };
    const models = [...new Set((body.data ?? []).map((item) => item.id?.trim()).filter((id): id is string => Boolean(id)))];
    if (!models.length) throw new Error("端点没有返回可用模型，请确认它支持 OpenAI GET /models 接口。");
    const textModels = models.filter((id) => !/(image|dall|flux|imagen|embedding|whisper|tts|audio)/i.test(id));
    const imageModels = models.filter((id) => /(image|dall|flux|imagen)/i.test(id));
    const recommendedTextModel = chooseTextModel(textModels.length ? textModels : models, params.role);
    const recommendedImageModel = params.role === "execution" ? chooseImageModel(imageModels) : undefined;
    return { baseUrl, discoveredModels: models, textModels: textModels.length ? textModels : models, imageModels, recommendedTextModel, recommendedImageModel };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw new Error("连接模型端点超时，请检查地址或网络。");
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export function normalizeOpenAIBaseUrl(endpoint: string) {
  const url = new URL(endpoint.trim());
  if (!/^https?:$/.test(url.protocol)) throw new Error("调用端点必须使用 http 或 https。");
  url.search = "";
  url.hash = "";
  url.pathname = url.pathname
    .replace(/\/+$/, "")
    .replace(/\/(chat\/completions|responses|models|images\/generations)\/?$/i, "") || "/v1";
  return url.toString().replace(/\/+$/, "");
}

function chooseTextModel(models: string[], role: ModelRole) {
  const priorities = role === "analysis"
    ? [/(o[134]|reason|thinking|gpt-5|deepseek-r|claude|gemini)/i, /(gpt|deepseek|claude|gemini|qwen)/i]
    : [/(execution|writer|coder|instruct)/i, /(gpt-5|gpt-4|claude|gemini|deepseek|qwen)/i];
  for (const pattern of priorities) {
    const match = models.find((id) => pattern.test(id));
    if (match) return match;
  }
  return models[0];
}

function chooseImageModel(models: string[]) {
  return models.find((id) => /(gpt-image|dall-e|imagen|flux)/i.test(id)) ?? models[0];
}
