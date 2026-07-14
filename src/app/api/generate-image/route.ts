import sharp from "sharp";
import { NextResponse } from "next/server";
import { z } from "zod";
import { buildImagesEndpoint, resolveImageModel } from "@/lib/modelRegistry";

export const maxDuration = 180;

const OUTPUT_EDGE = 1024;
const POLL_INTERVAL_MS = 1800;
const REQUEST_TIMEOUT_MS = 170000;

const requestSchema = z.object({
  format: z.string().trim().optional(),
  model: z.string().trim().optional(),
  providerConfig: z.object({
    apiKey: z.string().trim().optional(),
    baseUrl: z.string().trim().optional(),
    model: z.string().trim().optional(),
  }).optional(),
  prompt: z.string().trim().min(1),
  negativePrompt: z.string().trim().optional(),
  size: z.string().trim().optional(),
});

export async function POST(request: Request) {
  try {
    const body = requestSchema.parse(await request.json());
    const selectedModel = resolveImageModel(body.providerConfig ?? body.model);
    const apiKey = selectedModel.apiKey;
    const endpoint = buildImagesEndpoint(selectedModel.baseUrl);
    const model = selectedModel.id;
    const usesRightCodesAsyncApi = isRightCodesEndpoint(endpoint);

    if (!apiKey) {
      return NextResponse.json({ error: "生图模型 API Key 缺失，请在模型配置中填写 API Key，或配置 LOGO_IMAGE_API_KEY。" }, { status: 500 });
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(
        usesRightCodesAsyncApi
          ? {
              model,
              prompt: buildImagePrompt(body.prompt, body.negativePrompt),
              n: 1,
              size: "1:1",
              imageSize: "1K",
              async: true,
            }
          : {
              model,
              prompt: buildImagePrompt(body.prompt, body.negativePrompt),
              n: 1,
              size: `${OUTPUT_EDGE}x${OUTPUT_EDGE}`,
              response_format: "url",
            },
      ),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    const responseText = await response.text();
    if (!response.ok) {
      logImageError({
        status: response.status,
        detail: responseText.slice(0, 500),
      });
      return NextResponse.json({ error: "生成图片失败，请稍后重试。", detail: responseText.slice(0, 500) }, { status: response.status });
    }

    const submission = parseJson(responseText);
    const result = extractImageResult(submission);
    const completed = result.imageUrl
      ? result
      : usesRightCodesAsyncApi && typeof submission.task_id === "string"
        ? await pollRightCodesTask(endpoint, submission.task_id, apiKey)
        : result;

    if (!completed.imageUrl) {
      const detail = responseText.slice(0, 500);
      logImageError({ status: 502, detail });
      return NextResponse.json({ error: "接口没有返回图片链接。", detail }, { status: 502 });
    }

    const normalized = await normalizeSquareImage(completed.imageUrl);

    return NextResponse.json({
      imageUrl: normalized.imageUrl,
      usage: completed.usage,
      dimensions: { width: OUTPUT_EDGE, height: OUTPUT_EDGE },
      normalized: normalized.changed,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "";
    logImageError({
      errorType: error instanceof Error ? error.name : "UnknownError",
      detail,
    });
    return NextResponse.json({ error: "生成图片失败，请稍后重试。", detail }, { status: 500 });
  }
}

async function pollRightCodesTask(endpoint: string, taskId: string, apiKey: string) {
  const taskEndpoint = `${new URL(endpoint).origin}/v1/tasks/${encodeURIComponent(taskId)}`;
  const deadline = Date.now() + REQUEST_TIMEOUT_MS;

  while (Date.now() < deadline) {
    await delay(POLL_INTERVAL_MS);
    const response = await fetch(taskEndpoint, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(20000),
      cache: "no-store",
    });
    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(`查询生图任务失败（${response.status}）：${responseText.slice(0, 300)}`);
    }

    const data = parseJson(responseText);
    const result = extractImageResult(data);
    if (result.imageUrl) return result;
    if (data.status === "failed") {
      const message = typeof data.error?.message === "string" ? data.error.message : "上游生成失败";
      throw new Error(message);
    }
  }

  throw new Error("生图任务等待超时，请稍后重试。");
}

function extractImageResult(data: Record<string, any>) {
  const url = typeof data.data?.[0]?.url === "string" ? data.data[0].url : null;
  const base64 = typeof data.data?.[0]?.b64_json === "string" ? data.data[0].b64_json : null;
  return {
    imageUrl: url ?? (base64 ? `data:image/png;base64,${base64}` : null),
    usage: data.usage ?? null,
  };
}

async function normalizeSquareImage(imageUrl: string) {
  const input = await readImage(imageUrl);
  const metadata = await sharp(input).metadata();

  if (metadata.width === OUTPUT_EDGE && metadata.height === OUTPUT_EDGE) {
    return { imageUrl, changed: false };
  }

  const output = await sharp(input)
    .rotate()
    .flatten({ background: "#ffffff" })
    .resize(OUTPUT_EDGE, OUTPUT_EDGE, {
      fit: "contain",
      position: "centre",
      background: "#ffffff",
      withoutEnlargement: false,
    })
    .png({ compressionLevel: 9, palette: true, quality: 92 })
    .toBuffer();

  return {
    imageUrl: `data:image/png;base64,${output.toString("base64")}`,
    changed: true,
  };
}

async function readImage(imageUrl: string) {
  if (imageUrl.startsWith("data:")) {
    const separatorIndex = imageUrl.indexOf(",");
    const header = separatorIndex >= 0 ? imageUrl.slice(0, separatorIndex) : "";
    if (!/^data:image\/[a-zA-Z0-9.+-]+;base64$/.test(header)) {
      throw new Error("生图接口返回了无效的图片数据。");
    }
    return Buffer.from(imageUrl.slice(separatorIndex + 1), "base64");
  }

  const response = await fetch(imageUrl, { signal: AbortSignal.timeout(30000), cache: "no-store" });
  if (!response.ok) throw new Error(`读取生成图片失败（${response.status}）。`);
  return Buffer.from(await response.arrayBuffer());
}

function buildImagePrompt(prompt: string, negativePrompt?: string) {
  const lines = [
    "请生成一张最终交付级 Logo 成品图。",
    "画布必须是单张 1:1 正方形，主体居中，四周保留充足安全边距，背景干净。",
    "整张画面只允许出现一个最终 Logo 组合：图形符号只能出现一次，品牌名称最多出现一次。",
    "禁止把主标、缩略标或不同尺寸版本并排展示；禁止重复图形、方案对比、Logo system sheet、品牌展示板、网格、多版本、多变体和 mockup。",
    "不要加入尺寸标注、解释文字、装饰性说明或与品牌无关的内容。",
    "Single square canvas, exactly one final logo lockup, one symbol occurrence total, brand name at most once.",
    "No duplicate marks, alternate versions, size comparisons, logo sheet, grid, variants, presentation board, or mockup.",
    "",
    "正向 Prompt:",
    prompt,
  ];

  const avoid = [
    negativePrompt,
    "重复 Logo、重复图形、两个或多个标志、主标与缩略标同时出现、大小版本并排、方案对比、Logo 集合、Logo sheet、展示板、网格、多变体、mockup、非正方形构图",
  ].filter(Boolean);
  lines.push("", "需要避免:", avoid.join("；"));

  return lines.join("\n");
}

function isRightCodesEndpoint(endpoint: string) {
  try {
    const url = new URL(endpoint);
    return /(^|\.)right\.codes$/i.test(url.hostname) && url.pathname.includes("/draw/");
  } catch {
    return false;
  }
}

function parseJson(responseText: string): Record<string, any> {
  try {
    return JSON.parse(responseText) as Record<string, any>;
  } catch {
    throw new Error(`生图接口返回了无效数据：${responseText.slice(0, 300)}`);
  }
}

function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function logImageError(params: { detail: string; errorType?: string; status?: number }) {
  console.error(
    JSON.stringify({
      task: "generateImage",
      requestTime: new Date().toISOString(),
      errorType: params.errorType ?? "ImageGenerationError",
      status: params.status,
      detail: params.detail,
    }),
  );
}
