import type { AdapterEnvironmentTestContext, AdapterEnvironmentTestResult } from "@paperclipai/adapter-utils";
import { asString } from "@paperclipai/adapter-utils/server-utils";

export async function testEnvironment(ctx: AdapterEnvironmentTestContext): Promise<AdapterEnvironmentTestResult> {
  const apiUrl = asString(ctx.config.apiUrl, "http://host.docker.internal:11434").replace(/\/$/, "");
  const checks: any[] = [];
  
  let status: "pass" | "warn" | "fail" = "pass";

  try {
    const res = await fetch(`${apiUrl}/api/tags`);
    if (res.ok) {
      checks.push({
        code: "OLLAMA_API_REACHABLE",
        level: "info",
        message: "Ollama API is reachable",
      });

      const data = await res.json() as any;
      const models = data?.models?.map((m: any) => m.name) || [];
      const configuredModel = asString(ctx.config.model, "llama3.2");

      if (!models.includes(configuredModel) && !models.includes(`${configuredModel}:latest`)) {
        checks.push({
          code: "OLLAMA_MODEL_MISSING",
          level: "warn",
          message: `Model '${configuredModel}' not found in local Ollama instance`,
          hint: `Run 'ollama pull ${configuredModel}' on your host machine.`,
        });
        status = "warn";
      } else {
        checks.push({
          code: "OLLAMA_MODEL_FOUND",
          level: "info",
          message: `Model '${configuredModel}' is available`,
        });
      }
    } else {
      checks.push({
        code: "OLLAMA_API_ERROR",
        level: "error",
        message: `Ollama API returned ${res.status}`,
      });
      status = "fail";
    }
  } catch (err: any) {
    checks.push({
      code: "OLLAMA_UNREACHABLE",
      level: "error",
      message: `Failed to connect to Ollama API at ${apiUrl}`,
      hint: `Ensure Ollama is running and accessible from the Paperclip container. Err: ${err.message}`,
    });
    status = "fail";
  }

  return {
    adapterType: ctx.adapterType,
    status,
    checks,
    testedAt: new Date().toISOString(),
  };
}
