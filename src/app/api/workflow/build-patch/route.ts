import { NextResponse } from "next/server";
import { z } from "zod";
import { buildPatchWithModel } from "@/core/model-providers/analysis-model";
import { getAnalysisModelConfig } from "@/core/model-providers/config";
import { withModelRun } from "@/core/model-providers/model-run";
import { assertAllowedPatchPaths } from "@/core/patch";
import { fileStorage } from "@/core/storage/file-storage";

const requestSchema = z.object({ projectId: z.string().trim().min(1), instruction: z.string().trim().min(1) });

export async function POST(request: Request) {
  try {
    const body = requestSchema.parse(await request.json());
    const spec = await fileStorage.getArtifactSpec(body.projectId);
    if (!spec) return NextResponse.json({ error: "项目方案不存在" }, { status: 404 });
    const config = getAnalysisModelConfig();
    const patch = await withModelRun({ projectId: body.projectId, role: "analysis", task: "build-patch", model: config.model }, () => buildPatchWithModel({ instruction: body.instruction, spec }));
    assertAllowedPatchPaths(spec, patch);
    return NextResponse.json(patch);
  } catch (error) {
    const message = error instanceof Error ? error.message : "修改要求无法解析";
    return NextResponse.json({ error: message }, { status: /未配置/.test(message) ? 503 : 502 });
  }
}
