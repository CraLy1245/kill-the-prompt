"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useLogoFlowStore } from "@/store/useLogoFlowStore";
import type { AnalyzeLogoResponse } from "@/types/logo";

const suggestionRows = [
  ["极简科技品牌 Logo", "东方美学茶饮品牌", "适合 App 图标的方案", "高级感工作室标识", "运动潮牌视觉符号"],
];

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
  const disabled = !value.trim() || isLoading;

  async function submit(nextValue: string) {
    resetForNewInput(nextValue);
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/analyze-logo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawInput: nextValue, providerConfig: modelConfig.analysis }),
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
      <div className="relative h-[calc(100dvh-58px)] min-h-0 overflow-hidden bg-paper px-8 text-ink selection:bg-accentSoft selection:text-accent">
        <div className="pointer-events-none absolute -left-[10%] -top-[12%] h-[54%] w-[42%] rounded-full bg-[#cfe6df]/45 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-[18%] -right-[10%] h-[42%] w-[32%] rounded-full bg-[#d9ece6]/35 blur-[110px]" />

        <section className="relative z-10 mx-auto flex h-full max-w-[1240px] -translate-y-1 flex-col items-center justify-center">
          <div className="mb-7 max-w-[1280px] text-center">
            <h1 className="max-w-[1100px] text-[clamp(38px,3.4vw,72px)] font-extrabold leading-[1.08] tracking-[-0.045em] md:whitespace-nowrap">
              模糊的想法，<span className="text-accent">也能促成专业的设计</span>
            </h1>
            <p className="mx-auto mt-7 max-w-[720px] text-[20px] font-medium leading-[1.55] tracking-[-0.02em] text-muted">
              输入您的品牌信息与风格偏好，AI 引擎将为您快速探索视觉方向，
              <br />
              生成高品质 Logo 方案。
            </p>
          </div>

          <form
            className="stepic-prompt-shell relative w-full max-w-[1110px] overflow-hidden rounded-[24px] bg-white/95 shadow-[0_18px_50px_rgba(35,67,62,0.1)]"
            onSubmit={(event) => {
              event.preventDefault();
              if (!disabled) void submit(value.trim());
            }}
          >
            <label className="sr-only" htmlFor="logo-input">描述您的品牌需求</label>
            <textarea
              id="logo-input"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  if (!disabled) void submit(value.trim());
                }
              }}
              placeholder="描述您的品牌，例如：一家主打极简风格的高级感独立咖啡工作室..."
              className="relative z-10 block min-h-[100px] w-full resize-none bg-transparent px-6 py-5 text-[17px] leading-7 text-slate-800 outline-none placeholder:text-slate-400"
            />
            <div className="relative z-10 flex min-h-[44px] items-center justify-between bg-[#f5f8f6] px-6 py-1">
              <div className="flex items-center gap-1 text-[13px] font-medium text-muted">
                <span>按</span>
                <kbd className="rounded border border-line bg-[#eef5f2] px-2 py-1 font-mono text-[11px]">Enter</kbd>
                <span>发送，</span>
                <kbd className="rounded border border-line bg-[#eef5f2] px-2 py-1 font-mono text-[11px]">Shift + Enter</kbd>
                <span>换行</span>
              </div>
              <button
                type="submit"
                disabled={disabled}
                className={`flex items-center gap-2 rounded-full px-7 py-2 text-[16px] font-semibold leading-5 ${value.trim() ? "bg-accent text-white shadow-sm" : "cursor-not-allowed bg-[#eaf1ee] text-[#9aa8a4]"}`}
              >
                生成提案
              </button>
            </div>
          </form>

          <div className="mt-7 w-full max-w-[920px]" aria-label="快捷建议">
            <p className="mb-3 text-center text-[15px] font-medium text-muted">或者尝试这些预设方向：</p>
            <SuggestionGrid
              rows={suggestionRows}
              onChoose={(text) => {
                setValue(text);
                window.requestAnimationFrame(() => document.getElementById("logo-input")?.focus());
              }}
            />
          </div>

          <div className="min-h-10 pt-3" aria-live="polite">
            {isLoading ? <div className="flex items-center justify-center gap-3 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin text-accent" />正在解析需求并生成设计方向...</div> : null}
            {errorMessage ? <div className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</div> : null}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function SuggestionGrid({ rows, onChoose }: { rows: string[][]; onChoose: (value: string) => void }) {
  return (
    <div className="stepic-suggestion-grid">
      {rows.map((row, rowIndex) => (
        <div key={`suggestions-${rowIndex}`} className="stepic-suggestion-row">
          {row.map((text) => (
            <button
              key={text}
              type="button"
              onClick={() => onChoose(text)}
              className="stepic-suggestion-pill"
            >
              {text}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

type LiquidTarget = { activeIndex: number; height: number; id: number; left: number; top: number; width: number };
type LiquidPointer = { x: number; y: number };

function getLiquidRowClass(rowIndex: number) {
  return `stepic-liquid-row stepic-liquid-row--${rowIndex + 1}`;
}

function LiquidSuggestionRail({ rows, onChoose }: { rows: string[][]; onChoose: (value: string) => void }) {
  const railRef = useRef<HTMLDivElement>(null);
  const [target, setTarget] = useState<LiquidTarget | null>(null);
  const [origin, setOrigin] = useState<LiquidTarget | null>(null);
  const [pointer, setPointer] = useState<LiquidPointer | null>(null);
  const rowOffsets = rows.map((_, rowIndex) => rows.slice(0, rowIndex).reduce((total, row) => total + row.length, 0));

  function moveLiquid(event: { currentTarget: HTMLButtonElement }, activeIndex: number) {
    const railBounds = railRef.current?.getBoundingClientRect();
    const buttonBounds = event.currentTarget.getBoundingClientRect();
    if (!railBounds) return;
    const nextLeft = buttonBounds.left - railBounds.left;
    const nextTarget = {
      activeIndex,
      height: buttonBounds.height,
      id: Date.now(),
      left: nextLeft,
      top: buttonBounds.top - railBounds.top,
      width: buttonBounds.width,
    };
    if (target && target.activeIndex !== activeIndex) setOrigin({ ...target, id: Date.now() });
    setTarget(nextTarget);
    setPointer({ x: nextLeft + buttonBounds.width / 2, y: nextTarget.top + buttonBounds.height / 2 });
  }

  function trackLiquidPointer(event: { clientX: number; clientY: number }) {
    const rail = railRef.current;
    if (!rail || !target) return;
    const railBounds = rail.getBoundingClientRect();
    const y = event.clientY - railBounds.top;
    const isInsideCapsuleBand = Array.from(rail.querySelectorAll<HTMLButtonElement>("button")).some((button) => {
      const bounds = button.getBoundingClientRect();
      return event.clientY >= bounds.top && event.clientY <= bounds.bottom;
    });
    if (!isInsideCapsuleBand) {
      setPointer(null);
      return;
    }
    setPointer({ x: event.clientX - railBounds.left, y });
  }

  const liquidStyle = {
    height: target ? `${target.height}px` : "0px",
    left: target ? `${target.left}px` : "0px",
    top: target ? `${target.top}px` : "0px",
    width: target ? `${target.width}px` : "0px",
  };
  const originStyle = {
    height: origin ? `${origin.height}px` : "0px",
    left: origin ? `${origin.left}px` : "0px",
    top: origin ? `${origin.top}px` : "0px",
    width: origin ? `${origin.width}px` : "0px",
  };
  const pointerStyle = {
    height: "28px",
    left: pointer ? `${pointer.x - 14}px` : "0px",
    top: pointer ? `${pointer.y - 14}px` : "0px",
    width: "28px",
  };

  return (
    <div
      ref={railRef}
      className="stepic-liquid-rail"
      onPointerMove={trackLiquidPointer}
      onPointerLeave={() => {
        setTarget(null);
        setOrigin(null);
        setPointer(null);
      }}
    >
      <svg className="absolute h-0 w-0" aria-hidden="true">
        <defs>
          <filter id="stepic-suggestion-goo" x="-40%" y="-60%" width="180%" height="220%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
              result="goo"
            />
            <feBlend in="SourceGraphic" in2="goo" />
          </filter>
          <filter id="stepic-pill-body-goo" x="-12%" y="-35%" width="124%" height="170%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4.5" result="bodyBlur" />
            <feColorMatrix
              in="bodyBlur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -8"
              result="bodyGoo"
            />
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.012 0.045"
              numOctaves="2"
              seed="8"
              result="bodyNoise"
            >
              <animate
                attributeName="baseFrequency"
                dur="9s"
                values="0.012 0.045;0.018 0.065;0.012 0.045"
                repeatCount="indefinite"
              />
            </feTurbulence>
            <feDisplacementMap
              in="bodyGoo"
              in2="bodyNoise"
              scale="4.5"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>
      <div className="stepic-liquid-body-layer" aria-hidden="true">
        {rows.map((row, rowIndex) => (
          <div key={`body-${rowIndex}`} className={getLiquidRowClass(rowIndex)}>
            {row.map((text, itemIndex) => {
              const flatIndex = rowOffsets[rowIndex] + itemIndex;
              return (
                <span
                  key={text}
                  className={target?.activeIndex === flatIndex
                    ? "stepic-liquid-body is-active"
                    : "stepic-liquid-body"}
                >
                  {text}
                </span>
              );
            })}
          </div>
        ))}
      </div>
      <div className={target ? "stepic-liquid-layer is-visible" : "stepic-liquid-layer"} aria-hidden="true">
        {origin ? <span key={origin.id} className="stepic-metaball origin" style={originStyle} /> : null}
        <span className="stepic-metaball pool" style={liquidStyle} />
        {pointer ? (
          <>
            <span className="stepic-metaball droplet lag" style={pointerStyle} />
            <span className="stepic-metaball droplet cursor" style={pointerStyle} />
          </>
        ) : null}
      </div>
      <div className="stepic-liquid-hit-layer">
        {rows.map((row, rowIndex) => (
          <div key={`controls-${rowIndex}`} className={getLiquidRowClass(rowIndex)}>
            {row.map((text, itemIndex) => {
              const flatIndex = rowOffsets[rowIndex] + itemIndex;
              return (
                <button
                  key={text}
                  type="button"
                  onPointerEnter={(event) => moveLiquid(event, flatIndex)}
                  onFocus={(event) => moveLiquid(event, flatIndex)}
                  onClick={() => onChoose(text)}
                  className={target?.activeIndex === flatIndex
                    ? "stepic-liquid-pill text-accent"
                    : "stepic-liquid-pill text-muted"}
                >
                  <span>{text}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
