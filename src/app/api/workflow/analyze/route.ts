import { NextResponse } from "next/server";
import { z } from "zod";
import { analyzeWithModel } from "@/core/model-providers/analysis-model";
import { getAnalysisModelConfig } from "@/core/model-providers/config";
import { withModelRun } from "@/core/model-providers/model-run";
import { fileStorage } from "@/core/storage/file-storage";

const requestSchema = z.object({ projectId: z.string().optional(), packId: z.string().min(1), rawInput: z.string().trim().min(1), inputValues: z.record(z.string(), z.unknown()).default({}) });

export async function POST(request: Request) {
  try {
    const body = requestSchema.parse(await request.json());
    const pack = await fileStorage.getPack(body.packId);
    if (!pack) return NextResponse.json({ error: "创作包不存在" }, { status: 404 });
    const config = getAnalysisModelConfig();
    return NextResponse.json(await withModelRun({ projectId: body.projectId, role: "analysis", task: "analyze", model: config.model }, () => analyzeWithModel({ ...body, pack })));
  } catch (error) {
    const message = error instanceof Error ? error.message : "分析失败";
    return NextResponse.json({ error: message }, { status: /未配置/.test(message) ? 503 : 502 });
  }
}
