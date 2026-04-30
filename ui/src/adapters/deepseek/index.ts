import type { UIAdapterModule } from "../types";
import { parseStdoutLine, buildConfig } from "@paperclipai/adapter-deepseek/ui";
import { DeepSeekConfigFields } from "./config-fields";

export const deepseekUIAdapter: UIAdapterModule = {
  type: "deepseek",
  label: "DeepSeek (Cloud)",
  parseStdoutLine,
  ConfigFields: DeepSeekConfigFields,
  buildAdapterConfig: buildConfig,
};
