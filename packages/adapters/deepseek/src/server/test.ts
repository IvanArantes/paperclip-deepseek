import type { AdapterEnvironmentTestContext, AdapterEnvironmentTestResult, AdapterEnvironmentCheck } from "@paperclipai/adapter-utils";
import { asString } from "@paperclipai/adapter-utils/server-utils";

export async function testEnvironment(ctx: AdapterEnvironmentTestContext): Promise<AdapterEnvironmentTestResult> {
  const { config } = ctx;
  const checks: AdapterEnvironmentCheck[] = [];
  const apiKey = asString(config.apiKey, "").trim();
  const apiUrl = asString(config.apiUrl, "https://api.deepseek.com").replace(/\/$/, "");
  const model = asString(config.model, "deepseek-chat");

  if (!apiKey) {
    checks.push({
      code: "missing_api_key",
      level: "error",
      message: "DeepSeek API Key is missing.",
      hint: "Add 'apiKey' to your agent configuration.",
    });
  } else {
    // Attempt a lightweight connectivity test
    try {
      const res = await fetch(`${apiUrl}/models`, {
        headers: { "Authorization": `Bearer ${apiKey}` },
      });
      if (res.ok) {
        checks.push({
          code: "api_connection_ok",
          level: "info",
          message: "Successfully connected to DeepSeek API.",
        });
      } else {
        const detail = await res.text().catch(() => "");
        checks.push({
          code: "api_connection_failed",
          level: "error",
          message: `Failed to connect to DeepSeek API: ${res.status} ${res.statusText}`,
          detail,
        });
      }
    } catch (err: any) {
      checks.push({
        code: "api_network_error",
        level: "error",
        message: `Network error connecting to DeepSeek API: ${err.message}`,
      });
    }
  }

  const hasError = checks.some((c) => c.level === "error");
  const hasWarn = checks.some((c) => c.level === "warn");

  return {
    adapterType: "deepseek",
    status: hasError ? "fail" : hasWarn ? "warn" : "pass",
    checks,
    testedAt: new Date().toISOString(),
  };
}
