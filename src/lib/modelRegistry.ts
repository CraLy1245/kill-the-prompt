import type { ModelConfig, ModelId, ModelKind, ProviderConfig, PublicModelOption } from "@/types/logo";

type ServerModelOption = PublicModelOption & {
  apiKey?: string;
  baseUrl: string;
};

const DEFAULT_TEXT_MODEL = "gpt-5.5";
const DEFAULT_IMAGE_MODEL = "gpt-image-2-vip";
const DEFAULT_TEXT_BASE_URL = "https://www.right.codes/codex/v1";
const DEFAULT_IMAGE_BASE_URL = "https://www.right.codes/draw/v1";

export function getPublicModels() {
  const textModels = getTextModels().map(toPublicModel);
  const imageModels = getImageModels().map(toPublicModel);
  return {
    textModels,
    imageModels,
    defaults: getDefaultModelConfig(),
  };
}

export function getDefaultModelConfig(): ModelConfig {
  const textModels = getTextModels();
  const imageModels = getImageModels();
  return {
    analysis: toProviderConfig(resolveServerModel(process.env.LOGO_TEXT_DEFAULT_MODEL, textModels), ""),
    image: toProviderConfig(resolveServerModel(process.env.LOGO_IMAGE_DEFAULT_MODEL, imageModels), ""),
  };
}

export function resolveTextModel(config?: Partial<ProviderConfig> | ModelId) {
  return resolveRequestModel(config, getTextModels());
}

export function resolveImageModel(config?: Partial<ProviderConfig> | ModelId) {
  return resolveRequestModel(config, getImageModels());
}

export function buildChatCompletionsEndpoint(baseUrl: string) {
  const normalized = normalizeBaseUrl(baseUrl)
    .replace(/\/responses\/?$/, "")
    .replace(/\/chat\/completions\/?$/, "");
  return `${normalized}/chat/completions`;
}

export function buildImagesEndpoint(baseUrl: string) {
  const normalized = normalizeBaseUrl(baseUrl)
    .replace(/\/chat\/completions\/?$/, "")
    .replace(/\/images\/generations\/?$/, "");
  return `${normalized}/images/generations`;
}

function getTextModels(): ServerModelOption[] {
  return parseModels({
    fallbackBaseUrl: process.env.RIGHT_CODES_BASE_URL ?? DEFAULT_TEXT_BASE_URL,
    fallbackModel: process.env.RIGHT_CODES_MODEL ?? DEFAULT_TEXT_MODEL,
    kind: "text",
    modelsValue: process.env.LOGO_TEXT_MODELS,
    apiKey: process.env.LOGO_TEXT_API_KEY ?? process.env.RIGHT_CODES_API_KEY,
    baseUrl: process.env.LOGO_TEXT_BASE_URL ?? process.env.RIGHT_CODES_BASE_URL ?? DEFAULT_TEXT_BASE_URL,
  });
}

function getImageModels(): ServerModelOption[] {
  return parseModels({
    fallbackBaseUrl: process.env.RIGHT_CODES_IMAGE_BASE_URL ?? DEFAULT_IMAGE_BASE_URL,
    fallbackModel: process.env.RIGHT_CODES_IMAGE_MODEL ?? DEFAULT_IMAGE_MODEL,
    kind: "image",
    modelsValue: process.env.LOGO_IMAGE_MODELS,
    apiKey: process.env.LOGO_IMAGE_API_KEY ?? process.env.RIGHT_CODES_IMAGE_API_KEY,
    baseUrl: process.env.LOGO_IMAGE_BASE_URL ?? process.env.RIGHT_CODES_IMAGE_BASE_URL ?? DEFAULT_IMAGE_BASE_URL,
  });
}

function parseModels(params: {
  apiKey?: string;
  baseUrl: string;
  fallbackBaseUrl: string;
  fallbackModel: string;
  kind: ModelKind;
  modelsValue?: string;
}): ServerModelOption[] {
  const entries = params.modelsValue
    ?.split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (!entries?.length) {
    return [
      {
        id: params.fallbackModel,
        label: labelFromId(params.fallbackModel),
        kind: params.kind,
        apiKey: params.apiKey,
        baseUrl: params.baseUrl || params.fallbackBaseUrl,
      },
    ];
  }

  return entries.map((entry) => {
    const [idPart, labelPart] = entry.split("|").map((part) => part.trim());
    return {
      id: idPart,
      label: labelPart || labelFromId(idPart),
      kind: params.kind,
      apiKey: params.apiKey,
      baseUrl: params.baseUrl || params.fallbackBaseUrl,
    };
  });
}

function resolveServerModel(modelId: ModelId | undefined, models: ServerModelOption[]) {
  return models.find((model) => model.id === modelId) ?? models[0];
}

function resolveRequestModel(config: Partial<ProviderConfig> | ModelId | undefined, models: ServerModelOption[]) {
  if (typeof config === "object" && config) {
    const model = config.model?.trim();
    const baseUrl = config.baseUrl?.trim();
    const apiKey = config.apiKey?.trim();
    if (model && baseUrl) {
      return {
        id: model,
        label: labelFromId(model),
        kind: models[0].kind,
        baseUrl,
        apiKey,
      };
    }
    if (model) return resolveServerModel(model, models);
  }

  return resolveServerModel(typeof config === "string" ? config : undefined, models);
}

function toPublicModel(model: ServerModelOption): PublicModelOption {
  return {
    id: model.id,
    label: model.label,
    kind: model.kind,
  };
}

function toProviderConfig(model: ServerModelOption, apiKey: string): ProviderConfig {
  return {
    apiKey,
    baseUrl: model.baseUrl,
    model: model.id,
  };
}

function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

function labelFromId(id: string) {
  return id
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
