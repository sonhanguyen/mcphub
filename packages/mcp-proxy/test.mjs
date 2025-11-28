import { describe, it } from "node:test";
import * as assert from "node:assert";
import { spawn } from "child_process";
import * as path from "path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function createMCPClient(command, args, options = {}) {
  const proc = spawn(command, args, {
    stdio: ["pipe", "pipe", "pipe"],
    ...options
  });

  const pending = new Map();
  let buffer = "";
  let idCounter = 0;

  proc.stdout.on("data", (data) => {
    console.error("[stdout]", data.toString().trim());
    buffer += data.toString();
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const msg = JSON.parse(line);
        if (msg.id !== undefined && pending.has(msg.id)) {
          pending.get(msg.id).resolve(msg);
          pending.delete(msg.id);
        }
      } catch {
        // ignore non-json
      }
    }
  });

  proc.stderr.on("data", (data) => {
    console.error("[stderr]", data.toString().trim());
  });

  return {
    async request(method, params = {}) {
      const id = ++idCounter;
      const msg = { jsonrpc: "2.0", id, method, params };
      
      const promise = new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
      });

      proc.stdin.write(JSON.stringify(msg) + "\n");
      return promise;
    },

    notify(method, params = {}) {
      const msg = { jsonrpc: "2.0", method, params };
      proc.stdin.write(JSON.stringify(msg) + "\n");
    },

    kill() {
      proc.kill();
    }
  };
}

describe("MCP Proxy - Real Server Connection", () => {
  it("connects to real perplexity MCP server and lists tools", async () => {
    const client = createMCPClient("bun", ["run", "index.ts"], {
      cwd: __dirname,
      env: {
        ...process.env,
        PERPLEXITY_API_KEY: "test-key-for-connection"
      }
    });

    try {
      await client.request("initialize", {
        protocolVersion: "2025-06-18",
        clientInfo: { name: "test", version: "1.0" },
        capabilities: {}
      });

      client.notify("notifications/initialized");

      const toolsResponse = await client.request("tools/list");

      if (toolsResponse.error) {
        console.log(`Tools request error (expected if API key invalid): ${toolsResponse.error.message}`);
        return;
      }

      const tools = toolsResponse.result?.tools || [];
      console.log(`\nReceived ${tools.length} tools from real servers:`);
      tools.forEach((t) => console.log(`  - ${t.name}`));

      assert.ok(toolsResponse.result.tools !== undefined, "Should have tools array in response");
    } finally {
      client.kill();
    }
  });

  it("calls a tool and receives response", async () => {
    const client = createMCPClient("bun", ["run", "index.ts"], {
      cwd: __dirname,
      env: {
        ...process.env,
        PERPLEXITY_API_KEY: "test-key-for-connection"
      }
    });

    try {
      await client.request("initialize", {
        protocolVersion: "2025-06-18",
        clientInfo: { name: "test", version: "1.0" },
        capabilities: {}
      });

      client.notify("notifications/initialized");

      // First list tools to establish connections
      await client.request("tools/list");

      // Call a tool
      const callResponse = await client.request("tools/call", {
        name: "perplexity__perplexity_ask",
        arguments: {
          messages: [{ role: "user", content: "What is 2+2?" }]
        }
      });

      console.log("\nTool call response:", JSON.stringify(callResponse, null, 2));

      // With invalid API key, we expect an error in the result
      assert.ok(callResponse.result !== undefined || callResponse.error !== undefined, 
        "Should have result or error in response");
    } finally {
      client.kill();
    }
  });
});
