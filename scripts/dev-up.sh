#!/bin/bash
# 启动开发环境 Docker 容器
set -e

echo "[XD] Starting development infrastructure..."
cd "$(dirname "$0")/.."
docker compose up -d

echo "[XD] Waiting for services to be healthy..."
echo "  - PostgreSQL..."
until docker compose exec -T postgres pg_isready -U xd_user -d xd_smart_cs 2>/dev/null; do sleep 2; done
echo "  - Redis..."
until docker compose exec -T redis redis-cli ping 2>/dev/null | grep -q PONG; do sleep 2; done
echo "  - MinIO..."
until curl -sf http://localhost:9000/minio/health/live >/dev/null 2>&1; do sleep 2; done

echo "[XD] All services are ready!"
echo "[XD] Run 'pnpm run dev' to start the application."
