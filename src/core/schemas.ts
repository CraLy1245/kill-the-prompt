import { z } from "zod";
import type { ArtifactSpec, ArtifactResult } from "@/types/universal";

const id = z.string().regex(/^[a-z][a-zA-Z0-9_]{1,40}$/, "字段 ID 必须符合 /^[a-z][a-zA-Z0-9_]{1,40}$/");
const nonEmpty = z.string().trim().min(1);
const stringList = z.array(z.string().trim().min(1));
const unknownRecord = z.record(z.string(), z.unknown());

export const creativeDirectionSchema = z.object({
  id: nonEmpty,
  title: nonEmpty,
  summary: nonEmpty,
  differences: stringList.min(1),
  recommended: z.boolean().optional(),
});

export const fieldDefinitionSchema = z.object({
  id,
  label: nonEmpty,
  description: z.string().optional(),
  type: z.enum(["text", "textarea", "tags", "single-select", "multi-select", "boolean", "number", "slider", "color", "aspect-ratio", "image-upload"]),
  required: z.boolean(),
  defaultValue: z.unknown().optional(),
  options: z.array(z.object({ id: nonEmpty, label: nonEmpty, description: z.string().optional() })).optional(),
  allowCustomValue: z.boolean().optional(),
});

export const flowDefinitionSchema = z.object({
  steps: z.array(z.object({ id: z.enum(["input", "analysis", "directions", "decisions", "review", "generate", "refine"]), enabled: z.boolean(), optional: z.boolean().optional() })).min(1),
  directionConfig: z.object({ count: z.number().int().min(2).max(8), allowSkip: z.boolean(), differenceDimensions: stringList, minimumDifferenceCount: z.number().int().min(1) }).optional(),
});

export const decisionModuleDefinitionSchema = z.object({
  id,
  title: nonEmpty,
  description: z.string().optional(),
  controlType: z.enum(["text", "textarea", "tags", "single-select", "multi-select", "boolean", "number", "slider", "color", "aspect-ratio", "image-upload"]),
  required: z.boolean(),
  optionSource: z.enum(["preset", "ai-generated"]),
  options: z.array(z.object({ id: nonEmpty, label: nonEmpty, description: z.string().optional() })).optional(),
  optionCount: z.number().int().min(2).max(8).optional(),
  allowCustomValue: z.boolean().optional(),
  applicableWhen: z.object({ fieldId: id, operator: z.enum(["equals", "not-equals", "includes"]), value: z.unknown() }).optional(),
});

export const runtimeDecisionModuleSchema = decisionModuleDefinitionSchema.extend({
  options: z.array(z.object({ id: nonEmpty, label: nonEmpty, description: z.string().optional(), recommended: z.boolean().optional() })).min(2),
});

export const workflowAnalysisResultSchema = z.object({
  analysis: z.object({
    intent: nonEmpty,
    goal: nonEmpty,
    audience: stringList,
    explicitRequirements: stringList,
    constraints: stringList,
    uncertainPoints: stringList,
    assumptions: stringList,
  }),
  directions: z.array(creativeDirectionSchema).min(2).max(8),
  decisionModules: z.array(runtimeDecisionModuleSchema),
});

export const validationRuleSchema = z.object({ id: nonEmpty, fieldId: id, rule: z.enum(["required", "min-length", "max-length", "min-items"]), value: z.number().optional(), message: nonEmpty });

export const creationPackSchema = z.object({
  schemaVersion: z.literal("1.0"),
  id: nonEmpty,
  name: nonEmpty,
  description: nonEmpty,
  version: nonEmpty,
  icon: z.string().optional(),
  artifactKind: z.enum(["image", "writing", "web-page", "product-feature"]),
  source: z.enum(["built-in", "custom"]),
  inputFields: z.array(fieldDefinitionSchema),
  flow: flowDefinitionSchema,
  decisionModules: z.array(decisionModuleDefinitionSchema),
  outputConfig: z.object({ formats: stringList, preview: z.enum(["image", "markdown", "web", "structured"]), allowRefine: z.boolean() }),
  compilerConfig: z.object({ compilerId: z.enum(["image", "writing", "web-page", "product-feature"]), rendererId: z.enum(["image", "writing", "web-page", "product-feature"]), exporterIds: stringList }),
  validationRules: z.array(validationRuleSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}).superRefine((pack, ctx) => {
  const ids = pack.inputFields.map((field) => field.id);
  if (new Set(ids).size !== ids.length) ctx.addIssue({ code: "custom", path: ["inputFields"], message: "同一个创作包中字段 ID 不得重复" });
  const moduleIds = pack.decisionModules.map((module) => module.id);
  if (new Set(moduleIds).size !== moduleIds.length) ctx.addIssue({ code: "custom", path: ["decisionModules"], message: "同一个创作包中决策模块 ID 不得重复" });
  const enabled = pack.flow.steps.filter((step) => step.enabled).map((step) => step.id);
  for (const requiredStep of ["input", "review", "generate"] as const) {
    if (!enabled.includes(requiredStep)) ctx.addIssue({ code: "custom", path: ["flow", "steps"], message: `${requiredStep} 步骤必须存在且启用` });
  }
  const order = ["input", "analysis", "directions", "decisions", "review", "generate", "refine"];
  const positions = enabled.map((step) => order.indexOf(step));
  if (positions.some((position, index) => index > 0 && position <= positions[index - 1])) ctx.addIssue({ code: "custom", path: ["flow", "steps"], message: "流程步骤顺序不合法" });
  if (pack.flow.steps.some((step) => step.enabled && step.id === "directions")) {
    const count = pack.flow.directionConfig?.count;
    if (!count || count < 2 || count > 8) ctx.addIssue({ code: "custom", path: ["flow", "directionConfig"], message: "方向数量必须为 2 至 8" });
  }
  if (pack.compilerConfig.compilerId !== pack.artifactKind) ctx.addIssue({ code: "custom", path: ["compilerConfig", "compilerId"], message: "编译器必须与成果类型匹配" });
});

const baseArtifactSpecSchema = z.object({
  schemaVersion: z.literal("1.0"),
  projectId: nonEmpty,
  artifactKind: z.enum(["image", "writing", "web-page", "product-feature"]),
  packId: nonEmpty,
  packVersion: nonEmpty,
  rawInput: nonEmpty,
  analysis: unknownRecord,
  selectedDirection: creativeDirectionSchema.optional(),
  decisions: unknownRecord,
  constraints: z.object({ mustInclude: stringList, mustAvoid: stringList, mustKeep: stringList }),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const imageArtifactSpecSchema = baseArtifactSpecSchema.extend({
  artifactKind: z.literal("image"),
  image: z.object({
    subject: nonEmpty, subjectAttributes: stringList, identityLocks: stringList, scene: nonEmpty, props: stringList, style: stringList,
    composition: nonEmpty, camera: z.string().optional(), lighting: stringList, colors: stringList, requiredText: stringList,
    aspectRatio: nonEmpty, imageCount: z.number().int().min(1).max(8), format: z.enum(["png", "jpg"]),
  }),
});

export const writingArtifactSpecSchema = baseArtifactSpecSchema.extend({
  artifactKind: z.literal("writing"),
  writing: z.object({
    topic: nonEmpty, platform: nonEmpty, audience: stringList, purpose: nonEmpty, thesis: nonEmpty, supportingClaims: stringList,
    counterArguments: stringList, structure: z.array(z.object({ id: nonEmpty, title: nonEmpty, purpose: nonEmpty, keyPoints: stringList })).min(1),
    tone: stringList, targetLength: z.number().int().min(200).max(100000), formattingRules: stringList, confirmedFacts: stringList, uncertainFacts: stringList,
  }),
});

export const webPageArtifactSpecSchema = baseArtifactSpecSchema.extend({
  artifactKind: z.literal("web-page"),
  webPage: z.object({
    productName: nonEmpty, productPurpose: nonEmpty, targetUsers: stringList, pageType: nonEmpty, primaryGoal: nonEmpty,
    sections: z.array(z.object({ id: nonEmpty, type: nonEmpty, title: nonEmpty, purpose: nonEmpty, content: unknownRecord })).min(1),
    visualSystem: z.object({ direction: nonEmpty, typography: nonEmpty, spacing: nonEmpty, radius: nonEmpty, colors: stringList, motion: stringList }),
    responsiveRules: stringList, interactionRules: stringList, exportFormat: z.literal("html-css"),
  }),
});

export const productFeatureArtifactSpecSchema = baseArtifactSpecSchema.extend({
  artifactKind: z.literal("product-feature"),
  feature: z.object({
    featureName: nonEmpty, problem: nonEmpty, targetUsers: stringList, userValue: nonEmpty,
    scope: z.object({ included: stringList, excluded: stringList }),
    userFlow: z.array(z.object({ id: nonEmpty, title: nonEmpty, description: nonEmpty })).min(1),
    screens: z.array(z.object({ id: nonEmpty, name: nonEmpty, purpose: nonEmpty, states: stringList })).min(1),
    dataEntities: z.array(z.object({ name: nonEmpty, fields: stringList })), risks: stringList, successMetrics: stringList,
    acceptanceCriteria: stringList, developmentTasks: stringList, testCases: stringList,
  }),
});

export const artifactSpecSchema = z.discriminatedUnion("artifactKind", [imageArtifactSpecSchema, writingArtifactSpecSchema, webPageArtifactSpecSchema, productFeatureArtifactSpecSchema]);

export const artifactSpecPatchSchema = z.object({
  reason: nonEmpty,
  operations: z.array(z.object({ op: z.enum(["replace", "add", "remove"]), path: z.string().regex(/^\/[a-zA-Z0-9_/-]+$/), value: z.unknown().optional() })).min(1),
});

export const imageArtifactResultSchema = z.object({ artifactKind: z.literal("image"), images: z.array(z.object({ id: nonEmpty, url: nonEmpty, localPath: z.string().optional() })), positiveInstruction: nonEmpty, negativeInstruction: z.string().optional() });
export const writingArtifactResultSchema = z.object({ artifactKind: z.literal("writing"), title: nonEmpty, markdown: nonEmpty, outline: stringList });
export const webPageArtifactResultSchema = z.object({ artifactKind: z.literal("web-page"), pageSpec: unknownRecord, files: z.object({ html: nonEmpty, css: nonEmpty, javascript: z.string().optional() }) });
export const productFeatureArtifactResultSchema = z.object({ artifactKind: z.literal("product-feature"), markdown: nonEmpty, structuredData: productFeatureArtifactSpecSchema.shape.feature });
export const artifactResultSchema = z.discriminatedUnion("artifactKind", [imageArtifactResultSchema, writingArtifactResultSchema, webPageArtifactResultSchema, productFeatureArtifactResultSchema]);

export function parseArtifactSpec(value: unknown): ArtifactSpec {
  return artifactSpecSchema.parse(value) as ArtifactSpec;
}

export function parseArtifactResult(value: unknown): ArtifactResult {
  return artifactResultSchema.parse(value) as ArtifactResult;
}
