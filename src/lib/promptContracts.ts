import type { DesignDirection, DetailSelections, RequirementAnalysis } from "@/types/logo";

export type LogoTask = "analyzeLogo" | "generateDetails" | "buildPrompt";

const strictJsonRules = [
  "你只能输出一个 JSON 对象。",
  "不要输出 Markdown、解释文字、代码块或 JSON 以外的任何内容。",
  "所有字段必须存在；数组字段无内容时输出空数组。",
  "品牌名不是必填项；用户未明确提供品牌名时，brandName 必须为 null，且不得编造品牌名。",
].join("\n");

export function buildTaskPrompt(task: LogoTask, input: unknown): string {
  if (task === "analyzeLogo") {
    const { confirmedAnalysis, rawInput, regenerationPrompt, previousDirections } = input as {
      confirmedAnalysis?: RequirementAnalysis;
      previousDirections?: DesignDirection[];
      rawInput: string;
      regenerationPrompt?: string;
    };
    return [
      strictJsonRules,
      confirmedAnalysis
        ? "任务：用户已经校准需求解析。必须以 confirmedAnalysis 为唯一有效的结构化需求，重新输出 5 个互相区分的设计方向。"
        : "任务：读取用户原始 Logo 设计需求，完成需求解析，并输出 5 个互相区分、适合当前需求的设计方向。",
      "不允许输出具体 Logo Prompt，不允许进入细节选择阶段。",
      "directions 数量必须刚好为 5。",
      confirmedAnalysis ? "输出中的 analysis 必须与 confirmedAnalysis 保持一致，不得恢复旧字段、删除用户修改或自行改写确认内容。" : "",
      previousDirections?.length
        ? "本次是重新生成设计方向。必须避开 previousDirections 中已有的标题、核心元素、构图和视觉关键词，生成明显不同的新方向。"
        : "",
      regenerationPrompt ? "如果用户补充灵感与原始需求不冲突，新的 5 个方向必须优先体现用户补充灵感。" : "",
      "输出 JSON 结构：",
      `{
  "analysis": {
    "brandType": "string",
    "brandName": "string | null",
    "targetUsers": ["string"],
    "brandMood": ["string"],
    "preferredElements": ["string"],
    "preferredColors": ["string"],
    "typographyPreference": "string",
    "applicationScenarios": ["string"],
    "constraints": ["string"],
    "uncertainPoints": ["string"]
  },
  "directions": [
    {
      "id": "string",
      "title": "string",
      "suitableFor": "string",
      "visualKeywords": ["string"],
      "elements": ["string"],
      "colors": ["string"],
      "fonts": ["string"],
      "composition": "string",
      "reason": "string"
    }
  ]
}`,
      "用户原始需求：",
      rawInput,
      confirmedAnalysis ? "用户确认后的结构化需求（confirmedAnalysis）：" : "",
      confirmedAnalysis ? JSON.stringify(confirmedAnalysis, null, 2) : "",
      regenerationPrompt ? "用户补充灵感：" : "",
      regenerationPrompt ?? "",
      previousDirections?.length ? "previousDirections：" : "",
      previousDirections?.length ? JSON.stringify(previousDirections, null, 2) : "",
    ].join("\n\n");
  }

  if (task === "generateDetails") {
    const data = input as {
      rawInput: string;
      analysis: RequirementAnalysis;
      selectedDirection: DesignDirection;
    };
    return [
      strictJsonRules,
      "任务：根据用户原始需求、需求解析结果和已选设计方向，生成该方向下的 Logo 设计细节选择模块。",
      "模块 ID 固定为 graphicSubject、graphicStructure、complexity、lineWeight、fontStyle、textHierarchy、colorPalette、applicationPriority、avoidanceRules。",
      "模块内选项必须围绕已选方向动态生成，不得与已选方向冲突，不得输出最终 Prompt。",
      "输出 JSON 结构：",
      `{
  "selectedDirectionId": "string",
  "modules": [
    {
      "id": "graphicSubject | graphicStructure | complexity | lineWeight | fontStyle | textHierarchy | colorPalette | applicationPriority | avoidanceRules",
      "title": "string",
      "description": "string",
      "selectionType": "single | multiple",
      "options": [
        { "id": "string", "label": "string", "description": "string", "recommended": true }
      ]
    }
  ]
}`,
      "输入：",
      JSON.stringify(data, null, 2),
    ].join("\n\n");
  }

  const data = input as {
    rawInput: string;
    analysis: RequirementAnalysis;
    selectedDirection: DesignDirection;
    detailSelections: DetailSelections;
  };
  return [
    strictJsonRules,
    "任务：根据用户原始需求、需求解析结果、已选方向和已选细节，生成 Logo 方案确认卡与最终生图 Prompt。",
    "Prompt 必须与用户选择一致，不得混入未选择方向，不得新增冲突核心元素。",
    "如果用户未提供品牌名，Prompt 中只能使用“品牌名占位符”或“未定品牌名文字区域”，不得编造品牌名。",
    "logoPlan.designSummary 是展示给用户的 Logo 设计说明，只需用 80-140 个中文字符说明为什么采用该图形、色彩、字体和构图；不得写成生图 Prompt，不得堆叠镜头、材质、渲染、分辨率等提示词语言。",
    "输出 JSON 结构：",
    `{
  "logoPlan": {
    "brandType": "string",
    "brandName": "string | null",
    "selectedDirection": "string",
    "selectedDetails": {
      "graphicSubject": ["string"],
      "graphicStructure": ["string"],
      "complexity": ["string"],
      "lineWeight": ["string"],
      "fontStyle": ["string"],
      "textHierarchy": ["string"],
      "colorPalette": ["string"],
      "applicationPriority": ["string"],
      "avoidanceRules": ["string"]
    },
    "designKeywords": ["string"],
    "designSummary": "string",
    "usageScenarios": ["string"]
  },
  "positivePrompt": "string",
  "negativePrompt": "string"
}`,
    "输入：",
    JSON.stringify(data, null, 2),
  ].join("\n\n");
}
