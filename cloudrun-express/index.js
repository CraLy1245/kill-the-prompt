const express = require("express");
const crypto = require("crypto");
const mysql = require("mysql2/promise");
const { z } = require("zod");

const app = express();
app.use(express.json({ limit: "100kb" }));

const PORT = process.env.PORT || 80;
const TASK_TTL_MS = 20 * 60 * 1000;
const TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;
const DAILY_USAGE_QUOTA_LIMIT = 2;
const tasks = new Map();
let mysqlPool;
let usersTableReady;
let userDailyUsageTableReady;

const nonEmptyString = z.string().trim().min(1);
const stringArray = z.array(z.string().trim()).default([]);

const requirementAnalysisSchema = z.object({
  brandType: nonEmptyString,
  brandName: z.string().trim().nullable().optional(),
  targetUsers: stringArray,
  brandMood: stringArray,
  preferredElements: stringArray,
  preferredColors: stringArray,
  typographyPreference: z.string().trim().default(""),
  applicationScenarios: stringArray,
  constraints: stringArray,
  uncertainPoints: stringArray,
});

const designDirectionSchema = z.object({
  id: nonEmptyString,
  title: nonEmptyString,
  suitableFor: z.string().trim().default(""),
  visualKeywords: stringArray,
  elements: stringArray,
  colors: stringArray,
  fonts: stringArray,
  composition: z.string().trim().default(""),
  reason: z.string().trim().default(""),
});

const analyzeLogoResponseSchema = z.object({
  analysis: requirementAnalysisSchema,
  directions: z.array(designDirectionSchema).length(5),
});

const detailModuleIdSchema = z.enum([
  "graphicSubject",
  "graphicStructure",
  "complexity",
  "lineWeight",
  "fontStyle",
  "textHierarchy",
  "colorPalette",
  "applicationPriority",
  "avoidanceRules",
]);

const detailOptionSchema = z.object({
  id: nonEmptyString,
  label: nonEmptyString,
  description: nonEmptyString,
  recommended: z.boolean().optional(),
});

const detailModuleSchema = z.object({
  id: detailModuleIdSchema,
  title: nonEmptyString,
  description: nonEmptyString,
  selectionType: z.enum(["single", "multiple"]),
  options: z.array(detailOptionSchema).min(1),
});

const generateDetailsResponseSchema = z.object({
  selectedDirectionId: nonEmptyString,
  modules: z.array(detailModuleSchema).min(1),
});

const profileUpdateSchema = z.object({
  userProfile: z.object({
    avatarUrl: z.string().trim().optional(),
    nickName: z.string().trim().optional(),
  }),
});

const detailSelectionsSchema = z.object({
  graphicSubject: stringArray.optional(),
  graphicStructure: stringArray.optional(),
  complexity: stringArray.optional(),
  lineWeight: stringArray.optional(),
  fontStyle: stringArray.optional(),
  textHierarchy: stringArray.optional(),
  colorPalette: stringArray.optional(),
  applicationPriority: stringArray.optional(),
  avoidanceRules: stringArray.optional(),
}).partial();

const logoPlanSchema = z.object({
  brandType: nonEmptyString,
  brandName: z.string().trim().nullable().optional(),
  selectedDirection: nonEmptyString,
  selectedDetails: detailSelectionsSchema,
  designKeywords: stringArray,
  designSummary: nonEmptyString,
  usageScenarios: stringArray,
});

const finalPromptResponseSchema = z.object({
  logoPlan: logoPlanSchema,
  positivePrompt: nonEmptyString,
  negativePrompt: nonEmptyString,
});

const analyzeRequestSchema = z.object({
  rawInput: z.string().trim().min(1),
  regenerationPrompt: z.string().trim().optional(),
  previousDirections: z.array(z.unknown()).optional(),
});

const detailsRequestSchema = z.object({
  rawInput: z.string().trim().min(1),
  analysis: requirementAnalysisSchema,
  selectedDirection: designDirectionSchema,
});

const promptRequestSchema = z.object({
  rawInput: z.string().trim().min(1),
  analysis: requirementAnalysisSchema,
  selectedDirection: designDirectionSchema,
  detailSelections: detailSelectionsSchema,
});

const imageRequestSchema = z.object({
  prompt: z.string().trim().min(1),
  negativePrompt: z.string().trim().optional(),
  size: z.enum(["1024x1024", "2048x2048"]).optional(),
  format: z.enum(["png", "jpg"]).optional(),
});

const wechatLoginSchema = z.object({
  code: z.string().trim().min(1),
  userProfile: z.object({
    avatarUrl: z.string().trim().optional(),
    nickName: z.string().trim().optional(),
  }).optional(),
});

app.get("/", (_req, res) => {
  res.json({ name: "stepic-cloudrun-express", ok: true });
});

app.post("/api/auth/wechat-login", asyncHandler(async (req, res) => {
  const body = wechatLoginSchema.parse(req.body);
  const session = await resolveWechatSession(body.code, req.headers);
  const user = await upsertWechatUser(session, body.userProfile);
  res.json({
    token: signAuthToken({ openid: user.openid, userId: user.id }),
    user,
  });
}));

app.post("/api/auth/profile", asyncHandler(async (req, res) => {
  const body = profileUpdateSchema.parse(req.body);
  const session = requireAuthSession(req.headers);
  if (!session) {
    res.status(401).json({ error: "未登录或登录已过期。" });
    return;
  }

  const user = await updateWechatUserProfile(session, body.userProfile);
  res.json({ user });
}));

app.get("/api/quota", asyncHandler(async (req, res) => {
  const session = requireAuthSession(req.headers);
  if (!session) {
    res.status(401).json({ error: "未登录或登录已过期。" });
    return;
  }

  res.json(await getDailyUsageQuota(session));
}));

app.post("/api/tasks", asyncHandler(async (req, res) => {
  const parsed = z.object({
    body: z.unknown(),
    path: z.enum(["analyze-logo", "generate-details", "build-prompt", "generate-image"]),
  }).safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: "创建任务失败。", detail: parsed.error.message });
    return;
  }

  let quota = null;
  let body = parsed.data.body;
  if (parsed.data.path === "analyze-logo" && shouldConsumeQuotaForAnalyze(parsed.data.body)) {
    const session = requireAuthSession(req.headers);
    if (!session) {
      res.status(401).json({ error: "未登录或登录已过期。" });
      return;
    }
    body = analyzeRequestSchema.parse(parsed.data.body);
    const quotaResult = await consumeDailyUsageQuota(session);
    if (!quotaResult.allowed) {
      res.status(429).json({
        code: "DAILY_QUOTA_EXHAUSTED",
        error: "今日 2 次额度已用完，请等待北京时间 00:00 刷新。",
        quota: quotaResult.quota,
      });
      return;
    }
    quota = quotaResult.quota;
  }

  const task = createTask(parsed.data.path, body);
  res.json({ quota, taskId: task.id, status: task.status });
}));

app.get("/api/tasks/:taskId", (req, res) => {
  cleanupTasks();
  const task = tasks.get(req.params.taskId);
  if (!task) {
    res.status(404).json({ error: "任务不存在或已过期。" });
    return;
  }
  res.json({
    error: task.error,
    result: task.result,
    status: task.status,
    taskId: task.id,
  });
});

app.post("/api/analyze-logo", asyncHandler(async (req, res) => {
  const body = analyzeRequestSchema.parse(req.body);
  let quota = null;
  if (shouldConsumeQuotaForAnalyze(body)) {
    const session = requireAuthSession(req.headers);
    if (!session) {
      res.status(401).json({ error: "未登录或登录已过期。" });
      return;
    }
    const quotaResult = await consumeDailyUsageQuota(session);
    if (!quotaResult.allowed) {
      res.status(429).json({
        code: "DAILY_QUOTA_EXHAUSTED",
        error: "今日 2 次额度已用完，请等待北京时间 00:00 刷新。",
        quota: quotaResult.quota,
      });
      return;
    }
    quota = quotaResult.quota;
  }
  res.json({ ...(await executeLogoTask("analyze-logo", body)), quota });
}));

app.post("/api/generate-details", asyncHandler(async (req, res) => {
  res.json(await executeLogoTask("generate-details", req.body));
}));

app.post("/api/build-prompt", asyncHandler(async (req, res) => {
  res.json(await executeLogoTask("build-prompt", req.body));
}));

app.post("/api/generate-image", asyncHandler(async (req, res) => {
  const body = imageRequestSchema.parse(req.body);
  res.json(await generateImage(body));
}));

app.listen(PORT, () => {
  console.log(`Stepic CloudRun Express listening on ${PORT}`);
});

function createTask(path, body) {
  cleanupTasks();
  const now = Date.now();
  const id = `${now.toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const task = { createdAt: now, id, status: "pending", updatedAt: now };
  tasks.set(id, task);
  runTask(id, path, body);
  return task;
}

async function runTask(id, path, body) {
  const task = tasks.get(id);
  if (!task) return;
  task.status = "running";
  task.updatedAt = Date.now();
  try {
    task.result = await executeLogoTask(path, body);
    task.status = "succeeded";
  } catch (error) {
    task.error = resolveTaskError(path, error);
    task.status = "failed";
  } finally {
    task.updatedAt = Date.now();
  }
}

async function executeLogoTask(path, body) {
  if (path === "analyze-logo") {
    const input = analyzeRequestSchema.parse(body);
    return await callLogoAI("analyzeLogo", input, analyzeLogoResponseSchema);
  }
  if (path === "generate-details") {
    const input = detailsRequestSchema.parse(body);
    return await callLogoAI("generateDetails", input, generateDetailsResponseSchema);
  }
  if (path === "build-prompt") {
    const input = promptRequestSchema.parse(body);
    return await callLogoAI("buildPrompt", input, finalPromptResponseSchema);
  }
  if (path === "generate-image") {
    const input = imageRequestSchema.parse(body);
    return await generateImage(input);
  }
  throw new Error("Unsupported task path.");
}

async function callLogoAI(task, input, schema) {
  const base = (process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com").replace(/\/$/, "");
  const endpoint = `${base}/chat/completions`;
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const model = process.env.DEEPSEEK_MODEL || "deepseek-v4-flash";

  if (!apiKey) throw new Error("DEEPSEEK_API_KEY is missing.");

  let lastError;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await fetchWithTimeout(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: buildTaskPrompt(task, input) }],
          max_tokens: 3600,
          temperature: 0.35,
          thinking: { type: "enabled" },
          stream: false,
        }),
      }, 90000);

      if (!response.ok) {
        throw new Error(`AI request failed: ${response.status} ${await response.text()}`);
      }

      const data = await response.json();
      const outputText = data?.choices?.[0]?.message?.content || "";
      return parseWithSchema(schema, extractJsonObject(outputText));
    } catch (error) {
      lastError = error;
      console.error(JSON.stringify({
        task,
        requestTime: new Date().toISOString(),
        errorType: error instanceof Error ? error.name : "UnknownError",
        errorMessage: error instanceof Error ? error.message : String(error),
      }));
      if (attempt < 4) await delay(700 * attempt);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("AI output failed.");
}

function buildTaskPrompt(task, input) {
  const strictJsonRules = [
    "你只能输出一个 JSON 对象。",
    "不要输出 Markdown、解释文字、代码块或 JSON 以外的任何内容。",
    "所有字段必须存在；数组字段无内容时输出空数组。",
    "品牌名不是必填项；用户未明确提供品牌名时，brandName 必须为 null，且不得编造品牌名。",
  ].join("\n");

  const inputAdherenceRules = [
    "用户原始需求是唯一事实来源，必须逐字遵守，不得改写成另一个行业、品类、元素或风格。",
    "先把用户输入中的行业/品类、品牌名、目标用户、风格、颜色、图形元素、应用场景、禁用项识别为硬约束。",
    "凡是出现“不要、不能、避免、禁止、不需要、去除、排除、不要出现”等否定表达，必须写入 analysis.constraints，并且所有 directions 都不得包含这些内容。",
    "如果用户明确指定颜色、元素、风格或行业，5 个 directions 必须全部围绕这些指定内容展开，只能在构图、字体、抽象方式和表达角度上变化。",
    "不得为了追求多样性加入与用户需求无关的常见模板元素；没有被用户支持的信息只能放入 uncertainPoints，不能当作设计事实。",
    "每个 direction.reason 必须说明它具体贴合了用户原始需求中的哪一部分；如果无法说明，必须重写该方向。",
  ].join("\n");

  if (task === "analyzeLogo") {
    const hasRegenerationPrompt = Boolean(input.regenerationPrompt?.trim());
    const isRegeneration = hasRegenerationPrompt || Boolean(input.previousDirections?.length);
    return [
      strictJsonRules,
      inputAdherenceRules,
      isRegeneration
        ? "任务：读取用户原始 Logo 设计需求和用户补充灵感，重新生成 5 个全新的设计方向。"
        : "任务：读取用户原始 Logo 设计需求，完成需求解析，并输出 5 个互相区分、适合当前需求的设计方向。",
      "不允许输出具体 Logo Prompt，不允许进入细节选择阶段。",
      "directions 数量必须刚好为 5。",
      "5 个 directions 必须明显不相似：核心图形元素、构图方式、配色倾向、字体气质、品牌情绪至少有 3 项彼此不同。",
      "禁止用同一核心符号换近义词、只改颜色、只改标题来凑数量；每个方向都要代表一个独立设计路线。",
      isRegeneration
        ? "必须避开 previousDirections 中已有的标题、核心元素、构图和视觉关键词；新方向不得与上一批相似。用户补充灵感优先级高于上一批方向。"
        : "",
      "输出 JSON 结构：",
      `{
  "analysis": {
    "brandType": "string",
    "brandName": "string | null",
    "targetUsers": ["string"],
    "brandMood": ["string"],
    "preferredElements": ["string"],
    "preferredColors": ["string"],
    "typographyPreference": "string",
    "applicationScenarios": ["string"],
    "constraints": ["string"],
    "uncertainPoints": ["string"]
  },
  "directions": [
    {
      "id": "string",
      "title": "string",
      "suitableFor": "string",
      "visualKeywords": ["string"],
      "elements": ["string"],
      "colors": ["string"],
      "fonts": ["string"],
      "composition": "string",
      "reason": "string"
    }
  ]
}`,
      "用户原始需求（唯一事实来源，必须逐字遵守）：",
      `<<<USER_INPUT_START>>>\n${input.rawInput}\n<<<USER_INPUT_END>>>`,
      isRegeneration ? "用户补充灵感 / 重新生成要求：" : "",
      isRegeneration ? (hasRegenerationPrompt ? input.regenerationPrompt.trim() : "用户未填写额外灵感，请直接换一批与上一批明显不同的新方向。") : "",
      isRegeneration && input.previousDirections?.length ? "上一批方向，必须避开相似路线：" : "",
      isRegeneration && input.previousDirections?.length ? JSON.stringify(input.previousDirections, null, 2) : "",
    ].filter(Boolean).join("\n\n");
  }

  if (task === "generateDetails") {
    return [
      strictJsonRules,
      inputAdherenceRules,
      "任务：根据用户原始需求、需求解析结果和已选设计方向，生成该方向下的 Logo 设计细节选择模块。",
      "模块 ID 固定为 graphicSubject、graphicStructure、complexity、lineWeight、fontStyle、textHierarchy、colorPalette、applicationPriority、avoidanceRules。",
      "模块内选项必须围绕用户原始需求和已选方向动态生成，不得与任何输入要求、禁用项或已选方向冲突，不得输出最终 Prompt。",
      "输出 JSON 结构：",
      `{
  "selectedDirectionId": "string",
  "modules": [
    {
      "id": "graphicSubject | graphicStructure | complexity | lineWeight | fontStyle | textHierarchy | colorPalette | applicationPriority | avoidanceRules",
      "title": "string",
      "description": "string",
      "selectionType": "single | multiple",
      "options": [
        { "id": "string", "label": "string", "description": "string", "recommended": true }
      ]
    }
  ]
}`,
      "输入：",
      JSON.stringify(input, null, 2),
    ].join("\n\n");
  }

  return [
    strictJsonRules,
    inputAdherenceRules,
    "任务：根据用户原始需求、需求解析结果、已选方向和已选细节，生成 Logo 方案确认卡与最终生图 Prompt。",
    "Prompt 必须与用户原始需求和用户选择一致，不得混入未选择方向，不得新增冲突核心元素，不得违反禁用项。",
    "如果用户未提供品牌名，Prompt 中只能使用“品牌名占位符”或“未定品牌名文字区域”，不得编造品牌名。",
    "输出 JSON 结构：",
    `{
  "logoPlan": {
    "brandType": "string",
    "brandName": "string | null",
    "selectedDirection": "string",
    "selectedDetails": {
      "graphicSubject": ["string"],
      "graphicStructure": ["string"],
      "complexity": ["string"],
      "lineWeight": ["string"],
      "fontStyle": ["string"],
      "textHierarchy": ["string"],
      "colorPalette": ["string"],
      "applicationPriority": ["string"],
      "avoidanceRules": ["string"]
    },
    "designKeywords": ["string"],
    "designSummary": "string",
    "usageScenarios": ["string"]
  },
  "positivePrompt": "string",
  "negativePrompt": "string"
}`,
    "输入：",
    JSON.stringify(input, null, 2),
  ].join("\n\n");
}

async function generateImage(body) {
  const apiKey = process.env.RIGHT_CODES_IMAGE_API_KEY;
  const endpoint = resolveImageEndpoint(process.env.RIGHT_CODES_IMAGE_BASE_URL || "https://www.right.codes/draw/v1/chat/completions");
  const model = process.env.RIGHT_CODES_IMAGE_MODEL || "gpt-image-2-vip";

  if (!apiKey) throw new Error("RIGHT_CODES_IMAGE_API_KEY is missing.");

  const response = await fetchWithTimeout(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(buildImagePayload(endpoint, model, body)),
  }, 170000);

  const responseText = await response.text();
  if (!response.ok) throw new Error(`Image request failed: ${response.status} ${responseText.slice(0, 500)}`);

  const parsed = parseImageResponse(responseText, response.headers.get("content-type") || "");
  if (!parsed.imageUrl) throw new Error(`接口没有返回图片链接：${parsed.detail.slice(0, 500)}`);
  return parsed;
}

function resolveImageEndpoint(value) {
  const cleaned = value.replace(/\/$/, "");
  if (cleaned.endsWith("/images/generations")) return cleaned;
  if (cleaned.endsWith("/chat/completions")) return cleaned;
  if (cleaned.endsWith("/responses")) return cleaned.replace(/\/responses$/, "/images/generations");
  return `${cleaned}/images/generations`;
}

function buildImagePayload(endpoint, model, body) {
  const prompt = buildImagePrompt(body.prompt, body.negativePrompt, body.size, body.format);
  if (endpoint.endsWith("/chat/completions")) {
    return {
      model,
      stream: true,
      messages: [{ role: "user", content: [{ type: "text", text: prompt }] }],
    };
  }
  return {
    model,
    prompt,
    size: body.size || "1024x1024",
    response_format: "url",
  };
}

function buildImagePrompt(prompt, negativePrompt, size, format) {
  const lines = [
    "请根据以下 Logo 生图 Prompt 生成一张高质量 Logo 设计图。",
    "画面应干净、专业、适合品牌展示；不要加入无关说明文字。",
    size ? `画布尺寸偏好：${size}，请按正方形构图生成。` : "画布尺寸偏好：正方形构图。",
    format ? `用户导出格式偏好：${format.toUpperCase()}。` : "",
    "",
    "正向 Prompt:",
    prompt,
  ].filter(Boolean);
  if (negativePrompt) lines.push("", "需要避免:", negativePrompt);
  return lines.join("\n");
}

function parseImageResponse(responseText, contentType) {
  if (!contentType.includes("text/event-stream")) {
    const data = JSON.parse(responseText);
    const chatContent = data.choices?.[0]?.message?.content || "";
    const imageUrl = data.data?.[0]?.url || data.output?.[0]?.url || data.url || extractImageUrl(chatContent) || extractImageUrl(JSON.stringify(data));
    return { imageUrl, detail: imageUrl ? "" : chatContent || JSON.stringify(data), usage: data.usage || null };
  }

  let content = "";
  let usage = null;
  for (const line of responseText.split(/\r?\n/)) {
    if (!line.startsWith("data:")) continue;
    const rawPayload = line.replace(/^data:\s*/, "").trim();
    if (!rawPayload || rawPayload === "[DONE]") continue;
    const payload = JSON.parse(rawPayload);
    const deltaContent = payload.choices?.[0]?.delta?.content;
    const messageContent = payload.choices?.[0]?.message?.content;
    if (typeof deltaContent === "string") content += deltaContent;
    if (typeof messageContent === "string") content += messageContent;
    if (payload.usage) usage = payload.usage;
  }
  return { imageUrl: extractImageUrl(content), detail: content, usage };
}

function extractImageUrl(content) {
  const markdownImageMatch = content.match(/!\[[^\]]*]\((https?:\/\/[^)\s]+)\)/i);
  if (markdownImageMatch?.[1]) return markdownImageMatch[1];
  const urlMatch = content.match(/https?:\/\/\S+/i);
  return urlMatch?.[0]?.replace(/[),.。]+$/, "") || null;
}

function extractJsonObject(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("AI output did not include a JSON object.");
  }
  return JSON.parse(text.slice(start, end + 1));
}

function parseWithSchema(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) throw new Error(`AI output schema mismatch: ${result.error.message}`);
  return result.data;
}

function resolveTaskError(path, error) {
  if (error instanceof Error && error.message.includes("403")) {
    if (path === "analyze-logo") return "需求分析接口没有当前模型权限，请检查分析 API Key。";
    if (path === "generate-details") return "细节生成接口没有当前模型权限，请检查分析 API Key。";
    if (path === "build-prompt") return "Logo 方案生成接口没有当前模型权限，请检查分析 API Key。";
  }
  return error instanceof Error && error.message ? error.message : "生成失败，请重新尝试。";
}

function asyncHandler(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      res.status(500).json({
        error: resolveTaskError("", error),
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  };
}

function resolveWechatSessionFromHeaders(headers) {
  const openid = normalizeHeaderValue(headers["x-wx-openid"] || headers["x-wx-from-openid"]);
  if (!openid) return null;
  return {
    openid,
    sessionKey: "",
    unionid: normalizeHeaderValue(headers["x-wx-unionid"] || headers["x-wx-from-unionid"]),
  };
}

function requireAuthSession(headers) {
  const authorization = normalizeHeaderValue(headers.authorization || headers.Authorization);
  if (!authorization) return null;
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  return verifyAuthToken(match[1].trim());
}

async function resolveWechatSession(code, headers) {
  const headerSession = resolveWechatSessionFromHeaders(headers);
  if (headerSession) return headerSession;
  return await exchangeWechatCode(code);
}

async function exchangeWechatCode(code) {
  const appid = process.env.WECHAT_APPID || "wx5528845ce39e325a";
  const secret = process.env.WECHAT_APP_SECRET;
  if (!secret) throw new Error("WECHAT_APP_SECRET is missing.");

  const query = new URLSearchParams({
    appid,
    secret,
    js_code: code,
    grant_type: "authorization_code",
  });
  const response = await fetchWithTimeout(`https://api.weixin.qq.com/sns/jscode2session?${query}`, {}, 12000);
  const data = await response.json();
  if (!response.ok || data.errcode) {
    throw new Error(`微信登录失败：${data.errmsg || response.status}`);
  }
  if (!data.openid) throw new Error("微信登录失败：未返回 openid。");
  return {
    openid: String(data.openid),
    sessionKey: data.session_key ? String(data.session_key) : "",
    unionid: data.unionid ? String(data.unionid) : "",
  };
}

async function upsertWechatUser(session, userProfile) {
  const nickName = normalizeNullableString(userProfile?.nickName);
  const avatarUrl = normalizeNullableString(userProfile?.avatarUrl);
  const unionid = normalizeNullableString(session.unionid);

  const table = await tryEnsureUsersTable();
  if (!table.available) {
    return {
      id: 0,
      openid: session.openid,
      unionid,
      nickName,
      avatarUrl,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };
  }

  const pool = getMysqlPool();

  const [result] = await pool.execute(
    `
      INSERT INTO users (openid, unionid, nick_name, avatar_url, last_login_at)
      VALUES (?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        id = LAST_INSERT_ID(id),
        unionid = COALESCE(VALUES(unionid), unionid),
        nick_name = COALESCE(VALUES(nick_name), nick_name),
        avatar_url = COALESCE(VALUES(avatar_url), avatar_url),
        last_login_at = NOW()
    `,
    [session.openid, unionid, nickName, avatarUrl],
  );
  const userId = result.insertId;
  const [rows] = await pool.execute(
    "SELECT id, openid, unionid, nick_name AS nickName, avatar_url AS avatarUrl, created_at AS createdAt, last_login_at AS lastLoginAt FROM users WHERE id = ? LIMIT 1",
    [userId],
  );
  if (!rows[0]) throw new Error("用户写入成功但读取失败。");
  return rows[0];
}

async function updateWechatUserProfile(session, userProfile) {
  const nickName = normalizeNullableString(userProfile?.nickName);
  const avatarUrl = normalizeNullableString(userProfile?.avatarUrl);
  const table = await tryEnsureUsersTable();

  if (!table.available) {
    return {
      id: Number(session.userId || 0),
      openid: session.openid,
      unionid: null,
      nickName,
      avatarUrl,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };
  }

  const pool = getMysqlPool();
  if (Number(session.userId || 0) > 0) {
    await pool.execute(
      `
        UPDATE users
        SET nick_name = COALESCE(?, nick_name),
            avatar_url = COALESCE(?, avatar_url)
        WHERE id = ?
      `,
      [nickName, avatarUrl, Number(session.userId)],
    );
    const [rows] = await pool.execute(
      "SELECT id, openid, unionid, nick_name AS nickName, avatar_url AS avatarUrl, created_at AS createdAt, last_login_at AS lastLoginAt FROM users WHERE id = ? LIMIT 1",
      [Number(session.userId)],
    );
    if (!rows[0]) throw new Error("用户更新成功但读取失败。");
    return rows[0];
  }

  await pool.execute(
    `
      UPDATE users
      SET nick_name = COALESCE(?, nick_name),
          avatar_url = COALESCE(?, avatar_url)
      WHERE openid = ?
    `,
    [nickName, avatarUrl, session.openid],
  );
  const [rows] = await pool.execute(
    "SELECT id, openid, unionid, nick_name AS nickName, avatar_url AS avatarUrl, created_at AS createdAt, last_login_at AS lastLoginAt FROM users WHERE openid = ? LIMIT 1",
    [session.openid],
  );
  if (!rows[0]) throw new Error("用户更新成功但读取失败。");
  return rows[0];
}

function shouldConsumeQuotaForAnalyze(body) {
  const input = analyzeRequestSchema.parse(body);
  return !input.regenerationPrompt && !(Array.isArray(input.previousDirections) && input.previousDirections.length > 0);
}

async function getDailyUsageQuota(session) {
  const table = await tryEnsureUserDailyUsageTable();
  const usageDate = getBeijingDateKey();
  const resetAt = getNextBeijingMidnightIso();
  if (!table.available) {
    return {
      limit: DAILY_USAGE_QUOTA_LIMIT,
      remaining: DAILY_USAGE_QUOTA_LIMIT,
      resetAt,
      resetTimezone: "Asia/Shanghai",
      used: 0,
      usageDate,
    };
  }

  const pool = getMysqlPool();
  const [rows] = await pool.execute(
    "SELECT used_count AS used FROM user_daily_usage WHERE openid = ? AND usage_date = ? LIMIT 1",
    [session.openid, usageDate],
  );
  const used = Math.max(0, Number(rows[0]?.used || 0));
  return buildQuotaPayload(used, usageDate, resetAt);
}

async function consumeDailyUsageQuota(session) {
  const table = await tryEnsureUserDailyUsageTable();
  if (!table.available) {
    throw new Error("每日额度服务暂不可用，请稍后重试。");
  }

  const usageDate = getBeijingDateKey();
  const resetAt = getNextBeijingMidnightIso();
  const pool = getMysqlPool();
  const userId = Number(session.userId || 0) || null;

  const [insertResult] = await pool.execute(
    `
      INSERT INTO user_daily_usage (openid, user_id, usage_date, used_count)
      SELECT ?, ?, ?, 1
      WHERE NOT EXISTS (
        SELECT 1
        FROM user_daily_usage
        WHERE openid = ? AND usage_date = ? AND used_count >= ?
      )
      ON DUPLICATE KEY UPDATE
        user_id = COALESCE(VALUES(user_id), user_id),
        used_count = IF(used_count < ?, used_count + 1, used_count)
    `,
    [session.openid, userId, usageDate, session.openid, usageDate, DAILY_USAGE_QUOTA_LIMIT, DAILY_USAGE_QUOTA_LIMIT],
  );
  const [rows] = await pool.execute(
    "SELECT used_count AS used FROM user_daily_usage WHERE openid = ? AND usage_date = ? LIMIT 1",
    [session.openid, usageDate],
  );
  const used = Math.max(0, Number(rows[0]?.used || 0));
  const changedRows = Number(insertResult.affectedRows || 0);
  const quota = buildQuotaPayload(used, usageDate, resetAt);
  return {
    allowed: changedRows > 0 && used <= DAILY_USAGE_QUOTA_LIMIT,
    quota,
  };
}

function buildQuotaPayload(used, usageDate, resetAt) {
  const normalizedUsed = Math.min(Math.max(0, Number(used || 0)), DAILY_USAGE_QUOTA_LIMIT);
  return {
    limit: DAILY_USAGE_QUOTA_LIMIT,
    remaining: Math.max(0, DAILY_USAGE_QUOTA_LIMIT - normalizedUsed),
    resetAt,
    resetTimezone: "Asia/Shanghai",
    used: normalizedUsed,
    usageDate,
  };
}

async function tryEnsureUserDailyUsageTable() {
  try {
    await ensureUserDailyUsageTable();
    return { available: true };
  } catch (error) {
    return { available: false, error };
  }
}

async function ensureUserDailyUsageTable() {
  if (!hasMysqlConfig()) {
    throw new Error("MySQL environment variables are missing.");
  }
  if (!userDailyUsageTableReady) {
    userDailyUsageTableReady = getMysqlPool().execute(`
      CREATE TABLE IF NOT EXISTS user_daily_usage (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        openid VARCHAR(64) NOT NULL,
        user_id BIGINT UNSIGNED NULL,
        usage_date DATE NOT NULL,
        used_count INT UNSIGNED NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uniq_usage_openid_date (openid, usage_date),
        KEY idx_usage_user_date (user_id, usage_date),
        KEY idx_usage_date (usage_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  }
  await userDailyUsageTableReady;
}

function getBeijingDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Shanghai",
    year: "numeric",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function getNextBeijingMidnightIso(date = new Date()) {
  const [year, month, day] = getBeijingDateKey(date).split("-").map(Number);
  const nextMidnightUtcMs = Date.UTC(year, month - 1, day, 16, 0, 0);
  const nextMidnight = new Date(nextMidnightUtcMs);
  const nextDate = getBeijingDateKey(nextMidnight);
  return `${nextDate}T00:00:00+08:00`;
}

async function tryEnsureUsersTable() {
  try {
    await ensureUsersTable();
    return { available: true };
  } catch (error) {
    return { available: false, error };
  }
}

async function ensureUsersTable() {
  if (!hasMysqlConfig()) {
    throw new Error("MySQL environment variables are missing.");
  }
  if (!usersTableReady) {
    usersTableReady = getMysqlPool().execute(`
      CREATE TABLE IF NOT EXISTS users (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        openid VARCHAR(64) NOT NULL,
        unionid VARCHAR(64) NULL,
        nick_name VARCHAR(128) NULL,
        avatar_url TEXT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        last_login_at TIMESTAMP NULL DEFAULT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uniq_users_openid (openid),
        KEY idx_users_unionid (unionid)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  }
  await usersTableReady;
}

function getMysqlPool() {
  if (!mysqlPool) {
    if (!hasMysqlConfig()) throw new Error("MySQL environment variables are missing.");
    mysqlPool = mysql.createPool({
      database: process.env.MYSQL_DATABASE,
      host: process.env.MYSQL_HOST,
      password: process.env.MYSQL_PASSWORD,
      port: Number(process.env.MYSQL_PORT || 3306),
      user: process.env.MYSQL_USER,
      waitForConnections: true,
      connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT || 5),
      charset: "utf8mb4",
    });
  }
  return mysqlPool;
}

function hasMysqlConfig() {
  return !!(process.env.MYSQL_HOST && process.env.MYSQL_USER && process.env.MYSQL_PASSWORD && process.env.MYSQL_DATABASE);
}

function signAuthToken(payload) {
  const secret = process.env.AUTH_TOKEN_SECRET || process.env.WECHAT_APP_SECRET;
  if (!secret) throw new Error("AUTH_TOKEN_SECRET is missing.");
  const header = { alg: "HS256", typ: "JWT" };
  const body = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
    iat: Math.floor(Date.now() / 1000),
  };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedBody = base64UrlEncode(JSON.stringify(body));
  const signature = crypto.createHmac("sha256", secret).update(`${encodedHeader}.${encodedBody}`).digest("base64url");
  return `${encodedHeader}.${encodedBody}.${signature}`;
}

function verifyAuthToken(token) {
  const secret = process.env.AUTH_TOKEN_SECRET || process.env.WECHAT_APP_SECRET;
  if (!secret) return null;

  const [encodedHeader, encodedBody, signature] = String(token || "").split(".");
  if (!encodedHeader || !encodedBody || !signature) return null;

  const expectedSignature = crypto.createHmac("sha256", secret).update(`${encodedHeader}.${encodedBody}`).digest("base64url");
  if (!safeCompare(signature, expectedSignature)) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(encodedBody));
    if (!payload || typeof payload !== "object") return null;
    if (typeof payload.exp === "number" && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return {
      openid: normalizeNullableString(payload.openid) || "",
      userId: Number(payload.userId || 0),
    };
  } catch {
    return null;
  }
}

function base64UrlEncode(value) {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function safeCompare(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function normalizeNullableString(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function normalizeHeaderValue(value) {
  if (Array.isArray(value)) return normalizeNullableString(value[0]);
  return normalizeNullableString(value);
}

function cleanupTasks() {
  const expiresBefore = Date.now() - TASK_TTL_MS;
  for (const [id, task] of tasks.entries()) {
    if (task.updatedAt < expiresBefore) tasks.delete(id);
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}
