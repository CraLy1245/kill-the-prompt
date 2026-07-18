import { NextResponse } from "next/server";
import { fileStorage } from "@/core/storage/file-storage";
type Params = { params: Promise<{ id: string }> };
export async function GET(_: Request, { params }: Params) { const pack = await fileStorage.getPack((await params).id); if (!pack) return NextResponse.json({ error: "创作包不存在" }, { status: 404 }); return new Response(JSON.stringify(pack, null, 2), { headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="${pack.id.replaceAll("/", "-")}.json"` } }); }
