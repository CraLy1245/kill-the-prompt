import { z } from "zod";
import { analyzeLogoResponseSchema, finalPromptResponseSchema, generateDetailsResponseSchema } from "@/lib/logoSchemas";
import { buildChatCompletionsEndpoint, resolveTextModel } from "@/lib/modelRegistry";
import { buildTaskPrompt, type LogoTask } from "@/lib/promptContracts";
import { extractJsonObject, parseWithSchema } from "@/lib/validators";
import type { ModelId, ProviderConfig } from "@/types/logo";

const schemas: Record<LogoTask, z.ZodType<unknown>> = {
  analyzeLogo: analyzeLogoResponseSchema,
  generateDetails: generateDetailsResponseSchema,
  buildPrompt: finalPromptResponseSchema,
};

export async function callLogoAI<TInput, TOutput>(params: {
  model?: ModelId;
  providerConfig?: Partial<ProviderConfig>;
  task: LogoTask;
  input: TInput;
}): Promise<TOutput> {
  const selectedModel = resolveTextModel(params.providerConfig ?? params.model);
  const endpoint = buildChatCompletionsEndpoint(selectedModel.baseUrl);
  const apiKey = selectedModel.apiKey;
  const model = selectedModel.id;

  if (!apiKey) {
    throw new Error("分析模型 API Key 缺失，请在模型配置中填写 API Key，或配置 LOGO_TEXT_API_KEY。");
  }

  let lastError: unknown;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const prompt = buildTaskPrompt(params.task, stripTransportConfig(params.input));
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 90000);

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.2,
          stream: false,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`AI request failed: ${response.status} ${errorBody}`);
      }

      const outputText = await readResponseText(response);
      const json = extractJsonObject(outputText);
      return parseWithSchema(schemas[params.task], json) as TOutput;
    } catch (error) {
      lastError = error;
      logAiError(params.task, error);
      if (attempt < 4) {
        await delay(700 * attempt);
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("AI output failed.");
}

function stripTransportConfig<TInput>(input: TInput): TInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) return input;
  const { model: _model, providerConfig: _providerConfig, ...rest } = input as Record<string, unknown>;
  return rest as TInput;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readResponseText(response: Response): Promise<string> {
  const raw = await response.text();
  try {
    const data = JSON.parse(raw);
    const content = data.choices?.[0]?.message?.content;
    if (typeof content === "string" && content.trim()) return content;
    if (Array.isArray(content)) {
      const text = content.map((part) => typeof part?.text === "string" ? part.text : "").join("").trim();
      if (text) return text;
    }
  } catch {
    throw new Error(`AI returned non-JSON response: ${raw.slice(0, 300)}`);
  }

  throw new Error("AI returned an empty chat completion.");
}

function logAiError(task: LogoTask, error: unknown) {
  console.error(
    JSON.stringify({
      task,
      requestTime: new Date().toISOString(),
      errorType: error instanceof Error ? error.name : "UnknownError",
      errorMessage: error instanceof Error ? error.message : String(error),
    }),
  );
}
