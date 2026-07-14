"use client";

import { useEffect, useMemo, useState } from "react";
import type { DesignDirection, DetailModule, DetailModuleId, DetailOption, DetailSelections } from "@/types/logo";

type InspectorTarget =
  | { type: "module"; moduleId: DetailModuleId }
  | { type: "option"; moduleId: DetailModuleId; optionId: string };

function DetailModuleRail({
  modules,
  selections,
  activeId,
  onActivate,
}: {
  modules: DetailModule[];
  selections: DetailSelections;
  activeId: DetailModuleId;
  onActivate: (id: DetailModuleId) => void;
}) {
  return (
    <aside className="stepic-panel flex min-h-0 flex-col p-4">
      <div className="mb-3 px-1">
        <div className="text-xs font-bold uppercase tracking-[0.12em] text-accent">Detail Modules</div>
        <h2 className="mt-1 text-xl font-semibold">细节模块</h2>
      </div>
      <div className="grid min-h-0 gap-2 overflow-y-auto pr-1 stepic-scroll">
        {modules.map((module) => {
          const active = module.id === activeId;
          const selectedCount = (selections[module.id] ?? []).length;
          return (
            <button
              key={module.id}
              type="button"
              aria-pressed={active}
              onClick={() => onActivate(module.id)}
              className={[
                "grid min-h-[58px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-[20px] border px-4 py-2 text-left text-sm transition-[border-color,background-color,box-shadow] hover:border-accent/35 hover:bg-white",
                active
                  ? "border-accent/55 bg-white shadow-[inset_0_0_0_1px_rgba(15,118,110,0.2),0_10px_28px_rgba(15,118,110,0.1)]"
                  : "border-line/70 bg-white/68",
              ].join(" ")}
            >
              <span className="min-w-0">
                <span className="line-clamp-1 font-semibold">{module.title}</span>
                <span className="mt-0.5 block text-xs text-muted">{module.selectionType === "single" ? "单选" : "多选"}</span>
              </span>
              <span className={selectedCount ? "grid h-8 min-w-8 place-items-center rounded-[14px] bg-accent px-2 text-xs font-bold text-white" : "text-xs font-bold text-muted"}>
                {selectedCount || 0}
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function OptionCard({
  active,
  option,
  selected,
  onInspect,
  onToggle,
}: {
  active: boolean;
  option: DetailOption;
  selected: boolean;
  onInspect: () => void;
  onToggle: () => void;
}) {
  return (
    <article
      className={[
        "min-h-[124px] rounded-[22px] border bg-white/68 p-4 transition-[border-color,background-color,box-shadow] duration-200 hover:border-accent/30 hover:bg-white",
        selected
          ? "border-accent/55 bg-white shadow-[inset_0_0_0_1px_rgba(15,118,110,0.2),0_10px_28px_rgba(15,118,110,0.1)]"
          : active ? "border-accent/35" : "border-line/70",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <button type="button" onClick={onToggle} className="min-w-0 flex-1 text-left" aria-pressed={selected}>
          <div className="line-clamp-1 text-lg font-semibold">{option.label}</div>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">{option.description}</p>
        </button>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" onClick={onInspect} className={active ? "rounded-full bg-accentSoft px-3 py-2 text-xs font-bold text-accent" : "rounded-full border border-line bg-white px-3 py-2 text-xs font-bold text-muted"} aria-label={`编辑 ${option.label}`}>
            编辑
          </button>
          <button
            type="button"
            onClick={onToggle}
            className={selected ? "rounded-full bg-accent px-3 py-2 text-xs font-bold text-white" : "rounded-full border border-line bg-white px-3 py-2 text-xs font-bold text-muted"}
            aria-label={selected ? `取消选择 ${option.label}` : `选择 ${option.label}`}
          >
            {selected ? "已选" : "选择"}
          </button>
        </div>
      </div>
    </article>
  );
}

function CurrentDetailModulePanel({
  activeTarget,
  module,
  selected,
  onInspect,
  onToggle,
}: {
  activeTarget: InspectorTarget;
  module: DetailModule;
  selected: string[];
  onInspect: (target: InspectorTarget) => void;
  onToggle: (module: DetailModule, optionId: string) => void;
}) {
  return (
    <section className="stepic-panel flex min-h-0 flex-col p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <button type="button" onClick={() => onInspect({ type: "module", moduleId: module.id })} className="min-w-0 text-left">
          <div className="text-xs font-bold uppercase tracking-[0.12em] text-accent">{module.selectionType === "single" ? "Single Choice" : "Multiple Choice"}</div>
          <h2 className="mt-1 line-clamp-1 text-3xl font-semibold">{module.title}</h2>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">{module.description}</p>
        </button>
        <span className="shrink-0 rounded-full border border-accent/10 bg-accentSoft px-3 py-1 text-xs font-bold text-accent">已选 {selected.length}</span>
      </div>
      <div className="grid min-h-0 gap-3 overflow-y-auto pr-1 xl:grid-cols-2 stepic-scroll">
        {module.options.map((option) => (
          <OptionCard
            key={option.id}
            option={option}
            selected={selected.includes(option.id)}
            active={activeTarget.type === "option" && activeTarget.optionId === option.id}
            onInspect={() => onInspect({ type: "option", moduleId: module.id, optionId: option.id })}
            onToggle={() => {
              onInspect({ type: "option", moduleId: module.id, optionId: option.id });
              onToggle(module, option.id);
            }}
          />
        ))}
      </div>
    </section>
  );
}

function Inspector({
  direction,
  modules,
  selections,
  target,
  onUpdateModule,
  onUpdateOption,
}: {
  direction: DesignDirection;
  modules: DetailModule[];
  selections: DetailSelections;
  target: InspectorTarget;
  onUpdateModule: (moduleId: DetailModuleId, patch: Partial<Pick<DetailModule, "title" | "description">>) => void;
  onUpdateOption: (moduleId: DetailModuleId, optionId: string, patch: { label?: string; description?: string }) => void;
}) {
  const module = modules.find((item) => item.id === target.moduleId) ?? modules[0];
  const option = target.type === "option" ? module.options.find((item) => item.id === target.optionId) : null;
  const configured = modules.filter((item) => (selections[item.id]?.length ?? 0) > 0).length;

  return (
    <aside className="stepic-panel flex min-h-0 flex-col p-5">
      <div className="min-h-0 flex-1 overflow-y-auto pr-1 stepic-scroll">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.12em] text-accent">Inspector</div>
          <h2 className="mt-1 text-2xl font-semibold">{option ? "编辑选项" : "编辑模块"}</h2>
        </div>

        <div className="mt-4 rounded-[20px] border border-line/70 bg-white/62 p-4">
          <div className="text-xs font-bold text-muted">当前方向</div>
          <p className="mt-1 line-clamp-2 text-base font-semibold leading-6">{direction.title}</p>
          <div className="mt-3 rounded-[16px] bg-accentSoft px-3 py-2 text-sm font-semibold text-accent">已配置 {configured} / {modules.length} 个模块</div>
        </div>

        <div className="mt-4 grid gap-3">
          {option ? (
            <>
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-muted">选项名称</span>
                <input
                  value={option.label}
                  onChange={(event) => onUpdateOption(module.id, option.id, { label: event.target.value })}
                  className="stepic-inspector-control min-h-11 rounded-[17px] border border-line bg-white px-3 text-sm font-semibold outline-none"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-muted">选项描述</span>
                <textarea
                  value={option.description}
                  onChange={(event) => onUpdateOption(module.id, option.id, { description: event.target.value })}
                  className="stepic-inspector-control min-h-[130px] resize-none rounded-[17px] border border-line bg-white px-3 py-3 text-sm leading-6 outline-none"
                />
              </label>
            </>
          ) : (
            <>
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-muted">模块标题</span>
                <input
                  value={module.title}
                  onChange={(event) => onUpdateModule(module.id, { title: event.target.value })}
                  className="stepic-inspector-control min-h-11 rounded-[17px] border border-line bg-white px-3 text-sm font-semibold outline-none"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-muted">模块描述</span>
                <textarea
                  value={module.description}
                  onChange={(event) => onUpdateModule(module.id, { description: event.target.value })}
                  className="stepic-inspector-control min-h-[130px] resize-none rounded-[17px] border border-line bg-white px-3 py-3 text-sm leading-6 outline-none"
                />
              </label>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}

export function DetailsWorkspace({
  selectedDirection,
  modules,
  selections,
  onToggle,
  onUpdateModule,
  onUpdateOption,
}: {
  selectedDirection: DesignDirection;
  modules: DetailModule[];
  selections: DetailSelections;
  onToggle: (module: DetailModule, optionId: string) => void;
  onUpdateModule: (moduleId: DetailModuleId, patch: Partial<Pick<DetailModule, "title" | "description">>) => void;
  onUpdateOption: (moduleId: DetailModuleId, optionId: string, patch: { label?: string; description?: string }) => void;
}) {
  const [activeId, setActiveId] = useState<DetailModuleId>(modules[0].id);
  const [target, setTarget] = useState<InspectorTarget>({ type: "module", moduleId: modules[0].id });
  const activeModule = useMemo(() => modules.find((module) => module.id === activeId) ?? modules[0], [activeId, modules]);

  useEffect(() => {
    if (!modules.some((module) => module.id === activeId)) {
      setActiveId(modules[0].id);
      setTarget({ type: "module", moduleId: modules[0].id });
    }
  }, [activeId, modules]);

  function activateModule(id: DetailModuleId) {
    setActiveId(id);
    setTarget({ type: "module", moduleId: id });
  }

  function inspect(next: InspectorTarget) {
    setActiveId(next.moduleId);
    setTarget(next);
  }

  return (
    <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[270px_minmax(0,1fr)_340px]">
      <DetailModuleRail modules={modules} selections={selections} activeId={activeModule.id} onActivate={activateModule} />
      <CurrentDetailModulePanel activeTarget={target} module={activeModule} selected={selections[activeModule.id] ?? []} onInspect={inspect} onToggle={onToggle} />
      <Inspector
        direction={selectedDirection}
        modules={modules}
        selections={selections}
        target={target}
        onUpdateModule={onUpdateModule}
        onUpdateOption={onUpdateOption}
      />
    </div>
  );
}
