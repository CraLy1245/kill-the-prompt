import { NextResponse } from "next/server";
import { z } from "zod";
import { artifactSpecSchema } from "@/core/schemas";
import { compilerList } from "@/core/compilers";
import { fileStorage } from "@/core/storage/file-storage";
import { buildImagesEndpoint, resolveImageModel } from "@/lib/modelRegistry";
import type { ArtifactResult, CompilerContext } from "@/types/universal";

const requestSchema = z.object({ spec: z.unknown(), providerConfig: z.object({ apiKey: z.string().optional(), baseUrl: z.string().optional(), model: z.string().optional() }).optional() });
export const maxDuration = 180;
export async function POST(request: Request) {
  try {
    const body = requestSchema.parse(await request.json());
    const spec = artifactSpecSchema.parse(body.spec);
    const compiler = compilerList.find((item) => item.artifactKind === spec.artifactKind);
    if (!compiler) return NextResponse.json({ error: "成果编译器未注册" }, { status: 500 });
    const context: CompilerContext = { projectId: spec.projectId, now: new Date().toISOString() };
    if (spec.artifactKind === "image") context.requestImage = async (prompt, negativePrompt) => {
      const model = resolveImageModel(body.providerConfig);
      if (!model.apiKey) return { url: "" };
      const response = await fetch(buildImagesEndpoint(model.baseUrl), { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${model.apiKey}` }, body: JSON.stringify({ model: model.id, prompt, negative_prompt: negativePrompt, size: "1024x1024", response_format: "url" }), signal: AbortSignal.timeout(170000) });
      if (!response.ok) throw new Error("图片生成接口失败");
      const data = await response.json() as { data?: Array<{ url?: string }> };
      return { url: data.data?.[0]?.url ?? "" };
    };
    const result = await (compiler as unknown as { compile: (value: typeof spec, value2: CompilerContext) => Promise<ArtifactResult> }).compile(spec, context);
    await fileStorage.saveArtifactResult(spec.projectId, result);
    const project = await fileStorage.getProject(spec.projectId);
    if (project) await fileStorage.saveProject({ ...project, currentStep: "generate", resultStatus: "generated", updatedAt: new Date().toISOString() });
    return NextResponse.json(result);
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "成果生成失败" }, { status: 400 }); }
}
