import { NextResponse } from "next/server";
import { fileStorage } from "@/core/storage/file-storage";
type Params = { params: Promise<{ id: string }> };
export async function GET(_: Request, { params }: Params) { const id = (await params).id; const project = await fileStorage.getProject(id); if (!project) return NextResponse.json({ error: "项目不存在" }, { status: 404 }); return NextResponse.json({ project, spec: await fileStorage.getArtifactSpec(id), result: await fileStorage.getArtifactResult(id), revisions: await fileStorage.getRevisions(id), pack: await fileStorage.getPack(project.packId) }); }
export async function PUT(request: Request, { params }: Params) { const id = (await params).id; const project = await fileStorage.getProject(id); if (!project) return NextResponse.json({ error: "项目不存在" }, { status: 404 }); const patch = await request.json(); const updated = { ...project, ...patch, id, updatedAt: new Date().toISOString() }; await fileStorage.saveProject(updated); return NextResponse.json(updated); }
export async function DELETE(_: Request, { params }: Params) { await fileStorage.deleteProject((await params).id); return NextResponse.json({ ok: true }); }
