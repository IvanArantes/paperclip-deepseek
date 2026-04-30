export function isOllamaUnknownSessionError(resultJson: Record<string, unknown> | null): boolean {
  // Since session messages are passed in full to the REST API, 
  // there's no concept of an expired remote session like with Claude or Codex.
  return false;
}

export function parseOllamaOutput(stdout: string) {
  // Not strictly used since execute.ts parses the streaming JSON directly,
  // but provided to match adapter module structure.
  return {
    unknownSession: false,
    errorMessage: null,
  };
}
