import { NextResponse } from "next/server";
import { z } from "zod";
import { applyCanvasActions, createCanvasDocument, upgradeCanvasDocument } from "@/core/canvas";
import { canvasActionSchema } from "@/core/schemas";
import { fileStorage } from "@/core/storage/file-storage";

type Params = { params: Promise<{ projectId: string }> };
const updateSchema = z.object({ baseRevision: z.number().int().min(0), actions: z.array(canvasActionSchema).min(1).max(40) }).strict();

export async function GET(_: Request, { params }: Params) {
  try {
    const { projectId } = await params;
    const project = await fileStorage.getProject(projectId);
    const spec = await fileStorage.getArtifactSpec(projectId);
    if (!project || !spec) return NextResponse.json({ error: "项目结构化方案不存在" }, { status: 404 });
    let document = await fileStorage.getCanvasDocument(projectId);
    if (!document) {
      document = createCanvasDocument(spec);
      await fileStorage.saveCanvasDocument(projectId, document, false);
    } else {
      const upgraded = upgradeCanvasDocument(document, spec);
      document = upgraded.document;
      if (upgraded.changed) await fileStorage.saveCanvasDocument(projectId, document, false);
    }
    return NextResponse.json({ document });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "画布读取失败" }, { status: 400 });
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const { projectId } = await params;
    const body = updateSchema.parse(await request.json());
    const current = await fileStorage.getCanvasDocument(projectId);
    if (!current) return NextResponse.json({ error: "画布不存在，请先刷新" }, { status: 404 });
    if (current.revision !== body.baseRevision) return NextResponse.json({ error: "画布版本已变化，请刷新后重试", document: current }, { status: 409 });
    const document = applyCanvasActions(current, body.actions);
    await fileStorage.saveCanvasDocument(projectId, document);
    return NextResponse.json({ document });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "画布保存失败" }, { status: 400 });
  }
}

export async function DELETE(_: Request, { params }: Params) {
  try {
    const { projectId } = await params;
    const document = await fileStorage.undoCanvasDocument(projectId);
    if (!document) return NextResponse.json({ error: "没有可以撤销的画布版本" }, { status: 409 });
    return NextResponse.json({ document });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "撤销失败" }, { status: 400 });
  }
}
