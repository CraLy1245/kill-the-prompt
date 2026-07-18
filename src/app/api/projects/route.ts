import { NextResponse } from "next/server";
import { z } from "zod";
import { fileStorage } from "@/core/storage/file-storage";

const createProjectSchema = z.object({ name: z.string().trim().min(1).max(120), artifactKind: z.enum(["image", "writing", "web-page", "product-feature"]), packId: z.string().trim().min(1), packVersion: z.string().trim().min(1), rawInput: z.string().trim().min(1) });
export async function GET() { return NextResponse.json(await fileStorage.listProjects()); }
export async function POST(request: Request) { try { const input = createProjectSchema.parse(await request.json()); const now = new Date().toISOString(); const project = { id: crypto.randomUUID(), ...input, currentStep: "input" as const, resultStatus: "draft" as const, createdAt: now, updatedAt: now }; await fileStorage.saveProject(project); return NextResponse.json(project, { status: 201 }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "项目创建失败" }, { status: 400 }); } }
