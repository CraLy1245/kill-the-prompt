"use client";

import type { FieldDefinition } from "@/types/universal";

export function WorkspaceField({ field, value, onChange }: { field: FieldDefinition; value: unknown; onChange: (value: unknown) => void }) {
  const stringValue = typeof value === "string" ? value : value == null ? "" : String(value);
  if (field.type === "textarea") return <label className="uc-field"><span>{field.label}{field.required ? <b>*</b> : null}</span>{field.description ? <small>{field.description}</small> : null}<textarea value={stringValue} onChange={(event) => onChange(event.target.value)} placeholder={field.description ?? "说得越具体，结构化结果越可靠"} /></label>;
  if (field.type === "tags") return <label className="uc-field"><span>{field.label}{field.required ? <b>*</b> : null}</span>{field.description ? <small>{field.description}</small> : null}<input value={stringValue} onChange={(event) => onChange(event.target.value)} placeholder="用逗号分隔，也可以直接写一句话" /></label>;
  if (field.type === "boolean") return <label className="uc-toggle-field"><span>{field.label}</span><input type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} /></label>;
  if (field.type === "number" || field.type === "slider") return <label className="uc-field"><span>{field.label}{field.required ? <b>*</b> : null}</span><input type="number" value={typeof value === "number" ? value : stringValue} onChange={(event) => onChange(Number(event.target.value))} /></label>;
  if (field.type === "single-select" || field.type === "aspect-ratio") return <label className="uc-field"><span>{field.label}{field.required ? <b>*</b> : null}</span><select value={stringValue} onChange={(event) => onChange(event.target.value)}><option value="">请选择</option>{(field.options ?? (field.type === "aspect-ratio" ? [{ id: "1:1", label: "1:1" }, { id: "4:3", label: "4:3" }, { id: "16:9", label: "16:9" }, { id: "9:16", label: "9:16" }] : [])).map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>;
  return <label className="uc-field"><span>{field.label}{field.required ? <b>*</b> : null}</span>{field.description ? <small>{field.description}</small> : null}<input value={stringValue} onChange={(event) => onChange(event.target.value)} placeholder="输入你的想法" /></label>;
}
