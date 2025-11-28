# MCP Proxy - Code Review

## Overview

This is an MCP (Model Context Protocol) proxy that aggregates multiple MCP servers and exposes them as a single unified server. It supports stdio and SSE transports, config from files or git repos, and optional SOPS decryption for secrets.

## Architecture

The core architecture consists of:
- `MCPAggregator` - Server wrapper that handles MCP protocol
- `ToolProvider` - Interface for providing tools (implemented by `MCPToolProvider`)
- `ConfigProvider` - Interface for loading configuration (implemented by `FileConfigProvider` and `GitConfigProvider`)

This separation is clean, simple, and appropriate for an MCP proxy.

---

## Strengths

- Clean architecture: `MCPAggregator` + `ToolProvider` + `ConfigProvider` separation is solid
- Good transport abstraction (stdio/SSE)
- Proper tool prefixing (`server__tool`) to avoid conflicts
- Graceful handling of individual server connection failures
- Good TypeScript type safety throughout

---

## Critical Issues

### 1. Logger disabled by default

**Location:** `logger.ts`

**Problem:** Logger is completely disabled unless `MCP_LOG_FILE` is set, which is very surprising behavior.

```typescript
// Current - logging disabled if no file
enabled: !!logFile,
```

**Fix:** Always enable logging; if no file, log to stderr.

```typescript
export const logger = pino(
  {
    level: logLevel,
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  logFile ? pino.destination(logFile) : undefined,
);
```

### 2. Shell injection risk

**Location:** `git-provisioner.ts`

**Problem:** Using `exec` with string interpolation is vulnerable to shell injection if `source` or `localPath` contains malicious input.

```typescript
// Current - vulnerable
await execAsync(`git clone --branch ${parsed.branch} --depth 1 ${parsed.repoUrl} ${this.options.localPath}`);
```

**Fix:** Use `execFile` with argument arrays:

```typescript
import { execFile } from "child_process";
const execFileAsync = promisify(execFile);

await execFileAsync("git", ["clone", "--branch", parsed.branch, "--depth", "1", parsed.repoUrl, this.options.localPath]);
```

### 3. Regex bug in secrets substitution

**Location:** `types.ts`

**Problem:** Secret keys are not escaped for regex. Keys containing `.`, `+`, `$`, etc. will break or change the pattern unexpectedly.

```typescript
// Current - breaks on keys like "API.KEY" or "TOKEN+SECRET"
configStr = configStr.replace(new RegExp(`\\$\\{${key}\\}`, "g"), value);
```

**Fix:** Escape regex special characters:

```typescript
function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const pattern = new RegExp(`\\$\\{${escapeRegExp(key)}\\}`, "g");
configStr = configStr.replace(pattern, value);
```

---

## Medium Issues

### 4. Signal handlers inside library class

**Location:** `aggregator.ts`

**Problem:** `MCPAggregator.start()` registers SIGINT/SIGTERM handlers and calls `process.exit(0)`. This is surprising for consumers importing it as a module.

**Fix:** Move signal handling to CLI entrypoints (`index.ts`, `mcp-hub.ts`) only.

### 5. No config validation

**Location:** `file-config-provider.ts`, `git-provisioner.ts`

**Problem:** Any shape of JSON is accepted as `MCPSettings`. Misconfigurations surface as obscure runtime errors.

**Fix:** Add Zod schema validation:

```typescript
import { z } from "zod";

const MCPServerConfigSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("stdio"), command: z.string(), args: z.array(z.string()).optional(), env: z.record(z.string()).optional(), cwd: z.string().optional() }),
  z.object({ type: z.literal("sse"), url: z.string(), headers: z.record(z.string()).optional() }),
  z.object({ type: z.literal("http"), url: z.string(), headers: z.record(z.string()).optional() }),
]);

const MCPSettingsSchema = z.object({
  mcpServers: z.record(MCPServerConfigSchema),
  secrets: z.record(z.string()).optional(),
});
```

### 6. SSE headers config ignored

**Location:** `mcp-tool-provider.ts`

**Problem:** `SSEServerConfig` has `headers` field but it's never passed to `SSEClientTransport`.

**Fix:** Either plumb headers through to the SDK (if supported) or remove from type.

### 7. HTTP transport declared but throws

**Location:** `types.ts`, `mcp-tool-provider.ts`

**Problem:** `HttpServerConfig` type exists but `connectToServer` throws "HTTP transport not yet supported".

**Fix:** Either implement or remove/mark as experimental.

### 8. No JSON parse error handling

**Location:** `file-config-provider.ts`, `git-provisioner.ts`

**Problem:** `JSON.parse` with no try/catch yields unhelpful stack traces.

**Fix:**

```typescript
try {
  const config = JSON.parse(configContent) as MCPSettings;
} catch (e) {
  throw new Error(`Failed to parse config at ${configPath}: ${(e as Error).message}`);
}
```

---

## Minor Issues & Suggestions

### 9. Unused `log` variable

**Location:** `aggregator.ts:10`

The `log` variable is declared but never used.

### 10. Environment propagation

**Location:** `mcp-tool-provider.ts`

`resolveEnv` copies all of `process.env` which may unintentionally leak host secrets to child servers. Document this behavior.

### 11. Duplicate bootstrap logic

**Location:** `index.ts`, `mcp-hub.ts`

Consider a helper factory to reduce duplication:

```typescript
export async function startProxyFromConfig(config: MCPSettings, opts?: AggregatorOptions) {
  const toolProvider = new MCPToolProvider(config);
  const aggregator = new MCPAggregator(toolProvider, opts);
  await aggregator.start();
  return aggregator;
}
```

### 12. SOPS limitations

- Only supported in `GitConfigProvider` (not `FileConfigProvider`)
- Only supports JSON (not YAML)
- Document these limitations

### 13. Missing `client.close()`

**Location:** `mcp-tool-provider.ts`

The cleanup function only closes transport but doesn't explicitly close the client.

---

## Testing Gaps

High-ROI test targets:

1. **`substituteSecrets`** - Keys with regex chars, overlapping keys, ensure `secrets` field is removed
2. **`GitConfigProvider.parseSource`** - All URL variants and edge cases
3. **`MCPToolProvider.callTool`** - Correct parsing of `server__tool`, missing server/tool handling, different result shapes
4. **`resolveEnv`** - Ensure `env` overrides `process.env` correctly

---

## Security Considerations

1. **Shell injection** - Use `execFile` instead of `exec` (see Critical Issue #2)
2. **Secrets in logs** - Avoid logging full configs; scrub secret fields if adding debug logging
3. **Trust model** - Document that this is intended for local, trusted environments

---

## Future Considerations

Revisit architecture when:
- Multi-tenant separation is needed
- Exposing hub over network (needs auth/ACLs)
- High-availability / auto-reconnect / dynamic upstream discovery
- Hot-reload of configs (SIGHUP or periodic)

---

## Priority Order

1. 🔴 Fix logger disabled by default
2. 🔴 Fix shell injection in git-provisioner
3. 🔴 Fix regex bug in secrets substitution
4. 🟡 Add config validation with Zod
5. 🟡 Move signal handlers to CLI entrypoints
6. 🟡 Add JSON parse error handling
7. 🟢 Add tests for critical paths
8. 🟢 Clean up unused code and document limitations
