import { NextResponse } from "next/server";
import { z } from "zod";
import { buildSpecWithModel } from "@/core/model-providers/analysis-model";
import { applyCanvasHtmlEdit, createCanvasDocument } from "@/core/canvas";
import { editCanvasHtmlWithModel } from "@/core/model-providers/canvas-model";
import { getAnalysisModelConfig } from "@/core/model-providers/config";
import { withModelRun } from "@/core/model-providers/model-run";
import { fileStorage } from "@/core/storage/file-storage";

export const maxDuration = 180;

const requestSchema = z.object({ projectId: z.string().min(1), packId: z.string().min(1), rawInput: z.string().min(1), inputValues: z.record(z.string(), z.unknown()).default({}), analysis: z.record(z.string(), z.unknown()), selectedDirection: z.object({ id: z.string(), title: z.string(), summary: z.string(), differences: z.array(z.string()), recommended: z.boolean().optional() }).optional(), decisions: z.record(z.string(), z.unknown()).default({}) });

export async function POST(request: Request) {
  try {
    const body = requestSchema.parse(await request.json());
    const pack = await fileStorage.getPack(body.packId);
    if (!pack) return NextResponse.json({ error: "创作包不存在" }, { status: 404 });
    const project = await fileStorage.getProject(body.projectId);
    if (!project) return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    const config = getAnalysisModelConfig();
    const spec = await withModelRun({ projectId: body.projectId, role: "analysis", task: "build-spec", model: config.model }, () => buildSpecWithModel({ ...body, pack }));
    const initialCanvas = createCanvasDocument(spec);
    const htmlEdit = await withModelRun({ projectId: body.projectId, role: "analysis", task: "canvas:html-generate", model: config.model }, () => editCanvasHtmlWithModel({ instruction: "首次生成方案确认页。突出核心目标、已选方向、关键决策和不可违反的约束，并让成果结构一眼可读。", document: initialCanvas, spec }));
    const canvas = applyCanvasHtmlEdit(initialCanvas, htmlEdit);
    await fileStorage.saveArtifactSpec(body.projectId, spec);
    await fileStorage.saveCanvasDocument(body.projectId, canvas, false);
    await fileStorage.saveProject({ ...project, currentStep: "review", resultStatus: "ready", updatedAt: new Date().toISOString() });
    return NextResponse.json(spec);
  } catch (error) {
    const message = error instanceof Error ? error.message : "方案生成失败";
    return NextResponse.json({ error: message }, { status: /未配置/.test(message) ? 503 : 502 });
  }
}
