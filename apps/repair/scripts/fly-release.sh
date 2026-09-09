#!/bin/sh
# Fly release_command: apply SQL migrations before machines update.
set -eu

ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Fly release start"
echo "pwd=$ROOT"
echo "node=$(node -v 2>/dev/null || echo missing)"
echo "DATABASE_URL set? $([ -n "${DATABASE_URL:-}" ] && echo yes || echo no)"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL is not set"
  exit 1
fi

if [ ! -f "$ROOT/scripts/fly-db-migrate.cjs" ]; then
  echo "ERROR: migrate script missing"
  ls -la "$ROOT/scripts" 2>/dev/null || true
  exit 1
fi

if [ ! -d "$ROOT/drizzle/migrations" ]; then
  echo "ERROR: migrations folder missing"
  ls -la "$ROOT/drizzle" 2>/dev/null || true
  exit 1
fi

if [ -d "$ROOT/migrate-node/node_modules" ]; then
  export NODE_PATH="$ROOT/migrate-node/node_modules"
fi
echo "NODE_PATH=${NODE_PATH:-}"

node "$ROOT/scripts/fly-db-migrate.cjs"
echo "==> Fly release OK"
