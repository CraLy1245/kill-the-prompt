"use client";

import { create } from "zustand";
import { getEnabledSteps } from "@/core/flow-engine";
import type { ArtifactKind, ArtifactResult, ArtifactSpec, CreationPack, CreativeDirection, FlowStepId, ProjectRecord, RevisionRecord, RuntimeDecisionModule } from "@/types/universal";

export type WorkspaceState = {
  projectId: string | null;
  projectName: string;
  projectCreatedAt: string | null;
  projectUpdatedAt: string | null;
  pack: CreationPack | null;
  artifactKind: ArtifactKind | null;
  stepOrder: FlowStepId[];
  currentStep: FlowStepId | null;
  rawInput: string;
  inputValues: Record<string, unknown>;
  analysis: Record<string, unknown>;
  directions: CreativeDirection[];
  selectedDirection: CreativeDirection | null;
  decisionModules: RuntimeDecisionModule[];
  decisions: Record<string, unknown>;
  artifactSpec: ArtifactSpec | null;
  artifactResult: ArtifactResult | null;
  revisionHistory: RevisionRecord[];
  isLoading: boolean;
  error: string | null;
  setPack: (pack: CreationPack) => void;
  setProject: (projectId: string) => void;
  hydrateProject: (data: { project: ProjectRecord; pack: CreationPack; spec: ArtifactSpec | null; result: ArtifactResult | null; revisions: RevisionRecord[] }) => void;
  setRawInput: (value: string) => void;
  setInputValue: (fieldId: string, value: unknown) => void;
  setAnalysis: (analysis: Record<string, unknown>, directions: CreativeDirection[], decisionModules: RuntimeDecisionModule[]) => void;
  selectDirection: (direction: CreativeDirection) => void;
  setDecision: (moduleId: string, value: unknown) => void;
  setStep: (step: FlowStepId) => void;
  setArtifactSpec: (spec: ArtifactSpec) => void;
  setArtifactResult: (result: ArtifactResult) => void;
  setRevisionHistory: (revisions: RevisionRecord[]) => void;
  setLoading: (value: boolean) => void;
  setError: (value: string | null) => void;
  reset: () => void;
};

const emptyState = { projectId: null, projectName: "", projectCreatedAt: null, projectUpdatedAt: null, pack: null, artifactKind: null, stepOrder: [], currentStep: null, rawInput: "", inputValues: {}, analysis: {}, directions: [], selectedDirection: null, decisionModules: [], decisions: {}, artifactSpec: null, artifactResult: null, revisionHistory: [], isLoading: false, error: null };

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  ...emptyState,
  setPack: (pack) => set({ ...emptyState, pack, artifactKind: pack.artifactKind, stepOrder: getEnabledSteps(pack), currentStep: "input", inputValues: Object.fromEntries(pack.inputFields.filter((field) => field.defaultValue !== undefined).map((field) => [field.id, field.defaultValue])) }),
  setProject: (projectId) => set({ projectId }),
  hydrateProject: ({ project, pack, spec, result, revisions }) => {
    const stepOrder = getEnabledSteps(pack);
    const requestedStep = stepOrder.includes(project.currentStep) ? project.currentStep : "input";
    const hasAnalysis = Boolean(spec || project.analysis || project.directions?.length);
    const currentStep = requestedStep !== "input" && !hasAnalysis && !result ? "input" : requestedStep;
    const presetDecisionModules = pack.decisionModules
      .filter((module) => module.optionSource === "preset" && module.options)
      .map((module) => ({ ...module, options: module.options ?? [] }));
    set({
      ...emptyState,
      projectId: project.id,
      projectName: project.name,
      projectCreatedAt: project.createdAt,
      projectUpdatedAt: project.updatedAt,
      pack,
      artifactKind: pack.artifactKind,
      stepOrder,
      currentStep,
      rawInput: project.rawInput,
      inputValues: project.inputValues ?? {},
      analysis: spec?.analysis ?? project.analysis ?? {},
      directions: project.directions ?? [],
      selectedDirection: spec?.selectedDirection ?? project.selectedDirection ?? null,
      decisionModules: project.decisionModules ?? presetDecisionModules,
      decisions: spec?.decisions ?? project.decisions ?? {},
      artifactSpec: spec,
      artifactResult: result,
      revisionHistory: revisions,
    });
  },
  setRawInput: (rawInput) => set({ rawInput, error: null }),
  setInputValue: (fieldId, value) => set((state) => ({ inputValues: { ...state.inputValues, [fieldId]: value }, error: null })),
  setAnalysis: (analysis, directions, decisionModules) => set({ analysis, directions, decisionModules, selectedDirection: null, decisions: {}, currentStep: "directions", artifactSpec: null, artifactResult: null, error: null }),
  selectDirection: (selectedDirection) => set({ selectedDirection, artifactSpec: null, artifactResult: null, error: null }),
  setDecision: (moduleId, value) => set((state) => ({ decisions: { ...state.decisions, [moduleId]: value }, artifactSpec: null, artifactResult: null, error: null })),
  setStep: (currentStep) => set({ currentStep, error: null }),
  setArtifactSpec: (artifactSpec) => set({ artifactSpec, currentStep: "review", error: null }),
  setArtifactResult: (artifactResult) => set({ artifactResult, currentStep: "generate", error: null }),
  setRevisionHistory: (revisionHistory) => set({ revisionHistory }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  reset: () => set(emptyState),
}));
