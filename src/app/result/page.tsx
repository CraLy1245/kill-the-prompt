"use client";

import { ImageIcon, Loader2 } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CopyButton } from "@/components/CopyButton";
import { StepNav } from "@/components/StepNav";
import { useLogoFlowStore } from "@/store/useLogoFlowStore";
import type { DesignDirection, LogoPlan } from "@/types/logo";

const DEFAULT_SIZE = "1024x1024";
const DEFAULT_FORMAT = "png";

export default function ResultPage() {
  const store = useLogoFlowStore();

  async function generateImage() {
    if (!store.positivePrompt || store.isGeneratingImage) return;

    store.setGeneratingImage(true);
    store.setError(null);
    store.setSavedNotice("");
    try {
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerConfig: store.modelConfig.image,
          prompt: store.positivePrompt,
          negativePrompt: store.negativePrompt,
          size: DEFAULT_SIZE,
          format: DEFAULT_FORMAT,
        }),
      });
      const result = (await response.json()) as { imageUrl?: string; error?: string };
      if (!response.ok || !result.imageUrl) {
        throw new Error(result.error || "生成图片失败，请稍后重试。");
      }
      store.setImageUrl(result.imageUrl);
    } catch (error) {
      store.setError(error instanceof Error ? error.message : "生成图片失败，请稍后重试。");
    } finally {
      store.setGeneratingImage(false);
    }
  }

  function downloadImage() {
    if (!store.imageUrl) return;
    const link = document.createElement("a");
    link.href = store.imageUrl;
    link.download = `stepic-logo-${Date.now()}.png`;
    link.rel = "noreferrer";
    document.body.appendChild(link);
    link.click();
    link.remove();
    store.setSavedNotice("已开始下载图片。");
  }

  function viewImage() {
    if (!store.imageUrl) return;
    window.open(store.imageUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <AppShell contentClassName="mx-auto flex h-[calc(100dvh-64px)] w-[min(100%-40px,1360px)] flex-col overflow-hidden px-0 py-5">
      <StepNav current={5} />
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        {!store.positivePrompt ? (
          <EmptyState />
        ) : (
          <>
            <section className="grid min-h-0 flex-1 grid-cols-[440px_300px_340px] gap-4 overflow-x-auto pb-1 xl:grid-cols-[minmax(440px,560px)_320px_minmax(0,1fr)] stepic-scroll">
              <section className="stepic-panel flex min-h-0 flex-col p-5">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-accent">Image Preview</p>
                    <h2 className="mt-1 text-2xl font-semibold leading-tight">图片展示区</h2>
                  </div>
                  <span className="rounded-full border border-line/70 bg-white/72 px-3 py-1 text-xs font-bold text-muted">{DEFAULT_SIZE}</span>
                </div>
                <div className="grid min-h-0 flex-1 place-items-center">
                  <div className="stepic-preview-stage">
                    {store.imageUrl ? (
                      <div className="stepic-preview-image-frame">
                        <img src={store.imageUrl} alt="生成的 Logo 图片" className="stepic-preview-image" />
                      </div>
                    ) : (
                      <div className="grid h-full w-full place-items-center p-8 text-center">
                        <div>
                          <div className="mx-auto grid h-16 w-16 place-items-center rounded-[22px] bg-accentSoft text-accent">
                            {store.isGeneratingImage ? <Loader2 size={28} className="animate-spin" /> : <ImageIcon size={28} />}
                          </div>
                          <h3 className="mt-5 text-xl font-semibold">{store.isGeneratingImage ? "正在生成 Logo" : "等待生成"}</h3>
                          <p className="mt-2 max-w-xs text-sm leading-6 text-muted">{store.isGeneratingImage ? "正在根据方案生成图片，请稍等。" : "点击右侧按钮后，这里会展示生成的 Logo 图片。"}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <DesignConceptCard plan={store.logoPlan} direction={store.selectedDirection} />

              <aside className="stepic-panel flex min-h-0 flex-col overflow-y-auto p-5 stepic-scroll">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-accent">Generation Control</p>
                  <h1 className="mt-1 text-2xl font-semibold leading-tight">生成 Logo 图片</h1>
                  <p className="mt-3 text-sm leading-6 text-muted">这里仅负责生图。方案说明和 Prompt 确认在上一页完成。</p>
                </div>

                <div className="mt-5 flex min-h-[150px] flex-1 flex-col rounded-[22px] border border-line/70 bg-white/62 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Positive Prompt</div>
                    <CopyButton text={store.positivePrompt} />
                  </div>
                  <pre className="min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap rounded-[18px] border border-line/70 bg-[#f8faff]/80 p-4 text-sm leading-6 text-ink stepic-scroll">
                    {store.positivePrompt}
                  </pre>
                </div>

                <div className="mt-4 grid gap-3">
                  {store.errorMessage ? <div className="rounded-[18px] border border-red-200 bg-red-50/95 px-4 py-3 text-sm text-red-700">{store.errorMessage}</div> : null}
                  {store.savedNotice ? <div className="rounded-[18px] border border-accent/10 bg-accentSoft px-4 py-3 text-sm font-semibold text-accent">{store.savedNotice}</div> : null}
                  <button type="button" onClick={generateImage} disabled={store.isGeneratingImage || !store.positivePrompt} className="stepic-primary-button w-full">
                    {store.isGeneratingImage ? <Loader2 size={18} className="animate-spin" /> : null}
                    {store.isGeneratingImage ? "生成中..." : store.imageUrl ? "重新生成" : "一键生图"}
                  </button>
                  <div className="grid grid-cols-2 gap-3">
                    <button type="button" onClick={viewImage} disabled={!store.imageUrl} className="stepic-secondary-button">
                      查看原图
                    </button>
                    <button type="button" onClick={downloadImage} disabled={!store.imageUrl} className="stepic-secondary-button">
                      下载图片
                    </button>
                  </div>
                </div>
              </aside>
            </section>

            <div className="stepic-panel flex min-h-[74px] shrink-0 items-center justify-between gap-4 px-5 py-3">
              <p className="min-w-0 truncate text-sm text-muted">{store.imageUrl ? "图片已生成，可打开原图或下载。" : "确认 Prompt 后即可生成 Logo 图片。"}</p>
              <div className="stepic-footer-actions">
                <Link href="/plan" className="stepic-secondary-button stepic-footer-action">
                  返回方案确认
                </Link>
                <Link href="/details" className="stepic-secondary-button stepic-footer-action">
                  修改细节
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

function DesignConceptCard({ plan, direction }: { plan: LogoPlan | null; direction: DesignDirection | null }) {
  const title = plan?.selectedDirection || direction?.title || "当前设计方向";
  const summary = plan?.designSummary || direction?.reason || "围绕已确认的品牌需求与视觉细节，形成清晰、可延展的 Logo 视觉表达。";
  const keywords = (plan?.designKeywords?.length ? plan.designKeywords : direction?.visualKeywords ?? []).slice(0, 4);

  return (
    <section className="stepic-panel flex min-h-0 flex-col p-5">
      <div className="text-xs font-bold uppercase tracking-[0.12em] text-accent">Design Concept</div>
      <h2 className="mt-1 text-2xl font-semibold leading-tight text-ink">{title}</h2>
      <p className="mt-4 min-h-0 flex-1 overflow-y-auto text-sm leading-7 text-muted stepic-scroll">{summary}</p>
      {keywords.length ? (
        <div className="mt-5 flex flex-wrap gap-2 border-t border-line/70 pt-4">
          {keywords.map((keyword) => (
            <span key={keyword} className="rounded-full border border-accent/10 bg-accentSoft px-2.5 py-1 text-[11px] font-semibold text-accent">
              {keyword}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function EmptyState() {
  return (
    <section className="stepic-panel grid min-h-0 flex-1 place-items-center p-10 text-center">
      <div>
        <h1 className="text-2xl font-semibold">还没有可用于生图的 Prompt</h1>
        <p className="mt-2 text-muted">请先完成方案确认。</p>
        <Link href="/plan" className="stepic-primary-button mt-5">
          回到方案确认
        </Link>
      </div>
    </section>
  );
}
