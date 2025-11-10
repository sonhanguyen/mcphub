FROM samanhappy/mcphub:latest-full

COPY mcp_settings.json config.js skills /app/

RUN chmod +x /app/config.js

RUN uv tool install skill_to_mcp
RUN pnpm add -g @playwright/mcp@latest @perplexity-ai/mcp-server@0.2.2

ENV MCPHUB_SETTING_PATH=/tmp/mcphub

CMD sh -c "/app/config.js && npm start"
