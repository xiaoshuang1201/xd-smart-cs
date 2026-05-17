#!/bin/bash
# 停止开发环境 Docker 容器
set -e

echo "[XD] Stopping development infrastructure..."
cd "$(dirname "$0")/.."
docker compose down

echo "[XD] Development infrastructure stopped."
