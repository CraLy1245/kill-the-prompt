import { NextResponse } from "next/server";
import { z } from "zod";
import { generateDecisionModulesWithModel } from "@/core/model-providers/analysis-model";
import { getAnalysisModelConfig } from "@/core/model-providers/config";
import { withModelRun } from "@/core/model-providers/model-run";
import { fileStorage } from "@/core/storage/file-storage";

export const maxDuration = 120;

const requestSchema = z.object({ projectId: z.string().min(1) }).strict();

export async function POST(request: Request) {
  try {
    const { projectId } = requestSchema.parse(await request.json());
    const project = await fileStorage.getProject(projectId);
    if (!project) return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    const pack = await fileStorage.getPack(project.packId);
    if (!pack) return NextResponse.json({ error: "创作包不存在" }, { status: 404 });
    const config = getAnalysisModelConfig();
    const decisionModules = await withModelRun({ projectId, role: "analysis", task: "decision-options", model: config.model }, () => generateDecisionModulesWithModel({
      rawInput: project.rawInput,
      inputValues: project.inputValues ?? {},
      pack,
      analysis: project.analysis ?? {},
      selectedDirection: project.selectedDirection ?? undefined,
    }));
    await fileStorage.saveProject({ ...project, decisionModules, decisions: {}, currentStep: "decisions", resultStatus: "draft", updatedAt: new Date().toISOString() });
    return NextResponse.json({ decisionModules });
  } catch (error) {
    const message = error instanceof Error ? error.message : "决策选项生成失败";
    return NextResponse.json({ error: message }, { status: /未配置/.test(message) ? 503 : 502 });
  }
}
