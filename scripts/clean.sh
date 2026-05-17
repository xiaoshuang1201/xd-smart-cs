#!/bin/bash
# 清理开发环境
set -e

echo "[XD] Cleaning development environment..."
cd "$(dirname "$0")/.."

docker compose down -v
rm -rf node_modules .pnpm-store
find . -name "node_modules" -type d -prune -exec rm -rf {} \; 2>/dev/null || true
find . -name "dist" -type d -prune -exec rm -rf {} \; 2>/dev/null || true
find . -name ".nuxt" -type d -prune -exec rm -rf {} \; 2>/dev/null || true
find . -name ".output" -type d -prune -exec rm -rf {} \; 2>/dev/null || true
find . -name ".turbo" -type d -prune -exec rm -rf {} \; 2>/dev/null || true
rm -rf pnpm-lock.yaml

echo "[XD] Clean completed. Run 'pnpm install' to reinitialize."
