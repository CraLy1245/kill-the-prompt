import { NextResponse } from "next/server";
import { z } from "zod";
import { getModelConfigForRole, getPublicUniversalModelStatus } from "@/core/model-providers/config";
import { discoverOpenAIModels } from "@/core/model-providers/model-discovery";
import { clearRoleConfig, readModelSettings, saveRoleConfig } from "@/core/model-providers/model-settings-store";

const roleSchema = z.enum(["analysis", "execution"]);
const saveSchema = z.object({
  role: roleSchema,
  endpoint: z.string().trim().min(1),
  apiKey: z.string().trim().optional(),
  textModel: z.string().trim().min(1),
  imageModel: z.string().trim().optional(),
}).strict();

export function GET() {
  return NextResponse.json(getPublicUniversalModelStatus());
}

export async function POST(request: Request) {
  try {
    const body = saveSchema.parse(await request.json());
    const current = (await readModelSettings())[body.role];
    const apiKey = body.apiKey || current?.apiKey || getModelConfigForRole(body.role).apiKey;
    if (!apiKey) return NextResponse.json({ error: "首次配置时必须填写 API Key。" }, { status: 400 });
    const discovered = await discoverOpenAIModels({ endpoint: body.endpoint, apiKey, role: body.role });
    await saveRoleConfig(body.role, {
      baseUrl: discovered.baseUrl,
      apiKey: body.apiKey || current?.apiKey,
      textModel: body.textModel,
      imageModel: body.role === "execution" ? body.imageModel || undefined : undefined,
      discoveredModels: discovered.discoveredModels,
      updatedAt: new Date().toISOString(),
    });
    return NextResponse.json(getPublicUniversalModelStatus());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "模型配置保存失败" }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const role = roleSchema.parse((await request.json()).role);
    await clearRoleConfig(role);
    return NextResponse.json(getPublicUniversalModelStatus());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "模型配置删除失败" }, { status: 400 });
  }
}
