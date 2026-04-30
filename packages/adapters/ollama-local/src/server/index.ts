import type { AdapterSessionCodec, AdapterSkillSnapshot, AdapterSkillContext, AdapterSkillEntry } from "@paperclipai/adapter-utils";
import { execute } from "./execute.js";
import { testEnvironment } from "./test.js";

export { execute } from "./execute.js";
export { testEnvironment } from "./test.js";
export { isOllamaUnknownSessionError, parseOllamaOutput } from "./parse.js";

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

export async function listSkills(ctx: AdapterSkillContext): Promise<AdapterSkillSnapshot> {
  return {
    adapterType: ctx.adapterType,
    supported: true,
    mode: "ephemeral",
    desiredSkills: (ctx.config.desiredSkills as string[]) ?? [],
    entries: [],
    warnings: [],
  };
}

export async function syncSkills(ctx: AdapterSkillContext, desiredSkills: string[]): Promise<AdapterSkillSnapshot> {
  const entries: AdapterSkillEntry[] = desiredSkills.map(key => ({
    key,
    runtimeName: key,
    desired: true,
    managed: true,
    state: "installed",
    origin: "company_managed",
  }));

  return {
    adapterType: ctx.adapterType,
    supported: true,
    mode: "ephemeral",
    desiredSkills,
    entries,
    warnings: [],
  };
}
