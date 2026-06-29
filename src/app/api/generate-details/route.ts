import { NextResponse } from "next/server";
import { z } from "zod";
import { callLogoAI } from "@/lib/aiClient";
import { designDirectionSchema, requirementAnalysisSchema } from "@/lib/logoSchemas";
import type { GenerateDetailsResponse } from "@/types/logo";

const requestSchema = z.object({
  model: z.string().trim().optional(),
  providerConfig: z.object({
    apiKey: z.string().trim().optional(),
    baseUrl: z.string().trim().optional(),
    model: z.string().trim().optional(),
  }).optional(),
  rawInput: z.string().trim().min(1),
  analysis: requirementAnalysisSchema,
  selectedDirection: designDirectionSchema,
});

export async function POST(request: Request) {
  try {
    const body = requestSchema.parse(await request.json());
    const result = await callLogoAI<typeof body, GenerateDetailsResponse>({
      model: body.model,
      providerConfig: body.providerConfig,
      task: "generateDetails",
      input: body,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error && error.message.includes("API Key")
      ? error.message
      : error instanceof Error && error.message.includes("403")
      ? "细节生成接口没有当前模型权限，请检查分析 API Key。"
      : "生成失败，请重新尝试。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
