FROM samanhappy/mcphub:latest

RUN apt-get update && apt-get install -y git wget && rm -rf /var/lib/apt/lists/*

RUN wget -O go1.23.4.linux-amd64.tar.gz https://golang.org/dl/go1.23.4.linux-amd64.tar.gz && \
    rm -rf /usr/local/go && \
    tar -C /usr/local -xzf go1.23.4.linux-amd64.tar.gz && \
    rm go1.23.4.linux-amd64.tar.gz

ENV PATH=$PATH:/usr/local/go/bin

RUN git clone --depth 1 --branch v0.19.1 https://github.com/github/github-mcp-server.git /tmp/github-mcp-server && \
    cd /tmp/github-mcp-server && \
    go build -o /usr/local/bin/github-mcp-server ./cmd/github-mcp-server && \
    rm -rf /tmp/github-mcp-server

COPY mcp_settings.json config.js /app/

RUN chmod +x /app/config.js

ENV MCPHUB_SETTING_PATH=/app/data

CMD sh -c "/app/config.js && npm start"
