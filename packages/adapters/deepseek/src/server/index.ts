import path from "node:path";
import { fileURLToPath } from "node:url";
import type { 
  AdapterSessionCodec, 
  AdapterSkillSnapshot, 
  AdapterSkillContext, 
} from "@paperclipai/adapter-utils";
import { 
  readPaperclipRuntimeSkillEntries, 
  resolvePaperclipDesiredSkillNames 
} from "@paperclipai/adapter-utils/server-utils";
import { execute } from "./execute.js";
import { testEnvironment } from "./test.js";

export { execute } from "./execute.js";
export { testEnvironment } from "./test.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const sessionCodec: AdapterSessionCodec = {
  deserialize(raw: any) {
    if (raw && typeof raw === "object" && Array.isArray(raw.messages)) {
      return { messages: raw.messages };
    }
    return null;
  },
  serialize(params: any) {
    if (params && typeof params === "object" && Array.isArray(params.messages)) {
      return { messages: params.messages };
    }
    return null;
  },
  getDisplayId(params: Record<string, unknown> | null) {
    if (!params || !params.messages) return null;
    const msgs = params.messages as any[];
    return `DeepSeek Session (${msgs.length} messages)`;
  },
};

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
  // Ephemeral adapters don't need to do anything for sync other than return the new snapshot.
  // The server handles updating the config.
  return buildSkillSnapshot(ctx);
}
