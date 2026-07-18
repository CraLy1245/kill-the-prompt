import { NextResponse } from "next/server";
import { z } from "zod";
import { getModelConfigForRole } from "@/core/model-providers/config";
import { discoverOpenAIModels } from "@/core/model-providers/model-discovery";
import { readModelSettings } from "@/core/model-providers/model-settings-store";

const requestSchema = z.object({
  role: z.enum(["analysis", "execution"]),
  endpoint: z.string().trim().min(1),
  apiKey: z.string().trim().optional(),
}).strict();

export async function POST(request: Request) {
  try {
    const body = requestSchema.parse(await request.json());
    const stored = (await readModelSettings())[body.role];
    const apiKey = body.apiKey || stored?.apiKey || getModelConfigForRole(body.role).apiKey;
    if (!apiKey) return NextResponse.json({ error: "请先填写 API Key。" }, { status: 400 });
    return NextResponse.json(await discoverOpenAIModels({ endpoint: body.endpoint, apiKey, role: body.role }));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "无法获取模型列表" }, { status: 400 });
  }
}
