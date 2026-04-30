import type { TranscriptEntry } from "@paperclipai/adapter-utils";

export function parseDeepSeekStdoutLine(line: string, ts: string): TranscriptEntry[] {
  const trimmed = line.trim();
  if (!trimmed) return [];

  try {
    const event = JSON.parse(trimmed);
    if (event.type === "init") {
      return [{ kind: "init", ts, model: event.model || "unknown", sessionId: event.sessionId || "local" }];
    }
    if (event.type === "assistant") {
      return [{ kind: "assistant", ts, text: event.content }];
    }
    if (event.type === "result") {
      return [{
        kind: "result",
        ts,
        text: event.errorMessage || "Execution finished",
        inputTokens: event.usage?.inputTokens || 0,
        outputTokens: event.usage?.outputTokens || 0,
        cachedTokens: 0,
        costUsd: 0,
        subtype: "deepseek",
        isError: event.exitCode !== 0,
        errors: event.errorMessage ? [event.errorMessage] : [],
      }];
    }
  } catch (e) {
    // Not JSON, fallback to raw stdout
  }

  return [{ kind: "stdout", ts, text: line }];
}
