"use client";

import { ArrowRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useLogoFlowStore } from "@/store/useLogoFlowStore";
import type { AnalyzeLogoResponse } from "@/types/logo";

const suggestions = ["极简科技品牌 Logo", "东方美学茶饮品牌", "适合 App 图标的方案", "高级感工作室标识", "运动潮牌视觉符号"];

export default function HomePage() {
  const router = useRouter();
  const rawInput = useLogoFlowStore((state) => state.rawInput);
  const isLoading = useLogoFlowStore((state) => state.isLoading);
  const errorMessage = useLogoFlowStore((state) => state.errorMessage);
  const modelConfig = useLogoFlowStore((state) => state.modelConfig);
  const resetForNewInput = useLogoFlowStore((state) => state.resetForNewInput);
  const setAnalyzeResult = useLogoFlowStore((state) => state.setAnalyzeResult);
  const setLoading = useLogoFlowStore((state) => state.setLoading);
  const setError = useLogoFlowStore((state) => state.setError);
  const [value, setValue] = useState(rawInput);
  const [isFocused, setIsFocused] = useState(false);
  const disabled = !value.trim() || isLoading;

  async function submit(nextValue: string) {
    resetForNewInput(nextValue);
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/analyze-logo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawInput: nextValue,
          providerConfig: modelConfig.analysis,
        }),
      });
      const result = (await response.json()) as AnalyzeLogoResponse & { error?: string };
      if (!response.ok) throw new Error(result.error || "request failed");
      setAnalyzeResult(result);
      router.push("/understanding");
    } catch (error) {
      setError(error instanceof Error ? error.message : "生成失败，请重新尝试。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell variant="home">
      <section className="grid w-full -translate-y-[2vh] justify-items-center gap-5 text-center">
        <h1 className="max-w-4xl text-[clamp(34px,5vw,58px)] font-bold leading-[1.08] tracking-normal">
          模糊的想法，<span className="text-[#003b73]">也能促成专业的设计</span>
        </h1>
        <p className="mx-auto max-w-xl text-[15px] leading-7 text-[#626b7f] md:text-[17px]">
          输入品牌信息和风格偏好，快速获得设计方向与 Logo 方案。
        </p>

        <form
          className={[
            "mt-2 w-[min(100%,880px)] rounded-[30px] p-px shadow-[0_18px_60px_rgba(24,33,66,0.08)] transition",
            isFocused ? "bg-[#003b73] shadow-[0_18px_70px_rgba(0,59,115,0.18)]" : "bg-[#141823]/10",
          ].join(" ")}
          onSubmit={(event) => {
            event.preventDefault();
            if (!disabled) submit(value.trim());
          }}
        >
          <div className="relative min-h-36 overflow-hidden rounded-[29px] border border-white/70 bg-white/90 backdrop-blur-xl">
            <label className="sr-only" htmlFor="logo-input">
              请输入 Logo 需求
            </label>
            <textarea
              id="logo-input"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  if (!disabled) submit(value.trim());
                }
              }}
              placeholder="例如：科技品牌，简洁可靠，适合 App 图标……"
              className="block min-h-36 w-full resize-none border-0 bg-transparent px-6 pb-16 pt-6 text-[17px] leading-7 text-[#141823] outline-none placeholder:text-[#9aa2b3]"
            />
            <div className="absolute bottom-4 left-5 right-4 flex items-center justify-between gap-4">
              <span
                className={[
                  "min-w-0 truncate text-xs text-[#8b94a7] transition md:text-[13px]",
                  isFocused || value ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0",
                ].join(" ")}
              >
                Enter 发送 / Shift + Enter 换行
              </span>
              <button
                type="submit"
                disabled={disabled}
                className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#003b73] text-white shadow-[0_12px_26px_rgba(0,59,115,0.24)] transition hover:-translate-y-0.5 hover:bg-[#002f5c] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                aria-label="提交 Logo 需求"
              >
                {isLoading ? <Loader2 size={20} className="animate-spin" /> : <ArrowRight size={21} />}
              </button>
            </div>
          </div>
        </form>

        <div className="flex w-[min(100%,880px)] flex-wrap justify-center gap-2.5 pt-1" aria-label="快捷建议">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              className="min-h-11 rounded-full border border-[#141823]/10 bg-white/70 px-4 text-sm text-[#626b7f] shadow-[0_8px_30px_rgba(24,33,66,0.045)] transition hover:-translate-y-0.5 hover:border-[#003b73]/30 hover:bg-white hover:text-[#141823]"
              type="button"
              onClick={() => {
                setValue(suggestion);
                window.requestAnimationFrame(() => document.getElementById("logo-input")?.focus());
              }}
            >
              {suggestion}
            </button>
          ))}
        </div>

        <div className="min-h-12 w-[min(100%,880px)]" aria-live="polite">
          {isLoading ? (
            <div className="mx-auto flex max-w-xl items-center justify-center gap-3 rounded-2xl border border-[#141823]/10 bg-white/75 px-4 py-3 text-sm text-[#626b7f] shadow-[0_10px_40px_rgba(24,33,66,0.055)]">
              <Loader2 size={18} className="animate-spin text-[#003b73]" />
              正在解析需求并生成设计方向...
            </div>
          ) : null}
          {errorMessage ? (
            <div className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-[0_10px_40px_rgba(24,33,66,0.055)]">
              {errorMessage}
            </div>
          ) : null}
        </div>
      </section>
    </AppShell>
  );
}
