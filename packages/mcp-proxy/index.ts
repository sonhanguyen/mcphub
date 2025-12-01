import * as fs from "fs"
import * as path from "path"
import { MCPAggregator } from "./aggregator"
import { MCPToolProvider } from "./mcp-tool-provider"
import { FileProvider } from "./file-provider"
import type { MCPSettings } from "./types"
import { createLogger } from "./logger"

const log = createLogger("mcp-proxy")

function findConfigPath(): string | null {
  const searchPaths = [
    path.resolve(process.cwd(), "packages/mcp-servers/mcp.json"),
    path.resolve(process.cwd(), "../mcp-servers/mcp.json"),
    path.resolve(process.cwd(), "mcp.json"),
  ]

  for (const configPath of searchPaths) {
    if (fs.existsSync(configPath)) {
      return configPath
    }
  }

  return null
}

const isMain =
  import.meta.url === `file://${process.argv[1]}` ||
  (typeof Bun !== "undefined" && import.meta.main)

if (isMain) {
  const configPath = findConfigPath()
  if (!configPath) {
    log.error("no config file found")
    process.exit(1)
  }

  log.info({ path: configPath }, "using config")

  const configProvider = new FileProvider<MCPSettings>(configPath)
  configProvider.onChange(async (config) => {
    const toolProvider = new MCPToolProvider(config)
    const aggregator = new MCPAggregator(toolProvider, {
      name: "mcp-proxy",
      version: "0.1.0",
    })

    await aggregator.start()
    log.info("server started")
  })
}

export { MCPAggregator } from "./aggregator"
export { MCPToolProvider } from "./mcp-tool-provider"
export { FileProvider } from "./file-provider"
export { GitProvider } from "./git-provider"
export { ConfigProvider, createGitConfigProvider } from "./config-provider"
export * from "./types"
