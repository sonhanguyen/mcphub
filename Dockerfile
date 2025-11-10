FROM samanhappy/mcphub:latest-full

COPY mcp_settings.json config.js skills /app/

RUN chmod +x /app/config.js

# Install uv and pre-install Python/skill dependencies
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/
RUN uv python install 3.12 && \
    uv tool install skill_to_mcp --python 3.12

# Pre-install Node.js dependencies with specific versions
RUN pnpm add -g @playwright/mcp@latest @perplexity-ai/mcp-server@0.2.2

ENV MCPHUB_SETTING_PATH=/tmp/mcphub

CMD sh -c "/app/config.js && npm start"
