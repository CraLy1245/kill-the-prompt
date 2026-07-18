import type { ArtifactCompiler, ArtifactKind, ArtifactResult, ArtifactSpec, CompilerContext } from "@/types/universal";

export type ArtifactRenderer<T extends ArtifactResult = ArtifactResult> = { artifactKind: T["artifactKind"] };

export class CompilerRegistry {
  private readonly items = new Map<ArtifactKind, ArtifactCompiler<ArtifactSpec, ArtifactResult>>();
  register(compiler: ArtifactCompiler<ArtifactSpec, ArtifactResult>) { this.items.set(compiler.artifactKind, compiler); }
  get(kind: ArtifactKind) { return this.items.get(kind); }
  async compile(spec: ArtifactSpec, context: CompilerContext) {
    const compiler = this.get(spec.artifactKind);
    if (!compiler) throw new Error(`未注册成果编译器: ${spec.artifactKind}`);
    return compiler.compile(spec, context);
  }
}

export class RendererRegistry {
  private readonly items = new Map<string, ArtifactRenderer>();
  register(id: string, renderer: ArtifactRenderer) { this.items.set(id, renderer); }
  get(id: string) { return this.items.get(id); }
}

export class ExporterRegistry {
  private readonly items = new Map<string, (result: ArtifactResult) => string | Blob>();
  register(id: string, exporter: (result: ArtifactResult) => string | Blob) { this.items.set(id, exporter); }
  get(id: string) { return this.items.get(id); }
}
