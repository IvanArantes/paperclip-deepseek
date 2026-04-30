import fs from "node:fs/promises";
import path from "node:path";
import type { AdapterExecutionContext, AdapterExecutionResult, AdapterInvocationMeta } from "@paperclipai/adapter-utils";
import { 
  asNumber, 
  asString, 
  renderTemplate, 
  DEFAULT_PAPERCLIP_AGENT_PROMPT_TEMPLATE, 
  redactEnvForLogs, 
  joinPromptSections, 
  renderPaperclipWakePrompt,
  readPaperclipRuntimeSkillEntries,
  resolvePaperclipDesiredSkillNames,
  parseObject,
  buildPaperclipEnv,
  runChildProcess,
  ensurePathInEnv
} from "@paperclipai/adapter-utils/server-utils";
import { fileURLToPath } from "node:url";
import { isOllamaUnknownSessionError, parseOllamaOutput } from "./parse.js";

const __moduleDir = path.dirname(fileURLToPath(import.meta.url));

function extractShellCommands(text: string): string[] {
  const matches = text.matchAll(/```(?:sh|bash|shell)\r?\n([\s\S]*?)```/g);
  return Array.from(matches).map(m => m[1].trim());
}

export async function execute(ctx: AdapterExecutionContext): Promise<AdapterExecutionResult> {
  const { runId, agent, runtime, config, context, onLog, onMeta, onSpawn, authToken } = ctx;

  const apiUrl = asString(config.apiUrl, "http://host.docker.internal:11434").replace(/\/$/, "");
  const model = asString(config.model, "llama3.2");
  const timeoutSec = asNumber(config.timeoutSec, 0);

  const workspaceContext = parseObject(context.paperclipWorkspace);
  const workspaceCwd = asString(workspaceContext.cwd, "");
  const configuredCwd = asString(config.cwd, "");
  const cwd = workspaceCwd || configuredCwd || process.cwd();

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

  // Skills injection & Path setup
  let skillsDocumentation = "";
  const skillBinDirs: string[] = [];
  try {
    const availableSkills = await readPaperclipRuntimeSkillEntries(config, __moduleDir);
    const desiredSkillNames = resolvePaperclipDesiredSkillNames(config, availableSkills);
    const activeSkills = availableSkills.filter(s => desiredSkillNames.includes(s.key));
    
    if (activeSkills.length > 0) {
      const skillDocs = await Promise.all(activeSkills.map(async (s) => {
        const binPath = path.join(s.source, "bin");
        try {
          await fs.access(binPath);
          skillBinDirs.push(binPath);
        } catch {}

        try {
          const content = await fs.readFile(path.join(s.source, "SKILL.md"), "utf-8");
          return `### Skill: ${s.runtimeName}\n\n${content}`;
        } catch (e) {
          return "";
        }
      }));
      skillsDocumentation = "## Available Skills\n\nYou have the following skills (tools) available. To use them, follow the instructions in their documentation below.\n\n" + skillDocs.filter(Boolean).join("\n\n");
    }
  } catch (err) {
    await onLog("stderr", `[paperclip] Warning: could not load skills: ${err}\n`);
  }

  // Environment setup for tool execution
  const env: Record<string, string> = { 
    ...buildPaperclipEnv(agent),
    PAPERCLIP_RUN_ID: runId,
  };
  if (authToken) {
    env.PAPERCLIP_API_KEY = authToken;
  }
  if (context.paperclipApiUrl) {
    env.PAPERCLIP_API_URL = String(context.paperclipApiUrl);
  }

  const mergedEnv = ensurePathInEnv({ ...process.env, ...env });
  const pathKey = mergedEnv.Path !== undefined ? "Path" : "PATH";
  const basePath = mergedEnv[pathKey] ?? "";
  if (skillBinDirs.length > 0) {
    mergedEnv[pathKey] = [...skillBinDirs, basePath].filter(Boolean).join(path.delimiter);
  }

  const systemContent = joinPromptSections([
    instructions,
    skillsDocumentation,
    wakePrompt,
    renderedPrompt,
  ]);

  // Session handling
  const messages = storedSession?.messages ? [...storedSession.messages] : [
    { role: "system", content: systemContent }
  ];

  if (!storedSession) {
    messages.push({ role: "user", content: "Begin." });
  } else if (wakePrompt) {
    messages.push({ role: "user", content: wakePrompt });
  }

  let exitCode = 0;
  let timedOut = false;
  let errorMessage: string | null = null;
  let totalUsage: { inputTokens: number; outputTokens: number } = { inputTokens: 0, outputTokens: 0 };
  let turn = 0;
  const maxTurns = 10;
  let finalResponse = "";

  const controller = new AbortController();
  const timer = timeoutSec > 0 ? setTimeout(() => controller.abort(), timeoutSec * 1000) : null;

  try {
    while (turn < maxTurns) {
      turn++;
      let turnResponse = "";
      
      const res = await fetch(`${apiUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages,
          stream: true,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        exitCode = 1;
        errorMessage = `Ollama API error: ${res.status} ${res.statusText}`;
        const errText = await res.text().catch(() => "");
        await onLog("stderr", errText + "\n");
        break;
      }

      if (res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n").filter(l => l.trim().length > 0);
          for (const line of lines) {
            try {
              const parsed = JSON.parse(line);
              if (parsed.message?.content) {
                turnResponse += parsed.message.content;
                await onLog("stdout", JSON.stringify({ type: "assistant", content: parsed.message.content }) + "\n");
              }
              if (parsed.done) {
                totalUsage.inputTokens += parsed.prompt_eval_count || 0;
                totalUsage.outputTokens += parsed.eval_count || 0;
              }
            } catch (e) {}
          }
        }
      }

      messages.push({ role: "assistant", content: turnResponse });
      finalResponse = turnResponse;

      // Tool detection
      const commands = extractShellCommands(turnResponse);
      if (commands.length === 0) break;

      for (const cmd of commands) {
        await onLog("stdout", `\n[paperclip] Executing skill command...\n`);
        const result = await runChildProcess(runId, "sh", ["-c", cmd], {
          cwd,
          env: mergedEnv as Record<string, string>,
          timeoutSec: timeoutSec > 0 ? timeoutSec : 300,
          graceSec: 10,
          onLog: async (stream: "stdout" | "stderr", chunk: string) => {
            await onLog(stream, chunk);
          },
          onSpawn
        });

        const output = `Command exited with code ${result.exitCode}.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`;
        messages.push({ role: "user", content: `TOOL_OUTPUT:\n${output}` });
        await onLog("stdout", `\n[paperclip] Command finished (exit code ${result.exitCode}).\n`);
      }
    }
  } catch (err: any) {
    if (controller.signal.aborted) {
      timedOut = true;
      exitCode = 124;
      errorMessage = "Execution timed out";
    } else {
      exitCode = 1;
      errorMessage = err.message;
      await onLog("stderr", err.message + "\n");
    }
  } finally {
    if (timer) clearTimeout(timer);
  }

  const usage = totalUsage.inputTokens > 0 ? totalUsage : undefined;

  return {
    exitCode,
    signal: null,
    timedOut,
    errorMessage,
    usage,
    sessionParams: { messages },
    model,
    provider: "ollama",
    summary: finalResponse.length > 0 ? finalResponse : null,
  };
}
