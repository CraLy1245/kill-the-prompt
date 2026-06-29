export type RawLogoInput = {
  content: string;
};

export type ModelKind = "text" | "image";

export type ModelId = string;

export type PublicModelOption = {
  id: ModelId;
  label: string;
  kind: ModelKind;
};

export type ProviderConfig = {
  apiKey: string;
  baseUrl: string;
  model: ModelId;
};

export type ModelConfig = {
  analysis: ProviderConfig;
  image: ProviderConfig;
};

export type ModelsResponse = {
  textModels: PublicModelOption[];
  imageModels: PublicModelOption[];
  defaults: ModelConfig;
};

export type UsageQuota = {
  limit: number;
  remaining: number;
  resetAt: string;
  resetTimezone?: string;
  used: number;
  usageDate?: string;
};

export type RequirementAnalysis = {
  brandType: string;
  brandName?: string | null;
  targetUsers: string[];
  brandMood: string[];
  preferredElements: string[];
  preferredColors: string[];
  typographyPreference: string;
  applicationScenarios: string[];
  constraints: string[];
  uncertainPoints: string[];
};

export type DesignDirection = {
  id: string;
  title: string;
  suitableFor: string;
  visualKeywords: string[];
  elements: string[];
  colors: string[];
  fonts: string[];
  composition: string;
  reason: string;
};

export type AnalyzeLogoResponse = {
  analysis: RequirementAnalysis;
  directions: DesignDirection[];
  quota?: UsageQuota;
};

export type DetailModuleId =
  | "graphicSubject"
  | "graphicStructure"
  | "complexity"
  | "lineWeight"
  | "fontStyle"
  | "textHierarchy"
  | "colorPalette"
  | "applicationPriority"
  | "avoidanceRules";

export type DetailOption = {
  id: string;
  label: string;
  description: string;
  recommended?: boolean;
};

export type DetailModule = {
  id: DetailModuleId;
  title: string;
  description: string;
  selectionType: "single" | "multiple";
  options: DetailOption[];
};

export type GenerateDetailsResponse = {
  selectedDirectionId: string;
  modules: DetailModule[];
};

export type DetailSelections = Partial<Record<DetailModuleId, string[]>>;

export type LogoPlan = {
  brandType: string;
  brandName?: string | null;
  selectedDirection: string;
  selectedDetails: DetailSelections;
  designKeywords: string[];
  designSummary: string;
  usageScenarios: string[];
};

export type FinalPromptResponse = {
  logoPlan: LogoPlan;
  positivePrompt: string;
  negativePrompt: string;
};

export type LogoFlowState = {
  step: number;
  rawInput: string;
  analysis: RequirementAnalysis | null;
  analysisItems: Array<{ key: string; label: string; text: string }>;
  directions: DesignDirection[];
  selectedDirection: DesignDirection | null;
  directionIndex: number;
  detailModules: DetailModule[];
  detailSelections: DetailSelections;
  detailIndex: number;
  logoPlan: LogoPlan | null;
  planFields: Array<{ key: string; label: string; text: string; wide?: boolean }>;
  positivePrompt: string;
  negativePrompt: string;
  imageUrl: string;
  savedNotice: string;
  isLoading: boolean;
  isGeneratingImage: boolean;
  errorMessage: string | null;
  modelConfig: ModelConfig;
};
