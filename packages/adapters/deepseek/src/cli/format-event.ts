import pc from "picocolors";

export function formatDeepSeekStdoutEvent(line: string, debug: boolean): void {
  const trimmed = line.trim();
  if (!trimmed) return;

  try {
    const event = JSON.parse(trimmed);
    if (event.type === "init") {
      console.log(pc.blue(`[DeepSeek] Initializing model: ${event.model}`));
      return;
    }
    if (event.type === "assistant") {
      process.stdout.write(pc.green(event.content));
      return;
    }
    if (event.type === "result") {
      console.log("\n");
      if (event.exitCode !== 0) {
        console.log(pc.red(`[DeepSeek] Error: ${event.errorMessage}`));
      } else {
        console.log(pc.blue(`[DeepSeek] Finished. Usage: ${event.usage?.inputTokens || 0} in, ${event.usage?.outputTokens || 0} out`));
      }
      return;
    }
  } catch (e) {
    if (debug) {
      console.log(pc.gray(line));
    }
  }
}
