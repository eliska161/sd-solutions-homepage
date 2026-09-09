#!/bin/sh
# Fly release_command: apply Drizzle schema to DATABASE_URL before machines start.
set -eu

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is not set — cannot push schema"
  exit 1
fi

echo "==> Drizzle schema push (auto on Fly deploy)"
export CI=true
npx drizzle-kit push --force
echo "==> Schema push complete"
