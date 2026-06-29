"use client";

import { Check, Palette, RefreshCw, Shapes, Type } from "lucide-react";
import Link from "next/link";
import type { DesignDirection, RequirementAnalysis } from "@/types/logo";

const quietScrollClass = "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

function joinValue(value: string | string[] | null | undefined) {
  if (!value) return "";
  return Array.isArray(value) ? value.filter(Boolean).join("、") : value;
}

function PreviewField({ icon: Icon, label, value, wide = false }: { icon?: typeof Shapes; label: string; value?: string | string[]; wide?: boolean }) {
  const text = joinValue(value);
  if (!text) return null;
  return (
    <div className={wide ? "rounded-[18px] border border-line/70 bg-white/70 px-4 py-3 md:col-span-2" : "rounded-[18px] border border-line/70 bg-white/70 px-4 py-3"}>
      <div className="flex items-center gap-1.5 text-xs font-bold text-muted">
        {Icon ? <Icon size={14} /> : null}
        {label}
      </div>
      <p className="mt-1 line-clamp-3 text-sm leading-6 text-ink">{text}</p>
    </div>
  );
}

function CompactRequirementSummary({ analysis }: { analysis: RequirementAnalysis }) {
  const items = [
    ["品牌", joinValue(analysis.brandName) || joinValue(analysis.brandType)],
    ["用户", joinValue(analysis.targetUsers)],
    ["气质", joinValue(analysis.brandMood)],
    ["场景", joinValue(analysis.applicationScenarios)],
  ].filter((item) => item[1]);

  return (
    <section className="stepic-panel flex min-h-[86px] items-center justify-between gap-5 px-5 py-4">
      <div className="min-w-0">
        <div className="text-xs font-bold uppercase tracking-[0.12em] text-accent">Requirement Snapshot</div>
        <h1 className="mt-1 truncate text-xl font-semibold">{joinValue(analysis.brandType) || "Logo 设计需求"}</h1>
      </div>
      <div className="grid min-w-0 flex-1 grid-cols-4 gap-2">
        {items.map(([label, value]) => (
          <div key={label} className="min-w-0 rounded-[16px] border border-line/70 bg-white/64 px-3 py-2">
            <span className="mr-2 text-xs font-bold text-muted">{label}</span>
            <span className="align-middle line-clamp-1 text-sm">{value}</span>
          </div>
        ))}
      </div>
      <Link href="/understanding" className="stepic-secondary-button min-h-11 shrink-0">
        返回理解确认
      </Link>
    </section>
  );
}

function DirectionButton({
  direction,
  selected,
  onSelect,
}: {
  direction: DesignDirection;
  selected: boolean;
  onSelect: () => void;
}) {
  const keywords = direction.visualKeywords.slice(0, 3);

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={[
        "group w-full rounded-[20px] border px-4 py-3 text-left transition hover:border-accent/35 hover:bg-white",
        selected ? "border-accent/45 bg-accentSoft shadow-[inset_5px_0_0_#0f766e]" : "border-line/70 bg-white/68",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="line-clamp-1 text-base font-semibold">{direction.title}</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {keywords.map((keyword) => (
              <span key={keyword} className="rounded-full bg-accentSoft px-2 py-0.5 text-[11px] font-bold text-accent">
                {keyword}
              </span>
            ))}
          </div>
        </div>
        {selected ? (
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-accent text-white shadow-[0_10px_24px_rgba(15,118,110,0.18)]">
            <Check size={14} />
          </span>
        ) : null}
      </div>
      {direction.suitableFor ? <p className="mt-2 line-clamp-2 text-sm leading-5 text-muted">{direction.suitableFor}</p> : null}
    </button>
  );
}

function SelectedDirectionPreview({ direction }: { direction: DesignDirection | null }) {
  if (!direction) {
    return (
      <section className="stepic-panel grid min-h-0 place-items-center p-8 text-center">
        <div>
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-[22px] bg-accentSoft text-xl font-semibold text-accent">3</div>
          <h2 className="mt-4 text-2xl font-semibold">选择一个设计方向</h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-muted">左侧保持紧凑展示，选中后这里会展开完整判断依据。</p>
        </div>
      </section>
    );
  }

  return (
    <section className="stepic-panel flex min-h-0 flex-col p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-xs font-bold uppercase tracking-[0.12em] text-accent">Selected Direction</div>
          <h2 className="mt-2 line-clamp-2 text-3xl font-semibold leading-tight">{direction.title}</h2>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent px-3 py-1 text-xs font-bold text-white">
          <Check size={13} />
          已选中
        </span>
      </div>

      {direction.suitableFor ? <p className="mt-4 rounded-[20px] border border-line/70 bg-white/62 px-4 py-3 text-sm leading-6 text-muted">{direction.suitableFor}</p> : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {direction.visualKeywords.map((keyword) => (
          <span key={keyword} className="stepic-chip soft">
            {keyword}
          </span>
        ))}
      </div>

      <div className="mt-5 grid min-h-0 gap-3 overflow-y-auto pr-1 md:grid-cols-2 stepic-scroll">
        <PreviewField icon={Shapes} label="元素建议" value={direction.elements} />
        <PreviewField icon={Palette} label="颜色建议" value={direction.colors} />
        <PreviewField icon={Type} label="字体建议" value={direction.fonts} />
        <PreviewField label="构图建议" value={direction.composition} />
        <PreviewField label="推荐理由" value={direction.reason} wide />
      </div>
    </section>
  );
}

export function DirectionsWorkspace({
  analysis,
  directions,
  selectedDirection,
  onSelect,
  onOpenRegenerate,
}: {
  analysis: RequirementAnalysis;
  directions: DesignDirection[];
  selectedDirection: DesignDirection | null;
  onSelect: (direction: DesignDirection) => void;
  onOpenRegenerate: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <CompactRequirementSummary analysis={analysis} />
      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <section className="stepic-panel flex min-h-0 flex-col p-4">
          <div className="mb-3 flex items-end justify-between gap-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.12em] text-accent">Design Directions</div>
              <h2 className="mt-1 text-xl font-semibold">选择方向</h2>
            </div>
            <button type="button" onClick={onOpenRegenerate} className="inline-flex min-h-9 items-center gap-2 rounded-[15px] border border-accent/15 bg-accentSoft px-3 text-xs font-bold text-accent transition hover:border-accent/35 hover:bg-white">
              <RefreshCw size={14} />
              换一批
            </button>
          </div>
          <div className={`grid min-h-0 gap-2 overflow-y-auto ${quietScrollClass}`}>
            {directions.map((direction) => (
              <DirectionButton key={direction.id} direction={direction} selected={selectedDirection?.id === direction.id} onSelect={() => onSelect(direction)} />
            ))}
          </div>
        </section>
        <SelectedDirectionPreview direction={selectedDirection} />
      </div>
    </div>
  );
}
