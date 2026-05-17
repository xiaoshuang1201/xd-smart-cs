#!/bin/bash
# 数据库迁移
set -e

echo "[XD] Running database migrations..."
cd "$(dirname "$0")/../packages/server"
pnpm run db:migrate:dev

echo "[XD] Database migration completed."
