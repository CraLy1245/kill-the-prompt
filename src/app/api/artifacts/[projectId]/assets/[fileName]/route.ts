import { NextResponse } from "next/server";
import { fileStorage } from "@/core/storage/file-storage";

type Params = { params: Promise<{ projectId: string; fileName: string }> };

export async function GET(_: Request, { params }: Params) {
  const { projectId, fileName } = await params;
  const data = await fileStorage.getAsset(projectId, fileName);
  if (!data) return NextResponse.json({ error: "资产不存在" }, { status: 404 });
  const contentType = fileName.endsWith(".jpg") || fileName.endsWith(".jpeg") ? "image/jpeg" : fileName.endsWith(".webp") ? "image/webp" : "image/png";
  return new Response(data, { headers: { "Content-Type": contentType, "Cache-Control": "private, max-age=31536000, immutable" } });
}
