import type { Tool, CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export type { Tool, CallToolResult };

export interface ToolProvider {
  getTools(): Tool[];
  callTool(
    name: string,
    args: Record<string, unknown>,
  ): Promise<CallToolResult>;
  start?(): Promise<void>;
  stop?(): Promise<void>;
}

export interface ConfigProvider {
  load(): Promise<MCPSettings>;
}

export interface StdioServerConfig {
  type: "stdio";
  command: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
}

export interface HttpServerConfig {
  type: "http";
  url: string;
  headers?: Record<string, string>;
}

export interface SSEServerConfig {
  type: "sse";
  url: string;
  headers?: Record<string, string>;
}

export type MCPServerConfig =
  | StdioServerConfig
  | HttpServerConfig
  | SSEServerConfig;

export interface MCPSettings {
  mcpServers: Record<string, MCPServerConfig>;
  secrets?: Record<string, string>;
}

export interface GitConfigProviderOptions {
  source: string;
  localPath: string;
  secretsFile?: string;
  sops?: {
    ageKeyFile?: string;
    ageKey?: string;
  };
}

export interface FileConfigProviderOptions {
  path: string;
  secretsPath?: string;
}

export function substituteSecrets(config: MCPSettings): MCPSettings {
  if (!config.secrets) {
    return config;
  }

  let configStr = JSON.stringify(config);

  for (const [key, value] of Object.entries(config.secrets)) {
    configStr = configStr.replace(new RegExp(`\\$\\{${key}\\}`, "g"), value);
  }

  const result = JSON.parse(configStr) as MCPSettings;
  delete result.secrets;
  return result;
}
