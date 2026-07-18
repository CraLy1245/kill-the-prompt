"use client";

import { Bot, Check, Loader2, Minus, Move, Plus, RotateCcw, Send, Sparkles, Trash2, Type } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CANVAS_WORLD_WIDTH } from "@/core/canvas-core";
import type { CanvasAction, CanvasDocument, CanvasNode } from "@/types/universal";

type ApiResponse = { document?: CanvasDocument; summary?: string; error?: string };
type DragState = { id: string; startX: number; startY: number; nodeX: number; nodeY: number; revision: number; x: number; y: number };

export function UniversalAiCanvas({ projectId }: { projectId: string }) {
  const [document, setDocument] = useState<CanvasDocument | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [instruction, setInstruction] = useState("");
  const [zoom, setZoom] = useState(0.82);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftText, setDraftText] = useState("");
  const drag = useRef<DragState | null>(null);

  useEffect(() => { void load(); }, [projectId]);
  useEffect(() => {
    const selected = document?.nodes.find((node) => node.id === selectedId);
    setDraftTitle(selected?.title ?? "");
    setDraftText(selected?.content.text ?? selected?.content.items?.join("\n") ?? "");
  }, [document, selectedId]);

  async function load() {
    setLoading(true); setMessage(null);
    try {
      const response = await fetch(`/api/canvas/${encodeURIComponent(projectId)}`);
      const data = await response.json() as ApiResponse;
      if (!response.ok || !data.document) throw new Error(data.error ?? "画布读取失败");
      setDocument(data.document);
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "画布读取失败" });
    } finally { setLoading(false); }
  }

  async function persist(actions: CanvasAction[], baseRevision = document?.revision) {
    if (!document || baseRevision == null) return;
    setSaving(true); setMessage(null);
    try {
      const response = await fetch(`/api/canvas/${encodeURIComponent(projectId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseRevision, actions }),
      });
      const data = await response.json() as ApiResponse;
      if (!response.ok || !data.document) throw new Error(data.error ?? "画布保存失败");
      setDocument(data.document);
      setMessage({ type: "success", text: "画布已保存" });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "画布保存失败" });
      await load();
    } finally { setSaving(false); }
  }

  async function askAi(prompt = instruction) {
    if (!document || !prompt.trim()) return;
    setSaving(true); setMessage(null);
    try {
      const response = await fetch(`/api/canvas/${encodeURIComponent(projectId)}/edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction: prompt.trim(), baseRevision: document.revision, selectedNodeIds: selectedId ? [selectedId] : [] }),
      });
      const data = await response.json() as ApiResponse;
      if (!response.ok || !data.document) throw new Error(data.error ?? "AI 画布编辑失败");
      setDocument(data.document);
      setInstruction("");
      setMessage({ type: "success", text: data.summary ?? "AI 已完成画布编辑" });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "AI 画布编辑失败" });
    } finally { setSaving(false); }
  }

  async function undo() {
    setSaving(true); setMessage(null);
    try {
      const response = await fetch(`/api/canvas/${encodeURIComponent(projectId)}`, { method: "DELETE" });
      const data = await response.json() as ApiResponse;
      if (!response.ok || !data.document) throw new Error(data.error ?? "没有可以撤销的版本");
      setDocument(data.document);
      setSelectedId(null);
      setMessage({ type: "success", text: "已恢复上一个画布版本" });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "撤销失败" });
    } finally { setSaving(false); }
  }

  function addText() {
    if (!document) return;
    const offset = document.nodes.length * 18;
    const node: CanvasNode = { id: `text-${Date.now()}`, type: "text", title: "新文本", content: { text: "双击选择后，可在下方编辑内容。" }, x: 120 + offset, y: 120 + offset, width: 360, height: 120, zIndex: 30, style: { background: "#fffdf9", color: "#2d2330", borderColor: "#dcd4cf", fontSize: 18, radius: 8 } };
    void persist([{ op: "insert", node }]);
  }

  function saveSelected() {
    if (!document || !selectedId) return;
    const selected = document.nodes.find((node) => node.id === selectedId);
    if (!selected) return;
    const content = selected.content.items ? { ...selected.content, items: draftText.split("\n").map((item) => item.trim()).filter(Boolean), text: undefined } : { ...selected.content, text: draftText };
    void persist([{ op: "update", id: selectedId, changes: { title: draftTitle, content } }]);
  }

  function removeSelected() {
    if (!selectedId) return;
    void persist([{ op: "remove", id: selectedId }]);
    setSelectedId(null);
  }

  function pointerDown(event: React.PointerEvent<HTMLElement>, node: CanvasNode) {
    if (saving || node.locked || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { id: node.id, startX: event.clientX, startY: event.clientY, nodeX: node.x, nodeY: node.y, revision: document?.revision ?? 0, x: node.x, y: node.y };
    setSelectedId(node.id);
  }

  function pointerMove(event: React.PointerEvent<HTMLElement>) {
    if (!drag.current || !document) return;
    const x = Math.max(0, Math.round(drag.current.nodeX + (event.clientX - drag.current.startX) / zoom));
    const y = Math.max(0, Math.round(drag.current.nodeY + (event.clientY - drag.current.startY) / zoom));
    drag.current.x = x; drag.current.y = y;
    setDocument({ ...document, nodes: document.nodes.map((node) => node.id === drag.current?.id ? { ...node, x, y } : node) });
  }

  function pointerUp() {
    const moved = drag.current;
    drag.current = null;
    if (!moved || (moved.x === moved.nodeX && moved.y === moved.nodeY)) return;
    void persist([{ op: "move", id: moved.id, x: moved.x, y: moved.y }], moved.revision);
  }

  if (loading) return <div className="uc-canvas-loading"><Loader2 size={20} className="animate-spin" />正在生成通用画布…</div>;
  if (!document) return <div className="uc-canvas-loading error">{message?.text ?? "画布暂时不可用"}</div>;

  const worldHeight = Math.max(980, ...document.nodes.map((node) => node.y + node.height + 100));
  const selected = document.nodes.find((node) => node.id === selectedId);
  return (
    <section className="uc-ai-canvas" aria-label="通用 AI 画布">
      <header className="uc-canvas-toolbar">
        <div><span className="uc-canvas-mark"><Sparkles size={15} /></span><div><strong>通用 AI 画布</strong><small>{saving ? "正在保存…" : `已保存 · 版本 ${document.revision}`}</small></div></div>
        <div className="uc-canvas-tools">
          <button type="button" onClick={addText} disabled={saving}><Type size={15} />文本</button>
          <button type="button" onClick={() => void undo()} disabled={saving}><RotateCcw size={15} />撤销</button>
          <span className="uc-canvas-zoom"><button type="button" onClick={() => setZoom((value) => Math.max(.55, value - .1))} aria-label="缩小画布"><Minus size={14} /></button><b>{Math.round(zoom * 100)}%</b><button type="button" onClick={() => setZoom((value) => Math.min(1.25, value + .1))} aria-label="放大画布"><Plus size={14} /></button></span>
        </div>
      </header>
      <div className="uc-canvas-viewport">
        <div className="uc-canvas-scaled" style={{ width: CANVAS_WORLD_WIDTH * zoom, height: worldHeight * zoom }}>
          <div className="uc-canvas-world" style={{ width: CANVAS_WORLD_WIDTH, height: worldHeight, transform: `scale(${zoom})` }}>
            {document.nodes.map((node) => <CanvasNodeView key={node.id} node={node} selected={selectedId === node.id} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} />)}
          </div>
        </div>
      </div>
      <div className="uc-canvas-ai-dock">
        <span><Bot size={18} /></span>
        <div><strong>让 AI 编辑这张画布</strong><small>{selected ? `当前聚焦：${selected.title ?? selected.id}` : "未选择对象，AI 可以自主整理整张画布"}</small></div>
        <textarea value={instruction} onChange={(event) => setInstruction(event.target.value)} placeholder="例如：重新组织整个画布，突出核心判断，并把约束放到右侧…" />
        <button className="uc-primary-button" type="button" onClick={() => void askAi()} disabled={saving || !instruction.trim()}>{saving ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}执行编辑</button>
      </div>
      <div className="uc-canvas-presets"><button type="button" onClick={() => void askAi("自主检查整张画布，重新组织信息层级、位置与尺寸，让它更清晰易读。")}>自主整理</button><button type="button" onClick={() => void askAi("突出最重要的结论和行动项，弱化重复信息。")}>突出重点</button><button type="button" onClick={() => void askAi("检查画布是否缺少实现目标所需的信息，并用通用节点补充。")}>补充缺失内容</button></div>
      {selected ? <div className="uc-canvas-inspector"><div><Move size={15} /><strong>选中对象</strong><span>{selected.type} · {selected.id}</span></div><label><span>名称</span><input value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} /></label><label className="wide"><span>内容</span><textarea value={draftText} onChange={(event) => setDraftText(event.target.value)} /></label><div className="uc-canvas-inspector-actions"><button type="button" className="uc-text-button danger" onClick={removeSelected}><Trash2 size={14} />删除</button><button type="button" className="uc-secondary-button" onClick={saveSelected}><Check size={14} />保存对象</button></div></div> : null}
      {message ? <div className={`uc-canvas-message ${message.type}`} role={message.type === "error" ? "alert" : "status"}>{message.type === "success" ? <Check size={14} /> : null}{message.text}</div> : null}
    </section>
  );
}

function CanvasNodeView({ node, selected, onPointerDown, onPointerMove, onPointerUp }: { node: CanvasNode; selected: boolean; onPointerDown: (event: React.PointerEvent<HTMLElement>, node: CanvasNode) => void; onPointerMove: (event: React.PointerEvent<HTMLElement>) => void; onPointerUp: () => void }) {
  const style = { left: node.x, top: node.y, width: node.width, height: node.height, zIndex: node.zIndex, backgroundColor: safeColor(node.style.background), color: safeColor(node.style.color), borderColor: safeColor(node.style.borderColor), borderRadius: node.style.radius, textAlign: node.style.textAlign, fontSize: node.style.fontSize, fontWeight: fontWeight(node.style.fontWeight) } as React.CSSProperties;
  return <article className={`uc-canvas-node type-${node.type} ${selected ? "selected" : ""}`} style={style} onPointerDown={(event) => onPointerDown(event, node)} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
    <div className="uc-canvas-node-handle"><Move size={13} /><span>{node.title ?? node.type}</span></div>
    <div className="uc-canvas-node-content">
      {node.type === "image" && node.content.src ? <img src={node.content.src} alt={node.content.alt ?? ""} /> : null}
      {node.content.items?.length ? <ul>{node.content.items.map((item, index) => <li key={`${node.id}-${index}`}>{item}</li>)}</ul> : null}
      {node.content.text ? <p>{node.content.text}</p> : null}
      {!node.content.text && !node.content.items?.length && node.content.data !== undefined ? <pre>{JSON.stringify(node.content.data, null, 2)}</pre> : null}
    </div>
  </article>;
}

function safeColor(value?: string) { return value && /^(#[0-9a-f]{3,8}|rgba?\([\d\s,.%]+\)|transparent)$/i.test(value) ? value : undefined; }
function fontWeight(value?: CanvasNode["style"]["fontWeight"]) { return value === "bold" ? 700 : value === "semibold" ? 600 : value === "medium" ? 500 : 400; }
