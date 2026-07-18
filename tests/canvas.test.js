import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { applyCanvasActionsCore, buildCanvasDocument } from "../src/core/canvas-core.ts";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const now = new Date().toISOString();
const writingSpec = {
  schemaVersion: "1.0",
  projectId: "canvas-test-project",
  artifactKind: "writing",
  packId: "writing.test",
  packVersion: "1.0.0",
  rawInput: "写一篇关于长期阅读习惯的文章",
  analysis: { goal: "帮助读者建立可持续的阅读方式" },
  decisions: { structure: "问题—证据—行动" },
  constraints: { mustInclude: ["具体行动"], mustAvoid: ["空泛口号"], mustKeep: [] },
  createdAt: now,
  updatedAt: now,
  writing: {
    topic: "长期阅读习惯",
    platform: "知乎",
    audience: ["希望恢复阅读的人"],
    purpose: "解释并给出行动方案",
    thesis: "稳定的阅读环境比意志力更重要",
    supportingClaims: ["降低启动阻力"],
    counterArguments: [],
    structure: [{ id: "opening", title: "先识别阻力", purpose: "建立共鸣", keyPoints: ["从真实场景切入"] }],
    tone: ["清晰", "克制"],
    targetLength: 1200,
    formattingRules: ["使用小标题"],
    confirmedFacts: [],
    uncertainFacts: [],
  },
};

test("通用画布从 ArtifactSpec 生成可编辑的语义节点，而非固定写作模板", () => {
  const canvas = buildCanvasDocument(writingSpec);
  assert.equal(canvas.projectId, writingSpec.projectId);
  assert.ok(canvas.nodes.some((node) => node.id.startsWith("section-writing-")));
  assert.ok(canvas.nodes.some((node) => node.id.startsWith("section-constraints-")));
  assert.equal(canvas.nodes.some((node) => node.id.includes("zhihu")), false);
});

test("画布动作支持插入、编辑、移动、缩放和删除，并维护 revision", () => {
  const initial = buildCanvasDocument(writingSpec);
  const inserted = applyCanvasActionsCore(initial, [{
    op: "insert",
    node: {
      id: "ai-note",
      type: "note",
      title: "AI 补充",
      content: { text: "补充一个有证据的反例" },
      x: 180,
      y: 880,
      width: 360,
      height: 140,
      zIndex: 30,
      style: { background: "#fffdf9", color: "#2d2330" },
    },
  }]);
  const edited = applyCanvasActionsCore(inserted, [
    { op: "update", id: "ai-note", changes: { title: "证据缺口", content: { text: "需要补充来源" } } },
    { op: "move", id: "ai-note", x: 640, y: 520 },
    { op: "resize", id: "ai-note", width: 420, height: 180 },
  ]);
  const note = edited.nodes.find((node) => node.id === "ai-note");
  assert.deepEqual({ title: note.title, text: note.content.text, x: note.x, y: note.y, width: note.width, height: note.height }, {
    title: "证据缺口", text: "需要补充来源", x: 640, y: 520, width: 420, height: 180,
  });
  assert.equal(edited.revision, 2);
  const removed = applyCanvasActionsCore(edited, [{ op: "remove", id: "ai-note" }]);
  assert.equal(removed.nodes.some((node) => node.id === "ai-note"), false);
  assert.equal(removed.revision, 3);
});

test("模型移动或插入节点时不会把对象放到画布横向边界之外", () => {
  const initial = buildCanvasDocument(writingSpec);
  const moved = applyCanvasActionsCore(initial, [{ op: "move", id: "canvas-title", x: 5000, y: 60 }]);
  const title = moved.nodes.find((node) => node.id === "canvas-title");
  assert.equal(title.x + title.width, 1120);
  const inserted = applyCanvasActionsCore(moved, [{
    op: "insert",
    node: { id: "wide-node", type: "frame", content: {}, x: 4000, y: 200, width: 1800, height: 300, zIndex: 2, style: {} },
  }]);
  const wide = inserted.nodes.find((node) => node.id === "wide-node");
  assert.equal(wide.width, 1120);
  assert.equal(wide.x, 0);
});

test("锁定节点不能被 AI 动作修改", () => {
  const initial = buildCanvasDocument(writingSpec);
  initial.nodes[0].locked = true;
  assert.throws(() => applyCanvasActionsCore(initial, [{ op: "move", id: initial.nodes[0].id, x: 20, y: 20 }]), /已锁定/);
});

test("确认步骤展示通用 AI 画布，生成端同时读取画布上下文", async () => {
  const [workspace, execution, generation, model] = await Promise.all([
    read("src/components/universal/WorkspaceClient.tsx"),
    read("src/core/model-providers/execution-model.ts"),
    read("src/app/api/artifacts/generate/route.ts"),
    read("src/core/model-providers/canvas-model.ts"),
  ]);
  assert.match(workspace, /UniversalAiCanvas/);
  assert.equal(workspace.includes("uc-spec-preview"), false);
  assert.match(execution, /用户与 AI 已共同编辑并确认的通用画布/);
  assert.match(generation, /getCanvasDocument/);
  assert.match(model, /CanvasAction/);
  assert.match(model, /不得假设存在知乎、网页、PRD 或图片专用模板/);
});

test("画布图片拒绝外部 URL，避免模型绕过资源边界", async () => {
  const { canvasNodeSchema } = await import("../src/core/schemas.ts");
  const baseNode = { id: "safe-image", type: "image", title: "图片", x: 0, y: 0, width: 320, height: 180, zIndex: 1, style: {} };
  assert.equal(canvasNodeSchema.safeParse({ ...baseNode, content: { src: "/uploads/example.png" } }).success, true);
  assert.equal(canvasNodeSchema.safeParse({ ...baseNode, content: { src: "https://example.com/tracker.png" } }).success, false);
  assert.equal(canvasNodeSchema.safeParse({ ...baseNode, content: { src: "//example.com/tracker.png" } }).success, false);
  assert.equal(canvasNodeSchema.safeParse({ ...baseNode, content: { src: "/uploads/../private.png" } }).success, false);
  assert.equal(canvasNodeSchema.safeParse({ ...baseNode, content: { src: "data:image/svg+xml;base64,PHN2Zz4=" } }).success, false);
});
