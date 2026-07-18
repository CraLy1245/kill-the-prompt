import "server-only";
import { mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { artifactResultSchema, artifactSpecSchema, creationPackSchema } from "@/core/schemas";
import { builtInPacks } from "@/core/pack-registry";
import type { ArtifactResult, ArtifactSpec, CreationPack, ProjectRecord, RevisionRecord } from "@/types/universal";
import type { StorageAdapter } from "@/core/storage";

const dataRoot = path.join(process.cwd(), ".local-data");
const customPackRoot = path.join(dataRoot, "custom-packs");
const projectRoot = path.join(dataRoot, "projects");

function safeId(value: string) {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,100}$/.test(value)) throw new Error("非法文件标识");
  return value;
}

async function ensureRoots() { await Promise.all([mkdir(customPackRoot, { recursive: true }), mkdir(projectRoot, { recursive: true })]); }
async function readJson<T>(file: string): Promise<T | null> { try { return JSON.parse(await readFile(file, "utf8")) as T; } catch { return null; } }
async function writeJson(file: string, value: unknown) {
  await mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.tmp-${process.pid}`;
  await writeFile(temp, JSON.stringify(value, null, 2), "utf8");
  await rename(temp, file);
}
function projectDir(id: string) { return path.join(projectRoot, safeId(id)); }

export class FileStorageAdapter implements StorageAdapter {
  async listPacks() {
    await ensureRoots();
    const entries = await readdir(customPackRoot, { withFileTypes: true });
    const custom = (await Promise.all(entries.filter((entry) => entry.isFile() && entry.name.endsWith(".json")).map((entry) => readJson<unknown>(path.join(customPackRoot, entry.name))))).filter(Boolean).map((item) => creationPackSchema.parse(item) as CreationPack);
    return [...builtInPacks, ...custom];
  }
  async getPack(id: string) { return (await this.listPacks()).find((pack) => pack.id === id) ?? null; }
  async savePack(pack: CreationPack) { const parsed = creationPackSchema.parse({ ...pack, source: "custom" }); await ensureRoots(); await writeJson(path.join(customPackRoot, `${safeId(parsed.id)}.json`), parsed); }
  async deletePack(id: string) { await ensureRoots(); await rm(path.join(customPackRoot, `${safeId(id)}.json`), { force: true }); }
  async listProjects() { await ensureRoots(); const entries = await readdir(projectRoot, { withFileTypes: true }); const projects = await Promise.all(entries.filter((entry) => entry.isDirectory()).map((entry) => readJson<ProjectRecord>(path.join(projectRoot, entry.name, "project.json")))); return projects.filter(Boolean).sort((a, b) => (b as ProjectRecord).updatedAt.localeCompare((a as ProjectRecord).updatedAt)) as ProjectRecord[]; }
  async getProject(id: string) { return readJson<ProjectRecord>(path.join(projectDir(id), "project.json")); }
  async saveProject(project: ProjectRecord) { safeId(project.id); await writeJson(path.join(projectDir(project.id), "project.json"), project); }
  async deleteProject(id: string) { await rm(projectDir(id), { recursive: true, force: true }); }
  async saveArtifactSpec(projectId: string, spec: ArtifactSpec) { const parsed = artifactSpecSchema.parse(spec) as ArtifactSpec; await writeJson(path.join(projectDir(projectId), "spec.json"), parsed); }
  async getArtifactSpec(projectId: string) { const value = await readJson<unknown>(path.join(projectDir(projectId), "spec.json")); return value ? artifactSpecSchema.parse(value) as ArtifactSpec : null; }
  async saveArtifactResult(projectId: string, result: ArtifactResult) { const parsed = artifactResultSchema.parse(result) as ArtifactResult; await writeJson(path.join(projectDir(projectId), "outputs", "result.json"), parsed); }
  async getArtifactResult(projectId: string) { const value = await readJson<unknown>(path.join(projectDir(projectId), "outputs", "result.json")); return value ? artifactResultSchema.parse(value) as ArtifactResult : null; }
  async saveRevisions(projectId: string, revisions: RevisionRecord[]) { await writeJson(path.join(projectDir(projectId), "revisions.json"), revisions); }
  async getRevisions(projectId: string) { return (await readJson<RevisionRecord[]>(path.join(projectDir(projectId), "revisions.json"))) ?? []; }
}

export const fileStorage = new FileStorageAdapter();
