import type { ZodSchema } from "zod";

export function parseWithSchema<T>(schema: ZodSchema<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join("; "));
  }
  return parsed.data;
}

export function extractJsonObject(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  const candidates = [...new Set([
    trimmed,
    start >= 0 && end > start ? trimmed.slice(start, end + 1) : "",
  ].filter(Boolean))];
  let lastError: unknown;

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch (error) {
      lastError = error;
    }
    try {
      return JSON.parse(repairCommonJsonSyntax(candidate));
    } catch (error) {
      lastError = error;
    }
  }

  if (!candidates.length || start === -1 || end <= start) throw new Error("AI returned non JSON content.");
  throw lastError instanceof Error ? lastError : new Error("AI returned invalid JSON content.");
}

export function repairCommonJsonSyntax(source: string) {
  let repaired = "";
  let inString = false;
  let escaped = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (inString) {
      if (escaped) {
        repaired += char;
        escaped = false;
      } else if (char === "\\") {
        repaired += char;
        escaped = true;
      } else if (char === '"') {
        repaired += char;
        inString = false;
      } else if (char === "\n") {
        repaired += "\\n";
      } else if (char === "\r") {
        repaired += "\\r";
      } else if (char === "\t") {
        repaired += "\\t";
      } else {
        repaired += char;
      }
      continue;
    }

    if (char === '"') {
      const previous = previousSignificantCharacter(repaired);
      if (isPropertyKeyAt(source, index) && previous && !"{[,".includes(previous)) repaired += ",";
      repaired += char;
      inString = true;
      continue;
    }

    const previous = previousSignificantCharacter(repaired);
    if ((char === "{" || char === "[") && (previous === "}" || previous === "]")) repaired += ",";
    repaired += char;
  }

  return removeTrailingCommas(repaired);
}

function previousSignificantCharacter(value: string) {
  for (let index = value.length - 1; index >= 0; index -= 1) {
    if (!/\s/.test(value[index])) return value[index];
  }
  return "";
}

function isPropertyKeyAt(source: string, start: number) {
  let escaped = false;
  for (let index = start + 1; index < source.length; index += 1) {
    const char = source[index];
    if (escaped) {
      escaped = false;
    } else if (char === "\\") {
      escaped = true;
    } else if (char === '"') {
      let cursor = index + 1;
      while (/\s/.test(source[cursor] ?? "")) cursor += 1;
      return source[cursor] === ":";
    }
  }
  return false;
}

function removeTrailingCommas(source: string) {
  let result = "";
  let inString = false;
  let escaped = false;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (inString) {
      result += char;
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      result += char;
      continue;
    }
    if (char === ",") {
      let cursor = index + 1;
      while (/\s/.test(source[cursor] ?? "")) cursor += 1;
      if (source[cursor] === "}" || source[cursor] === "]") continue;
    }
    result += char;
  }
  return result;
}
