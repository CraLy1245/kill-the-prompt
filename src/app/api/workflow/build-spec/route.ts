import { NextResponse } from "next/server";
import { z } from "zod";
import { fileStorage } from "@/core/storage/file-storage";
import { buildArtifactSpec } from "@/core/demo-engine";
import { artifactSpecSchema } from "@/core/schemas";
const requestSchema = z.object({ projectId: z.string().min(1), packId: z.string().min(1), rawInput: z.string().min(1), inputValues: z.record(z.string(), z.unknown()).default({}), analysis: z.record(z.string(), z.unknown()), selectedDirection: z.object({ id: z.string(), title: z.string(), summary: z.string(), differences: z.array(z.string()), recommended: z.boolean().optional() }).optional(), decisions: z.record(z.string(), z.unknown()).default({}) });
export async function POST(request: Request) { try { const body = requestSchema.parse(await request.json()); const pack = await fileStorage.getPack(body.packId); if (!pack) return NextResponse.json({ error: "创作包不存在" }, { status: 404 }); const spec = artifactSpecSchema.parse(buildArtifactSpec({ ...body, pack })) ; await fileStorage.saveArtifactSpec(body.projectId, spec); await fileStorage.saveProject({ ...(await fileStorage.getProject(body.projectId))!, currentStep: "review", resultStatus: "ready", updatedAt: new Date().toISOString() }); return NextResponse.json(spec); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "方案生成失败" }, { status: 400 }); } }
