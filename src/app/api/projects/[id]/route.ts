import { NextResponse } from "next/server";
import { z } from "zod";
import { creativeDirectionSchema, runtimeDecisionModuleSchema } from "@/core/schemas";
import { fileStorage } from "@/core/storage/file-storage";

type Params = { params: Promise<{ id: string }> };

const projectPatchSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  rawInput: z.string().trim().min(1).optional(),
  inputValues: z.record(z.string(), z.unknown()).optional(),
  analysis: z.record(z.string(), z.unknown()).optional(),
  directions: z.array(creativeDirectionSchema).max(8).optional(),
  selectedDirection: creativeDirectionSchema.nullable().optional(),
  decisionModules: z.array(runtimeDecisionModuleSchema).optional(),
  decisions: z.record(z.string(), z.unknown()).optional(),
  currentStep: z.enum(["input", "analysis", "directions", "decisions", "review", "generate", "refine"]).optional(),
}).strict();

export async function GET(_: Request, { params }: Params) {
  const id = (await params).id;
  const project = await fileStorage.getProject(id);
  if (!project) return NextResponse.json({ error: "项目不存在" }, { status: 404 });
  return NextResponse.json({ project, spec: await fileStorage.getArtifactSpec(id), result: await fileStorage.getArtifactResult(id), revisions: await fileStorage.getRevisions(id), modelRuns: await fileStorage.getModelRuns(id), pack: await fileStorage.getPack(project.packId) });
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const id = (await params).id;
    const project = await fileStorage.getProject(id);
    if (!project) return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    const patch = projectPatchSchema.parse(await request.json());
    const updated = { ...project, ...patch, id, updatedAt: new Date().toISOString() };
    await fileStorage.saveProject(updated);
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "项目更新无效" }, { status: 400 });
  }
}

export async function DELETE(_: Request, { params }: Params) {
  await fileStorage.deleteProject((await params).id);
  return NextResponse.json({ ok: true });
}
