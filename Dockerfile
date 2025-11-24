FROM python:3.11-slim

# Install LiteLLM proxy
RUN pip install --no-cache-dir "litellm[proxy]"

# Expose LiteLLM port
EXPOSE 3000

# Run LiteLLM proxy. Configure models via environment variables or mounted config at runtime.
# Example envs you can set on Fly: OPENAI_API_KEY, ANTHROPIC_API_KEY, etc.
CMD ["litellm", "--host", "0.0.0.0", "--port", "3000"]
