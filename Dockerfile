FROM samanhappy/mcphub:latest
COPY mcp_settings.json setup-auth.js /app/

RUN chmod +x /app/setup-auth.js

ENV MCPHUB_SETTING_PATH=/app/data

CMD sh -c "/app/setup-auth.js && npm start"
