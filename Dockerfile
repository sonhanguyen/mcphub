FROM samanhappy/mcphub:latest

# Install git and dependencies for Go installation
RUN apt-get update && apt-get install -y git wget && rm -rf /var/lib/apt/lists/*

# Install Go 1.23.4 (latest stable)
RUN wget -O go1.23.4.linux-amd64.tar.gz https://golang.org/dl/go1.23.4.linux-amd64.tar.gz && \
    rm -rf /usr/local/go && \
    tar -C /usr/local -xzf go1.23.4.linux-amd64.tar.gz && \
    rm go1.23.4.linux-amd64.tar.gz

# Add Go to PATH
ENV PATH=$PATH:/usr/local/go/bin

# Build GitHub MCP Server
RUN git clone --depth 1 --branch v0.19.1 https://github.com/github/github-mcp-server.git /tmp/github-mcp-server && \
    cd /tmp/github-mcp-server && \
    go build -o /usr/local/bin/github-mcp-server ./cmd/github-mcp-server && \
    rm -rf /tmp/github-mcp-server

# Copy configuration files
COPY mcp_settings.json config.js /app/

# Make config.js executable
RUN chmod +x /app/config.js

# Set environment variables
ENV MCPHUB_SETTING_PATH=/app/data

# Start command
CMD sh -c "/app/config.js && npm start"