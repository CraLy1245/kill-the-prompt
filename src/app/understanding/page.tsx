"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { StepNav } from "@/components/StepNav";
import { useLogoFlowStore } from "@/store/useLogoFlowStore";
import type { RequirementAnalysis } from "@/types/logo";

type FieldKey = keyof RequirementAnalysis;

type FieldConfig = {
  key: FieldKey;
  label: string;
  kind: "text" | "list";
  required?: boolean;
};

const fields: FieldConfig[] = [
  { key: "brandType", label: "品牌类型", kind: "text", required: true },
  { key: "brandName", label: "品牌名称", kind: "text" },
  { key: "targetUsers", label: "目标用户", kind: "list" },
  { key: "brandMood", label: "品牌气质", kind: "list" },
  { key: "preferredElements", label: "偏好元素", kind: "list" },
  { key: "preferredColors", label: "偏好颜色", kind: "list" },
  { key: "typographyPreference", label: "字体偏好", kind: "text" },
  { key: "applicationScenarios", label: "应用场景", kind: "list" },
  { key: "constraints", label: "限制条件", kind: "list" },
  { key: "uncertainPoints", label: "不确定信息", kind: "list" },
];

const listSplitPattern = /[、,，;；\n]/;

function splitList(value: string) {
  return value
    .split(listSplitPattern)
    .map((item) => item.trim())
    .filter(Boolean);
}

function cloneAnalysis(analysis: RequirementAnalysis): RequirementAnalysis {
  return {
    brandType: analysis.brandType ?? "",
    brandName: analysis.brandName ?? "",
    targetUsers: [...analysis.targetUsers],
    brandMood: [...analysis.brandMood],
    preferredElements: [...analysis.preferredElements],
    preferredColors: [...analysis.preferredColors],
    typographyPreference: analysis.typographyPreference ?? "",
    applicationScenarios: [...analysis.applicationScenarios],
    constraints: [...analysis.constraints],
    uncertainPoints: [...analysis.uncertainPoints],
  };
}

function normalizedAnalysis(draft: RequirementAnalysis): RequirementAnalysis {
  return {
    brandType: draft.brandType.trim() || "Logo 设计需求",
    brandName: draft.brandName?.trim() || null,
    targetUsers: draft.targetUsers.filter(Boolean),
    brandMood: draft.brandMood.filter(Boolean),
    preferredElements: draft.preferredElements.filter(Boolean),
    preferredColors: draft.preferredColors.filter(Boolean),
    typographyPreference: draft.typographyPreference.trim(),
    applicationScenarios: draft.applicationScenarios.filter(Boolean),
    constraints: draft.constraints.filter(Boolean),
    uncertainPoints: draft.uncertainPoints.filter(Boolean),
  };
}

function readField(analysis: RequirementAnalysis, field: FieldConfig) {
  const value = analysis[field.key];
  if (Array.isArray(value)) return value.join("、");
  return value ? String(value) : "";
}

function listValue(analysis: RequirementAnalysis, key: FieldKey) {
  const value = analysis[key];
  return Array.isArray(value) ? value : [];
}

function setDraftField(draft: RequirementAnalysis, field: FieldConfig, value: string | string[]) {
  return {
    ...draft,
    [field.key]: field.kind === "list" ? value : value,
  } as RequirementAnalysis;
}

function analysisKey(analysis: RequirementAnalysis) {
  return JSON.stringify(normalizedAnalysis(analysis));
}

export default function UnderstandingPage() {
  const router = useRouter();
  const rawInput = useLogoFlowStore((state) => state.rawInput);
  const analysis = useLogoFlowStore((state) => state.analysis);
  const directions = useLogoFlowStore((state) => state.directions);
  const setAnalysis = useLogoFlowStore((state) => state.setAnalysis);
  const [draft, setDraft] = useState<RequirementAnalysis | null>(() => (analysis ? cloneAnalysis(analysis) : null));
  const [activeKey, setActiveKey] = useState<FieldKey>("brandType");

  useEffect(() => {
    if (analysis && !draft) setDraft(cloneAnalysis(analysis));
  }, [analysis, draft]);

  const activeField = fields.find((field) => field.key === activeKey) ?? fields[0];
  const originalKey = useMemo(() => (analysis ? JSON.stringify(analysis) : ""), [analysis]);
  const currentKey = draft ? analysisKey(draft) : "";
  const changed = !!draft && currentKey !== originalKey;
  const completedFields = draft ? fields.filter((field) => readField(draft, field)).length : 0;
  const canContinue = !!draft?.brandType.trim() && directions.length > 0;

  function updateText(value: string) {
    if (!draft) return;
    setDraft(setDraftField(draft, activeField, value));
  }

  function updateList(next: string[]) {
    if (!draft) return;
    setDraft(setDraftField(draft, activeField, next));
  }

  function continueToDirections() {
    if (!draft || !canContinue) return;
    if (changed) setAnalysis(normalizedAnalysis(draft));
    router.push("/directions");
  }

  return (
    <AppShell contentClassName="mx-auto flex h-[calc(100dvh-64px)] w-[min(100%-40px,1360px)] flex-col overflow-hidden px-0 py-5">
      <StepNav current={1} />
      {!analysis || !draft ? (
        <EmptyState />
      ) : (
        <section className="grid min-h-0 flex-1 grid-cols-[300px_minmax(0,1fr)_360px] gap-4">
          <aside className="stepic-panel flex min-h-0 flex-col p-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-accent">AI Understanding</p>
              <h1 className="mt-2 text-2xl font-semibold leading-tight">确认需求理解</h1>
              <p className="mt-3 text-sm leading-6 text-muted">先校准 AI 对需求的理解，再进入方向选择。方向不会在此页重新生成。</p>
            </div>

            <div className="mt-5 rounded-[22px] border border-line/80 bg-white/70 p-4">
              <div className="text-xs font-bold text-muted">原始输入</div>
              <p className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap text-[15px] leading-7 text-ink stepic-scroll">
                {rawInput || "暂无原始输入"}
              </p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <Metric label="已识别字段" value={`${completedFields}/${fields.length}`} />
              <Metric label="方向数量" value={`${directions.length}`} />
            </div>

            {changed ? (
              <div className="mt-4 rounded-[20px] border border-[#d97706]/20 bg-amberSoft px-4 py-3 text-sm leading-6 text-[#8a580c]">
                已修改理解内容。当前方向仍基于原始需求生成，如需重新生成方向请返回首页。
              </div>
            ) : (
              <div className="mt-4 rounded-[20px] border border-accent/10 bg-accentSoft px-4 py-3 text-sm leading-6 text-accent">
                当前理解未修改，可以直接进入方向选择。
              </div>
            )}

          </aside>

          <section className="stepic-panel flex min-h-0 flex-col p-5">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-accent">Review Fields</p>
                <h2 className="mt-1 text-2xl font-semibold">结构化字段</h2>
              </div>
            </div>

            <div className="grid min-h-0 gap-2 overflow-y-auto p-1 stepic-scroll">
              {fields.map((field) => {
                const active = field.key === activeKey;
                const text = readField(draft, field);
                return (
                  <button
                    key={field.key}
                    type="button"
                    onClick={() => setActiveKey(field.key)}
                    className={[
                      "group grid min-h-[72px] grid-cols-1 items-center rounded-[20px] border px-4 py-3 text-left transition",
                      active
                        ? "border-accent/55 bg-white shadow-[inset_0_0_0_1px_rgba(15,118,110,0.2),0_10px_28px_rgba(15,118,110,0.1)]"
                        : "border-line/70 bg-white/62 hover:border-accent/25 hover:bg-white/85",
                    ].join(" ")}
                  >
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                        {field.label}
                        {field.required ? <span className="text-red-500">*</span> : null}
                      </span>
                      <span className={text ? "mt-1 block truncate text-sm text-muted" : "mt-1 block text-sm text-[#9aa8a4]"}>
                        {text || "未识别，可补充"}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <aside className="stepic-panel flex min-h-0 flex-col p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-accent">Field Editor</p>
                <h2 className="mt-1 text-2xl font-semibold">{activeField.label}</h2>
              </div>
              <span className="grid h-9 w-9 place-items-center rounded-2xl bg-accentSoft text-accent">
                <Check size={17} />
              </span>
            </div>

            <div className="mt-5 min-h-0 flex-1 overflow-y-auto pr-1 stepic-scroll">
              {activeField.kind === "list" ? (
                <ListEditor key={activeField.key} values={listValue(draft, activeField.key)} onChange={updateList} />
              ) : (
                <TextEditor value={readField(draft, activeField)} onChange={updateText} />
              )}
            </div>

            <div className="mt-5 grid gap-3 border-t border-line/70 pt-5">
              <Link href="/" className="stepic-secondary-button">
                返回修改输入
              </Link>
              <button type="button" onClick={continueToDirections} disabled={!canContinue} className="stepic-primary-button">
                确认并选择方向
              </button>
            </div>
          </aside>
        </section>
      )}
    </AppShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-line/70 bg-white/62 px-4 py-3">
      <div className="text-xs font-bold text-muted">{label}</div>
      <div className="mt-1 text-xl font-semibold text-ink">{value}</div>
    </div>
  );
}

function TextEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-muted">字段内容</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="stepic-edit-input min-h-12 rounded-[18px] border border-line bg-white px-4 text-[15px] font-semibold text-ink outline-none transition focus:border-accent"
      />
    </label>
  );
}

function ListEditor({ values, onChange }: { values: string[]; onChange: (value: string[]) => void }) {
  const [input, setInput] = useState(values.join("、"));
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    const nextHeight = Math.min(Math.max(textarea.scrollHeight, 132), 340);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > 340 ? "auto" : "hidden";
  }, [input]);

  return (
    <div>
      <label className="grid gap-2">
        <span className="text-sm font-semibold text-muted">自定义修改</span>
        <div className="stepic-dynamic-field">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(event) => {
              const next = event.target.value;
              setInput(next);
              onChange(splitList(next).filter((item, index, array) => array.indexOf(item) === index));
            }}
            placeholder="输入内容，可用顿号、逗号、分号或换行分隔"
            className="stepic-edit-textarea relative z-10 block min-h-[132px] max-h-[340px] w-full resize-none rounded-[21px] border-0 bg-transparent px-5 py-4 text-[15px] font-semibold leading-7 text-ink outline-none placeholder:text-[#9aa8a4]"
          />
        </div>
      </label>
    </div>
  );
}

function EmptyState() {
  return (
    <section className="stepic-panel grid min-h-0 flex-1 place-items-center p-10 text-center">
      <div>
        <h1 className="text-2xl font-semibold">还没有可确认的需求理解</h1>
        <p className="mt-2 text-muted">请先输入 Logo 需求并完成分析。</p>
        <Link href="/" className="stepic-primary-button mt-5">
          回到首页
        </Link>
      </div>
    </section>
  );
}
