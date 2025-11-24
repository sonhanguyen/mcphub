FROM python:3.11-slim

RUN pip install --no-cache-dir "litellm[proxy]"

WORKDIR /app
COPY config.yaml /app/config.yaml

EXPOSE 4000

CMD ["litellm", "--host", "0.0.0.0", "--config", "/app/config.yaml"]
