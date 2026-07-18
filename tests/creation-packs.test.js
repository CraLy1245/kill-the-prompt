import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packRoot = path.join(root, "src", "packs", "built-in");

test("内置创作包是合法 JSON 且不包含可执行配置入口", async () => {
  const files = (await readdir(packRoot)).filter((file) => file.endsWith(".json"));
  assert.equal(files.length, 5);
  for (const file of files) {
    const pack = JSON.parse(await readFile(path.join(packRoot, file), "utf8"));
    assert.equal(pack.schemaVersion, "1.0");
    assert.ok(["image", "writing", "web-page", "product-feature"].includes(pack.artifactKind));
    assert.ok(!Object.hasOwn(pack, "javascript"));
    assert.ok(!Object.hasOwn(pack, "modulePath"));
    assert.ok(pack.flow.steps.some((step) => step.id === "input" && step.enabled));
    assert.ok(pack.flow.steps.some((step) => step.id === "review" && step.enabled));
    assert.ok(pack.flow.steps.some((step) => step.id === "generate" && step.enabled));
  }
});
