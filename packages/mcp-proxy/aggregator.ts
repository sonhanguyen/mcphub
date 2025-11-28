import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type { ToolProvider } from "./types";
import { createLogger } from "./logger";

const log = createLogger("MCPAggregator");

export interface AggregatorOptions {
  name?: string;
  version?: string;
}

export class MCPAggregator {
  private server: Server;
  private started = false;

  constructor(
    private toolProvider: ToolProvider,
    options: AggregatorOptions = {},
  ) {
    this.server = new Server(
      {
        name: options.name ?? "mcp-aggregator",
        version: options.version ?? "1.0.0",
      },
      {
        capabilities: { tools: {} },
      },
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return { tools: this.toolProvider.getTools() };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      return await this.toolProvider.callTool(name, args || {});
    });
  }

  async start(): Promise<void> {
    if (this.started) return;

    if (this.toolProvider.start) {
      await this.toolProvider.start();
    }

    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    this.started = true;

    const shutdown = async () => {
      await this.stop();
      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  }

  async stop(): Promise<void> {
    if (!this.started) return;

    if (this.toolProvider.stop) {
      await this.toolProvider.stop();
    }
    await this.server.close();
    this.started = false;
  }
}
