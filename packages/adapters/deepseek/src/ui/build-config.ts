export function buildDeepSeekConfig(values: any): Record<string, unknown> {
  const config: Record<string, unknown> = {};
  if (values.apiKey) config.apiKey = values.apiKey;
  if (values.model) config.model = values.model;
  if (values.apiUrl) config.apiUrl = values.apiUrl;
  if (values.promptTemplate) config.promptTemplate = values.promptTemplate;
  if (values.instructionsFilePath) config.instructionsFilePath = values.instructionsFilePath;
  
  config.timeoutSec = values.timeoutSec || 0;
  return config;
}
