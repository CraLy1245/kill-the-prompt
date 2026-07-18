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

test("设置页获取 OpenAI-compatible 模型并仅允许下拉选择", async () => {
  const settings = await read("src/app/settings/page.tsx");
  assert.match(settings, /调用端点/);
  assert.match(settings, /API Key/);
  assert.match(settings, /获取模型列表/);
  assert.match(settings, /<select value=\{textModel\}/);
  assert.match(settings, /请从列表中选择/);
  assert.equal(settings.includes("<datalist"), false);
  assert.equal(settings.includes("自定义模型 ID"), false);
  assert.match(settings, /textModel/);
  const discovery = await read("src/core/model-providers/model-discovery.ts");
  assert.match(discovery, /\/models/);
  assert.match(discovery, /discoverOpenAIModels/);
  const saveRoute = await read("src/app/api/models/status/route.ts");
  assert.match(saveRoute, /discovered\.textModels\.includes\(body\.textModel\)/);
  assert.match(saveRoute, /discovered\.imageModels\.includes\(body\.imageModel\)/);
});

test("writing 草稿兼容缺失平台、字符串结构和缺失语气", async () => {
  const { normalizeArtifactDraft } = await import("../src/core/model-providers/artifact-draft-normalizer.ts");
  const normalized = normalizeArtifactDraft({
    artifactKind: "writing",
    constraints: {},
    writing: { structure: ["先区分阅读习惯与阅读人设", "再说明判断边界"], tone: undefined, targetLength: "1600" },
  }, { platform: "知乎", tone: ["清晰", "克制"], targetLength: 1200 });
  assert.equal(normalized.writing.platform, "知乎");
  assert.deepEqual(normalized.writing.tone, ["清晰", "克制"]);
  assert.equal(normalized.writing.targetLength, 1600);
  assert.equal(normalized.writing.structure[0].id, "section-1");
  assert.deepEqual(normalized.writing.structure[0].keyPoints, ["先区分阅读习惯与阅读人设"]);
});

test("结构化输出可修复缺失逗号、尾随逗号和字符串换行", async () => {
  const { extractJsonObject } = await import("../src/lib/validators.ts");
  const parsed = extractJsonObject('```json\n{"summary":"第一行\n第二行""directions":[{"id":"a",}],}\n```');
  assert.deepEqual(parsed, { summary: "第一行\n第二行", directions: [{ id: "a" }] });
});

test("真实模式没有固定模板降级并启用 Patch 路径白名单", async () => {
  const compilers = await read("src/core/compilers/index.ts");
  assert.match(compilers, /requestArtifact/);
  assert.equal(compilers.includes("本文由结构化方案编译而成"), false);
  const patch = await read("src/core/patch.ts");
  assert.match(patch, /assertAllowedPatchPaths/);
  assert.match(patch, /Patch 路径不在允许范围内/);
});
