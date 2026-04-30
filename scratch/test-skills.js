import path from "node:path";
import { fileURLToPath } from "node:url";
import { readPaperclipRuntimeSkillEntries, resolvePaperclipDesiredSkillNames } from "./packages/adapter-utils/dist/server-utils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function test() {
    const mockConfig = {};
    const moduleDir = path.join(__dirname, "packages/adapters/deepseek/src/server");
    console.log("Module Dir:", moduleDir);
    
    try {
        const availableSkills = await readPaperclipRuntimeSkillEntries(mockConfig, moduleDir);
        console.log("Available Skills count:", availableSkills.length);
        console.log("Available Skills keys:", availableSkills.map(s => s.key));
        
        const desiredSkillNames = resolvePaperclipDesiredSkillNames(mockConfig, availableSkills);
        console.log("Desired Skill Names:", desiredSkillNames);
        
        const activeSkills = availableSkills.filter(s => desiredSkillNames.includes(s.key));
        console.log("Active Skills:", activeSkills.map(s => s.runtimeName));
    } catch (e) {
        console.error("Error:", e);
    }
}

test();
