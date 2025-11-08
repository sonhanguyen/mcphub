FROM samanhappy/mcphub:latest-full

COPY mcp_settings.json config.js skills /app/

RUN chmod +x /app/config.js

ENV MCPHUB_SETTING_PATH=/tmp/mcphub

CMD sh -c "/app/config.js && npm start"
