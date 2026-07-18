import { canvasActionListSchema, canvasDocumentSchema } from "@/core/schemas";
import { applyCanvasActionsCore, buildCanvasDocument, upgradeCanvasDocumentCore } from "@/core/canvas-core";
import type { ArtifactSpec, CanvasAction, CanvasDocument, CanvasEditResult, CanvasNode } from "@/types/universal";

export function createCanvasDocument(spec: ArtifactSpec): CanvasDocument {
  return canvasDocumentSchema.parse(buildCanvasDocument(spec)) as CanvasDocument;
}

export function upgradeCanvasDocument(document: CanvasDocument, spec: ArtifactSpec) {
  const upgraded = upgradeCanvasDocumentCore(document, spec);
  return upgraded.changed
    ? { document: canvasDocumentSchema.parse(upgraded.document) as CanvasDocument, changed: true }
    : upgraded;
}

export function applyCanvasActions(document: CanvasDocument, actions: CanvasAction[]): CanvasDocument {
  const parsed = canvasActionListSchema.shape.actions.parse(actions) as CanvasAction[];
  return canvasDocumentSchema.parse(applyCanvasActionsCore(document, parsed)) as CanvasDocument;
}

export function summarizeCanvasForModel(document: CanvasDocument) {
  return document.nodes.map((node) => ({ id: node.id, type: node.type, title: node.title, content: node.content, x: node.x, y: node.y, width: node.width, height: node.height, parentId: node.parentId, style: node.style }));
}

export function parseCanvasEditResult(value: unknown): CanvasEditResult {
  return canvasActionListSchema.parse(value) as CanvasEditResult;
}
