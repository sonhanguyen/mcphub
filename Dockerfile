FROM samanhappy/mcphub:0.10.1-full

COPY mcp_settings.json config.js /app/

RUN chmod +x /app/config.js

ENV MCPHUB_SETTING_PATH=/app/data

CMD sh -c "/app/config.js && npm start"
