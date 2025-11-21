FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .
# Install email-validator first to ensure it's available for pydantic
RUN pip install --no-cache-dir email-validator==2.2.0 && \
    pip install --no-cache-dir -r requirements.txt && \
    pip show email-validator

# Copy application code
COPY . .

RUN mkdir -p uploads

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PORT=8080

# Expose port
EXPOSE 8080

# Run uvicorn with production settings
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
