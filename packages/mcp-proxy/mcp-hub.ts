import { MCPAggregator } from "./aggregator"
import { MCPToolProvider } from "./mcp-tool-provider"
import { createGitConfigProvider } from "./config-provider"
import { createLogger } from "./logger"

const log = createLogger("mcp-hub")

const isMain =
  import.meta.url === `file://${process.argv[1]}` ||
  (typeof Bun !== "undefined" && import.meta.main)

if (isMain) {
  const configProvider = createGitConfigProvider({
    configSource:
      process.env.MCP_HUB_GIT_SOURCE || "https://github.com/example/config.git",
    secretsSource: process.env.MCP_HUB_SECRETS_FILE,
    localPath: process.env.MCP_HUB_LOCAL_PATH || "/tmp/mcp-config",
    sops:
      process.env.SOPS_AGE_KEY_FILE || process.env.SOPS_AGE_KEY
        ? {
            ageKeyFile: process.env.SOPS_AGE_KEY_FILE,
            ageKey: process.env.SOPS_AGE_KEY,
          }
        : undefined,
  })

  configProvider.onChange(async (config) => {
    log.info("config loaded from git")

    const toolProvider = new MCPToolProvider(config)
    const aggregator = new MCPAggregator(toolProvider, {
      name: "mcp-hub",
      version: "1.0.0",
    })

    await aggregator.start()
    log.info("server started")
  })
}

export { MCPAggregator, MCPToolProvider }
export { createGitConfigProvider, ConfigProvider } from "./config-provider"
