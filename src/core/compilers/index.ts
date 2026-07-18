import type {
  ArtifactCompiler, ArtifactResult, CompilerContext, ImageArtifactSpec, ProductFeatureArtifactSpec, WebPageArtifactSpec, WritingArtifactSpec,
} from "@/types/universal";

function list(values: string[]) { return values.length ? values.join("、") : "未指定"; }
function escapeHtml(value: string) { return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;"); }
function toLines(values: string[]) { return values.map((value) => `<li>${escapeHtml(value)}</li>`).join(""); }

export const imageArtifactCompiler: ArtifactCompiler<ImageArtifactSpec, Extract<ArtifactResult, { artifactKind: "image" }>> = {
  artifactKind: "image",
  async compile(spec, context) {
    const image = spec.image;
    const positiveInstruction = [
      `主体：${image.subject}`, `主体特征：${list(image.subjectAttributes)}`, `场景：${image.scene}`, `构图：${image.composition}`,
      `风格：${list(image.style)}`, `光线：${list(image.lighting)}`, `颜色：${list(image.colors)}`, `比例：${image.aspectRatio}`,
      image.requiredText.length ? `必须出现文字：${list(image.requiredText)}` : "", spec.constraints.mustInclude.length ? `必须保留：${list(spec.constraints.mustInclude)}` : "",
    ].filter(Boolean).join("\n");
    const negativeInstruction = list([...spec.constraints.mustAvoid, ...image.identityLocks]);
    const images: Array<{ id: string; url: string; localPath?: string }> = [];
    if (context.requestImage) {
      const result = await context.requestImage(positiveInstruction, negativeInstruction);
      if (result.url) images.push({ id: `${context.projectId}-image-1`, url: result.url });
    }
    return { artifactKind: "image", images, positiveInstruction, negativeInstruction };
  },
};

export const writingArtifactCompiler: ArtifactCompiler<WritingArtifactSpec, Extract<ArtifactResult, { artifactKind: "writing" }>> = {
  artifactKind: "writing",
  async compile(spec) {
    const writing = spec.writing;
    const title = writing.topic || "未命名回答";
    const sections = writing.structure.map((section) => `## ${section.title}\n\n${section.purpose}\n\n${section.keyPoints.map((point) => `- ${point}`).join("\n")}`).join("\n\n");
    const markdown = [
      `# ${title}`, `> 面向：${list(writing.audience)} · 语气：${list(writing.tone)} · 目标篇幅：约 ${writing.targetLength} 字`, "",
      writing.thesis, "", sections, writing.counterArguments.length ? `\n\n## 可能的反方观点\n\n${writing.counterArguments.map((item) => `- ${item}`).join("\n")}` : "",
      "\n\n---\n\n*本文由结构化方案编译而成，事实与不确定内容请在发布前复核。*",
    ].filter(Boolean).join("\n");
    return { artifactKind: "writing", title, markdown, outline: writing.structure.map((section) => section.title) };
  },
};

export const webPageArtifactCompiler: ArtifactCompiler<WebPageArtifactSpec, Extract<ArtifactResult, { artifactKind: "web-page" }>> = {
  artifactKind: "web-page",
  async compile(spec) {
    const page = spec.webPage;
    const sectionHtml = page.sections.map((section) => {
      const content = Object.values(section.content).filter((value): value is string => typeof value === "string");
      return `<section class="uc-section uc-section-${escapeHtml(section.type)}"><div class="uc-container"><p class="uc-kicker">${escapeHtml(section.type)}</p><h2>${escapeHtml(section.title)}</h2><p>${escapeHtml(section.purpose)}</p>${content.length ? `<ul>${toLines(content)}</ul>` : ""}</div></section>`;
    }).join("\n");
    const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(page.productName)}</title></head><body><header class="uc-header"><div class="uc-container"><strong>${escapeHtml(page.productName)}</strong><button data-toggle-menu aria-expanded="false">菜单</button></div></header><main><section class="uc-hero"><div class="uc-container"><p class="uc-kicker">${escapeHtml(page.pageType)}</p><h1>${escapeHtml(page.productName)}</h1><p>${escapeHtml(page.productPurpose)}</p><a class="uc-cta" href="#start">${escapeHtml(page.primaryGoal)}</a></div></section>${sectionHtml}</main></body></html>`;
    const css = `:root{color-scheme:light;--ink:#241b2b;--muted:#716777;--accent:#7350a2;--paper:#f7f2ed;--line:#ded4e2;--surface:#fffdfb}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font-family:Inter,ui-sans-serif,system-ui,sans-serif}button,a{font:inherit}.uc-container{width:min(1120px,calc(100% - 40px));margin:auto}.uc-header{border-bottom:1px solid var(--line);padding:20px 0}.uc-header button{float:right;border:1px solid var(--line);background:var(--surface);border-radius:8px;padding:8px 12px}.uc-hero{padding:100px 0 88px;background:var(--surface)}.uc-kicker{text-transform:uppercase;letter-spacing:.12em;font-size:12px;color:var(--accent);font-weight:700}.uc-hero h1{font-size:clamp(42px,8vw,88px);max-width:760px;line-height:1.02;margin:16px 0}.uc-hero p{max-width:620px;color:var(--muted);font-size:20px;line-height:1.65}.uc-cta{display:inline-block;margin-top:22px;padding:14px 22px;background:var(--accent);color:white;border-radius:8px;text-decoration:none}.uc-section{padding:72px 0;border-top:1px solid var(--line)}.uc-section h2{font-size:34px;margin:12px 0}.uc-section p,.uc-section li{max-width:660px;color:var(--muted);line-height:1.65}.uc-section ul{padding-left:20px}@media(max-width:680px){.uc-container{width:min(100% - 28px,1120px)}.uc-hero{padding:64px 0}.uc-section{padding:48px 0}}`;
    return { artifactKind: "web-page", pageSpec: page as unknown as Record<string, unknown>, files: { html, css, javascript: safeInteractionScript } };
  },
};

const safeInteractionScript = `(() => { const menu = document.querySelector('[data-toggle-menu]'); if (menu) menu.addEventListener('click', () => { const open = menu.getAttribute('aria-expanded') === 'true'; menu.setAttribute('aria-expanded', String(!open)); menu.textContent = open ? '菜单' : '已打开'; }); })();`;

export const productFeatureArtifactCompiler: ArtifactCompiler<ProductFeatureArtifactSpec, Extract<ArtifactResult, { artifactKind: "product-feature" }>> = {
  artifactKind: "product-feature",
  async compile(spec) {
    const feature = spec.feature;
    const markdown = [
      `# ${feature.featureName}`, `> ${feature.userValue}`, "", "## 问题与用户", feature.problem, `目标用户：${list(feature.targetUsers)}`,
      "", "## MVP 范围", `### 包含\n${feature.scope.included.map((item) => `- ${item}`).join("\n")}`, `### 不包含\n${feature.scope.excluded.map((item) => `- ${item}`).join("\n")}`,
      "", "## 用户流程", feature.userFlow.map((step, index) => `${index + 1}. **${step.title}**：${step.description}`).join("\n"),
      "", "## 页面与状态", feature.screens.map((screen) => `### ${screen.name}\n${screen.purpose}\n\n状态：${list(screen.states)}`).join("\n\n"),
      "", "## 数据结构建议", feature.dataEntities.map((entity) => `- **${entity.name}**：${list(entity.fields)}`).join("\n"),
      "", "## 风险与成功指标", `风险：${list(feature.risks)}\n\n成功指标：${list(feature.successMetrics)}`,
      "", "## 验收标准", feature.acceptanceCriteria.map((item) => `- [ ] ${item}`).join("\n"), "", "## 开发任务", feature.developmentTasks.map((item, index) => `${index + 1}. ${item}`).join("\n"),
      "", "## 测试用例", feature.testCases.map((item, index) => `${index + 1}. ${item}`).join("\n"),
    ].join("\n");
    return { artifactKind: "product-feature", markdown, structuredData: feature };
  },
};

export const compilerList = [imageArtifactCompiler, writingArtifactCompiler, webPageArtifactCompiler, productFeatureArtifactCompiler];
