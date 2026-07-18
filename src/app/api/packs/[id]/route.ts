import { NextResponse } from "next/server";
import { fileStorage } from "@/core/storage/file-storage";
import { creationPackSchema } from "@/core/schemas";

type Params = { params: Promise<{ id: string }> };
export async function GET(_: Request, { params }: Params) { const pack = await fileStorage.getPack((await params).id); return pack ? NextResponse.json(pack) : NextResponse.json({ error: "创作包不存在" }, { status: 404 }); }
export async function PUT(request: Request, { params }: Params) { try { const current = await fileStorage.getPack((await params).id); if (!current) return NextResponse.json({ error: "创作包不存在" }, { status: 404 }); const pack = creationPackSchema.parse({ ...await request.json(), id: current.id, source: "custom", createdAt: current.createdAt, updatedAt: new Date().toISOString() }); await fileStorage.savePack(pack); return NextResponse.json(pack); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "创作包格式无效" }, { status: 400 }); } }
export async function DELETE(_: Request, { params }: Params) { const id = (await params).id; const pack = await fileStorage.getPack(id); if (!pack || pack.source === "built-in") return NextResponse.json({ error: "内置创作包不能删除" }, { status: 400 }); await fileStorage.deletePack(id); return NextResponse.json({ ok: true }); }
