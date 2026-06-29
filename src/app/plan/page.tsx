"use client";

import { ArrowLeft, ArrowRight, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { CopyButton } from "@/components/CopyButton";
import { StepNav } from "@/components/StepNav";
import { useLogoFlowStore } from "@/store/useLogoFlowStore";
import type { LogoPlan } from "@/types/logo";

type PromptTab = "positive" | "negative";

export default function PlanPage() {
  const store = useLogoFlowStore();
  const [promptTab, setPromptTab] = useState<PromptTab>("positive");
  const currentPrompt = promptTab === "positive" ? store.positivePrompt : store.negativePrompt;

  return (
    <AppShell contentClassName="mx-auto flex h-[calc(100dvh-64px)] w-[min(100%-40px,1360px)] flex-col overflow-hidden px-0 py-5">
      <StepNav current={4} />
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        {!store.logoPlan ? (
          <EmptyState />
        ) : (
          <>
            <PlanWorkspace plan={store.logoPlan} prompt={currentPrompt} promptTab={promptTab} setPromptTab={setPromptTab} />
            <div className="stepic-panel flex min-h-[74px] shrink-0 items-center justify-between gap-4 px-5 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <Link href="/details" className="stepic-secondary-button min-h-11">
                  <ArrowLeft size={17} />
                  返回修改细节
                </Link>
                <Link href="/directions" className="stepic-secondary-button min-h-11">
                  <RotateCcw size={17} />
                  重新选择方向
                </Link>
              </div>
              <Link href="/result" className="stepic-primary-button shrink-0">
                确认并生成 Logo
                <ArrowRight size={18} />
              </Link>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

function PlanWorkspace({
  plan,
  prompt,
  promptTab,
  setPromptTab,
}: {
  plan: LogoPlan;
  prompt: string;
  promptTab: PromptTab;
  setPromptTab: (tab: PromptTab) => void;
}) {
  return (
    <section className="stepic-panel flex min-h-0 flex-1 flex-col p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-accent">Plan Review</p>
          <h1 className="mt-1 truncate text-3xl font-semibold">Logo 方案确认</h1>
        </div>
        <span className="rounded-full border border-accent/10 bg-accentSoft px-3 py-1 text-xs font-bold text-accent">{plan.selectedDirection}</span>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,0.92fr)_minmax(360px,0.72fr)] gap-4">
        <section className="grid min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] gap-3">
          <div className="grid grid-cols-3 gap-3">
            <InfoTile label="品牌类型" value={plan.brandType} />
            <InfoTile label="品牌名称" value={plan.brandName || "未提供"} />
            <InfoTile label="关键词数量" value={`${plan.designKeywords.length}`} />
          </div>

          <div className="rounded-[22px] border border-line/70 bg-white/66 p-4">
            <div className="text-xs font-bold text-muted">Logo 设计说明</div>
            <p className="mt-2 text-sm leading-6 text-ink">{plan.designSummary}</p>
            {plan.designKeywords.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {plan.designKeywords.map((item) => (
                  <span key={item} className="stepic-chip soft">
                    {item}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex min-h-0 flex-col rounded-[22px] border border-line/70 bg-white/62 p-4">
            <div className="text-xs font-bold uppercase tracking-[0.12em] text-muted">应用场景</div>
            <div className="mt-3 grid min-h-0 grid-cols-2 gap-2 overflow-y-auto pr-1 stepic-scroll">
              {plan.usageScenarios.length ? (
                plan.usageScenarios.map((item) => (
                  <span key={item} className="rounded-[16px] border border-line/70 bg-white/72 px-3 py-2 text-sm font-semibold text-ink">
                    {item}
                  </span>
                ))
              ) : (
                <span className="text-sm text-muted">未提供</span>
              )}
            </div>
          </div>
        </section>

        <section className="flex min-h-0 flex-col rounded-[24px] border border-line/70 bg-white/62 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex rounded-[18px] border border-line/70 bg-white/72 p-1">
              <PromptTabButton active={promptTab === "positive"} onClick={() => setPromptTab("positive")}>
                Positive Prompt
              </PromptTabButton>
              <PromptTabButton active={promptTab === "negative"} onClick={() => setPromptTab("negative")}>
                Negative Prompt
              </PromptTabButton>
            </div>
            <CopyButton text={prompt} />
          </div>
          <pre className="min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap rounded-[18px] border border-line/70 bg-[#f8faff]/80 p-4 text-sm leading-6 text-ink stepic-scroll">
            {prompt || "暂无 Prompt"}
          </pre>
        </section>
      </div>
    </section>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[20px] border border-line/70 bg-white/66 px-4 py-3">
      <div className="text-xs font-bold text-muted">{label}</div>
      <div className="mt-1 truncate text-base font-semibold text-ink">{value}</div>
    </div>
  );
}

function PromptTabButton({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={active ? "min-h-9 rounded-[14px] bg-accent px-3 text-xs font-bold text-white" : "min-h-9 rounded-[14px] px-3 text-xs font-bold text-muted transition hover:bg-white hover:text-ink"}
    >
      {children}
    </button>
  );
}

function EmptyState() {
  return (
    <section className="stepic-panel grid min-h-0 flex-1 place-items-center p-10 text-center">
      <div>
        <h1 className="text-2xl font-semibold">还没有生成 Logo 方案</h1>
        <p className="mt-2 text-muted">请先完成细节选择。</p>
        <Link href="/details" className="stepic-primary-button mt-5">
          回到细节页
        </Link>
      </div>
    </section>
  );
}
