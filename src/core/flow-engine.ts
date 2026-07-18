import type { CreationPack, FlowStepId, RuntimeDecisionModule } from "@/types/universal";

const canonicalOrder: FlowStepId[] = ["input", "analysis", "directions", "decisions", "review", "generate", "refine"];

export function getEnabledSteps(pack: CreationPack): FlowStepId[] {
  return pack.flow.steps.filter((step) => step.enabled).map((step) => step.id);
}

export function getStepLabel(step: FlowStepId): string {
  return { input: "输入", analysis: "分析", directions: "方向", decisions: "决策", review: "确认", generate: "生成", refine: "修改" }[step];
}

export function validateFlowOrder(pack: CreationPack): { valid: boolean; error?: string } {
  const steps = getEnabledSteps(pack);
  for (const required of ["input", "review", "generate"] as const) if (!steps.includes(required)) return { valid: false, error: `${getStepLabel(required)}步骤不能关闭` };
  const positions = steps.map((step) => canonicalOrder.indexOf(step));
  if (positions.some((position, index) => index > 0 && position <= positions[index - 1])) return { valid: false, error: "流程步骤顺序不合法" };
  if (steps.includes("directions") && (!pack.flow.directionConfig || pack.flow.directionConfig.count < 2 || pack.flow.directionConfig.count > 8)) return { valid: false, error: "方向数量必须为 2 至 8" };
  return { valid: true };
}

export function canNavigateToStep(completed: Set<FlowStepId>, step: FlowStepId): boolean {
  if (step === "input") return true;
  const index = canonicalOrder.indexOf(step);
  return canonicalOrder.slice(0, index).every((item) => completed.has(item) || item === "analysis" || item === "directions" || item === "decisions");
}

export function invalidateAfterStep(step: FlowStepId, enabledSteps: FlowStepId[]) {
  const index = canonicalOrder.indexOf(step);
  return enabledSteps.filter((item) => canonicalOrder.indexOf(item) > index);
}

export function filterApplicableDecisionModules(pack: CreationPack, values: Record<string, unknown>): RuntimeDecisionModule[] {
  return pack.decisionModules.filter((module) => {
    if (!module.applicableWhen) return true;
    const actual = values[module.applicableWhen.fieldId];
    const expected = module.applicableWhen.value;
    if (module.applicableWhen.operator === "equals") return actual === expected;
    if (module.applicableWhen.operator === "not-equals") return actual !== expected;
    return Array.isArray(actual) ? actual.includes(expected) : typeof actual === "string" && actual.includes(String(expected));
  }).map((module) => ({ ...module, options: module.options ?? [] }));
}

export function safeStepBack(currentStep: FlowStepId, targetStep: FlowStepId, enabledSteps: FlowStepId[]) {
  const currentIndex = enabledSteps.indexOf(currentStep);
  const targetIndex = enabledSteps.indexOf(targetStep);
  return targetIndex >= 0 && targetIndex <= currentIndex;
}
