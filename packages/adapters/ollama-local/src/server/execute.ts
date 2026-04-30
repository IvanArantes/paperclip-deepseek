import fs from "node:fs/promises";
import path from "node:path";
import type { AdapterExecutionContext, AdapterExecutionResult, AdapterInvocationMeta } from "@paperclipai/adapter-utils";
import { asNumber, asString, renderTemplate, DEFAULT_PAPERCLIP_AGENT_PROMPT_TEMPLATE, redactEnvForLogs, joinPromptSections, renderPaperclipWakePrompt } from "@paperclipai/adapter-utils/server-utils";
import { isOllamaUnknownSessionError, parseOllamaOutput } from "./parse.js";

export async function execute(ctx: AdapterExecutionContext): Promise<AdapterExecutionResult> {
  const { runId, agent, runtime, config, context, onLog, onMeta } = ctx;

  const apiUrl = asString(config.apiUrl, "http://host.docker.internal:11434").replace(/\/$/, "");
  const model = asString(config.model, "llama3.2");
  const timeoutSec = asNumber(config.timeoutSec, 0);

  const storedSession = runtime.sessionParams as { messages: any[] } | null;

  const rawTemplate = asString(config.promptTemplate, DEFAULT_PAPERCLIP_AGENT_PROMPT_TEMPLATE);
  const templateData = {
    agentId: agent.id,
    companyId: agent.companyId,
    runId,
    company: { id: agent.companyId, name: "Company" },
    agent,
    run: { id: runId },
    context,
  };

  const renderedPrompt = renderTemplate(rawTemplate, templateData);
  const wakePrompt = renderPaperclipWakePrompt(context.paperclipWake, { resumedSession: Boolean(storedSession) });
  
  // Combine everything into a single system message for the first run, or append as needed
  const instructionsFilePath = asString(config.instructionsFilePath, "").trim();
  let instructions = "";
  if (instructionsFilePath) {
    try {
      instructions = await fs.readFile(instructionsFilePath, "utf-8");
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      await onLog(
        "stderr",
        `[paperclip] Warning: could not read agent instructions file "${instructionsFilePath}": ${reason}\n`,
      );
    }
  }

  const systemContent = joinPromptSections([
    instructions,
    wakePrompt,
    renderedPrompt,
  ]);

  // Session handling
  const messages = storedSession?.messages ? [...storedSession.messages] : [
    { role: "system", content: systemContent }
  ];

  // If resuming, we might want to append the wake prompt as a user message if it's not the first turn
  if (storedSession?.messages && wakePrompt) {
    messages.push({ role: "user", content: wakePrompt });
  }

  const meta: AdapterInvocationMeta = {
    adapterType: agent.adapterType || "ollama_local",
    cwd: process.cwd(),
    command: `Ollama API (model: ${model})`,
    env: redactEnvForLogs(process.env as Record<string, string>),
  };

  if (onMeta) {
    await onMeta(meta);
  }

  const payload = {
    model,
    messages,
    stream: true,
  };

  const abortController = new AbortController();
  let timedOut = false;
  let timer: NodeJS.Timeout | null = null;

  if (timeoutSec > 0) {
    timer = setTimeout(() => {
      timedOut = true;
      abortController.abort();
    }, timeoutSec * 1000);
  }

  await onLog("stdout", JSON.stringify({ type: "init", model }) + "\n");

  let fullResponse = "";
  let finalStats: any = null;
  let exitCode = 0;
  let errorMessage: string | null = null;

  try {
    const res = await fetch(`${apiUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: abortController.signal as any,
    });

    if (!res.ok) {
      exitCode = 1;
      errorMessage = `Ollama API error: ${res.status} ${res.statusText}`;
      const errText = await res.text().catch(() => "");
      await onLog("stderr", errText + "\n");
    } else if (res.body) {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        
        // chunk could be multiple JSON lines
        const lines = chunk.split("\n").filter(l => l.trim().length > 0);
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            if (parsed.message?.content) {
              fullResponse += parsed.message.content;
              await onLog("stdout", JSON.stringify({ type: "assistant", content: parsed.message.content }) + "\n");
            }
            if (parsed.done) {
              finalStats = parsed;
              await onLog("stdout", JSON.stringify({ type: "result", stats: parsed }) + "\n");
            }
          } catch (e) {
            await onLog("stderr", `Failed to parse chunk: ${line}\n`);
          }
        }
      }
    }
  } catch (err: any) {
    if (timedOut || err.name === "AbortError") {
      timedOut = true;
      exitCode = 124; // standard timeout exit code
      errorMessage = "Execution timed out";
    } else {
      exitCode = 1;
      errorMessage = err.message;
      await onLog("stderr", err.message + "\n");
    }
  } finally {
    if (timer) clearTimeout(timer);
  }

  if (fullResponse.length > 0) {
    messages.push({ role: "assistant", content: fullResponse });
  }

  const usage = finalStats ? {
    inputTokens: finalStats.prompt_eval_count || 0,
    outputTokens: finalStats.eval_count || 0,
  } : undefined;

  return {
    exitCode,
    signal: null,
    timedOut,
    errorMessage,
    usage,
    sessionParams: { messages },
    model,
    provider: "ollama",
    summary: fullResponse.length > 0 ? fullResponse : null,
  };
}
