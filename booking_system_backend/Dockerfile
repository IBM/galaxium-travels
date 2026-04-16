# Use linux/amd64 platform for AWS ECS compatibility
FROM --platform=linux/amd64 python:3.11-slim

WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD python -c "import requests; requests.get('http://localhost:8080/api/', timeout=2)"

# Run server
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8080"]
