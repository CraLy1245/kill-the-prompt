import type { LogoFlowState, ModelConfig } from "@/types/logo";

export const STORAGE_KEY = "stepic-web-flow-v1";
export const MODEL_STORAGE_KEY = "stepic-web-model-config-v3";
export const LEGACY_MODEL_STORAGE_KEYS = ["stepic-web-model-config-v2", "stepic-web-model-config-v1"];
export const DEFAULT_ANALYSIS_MODEL_ID = "gpt-5.5";
export const DEFAULT_IMAGE_MODEL_ID = "gpt-image-2-vip";
export const DEFAULT_ANALYSIS_BASE_URL = "https://www.right.codes/codex/v1";
export const DEFAULT_IMAGE_BASE_URL = "https://www.right.codes/draw/v1";
export const DEFAULT_MODEL_CONFIG: ModelConfig = {
  analysis: {
    apiKey: "",
    baseUrl: DEFAULT_ANALYSIS_BASE_URL,
    model: DEFAULT_ANALYSIS_MODEL_ID,
  },
  image: {
    apiKey: "",
    baseUrl: DEFAULT_IMAGE_BASE_URL,
    model: DEFAULT_IMAGE_MODEL_ID,
  },
};

export type PersistedLogoFlow = Omit<LogoFlowState, "isLoading" | "errorMessage">;

export function loadFlowState(): Partial<PersistedLogoFlow> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveFlowState(state: PersistedLogoFlow) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearFlowState() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function loadModelConfig(): ModelConfig {
  if (typeof window === "undefined") return DEFAULT_MODEL_CONFIG;
  try {
    const raw = window.localStorage.getItem(MODEL_STORAGE_KEY);
    if (raw) return normalizeModelConfig(JSON.parse(raw));

    for (const key of LEGACY_MODEL_STORAGE_KEYS) {
      const legacyRaw = window.localStorage.getItem(key);
      if (legacyRaw) return normalizeModelConfig(JSON.parse(legacyRaw));
    }

    return DEFAULT_MODEL_CONFIG;
  } catch {
    return DEFAULT_MODEL_CONFIG;
  }
}

export function saveModelConfig(config: ModelConfig) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MODEL_STORAGE_KEY, JSON.stringify(normalizeModelConfig(config)));
}

export function normalizeModelConfig(value: unknown): ModelConfig {
  if (!value || typeof value !== "object") return DEFAULT_MODEL_CONFIG;
  const record = value as Partial<ModelConfig> & {
    analysisModelId?: unknown;
    imageModelId?: unknown;
  };

  return {
    analysis: normalizeProviderConfig(record.analysis, DEFAULT_MODEL_CONFIG.analysis, record.analysisModelId),
    image: normalizeProviderConfig(record.image, DEFAULT_MODEL_CONFIG.image, record.imageModelId),
  };
}

function normalizeProviderConfig(value: unknown, fallback: ModelConfig["analysis"], legacyModel?: unknown) {
  const record = value && typeof value === "object" ? value as Partial<ModelConfig["analysis"]> : {};
  return {
    apiKey: typeof record.apiKey === "string" ? record.apiKey.trim() : fallback.apiKey,
    baseUrl: typeof record.baseUrl === "string" && record.baseUrl.trim() ? record.baseUrl.trim() : fallback.baseUrl,
    model: typeof record.model === "string" && record.model.trim()
      ? record.model.trim()
      : typeof legacyModel === "string" && legacyModel.trim()
        ? legacyModel.trim()
        : fallback.model,
  };
}
