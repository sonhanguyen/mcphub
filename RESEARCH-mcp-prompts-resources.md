# Research: MCP Prompts and Resources Support

## Goal
Add prompts and resources support to mcp-proxy, following the existing ToolProvider pattern.

## Sources
- https://modelcontextprotocol.io/specification/2025-03-26/server/prompts
- https://mcpcat.io/guides/understanding-json-rpc-protocol-mcp/
- https://portkey.ai/blog/mcp-message-types-complete-json-rpc-reference-guide
- https://workos.com/blog/mcp-features-guide

---

## Prompts

### Overview
Prompts are predefined instruction templates that servers provide to clients. They are explicitly user-controlled (e.g., triggered via slash commands) and can be parameterized with arguments.

### Capability Declaration
```json
{
  "capabilities": {
    "prompts": {
      "listChanged": true
    }
  }
}
```

### JSON-RPC Methods

#### `prompts/list`
Lists available prompts with pagination support.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "prompts/list",
  "params": {
    "cursor": "optional-cursor"
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "prompts": [
      {
        "name": "code_review",
        "description": "Asks the LLM to analyze code quality and suggest improvements",
        "arguments": [
          {
            "name": "code",
            "description": "The code to review",
            "required": true
          }
        ]
      }
    ],
    "nextCursor": "next-page-cursor"
  }
}
```

#### `prompts/get`
Retrieves a specific prompt with arguments filled in.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "prompts/get",
  "params": {
    "name": "code_review",
    "arguments": {
      "code": "def hello():\n  print('world')"
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "description": "Code review prompt",
    "messages": [
      {
        "role": "user",
        "content": {
          "type": "text",
          "text": "Please review this Python code:\ndef hello():\n  print('world')"
        }
      }
    ]
  }
}
```

### Notification
When the list of prompts changes:
```json
{
  "jsonrpc": "2.0",
  "method": "notifications/prompts/list_changed"
}
```

### SDK Types (from @modelcontextprotocol/sdk)
- `Prompt` - prompt metadata (name, description, arguments)
- `PromptArgument` - argument definition (name, description, required)
- `PromptMessage` - message in prompt result (role, content)
- `ListPromptsRequestSchema` - schema for list request
- `ListPromptsResultSchema` - schema for list response
- `GetPromptRequestSchema` - schema for get request
- `GetPromptResultSchema` - schema for get response
- `PromptListChangedNotificationSchema` - schema for change notification

---

## Resources

### Overview
Resources represent structured data sources identified by URIs. They can be static files, dynamic data, or templated URIs. Reading resources should be idempotent and side-effect free.

### Capability Declaration
```json
{
  "capabilities": {
    "resources": {
      "listChanged": true,
      "subscribe": true
    }
  }
}
```

### JSON-RPC Methods

#### `resources/list`
Lists available resources with pagination.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "resources/list",
  "params": {
    "cursor": null
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "resources": [
      {
        "uri": "file:///config.json",
        "name": "Application Config",
        "description": "Main configuration file",
        "mimeType": "application/json"
      }
    ],
    "nextCursor": null
  }
}
```

#### `resources/read`
Reads the contents of a resource by URI.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "resources/read",
  "params": {
    "uri": "file:///config.json"
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "contents": [
      {
        "uri": "file:///config.json",
        "mimeType": "application/json",
        "text": "{\"debug\": true, \"port\": 3000}"
      }
    ]
  }
}
```

#### `resources/templates/list`
Lists resource templates (URI patterns with placeholders).

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "resources/templates/list",
  "params": {}
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "resourceTemplates": [
      {
        "uriTemplate": "file:///{path}",
        "name": "File Access",
        "description": "Read any file by path"
      }
    ]
  }
}
```

### Notifications

**List changed:**
```json
{
  "jsonrpc": "2.0",
  "method": "notifications/resources/list_changed"
}
```

**Resource updated:**
```json
{
  "jsonrpc": "2.0",
  "method": "notifications/resources/updated",
  "params": {
    "uri": "file:///config.json"
  }
}
```

### SDK Types (from @modelcontextprotocol/sdk)
- `Resource` - resource metadata (uri, name, description, mimeType)
- `ResourceTemplate` - template definition (uriTemplate, name, description)
- `ResourceContents` - base content type
- `TextResourceContents` - text content (uri, mimeType, text)
- `BlobResourceContents` - binary content (uri, mimeType, blob as base64)
- `ListResourcesRequestSchema` - schema for list request
- `ListResourcesResultSchema` - schema for list response
- `ListResourceTemplatesRequestSchema` - schema for templates list request
- `ListResourceTemplatesResultSchema` - schema for templates list response
- `ReadResourceRequestSchema` - schema for read request
- `ReadResourceResultSchema` - schema for read response
- `ResourceListChangedNotificationSchema` - schema for list change notification
- `ResourceUpdatedNotificationSchema` - schema for update notification

---

## Implementation Plan

### Priority 1: Authorization (HTTP Transports) ✅ NEXT
**Rationale**: All clients support HTTP/SSE transports with OAuth. This is a critical blocker for remote MCP server adoption.

**Implementation**:
- OAuth 2.1 with PKCE for public clients
- Bearer token support (already common in clients)
- Authorization Server Metadata Discovery (RFC8414)
- Dynamic Client Registration (RFC7591)
- Token storage and refresh

**Client Evidence**:
- Claude Code: OAuth2 (not yet in-client, but documented)
- Gemini CLI: Full OAuth 2.0 with automatic discovery, dynamic registration, browser auth
- Codex CLI: Bearer tokens + OAuth (requires `rmcp_client` feature flag)

---

### Priority 2: Resources
**Rationale**: 50%+ adoption, high value for data access patterns.

Add new provider interfaces following ToolProvider pattern:

```typescript
// Resource types  
export type { Resource, ResourceTemplate, ReadResourceResult } from "@modelcontextprotocol/sdk/types.js";

export interface ResourceProvider {
  getResources(): Resource[];
  getResourceTemplates?(): ResourceTemplate[];
  readResource(uri: string): Promise<ReadResourceResult>;
  start?(): Promise<void>;
  stop?(): Promise<void>;
}
```

**Updates needed**:
- Update `aggregator.ts` to accept optional `resourceProvider`
- Dynamically build capabilities based on which providers are supplied
- Register handlers for `resources/list`, `resources/read`, `resources/templates/list`
- Update `mcp-tool-provider.ts` to aggregate resources with URI namespacing

---

### Priority 3: Prompts
**Rationale**: 25% adoption, but Gemini CLI shows high value (slash commands pattern).

Add new provider interfaces following ToolProvider pattern:

```typescript
// Prompt types
export type { Prompt, GetPromptResult } from "@modelcontextprotocol/sdk/types.js";

export interface PromptProvider {
  getPrompts(): Prompt[];
  getPrompt(name: string, args?: Record<string, string>): Promise<GetPromptResult>;
  start?(): Promise<void>;
  stop?(): Promise<void>;
}
```

**Updates needed**:
- Update `aggregator.ts` to accept optional `promptProvider`
- Register handlers for `prompts/list`, `prompts/get`
- Update `mcp-tool-provider.ts` to aggregate prompts with namespacing

---

### Priority 4: Logging (Optional)
**Rationale**: Useful for debugging aggregated servers, low client value.

**Implementation**:
- Aggregate logs from upstream servers with namespacing
- `logging/setLevel` - client sets minimum log level
- `notifications/message` - server sends log messages
- 8 syslog levels: debug, info, notice, warning, error, critical, alert, emergency

---

### Priority 5: Completion (Optional)
**Rationale**: Useful for autocomplete, moderate complexity.

**Implementation**:
- Aggregate completions from upstream servers with namespacing
- `completion/complete` - get suggestions for argument values
- Supports prompts (`ref/prompt`) and resources (`ref/resource`)

---

### Deferred: Sampling, Roots, Progress, Cancellation
**Rationale**: 0% client adoption, high complexity.

- **Sampling**: Complex, requires LLM integration
- **Roots**: Client feature, not applicable for proxy
- **Progress**: Pass-through only, no aggregation needed
- **Cancellation**: Pass-through only, request ID mapping needed

---

## Missing Capabilities (Not Yet Documented)

### Session Management - ✅ ALREADY PART OF BASE PROTOCOL

**Status**: Session management is a **core component** of MCP, not a missing capability. It's part of "Lifecycle Management" in the base protocol.

**Key Points**:
- MCP provides a **stateful session protocol** focused on context exchange
- Each client maintains **one stateful session per server** (1:1 relationship)
- Sessions begin with `initialize` request (capability negotiation) and `initialized` notification
- Sessions maintain: unique message ID namespace, negotiated capabilities, protocol version
- Sessions end explicitly (termination) or implicitly (invalidation)

**Protocol-Level Sessions (SEP-1359)**:
- Optional `sessionId` field in `InitializeResult` (servers MAY assign)
- Optional `sessionTimeout` field (advisory idle timeout in seconds)
- Session IDs identify conversation context only - **NOT for authentication**
- Sessions MUST NOT bypass authorization - every request must include auth credentials
- Session IDs SHOULD be bound to users (derived from auth token, not client-provided)

**For mcp-proxy**:
- Sessions are **already handled** by the base MCP protocol implementation
- Each upstream server connection has its own session
- No additional implementation needed - this is transport-level concern
- Session IDs (if used) should be passed through transparently

**Sources**:
- https://modelcontextprotocol.io/specification/2025-03-26 (Base Protocol)
- https://github.com/modelcontextprotocol/modelcontextprotocol/issues/1359 (SEP-1359)
- https://deepwiki.com/modelcontextprotocol/java-sdk/5.1-http-sse-transport

---

### 1. Authorization (OAuth 2.1)
**Status**: HTTP transports only, STDIO should use environment credentials
- OAuth 2.1 with PKCE for public clients
- Authorization Server Metadata Discovery (RFC8414)
- Dynamic Client Registration (RFC7591)
- Grant types: Authorization Code, Client Credentials
- **Decision**: Not applicable for stdio-based proxy. Skip for now.

### 2. Roots (Client Feature)
**Status**: Client exposes filesystem roots to servers
- `roots/list` - list accessible directories
- `notifications/roots/list_changed` - notify when roots change
- **Decision**: mcp-proxy acts as client to upstream servers, not as a client feature provider. Skip.

### 3. Sampling (Client Feature)
**Status**: Servers request LLM completions from clients
- `sampling/createMessage` - request LLM generation
- Supports text, image, audio content
- Model preferences (cost/speed/intelligence priorities + hints)
- **Decision**: mcp-proxy acts as client to upstream servers. Could aggregate sampling requests from multiple servers, but complex. Defer.

### 4. Logging (Server Feature)
**Status**: Servers send structured logs to clients
- `logging/setLevel` - client sets minimum log level
- `notifications/message` - server sends log messages
- 8 syslog levels: debug, info, notice, warning, error, critical, alert, emergency
- **Decision**: Should implement. Aggregate logs from upstream servers with namespacing.

### 5. Progress Notifications (Utility)
**Status**: Track long-running operations
- Client includes `progressToken` in request metadata
- Server sends `notifications/progress` with progress/total/message
- **Decision**: Pass-through from upstream servers. No aggregation needed.

### 6. Cancellation (Utility)
**Status**: Cancel in-progress requests
- `notifications/cancelled` with requestId and reason
- **Decision**: Pass-through from upstream servers. Map request IDs.

### 7. Completion (Server Utility)
**Status**: Autocomplete for prompt/resource arguments
- `completion/complete` - get suggestions for argument values
- Supports prompts (`ref/prompt`) and resources (`ref/resource`)
- **Decision**: Should implement. Aggregate completions from upstream servers with namespacing.

## Open Questions

1. Should we support `listChanged` notifications? This would require the providers to emit events.
2. Should we support resource subscriptions (`subscribe` capability)?
3. How should we namespace prompts/resources from multiple servers? Same pattern as tools (`serverName__promptName`)?
4. **NEW**: Should we aggregate logging from upstream servers? How to namespace logger names?
5. **NEW**: Should we support completion aggregation? How to merge results from multiple servers?

---

## MCP Client Support Research: opencode (sst/opencode)

### Summary
OpenCode is an MCP **client** that connects to MCP servers to retrieve and use tools. It does NOT implement the full MCP specification as a client.

### Supported Capabilities
| Capability | Support | Notes |
|------------|---------|-------|
| **Tools** | ✅ Full | Primary use case - aggregates tools from multiple MCP servers |
| **Prompts** | ❌ No | OpenCode handles prompts internally via session management |
| **Resources** | ❌ No | No explicit resource support found |
| **Logging** | ⚠️ Partial | Logs connection status and errors, but doesn't implement MCP logging protocol |
| **Sampling** | ❌ No | Not mentioned in context |
| **Roots** | ❌ No | Not mentioned in context |
| **Completion** | ❌ No | Not mentioned in context |
| **Progress** | ❌ No | Not mentioned in context |
| **Cancellation** | ❌ No | Not mentioned in context |

### Architecture
- **MCP namespace**: `packages/opencode/src/mcp/index.ts`
- **Connection types**:
  - Remote: HTTP/SSE to specified URL (`McpRemote`)
  - Local: stdio command execution (`McpLocal`)
- **Status tracking**: "connected", "disabled", "failed"
- **Tool integration**: `MCP.tools()` aggregates tools from all connected MCP clients
- **SDK used**: `@ai-sdk/mcp` with `experimental_createMCPClient`
- **Transports**: `StreamableHTTPClientTransport`, `SSEClientTransport`, `StdioClientTransport`

### Key Findings
1. OpenCode focuses on **tool aggregation** from MCP servers
2. It does NOT implement prompts/resources as an MCP client
3. The term "MCP capabilities" in opencode refers to **transport mechanisms** (HTTP/SSE), not protocol capabilities
4. OpenCode's prompt/resource handling is separate from MCP protocol

### Implications for mcp-proxy
- Most MCP clients likely focus on **tools only** (like opencode)
- Prompts and resources may be less commonly used in practice
- Should still implement prompts/resources for completeness, but tools are the priority
- Consider making prompts/resources optional features

### Source
- DeepWiki search: https://deepwiki.com/search/what-mcp-capabilities-does-ope_a7b9ea47-b227-4ff2-a9fc-7e518e9b1222

---

## MCP Client Support Research: Claude Code (Anthropic)

### Summary
Claude Code SDK is an MCP **client** that supports tools and resources. Documentation explicitly mentions resource management but focuses heavily on tools.

### Supported Capabilities
| Capability | Support | Notes |
|------------|---------|-------|
| **Tools** | ✅ Full | Primary use case - tools from stdio/HTTP/SSE/SDK servers |
| **Resources** | ✅ Full | Explicit support - can list and read resources via `mcp__list_resources`, `mcp__read_resource` |
| **Prompts** | ❌ No | Not mentioned in SDK documentation |
| **Logging** | ❌ No | Not mentioned |
| **Sampling** | ❌ No | Not mentioned |
| **Roots** | ❌ No | Not mentioned |
| **Completion** | ❌ No | Not mentioned |
| **Progress** | ❌ No | Not mentioned |
| **Cancellation** | ❌ No | Not mentioned |

### Architecture
- **Configuration**: `.mcp.json` at project root or programmatic via SDK
- **Transports**: stdio (external processes), HTTP/SSE (remote), SDK (in-process)
- **Authentication**: Environment variables, OAuth2 (not yet supported in-client)
- **Error handling**: Connection status tracking, graceful failure handling
- **Tool naming**: Prefixed with `mcp__<servername>__<toolname>`

### Key Code Example
```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({
  prompt: "What resources are available from the database server?",
  options: {
    mcpServers: {
      "database": {
        command: "npx",
        args: ["@modelcontextprotocol/server-database"]
      }
    },
    allowedTools: ["mcp__list_resources", "mcp__read_resource"]
  }
})) {
  if (message.type === "result") console.log(message.result);
}
```

### Source
- https://docs.anthropic.com/en/docs/claude-code/sdk/sdk-mcp

---

## MCP Client Support Research: Gemini CLI (Google)

### Summary
Gemini CLI is an MCP **client** with comprehensive support for tools, resources, and prompts. Most feature-complete client researched.

### Supported Capabilities
| Capability | Support | Notes |
|------------|---------|-------|
| **Tools** | ✅ Full | Primary use case - sophisticated discovery and execution system |
| **Resources** | ✅ Full | Can access resources (though primarily focuses on tool execution) |
| **Prompts** | ✅ Full | **Prompts exposed as slash commands** - can be invoked with arguments |
| **Logging** | ❌ No | Not mentioned |
| **Sampling** | ❌ No | Not mentioned |
| **Roots** | ❌ No | Not mentioned |
| **Completion** | ❌ No | Not mentioned |
| **Progress** | ❌ No | Not mentioned |
| **Cancellation** | ❌ No | Not mentioned |

### Architecture
- **Configuration**: `settings.json` with `mcpServers` object
- **Transports**: stdio, SSE, Streamable HTTP
- **Discovery**: `discoverMcpTools()` in `packages/core/src/tools/mcp-client.ts`
- **Execution**: `DiscoveredMCPTool` wrapper with confirmation logic
- **Tool filtering**: `includeTools`, `excludeTools` per server
- **Authentication**: Environment variables, OAuth 2.0 (automatic discovery), Google credentials, Service Account impersonation
- **Rich content**: Supports multi-part responses (text, images, audio, binary data)

### Unique Features
1. **MCP Prompts as Slash Commands**: Prompts from MCP servers become executable slash commands
2. **OAuth Support**: Automatic OAuth discovery, dynamic client registration, browser-based auth flow
3. **Rich Content**: Tools can return mixed content types (text + images + audio)
4. **Tool Filtering**: Per-server allowlist/denylist for tools
5. **Trust Settings**: Bypass confirmation for trusted servers
6. **Service Account Impersonation**: For IAP-protected Cloud Run services

### Key Code Example - Prompts
```typescript
// Server defines prompt
server.registerPrompt(
  'poem-writer',
  {
    title: 'Poem Writer',
    description: 'Write a nice haiku',
    argsSchema: { title: z.string(), mood: z.string().optional() },
  },
  ({ title, mood }) => ({
    messages: [{
      role: 'user',
      content: {
        type: 'text',
        text: `Write a haiku${mood ? ` with the mood ${mood}` : ''} called ${title}`
      }
    }]
  })
);

// Client invokes as slash command
// /poem-writer --title="Gemini CLI" --mood="reverent"
```

### Source
- https://google-gemini.github.io/gemini-cli/docs/tools/mcp-server.html

---

## MCP Client Support Research: Codex CLI (OpenAI)

### Summary
Codex CLI is an MCP **client** that supports stdio and HTTP servers. Documentation focuses on tools; no explicit mention of prompts or resources.

### Supported Capabilities
| Capability | Support | Notes |
|------------|---------|-------|
| **Tools** | ✅ Full | Primary use case - stdio and streamable HTTP servers |
| **Resources** | ❓ Unknown | Not explicitly mentioned in documentation |
| **Prompts** | ❓ Unknown | Not explicitly mentioned in documentation |
| **Logging** | ❌ No | Not mentioned |
| **Sampling** | ❌ No | Not mentioned |
| **Roots** | ❌ No | Not mentioned |
| **Completion** | ❌ No | Not mentioned |
| **Progress** | ❌ No | Not mentioned |
| **Cancellation** | ❌ No | Not mentioned |

### Architecture
- **Configuration**: `~/.codex/config.toml` (shared between CLI and IDE extension)
- **Transports**: stdio, Streamable HTTP
- **Authentication**: Bearer tokens, OAuth (requires `rmcp_client` feature flag)
- **Tool filtering**: `enabled_tools`, `disabled_tools` per server
- **Timeouts**: Configurable `startup_timeout_sec`, `tool_timeout_sec`
- **CLI management**: `codex mcp add/list/remove` commands

### Unique Features
1. **Codex as MCP Server**: Can run Codex itself as an MCP server with `codex mcp-server`
2. **Two-way MCP**: Both client and server capabilities
3. **Feature Flags**: `[features].rmcp_client` for OAuth and Rust MCP client
4. **TUI Integration**: `/mcp` command shows connected servers in terminal UI

### Key Code Example
```bash
# Add MCP server
codex mcp add context7 -- npx -y @upstash/context7-mcp

# View connected servers in TUI
codex
/mcp

# Run Codex as MCP server
codex mcp-server
```

### Source
- https://developers.openai.com/codex/mcp

---

## Summary: MCP Client Capabilities Comparison

| Capability | opencode | Claude Code | Gemini CLI | Codex CLI |
|------------|----------|-------------|------------|-----------|
| **Tools** | ✅ Full | ✅ Full | ✅ Full | ✅ Full |
| **Resources** | ❌ No | ✅ Full | ✅ Full | ❓ Unknown |
| **Prompts** | ❌ No | ❌ No | ✅ **Slash Commands** | ❓ Unknown |
| **Logging** | ⚠️ Partial | ❌ No | ❌ No | ❌ No |
| **Sampling** | ❌ No | ❌ No | ❌ No | ❌ No |
| **Roots** | ❌ No | ❌ No | ❌ No | ❌ No |
| **Completion** | ❌ No | ❌ No | ❌ No | ❌ No |
| **Progress** | ❌ No | ❌ No | ❌ No | ❌ No |
| **Cancellation** | ❌ No | ❌ No | ❌ No | ❌ No |

### Key Findings

1. **Tools are universal** - All clients support tools (100% adoption)
2. **Resources are common** - 2/4 clients explicitly support resources (50% confirmed)
3. **Prompts are rare** - Only Gemini CLI supports prompts (25%), implemented as slash commands
4. **Advanced features unused** - No client implements logging, sampling, roots, completion, progress, or cancellation

### Implications for mcp-proxy

1. **Priority 1: Tools** - Must implement perfectly (universal adoption) ✅ Done
2. **Priority 2: Authorization** - Critical blocker for HTTP transports (all clients need it for remote servers)
3. **Priority 3: Resources** - Should implement (50%+ adoption, high value)
4. **Priority 4: Prompts** - Should implement for completeness (25% adoption, but Gemini shows value)
5. **Priority 5: Logging** - Consider implementing (useful for debugging aggregated servers)
6. **Priority 6: Completion** - Consider implementing (useful for prompt/resource argument autocomplete)
7. **Defer: Sampling, Roots, Progress, Cancellation** - No client adoption, complex to implement

### Recommended Implementation Order

1. ✅ **Tools** (already implemented)
2. **Authorization** - Critical for HTTP transports, blocks remote server adoption
3. **Resources** - High value (50%+ adoption), moderate complexity
4. **Prompts** - Moderate value (25% adoption), low complexity
5. **Logging** - Low value for clients, high value for debugging
6. **Completion** - Low value, moderate complexity

---

## MCP Timeout Configuration

Factory.ai docs don't document a `timeout` option for MCP servers, but the MCP protocol supports it:

### Client Configuration (JSON)
```json
{
  "mcpServers": {
    "myserver": {
      "command": "node",
      "args": ["./server.js"],
      "timeout": 300000
    }
  }
}
```
Timeout is in **milliseconds** (300000ms = 5 minutes).

### TypeScript SDK Limitation
The official SDK has a **hard 60-second limit** that cannot be overridden. Workaround: use progress notifications to keep connection alive.

### Sources
- https://mcpcat.io/guides/fixing-mcp-error-32001-request-timeout/
- https://docs.cline.bot/mcp/configuring-mcp-servers

---

## JavaScript/TypeScript MCP Server Libraries Comparison

### 1. Official @modelcontextprotocol/sdk

**npm**: `@modelcontextprotocol/sdk`
**GitHub**: https://github.com/modelcontextprotocol/typescript-sdk

| Feature | Support |
|---------|---------|
| Tools | Full |
| Resources | Full |
| Prompts | Full |
| Transports | stdio, SSE, Streamable HTTP |
| TypeScript | Full |
| Session mgmt | Yes |
| Auth | OAuth 2.1, custom |

**Pros:**
- Official reference implementation with active maintenance
- Complete MCP specification coverage
- Strong TypeScript typing
- Production-ready with established best practices
- Comprehensive documentation

**Cons:**
- More verbose/boilerplate
- Steeper learning curve
- More setup required for simple use cases

**API Example:**
```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

const server = new McpServer({ name: 'my-server', version: '1.0.0' });

server.registerTool('add', {
  description: 'Add two numbers',
  inputSchema: z.object({ a: z.number(), b: z.number() })
}, async ({ a, b }) => ({ content: [{ type: 'text', text: String(a + b) }] }));
```

---

### 2. FastMCP (TypeScript)

**npm**: `fastmcp`
**GitHub**: https://github.com/punkpeye/fastmcp

| Feature | Support |
|---------|---------|
| Tools | Full |
| Resources | Full |
| Prompts | Full |
| Transports | stdio, SSE, HTTP streaming |
| TypeScript | Full |
| Session mgmt | Yes |
| Auth | Custom function |

**Pros:**
- Significantly reduced boilerplate
- Simple, intuitive API (inspired by Python FastMCP)
- Built-in CLI for testing (`npx fastmcp dev`)
- Built-in error handling and logging
- Session support
- Progress notifications
- Standard Schema support (Zod, ArkType, Valibot)

**Cons:**
- Community-maintained (not official)
- Less mature than official SDK
- Potential vendor lock-in

**API Example:**
```typescript
import { FastMCP } from "fastmcp";
import { z } from "zod";

const server = new FastMCP({ name: "My Server", version: "1.0.0" });

server.addTool({
  name: "add",
  description: "Add two numbers",
  parameters: z.object({ a: z.number(), b: z.number() }),
  execute: async (args) => String(args.a + args.b),
});

server.addResource({
  uri: "file:///logs/app.log",
  name: "Application Logs",
  mimeType: "text/plain",
  async load() { return { text: "log content" }; },
});

server.addPrompt({
  name: "git-commit",
  description: "Generate commit message",
  arguments: [{ name: "changes", required: true }],
  load: async (args) => `Generate commit for:\n${args.changes}`,
});

server.start({ transportType: "stdio" });
```

---

### 3. LiteMCP (DEPRECATED)

**npm**: `litemcp`
**GitHub**: https://github.com/wong2/litemcp

**Status**: ⚠️ **No longer maintained** - author recommends using official SDK or FastMCP

Similar API to FastMCP (was actually the inspiration). FastMCP adopted and extended LiteMCP's patterns.

---

### 4. Other Options

| Library | Description | Status |
|---------|-------------|--------|
| **Mastra** | Full AI agent framework with MCP support | Active |
| **mcp-client-gen** | Generate type-safe SDK from MCP servers | Active |
| **ez-mcp** | Simplified MCP server setup | Community |

---

## Recommendation for mcp-proxy

### For Building an MCP Proxy/Aggregator:

**Recommended: Keep using official @modelcontextprotocol/sdk**

Reasons:
1. **Our use case is a proxy/aggregator**, not a simple server
2. We're already using the official SDK
3. We need fine-grained control over:
   - Multiple client connections to upstream servers
   - Tool/prompt/resource namespacing
   - Request routing and aggregation
4. FastMCP is optimized for building simple servers, not proxies
5. Adding FastMCP would add a dependency for marginal benefit

### Architectural Considerations for MCP Proxy:
- Use `serverName__` prefix for tool/prompt namespacing
- Use `serverName://` prefix for resource URI namespacing
- Maintain registry of all connected servers
- Implement centralized security/policy if needed
- Consider per-server namespace isolation

### Sources
- https://github.com/punkpeye/fastmcp
- https://github.com/modelcontextprotocol/typescript-sdk
- https://github.com/wong2/litemcp
- https://github.com/modelcontextprotocol/modelcontextprotocol/discussions/94
