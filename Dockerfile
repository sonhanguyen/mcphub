FROM samanhappy/mcphub:latest-full

COPY mcp_settings.json config.js skills /app/

RUN chmod +x /app/config.js

# Pre-install Node.js dependencies
RUN pnpm add -g @playwright/mcp @perplexity-ai/mcp-server
# Pre-run uvx to cache packages
RUN uvx skill_to_mcp --help

ENV MCPHUB_SETTING_PATH=/tmp/mcphub

CMD sh -c "/app/config.js && npm start"
