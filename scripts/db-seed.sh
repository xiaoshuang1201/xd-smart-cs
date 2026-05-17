#!/bin/bash
# 数据库 Seed
set -e

echo "[XD] Seeding database..."
cd "$(dirname "$0")/../packages/server"
pnpm run db:seed

echo "[XD] Database seeding completed."
