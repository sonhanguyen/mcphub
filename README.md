# MCP Proxy

An MCP (Model Context Protocol) aggregator server that combines multiple MCP servers into a single unified interface.

## Architecture

```mermaid
flowchart TB
    subgraph Clients["MCP Clients"]
        C1[Claude Desktop]
        C2[Other MCP Clients]
    end

    subgraph MCPProxy["MCP Proxy"]
        AGG[MCPAggregator<br/>stdio server]
        TP[MCPToolProvider<br/>tool aggregation]
        
        subgraph ConfigProviders["Config Providers"]
            FP[FileProvider<br/>local JSON]
            GP[GitProvider<br/>remote git + SOPS]
            CP[ConfigProvider<br/>secrets injection]
        end
    end

    subgraph MCPServers["Upstream MCP Servers"]
        S1[Server A<br/>stdio]
        S2[Server B<br/>stdio]
        S3[Server C<br/>SSE]
    end

    C1 --> AGG
    C2 --> AGG
    AGG --> TP
    TP --> S1
    TP --> S2
    TP --> S3
    
    FP --> TP
    GP --> CP
    CP --> TP
```

## Key Components

| Component | Description |
|-----------|-------------|
| **MCPAggregator** | MCP server that exposes aggregated tools via stdio transport |
| **MCPToolProvider** | Connects to multiple upstream MCP servers and aggregates their tools |
| **FileProvider** | Loads configuration from a local JSON file |
| **GitProvider** | Loads configuration from a git repository with SOPS decryption support |
| **ConfigProvider** | Combines config and secrets providers with variable substitution |

## Modes

- **mcp-proxy** - Local mode using `FileProvider` for configuration
- **mcp-hub** - Remote mode using `GitProvider` for git-based configuration with SOPS secrets

## Installation

```bash
npm install @mcphub/mcp-proxy
```

## Usage

### Local Mode (mcp-proxy)

```bash
# Uses mcp.json from current directory
npx mcp-proxy
```

### Hub Mode (mcp-hub)

```bash
export MCP_HUB_GIT_SOURCE="https://github.com/org/config.git#main:mcp.json"
export MCP_HUB_SECRETS_FILE="secrets.enc.json"
export SOPS_AGE_KEY_FILE="/path/to/age.key"

npx mcp-hub
```

## Configuration

```json
{
  "mcpServers": {
    "filesystem": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"]
    },
    "remote": {
      "type": "sse",
      "url": "http://localhost:3000/sse"
    }
  },
  "secrets": {
    "API_KEY": "sk-xxx"
  }
}
```

## License

MIT
