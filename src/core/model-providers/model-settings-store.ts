import "server-only";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { ModelRole } from "@/types/universal";

export type StoredRoleConfig = {
  baseUrl: string;
  apiKey: string;
  textModel: string;
  imageModel?: string;
  discoveredModels: string[];
  updatedAt: string;
};

export type StoredModelSettings = Partial<Record<ModelRole, StoredRoleConfig>>;

const settingsPath = path.join(process.cwd(), ".local-data", "model-settings.json");

export function readModelSettingsSync(): StoredModelSettings {
  try { return JSON.parse(readFileSync(settingsPath, "utf8")) as StoredModelSettings; } catch { return {}; }
}

export async function readModelSettings(): Promise<StoredModelSettings> {
  try { return JSON.parse(await readFile(settingsPath, "utf8")) as StoredModelSettings; } catch { return {}; }
}

export async function saveRoleConfig(role: ModelRole, config: StoredRoleConfig) {
  const settings = await readModelSettings();
  settings[role] = config;
  await writeSettings(settings);
}

export async function clearRoleConfig(role: ModelRole) {
  const settings = await readModelSettings();
  delete settings[role];
  await writeSettings(settings);
}

async function writeSettings(settings: StoredModelSettings) {
  await mkdir(path.dirname(settingsPath), { recursive: true });
  const temp = `${settingsPath}.tmp-${process.pid}`;
  await writeFile(temp, JSON.stringify(settings, null, 2), { encoding: "utf8", mode: 0o600 });
  await rename(temp, settingsPath);
}
