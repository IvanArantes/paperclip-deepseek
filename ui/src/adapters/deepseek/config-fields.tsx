import React from "react";
import type { AdapterConfigFieldsProps } from "../types";

export const DeepSeekConfigFields: React.FC<AdapterConfigFieldsProps> = (props) => {
  const { mode } = props;

  const apiKey = mode === "create" 
    ? (props.values as any)?.apiKey 
    : props.eff("adapterConfig", "apiKey", "");

  const apiUrl = mode === "create" 
    ? (props.values as any)?.apiUrl 
    : props.eff("adapterConfig", "apiUrl", "https://api.deepseek.com");
    
  const model = mode === "create" 
    ? props.values?.model 
    : props.eff("adapterConfig", "model", "deepseek-chat");
    
  const promptTemplate = mode === "create" 
    ? props.values?.promptTemplate 
    : props.eff("adapterConfig", "promptTemplate", "");

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (mode === "create") {
      (props.set as any)?.({ apiKey: e.target.value });
    } else {
      props.mark("adapterConfig", "apiKey", e.target.value);
    }
  };

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
        <label className="text-sm font-medium text-white">API Key</label>
        <input 
          type="password" 
          value={apiKey as string || ""} 
          onChange={handleApiKeyChange} 
          placeholder="sk-..."
          className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm w-full font-mono"
        />
        <div className="text-xs text-gray-400 mt-1">Your DeepSeek API Key.</div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-white">API URL</label>
        <input 
          type="text" 
          value={apiUrl as string || ""} 
          onChange={handleApiUrlChange} 
          placeholder="https://api.deepseek.com"
          className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm w-full font-mono"
        />
        <div className="text-xs text-gray-400 mt-1">DeepSeek API URL (default: https://api.deepseek.com).</div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-white">Model</label>
        <input 
          type="text" 
          value={model as string || ""} 
          onChange={handleModelChange} 
          placeholder="deepseek-chat"
          className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm w-full font-mono"
        />
        <div className="text-xs text-gray-400 mt-1">Model name (e.g., deepseek-chat, deepseek-reasoner).</div>
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
