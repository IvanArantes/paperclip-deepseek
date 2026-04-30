import pc from "picocolors";

export function formatStdoutEvent(line: string, debug: boolean): void {
  try {
    const parsed = JSON.parse(line);
    
    if (parsed.type === "init") {
      console.log(pc.blue(`[ollama_local] init (model: ${parsed.model})`));
      return;
    }
    
    if (parsed.type === "assistant") {
      process.stdout.write(pc.green(parsed.content));
      return;
    }
    
    if (parsed.type === "result") {
      console.log("\n" + pc.dim(`[ollama_local] finish`));
      return;
    }

  } catch (e) {
    if (debug) {
      console.log(pc.gray(`[ollama_local] ${line}`));
    }
  }
}
