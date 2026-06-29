"use client";

import { ArrowRight, Loader2, RefreshCw, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { DirectionsWorkspace } from "@/components/DirectionsWorkspace";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { StepNav } from "@/components/StepNav";
import { useLogoFlowStore } from "@/store/useLogoFlowStore";
import type { AnalyzeLogoResponse, GenerateDetailsResponse } from "@/types/logo";

const DEFAULT_REGENERATION_PROMPT = "请避开当前 5 个方向，重新提供一批明显不同但仍适合原始需求的 Logo 设计方向。";

export default function DirectionsPage() {
  const router = useRouter();
  const store = useLogoFlowStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [regenerationPrompt, setRegenerationPrompt] = useState("");
  const [isRegenerating, setIsRegenerating] = useState(false);

  async function continueToDetails() {
    if (!store.rawInput || !store.analysis || !store.selectedDirection) return;
    store.setLoading(true);
    store.setError(null);
    try {
      const response = await fetch("/api/generate-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawInput: store.rawInput,
          analysis: store.analysis,
          selectedDirection: store.selectedDirection,
          providerConfig: store.modelConfig.analysis,
        }),
      });
      const result = (await response.json()) as GenerateDetailsResponse & { error?: string };
      if (!response.ok) throw new Error(result.error || "request failed");
      store.setDetailsResult(result);
      router.push("/details");
    } catch (error) {
      store.setError(error instanceof Error ? error.message : "生成失败，请重新尝试。");
    } finally {
      store.setLoading(false);
    }
  }

  async function regenerateDirections(mode: "direct" | "described") {
    if (!store.rawInput || !store.analysis || isRegenerating) return;
    const prompt = mode === "described" ? regenerationPrompt.trim() : DEFAULT_REGENERATION_PROMPT;
    if (mode === "described" && !prompt) return;

    setIsRegenerating(true);
    store.setError(null);
    try {
      const response = await fetch("/api/analyze-logo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawInput: store.rawInput,
          providerConfig: store.modelConfig.analysis,
          previousDirections: store.directions,
          regenerationPrompt: prompt,
        }),
      });
      const result = (await response.json()) as AnalyzeLogoResponse & { error?: string };
      if (!response.ok) throw new Error(result.error || "换一批失败，请重新尝试。");
      store.replaceDirections({
        ...result,
        analysis: store.analysis,
      });
      setDialogOpen(false);
      setRegenerationPrompt("");
    } catch (error) {
      store.setError(error instanceof Error ? error.message : "换一批失败，请重新尝试。");
    } finally {
      setIsRegenerating(false);
    }
  }

  return (
    <AppShell contentClassName="mx-auto flex h-[calc(100dvh-64px)] w-[min(100%-40px,1360px)] flex-col overflow-hidden px-0 py-5">
      <StepNav current={2} />
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        {!store.analysis ? (
          <EmptyState />
        ) : (
          <>
            <DirectionsWorkspace
              analysis={store.analysis}
              directions={store.directions}
              selectedDirection={store.selectedDirection}
              onSelect={store.selectDirection}
              onOpenRegenerate={() => setDialogOpen(true)}
            />
            <div className="stepic-panel flex min-h-[74px] shrink-0 items-center justify-between gap-4 px-5 py-3">
              <div className="min-w-0">
                {store.isLoading ? <LoadingState label="正在生成该方向下的设计细节..." /> : <ErrorState message={store.errorMessage} />}
                {!store.isLoading && !store.errorMessage ? (
                  <p className="truncate text-sm text-muted">
                    {store.selectedDirection ? (
                      <>
                        已选方向: <span className="font-semibold text-ink">{store.selectedDirection.title}</span>
                      </>
                    ) : (
                      "请选择一个设计方向"
                    )}
                  </p>
                ) : null}
              </div>
              <button type="button" onClick={continueToDetails} disabled={!store.selectedDirection || store.isLoading} className="stepic-primary-button shrink-0">
                继续选择细节
                <ArrowRight size={18} />
              </button>
            </div>
          </>
        )}
      </div>
      <RegenerateDirectionsDialog
        open={dialogOpen}
        prompt={regenerationPrompt}
        isLoading={isRegenerating}
        onChange={setRegenerationPrompt}
        onClose={() => {
          if (!isRegenerating) setDialogOpen(false);
        }}
        onDirect={() => regenerateDirections("direct")}
        onDescribed={() => regenerateDirections("described")}
      />
    </AppShell>
  );
}

function RegenerateDirectionsDialog({
  isLoading,
  onChange,
  onClose,
  onDescribed,
  onDirect,
  open,
  prompt,
}: {
  isLoading: boolean;
  onChange: (value: string) => void;
  onClose: () => void;
  onDescribed: () => void;
  onDirect: () => void;
  open: boolean;
  prompt: string;
}) {
  if (!open) return null;
  const canUseDescription = !!prompt.trim() && !isLoading;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#13201f]/28 px-6 backdrop-blur-sm">
      <section className="w-[min(100%,620px)] rounded-[28px] border border-line bg-white p-5 shadow-[0_30px_90px_rgba(35,67,62,0.18)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-accent">Regenerate Directions</p>
            <h2 className="mt-1 text-2xl font-semibold">换一批设计方向</h2>
            <p className="mt-2 text-sm leading-6 text-muted">可以直接让 AI 避开当前方向重新生成，也可以输入描述来指定新的方向倾向。</p>
          </div>
          <button type="button" onClick={onClose} disabled={isLoading} className="stepic-icon-button shrink-0" aria-label="关闭换一批对话框">
            <X size={18} />
          </button>
        </div>

        <label className="mt-5 grid gap-2">
          <span className="text-sm font-semibold text-muted">想换成什么方向</span>
          <textarea
            value={prompt}
            onChange={(event) => onChange(event.target.value)}
            placeholder="例如：更东方、更高级、更适合茶饮；或者更大胆、更潮牌、更图形化……"
            className="min-h-[132px] resize-none rounded-[20px] border border-line bg-[#f8faff]/70 px-4 py-3 text-sm leading-6 text-ink outline-none transition placeholder:text-[#9aa8a4] focus:border-accent focus:ring-4 focus:ring-accent/10"
          />
        </label>

        <div className="mt-5 flex items-center justify-between gap-3">
          <button type="button" onClick={onDirect} disabled={isLoading} className="stepic-secondary-button">
            {isLoading ? <Loader2 size={17} className="animate-spin" /> : <RefreshCw size={17} />}
            直接换一批
          </button>
          <button type="button" onClick={onDescribed} disabled={!canUseDescription} className="stepic-primary-button">
            {isLoading ? <Loader2 size={17} className="animate-spin" /> : <ArrowRight size={17} />}
            按描述换一批
          </button>
        </div>
      </section>
    </div>
  );
}

function EmptyState() {
  return (
    <section className="stepic-panel grid min-h-0 flex-1 place-items-center p-10 text-center">
      <div>
        <h1 className="text-2xl font-semibold">还没有可用的需求解析</h1>
        <p className="mt-2 text-muted">请先输入 Logo 需求。</p>
        <Link href="/" className="stepic-primary-button mt-5">
          回到首页
        </Link>
      </div>
    </section>
  );
}
