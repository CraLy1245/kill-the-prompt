import { NextResponse } from "next/server";
import { z } from "zod";
import { callLogoAI } from "@/lib/aiClient";
import { designDirectionSchema } from "@/lib/logoSchemas";
import type { AnalyzeLogoResponse } from "@/types/logo";

const requestSchema = z.object({
  model: z.string().trim().optional(),
  providerConfig: z.object({
    apiKey: z.string().trim().optional(),
    baseUrl: z.string().trim().optional(),
    model: z.string().trim().optional(),
  }).optional(),
  previousDirections: z.array(designDirectionSchema).optional(),
  rawInput: z.string().trim().min(1),
  regenerationPrompt: z.string().trim().optional(),
});

export async function POST(request: Request) {
  try {
    const body = requestSchema.parse(await request.json());
    const result = await callLogoAI<typeof body, AnalyzeLogoResponse>({
      model: body.model,
      providerConfig: body.providerConfig,
      task: "analyzeLogo",
      input: body,
    });
    return NextResponse.json(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "";
    const message = errorMessage.includes("API Key") || errorMessage.includes("401")
      ? "分析模型 API Key 无效或缺失，请在模型配置中检查 API Key。"
      : errorMessage.includes("403")
        ? "需求分析接口没有当前模型权限，请检查分析 API Key。"
        : errorMessage.includes("Invalid input") || errorMessage.includes("JSON")
          ? "模型返回格式不符合要求，请重新生成或更换分析模型。"
          : "生成失败，请重新尝试。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
