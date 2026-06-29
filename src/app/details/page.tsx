"use client";

import { Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { DetailsWorkspace } from "@/components/DetailsWorkspace";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { StepNav } from "@/components/StepNav";
import { useLogoFlowStore } from "@/store/useLogoFlowStore";
import type { DetailModule, DetailSelections, FinalPromptResponse } from "@/types/logo";

export default function DetailsPage() {
  const router = useRouter();
  const store = useLogoFlowStore();
  const totalModules = store.detailModules.length;
  const configuredModules = store.detailModules.filter((module) => (store.detailSelections[module.id]?.length ?? 0) > 0).length;

  async function buildPrompt() {
    if (!store.rawInput || !store.analysis || !store.selectedDirection) return;
    store.setLoading(true);
    store.setError(null);
    try {
      const response = await fetch("/api/build-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawInput: store.rawInput,
          analysis: store.analysis,
          selectedDirection: store.selectedDirection,
          detailSelections: toSemanticSelections(store.detailSelections, store.detailModules),
          providerConfig: store.modelConfig.analysis,
        }),
      });
      const result = (await response.json()) as FinalPromptResponse & { error?: string };
      if (!response.ok) throw new Error(result.error || "request failed");
      store.setPromptResult(result);
      router.push("/plan");
    } catch (error) {
      store.setError(error instanceof Error ? error.message : "生成失败，请重新尝试。");
    } finally {
      store.setLoading(false);
    }
  }

  return (
    <AppShell contentClassName="mx-auto flex h-[calc(100dvh-64px)] w-[min(100%-40px,1360px)] flex-col overflow-hidden px-0 py-5">
      <StepNav current={3} />
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        {!store.selectedDirection || !store.detailModules.length ? (
          <EmptyState />
        ) : (
          <>
            <DetailsWorkspace
              selectedDirection={store.selectedDirection}
              modules={store.detailModules}
              selections={store.detailSelections}
              onToggle={store.toggleDetailOption}
              onUpdateModule={store.updateDetailModule}
              onUpdateOption={store.updateDetailOption}
            />
            <div className="stepic-panel flex min-h-[74px] shrink-0 items-center justify-between gap-4 px-5 py-3">
              <div className="flex min-w-0 items-center gap-4">
                <Link href="/directions" className="stepic-secondary-button min-h-11 shrink-0">
                  返回方向页
                </Link>
                {store.isLoading ? <LoadingState label="正在整理 Logo 方案..." /> : <ErrorState message={store.errorMessage} />}
                {!store.isLoading && !store.errorMessage ? (
                  <p className="truncate text-sm text-muted">
                    已配置 <span className="font-semibold text-ink">{configuredModules}</span> / {totalModules} 个模块
                  </p>
                ) : null}
              </div>
              <button type="button" onClick={buildPrompt} disabled={store.isLoading} className="stepic-primary-button shrink-0">
                <Sparkles size={18} />
                生成 Logo 方案
              </button>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

function toSemanticSelections(selections: DetailSelections, modules: DetailModule[]) {
  const result: DetailSelections = {};
  modules.forEach((module) => {
    const selectedIds = selections[module.id] ?? [];
    const selectedOptions = module.options
      .filter((option) => selectedIds.includes(option.id))
      .map((option) => `${option.label}：${option.description}`);
    if (selectedOptions.length) {
      result[module.id] = selectedOptions;
    }
  });
  return result;
}

function EmptyState() {
  return (
    <section className="stepic-panel grid min-h-0 flex-1 place-items-center p-10 text-center">
      <div>
        <h1 className="text-2xl font-semibold">还没有可用的细节模块</h1>
        <p className="mt-2 text-muted">请先选择一个设计方向。</p>
        <Link href="/directions" className="stepic-primary-button mt-5">
          回到方向页
        </Link>
      </div>
    </section>
  );
}
