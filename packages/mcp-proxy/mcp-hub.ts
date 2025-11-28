import { MCPAggregator } from "./aggregator";
import { MCPToolProvider } from "./mcp-tool-provider";
import { GitConfigProvider } from "./git-provisioner";
import { createLogger } from "./logger";

const log = createLogger("mcp-hub");

const isMain =
  import.meta.url === `file://${process.argv[1]}` ||
  (typeof Bun !== "undefined" && import.meta.main);

if (isMain) {
  const configProvider = new GitConfigProvider({
    source:
      process.env.MCP_HUB_GIT_SOURCE || "https://github.com/example/config.git",
    localPath: process.env.MCP_HUB_LOCAL_PATH || "/tmp/mcp-config",
    secretsFile: process.env.MCP_HUB_SECRETS_FILE,
    sops:
      process.env.SOPS_AGE_KEY_FILE || process.env.SOPS_AGE_KEY
        ? {
            ageKeyFile: process.env.SOPS_AGE_KEY_FILE,
            ageKey: process.env.SOPS_AGE_KEY,
          }
        : undefined,
  });

  const config = await configProvider.load();
  log.info("config loaded from git");

  const toolProvider = new MCPToolProvider(config);
  const aggregator = new MCPAggregator(toolProvider, {
    name: "mcp-hub",
    version: "1.0.0",
  });

  await aggregator.start();
  log.info("server started");
}

export { MCPAggregator, MCPToolProvider, GitConfigProvider };
