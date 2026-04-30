export function buildAdapterConfig(values: any): Record<string, unknown> {
  const ac: Record<string, unknown> = {};
  
  if (values.apiUrl) ac.apiUrl = values.apiUrl;
  if (values.model) ac.model = values.model;
  if (values.promptTemplate) ac.promptTemplate = values.promptTemplate;
  
  // Convert strings to numbers if present
  if (values.timeoutSec !== undefined && values.timeoutSec !== "") {
    ac.timeoutSec = Number(values.timeoutSec);
  }
  if (values.graceSec !== undefined && values.graceSec !== "") {
    ac.graceSec = Number(values.graceSec);
  }

  return ac;
}
