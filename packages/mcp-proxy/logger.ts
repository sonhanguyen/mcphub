import pino from "pino";

const logFile = process.env.MCP_LOG_FILE;
const logLevel = process.env.MCP_LOG_LEVEL ?? "info";

export const logger = pino(
  {
    level: logLevel,
    enabled: !!logFile,
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  logFile ? pino.destination(logFile) : undefined,
);

export function createLogger(name: string) {
  return logger.child({ name });
}
