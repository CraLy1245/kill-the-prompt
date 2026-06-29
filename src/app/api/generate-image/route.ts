import { NextResponse } from "next/server";
import { z } from "zod";
import { buildImagesEndpoint, resolveImageModel } from "@/lib/modelRegistry";

export const maxDuration = 180;

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
    const size = body.size ?? process.env.RIGHT_CODES_IMAGE_SIZE ?? "1024x1024";

    if (!apiKey) {
      return NextResponse.json({ error: "生图模型 API Key 缺失，请在模型配置中填写 API Key，或配置 LOGO_IMAGE_API_KEY。" }, { status: 500 });
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        prompt: buildImagePrompt(body.prompt, body.negativePrompt),
        size,
        response_format: "url",
      }),
      signal: AbortSignal.timeout(170000),
    });

    const responseText = await response.text();
    if (!response.ok) {
      logImageError({
        status: response.status,
        detail: responseText.slice(0, 500),
      });
      return NextResponse.json({ error: "生成图片失败，请稍后重试。", detail: responseText.slice(0, 500) }, { status: response.status });
    }

    const { imageUrl, usage, detail } = parseImageResponse(responseText);

    if (!imageUrl) {
      logImageError({
        status: 502,
        detail,
      });
      return NextResponse.json({ error: "接口没有返回图片链接。", detail }, { status: 502 });
    }

    return NextResponse.json({ imageUrl, usage });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "";
    logImageError({
      errorType: error instanceof Error ? error.name : "UnknownError",
      detail,
    });
    return NextResponse.json({ error: "生成图片失败，请稍后重试。", detail }, { status: 500 });
  }
}

function parseImageResponse(responseText: string) {
  const data = JSON.parse(responseText);
  const imageUrl = typeof data.data?.[0]?.url === "string" ? data.data[0].url : null;
  return {
    imageUrl,
    usage: data.usage ?? null,
    detail: responseText.slice(0, 500),
  };
}

function buildImagePrompt(prompt: string, negativePrompt?: string) {
  const lines = [
    "请根据以下 Logo 生图 Prompt 生成一张高质量 Logo 设计图。",
    "画面应干净、专业、适合品牌展示；不要加入无关说明文字。",
    "",
    "正向 Prompt:",
    prompt,
  ];

  if (negativePrompt) {
    lines.push("", "需要避免:", negativePrompt);
  }

  return lines.join("\n");
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
