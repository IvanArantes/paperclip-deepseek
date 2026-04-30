export const type = "ollama_local";
export const label = "Ollama (local)";

export const models = [
  { id: "llama3.2", label: "llama3.2" },
  { id: "phi3", label: "phi3" },
  { id: "mistral", label: "mistral" },
  { id: "qwen2.5", label: "qwen2.5" }
];

export const agentConfigurationDoc = `# ollama_local agent configuration

Adapter: ollama_local

Use when:
- The agent needs to run against a local or private Ollama instance.
- You need a cost-effective, local inference agent.

Don't use when:
- You need the absolute highest reasoning capabilities (use claude_local or cursor).

Core fields:
- apiUrl (string, optional): HTTP URL of the Ollama API. Defaults to http://host.docker.internal:11434.
- model (string, required): The name of the model to run (e.g. llama3.2).
- promptTemplate (string, optional): Custom system prompt.
- timeoutSec (number, optional): Max execution time in seconds.
- graceSec (number, optional): Grace period for shutdown.
`;
