import { creationPackSchema } from "@/core/schemas";
import type { CreationPack } from "@/types/universal";
import generalImage from "@/packs/built-in/image.general.json";
import logoImage from "@/packs/built-in/image.logo.json";
import zhihuWriting from "@/packs/built-in/writing.zhihu-answer.json";
import saasLanding from "@/packs/built-in/web.saas-landing-page.json";
import appFeature from "@/packs/built-in/feature.app-feature.json";

export const builtInPacks: CreationPack[] = [generalImage, logoImage, zhihuWriting, saasLanding, appFeature].map((pack) => creationPackSchema.parse(pack) as CreationPack);

export class PackRegistry {
  constructor(private readonly customPacks: CreationPack[] = []) {}

  list() { return [...builtInPacks, ...this.customPacks]; }
  get(id: string) { return this.list().find((pack) => pack.id === id) ?? null; }
}
