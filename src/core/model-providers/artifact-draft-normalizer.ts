type WritingDefaults = { platform: string; tone: string[]; targetLength: number };

export function normalizeArtifactDraft(value: unknown, defaults: WritingDefaults) {
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

function toStringList(value: unknown, fallback: string[] = []) {
  if (Array.isArray(value)) {
    const items = value.map(nonEmptyString).filter(Boolean);
    return items.length ? items : fallback;
  }
  const item = nonEmptyString(value);
  return item ? [item] : fallback;
}

function toPositiveNumber(value: unknown, fallback: number) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : fallback;
}
