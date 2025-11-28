import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import {
  ListToolsResultSchema,
  CompatibilityCallToolResultSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type { Tool, CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ToolProvider, MCPSettings, MCPServerConfig } from "./types";
import { createLogger } from "./logger";

const log = createLogger("MCPToolProvider");

interface ConnectedClient {
  client: Client;
  name: string;
  originalToolNames: Set<string>;
  cleanup: () => Promise<void>;
}

export class MCPToolProvider implements ToolProvider {
  private clients = new Map<string, ConnectedClient>();
  private tools: Tool[] = [];

  constructor(private config: MCPSettings) {}

  async start(): Promise<void> {
    const allTools: Tool[] = [];

    for (const [serverName, serverConfig] of Object.entries(
      this.config.mcpServers,
    )) {
      try {
        const { client, tools, cleanup } = await this.connectToServer(
          serverName,
          serverConfig,
        );

        this.clients.set(serverName, {
          client,
          name: serverName,
          originalToolNames: new Set(tools.map((t) => t.name)),
          cleanup,
        });

        const prefixedTools = tools.map((tool) => ({
          ...tool,
          name: `${serverName}__${tool.name}`,
        }));

        allTools.push(...prefixedTools);
        log.info(
          { server: serverName, toolCount: tools.length },
          "connected to server",
        );
      } catch (error) {
        log.error({ server: serverName, error }, "failed to connect to server");
      }
    }

    this.tools = allTools;
    log.info({ totalTools: this.tools.length }, "tools loaded");
  }

  getTools(): Tool[] {
    return this.tools;
  }

  async callTool(
    prefixedName: string,
    args: Record<string, unknown>,
  ): Promise<CallToolResult> {
    const separatorIndex = prefixedName.indexOf("__");
    if (separatorIndex === -1) {
      throw new Error(
        `Invalid tool name format: ${prefixedName}. Expected: serverName__toolName`,
      );
    }

    const serverName = prefixedName.slice(0, separatorIndex);
    const originalToolName = prefixedName.slice(separatorIndex + 2);

    const clientInfo = this.clients.get(serverName);
    if (!clientInfo) {
      throw new Error(`Server not found: ${serverName}`);
    }

    if (!clientInfo.originalToolNames.has(originalToolName)) {
      throw new Error(
        `Tool "${originalToolName}" not found in server "${serverName}"`,
      );
    }

    log.debug({ server: serverName, tool: originalToolName }, "calling tool");

    const result = await clientInfo.client.request(
      {
        method: "tools/call",
        params: {
          name: originalToolName,
          arguments: args,
        },
      },
      CompatibilityCallToolResultSchema,
    );

    // Handle both old (toolResult) and new (content) response formats for backwards compatibility
    if ("content" in result) {
      return result as CallToolResult;
    }

    if ("toolResult" in result) {
      return {
        content: [
          {
            type: "text",
            text:
              typeof result.toolResult === "string"
                ? result.toolResult
                : JSON.stringify(result.toolResult),
          },
        ],
      };
    }

    return {
      content: [{ type: "text", text: JSON.stringify(result) }],
    };
  }

  async stop(): Promise<void> {
    const cleanupPromises = Array.from(this.clients.values()).map(
      async ({ name, cleanup }) => {
        try {
          await cleanup();
          log.debug({ server: name }, "disconnected");
        } catch (error) {
          log.error({ server: name, error }, "error disconnecting");
        }
      },
    );

    await Promise.all(cleanupPromises);
    this.clients.clear();
    this.tools = [];
  }

  private async connectToServer(
    serverName: string,
    config: MCPServerConfig,
  ): Promise<{ client: Client; tools: Tool[]; cleanup: () => Promise<void> }> {
    if (config.type === "http") {
      throw new Error(`HTTP transport not yet supported for ${serverName}`);
    }

    let transport: StdioClientTransport | SSEClientTransport;

    if (config.type === "sse") {
      transport = new SSEClientTransport(new URL(config.url));
    } else {
      transport = new StdioClientTransport({
        command: config.command,
        args: config.args,
        env: this.resolveEnv(config.env),
        cwd: config.cwd,
      });
    }

    const client = new Client(
      { name: "mcp-proxy", version: "1.0.0" },
      { capabilities: {} },
    );

    await client.connect(transport);

    const response = await client.request(
      { method: "tools/list", params: {} },
      ListToolsResultSchema,
    );

    return {
      client,
      tools: response.tools || [],
      cleanup: async () => {
        await transport.close();
      },
    };
  }

  private resolveEnv(env?: Record<string, string>): Record<string, string> {
    const baseEnv: Record<string, string> = {};

    for (const [key, value] of Object.entries(process.env)) {
      if (value !== undefined) {
        baseEnv[key] = value;
      }
    }

    if (env) {
      for (const [key, value] of Object.entries(env)) {
        baseEnv[key] = value;
      }
    }

    return baseEnv;
  }
}
