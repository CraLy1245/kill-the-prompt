import { z } from "zod";

const nonEmptyString = z.string().trim().min(1);
const stringArray = z.preprocess((value) => {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return [];
  return trimmed
    .split(/[、,，;；\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}, z.array(z.string().trim()).default([]));

export const requirementAnalysisSchema = z.object({
  brandType: nonEmptyString,
  brandName: z.string().trim().nullable().optional(),
  targetUsers: stringArray,
  brandMood: stringArray,
  preferredElements: stringArray,
  preferredColors: stringArray,
  typographyPreference: z.string().trim().default(""),
  applicationScenarios: stringArray,
  constraints: stringArray,
  uncertainPoints: stringArray,
});

export const designDirectionSchema = z.object({
  id: nonEmptyString,
  title: nonEmptyString,
  suitableFor: z.string().trim().default(""),
  visualKeywords: stringArray,
  elements: stringArray,
  colors: stringArray,
  fonts: stringArray,
  composition: z.string().trim().default(""),
  reason: z.string().trim().default(""),
});

export const analyzeLogoResponseSchema = z.object({
  analysis: requirementAnalysisSchema,
  directions: z.array(designDirectionSchema).length(5),
});

export const detailModuleIdSchema = z.enum([
  "graphicSubject",
  "graphicStructure",
  "complexity",
  "lineWeight",
  "fontStyle",
  "textHierarchy",
  "colorPalette",
  "applicationPriority",
  "avoidanceRules",
]);

export const detailOptionSchema = z.object({
  id: nonEmptyString,
  label: nonEmptyString,
  description: nonEmptyString,
  recommended: z.boolean().optional(),
});

export const detailModuleSchema = z.object({
  id: detailModuleIdSchema,
  title: nonEmptyString,
  description: nonEmptyString,
  selectionType: z.enum(["single", "multiple"]),
  options: z.array(detailOptionSchema).min(1),
});

export const generateDetailsResponseSchema = z.object({
  selectedDirectionId: nonEmptyString,
  modules: z.array(detailModuleSchema).min(1),
});

export const detailSelectionsSchema = z
  .object({
    graphicSubject: stringArray.optional(),
    graphicStructure: stringArray.optional(),
    complexity: stringArray.optional(),
    lineWeight: stringArray.optional(),
    fontStyle: stringArray.optional(),
    textHierarchy: stringArray.optional(),
    colorPalette: stringArray.optional(),
    applicationPriority: stringArray.optional(),
    avoidanceRules: stringArray.optional(),
  })
  .partial();

export const logoPlanSchema = z.object({
  brandType: nonEmptyString,
  brandName: z.string().trim().nullable().optional(),
  selectedDirection: nonEmptyString,
  selectedDetails: detailSelectionsSchema,
  designKeywords: stringArray,
  designSummary: nonEmptyString,
  usageScenarios: stringArray,
});

export const finalPromptResponseSchema = z.object({
  logoPlan: logoPlanSchema,
  positivePrompt: nonEmptyString,
  negativePrompt: nonEmptyString,
});
