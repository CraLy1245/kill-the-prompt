import { NextResponse } from "next/server";
import { fileStorage } from "@/core/storage/file-storage";
type Params = { params: Promise<{ projectId: string }> };
export async function GET(_: Request, { params }: Params) { const projectId = (await params).projectId; return NextResponse.json({ spec: await fileStorage.getArtifactSpec(projectId), result: await fileStorage.getArtifactResult(projectId) }); }
