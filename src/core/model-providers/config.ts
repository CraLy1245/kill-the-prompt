import "server-only";
import type { ModelRole, PublicModelRoleStatus, ServerModelConfig } from "@/types/universal";
import { readModelSettingsSync } from "@/core/model-providers/model-settings-store";

const DEFAULT_TEXT_BASE_URL = "https://www.right.codes/codex/v1";
const DEFAULT_IMAGE_BASE_URL = "https://www.right.codes/draw/v1";

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

export function getAnalysisModelConfig(): ServerModelConfig {
  const stored = readModelSettingsSync().analysis;
  return {
    role: "analysis",
    model: stored?.textModel ?? process.env.ANALYSIS_MODEL_ID ?? process.env.RIGHT_CODES_MODEL ?? "",
    baseUrl: normalizeBaseUrl(stored?.baseUrl ?? process.env.ANALYSIS_MODEL_BASE_URL ?? process.env.RIGHT_CODES_BASE_URL ?? DEFAULT_TEXT_BASE_URL),
    apiKey: stored?.apiKey || process.env.ANALYSIS_MODEL_API_KEY || process.env.RIGHT_CODES_API_KEY || "",
    timeoutMs: positiveInteger(process.env.ANALYSIS_MODEL_TIMEOUT_MS, 90_000),
  };
}

export function getExecutionModelConfig(): ServerModelConfig {
  const stored = readModelSettingsSync().execution;
  return {
    role: "execution",
    model: stored?.textModel ?? process.env.EXECUTION_MODEL_ID ?? process.env.RIGHT_CODES_MODEL ?? "",
    baseUrl: normalizeBaseUrl(stored?.baseUrl ?? process.env.EXECUTION_MODEL_BASE_URL ?? process.env.RIGHT_CODES_BASE_URL ?? DEFAULT_TEXT_BASE_URL),
    apiKey: stored?.apiKey || process.env.EXECUTION_MODEL_API_KEY || process.env.RIGHT_CODES_API_KEY || "",
    timeoutMs: positiveInteger(process.env.EXECUTION_MODEL_TIMEOUT_MS, 150_000),
  };
}

export function getExecutionImageConfig(): ServerModelConfig {
  const stored = readModelSettingsSync().execution;
  return {
    role: "execution",
    model: stored?.imageModel ?? process.env.EXECUTION_IMAGE_MODEL_ID ?? process.env.RIGHT_CODES_IMAGE_MODEL ?? "",
    baseUrl: normalizeBaseUrl(stored?.baseUrl ?? process.env.EXECUTION_IMAGE_BASE_URL ?? process.env.RIGHT_CODES_IMAGE_BASE_URL ?? DEFAULT_IMAGE_BASE_URL),
    apiKey: stored?.apiKey || process.env.EXECUTION_IMAGE_API_KEY || process.env.RIGHT_CODES_IMAGE_API_KEY || "",
    timeoutMs: positiveInteger(process.env.EXECUTION_IMAGE_TIMEOUT_MS, 180_000),
  };
}

export function assertModelConfigured(config: ServerModelConfig, transport: "text" | "image" = "text") {
  if (!config.apiKey || !config.model || !config.baseUrl) {
    const prefix = config.role === "analysis" ? "ANALYSIS_MODEL" : transport === "image" ? "EXECUTION_IMAGE" : "EXECUTION_MODEL";
    throw new ModelConfigurationError(`${config.role === "analysis" ? "分析模型" : "执行模型"}未配置，请设置 ${prefix}_BASE_URL、${prefix}_API_KEY 和 ${prefix}_ID。`);
  }
}

export function getPublicUniversalModelStatus(): { analysis: PublicModelRoleStatus; execution: PublicModelRoleStatus; executionImage: PublicModelRoleStatus } {
  const stored = readModelSettingsSync();
  const analysis = getAnalysisModelConfig();
  const execution = getExecutionModelConfig();
  const executionImage = getExecutionImageConfig();
  return {
    analysis: toPublicStatus(analysis, stored.analysis?.discoveredModels),
    execution: toPublicStatus(execution, stored.execution?.discoveredModels),
    executionImage: toPublicStatus(executionImage, stored.execution?.discoveredModels),
  };
}

function toPublicStatus(config: ServerModelConfig, availableModels: string[] = []): PublicModelRoleStatus {
  return { role: config.role, model: config.model, baseUrl: config.baseUrl, configured: Boolean(config.apiKey && config.model && config.baseUrl), availableModels };
}

export function getModelConfigForRole(role: ModelRole) {
  return role === "analysis" ? getAnalysisModelConfig() : getExecutionModelConfig();
}

export class ModelConfigurationError extends Error {
  readonly code = "MODEL_NOT_CONFIGURED";
}

export function getRoleLabel(role: ModelRole) {
  return role === "analysis" ? "分析模型" : "执行模型";
}
