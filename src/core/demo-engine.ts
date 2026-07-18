import type { ArtifactSpec, ArtifactKind, CreationPack, CreativeDirection, DecisionModuleDefinition, RuntimeDecisionModule } from "@/types/universal";

function asList(value: unknown, fallback: string[] = []) {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  if (typeof value === "string") return value.split(/[、,，;；\n]/).map((item) => item.trim()).filter(Boolean);
  return fallback;
}
function text(value: unknown, fallback: string) { return typeof value === "string" && value.trim() ? value.trim() : fallback; }

export function buildAnalysis(rawInput: string, pack: CreationPack) {
  const directions = buildDirections(pack.artifactKind, pack.flow.directionConfig?.count ?? 3);
  return {
    analysis: {
      intent: rawInput.trim(),
      goal: `将“${rawInput.trim().slice(0, 40)}”收敛为可执行的${pack.name}方案`,
      audience: "待进一步确认",
      explicitRequirements: [rawInput.trim()],
      uncertainPoints: ["目标交付场景仍可在决策步骤补充"],
      constraints: [],
    },
    directions,
    decisionModules: buildRuntimeDecisionModules(pack.decisionModules, rawInput),
  };
}

export function buildDirections(kind: ArtifactKind, count: number): CreativeDirection[] {
  const presets: Record<ArtifactKind, Array<Omit<CreativeDirection, "id">>> = {
    image: [
      { title: "聚焦主体", summary: "让主体成为唯一视觉锚点，背景克制，适合快速识别。", differences: ["主体占比高", "背景简洁"], recommended: true },
      { title: "编辑留白", summary: "保留可放置标题和说明的空间，让画面适合继续排版。", differences: ["信息层级清楚", "文字留白" ] },
      { title: "叙事场景", summary: "把主体放进有上下文的场景，用环境传递情绪和用途。", differences: ["场景参与叙事", "情绪更丰富"] },
      { title: "材质实验", summary: "从材质、光线或纹理入手，让成果更具记忆点。", differences: ["材质强", "细节丰富"] },
      { title: "符号化", summary: "提取最有识别力的形状与色彩，减少无关细节。", differences: ["抽象程度高", "易于延展"] },
      { title: "手工温度", summary: "使用有手感的笔触或自然不规则，降低距离感。", differences: ["手工感", "亲和"] },
      { title: "高对比", summary: "用明确的明暗和色彩对比强化视觉冲击。", differences: ["对比强", "远距离可读"] },
      { title: "安静细节", summary: "以低饱和和细微层次呈现可靠、克制的气质。", differences: ["低饱和", "细节克制"] },
    ],
    writing: [
      { title: "先给结论", summary: "开头直接回答问题，再用分层论据让读者顺着判断走下去。", differences: ["结论前置", "阅读效率高"], recommended: true },
      { title: "经验切入", summary: "从具体场景和经历开始，让抽象观点落到读者可感知的细节。", differences: ["叙事开场", "距离感低"] },
      { title: "框架拆解", summary: "把复杂问题拆成几个可复用的判断维度，方便保存和转述。", differences: ["结构清楚", "方法感强"] },
      { title: "谨慎讨论", summary: "明确区分事实、经验与推测，适合争议性或信息不完整的话题。", differences: ["不确定性透明", "风险低"] },
    ],
    "web-page": [
      { title: "价值先行", summary: "首屏用一句话说清产品价值，后续用功能与证据完成转化。", differences: ["首屏直接", "转化路径短"], recommended: true },
      { title: "工作流展示", summary: "通过步骤和界面结构把产品能力变得可见、可想象。", differences: ["流程可见", "产品感强"] },
      { title: "问题到结果", summary: "先呈现用户的困扰，再逐步展示产品如何改变结果。", differences: ["对比叙事", "情绪推进"] },
      { title: "品牌叙事", summary: "用更宽松的节奏和视觉系统建立可信的品牌印象。", differences: ["品牌感", "留白多"] },
    ],
    "product-feature": [
      { title: "最小闭环", summary: "优先验证核心价值，只保留能让用户完成一次闭环的能力。", differences: ["范围小", "验证快"], recommended: true },
      { title: "可上线版本", summary: "在核心闭环外补齐首次使用、空状态和失败恢复等基础体验。", differences: ["体验完整", "上线可用"] },
      { title: "扩展友好", summary: "第一版边界清晰，同时为后续数据和能力扩展保留位置。", differences: ["结构可扩展", "长期清晰"] },
    ],
  };
  return presets[kind].slice(0, count).map((direction, index) => ({ ...direction, id: `direction-${index + 1}` }));
}

function buildRuntimeDecisionModules(modules: DecisionModuleDefinition[], rawInput: string): RuntimeDecisionModule[] {
  return modules.map((module) => {
    if (module.optionSource === "preset") return { ...module, options: module.options ?? [] };
    const options = [
      { id: `${module.id}-clear`, label: "清晰直接", description: `把“${rawInput.trim().slice(0, 22)}”转成第一印象明确的选择。`, recommended: true },
      { id: `${module.id}-warm`, label: "亲和有温度", description: "减少距离感，让成果更容易被理解和接受。" },
      { id: `${module.id}-distinctive`, label: "更有记忆点", description: "主动拉开差异，留下可复述的视觉或结构记忆。" },
      { id: `${module.id}-cautious`, label: "克制可靠", description: "减少未经确认的表达，对不确定内容保持透明。" },
    ];
    return { ...module, options: options.slice(0, module.optionCount ?? 3) };
  });
}

export function buildArtifactSpec(params: { projectId: string; pack: CreationPack; rawInput: string; inputValues: Record<string, unknown>; analysis: Record<string, unknown>; selectedDirection?: CreativeDirection; decisions: Record<string, unknown> }): ArtifactSpec {
  const now = new Date().toISOString();
  const constraints = { mustInclude: asList(params.inputValues.must_include), mustAvoid: [...asList(params.inputValues.must_avoid), ...asList(params.analysis.constraints)], mustKeep: asList(params.inputValues.must_keep) };
  const base = { schemaVersion: "1.0" as const, projectId: params.projectId, artifactKind: params.pack.artifactKind, packId: params.pack.id, packVersion: params.pack.version, rawInput: params.rawInput, analysis: params.analysis, selectedDirection: params.selectedDirection, decisions: params.decisions, constraints, createdAt: now, updatedAt: now };
  if (params.pack.artifactKind === "image") return { ...base, artifactKind: "image", image: {
    subject: text(params.inputValues.subject ?? params.inputValues.brand_type, params.rawInput), subjectAttributes: asList(params.inputValues.subject_attributes, ["清晰主体"]), identityLocks: asList(params.inputValues.identity_locks), scene: text(params.inputValues.scene, "干净、适合主体呈现的场景"), props: asList(params.inputValues.props), style: asList(params.inputValues.style, ["清晰、现代"]), composition: text(params.decisions.composition, params.selectedDirection?.summary ?? "主体清晰、层级明确"), camera: text(params.inputValues.camera, "自然视角"), lighting: asList(params.decisions.lighting, ["柔和自然光"]), colors: asList(params.inputValues.colors, ["自然、克制"]), requiredText: asList(params.inputValues.required_text), aspectRatio: text(params.inputValues.aspect_ratio, "1:1"), imageCount: 1, format: "png",
  } };
  if (params.pack.artifactKind === "writing") return { ...base, artifactKind: "writing", writing: {
    topic: text(params.inputValues.question, params.rawInput), platform: "知乎", audience: asList(params.inputValues.target_readers, ["对该问题有真实需求的读者"]), purpose: "给出可理解、可复用的判断", thesis: text(params.inputValues.core_judgment, params.selectedDirection?.summary ?? "先厘清问题，再给出可执行判断"), supportingClaims: asList(params.inputValues.supporting_claims, ["先区分事实与判断", "再说明适用边界"]), counterArguments: asList(params.inputValues.counter_view), structure: [{ id: "intro", title: "直接回应问题", purpose: "让读者快速知道本文立场", keyPoints: [text(params.inputValues.core_judgment, "核心判断")] }, { id: "body", title: "展开论证", purpose: "解释判断成立的原因与边界", keyPoints: asList(params.inputValues.argument_structure, ["背景", "原因", "行动建议"]) }, { id: "ending", title: "收束与提醒", purpose: "保留复核与行动空间", keyPoints: ["说明适用边界"] }], tone: asList(params.inputValues.tone, ["清楚", "克制"]), targetLength: Number(params.inputValues.target_length) || 1600, formattingRules: asList(params.inputValues.formatting, ["短段落", "使用小标题"]), confirmedFacts: asList(params.inputValues.confirmed_facts), uncertainFacts: asList(params.inputValues.uncertain_facts, ["需要发布前复核具体事实"]),
  } };
  if (params.pack.artifactKind === "web-page") return { ...base, artifactKind: "web-page", webPage: {
    productName: text(params.inputValues.product_name, "未命名产品"), productPurpose: text(params.inputValues.product_positioning, params.rawInput), targetUsers: asList(params.inputValues.target_users, ["正在寻找更高效工作方式的人"]), pageType: "SaaS 落地页", primaryGoal: text(params.inputValues.cta, text(params.inputValues.page_goal, "开始体验")), sections: [
      { id: "features", type: "features", title: "把复杂工作变得可理解", purpose: "用清晰区块说明产品如何帮用户完成目标。", content: { features: listOrText(params.inputValues.feature_blocks, "结构化方案、可视化预览、持续修改") } },
      { id: "trust", type: "trust", title: "让每一步都有依据", purpose: "把选择、约束和成果之间的关系展示出来。", content: { trust: listOrText(params.inputValues.trust_elements, "透明的方案结构与本地项目文件") } },
      { id: "cta", type: "cta", title: text(params.inputValues.cta, "现在开始"), purpose: "让用户直接进入第一次创作。", content: { action: "开始体验" } },
    ], visualSystem: { direction: listOrText(params.inputValues.visual_direction, "安静、清晰、编辑感"), typography: "高对比标题与易读正文", spacing: "宽松但有节奏", radius: "8px", colors: ["#f7f2ed", "#241b2b", "#7350a2"], motion: ["按钮轻微反馈", "菜单开关"] }, responsiveRules: asList(params.inputValues.responsive_rules, ["移动端单列", "导航收起为菜单", "保持 CTA 可见"]), interactionRules: ["菜单开关", "CTA 锚点", "不执行外部脚本"], exportFormat: "html-css",
  } };
  return { ...base, artifactKind: "product-feature", feature: {
    featureName: text(params.inputValues.feature_name, params.rawInput.slice(0, 40)), problem: text(params.inputValues.user_problem, params.rawInput), targetUsers: asList(params.inputValues.target_users, ["需要解决该问题的用户"]), userValue: "让用户更快、更稳地完成核心任务", scope: { included: asList(params.inputValues.mvp_scope, ["输入问题", "完成核心流程", "查看结果"]), excluded: ["复杂权限系统", "自动部署", "与本需求无关的扩展能力"] }, userFlow: [{ id: "start", title: "进入功能", description: "用户看到明确的入口和开始动作。" }, { id: "work", title: "完成核心操作", description: "系统按步骤收集必要信息并给出反馈。" }, { id: "finish", title: "确认结果", description: "用户查看结果、修改并导出。" }], screens: [
      { id: "entry", name: "入口页", purpose: "说明价值并开始操作", states: ["默认", "空状态", "错误"] }, { id: "workspace", name: "工作区", purpose: "完成主要任务", states: ["编辑中", "处理中", "已完成"] }, { id: "result", name: "结果页", purpose: "查看、修改、导出成果", states: ["已生成", "修改中"] },
    ], dataEntities: [{ name: "Project", fields: ["id", "name", "status", "createdAt"] }, { name: "ArtifactSpec", fields: ["artifactKind", "decisions", "constraints"] }], risks: asList(params.inputValues.risks, ["用户输入不完整", "模型结果需要复核"]), successMetrics: ["用户能完成一次核心闭环", "首次结果可被继续修改", "导出内容可复用"], acceptanceCriteria: asList(params.inputValues.acceptance, ["主流程可完成", "失败后不覆盖已有状态", "结果可导出"]), developmentTasks: ["建立数据结构", "实现主流程", "补齐空状态和错误状态", "增加导出"], testCases: ["空输入不可提交", "返回上一步不丢失已确认选择", "非法 Patch 不应用", "网页预览不访问主页面数据"],
  } };
}

function listOrText(value: unknown, fallback: string) { const items = asList(value); return items.length ? items.join("、") : fallback; }
