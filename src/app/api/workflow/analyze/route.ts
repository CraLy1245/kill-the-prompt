import { NextResponse } from "next/server";
import { z } from "zod";
import { fileStorage } from "@/core/storage/file-storage";
import { buildAnalysis } from "@/core/demo-engine";
const requestSchema = z.object({ packId: z.string().min(1), rawInput: z.string().trim().min(1), inputValues: z.record(z.string(), z.unknown()).default({}) });
export async function POST(request: Request) { try { const body = requestSchema.parse(await request.json()); const pack = await fileStorage.getPack(body.packId); if (!pack) return NextResponse.json({ error: "创作包不存在" }, { status: 404 }); return NextResponse.json(buildAnalysis(body.rawInput, pack)); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "分析失败" }, { status: 400 }); } }
