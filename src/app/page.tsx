"use client";

import { ArrowRight, Check, Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { builtInPacks } from "@/core/pack-registry";
import { ArtifactIcon, WorkbenchFrame } from "@/components/universal/WorkbenchFrame";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import type { CreationPack } from "@/types/universal";

const artifactKinds = [
  { id: "image" as const, title: "图片", description: "插画、人物、商品、海报、Logo、壁纸", color: "plum" },
  { id: "writing" as const, title: "写作", description: "知乎回答、文章、脚本、产品文案", color: "apricot" },
  { id: "web-page" as const, title: "网页", description: "落地页、SaaS 首页、工具工作台", color: "blue" },
  { id: "product-feature" as const, title: "功能设计", description: "PRD、用户流程、页面状态、测试用例", color: "green" },
];

export default function HomePage() {
  const router = useRouter();
  const workspace = useWorkspaceStore();
  const [selectedPack, setSelectedPack] = useState<CreationPack>(builtInPacks[0]);
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const requestedKind = new URLSearchParams(window.location.search).get("kind");
    const requestedPack = builtInPacks.find((pack) => pack.artifactKind === requestedKind);
    if (requestedPack) setSelectedPack(requestedPack);
  }, []);

  async function start() {
    if (!value.trim()) return;
    setSubmitting(true); setError(null);
    try {
      const defaultInputValues = Object.fromEntries(selectedPack.inputFields.filter((field) => field.defaultValue !== undefined).map((field) => [field.id, field.defaultValue]));
      const analysisResponse = await fetch("/api/workflow/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ packId: selectedPack.id, rawInput: value.trim(), inputValues: defaultInputValues }) });
      const analysis = await analysisResponse.json(); if (!analysisResponse.ok) throw new Error(analysis.error);
      const projectResponse = await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: value.trim().slice(0, 42), artifactKind: selectedPack.artifactKind, packId: selectedPack.id, packVersion: selectedPack.version, rawInput: value.trim() }) });
      const project = await projectResponse.json(); if (!projectResponse.ok) throw new Error(project.error);
      workspace.setPack(selectedPack); workspace.setProject(project.id); workspace.setRawInput(value.trim());
      workspace.setAnalysis(analysis.analysis, analysis.directions, analysis.decisionModules);
      await fetch(`/api/projects/${project.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentStep: "directions", inputValues: defaultInputValues, analysis: analysis.analysis, directions: analysis.directions, decisionModules: analysis.decisionModules, selectedDirection: null, decisions: {} }) });
      router.push(`/workspace/${project.id}`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "创建项目失败"); } finally { setSubmitting(false); }
  }

  return <WorkbenchFrame><section className="uc-home-hero"><div className="uc-home-copy"><span className="uc-home-mark">UNIVERSAL CREATION ENGINE</span><h1>让提示词去死。</h1><p className="uc-home-lead">说出想法，做出选择，<em>剩下的交给 AI。</em></p><p className="uc-home-description">这不是提示词收藏夹，也不只是一个生图工具。我们把模糊需求拆成结构化方案，再把它编译成图片、文章、网页或产品功能。</p></div><div className="uc-create-card"><div className="uc-card-label"><span>从一句话开始</span><span>{selectedPack.name}</span></div><label className="sr-only" htmlFor="uc-creation-idea">描述你的创作想法</label><textarea id="uc-creation-idea" value={value} onChange={(event) => setValue(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void start(); } }} placeholder="我想做一个……" /><div className="uc-create-footer"><span>Enter 开始 · Shift + Enter 换行</span><button className="uc-primary-button" onClick={() => void start()} disabled={!value.trim() || submitting}>{submitting ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}开始创作<ArrowRight size={15} /></button></div>{error ? <div className="uc-inline-error" role="alert">{error}</div> : null}</div></section><section className="uc-output-section"><div className="uc-section-heading"><div><span className="uc-eyebrow">选择成果类型</span><h2>我们要一起做出什么？</h2></div><p>先选成果类型，创作包会自动调整接下来的步骤和问题。</p></div><div className="uc-kind-grid">{artifactKinds.map((kind) => <button key={kind.id} className={`uc-kind-card ${selectedPack.artifactKind === kind.id ? "selected" : ""} ${kind.color}`} onClick={() => { const next = builtInPacks.find((pack) => pack.artifactKind === kind.id); if (next) setSelectedPack(next); }}><ArtifactIcon kind={kind.id} /><span className="uc-kind-check">{selectedPack.artifactKind === kind.id ? <Check size={14} /> : null}</span><h3>{kind.title}</h3><p>{kind.description}</p></button>)}</div></section><section className="uc-packs-section"><div className="uc-section-heading"><div><span className="uc-eyebrow">创作包</span><h2>从一个清晰的起点开始</h2></div><a href="/packs">查看全部创作包 →</a></div><div className="uc-pack-list">{builtInPacks.map((pack) => <button key={pack.id} className={`uc-pack-row ${selectedPack.id === pack.id ? "selected" : ""}`} onClick={() => setSelectedPack(pack)}><ArtifactIcon kind={pack.artifactKind} /><span><strong>{pack.name}</strong><small>{pack.description}</small></span><span className="uc-pack-kind">{artifactKinds.find((kind) => kind.id === pack.artifactKind)?.title}</span><ArrowRight size={16} /></button>)}</div></section></WorkbenchFrame>;
}
