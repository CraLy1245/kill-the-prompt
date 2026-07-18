type WritingDefaults = { platform: string; tone: string[]; targetLength: number };
type WebPageDefaults = {
  productName: string;
  productPurpose: string;
  targetUsers: string[];
  pageType: string;
  primaryGoal: string;
};

export function normalizeArtifactDraft(value: unknown, defaults: WritingDefaults, webPageDefaults?: WebPageDefaults) {
  const draft = asRecord(value);
  const constraints = asRecord(draft.constraints);
  const normalized = {
    ...draft,
    constraints: {
      ...constraints,
      mustInclude: toStringList(constraints.mustInclude),
      mustAvoid: toStringList(constraints.mustAvoid),
      mustKeep: toStringList(constraints.mustKeep),
    },
  };
  if (draft.artifactKind === "web-page") {
    const webPage = asRecord(draft.webPage);
    const defaults = webPageDefaults;
    return {
      ...normalized,
      webPage: {
        ...webPage,
        productName: firstString(webPage.productName, webPage.name, webPage.title) || defaults?.productName,
        productPurpose: firstString(webPage.productPurpose, webPage.purpose, webPage.positioning, webPage.description) || defaults?.productPurpose,
        targetUsers: toStringList(webPage.targetUsers ?? webPage.audience ?? webPage.users, defaults?.targetUsers),
        pageType: firstString(webPage.pageType, webPage.type) || defaults?.pageType,
        primaryGoal: firstString(webPage.primaryGoal, webPage.goal, webPage.conversionGoal) || defaults?.primaryGoal,
        sections: normalizeWebSections(webPage.sections ?? webPage.pageSections ?? webPage.blocks),
        visualSystem: normalizeVisualSystem(webPage.visualSystem ?? webPage.visualStyle ?? webPage.designSystem),
        responsiveRules: toStringList(webPage.responsiveRules ?? webPage.responsive ?? webPage.breakpoints),
        interactionRules: toStringList(webPage.interactionRules ?? webPage.interactions ?? webPage.behaviors),
        exportFormat: "html-css",
      },
    };
  }
  if (draft.artifactKind !== "writing") return normalized;

  const writing = asRecord(draft.writing);
  return {
    ...normalized,
    writing: {
      ...writing,
      platform: nonEmptyString(writing.platform) || defaults.platform,
      audience: toStringList(writing.audience),
      supportingClaims: toStringList(writing.supportingClaims),
      counterArguments: toStringList(writing.counterArguments),
      structure: normalizeStructure(writing.structure),
      tone: toStringList(writing.tone, defaults.tone),
      targetLength: toPositiveNumber(writing.targetLength, defaults.targetLength),
      formattingRules: toStringList(writing.formattingRules),
      confirmedFacts: toStringList(writing.confirmedFacts),
      uncertainFacts: toStringList(writing.uncertainFacts),
    },
  };
}

function normalizeWebSections(value: unknown) {
  const source = Array.isArray(value)
    ? value
    : Object.entries(asRecord(value)).map(([key, item]) => ({ ...asRecord(item), id: key, type: key, content: item }));
  return source.map((item, index) => {
    if (typeof item === "string") {
      const title = item.trim() || `第 ${index + 1} 个区块`;
      return { id: `section-${index + 1}`, type: "content", title, purpose: title, content: { summary: title } };
    }
    const record = asRecord(item);
    const title = firstString(record.title, record.name, record.heading, record.label, record.sectionName) || `第 ${index + 1} 个区块`;
    const purpose = firstString(record.purpose, record.description, record.goal, record.summary, record.intent) || `说明${title}`;
    const rawContent = record.content ?? record.copy ?? record.data ?? record.items;
    return {
      ...record,
      id: firstString(record.id, record.key, record.slug) || `section-${index + 1}`,
      type: firstString(record.type, record.kind, record.layout, record.sectionType, record.component) || "content",
      title,
      purpose,
      content: normalizeContent(rawContent, record, purpose),
    };
  });
}

function normalizeVisualSystem(value: unknown) {
  const visual = asRecord(value);
  return {
    ...visual,
    direction: firstString(visual.direction, visual.style, visual.visualDirection, visual.artDirection) || "延续已选方向的克制视觉语言",
    typography: firstString(visual.typography, visual.fonts, visual.fontSystem, visual.typeScale) || "清晰的中文信息层级",
    spacing: firstString(visual.spacing, visual.spacingSystem, visual.grid) || "基于 8px 的响应式间距系统",
    radius: firstString(visual.radius, visual.borderRadius, visual.cornerStyle) || "统一且克制的圆角系统",
    colors: toStringList(visual.colors ?? visual.palette ?? visual.colorSystem, ["主色", "中性色", "强调色"]),
    motion: toStringList(visual.motion ?? visual.animations ?? visual.transitions, ["仅使用有助于理解状态变化的克制动效"]),
  };
}

function normalizeContent(value: unknown, section: Record<string, unknown>, fallback: string) {
  const content = asRecord(value);
  if (Object.keys(content).length) return content;
  if (value !== undefined && value !== null) return { value };
  const omitted = new Set(["id", "key", "slug", "type", "kind", "layout", "sectionType", "component", "title", "name", "heading", "label", "sectionName", "purpose", "description", "goal", "summary", "intent"]);
  const details = Object.fromEntries(Object.entries(section).filter(([key, item]) => !omitted.has(key) && item !== undefined));
  return Object.keys(details).length ? details : { summary: fallback };
}

function normalizeStructure(value: unknown) {
  const items = Array.isArray(value) ? value : typeof value === "string" ? value.split(/\r?\n/).filter(Boolean) : [];
  return items.map((item, index) => {
    if (typeof item === "string") {
      const title = item.trim();
      return { id: `section-${index + 1}`, title, purpose: `围绕“${title}”展开论证`, keyPoints: [title] };
    }
    const record = asRecord(item);
    const title = nonEmptyString(record.title) || nonEmptyString(record.purpose) || `第 ${index + 1} 部分`;
    return {
      ...record,
      id: nonEmptyString(record.id) || `section-${index + 1}`,
      title,
      purpose: nonEmptyString(record.purpose) || `围绕“${title}”展开论证`,
      keyPoints: toStringList(record.keyPoints, [title]),
    };
  });
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function nonEmptyString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    const item = nonEmptyString(value);
    if (item) return item;
  }
  return "";
}

function toStringList(value: unknown, fallback: string[] = []) {
  if (Array.isArray(value)) {
    const items = value.map(toReadableString).filter(Boolean);
    return items.length ? items : fallback;
  }
  const record = asRecord(value);
  if (Object.keys(record).length) {
    const items = Object.entries(record).map(([key, item]) => {
      const text = toReadableString(item);
      return text ? `${key}：${text}` : "";
    }).filter(Boolean);
    return items.length ? items : fallback;
  }
  const item = toReadableString(value);
  return item ? [item] : fallback;
}

function toReadableString(value: unknown): string {
  const direct = nonEmptyString(value);
  if (direct) return direct;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  const record = asRecord(value);
  const heading = firstString(record.label, record.title, record.name, record.breakpoint);
  const detail = firstString(record.rule, record.description, record.value, record.text, record.summary, record.behavior);
  if (heading && detail && heading !== detail) return `${heading}：${detail}`;
  if (heading || detail) return heading || detail;
  const primitives = Object.entries(record).flatMap(([key, item]) => {
    const text = nonEmptyString(item) || (typeof item === "number" || typeof item === "boolean" ? String(item) : "");
    return text ? [`${key}：${text}`] : [];
  });
  return primitives.join("；");
}

function toPositiveNumber(value: unknown, fallback: number) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : fallback;
}
