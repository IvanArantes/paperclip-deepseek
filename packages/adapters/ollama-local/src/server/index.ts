import path from "node:path";
import { fileURLToPath } from "node:url";
import type { AdapterSessionCodec, AdapterSkillSnapshot, AdapterSkillContext } from "@paperclipai/adapter-utils";
import { readPaperclipRuntimeSkillEntries, resolvePaperclipDesiredSkillNames } from "@paperclipai/adapter-utils/server-utils";
import { execute } from "./execute.js";
import { testEnvironment } from "./test.js";

export { execute } from "./execute.js";
export { testEnvironment } from "./test.js";
export { isOllamaUnknownSessionError, parseOllamaOutput } from "./parse.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const sessionCodec: AdapterSessionCodec = {
  deserialize(raw: unknown) {
    if (raw && typeof raw === "object") {
      return raw as Record<string, unknown>;
    }
    return null;
  },
  serialize(params: Record<string, unknown> | null) {
    return params;
  },
  getDisplayId(params: Record<string, unknown> | null) {
    if (!params || !params.messages) return null;
    const msgs = params.messages as any[];
    return `Chat (${msgs.length} messages)`;
  },
};

export async function listModels(apiUrl?: string): Promise<{ id: string; label: string }[]> {
  const url = apiUrl ? apiUrl.replace(/\/$/, "") : "http://host.docker.internal:11434";
  try {
    const res = await fetch(`${url}/api/tags`);
    if (res.ok) {
      const data = await res.json() as any;
      return (data?.models || []).map((m: any) => ({ id: m.name, label: m.name }));
    }
  } catch (e) {
    // Ignore errors for listing models
  }
  return [];
}

async function buildSkillSnapshot(ctx: AdapterSkillContext): Promise<AdapterSkillSnapshot> {
  const availableEntries = await readPaperclipRuntimeSkillEntries(ctx.config, __dirname);
  const desiredSkills = resolvePaperclipDesiredSkillNames(ctx.config, availableEntries);

  return {
    adapterType: ctx.adapterType,
    supported: true,
    mode: "ephemeral",
    desiredSkills,
    entries: availableEntries.map(entry => ({
      ...entry,
      desired: desiredSkills.includes(entry.key),
      managed: true,
      state: "installed",
      origin: "company_managed",
    })),
    warnings: [],
  };
}

export async function listSkills(ctx: AdapterSkillContext): Promise<AdapterSkillSnapshot> {
  return buildSkillSnapshot(ctx);
}

export async function syncSkills(ctx: AdapterSkillContext, _desiredSkills: string[]): Promise<AdapterSkillSnapshot> {
  return buildSkillSnapshot(ctx);
}
