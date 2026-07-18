import { NextResponse } from "next/server";
import { creationPackSchema } from "@/core/schemas";
import { fileStorage } from "@/core/storage/file-storage";

export async function GET() { return NextResponse.json(await fileStorage.listPacks()); }
export async function POST(request: Request) {
  try { const pack = creationPackSchema.parse(await request.json()); await fileStorage.savePack(pack); return NextResponse.json(pack, { status: 201 }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "创作包格式无效" }, { status: 400 }); }
}
