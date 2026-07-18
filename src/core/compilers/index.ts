import type {
  ArtifactCompiler,
  ArtifactResult,
  ImageArtifactSpec,
  ProductFeatureArtifactSpec,
  WebPageArtifactSpec,
  WritingArtifactSpec,
} from "@/types/universal";

function list(values: string[]) { return values.length ? values.join("、") : "未指定"; }

export const imageArtifactCompiler: ArtifactCompiler<ImageArtifactSpec, Extract<ArtifactResult, { artifactKind: "image" }>> = {
  artifactKind: "image",
  async compile(spec, context) {
    const image = spec.image;
    const positiveInstruction = [
      `主体：${image.subject}`,
      `主体特征：${list(image.subjectAttributes)}`,
      `场景：${image.scene}`,
      `构图：${image.composition}`,
      `风格：${list(image.style)}`,
      `光线：${list(image.lighting)}`,
      `颜色：${list(image.colors)}`,
      `比例：${image.aspectRatio}`,
      image.requiredText.length ? `必须出现文字：${list(image.requiredText)}` : "",
      spec.constraints.mustInclude.length ? `必须保留：${list(spec.constraints.mustInclude)}` : "",
      context.canvas ? `画布补充意图：${context.canvas.nodes.map((node) => [node.title, node.content.text, node.content.items?.join("、")].filter(Boolean).join("：")).filter(Boolean).join("；").slice(0, 4_000)}` : "",
    ].filter(Boolean).join("\n");
    const negativeInstruction = list([...spec.constraints.mustAvoid, ...image.identityLocks]);
    if (!context.requestImage) throw new Error("执行模型图片驱动未配置");
    const generated = await context.requestImage(positiveInstruction, negativeInstruction);
    return {
      artifactKind: "image",
      images: [{ id: `${context.projectId}-image-1`, url: generated.url }],
      positiveInstruction,
      negativeInstruction,
    };
  },
};

function delegate<TResult extends ArtifactResult>(spec: WritingArtifactSpec | WebPageArtifactSpec | ProductFeatureArtifactSpec, requestArtifact?: (value: typeof spec) => Promise<ArtifactResult>) {
  if (!requestArtifact) throw new Error("执行模型未配置");
  return requestArtifact(spec) as Promise<TResult>;
}

export const writingArtifactCompiler: ArtifactCompiler<WritingArtifactSpec, Extract<ArtifactResult, { artifactKind: "writing" }>> = {
  artifactKind: "writing",
  compile: (spec, context) => delegate(spec, context.requestArtifact),
};

export const webPageArtifactCompiler: ArtifactCompiler<WebPageArtifactSpec, Extract<ArtifactResult, { artifactKind: "web-page" }>> = {
  artifactKind: "web-page",
  compile: (spec, context) => delegate(spec, context.requestArtifact),
};

export const productFeatureArtifactCompiler: ArtifactCompiler<ProductFeatureArtifactSpec, Extract<ArtifactResult, { artifactKind: "product-feature" }>> = {
  artifactKind: "product-feature",
  compile: (spec, context) => delegate(spec, context.requestArtifact),
};

export const compilerList = [imageArtifactCompiler, writingArtifactCompiler, webPageArtifactCompiler, productFeatureArtifactCompiler];
