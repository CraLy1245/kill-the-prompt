import type { ArtifactSpec } from "@/types/universal";

const hiddenKeys = new Set(["schemaVersion", "projectId", "artifactKind", "packId", "packVersion", "createdAt", "updatedAt"]);
const labels: Record<string, string> = {
  rawInput: "创作目标", analysis: "需求分析", selectedDirection: "已选方向", decisions: "关键决策", constraints: "约束条件",
  writing: "写作方案", image: "图片方案", webPage: "网页方案", feature: "功能方案", intent: "创作意图", goal: "目标",
  audience: "目标读者", uncertainPoints: "待确认信息", assumptions: "合理假设", title: "标题", summary: "核心说明", differences: "差异点",
  mustInclude: "必须包含", mustAvoid: "必须避免", mustKeep: "必须保留", topic: "主题", platform: "发布平台", purpose: "创作目的",
  thesis: "核心观点", supportingClaims: "支持论点", counterArguments: "反方观点", structure: "内容结构", tone: "内容语气",
  targetLength: "目标长度", formattingRules: "排版规则", confirmedFacts: "已确认事实", uncertainFacts: "不确定事实", keyPoints: "关键要点",
};

export function buildFallbackCanvasHtml(spec: ArtifactSpec) {
  const sections = Object.entries(spec).filter(([key]) => !hiddenKeys.has(key) && key !== "rawInput");
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(spec.rawInput)}</title>
<style>
:root{color-scheme:light;--paper:#fbfaf7;--card:#fffefa;--ink:#281e2b;--muted:#746b73;--plum:#5b176f;--line:#e5ded8;--sage:#edf3ea}
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font-family:"Noto Sans SC","Microsoft YaHei",sans-serif;line-height:1.65}
main{max-width:1120px;margin:auto;padding:56px}.hero{padding:10px 0 34px;border-bottom:1px solid var(--line)}
.eyebrow{font-size:12px;letter-spacing:.16em;color:var(--plum);font-weight:700}.hero h1{margin:10px 0 12px;font-family:"Noto Serif SC","Songti SC",serif;font-size:38px;line-height:1.25;font-weight:600}.hero p{margin:0;color:var(--muted)}
.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;margin-top:24px}.panel{padding:22px 24px;background:var(--card);border:1px solid var(--line);border-radius:10px}.panel.constraints{background:var(--sage)}
.panel h2{margin:0 0 16px;font-family:"Noto Serif SC","Songti SC",serif;font-size:22px}.fields{display:grid;gap:12px}.field{padding-top:11px;border-top:1px solid var(--line)}.field:first-child{padding-top:0;border-top:0}.field dt{font-size:12px;color:var(--muted)}.field dd{margin:4px 0 0}
.chips{display:flex;flex-wrap:wrap;gap:7px}.chip{padding:4px 9px;border:1px solid #d9c9df;border-radius:999px;background:#faf5fb;color:#4b2358;font-size:12px}.items{display:grid;gap:10px}.item{padding:12px;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.58)}
@media(max-width:720px){main{padding:28px 20px}.hero h1{font-size:30px}.grid{grid-template-columns:1fr}.panel{padding:18px}}
</style>
</head>
<body><main>
<header class="hero"><span class="eyebrow">AI STRUCTURED PLAN</span><h1>${escapeHtml(spec.rawInput)}</h1><p>目标、方向、选择和约束已经整理为可执行方案。</p></header>
<div class="grid">${sections.map(([key, value]) => `<section class="panel ${key === "constraints" ? "constraints" : ""}"><h2>${label(key)}</h2>${renderValue(value, key)}</section>`).join("")}</div>
</main></body></html>`;
}

export function assertSafeCanvasHtml(html: string) {
  if (html.length > 120_000) throw new Error("AI 页面超过 120KB 限制");
  if (!/<html\b/i.test(html) || !/<head\b/i.test(html) || !/<body\b/i.test(html) || !/<style\b/i.test(html)) throw new Error("AI 必须返回包含 HTML、HEAD、STYLE 和 BODY 的完整页面");
  const forbidden = [
    /<script\b/i, /<iframe\b/i, /<object\b/i, /<embed\b/i, /<link\b/i, /<base\b/i,
    /<meta[^>]+http-equiv\s*=\s*["']?refresh/i, /\son[a-z]+\s*=/i, /javascript\s*:/i,
    /https?:\/\//i, /(?:src|href)\s*=\s*["']?\/\//i, /@import\s+/i, /\bfetch\s*\(/i,
    /XMLHttpRequest/i, /WebSocket/i, /\beval\s*\(/i, /new\s+Function/i,
  ];
  if (forbidden.some((pattern) => pattern.test(html))) throw new Error("AI 页面包含脚本、外部资源或危险跳转，已拒绝保存");
  return html;
}

function renderValue(value: unknown, context = ""): string {
  if (value == null || value === "") return '<span class="muted">未填写</span>';
  if (["string", "number", "boolean"].includes(typeof value)) return `<p>${escapeHtml(value === true ? "是" : value === false ? "否" : String(value))}</p>`;
  if (Array.isArray(value)) {
    if (!value.length) return '<span class="muted">暂无内容</span>';
    if (value.every((item) => ["string", "number", "boolean"].includes(typeof item))) return `<div class="chips">${value.map((item) => `<span class="chip">${escapeHtml(String(item))}</span>`).join("")}</div>`;
    return `<div class="items">${value.map((item) => `<article class="item">${renderValue(item, context)}</article>`).join("")}</div>`;
  }
  return `<dl class="fields">${Object.entries(value as Record<string, unknown>).filter(([key]) => !hiddenKeys.has(key) && !(context === "analysis" && key === "constraints")).map(([key, item]) => `<div class="field"><dt>${label(key)}</dt><dd>${renderValue(item, key)}</dd></div>`).join("")}</dl>`;
}

function label(key: string) { return labels[key] ?? key.replace(/([a-z])([A-Z])/g, "$1 $2").replaceAll("_", " "); }
function escapeHtml(value: string) { return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;"); }
