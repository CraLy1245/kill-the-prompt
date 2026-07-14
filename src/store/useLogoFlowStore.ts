"use client";

import { create } from "zustand";
import type {
  AnalyzeLogoResponse,
  DesignDirection,
  DetailModule,
  DetailModuleId,
  DetailSelections,
  FinalPromptResponse,
  GenerateDetailsResponse,
  LogoFlowState,
  LogoPlan,
  ModelConfig,
  RequirementAnalysis,
} from "@/types/logo";
import { clearFlowState, DEFAULT_MODEL_CONFIG, loadFlowState, loadModelConfig, saveFlowState, saveModelConfig } from "@/lib/storage";

type FlowPatch = Partial<LogoFlowState>;
export type DirectionEditablePatch = Pick<DesignDirection, "elements" | "colors" | "fonts" | "composition" | "reason">;

type LogoFlowActions = {
  hydrate: () => void;
  resetSession: () => void;
  resetForNewInput: (rawInput: string) => void;
  goStep: (step: number) => void;
  setAnalysis: (analysis: RequirementAnalysis) => void;
  setAnalyzeResult: (result: AnalyzeLogoResponse) => void;
  replaceDirections: (result: AnalyzeLogoResponse) => void;
  selectDirection: (direction: DesignDirection, index?: number) => void;
  updateSelectedDirection: (patch: DirectionEditablePatch) => void;
  setDirectionIndex: (index: number) => void;
  setDetailsResult: (result: GenerateDetailsResponse) => void;
  setDetailIndex: (index: number) => void;
  toggleDetailOption: (module: DetailModule, optionId: string) => void;
  updateDetailModule: (moduleId: DetailModuleId, patch: Partial<Pick<DetailModule, "title" | "description">>) => void;
  updateDetailOption: (moduleId: DetailModuleId, optionId: string, patch: { label?: string; description?: string }) => void;
  setPromptResult: (result: FinalPromptResponse) => void;
  setImageUrl: (imageUrl: string) => void;
  setSavedNotice: (message: string) => void;
  setLoading: (value: boolean) => void;
  setGeneratingImage: (value: boolean) => void;
  setError: (message: string | null) => void;
  setModelConfig: (config: ModelConfig) => void;
};

const initialState: LogoFlowState = {
  step: 0,
  rawInput: "",
  analysis: null,
  analysisItems: [],
  directions: [],
  selectedDirection: null,
  directionIndex: 0,
  detailModules: [],
  detailSelections: {},
  detailIndex: 0,
  logoPlan: null,
  planFields: [],
  positivePrompt: "",
  negativePrompt: "",
  imageUrl: "",
  savedNotice: "",
  isLoading: false,
  isGeneratingImage: false,
  errorMessage: null,
  modelConfig: DEFAULT_MODEL_CONFIG,
};

export const useLogoFlowStore = create<LogoFlowState & LogoFlowActions>((set, get) => ({
  ...initialState,
  hydrate: () => {
    const modelConfig = loadModelConfig();
    const persisted = loadFlowState();
    if (persisted) {
      set({ ...initialState, ...persisted, modelConfig, isLoading: false, isGeneratingImage: false, errorMessage: null });
      return;
    }
    set({ modelConfig });
  },
  resetSession: () => {
    clearFlowState();
    set({ ...initialState, modelConfig: get().modelConfig });
  },
  resetForNewInput: (rawInput) => {
    clearFlowState();
    set({ ...initialState, rawInput, modelConfig: get().modelConfig });
    persist(get());
  },
  goStep: (target) => {
    const current = get();
    const step = Math.max(0, Math.min(5, target));
    if (step > current.step && !canGoStep(current, step)) return;
    set({ step, errorMessage: null });
    persist(get());
  },
  setAnalyzeResult: (result) => {
    set({
      analysis: result.analysis,
      analysisItems: buildAnalysisItems(result.analysis),
      directions: result.directions,
      selectedDirection: null,
      directionIndex: 0,
      step: 1,
      ...clearAfterAnalysis(),
      errorMessage: null,
    });
    persist(get());
  },
  replaceDirections: (result) => {
    set({
      analysis: result.analysis ?? get().analysis,
      analysisItems: buildAnalysisItems(result.analysis ?? get().analysis),
      directions: result.directions,
      selectedDirection: null,
      directionIndex: 0,
      ...clearAfterDirection(),
      errorMessage: null,
    });
    persist(get());
  },
  setAnalysis: (analysis) => {
    set({
      analysis,
      analysisItems: buildAnalysisItems(analysis),
      directions: [],
      selectedDirection: null,
      directionIndex: 0,
      ...clearAfterAnalysis(),
      errorMessage: null,
    });
    persist(get());
  },
  selectDirection: (direction, index) => {
    const directionIndex = typeof index === "number" ? index : Math.max(0, get().directions.findIndex((item) => item.id === direction.id));
    if (get().selectedDirection?.id === direction.id) {
      set({ directionIndex, errorMessage: null });
      persist(get());
      return;
    }
    set({
      selectedDirection: direction,
      directionIndex,
      ...clearAfterDirection(),
      errorMessage: null,
    });
    persist(get());
  },
  updateSelectedDirection: (patch) => {
    const selected = get().selectedDirection;
    if (!selected) return;
    const updated = { ...selected, ...patch };
    set({
      selectedDirection: updated,
      directions: get().directions.map((direction) => (direction.id === updated.id ? updated : direction)),
      ...clearAfterDirection(),
      errorMessage: null,
    });
    persist(get());
  },
  setDirectionIndex: (index) => {
    set({ directionIndex: index });
    persist(get());
  },
  setDetailsResult: (result) => {
    const selections: DetailSelections = {};
    result.modules.forEach((module) => {
      const recommended = module.options.filter((option) => option.recommended).map((option) => option.id);
      if (recommended.length) selections[module.id] = module.selectionType === "single" ? [recommended[0]] : recommended;
    });
    set({
      detailModules: result.modules,
      detailSelections: selections,
      detailIndex: 0,
      step: 3,
      ...clearAfterDetails(),
      errorMessage: null,
    });
    persist(get());
  },
  setDetailIndex: (index) => {
    set({ detailIndex: index });
    persist(get());
  },
  toggleDetailOption: (module, optionId) => {
    const current = get().detailSelections[module.id] ?? [];
    const nextValues =
      module.selectionType === "single"
        ? current.includes(optionId)
          ? []
          : [optionId]
        : current.includes(optionId)
          ? current.filter((id) => id !== optionId)
          : [...current, optionId];

    set({
      detailSelections: {
        ...get().detailSelections,
        [module.id as DetailModuleId]: nextValues,
      },
      ...clearAfterDetails(),
    });
    persist(get());
  },
  updateDetailModule: (moduleId, patch) => {
    set({
      detailModules: get().detailModules.map((module) =>
        module.id === moduleId
          ? {
              ...module,
              ...patch,
            }
          : module,
      ),
      ...clearAfterDetails(),
      errorMessage: null,
    });
    persist(get());
  },
  updateDetailOption: (moduleId, optionId, patch) => {
    set({
      detailModules: get().detailModules.map((module) =>
        module.id === moduleId
          ? {
              ...module,
              options: module.options.map((option) =>
                option.id === optionId
                  ? {
                      ...option,
                      ...patch,
                    }
                  : option,
              ),
            }
          : module,
      ),
      ...clearAfterDetails(),
      errorMessage: null,
    });
    persist(get());
  },
  setPromptResult: (result) => {
    set({
      logoPlan: result.logoPlan,
      planFields: buildPlanFields(result.logoPlan),
      positivePrompt: result.positivePrompt,
      negativePrompt: result.negativePrompt,
      step: 4,
      imageUrl: "",
      savedNotice: "",
      errorMessage: null,
    });
    persist(get());
  },
  setImageUrl: (imageUrl) => {
    set({ imageUrl, savedNotice: "", errorMessage: null });
    persist(get());
  },
  setSavedNotice: (message) => {
    set({ savedNotice: message });
    persist(get());
  },
  setLoading: (value) => set({ isLoading: value }),
  setGeneratingImage: (value) => set({ isGeneratingImage: value }),
  setError: (message) => set({ errorMessage: message }),
  setModelConfig: (config) => {
    saveModelConfig(config);
    set({ modelConfig: config });
    persist(get());
  },
}));

function persist(state: LogoFlowState) {
  saveFlowState({
    step: state.step,
    rawInput: state.rawInput,
    analysis: state.analysis,
    analysisItems: state.analysisItems,
    directions: state.directions,
    selectedDirection: state.selectedDirection,
    directionIndex: state.directionIndex,
    detailModules: state.detailModules,
    detailSelections: state.detailSelections,
    detailIndex: state.detailIndex,
    logoPlan: state.logoPlan,
    planFields: state.planFields,
    positivePrompt: state.positivePrompt,
    negativePrompt: state.negativePrompt,
    imageUrl: state.imageUrl,
    savedNotice: state.savedNotice,
    isGeneratingImage: state.isGeneratingImage,
    modelConfig: state.modelConfig,
  });
}

function canGoStep(state: LogoFlowState, target: number) {
  if (target <= 0) return true;
  if (target === 1) return !!state.analysis;
  if (target === 2) return state.directions.length > 0;
  if (target === 3) return state.detailModules.length > 0;
  if (target === 4) return !!state.logoPlan;
  if (target === 5) return !!state.positivePrompt;
  return !!state.positivePrompt;
}

function clearAfterAnalysis(): FlowPatch {
  return {
    selectedDirection: null,
    detailModules: [],
    detailSelections: {},
    detailIndex: 0,
    logoPlan: null,
    planFields: [],
    positivePrompt: "",
    negativePrompt: "",
    imageUrl: "",
    savedNotice: "",
  };
}

function clearAfterDirection(): FlowPatch {
  return {
    detailModules: [],
    detailSelections: {},
    detailIndex: 0,
    logoPlan: null,
    planFields: [],
    positivePrompt: "",
    negativePrompt: "",
    imageUrl: "",
    savedNotice: "",
  };
}

function clearAfterDetails(): FlowPatch {
  return {
    logoPlan: null,
    planFields: [],
    positivePrompt: "",
    negativePrompt: "",
    imageUrl: "",
    savedNotice: "",
  };
}

function buildAnalysisItems(analysis: RequirementAnalysis | null): Array<{ key: string; label: string; text: string }> {
  if (!analysis) return [];
  const fields = [
    ["brandType", "品牌类型"],
    ["brandName", "品牌名称"],
    ["targetUsers", "目标用户"],
    ["brandMood", "品牌气质"],
    ["preferredElements", "偏好元素"],
    ["preferredColors", "偏好颜色"],
    ["typographyPreference", "字体偏好"],
    ["applicationScenarios", "应用场景"],
    ["constraints", "限制条件"],
    ["uncertainPoints", "不确定信息"],
  ] as const;

  const items: Array<{ key: string; label: string; text: string }> = [];
  fields.forEach(([key, label]) => {
    const value = analysis[key];
    const text = Array.isArray(value) ? value.join("、") : value ? String(value) : "";
    if (text) items.push({ key, label, text });
  });
  return items;
}

function buildPlanFields(plan: LogoPlan | null) {
  if (!plan) return [];
  return [
    { key: "brandType", label: "品牌类型", text: plan.brandType || "" },
    { key: "brandName", label: "品牌名称", text: plan.brandName || "" },
    { key: "selectedDirection", label: "设计方向", text: plan.selectedDirection || "", wide: true },
  ].filter((field) => field.text);
}
