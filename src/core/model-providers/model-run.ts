import "server-only";
import { fileStorage } from "@/core/storage/file-storage";
import type { ModelRole, ModelRunRecord } from "@/types/universal";

export async function withModelRun<T>(params: { projectId?: string; role: ModelRole; task: string; model: string }, action: () => Promise<T>): Promise<T> {
  if (!params.projectId || !(await fileStorage.getProject(params.projectId))) return action();
  const started = Date.now();
  const run: ModelRunRecord = { id: crypto.randomUUID(), projectId: params.projectId, role: params.role, task: params.task, model: params.model, status: "running", startedAt: new Date(started).toISOString() };
  await fileStorage.saveModelRun(params.projectId, run);
  try {
    const result = await action();
    await fileStorage.saveModelRun(params.projectId, { ...run, status: "succeeded", completedAt: new Date().toISOString(), durationMs: Date.now() - started });
    return result;
  } catch (error) {
    await fileStorage.saveModelRun(params.projectId, { ...run, status: "failed", completedAt: new Date().toISOString(), durationMs: Date.now() - started, errorCode: error instanceof Error && "code" in error ? String(error.code) : "MODEL_CALL_FAILED" });
    throw error;
  }
}
