import type { ArtifactSpec, CanvasAction, CanvasDocument, CanvasNode } from "@/types/universal";

export const CANVAS_WORLD_WIDTH = 1120;

const ignoredSpecKeys = new Set(["schemaVersion", "projectId", "artifactKind", "packId", "packVersion", "createdAt", "updatedAt"]);
const labels: Record<string, string> = {
  rawInput: "创作目标",
  analysis: "需求分析",
  selectedDirection: "已选方向",
  decisions: "关键决策",
  constraints: "约束条件",
  writing: "写作方案",
  image: "图片方案",
  webPage: "网页方案",
  feature: "功能方案",
};

export function buildCanvasDocument(spec: ArtifactSpec): CanvasDocument {
  const now = new Date().toISOString();
  const sections = Object.entries(spec).filter(([key]) => !ignoredSpecKeys.has(key));
  const nodes: CanvasNode[] = [{
    id: "canvas-title",
    type: "text",
    title: "画布标题",
    content: { text: spec.rawInput },
    x: 72,
    y: 58,
    width: 900,
    height: 112,
    zIndex: 10,
    locked: false,
    style: { color: "#241828", fontSize: 34, fontWeight: "semibold", background: "transparent" },
  }];

  sections.forEach(([key, value], index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    nodes.push({
      id: `section-${safeNodeId(key)}-${index + 1}`,
      type: key === "constraints" ? "note" : Array.isArray(value) ? "list" : "card",
      title: labels[key] ?? humanizeKey(key),
      content: Array.isArray(value) && value.every((item) => typeof item === "string")
        ? { items: value as string[] }
        : { text: formatValue(value) },
      x: 72 + column * 490,
      y: 210 + row * 270,
      width: 450,
      height: 228,
      zIndex: 5 + index,
      style: key === "constraints"
        ? { background: "#f1f6ef", borderColor: "#cddccc", color: "#294433", radius: 8 }
        : { background: "#fffdf9", borderColor: "#dcd4cf", color: "#2d2330", radius: 8 },
    });
  });

  return { schemaVersion: "1.0", projectId: spec.projectId, nodes, revision: 0, createdAt: now, updatedAt: now };
}

export function applyCanvasActionsCore(document: CanvasDocument, actions: CanvasAction[]): CanvasDocument {
  const nodes = structuredClone(document.nodes);
  for (const action of actions) {
    if (action.op === "insert") {
      if (nodes.some((node) => node.id === action.node.id)) throw new Error(`画布节点已存在：${action.node.id}`);
      const width = Math.min(action.node.width, CANVAS_WORLD_WIDTH);
      nodes.push({ ...action.node, width, x: clampX(action.node.x, width) });
      continue;
    }
    const index = nodes.findIndex((node) => node.id === action.id);
    if (index < 0) throw new Error(`画布节点不存在：${action.id}`);
    if (nodes[index].locked) throw new Error(`画布节点已锁定：${action.id}`);
    if (action.op === "remove") {
      nodes.splice(index, 1);
      for (const node of nodes) if (node.parentId === action.id) delete node.parentId;
    } else if (action.op === "move") {
      nodes[index] = { ...nodes[index], x: clampX(action.x, nodes[index].width), y: action.y };
    } else if (action.op === "resize") {
      const x = clampX(nodes[index].x, 120);
      nodes[index] = { ...nodes[index], x, width: Math.min(action.width, CANVAS_WORLD_WIDTH - x), height: action.height };
    } else {
      nodes[index] = {
        ...nodes[index],
        ...action.changes,
        content: action.changes.content ? { ...nodes[index].content, ...action.changes.content } : nodes[index].content,
        style: action.changes.style ? { ...nodes[index].style, ...action.changes.style } : nodes[index].style,
      };
    }
  }
  return { ...document, nodes, revision: document.revision + 1, updatedAt: new Date().toISOString() };
}

function clampX(x: number, width: number) { return Math.max(0, Math.min(x, CANVAS_WORLD_WIDTH - width)); }

function safeNodeId(value: string) { return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "node"; }
function humanizeKey(value: string) { return value.replace(/([a-z])([A-Z])/g, "$1 $2").replaceAll("_", " "); }
function formatValue(value: unknown) {
  if (value == null) return "未指定";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map((item) => typeof item === "string" ? `• ${item}` : JSON.stringify(item)).join("\n").slice(0, 4_500);
  return Object.entries(value as Record<string, unknown>).map(([key, item]) => `${humanizeKey(key)}：${typeof item === "string" ? item : JSON.stringify(item)}`).join("\n").slice(0, 4_500);
}
