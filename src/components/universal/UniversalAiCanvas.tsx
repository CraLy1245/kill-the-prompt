"use client";

import { Bot, Check, ChevronRight, CirclePlus, Loader2, Minus, Move, Plus, RotateCcw, Send, Sparkles, Trash2, Type, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CANVAS_WORLD_WIDTH } from "@/core/canvas-core";
import type { CanvasAction, CanvasDocument, CanvasNode } from "@/types/universal";

type ApiResponse = { document?: CanvasDocument; summary?: string; error?: string };
type DragState = { id: string; startX: number; startY: number; nodeX: number; nodeY: number; revision: number; x: number; y: number };
export type CanvasDecisionOptions = Record<string, Array<{ value: string; label: string }>>;
export type CanvasFieldLabels = Record<string, string>;

export function UniversalAiCanvas({ projectId, decisionOptions = {}, fieldLabels = {} }: { projectId: string; decisionOptions?: CanvasDecisionOptions; fieldLabels?: CanvasFieldLabels }) {
  const [document, setDocument] = useState<CanvasDocument | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [instruction, setInstruction] = useState("");
  const [zoom, setZoom] = useState(0.82);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftText, setDraftText] = useState("");
  const [draftData, setDraftData] = useState<unknown>(undefined);
  const drag = useRef<DragState | null>(null);

  useEffect(() => { void load(); }, [projectId]);
  useEffect(() => {
    const selected = document?.nodes.find((node) => node.id === selectedId);
    setDraftTitle(selected?.title ?? "");
    setDraftText(selected?.content.text ?? selected?.content.items?.join("\n") ?? "");
    setDraftData(selected?.content.data === undefined ? undefined : structuredClone(selected.content.data));
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
    const content = selected.content.data !== undefined
      ? { ...selected.content, data: draftData }
      : selected.content.items
        ? { ...selected.content, items: draftText.split("\n").map((item) => item.trim()).filter(Boolean), text: undefined }
        : { ...selected.content, text: draftText };
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
            {document.nodes.map((node) => <CanvasNodeView key={node.id} node={node} selected={selectedId === node.id} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} decisionOptions={decisionOptions} fieldLabels={fieldLabels} />)}
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
      {selected ? <div className={`uc-canvas-inspector ${selected.content.data !== undefined ? "has-structured-data" : ""}`}>
        <div className="uc-canvas-inspector-heading"><Move size={15} /><div><strong>选中对象</strong><span>{nodeTypeLabel(selected.type)}</span></div></div>
        <label><span>模块名称</span><input value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} /></label>
        {selected.content.data !== undefined
          ? <div className="uc-structured-editor"><div className="uc-structured-editor-title"><strong>结构化字段</strong><span>直接修改字段，不需要接触内部格式</span></div><StructuredDataEditor value={draftData} context={selected.title ?? ""} decisionOptions={decisionOptions} fieldLabels={fieldLabels} onChange={setDraftData} /></div>
          : <label className="wide"><span>{selected.content.items ? "列表内容（每行一项）" : "内容"}</span><textarea value={draftText} onChange={(event) => setDraftText(event.target.value)} /></label>}
        <div className="uc-canvas-inspector-actions"><button type="button" className="uc-text-button danger" onClick={removeSelected}><Trash2 size={14} />删除</button><button type="button" className="uc-secondary-button" onClick={saveSelected}><Check size={14} />保存对象</button></div>
      </div> : null}
      {message ? <div className={`uc-canvas-message ${message.type}`} role={message.type === "error" ? "alert" : "status"}>{message.type === "success" ? <Check size={14} /> : null}{message.text}</div> : null}
    </section>
  );
}

function CanvasNodeView({ node, selected, onPointerDown, onPointerMove, onPointerUp, decisionOptions = {}, fieldLabels = {} }: { node: CanvasNode; selected: boolean; onPointerDown: (event: React.PointerEvent<HTMLElement>, node: CanvasNode) => void; onPointerMove: (event: React.PointerEvent<HTMLElement>) => void; onPointerUp: () => void; decisionOptions?: CanvasDecisionOptions; fieldLabels?: CanvasFieldLabels }) {
  const style = { left: node.x, top: node.y, width: node.width, height: node.height, zIndex: node.zIndex, backgroundColor: safeColor(node.style.background), color: safeColor(node.style.color), borderColor: safeColor(node.style.borderColor), borderRadius: node.style.radius, textAlign: node.style.textAlign, fontSize: node.style.fontSize, fontWeight: fontWeight(node.style.fontWeight) } as React.CSSProperties;
  return <article className={`uc-canvas-node type-${node.type} ${selected ? "selected" : ""}`} style={style} onPointerDown={(event) => onPointerDown(event, node)} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
    <div className="uc-canvas-node-handle"><Move size={13} /><span>{node.title ?? node.type}</span></div>
    <div className="uc-canvas-node-content">
      {node.type === "image" && node.content.src ? <img src={node.content.src} alt={node.content.alt ?? ""} /> : null}
      {node.content.data !== undefined ? <StructuredDataView value={node.content.data} context={node.title ?? ""} decisionOptions={decisionOptions} fieldLabels={fieldLabels} /> : null}
      {node.content.data === undefined && node.content.items?.length ? <div className="uc-gui-chip-list">{node.content.items.map((item, index) => <span key={`${node.id}-${index}`}>{item}</span>)}</div> : null}
      {node.content.data === undefined && node.content.text ? <p>{node.content.text}</p> : null}
    </div>
  </article>;
}

function safeColor(value?: string) { return value && /^(#[0-9a-f]{3,8}|rgba?\([\d\s,.%]+\)|transparent)$/i.test(value) ? value : undefined; }
function fontWeight(value?: CanvasNode["style"]["fontWeight"]) { return value === "bold" ? 700 : value === "semibold" ? 600 : value === "medium" ? 500 : 400; }

const guiLabels: Record<string, string> = {
  intent: "创作意图", goal: "目标", audience: "目标读者", explicitRequirements: "明确要求", constraints: "限制条件",
  uncertainPoints: "待确认信息", assumptions: "合理假设", id: "标识", title: "标题", summary: "核心说明", differences: "差异点",
  stance: "表达立场", evidence: "证据策略", ending: "结尾方式", mustInclude: "必须包含", mustAvoid: "必须避免", mustKeep: "必须保留",
  topic: "主题", platform: "发布平台", purpose: "创作目的", thesis: "核心观点", supportingClaims: "支持论点", counterArguments: "反方观点",
  structure: "内容结构", tone: "内容语气", targetLength: "目标字数", formattingRules: "排版规则", confirmedFacts: "已确认事实", uncertainFacts: "不确定事实",
  keyPoints: "关键要点", subject: "主体", scene: "场景", style: "视觉风格", colors: "颜色", sections: "页面区块", visualSystem: "视觉系统",
  responsiveRules: "响应式规则", interactionRules: "交互规则", featureName: "功能名称", problem: "要解决的问题", targetUsers: "目标用户", userValue: "用户价值",
  scope: "功能范围", included: "包含", excluded: "不包含", userFlow: "用户流程", screens: "页面", risks: "风险", successMetrics: "成功指标",
  acceptanceCriteria: "验收标准", developmentTasks: "开发任务", testCases: "测试用例", description: "说明", name: "名称", states: "状态", fields: "字段",
};

function StructuredDataView({ value, depth = 0, context = "", fieldKey, decisionOptions = {}, fieldLabels = {} }: { value: unknown; depth?: number; context?: string; fieldKey?: string; decisionOptions?: CanvasDecisionOptions; fieldLabels?: CanvasFieldLabels }) {
  if (value == null) return <span className="uc-gui-empty">未填写</span>;
  if (isPrimitive(value)) return <span className="uc-gui-value">{formatPrimitive(value, fieldKey, decisionOptions, fieldLabels)}</span>;
  if (Array.isArray(value)) {
    if (!value.length) return <span className="uc-gui-empty">暂无内容</span>;
    if (value.every(isPrimitive)) return <div className="uc-gui-chip-list">{value.map((item, index) => <span key={index}>{formatPrimitive(item, fieldKey, decisionOptions, fieldLabels)}</span>)}</div>;
    return <div className="uc-gui-collection">{value.map((item, index) => <section className="uc-gui-collection-item" key={index}><header><span>{collectionTitle(item, index)}</span><small>{index + 1}</small></header><StructuredDataView value={item} depth={depth + 1} context={context} decisionOptions={decisionOptions} fieldLabels={fieldLabels} /></section>)}</div>;
  }
  const entries = visibleGuiEntries(value as Record<string, unknown>, context);
  return <div className={`uc-gui-fields depth-${Math.min(depth, 2)}`}>{entries.map(([key, item]) => {
    const complex = item !== null && typeof item === "object" && !(Array.isArray(item) && item.every(isPrimitive));
    return <div className={`uc-gui-field ${complex ? "complex" : ""}`} key={key}><div className="uc-gui-label"><ChevronRight size={11} /><span>{guiLabel(key)}</span>{Array.isArray(item) ? <small>{item.length} 项</small> : null}</div><div className="uc-gui-field-value"><StructuredDataView value={item} depth={depth + 1} context={context} fieldKey={key} decisionOptions={decisionOptions} fieldLabels={fieldLabels} /></div></div>;
  })}</div>;
}

function StructuredDataEditor({ value, onChange, depth = 0, context = "", fieldKey, decisionOptions = {}, fieldLabels = {} }: { value: unknown; onChange: (value: unknown) => void; depth?: number; context?: string; fieldKey?: string; decisionOptions?: CanvasDecisionOptions; fieldLabels?: CanvasFieldLabels }) {
  const accessibleLabel = fieldKey ? guiLabel(fieldKey) : "字段值";
  if (typeof value === "boolean") return <label className="uc-gui-toggle"><input aria-label={accessibleLabel} type="checkbox" checked={value} onChange={(event) => onChange(event.target.checked)} /><span>{value ? "是" : "否"}</span></label>;
  if (typeof value === "number") return <input aria-label={accessibleLabel} className="uc-gui-editor-input" type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} />;
  if (typeof value === "string" || value == null) {
    const options = fieldKey ? decisionOptions[fieldKey] : undefined;
    const displayValue = value == null ? "" : presentText(value, decisionOptions, fieldLabels);
    return options?.length ? <select aria-label={accessibleLabel} className="uc-gui-editor-input" value={value == null ? "" : value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : <textarea aria-label={accessibleLabel} className="uc-gui-editor-input" value={displayValue} onChange={(event) => onChange(event.target.value)} />;
  }
  if (Array.isArray(value)) return <div className="uc-gui-editor-list">{value.map((item, index) => <div className="uc-gui-editor-list-item" key={index}><div className="uc-gui-editor-list-head"><span>{collectionTitle(item, index)}</span><button type="button" aria-label={`删除第 ${index + 1} 项`} onClick={() => onChange(value.filter((_, itemIndex) => itemIndex !== index))}><X size={13} /></button></div><StructuredDataEditor value={item} depth={depth + 1} context={context} fieldKey={fieldKey} decisionOptions={decisionOptions} fieldLabels={fieldLabels} onChange={(next) => onChange(value.map((current, itemIndex) => itemIndex === index ? next : current))} /></div>)}<button type="button" className="uc-gui-add-row" onClick={() => onChange([...value, blankLike(value[0])])}><CirclePlus size={14} />添加一项</button></div>;
  const record = value as Record<string, unknown>;
  return <div className={`uc-gui-editor-fields depth-${Math.min(depth, 2)}`}>{visibleGuiEntries(record, context).map(([key, item]) => <div className="uc-gui-editor-field" key={key}><span>{guiLabel(key)}</span><StructuredDataEditor value={item} depth={depth + 1} context={context} fieldKey={key} decisionOptions={decisionOptions} fieldLabels={fieldLabels} onChange={(next) => onChange({ ...record, [key]: next })} /></div>)}</div>;
}

function isPrimitive(value: unknown): value is string | number | boolean | null { return value == null || ["string", "number", "boolean"].includes(typeof value); }
function formatPrimitive(value: string | number | boolean | null, fieldKey: string | undefined, decisionOptions: CanvasDecisionOptions, fieldLabels: CanvasFieldLabels) { if (value == null || value === "") return "未填写"; if (typeof value === "boolean") return value ? "是" : "否"; const option = fieldKey ? decisionOptions[fieldKey]?.find((item) => item.value === String(value)) : undefined; return option?.label ?? guiValueLabels[String(value)] ?? presentText(String(value), decisionOptions, fieldLabels); }
function guiLabel(key: string) { return guiLabels[key] ?? key.replace(/([a-z])([A-Z])/g, "$1 $2").replaceAll("_", " "); }
function collectionTitle(value: unknown, index: number) { if (value && typeof value === "object" && !Array.isArray(value)) { const record = value as Record<string, unknown>; const title = record.title ?? record.name; if (typeof title === "string" && title.trim()) return title; } return `第 ${index + 1} 项`; }
function blankLike(value: unknown): unknown { if (typeof value === "number") return 0; if (typeof value === "boolean") return false; if (Array.isArray(value)) return []; if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, blankLike(item)])); return ""; }
function nodeTypeLabel(type: CanvasNode["type"]) { return ({ frame: "分组", text: "文本", card: "信息模块", list: "列表", image: "图片", table: "表格", code: "信息模块", note: "约束提示" } as Record<CanvasNode["type"], string>)[type]; }

const hiddenGuiKeys = new Set(["id", "schemaVersion", "projectId", "packId", "packVersion", "createdAt", "updatedAt", "exportFormat", "explicitRequirements"]);
const guiValueLabels: Record<string, string> = { writing: "写作", image: "图片", "web-page": "网页", "product-feature": "功能设计", direct: "先给结论", balanced: "经验与事实并重", "ending-1": "已选结尾方案" };
function visibleGuiEntries(record: Record<string, unknown>, context: string) { return Object.entries(record).filter(([key]) => !hiddenGuiKeys.has(key) && !(context === "需求分析" && key === "constraints")); }
function presentText(value: string, decisionOptions: CanvasDecisionOptions, fieldLabels: CanvasFieldLabels) {
  const labels = { ...fieldLabels, ...Object.fromEntries(Object.values(decisionOptions).flat().map((option) => [option.value, option.label])) };
  return Object.entries(labels).sort(([a], [b]) => b.length - a.length).reduce((text, [token, label]) => {
    if (!token || token === label) return text;
    const pattern = new RegExp(`(^|[^A-Za-z0-9_-])${escapeRegExp(token)}(?=$|[^A-Za-z0-9_-])`, "g");
    return text.replace(pattern, (_match, prefix: string) => `${prefix}${label}`);
  }, value);
}
function escapeRegExp(value: string) { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
