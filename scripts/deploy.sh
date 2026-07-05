#!/usr/bin/env bash
# Deploy La Zíngara on the VPS. Run from anywhere — it cds to the repo root.
# Usage: bash scripts/deploy.sh
#
# Prerequisites:
#   - .env present in the repo root (gitignored; copy from .env.example, fill real Supabase keys)
#   - nvm installed (~/.$nvm/nvm.sh); Node 22 LTS + pnpm@10 + pm2 are installed under it
#
# Why Node 22 is required: @supabase/ssr's createServerClient throws "Node.js 20 detected
# without native WebSocket support" on Node <22 because WebSocket is not a global there
# (it becomes global in Node 22). That throw aborts the SSR plugin cascade → Pinia never
# initialises → the app:rendered hook reads $pinia.state.value on undefined → 500 on every
# SSR route. Pin the Node version here so a default-nvm slip doesn't silently break SSR.
#
# What it does:
#   1. Loads nvm and pins Node 22 (so build + pm2 daemon both run with WebSocket native)
#   2. Sources .env (so Nuxt reads it at build time AND pm2 gets the vars at runtime)
#   3. pnpm install --frozen-lockfile
#   4. pnpm build  (Nuxt inlines runtimeConfig.public from .env at build time)
#   5. pm2 startOrReload ecosystem.config.cjs --update-env  (passes runtime env to Node)
#   6. pm2 save  (persists the process list across reboots)
#   7. health-check curl on the home page

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# ── Pin Node 22 (required for globalThis.WebSocket, used by @supabase/ssr) ──
# nvm is not loaded in non-login shells (cron, systemd, plain ssh 'cmd'); load it.
NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  # shellcheck disable=SC1091
  . "$NVM_DIR/nvm.sh"
fi
if ! command -v nvm >/dev/null 2>&1; then
  echo "ERROR: nvm not found. Install nvm and Node 22 + pnpm@10 + pm2 first." >&2
  exit 1
fi
nvm use 22 >/dev/null
# Sanity: refuse to deploy if Node <22 (the @supabase/ssr WebSocket guard would 500 SSR).
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt 22 ]; then
  echo "ERROR: Node $(node -v) — need Node >=22 for global WebSocket support." >&2
  echo "       Run: nvm install 22 && nvm alias default 22 && npm i -g pnpm@10 pm2" >&2
  exit 1
fi
echo "→ Node $(node -v), pnpm $(pnpm -v), pm2 $(pm2 -v)"

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
