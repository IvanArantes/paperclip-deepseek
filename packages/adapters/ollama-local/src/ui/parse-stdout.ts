import type { TranscriptEntry } from "@paperclipai/adapter-utils";

export function parseStdoutLine(line: string, ts: string): TranscriptEntry[] {
  try {
    const parsed = JSON.parse(line);
    
    if (parsed.type === "init") {
      return [{
        kind: "init",
        ts,
        model: parsed.model || "unknown",
        sessionId: parsed.sessionId || "local",
      }];
    }
    
    if (parsed.type === "assistant") {
      return [{
        kind: "assistant",
        ts,
        text: parsed.content,
      }];
    }
    
    if (parsed.type === "result") {
      return [{
        kind: "result",
        ts,
        text: "Execution finished",
        inputTokens: parsed.stats?.prompt_eval_count || 0,
        outputTokens: parsed.stats?.eval_count || 0,
        cachedTokens: 0,
        costUsd: 0,
        subtype: "ollama",
        isError: false,
        errors: [],
      }];
    }

  } catch (e) {
    // If it's not our JSON, fallback to stdout
  }

  return [{
    kind: "stdout",
    ts,
    text: line,
  }];
}
