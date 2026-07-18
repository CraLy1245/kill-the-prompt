export type ArtifactKind = "image" | "writing" | "web-page" | "product-feature";

export type FieldType =
  | "text"
  | "textarea"
  | "tags"
  | "single-select"
  | "multi-select"
  | "boolean"
  | "number"
  | "slider"
  | "color"
  | "aspect-ratio"
  | "image-upload";

export type FlowStepId =
  | "input"
  | "analysis"
  | "directions"
  | "decisions"
  | "review"
  | "generate"
  | "refine";

export type FieldDefinition = {
  id: string;
  label: string;
  description?: string;
  type: FieldType;
  required: boolean;
  defaultValue?: unknown;
  options?: Array<{ id: string; label: string; description?: string }>;
  allowCustomValue?: boolean;
};

export type FlowDefinition = {
  steps: Array<{ id: FlowStepId; enabled: boolean; optional?: boolean }>;
  directionConfig?: {
    count: number;
    allowSkip: boolean;
    differenceDimensions: string[];
    minimumDifferenceCount: number;
  };
};

export type DecisionModuleDefinition = {
  id: string;
  title: string;
  description?: string;
  controlType: FieldType;
  required: boolean;
  optionSource: "preset" | "ai-generated";
  options?: Array<{ id: string; label: string; description?: string }>;
  optionCount?: number;
  allowCustomValue?: boolean;
  applicableWhen?: {
    fieldId: string;
    operator: "equals" | "not-equals" | "includes";
    value: unknown;
  };
};

export type PackOutputConfig = {
  formats: string[];
  preview: "image" | "markdown" | "web" | "structured";
  allowRefine: boolean;
};

export type PackCompilerConfig = {
  compilerId: ArtifactKind;
  rendererId: ArtifactKind;
  exporterIds: string[];
};

export type CreationPack = {
  schemaVersion: "1.0";
  id: string;
  name: string;
  description: string;
  version: string;
  icon?: string;
  artifactKind: ArtifactKind;
  source: "built-in" | "custom";
  inputFields: FieldDefinition[];
  flow: FlowDefinition;
  decisionModules: DecisionModuleDefinition[];
  outputConfig: PackOutputConfig;
  compilerConfig: PackCompilerConfig;
  validationRules: ValidationRule[];
  createdAt: string;
  updatedAt: string;
};

export type ValidationRule = {
  id: string;
  fieldId: string;
  rule: "required" | "min-length" | "max-length" | "min-items";
  value?: number;
  message: string;
};

export type CreativeDirection = {
  id: string;
  title: string;
  summary: string;
  differences: string[];
  recommended?: boolean;
};

export type RuntimeDecisionModule = DecisionModuleDefinition & {
  options: Array<{ id: string; label: string; description?: string; recommended?: boolean }>;
};

export type BaseArtifactSpec = {
  schemaVersion: "1.0";
  projectId: string;
  artifactKind: ArtifactKind;
  packId: string;
  packVersion: string;
  rawInput: string;
  analysis: Record<string, unknown>;
  selectedDirection?: CreativeDirection;
  decisions: Record<string, unknown>;
  constraints: {
    mustInclude: string[];
    mustAvoid: string[];
    mustKeep: string[];
  };
  createdAt: string;
  updatedAt: string;
};

export type ImageArtifactSpec = BaseArtifactSpec & {
  artifactKind: "image";
  image: {
    subject: string;
    subjectAttributes: string[];
    identityLocks: string[];
    scene: string;
    props: string[];
    style: string[];
    composition: string;
    camera?: string;
    lighting: string[];
    colors: string[];
    requiredText: string[];
    aspectRatio: string;
    imageCount: number;
    format: "png" | "jpg";
  };
};

export type WritingArtifactSpec = BaseArtifactSpec & {
  artifactKind: "writing";
  writing: {
    topic: string;
    platform: string;
    audience: string[];
    purpose: string;
    thesis: string;
    supportingClaims: string[];
    counterArguments: string[];
    structure: Array<{ id: string; title: string; purpose: string; keyPoints: string[] }>;
    tone: string[];
    targetLength: number;
    formattingRules: string[];
    confirmedFacts: string[];
    uncertainFacts: string[];
  };
};

export type WebPageArtifactSpec = BaseArtifactSpec & {
  artifactKind: "web-page";
  webPage: {
    productName: string;
    productPurpose: string;
    targetUsers: string[];
    pageType: string;
    primaryGoal: string;
    sections: Array<{ id: string; type: string; title: string; purpose: string; content: Record<string, unknown> }>;
    visualSystem: {
      direction: string;
      typography: string;
      spacing: string;
      radius: string;
      colors: string[];
      motion: string[];
    };
    responsiveRules: string[];
    interactionRules: string[];
    exportFormat: "html-css";
  };
};

export type ProductFeatureArtifactSpec = BaseArtifactSpec & {
  artifactKind: "product-feature";
  feature: {
    featureName: string;
    problem: string;
    targetUsers: string[];
    userValue: string;
    scope: { included: string[]; excluded: string[] };
    userFlow: Array<{ id: string; title: string; description: string }>;
    screens: Array<{ id: string; name: string; purpose: string; states: string[] }>;
    dataEntities: Array<{ name: string; fields: string[] }>;
    risks: string[];
    successMetrics: string[];
    acceptanceCriteria: string[];
    developmentTasks: string[];
    testCases: string[];
  };
};

export type ArtifactSpec = ImageArtifactSpec | WritingArtifactSpec | WebPageArtifactSpec | ProductFeatureArtifactSpec;

export type ImageArtifactResult = {
  artifactKind: "image";
  images: Array<{ id: string; url: string; localPath?: string }>;
  positiveInstruction: string;
  negativeInstruction?: string;
};

export type WritingArtifactResult = { artifactKind: "writing"; title: string; markdown: string; outline: string[] };

export type WebPageArtifactResult = {
  artifactKind: "web-page";
  pageSpec: Record<string, unknown>;
  files: { html: string; css: string; javascript?: string };
};

export type ProductFeatureArtifactResult = {
  artifactKind: "product-feature";
  markdown: string;
  structuredData: ProductFeatureArtifactSpec["feature"];
};

export type ArtifactResult = ImageArtifactResult | WritingArtifactResult | WebPageArtifactResult | ProductFeatureArtifactResult;

export type ArtifactSpecPatch = {
  reason: string;
  operations: Array<{ op: "replace" | "add" | "remove"; path: string; value?: unknown }>;
};

export type RevisionRecord = {
  id: string;
  projectId: string;
  createdAt: string;
  reason: string;
  patch?: ArtifactSpecPatch;
  snapshotPath?: string;
};

export type ProjectRecord = {
  id: string;
  name: string;
  artifactKind: ArtifactKind;
  packId: string;
  packVersion: string;
  rawInput: string;
  inputValues?: Record<string, unknown>;
  analysis?: Record<string, unknown>;
  directions?: CreativeDirection[];
  selectedDirection?: CreativeDirection | null;
  decisionModules?: RuntimeDecisionModule[];
  decisions?: Record<string, unknown>;
  currentStep: FlowStepId;
  resultStatus: "draft" | "ready" | "generated";
  createdAt: string;
  updatedAt: string;
};

export type CompilerContext = {
  projectId: string;
  now: string;
  requestImage?: (prompt: string, negativePrompt?: string) => Promise<{ url: string }>;
  requestArtifact?: (spec: ArtifactSpec) => Promise<ArtifactResult>;
};

export type ModelRole = "analysis" | "execution";

export type ServerModelConfig = {
  role: ModelRole;
  model: string;
  baseUrl: string;
  apiKey: string;
  timeoutMs: number;
};

export type PublicModelRoleStatus = {
  role: ModelRole;
  model: string;
  baseUrl: string;
  configured: boolean;
};

export type ModelRunRecord = {
  id: string;
  projectId: string;
  role: ModelRole;
  task: string;
  model: string;
  status: "running" | "succeeded" | "failed";
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  errorCode?: string;
};

export interface ArtifactCompiler<TSpec extends ArtifactSpec, TResult extends ArtifactResult> {
  artifactKind: TSpec["artifactKind"];
  compile(spec: TSpec, context: CompilerContext): Promise<TResult>;
}
