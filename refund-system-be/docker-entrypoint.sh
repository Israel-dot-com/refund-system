#!/bin/sh
set -e

echo "⏳ Pushing database schema..."
npx prisma db push --accept-data-loss

echo "🌱 Seeding database..."
npx tsx prisma/seed.ts

echo "🚀 Starting API server..."
exec node dist/index.js
