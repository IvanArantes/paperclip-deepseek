export const type = "deepseek";
export const label = "DeepSeek (Cloud)";

export const models = [
  { id: "deepseek-chat", label: "DeepSeek Chat" },
  { id: "deepseek-reasoner", label: "DeepSeek Reasoner" },
  { id: "deepseek-v4-flash", label: "DeepSeek-V4-Flash" },
  { id: "deepseek-v4-pro", label: "DeepSeek-V4-Pro" },
];

export const agentConfigurationDoc = `# DeepSeek Agent Configuration

Adapter: deepseek

Use when:
- You want to use DeepSeek's cloud API (V4 series, deepseek-chat, or deepseek-reasoner).
- High-performance, low-cost LLM is required.
- DeepSeek-V4-Flash is needed for fast, cost-efficient agentic workflows.
- DeepSeek-V4-Pro or Reasoner is needed for complex planning or reasoning tasks.

Don't use when:
- You need to run a local model (use "ollama_local" instead).
- You are in an environment without internet access.

Core fields:
- apiKey (string, required): Your DeepSeek API key.
- model (string, optional): The model to use (e.g., deepseek-v4-flash, deepseek-chat).
- apiUrl (string, optional): Override the default API URL (https://api.deepseek.com).
- promptTemplate (string, optional): Custom instructions template.
`;
