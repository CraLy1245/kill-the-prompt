"use client";

import { Palette, Shapes, Type } from "lucide-react";
import { useEffect, useState } from "react";
import type { DirectionEditablePatch } from "@/store/useLogoFlowStore";
import type { DesignDirection, RequirementAnalysis } from "@/types/logo";

function joinValue(value: string | string[] | null | undefined) {
  if (!value) return "";
  return Array.isArray(value) ? value.filter(Boolean).join("、") : value;
}

function splitListValue(value: string) {
  return value.split(/[、,，;；\n]/).map((item) => item.trim()).filter(Boolean);
}

type DirectionEditableField = "elements" | "colors" | "fonts" | "composition" | "reason";

const directionFieldLabels: Record<DirectionEditableField, string> = {
  elements: "元素建议",
  colors: "颜色建议",
  fonts: "字体建议",
  composition: "构图建议",
  reason: "推荐理由",
};

function DirectionPreviewField({
  icon: Icon,
  label,
  value,
  wide = false,
  active,
  onInspect,
}: {
  icon?: typeof Shapes;
  label: string;
  value?: string | string[];
  wide?: boolean;
  active: boolean;
  onInspect: () => void;
}) {
  const text = joinValue(value);
  if (!text) return null;

  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onInspect}
      className={[
        "rounded-[18px] border bg-white/70 px-4 py-3 text-left transition-[border-color,background-color,box-shadow] duration-200 hover:border-accent/30 hover:bg-white",
        wide ? "md:col-span-2" : "",
        active ? "border-accent/55 bg-white shadow-[inset_0_0_0_1px_rgba(15,118,110,0.18),0_8px_24px_rgba(15,118,110,0.08)]" : "border-line/70",
      ].join(" ")}
    >
      <div className="flex items-center gap-1.5 text-xs font-bold text-muted">
        {Icon ? <Icon size={14} /> : null}
        {label}
      </div>
      <p className="mt-1 text-sm leading-6 text-ink">{text}</p>
    </button>
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
    <section className="grid min-h-[62px] grid-cols-4 gap-2">
      <div className="contents">
        {items.map(([label, value]) => (
          <div key={label} className="min-w-0 rounded-[16px] border border-line/70 bg-white/64 px-3 py-2">
            <span className="mr-2 text-xs font-bold text-muted">{label}</span>
            <span className="align-middle line-clamp-1 text-sm">{value}</span>
          </div>
        ))}
      </div>
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
        "group relative min-h-[142px] w-full overflow-hidden rounded-[22px] border bg-white/68 p-4 text-left transition-[border-color,background-color,box-shadow] duration-200 hover:border-accent/30 hover:bg-white",
        selected
          ? "border-accent/55 bg-white shadow-[inset_0_0_0_1px_rgba(15,118,110,0.2),0_10px_28px_rgba(15,118,110,0.1)]"
          : "border-line/70",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-base font-semibold leading-6 text-ink">{direction.title}</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {keywords.map((keyword) => (
              <span
                key={keyword}
                className="rounded-full bg-accentSoft px-2 py-0.5 text-[11px] font-bold text-accent"
              >
                {keyword}
              </span>
            ))}
          </div>
        </div>
      </div>
      {direction.suitableFor ? (
        <p className="mt-2 text-sm leading-5 text-muted">{direction.suitableFor}</p>
      ) : null}
    </button>
  );
}

function toDirectionDraft(direction: DesignDirection | null) {
  return {
    elements: joinValue(direction?.elements),
    colors: joinValue(direction?.colors),
    fonts: joinValue(direction?.fonts),
    composition: direction?.composition ?? "",
    reason: direction?.reason ?? "",
  };
}

function SelectedDirectionPreview({
  activeField,
  direction,
  onInspect,
}: {
  activeField: DirectionEditableField;
  direction: DesignDirection | null;
  onInspect: (field: DirectionEditableField) => void;
}) {
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
        <span className="inline-flex shrink-0 rounded-full bg-accent px-3 py-1 text-xs font-bold text-white">已选中</span>
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
        <DirectionPreviewField icon={Shapes} label="元素建议" value={direction.elements} active={activeField === "elements"} onInspect={() => onInspect("elements")} />
        <DirectionPreviewField icon={Palette} label="颜色建议" value={direction.colors} active={activeField === "colors"} onInspect={() => onInspect("colors")} />
        <DirectionPreviewField icon={Type} label="字体建议" value={direction.fonts} active={activeField === "fonts"} onInspect={() => onInspect("fonts")} />
        <DirectionPreviewField label="构图建议" value={direction.composition} active={activeField === "composition"} onInspect={() => onInspect("composition")} />
        <DirectionPreviewField label="推荐理由" value={direction.reason} wide active={activeField === "reason"} onInspect={() => onInspect("reason")} />
      </div>
    </section>
  );
}

function DirectionInspector({
  activeField,
  direction,
  onSave,
}: {
  activeField: DirectionEditableField;
  direction: DesignDirection | null;
  onSave: (patch: DirectionEditablePatch) => void;
}) {
  const [draft, setDraft] = useState(() => toDirectionDraft(direction));

  useEffect(() => {
    setDraft(toDirectionDraft(direction));
  }, [direction]);

  if (!direction) {
    return (
      <aside className="stepic-panel grid min-h-0 place-items-center p-5 text-center">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.12em] text-accent">Inspector</div>
          <h2 className="mt-2 text-2xl font-semibold">编辑方向</h2>
          <p className="mt-2 text-sm leading-6 text-muted">选择方向后，可在这里修改方案建议。</p>
        </div>
      </aside>
    );
  }

  const normalizedPatch: DirectionEditablePatch = {
    elements: splitListValue(draft.elements),
    colors: splitListValue(draft.colors),
    fonts: splitListValue(draft.fonts),
    composition: draft.composition.trim(),
    reason: draft.reason.trim(),
  };
  const savedDraft = toDirectionDraft(direction);
  const hasChanges = (Object.keys(draft) as Array<keyof typeof draft>).some((key) => draft[key].trim() !== savedDraft[key].trim());
  const canSave = normalizedPatch.elements.length > 0 && normalizedPatch.colors.length > 0 && normalizedPatch.fonts.length > 0 && !!normalizedPatch.composition && !!normalizedPatch.reason;

  function updateDraft(field: keyof typeof draft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  return (
    <aside className="stepic-panel flex min-h-0 flex-col p-5">
      <div>
        <div className="text-xs font-bold uppercase tracking-[0.12em] text-accent">Inspector</div>
        <h2 className="mt-1 text-2xl font-semibold">编辑方向</h2>
      </div>

      <div className="mt-4 rounded-[20px] border border-line/70 bg-white/62 p-4">
        <div className="text-xs font-bold text-muted">当前方向</div>
        <p className="mt-1 line-clamp-2 text-base font-semibold leading-6">{direction.title}</p>
        <div className="mt-3 rounded-[16px] bg-accentSoft px-3 py-2 text-sm font-semibold text-accent">正在修改：{directionFieldLabels[activeField]}</div>
      </div>

      <label htmlFor={`direction-${activeField}-${direction.id}`} className="mt-4 grid min-h-0 flex-1 content-start gap-2">
        <span className="text-sm font-semibold text-muted">{directionFieldLabels[activeField]}</span>
        <textarea
          id={`direction-${activeField}-${direction.id}`}
          value={draft[activeField]}
          onChange={(event) => updateDraft(activeField, event.target.value)}
          className="stepic-inspector-control min-h-[220px] w-full resize-none rounded-[18px] border border-line bg-white px-4 py-3 text-sm leading-6 text-ink outline-none"
        />
        <span className="text-xs leading-5 text-muted">修改后保存，中栏会同步显示最新内容。</span>
      </label>

      <div className="mt-4 grid gap-2">
        {hasChanges ? <span className="text-xs font-semibold text-[#8a580c]">有未保存修改</span> : null}
        <button
          type="button"
          disabled={!hasChanges || !canSave}
          onClick={() => onSave(normalizedPatch)}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-[16px] bg-accent px-4 text-sm font-bold text-white transition-colors hover:bg-[#0b625c] disabled:cursor-not-allowed disabled:bg-[#eaf1ee] disabled:text-[#9aa8a4]"
        >
          保存修改
        </button>
      </div>
    </aside>
  );
}

export function DirectionsWorkspace({
  analysis,
  directions,
  selectedDirection,
  onSelect,
  onOpenRegenerate,
  onSave,
}: {
  analysis: RequirementAnalysis;
  directions: DesignDirection[];
  selectedDirection: DesignDirection | null;
  onSelect: (direction: DesignDirection) => void;
  onOpenRegenerate: () => void;
  onSave: (patch: DirectionEditablePatch) => void;
}) {
  const [activeField, setActiveField] = useState<DirectionEditableField>("elements");

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <CompactRequirementSummary analysis={analysis} />
      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[270px_minmax(0,1fr)_340px]">
        <section className="stepic-panel flex min-h-0 flex-col p-4">
          <div className="mb-3">
            <div className="text-xs font-bold uppercase tracking-[0.12em] text-accent">Design Directions</div>
            <h2 className="mt-1 text-xl font-semibold">选择方向</h2>
          </div>
          <div className="grid min-h-0 flex-1 content-start gap-2 overflow-y-auto pr-2 stepic-scroll">
            {directions.map((direction) => (
              <DirectionButton key={direction.id} direction={direction} selected={selectedDirection?.id === direction.id} onSelect={() => onSelect(direction)} />
            ))}
          </div>
          <div className="mt-3 flex shrink-0 justify-end border-t border-line/60 pt-3">
            <button type="button" onClick={onOpenRegenerate} className="inline-flex min-h-9 items-center rounded-[15px] border border-accent/15 bg-accentSoft px-4 text-xs font-bold text-accent transition hover:border-accent/35 hover:bg-white">
              换一批
            </button>
          </div>
        </section>
        <SelectedDirectionPreview activeField={activeField} direction={selectedDirection} onInspect={setActiveField} />
        <DirectionInspector activeField={activeField} direction={selectedDirection} onSave={onSave} />
      </div>
    </div>
  );
}
