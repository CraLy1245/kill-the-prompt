import { NextResponse } from "next/server";
import { creationPackSchema } from "@/core/schemas";
import { fileStorage } from "@/core/storage/file-storage";
export async function POST(request: Request) { try { const pack = creationPackSchema.parse({ ...await request.json(), source: "custom" }); await fileStorage.savePack(pack); return NextResponse.json(pack, { status: 201 }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "导入失败" }, { status: 400 }); } }
