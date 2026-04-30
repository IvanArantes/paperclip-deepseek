import React from "react";
import type { AdapterConfigFieldsProps } from "../types";

export const OllamaLocalConfigFields: React.FC<AdapterConfigFieldsProps> = (props) => {
  const { mode } = props;

  const apiUrl = mode === "create" 
    ? (props.values as any)?.apiUrl 
    : props.eff("adapterConfig", "apiUrl", "");
    
  const model = mode === "create" 
    ? props.values?.model 
    : props.eff("adapterConfig", "model", "");
    
  const promptTemplate = mode === "create" 
    ? props.values?.promptTemplate 
    : props.eff("adapterConfig", "promptTemplate", "");

  const handleApiUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (mode === "create") {
      (props.set as any)?.({ apiUrl: e.target.value });
    } else {
      props.mark("adapterConfig", "apiUrl", e.target.value);
    }
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (mode === "create") {
      props.set?.({ model: e.target.value });
    } else {
      props.mark("adapterConfig", "model", e.target.value);
    }
  };

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (mode === "create") {
      props.set?.({ promptTemplate: e.target.value });
    } else {
      props.mark("adapterConfig", "promptTemplate", e.target.value);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-white">API URL</label>
        <input 
          type="text" 
          value={apiUrl as string || ""} 
          onChange={handleApiUrlChange} 
          placeholder="http://host.docker.internal:11434"
          className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm w-full font-mono"
        />
        <div className="text-xs text-gray-400 mt-1">Ollama API URL (default: http://host.docker.internal:11434).</div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-white">Model</label>
        <input 
          type="text" 
          value={model as string || ""} 
          onChange={handleModelChange} 
          placeholder="llama3.2"
          className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm w-full font-mono"
        />
        <div className="text-xs text-gray-400 mt-1">Model name installed in Ollama.</div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-white">Prompt Template</label>
        <textarea 
          value={promptTemplate as string || ""} 
          onChange={handlePromptChange} 
          rows={5}
          className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm w-full font-mono"
          placeholder="You are an AI assistant..."
        />
      </div>
    </div>
  );
};
