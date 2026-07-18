import { NextResponse } from "next/server";
import { z } from "zod";
import { fileStorage } from "@/core/storage/file-storage";

type Params = { params: Promise<{ id: string }> };
export async function POST(request: Request, { params }: Params) { const source = await fileStorage.getPack((await params).id); if (!source) return NextResponse.json({ error: "创作包不存在" }, { status: 404 }); const body = z.object({ id: z.string().optional(), name: z.string().optional() }).parse(await request.json().catch(() => ({}))); const now = new Date().toISOString(); const pack = { ...source, id: body.id ?? `${source.id}.copy-${Date.now()}`, name: body.name ?? `${source.name} 副本`, source: "custom" as const, createdAt: now, updatedAt: now }; await fileStorage.savePack(pack); return NextResponse.json(pack, { status: 201 }); }
