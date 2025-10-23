FROM samanhappy/mcphub:latest

# Copy custom configuration if needed
COPY mcp_settings.json /app/mcp_settings.json

EXPOSE 3000

CMD ["node", "dist/index.js"]