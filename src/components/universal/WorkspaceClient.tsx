"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  CircleAlert,
  Clock3,
  Loader2,
  RefreshCw,
  Send,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArtifactPreview } from "@/components/universal/ArtifactPreview";
import { ArtifactIcon, WorkbenchFrame } from "@/components/universal/WorkbenchFrame";
import { UniversalAiCanvas } from "@/components/universal/UniversalAiCanvas";
import { WorkspaceField } from "@/components/universal/WorkspaceField";
import { getStepLabel } from "@/core/flow-engine";
import { useWorkspaceStore, type WorkspaceState } from "@/store/useWorkspaceStore";
import type { ArtifactResult, CreationPack, FlowStepId, ProjectRecord, RevisionRecord } from "@/types/universal";

const stepDescriptions: Record<FlowStepId, string> = {
  input: "理解你的想法",
  analysis: "拆解目标与约束",
  directions: "生成备选方向",
  decisions: "做出关键选择",
  review: "核对结构方案",
  generate: "产出最终成果",
  refine: "继续调整成果",
};

const previewImages = [
  "/direction-previews/direction-value.png",
  "/direction-previews/direction-structure.png",
  "/direction-previews/direction-scenario.png",
];

export function WorkspaceClient({ projectId }: { projectId: string }) {
  const store = useWorkspaceStore();

  useEffect(() => {
    if (store.projectId === projectId && store.pack) return;
    void loadProject();
    // The store is intentionally excluded: only a route change should trigger project hydration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function loadProject() {
    const response = await fetch(`/api/projects/${projectId}`);
    if (!response.ok) {
      store.setError("项目不存在或无法读取。");
      return;
    }
    const data = await response.json() as {
      project: ProjectRecord;
      pack: CreationPack;
      spec: import("@/types/universal").ArtifactSpec | null;
      result: ArtifactResult | null;
      revisions: RevisionRecord[];
    };
    store.hydrateProject(data);
  }

  function moveTo(step: FlowStepId) {
    store.setStep(step);
    void fetch(`/api/projects/${projectId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentStep: step }),
    });
  }

  function selectDirection(direction: WorkspaceState["directions"][number]) {
    store.selectDirection(direction);
    void fetch(`/api/projects/${projectId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selectedDirection: direction }),
    });
  }

  function setDecision(moduleId: string, value: unknown) {
    const decisions = { ...store.decisions, [moduleId]: value };
    store.setDecision(moduleId, value);
    void fetch(`/api/projects/${projectId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decisions }),
    });
  }

  async function analyze() {
    if (!store.pack || !store.rawInput.trim()) return;
    store.setLoading(true);
    store.setError(null);
    try {
      const response = await fetch("/api/workflow/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, packId: store.pack.id, rawInput: store.rawInput, inputValues: store.inputValues }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      store.setAnalysis(data.analysis, data.directions, data.decisionModules);
      await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentStep: "directions",
          inputValues: store.inputValues,
          analysis: data.analysis,
          directions: data.directions,
          decisionModules: data.decisionModules,
          selectedDirection: null,
          decisions: {},
        }),
      });
    } catch (error) {
      store.setError(error instanceof Error ? error.message : "分析失败");
    } finally {
      store.setLoading(false);
    }
  }

  async function buildSpec() {
    if (!store.pack || !store.analysis) return;
    store.setLoading(true);
    store.setError(null);
    try {
      const response = await fetch("/api/workflow/build-spec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          packId: store.pack.id,
          rawInput: store.rawInput,
          inputValues: store.inputValues,
          analysis: store.analysis,
          selectedDirection: store.selectedDirection,
          decisions: store.decisions,
        }),
      });
      const spec = await response.json();
      if (!response.ok) throw new Error(spec.error);
      store.setArtifactSpec(spec);
    } catch (error) {
      store.setError(error instanceof Error ? error.message : "结构化方案生成失败");
    } finally {
      store.setLoading(false);
    }
  }

  async function generate() {
    if (!store.artifactSpec) return;
    store.setLoading(true);
    store.setError(null);
    try {
      const response = await fetch("/api/artifacts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spec: store.artifactSpec }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      store.setArtifactResult(result);
    } catch (error) {
      store.setError(error instanceof Error ? error.message : "成果生成失败");
    } finally {
      store.setLoading(false);
    }
  }

  if (!store.pack || store.projectId !== projectId) {
    return <WorkbenchFrame><div className="uc-loading-page"><Loader2 className="animate-spin" />正在读取项目…</div></WorkbenchFrame>;
  }

  const currentStep = store.currentStep ?? "input";
  const createdAt = store.projectCreatedAt ? new Date(store.projectCreatedAt).toLocaleString("zh-CN", { dateStyle: "medium", timeStyle: "short" }) : "刚刚";
  const updatedAt = store.projectUpdatedAt ? new Date(store.projectUpdatedAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }) : "刚刚";

  return (
    <WorkbenchFrame current={store.artifactKind ?? undefined}>
      <div className="uc-workspace-page">
        <header className="uc-workspace-head">
          <div>
            <div className="uc-breadcrumb"><span>项目</span><ChevronRight size={13} /><span>{store.pack.name}</span></div>
            <h1>{store.projectName || store.pack.name}</h1>
            <p>创建于 {createdAt}<span aria-hidden="true"> · </span>自动保存于 {updatedAt}</p>
          </div>
          <Link href="/projects" className="uc-secondary-button"><ArrowLeft size={15} />返回项目列表</Link>
        </header>

        <div className="uc-workspace-layout">
          <section className="uc-workspace-center">
            <WorkflowStepper pack={store.pack} currentStep={currentStep} onStep={moveTo} />
            <StageContent
              store={store}
              stage={currentStep}
              analyze={analyze}
              buildSpec={buildSpec}
              generate={generate}
              onStep={moveTo}
              onSelectDirection={selectDirection}
              onSetDecision={setDecision}
            />
          </section>
          <SummaryPanel store={store} onGenerate={generate} onStep={moveTo} />
        </div>
      </div>
      {store.error ? <div className="uc-error-toast" role="alert"><CircleAlert size={16} />{store.error}</div> : null}
    </WorkbenchFrame>
  );
}

function WorkflowStepper({ pack, currentStep, onStep }: { pack: CreationPack; currentStep: FlowStepId; onStep: (step: FlowStepId) => void }) {
  const steps = pack.flow.steps.filter((step) => step.enabled).map((step) => step.id);
  const currentIndex = Math.max(0, steps.indexOf(currentStep));

  return (
    <nav className="uc-workflow-stepper" aria-label="创作流程">
      {steps.map((step, index) => {
        const active = currentStep === step;
        const done = index < currentIndex;
        const reachable = index <= currentIndex;
        return (
          <div className="uc-stepper-item" key={step}>
            <button
              type="button"
              className={`${active ? "active" : ""} ${done ? "done" : ""}`}
              onClick={() => reachable && onStep(step)}
              disabled={!reachable}
              aria-current={active ? "step" : undefined}
            >
              <span className="uc-stepper-dot">{done ? <Check size={13} /> : active ? <Sparkles size={13} /> : index + 1}</span>
              <span><strong>{getStepLabel(step)}</strong><small>{stepDescriptions[step]}</small></span>
            </button>
            {index < steps.length - 1 ? <span className="uc-stepper-line" aria-hidden="true" /> : null}
          </div>
        );
      })}
    </nav>
  );
}

function StageContent({
  store,
  stage,
  analyze,
  buildSpec,
  generate,
  onStep,
  onSelectDirection,
  onSetDecision,
}: {
  store: WorkspaceState;
  stage: FlowStepId;
  analyze: () => Promise<void>;
  buildSpec: () => Promise<void>;
  generate: () => Promise<void>;
  onStep: (step: FlowStepId) => void;
  onSelectDirection: (direction: WorkspaceState["directions"][number]) => void;
  onSetDecision: (moduleId: string, value: unknown) => void;
}) {
  if (stage === "input") return <InputStage store={store} onAnalyze={analyze} />;
  if (stage === "analysis") return <AnalysisStage store={store} onStep={onStep} />;
  if (stage === "directions") return <DirectionsStage store={store} onStep={onStep} onSelect={onSelectDirection} />;
  if (stage === "decisions") return <DecisionsStage store={store} onStep={onStep} onSetDecision={onSetDecision} />;
  if (stage === "review") return <ReviewStage store={store} onBuild={buildSpec} onStep={onStep} />;
  if (stage === "generate") return <GenerateStage store={store} onGenerate={generate} onStep={onStep} />;
  return <RefineStage store={store} onStep={onStep} />;
}

function InputStage({ store, onAnalyze }: { store: WorkspaceState; onAnalyze: () => Promise<void> }) {
  return (
    <div className="uc-stage-card">
      <StageIntro number="01" label="输入" title="先把模糊想法说出来" description="不需要先学会写 Prompt。我们先把目标、场景和限制说清楚，复杂指令会在系统内部完成。" />
      <label className="uc-raw-input"><span>原始想法</span><textarea value={store.rawInput} onChange={(event) => store.setRawInput(event.target.value)} placeholder="例如：我想做一个面向小团队的 AI 创作工具，希望它让不会写 Prompt 的人也能做出网页和文章……" /></label>
      <div className="uc-fields-grid">{store.pack?.inputFields.map((field) => <WorkspaceField key={field.id} field={field} value={store.inputValues[field.id]} onChange={(value) => store.setInputValue(field.id, value)} />)}</div>
      <div className="uc-stage-footer"><span>说得不完整也没关系，后面可以继续选择。</span><button className="uc-primary-button" onClick={onAnalyze} disabled={!store.rawInput.trim() || store.isLoading}>{store.isLoading ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}开始分析<ArrowRight size={15} /></button></div>
    </div>
  );
}

function AnalysisStage({ store, onStep }: { store: WorkspaceState; onStep: (step: FlowStepId) => void }) {
  const entries = Object.entries(store.analysis);
  return (
    <div className="uc-stage-card">
      <StageIntro number="02" label="分析" title="确认我们真正要解决的问题" description="不确定的信息会被保留，不会被模型悄悄补成事实。" />
      <div className="uc-analysis-list">{entries.map(([key, value]) => <div key={key}><span>{key}</span><strong>{Array.isArray(value) ? value.join("、") : typeof value === "object" ? JSON.stringify(value) : String(value)}</strong></div>)}</div>
      <StageNavigation previous={() => onStep("input")} previousLabel="上一步：输入" next={() => onStep("directions")} nextLabel="下一步：方向" nextDisabled={!store.directions.length} />
    </div>
  );
}

function DirectionsStage({ store, onStep, onSelect }: { store: WorkspaceState; onStep: (step: FlowStepId) => void; onSelect: (direction: WorkspaceState["directions"][number]) => void }) {
  return (
    <div className="uc-stage-card">
      <StageIntro number="03" label="方向" title="选择一个值得继续的方向" description="方向代表不同的结构和表达路线，而不是同一方案换几个形容词。" />
      <div className="uc-direction-grid">
        {store.directions.map((direction, index) => (
          <button key={direction.id} className={`uc-direction-option ${store.selectedDirection?.id === direction.id ? "selected" : ""}`} onClick={() => onSelect(direction)}>
            <span className="uc-direction-preview"><img src={previewImages[index % previewImages.length]} alt="" /></span>
            <span className="uc-direction-content">
              <span className="uc-direction-top"><span>{direction.recommended ? "推荐起点" : `方向 ${String.fromCharCode(65 + index)}`}</span>{store.selectedDirection?.id === direction.id ? <Check size={16} /> : null}</span>
              <strong>{direction.title}</strong>
              <small>{direction.summary}</small>
              <span className="uc-chip-row">{direction.differences.map((item) => <span key={item}>{item}</span>)}</span>
            </span>
          </button>
        ))}
      </div>
      <StageNavigation previous={() => onStep("analysis")} previousLabel="上一步：分析" next={() => onStep("decisions")} nextLabel="下一步：决策" nextDisabled={!store.selectedDirection} />
    </div>
  );
}

function DecisionsStage({ store, onStep, onSetDecision }: { store: WorkspaceState; onStep: (step: FlowStepId) => void; onSetDecision: (moduleId: string, value: unknown) => void }) {
  const complete = Object.keys(store.decisions).length;
  return (
    <div className="uc-stage-card">
      <StageIntro number="04" label="决策" title="完成几个高杠杆选择" description="每个选择都会进入结构化方案，但不会变成一段需要你维护的 Prompt。" />
      <div className="uc-decision-list">
        {store.decisionModules.map((module) => (
          <div className="uc-decision-module" key={module.id}>
            <div className="uc-decision-label"><h3>{module.title}</h3><p>{module.description}</p></div>
            <div className="uc-option-list">{module.options.map((option) => {
              const selected = module.controlType === "multi-select"
                ? Array.isArray(store.decisions[module.id]) && (store.decisions[module.id] as unknown[]).includes(option.id)
                : store.decisions[module.id] === option.id;
              const nextValue = module.controlType === "multi-select"
                ? [...(Array.isArray(store.decisions[module.id]) ? store.decisions[module.id] as unknown[] : []).filter((item) => item !== option.id), ...(selected ? [] : [option.id])]
                : option.id;
              return <button key={option.id} className={`uc-decision-option ${selected ? "selected" : ""}`} onClick={() => onSetDecision(module.id, nextValue)}><span className="uc-radio">{selected ? <Check size={12} /> : null}</span><span><strong>{option.label}</strong><small>{option.description}</small></span></button>;
            })}</div>
          </div>
        ))}
      </div>
      <StageNavigation previous={() => onStep("directions")} previousLabel="上一步：方向" next={() => onStep("review")} nextLabel={`下一步：确认（${complete}/${store.decisionModules.length}）`} nextDisabled={store.decisionModules.some((module) => module.required && !store.decisions[module.id])} />
    </div>
  );
}

function ReviewStage({ store, onBuild, onStep }: { store: WorkspaceState; onBuild: () => Promise<void>; onStep: (step: FlowStepId) => void }) {
  return (
    <div className="uc-stage-card uc-review-stage">
      <StageIntro number="05" label="确认" title="核对结构化方案" description="你确认的是目标、方向、约束和成果结构；模型指令与代码仍由系统内部编译。" />
      {store.artifactSpec && store.projectId ? <UniversalAiCanvas projectId={store.projectId} decisionOptions={Object.fromEntries(store.decisionModules.map((module) => [module.id, module.options.map((option) => ({ value: option.id, label: option.label }))]))} fieldLabels={Object.fromEntries((store.pack?.inputFields ?? []).map((field) => [field.id, field.label]))} /> : <div className="uc-review-summary"><ReviewRow label="成果类型" value={store.pack?.name ?? ""} /><ReviewRow label="原始输入" value={store.rawInput} /><ReviewRow label="已选方向" value={store.selectedDirection?.title ?? "尚未选择"} /><ReviewRow label="关键选择" value={`${Object.keys(store.decisions).length} 个模块`} /><ReviewRow label="约束" value="用户否定要求会进入 mustAvoid，不会被覆盖" /></div>}
      <div className="uc-stage-footer"><button className="uc-secondary-button" onClick={() => onStep("decisions")}><ArrowLeft size={15} />上一步：决策</button>{store.artifactSpec ? <button className="uc-primary-button" onClick={() => onStep("generate")}>下一步：生成<ArrowRight size={15} /></button> : <button className="uc-primary-button" onClick={onBuild} disabled={store.isLoading}>{store.isLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}生成结构化方案<ArrowRight size={15} /></button>}</div>
    </div>
  );
}

function GenerateStage({ store, onGenerate, onStep }: { store: WorkspaceState; onGenerate: () => Promise<void>; onStep: (step: FlowStepId) => void }) {
  return (
    <div className="uc-stage-card uc-generate-stage">
      <StageIntro number="06" label="生成" title="把方案变成可用成果" description="网页在安全沙箱中预览，写作与功能设计直接展示 Markdown，图片继续使用现有生图接口。" />
      {store.artifactResult ? <ArtifactPreview result={store.artifactResult} /> : <div className="uc-generate-empty"><Sparkles size={28} /><strong>等待生成</strong><p>根据已经确认的结构化方案，编译最终成果。</p><button className="uc-primary-button" onClick={onGenerate} disabled={store.isLoading || !store.artifactSpec}>{store.isLoading ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}生成成果</button></div>}
      <div className="uc-stage-footer"><button className="uc-secondary-button" onClick={() => onStep("review")}><ArrowLeft size={15} />上一步：确认</button>{store.artifactResult ? <button className="uc-primary-button" onClick={() => onStep("refine")}><RefreshCw size={15} />继续修改</button> : null}</div>
    </div>
  );
}

function RefineStage({ store, onStep }: { store: WorkspaceState; onStep: (step: FlowStepId) => void }) {
  const [text, setText] = useState("");
  const [patch, setPatch] = useState<{ reason: string; operations: Array<{ op: string; path: string; value?: unknown }> } | null>(null);

  async function makePatch() {
    if (!store.artifactKind || !text.trim()) return;
    const response = await fetch("/api/workflow/build-patch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ instruction: text, projectId: store.projectId }) });
    const data = await response.json();
    if (response.ok) setPatch(data); else store.setError(data.error);
  }

  async function apply() {
    if (!patch || !store.projectId) return;
    const response = await fetch("/api/artifacts/regenerate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: store.projectId, patch }) });
    const data = await response.json();
    if (response.ok) {
      store.setArtifactSpec(data.spec);
      store.setRevisionHistory(data.revisions);
      setPatch(null);
      setText("");
      onStep("refine");
    } else store.setError(data.error);
  }

  return (
    <div className="uc-stage-card">
      <StageIntro number="07" label="修改" title="继续修改，不用从头再来" description="修改要求会先转换成受控 Patch，验证通过后再应用到成果结构。" />
      <div className="uc-refine-box"><label><span className="sr-only">修改要求</span><textarea value={text} onChange={(event) => setText(event.target.value)} placeholder={store.artifactKind === "image" ? "例如：背景改为浅灰色，主体保持不变" : "例如：把语气改得更克制，减少首屏文字"} /></label><button className="uc-secondary-button" onClick={makePatch} disabled={!text.trim() || store.isLoading}><Send size={15} />解析修改</button></div>
      {patch ? <div className="uc-patch-preview"><div><strong>将要应用的变更</strong><span>{patch.reason}</span></div><pre>{JSON.stringify(patch.operations, null, 2)}</pre><button className="uc-primary-button" onClick={apply}><Check size={15} />验证并应用</button></div> : null}
      <div className="uc-revision-list"><div className="uc-rail-label">修改历史</div>{store.revisionHistory.length ? store.revisionHistory.map((revision) => <div key={revision.id}><span>{new Date(revision.createdAt).toLocaleString("zh-CN")}</span><strong>{revision.reason}</strong></div>) : <p>还没有修改记录。</p>}</div>
      <div className="uc-stage-footer"><button className="uc-secondary-button" onClick={() => onStep("generate")}><ArrowLeft size={15} />返回成果</button></div>
    </div>
  );
}

function SummaryPanel({ store, onGenerate, onStep }: { store: WorkspaceState; onGenerate: () => Promise<void>; onStep: (step: FlowStepId) => void }) {
  const constraints = store.artifactSpec?.constraints;
  const step = store.currentStep ?? "input";
  const selectedIndex = store.directions.findIndex((direction) => direction.id === store.selectedDirection?.id);

  return (
    <aside className="uc-summary-panel">
      <div className="uc-summary-title"><h2>方案摘要</h2><span className="uc-summary-step">{getStepLabel(step)}</span></div>
      <div className="uc-summary-row"><span>作品类型</span><strong><ArtifactIcon kind={store.pack?.artifactKind ?? "image"} />{store.pack?.artifactKind === "web-page" ? "网页" : store.pack?.artifactKind === "writing" ? "写作" : store.pack?.artifactKind === "product-feature" ? "功能设计" : "图片"}</strong></div>
      <div className="uc-summary-row"><span>当前步骤</span><strong>{getStepLabel(step)}</strong></div>
      <div className="uc-summary-row"><span>所选方向</span><strong>{store.selectedDirection?.title ?? "等待选择"}</strong></div>

      {store.selectedDirection ? <div className="uc-summary-preview"><span>风格预览</span><img src={previewImages[(selectedIndex < 0 ? 0 : selectedIndex) % previewImages.length]} alt="所选方向的结构预览" /></div> : null}

      <div className="uc-summary-pack"><span>所选创作包</span><div><strong>{store.pack?.name}</strong><small>版本 v{store.pack?.version}</small></div></div>

      <div className="uc-summary-block"><div><strong>约束条件</strong></div>{constraints ? <><p><b>必须包含</b>{constraints.mustInclude.join("、") || "未指定"}</p><p><b>避免内容</b>{constraints.mustAvoid.join("、") || "未指定"}</p></> : <p>会在方案确认后出现。</p>}</div>

      <div className="uc-summary-block"><div><strong>修订记录</strong><Clock3 size={14} /></div>{store.revisionHistory.length ? store.revisionHistory.slice(0, 3).map((revision) => <p key={revision.id}><b>{new Date(revision.createdAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</b>{revision.reason}</p>) : <p><b>{store.projectUpdatedAt ? new Date(store.projectUpdatedAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }) : "刚刚"}</b>项目已保存</p>}</div>

      <div className="uc-summary-bottom">{store.artifactSpec && !store.artifactResult ? <button className="uc-primary-button wide" onClick={onGenerate} disabled={store.isLoading}><Sparkles size={15} />生成成果</button> : null}{store.artifactResult ? <button className="uc-primary-button wide" onClick={() => onStep("refine")}><Sparkles size={15} />继续修改成果</button> : null}<Link href="/projects" className="uc-refine-link">返回项目列表</Link></div>
    </aside>
  );
}

function StageIntro({ number, label, title, description }: { number: string; label: string; title: string; description: string }) {
  return <div className="uc-stage-intro"><span className="uc-eyebrow">{number} / {label}</span><h2>{title}</h2><p>{description}</p></div>;
}

function StageNavigation({ previous, previousLabel, next, nextLabel, nextDisabled }: { previous: () => void; previousLabel: string; next: () => void; nextLabel: string; nextDisabled?: boolean }) {
  return <div className="uc-stage-footer"><button className="uc-secondary-button" onClick={previous}><ArrowLeft size={15} />{previousLabel}</button><button className="uc-primary-button" onClick={next} disabled={nextDisabled}>{nextLabel}<ArrowRight size={15} /></button></div>;
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return <div className="uc-review-row"><span>{label}</span><strong>{value}</strong></div>;
}
