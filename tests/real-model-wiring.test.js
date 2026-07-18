import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("通用工作流路由不再引用 demo-engine", async () => {
  const routes = await Promise.all([
    read("src/app/api/workflow/analyze/route.ts"),
    read("src/app/api/workflow/build-spec/route.ts"),
    read("src/app/api/workflow/build-patch/route.ts"),
    read("src/app/api/artifacts/generate/route.ts"),
  ]);
  for (const source of routes) assert.equal(source.includes("demo-engine"), false);
});

test("分析模型和执行模型使用独立的服务端配置", async () => {
  const config = await read("src/core/model-providers/config.ts");
  for (const name of ["ANALYSIS_MODEL_API_KEY", "EXECUTION_MODEL_API_KEY", "EXECUTION_IMAGE_API_KEY"]) assert.match(config, new RegExp(name));
  const workspace = await read("src/components/universal/WorkspaceClient.tsx");
  assert.equal(workspace.includes("providerConfig"), false);
  assert.equal(workspace.includes("API Key（仅本地使用）"), false);
});

test("设置页只要求 OpenAI-compatible 端点和 API Key", async () => {
  const settings = await read("src/app/settings/page.tsx");
  assert.match(settings, /调用端点/);
  assert.match(settings, /API Key/);
  assert.equal(settings.includes("模型 ID</span><input"), false);
  const discovery = await read("src/core/model-providers/model-discovery.ts");
  assert.match(discovery, /\/models/);
  assert.match(discovery, /discoverOpenAIModels/);
});

test("真实模式没有固定模板降级并启用 Patch 路径白名单", async () => {
  const compilers = await read("src/core/compilers/index.ts");
  assert.match(compilers, /requestArtifact/);
  assert.equal(compilers.includes("本文由结构化方案编译而成"), false);
  const patch = await read("src/core/patch.ts");
  assert.match(patch, /assertAllowedPatchPaths/);
  assert.match(patch, /Patch 路径不在允许范围内/);
});
