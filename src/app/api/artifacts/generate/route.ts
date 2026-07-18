import { NextResponse } from "next/server";
import { z } from "zod";
import { compilerList } from "@/core/compilers";
import { executeArtifactWithModel, requestExecutionImage } from "@/core/model-providers/execution-model";
import { getExecutionImageConfig, getExecutionModelConfig } from "@/core/model-providers/config";
import { withModelRun } from "@/core/model-providers/model-run";
import { artifactSpecSchema } from "@/core/schemas";
import { fileStorage } from "@/core/storage/file-storage";
import type { ArtifactResult, CompilerContext } from "@/types/universal";

const requestSchema = z.object({ spec: z.unknown() });
export const maxDuration = 180;

export async function POST(request: Request) {
  try {
    const body = requestSchema.parse(await request.json());
    const spec = artifactSpecSchema.parse(body.spec);
    const project = await fileStorage.getProject(spec.projectId);
    if (!project) return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    const persistedSpec = await fileStorage.getArtifactSpec(spec.projectId);
    if (!persistedSpec || persistedSpec.updatedAt !== spec.updatedAt) return NextResponse.json({ error: "方案版本已变化，请刷新后重新生成" }, { status: 409 });
    const compiler = compilerList.find((item) => item.artifactKind === spec.artifactKind);
    if (!compiler) return NextResponse.json({ error: "成果编译器未注册" }, { status: 500 });
    const context: CompilerContext = {
      projectId: spec.projectId,
      now: new Date().toISOString(),
      requestArtifact: executeArtifactWithModel,
      requestImage: requestExecutionImage,
    };
    const model = spec.artifactKind === "image" ? getExecutionImageConfig().model : getExecutionModelConfig().model;
    let result = await withModelRun({ projectId: spec.projectId, role: "execution", task: `execute:${spec.artifactKind}`, model }, () => (compiler as unknown as { compile: (value: typeof spec, context: CompilerContext) => Promise<ArtifactResult> }).compile(spec, context));
    if (result.artifactKind === "image") result = await persistImageAssets(spec.projectId, result);
    await fileStorage.saveArtifactResult(spec.projectId, result);
    await fileStorage.saveProject({ ...project, currentStep: "generate", resultStatus: "generated", updatedAt: new Date().toISOString() });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "成果生成失败";
    return NextResponse.json({ error: message }, { status: /未配置/.test(message) ? 503 : 502 });
  }
}

async function persistImageAssets(projectId: string, result: Extract<ArtifactResult, { artifactKind: "image" }>): Promise<typeof result> {
  const images = await Promise.all(result.images.map(async (image, index) => {
    const response = await fetch(image.url, { signal: AbortSignal.timeout(45_000) });
    if (!response.ok) throw new Error(`生成图片下载失败（HTTP ${response.status}）`);
    const contentType = response.headers.get("content-type") ?? "image/png";
    const extension = contentType.includes("jpeg") ? "jpg" : contentType.includes("webp") ? "webp" : "png";
    const fileName = `generated-${index + 1}.${extension}`;
    const localPath = await fileStorage.saveAsset(projectId, fileName, new Uint8Array(await response.arrayBuffer()));
    return { ...image, url: `/api/artifacts/${encodeURIComponent(projectId)}/assets/${encodeURIComponent(fileName)}`, localPath };
  }));
  return { ...result, images };
}
