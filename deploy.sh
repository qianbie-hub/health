#!/usr/bin/env bash
# ==============================================================================
# Vigil Health Copilot - Production Automated Deployment Script (Linux / Cloud)
# ==============================================================================
set -euo pipefail

echo "======================================================="
echo "   🚀 Deploying Vigil Health Copilot to Production     "
echo "======================================================="

# 1. Check prerequisite tools
command -v docker >/dev/null 2>&1 || { echo "❌ Error: Docker is required but not installed."; exit 1; }
command -v docker compose >/dev/null 2>&1 || { echo "❌ Error: Docker Compose is required."; exit 1; }

# 2. Environment file check
if [ ! -f .env ]; then
    echo "⚠️  No .env file found. Copying defaults from .env.example..."
    cp .env.example .env
    echo "🔑 Please review and customize passwords in .env for production."
fi

# 3. Pull latest images and build containers
echo "📦 Building and starting production containers..."
docker compose up -d --build

# 4. Wait for services to become healthy
echo "⏳ Awaiting backend service health probe..."
MAX_ATTEMPTS=30
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    if curl -s -f http://localhost:8000/api/health >/dev/null 2>&1; then
        echo "✅ Backend API is healthy!"
        break
    fi
    ATTEMPT=$((ATTEMPT + 1))
    sleep 2
done

if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
    echo "⚠️ Warning: Backend healthcheck timed out. Check logs with 'docker compose logs backend'."
fi

echo ""
echo "======================================================="
echo "   🎉 Vigil Health Copilot is successfully deployed!   "
echo "======================================================="
echo "   Web Application: http://localhost:80"
echo "   API Docs:        http://localhost:8000/docs"
echo "   Health Endpoint: http://localhost:8000/api/health"
echo "======================================================="
