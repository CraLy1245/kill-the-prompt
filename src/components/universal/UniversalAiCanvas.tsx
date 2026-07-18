"use client";

import { Bot, Check, Loader2, Monitor, RefreshCw, RotateCcw, Send, Smartphone, Sparkles, Tablet } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CanvasDocument } from "@/types/universal";

type ApiResponse = { document?: CanvasDocument; summary?: string; error?: string };
type PreviewDevice = "desktop" | "tablet" | "mobile";

const firstGenerationInstruction = "根据已确认的结构化方案，生成一张完整的 HTML 方案确认页。突出核心目标、已选方向、关键决策和不可违反的约束，让成果结构一眼可读。";

export function UniversalAiCanvas({ projectId }: { projectId: string }) {
  const [document, setDocument] = useState<CanvasDocument | null>(null);
  const [instruction, setInstruction] = useState("");
  const [device, setDevice] = useState<PreviewDevice>("desktop");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const attemptedInitialAi = useRef(false);
  const previewHtml = useMemo(() => prepareSrcDoc(document?.html ?? ""), [document?.html]);

  useEffect(() => {
    attemptedInitialAi.current = false;
    void load();
  }, [projectId]);

  useEffect(() => {
    if (!document || document.htmlSource === "ai" || attemptedInitialAi.current) return;
    attemptedInitialAi.current = true;
    void askAi(firstGenerationInstruction, document);
  }, [document]);

  async function load() {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/canvas/${encodeURIComponent(projectId)}`);
      const data = await response.json() as ApiResponse;
      if (!response.ok || !data.document) throw new Error(data.error ?? "HTML 方案页读取失败");
      setDocument(data.document);
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "HTML 方案页读取失败" });
    } finally {
      setLoading(false);
    }
  }

  async function askAi(prompt = instruction, source = document) {
    if (!source || !prompt.trim()) return;
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/canvas/${encodeURIComponent(projectId)}/edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction: prompt.trim(), baseRevision: source.revision }),
      });
      const data = await response.json() as ApiResponse;
      if (!response.ok || !data.document) throw new Error(data.error ?? "AI 无法修改 HTML 页面");
      setDocument(data.document);
      setInstruction("");
      setMessage({ type: "success", text: data.summary ?? "AI 已更新 HTML 页面" });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "AI 无法修改 HTML 页面" });
    } finally {
      setSaving(false);
    }
  }

  async function undo() {
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/canvas/${encodeURIComponent(projectId)}`, { method: "DELETE" });
      const data = await response.json() as ApiResponse;
      if (!response.ok || !data.document) throw new Error(data.error ?? "没有可以撤销的页面版本");
      setDocument(data.document);
      setMessage({ type: "success", text: "已恢复上一个 HTML 页面版本" });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "撤销失败" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="uc-canvas-loading"><Loader2 size={20} className="animate-spin" />正在加载 HTML 方案页…</div>;
  if (!document) return <div className="uc-canvas-loading error">{message?.text ?? "HTML 方案页暂时不可用"}</div>;

  return (
    <section className="uc-ai-canvas uc-html-canvas" aria-label="AI HTML 方案页">
      <header className="uc-canvas-toolbar">
        <div><span className="uc-canvas-mark"><Sparkles size={15} /></span><div><strong>AI HTML 方案页</strong><small>{saving ? "AI 正在设计页面…" : `已保存 · 版本 ${document.revision}`}</small></div></div>
        <div className="uc-canvas-tools">
          <span className="uc-html-device-switch" aria-label="预览尺寸">
            <button type="button" className={device === "desktop" ? "active" : ""} onClick={() => setDevice("desktop")} aria-label="桌面预览"><Monitor size={15} /></button>
            <button type="button" className={device === "tablet" ? "active" : ""} onClick={() => setDevice("tablet")} aria-label="平板预览"><Tablet size={15} /></button>
            <button type="button" className={device === "mobile" ? "active" : ""} onClick={() => setDevice("mobile")} aria-label="手机预览"><Smartphone size={15} /></button>
          </span>
          <button type="button" onClick={() => void undo()} disabled={saving}><RotateCcw size={15} />撤销</button>
          <button type="button" onClick={() => void askAi(firstGenerationInstruction)} disabled={saving}><RefreshCw size={15} />重新生成</button>
        </div>
      </header>

      <div className="uc-html-preview-stage">
        <div className={`uc-html-preview-shell device-${device}`}>
          <div className="uc-html-preview-bar"><span /><span /><span /><small>{document.htmlSource === "ai" ? "AI 已生成 · 安全预览" : saving ? "基础页面 · AI 正在生成" : "基础页面 · 可重新生成"}</small></div>
          <iframe className="uc-html-preview-frame" sandbox="" referrerPolicy="no-referrer" srcDoc={previewHtml} title="AI 生成的 HTML 结构化方案" />
          {saving ? <div className="uc-html-generating"><Loader2 size={24} className="animate-spin" /><strong>AI 正在重写页面</strong><span>完成后会自动刷新预览并保存新版本</span></div> : null}
        </div>
      </div>

      <div className="uc-canvas-ai-dock uc-html-ai-dock">
        <span><Bot size={18} /></span>
        <div><strong>让 AI 修改这个 HTML 页面</strong><small>直接描述要改的内容、布局或重点，不需要接触源码</small></div>
        <textarea value={instruction} onChange={(event) => setInstruction(event.target.value)} placeholder="例如：把关键决策放到最上面，约束改成醒目的检查清单，并简化其他内容…" />
        <button className="uc-primary-button" type="button" onClick={() => void askAi()} disabled={saving || !instruction.trim()}>{saving ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}执行修改</button>
      </div>
      <div className="uc-canvas-presets"><button type="button" onClick={() => void askAi("重新组织页面层级，让最重要的结论和关键决策在首屏清晰可见。")}>突出重点</button><button type="button" onClick={() => void askAi("减少重复内容，把长段落改成简洁的列表、标签和分组。")}>精简页面</button><button type="button" onClick={() => void askAi("强化约束区域，把必须包含、必须避免和必须保留改成易检查的三组清单。")}>强化约束</button></div>
      {message ? <div className={`uc-canvas-message ${message.type}`} role={message.type === "error" ? "alert" : "status"}>{message.type === "success" ? <Check size={14} /> : null}{message.text}</div> : null}
    </section>
  );
}

function prepareSrcDoc(html: string) {
  const csp = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src 'none'; form-action 'none'; base-uri 'none'; frame-src 'none'">`;
  return html.replace(/<head([^>]*)>/i, `<head$1>${csp}`);
}
