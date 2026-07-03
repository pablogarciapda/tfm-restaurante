#!/usr/bin/env bash
# Deploy La Zíngara on the VPS. Run from anywhere — it cds to the repo root.
# Usage: bash scripts/deploy.sh
#
# Prerequisites:
#   - .env present in the repo root (gitignored; copy from .env.example, fill real Supabase keys)
#   - node (>=20, via nvm), pnpm, pm2 installed and on PATH
#
# What it does:
#   1. Sources .env (so Nuxt reads it at build time AND pm2 gets the vars at runtime)
#   2. pnpm install --frozen-lockfile
#   3. pnpm build  (Nuxt inlines runtimeConfig.public from .env at build time)
#   4. pm2 startOrReload ecosystem.config.cjs --update-env  (passes runtime env to Node)
#   5. pm2 save  (persists the process list across reboots)
#   6. health-check curl on the home page

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [ ! -f .env ]; then
  echo "ERROR: .env not found at $ROOT/.env" >&2
  echo "       Copy .env.example to .env and fill in the real Supabase keys." >&2
  exit 1
fi

# Source .env into the shell so:
#   - `pnpm build` reads it (Nuxt loads .env at build time → inlines runtimeConfig.public)
#   - `ecosystem.config.cjs` reads process.env (pm2 runtime env)
# `set -a` exports all vars; the leading-dot sources; `set +a` stops exporting.
echo "→ Loading .env..."
set -a
# shellcheck disable=SC1091
. ./.env
set +a

echo "→ Installing dependencies (pnpm install --frozen-lockfile)..."
pnpm install --frozen-lockfile

echo "→ Building Nuxt (.env is read at build time for runtimeConfig.public)..."
pnpm build

echo "→ (Re)starting pm2 via ecosystem.config.cjs (runtime env -> Node process)..."
pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save

echo "→ Health check..."
sleep 3
if curl -sS -o /dev/null -w "  GET / -> HTTP %{http_code}\n" http://localhost:3000/; then
  echo "→ Deploy complete. If non-200, check: pm2 logs tfm --err --lines 50"
else
  echo "  (health check failed — the server may still be starting; check 'pm2 logs tfm --err --lines 50')" >&2
fi
