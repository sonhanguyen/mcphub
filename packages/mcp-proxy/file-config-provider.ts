import { readFile } from "fs/promises";
import type {
  ConfigProvider,
  MCPSettings,
  FileConfigProviderOptions,
} from "./types";
import { substituteSecrets } from "./types";

export class FileConfigProvider implements ConfigProvider {
  constructor(private options: FileConfigProviderOptions) {}

  async load(): Promise<MCPSettings> {
    const configContent = await readFile(this.options.path, "utf-8");
    const config = JSON.parse(configContent) as MCPSettings;

    if (this.options.secretsPath) {
      const secretsContent = await readFile(this.options.secretsPath, "utf-8");
      config.secrets = JSON.parse(secretsContent);
    }

    return substituteSecrets(config);
  }
}
