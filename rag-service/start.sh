#!/bin/bash
# Start the RAG Service using Gunicorn with Uvicorn workers
# Render provides the PORT environment variable

export PORT=${PORT:-8000}

echo "Starting RAG Service on port $PORT..."

gunicorn main:app \
  --workers 1 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:$PORT \
  --timeout 90 \
  --log-level info
