import { artifactSpecPatchSchema, artifactSpecSchema } from "@/core/schemas";
import type { ArtifactSpec, ArtifactSpecPatch } from "@/types/universal";

function segments(path: string) { return path.replace(/^\//, "").split("/").map((part) => part.replaceAll("~1", "/").replaceAll("~0", "~")); }
export function applyArtifactSpecPatch(spec: ArtifactSpec, patch: ArtifactSpecPatch): ArtifactSpec {
  const parsedPatch = artifactSpecPatchSchema.parse(patch);
  const next = structuredClone(spec) as unknown as Record<string, unknown>;
  for (const operation of parsedPatch.operations) {
    const keys = segments(operation.path);
    const last = keys.pop();
    if (!last || keys.some((key) => key === "__proto__" || key === "constructor" || key === "prototype")) throw new Error("Patch 路径不安全");
    let target: Record<string, unknown> | unknown[] = next;
    for (const key of keys) {
      if (Array.isArray(target)) target = target[Number(key)] as Record<string, unknown>;
      else target = target[key] as Record<string, unknown>;
      if (!target || typeof target !== "object") throw new Error("Patch 路径不存在");
    }
    if (Array.isArray(target)) {
      if (last === "-") { if (operation.op === "add") target.push(operation.value); else throw new Error("数组末尾只支持 add"); }
      else if (operation.op === "remove") target.splice(Number(last), 1);
      else if (operation.op === "add") target.splice(Number(last), 0, operation.value);
      else target[Number(last)] = operation.value;
    } else if (operation.op === "remove") delete target[last];
    else target[last] = operation.value;
  }
  return artifactSpecSchema.parse({ ...next, updatedAt: new Date().toISOString() }) as ArtifactSpec;
}
