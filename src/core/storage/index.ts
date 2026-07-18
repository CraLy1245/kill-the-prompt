import type { ArtifactResult, ArtifactSpec, CreationPack, ProjectRecord, RevisionRecord } from "@/types/universal";

export interface StorageAdapter {
  listPacks(): Promise<CreationPack[]>;
  getPack(id: string): Promise<CreationPack | null>;
  savePack(pack: CreationPack): Promise<void>;
  deletePack(id: string): Promise<void>;
  listProjects(): Promise<ProjectRecord[]>;
  getProject(id: string): Promise<ProjectRecord | null>;
  saveProject(project: ProjectRecord): Promise<void>;
  deleteProject(id: string): Promise<void>;
  saveArtifactSpec(projectId: string, spec: ArtifactSpec): Promise<void>;
  getArtifactSpec(projectId: string): Promise<ArtifactSpec | null>;
  saveArtifactResult(projectId: string, result: ArtifactResult): Promise<void>;
  getArtifactResult(projectId: string): Promise<ArtifactResult | null>;
  saveRevisions(projectId: string, revisions: RevisionRecord[]): Promise<void>;
  getRevisions(projectId: string): Promise<RevisionRecord[]>;
}
