import { NextResponse } from "next/server";
import { z } from "zod";
import { applyCanvasActions, createCanvasDocument, upgradeCanvasDocument } from "@/core/canvas";
import { editCanvasWithModel } from "@/core/model-providers/canvas-model";
import { getAnalysisModelConfig } from "@/core/model-providers/config";
import { withModelRun } from "@/core/model-providers/model-run";
import { fileStorage } from "@/core/storage/file-storage";

type Params = { params: Promise<{ projectId: string }> };
const requestSchema = z.object({ instruction: z.string().trim().min(2).max(2_000), baseRevision: z.number().int().min(0), selectedNodeIds: z.array(z.string()).max(20).optional() }).strict();
export const maxDuration = 180;

export async function POST(request: Request, { params }: Params) {
  try {
    const { projectId } = await params;
    const body = requestSchema.parse(await request.json());
    const spec = await fileStorage.getArtifactSpec(projectId);
    if (!spec) return NextResponse.json({ error: "项目结构化方案不存在" }, { status: 404 });
    let current = await fileStorage.getCanvasDocument(projectId);
    if (!current) {
      current = createCanvasDocument(spec);
      await fileStorage.saveCanvasDocument(projectId, current, false);
    } else {
      const upgraded = upgradeCanvasDocument(current, spec);
      current = upgraded.document;
      if (upgraded.changed) await fileStorage.saveCanvasDocument(projectId, current, false);
    }
    if (current.revision !== body.baseRevision) return NextResponse.json({ error: "画布版本已变化，请刷新后重试", document: current }, { status: 409 });
    const config = getAnalysisModelConfig();
    const edit = await withModelRun({ projectId, role: "analysis", task: "canvas:edit", model: config.model }, () => editCanvasWithModel({ instruction: body.instruction, document: current, spec, selectedNodeIds: body.selectedNodeIds }));
    const document = applyCanvasActions(current, edit.actions);
    await fileStorage.saveCanvasDocument(projectId, document);
    return NextResponse.json({ document, summary: edit.summary, actions: edit.actions });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI 无法完成画布编辑";
    return NextResponse.json({ error: message }, { status: /未配置/.test(message) ? 503 : 502 });
  }
}
