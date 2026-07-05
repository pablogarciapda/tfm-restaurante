# La Zíngara — VPS Installation Guide

> Complete, recipe-style guide to install/deploy the Restaurante La Zíngara app on a fresh VPS via git. Anyone with sudo + ssh access to a clean Ubuntu 22+ server should be able to reproduce this install.

This document is the source of truth for VPS provisioning. **Update it whenever the install recipe, required tools, versions, or deploy workflow change** — it is kept in the repo (committed, not gitignored) so it travels with the code.

- **Project:** Restaurante La Zíngara (Nuxt 4 + Supabase + Konva canvas table manager)
- **Repo:** `https://github.com/pablogarciapda/tfm-restaurante`
- **Default base branch:** `master`
- **Runtime:** Node 22 LTS + pm2 (production server, SSR)
- **Database:** Supabase (managed, accessed over HTTPS — no local Postgres needed on the VPS)
- **Target path on VPS:** `/opt/tfm-restaurante`

---

## 0. What this installs

A Nuxt 4 SSR web app for a restaurant (public pages: home, carta, menu-diario, reservas, eventos, contacto) + admin SPA at `/cocina/**` (auth, CRUD, Konva.js interactive table manager with fusion + Realtime sync).

SSR is required — the home page and all public routes are server-rendered for SEO/local-search visibility. The admin (`/cocina/**`) runs as SPA (`routeRules: { ssr: false }`).

---

## 1. Required Versions (hard requirements)

| Tool        | Version                | Why                                                          |
| ----------- | ---------------------- | ------------------------------------------------------------ |
| OS          | Ubuntu 22.04+ (Linux)  | systemd for pm2 auto-start; glibc for Node binaries           |
| Node.js     | **>= 22 LTS**          | `globalThis.WebSocket` becomes native in Node 22. `@supabase/ssr`'s `createServerClient` validates it and throws "Node.js 20 detected without native WebSocket support" on Node <22 — that throw aborts the SSR plugin cascade and 500s every SSR route. |
| pnpm        | **10.x**               | Repo `pnpm-lock.yaml` was generated with pnpm 10. pnpm 11 will abort on the lockfile unless `CI=true` is set. |
| pm2         | 7.x                    | Process manager with `interpreter: process.execPath` in ecosystem. |
| git         | any recent             | Clone + `git pull` for updates.                              |

### Software not required on the VPS
- Postgres / Supabase local stack — Supabase is a managed service accessed via HTTPS.
- nginx (for now) — the app listens directly on `0.0.0.0:3000`. Add nginx + Let's Encrypt only when serving the production domain (separate recipe; out of scope here).

---

## 2. One-time VPS provisioning

Do these once on a clean VPS (as the user that will own the deploy — e.g. `admin-odoo`).

### 2.1 System packages
```bash
sudo apt-get update
sudo apt-get install -y curl git build-essential
```

### 2.2 nvm + Node 22
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
# load nvm in the current shell (or open a new shell)
export NVM_DIR="$HOME/.nvm"
. "$NVM_DIR/nvm.sh"

nvm install 22          # installs Node 22 LTS (e.g. 22.23.1)
nvm alias default 22   # make Node 22 the default for new shells
node -v                 # must show v22.x
```

### 2.3 pnpm (pin to v10) + pm2 (global under Node 22)
```bash
npm install -g pnpm@10   # pnpm 10 (NOT 11 — the lockfile is pnpm-10)
npm install -g pm2      # pm2 7.x under Node 22
pnpm -v                 # must show 10.x
pm2 -v                  # must show 7.x
```

> **Do NOT run `corepack enable` then `pnpm`** — corepack pulls pnpm@11 by default, which aborts the install on this lockfile. Use `npm install -g pnpm@10` as above.

### 2.4 Clone the repo
```bash
sudo mkdir -p /opt/tfm-restaurante
sudo chown "$USER":"$USER" /opt/tfm-restaurante
cd /opt/tfm-restaurante
git clone https://github.com/pablogarciapda/tfm-restaurante.git .
git checkout master
```

### 2.5 Create `.env` (gitignored — never committed)
```bash
cp .env.example .env
nano .env   # fill in the real Supabase keys
```

Required values (get them from Supabase Dashboard → Project Settings → API for project `sqtzcjcyciatagakmmcf`):
- `NUXT_PUBLIC_SUPABASE_URL=https://sqtzcjcyciatagakmmcf.supabase.co` (already prefilled)
- `NUXT_PUBLIC_SUPABASE_KEY=<anon/public key>` — starts with `sb_publishable_...`
- `SUPABASE_SERVICE_ROLE_KEY=<service_role key>` — starts with `sb_secret_...` (SERVER-ONLY, never exposed to client)
- `NUXT_PUBLIC_SITE_URL=https://www.lazingara.es`
- `NUXT_SMS_PROVIDER=mock` (leave `mock` unless LabsMobile SMS is wired)
- `NITRO_PORT=3000`, `NITRO_HOST=0.0.0.0` (listen on all interfaces)

### 2.6 First deploy
```bash
cd /opt/tfm-restaurante
bash scripts/deploy.sh
```

`scripts/deploy.sh` does:
1. Load nvm + pin Node 22 (refuses to deploy on Node <22 — this protects SSR).
2. Source `.env` into the shell so both `pnpm build` (Nuxt reads `.env` at build time, inlines `runtimeConfig.public`) and `ecosystem.config.cjs` (reads `process.env` for pm2 runtime env) get the vars.
3. `pnpm install --frozen-lockfile`
4. `pnpm build` (Nuxt 4 production build → `.output/server/index.mjs`)
5. `pm2 startOrReload ecosystem.config.cjs --update-env`
6. `pm2 save` (persist process list for the pm2 startup hook)
7. Health check (`curl` on `http://localhost:3000/` — expect HTTP 200)

When it finishes you should see `GET / -> HTTP 200`.

### 2.7 Open the firewall port (if ufw is on)
```bash
sudo ufw allow 3000/tcp    # only if ufw is enabled
```

### 2.8 Verify from outside
```bash
# from your laptop
curl -I http://<VPS-PUBLIC-IP>:3000/
# expect HTTP/1.1 200 OK
```

For this install: `curl -I http://57.131.33.90:3000/`.

---

## 3. pm2 auto-start on VPS reboot (systemd unit)

This is the one step that needs an interactive TTY (sudo password). Run it once:

```bash
ssh <user>@<vps>   # interactive shell
cd /opt/tfm-restaurante
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh"
nvm use 22
sudo env PATH=$PATH:/home/<user>/.nvm/versions/node/v22.23.1/bin \
  /home/<user>/.nvm/versions/node/v22.23.1/lib/node_modules/pm2/bin/pm2 startup systemd \
  -u <user> --hp /home/<user>
```

For this VPS (user `admin-odoo`, Node `v22.23.1`):
```bash
sudo env PATH=$PATH:/home/admin-odoo/.nvm/versions/node/v22.23.1/bin \
  /home/admin-odoo/.nvm/versions/node/v22.23.1/lib/node_modules/pm2/bin/pm2 startup systemd \
  -u admin-odoo --hp /home/admin-odoo
```

Verify:
```bash
systemctl is-enabled pm2-admin-odoo   # → enabled
systemctl is-active  pm2-admin-odoo   # → active
pm2 save                              # persist current process list (incl. tfm) for the startup hook
```

After this, rebooting the VPS will: start the `pm2-admin-odoo` systemd service → restores the saved pm2 process list from `~/.pm2/dump.pm2` → `tfm` comes back online automatically (under the Node 22 that the systemd unit was configured with).

> **If you ever change the default Node version (e.g. nvm install 24 + nvm alias default 24):** re-run the `pm2 startup systemd` command above (with the new path) so the systemd unit points at the new Node. The `ecosystem.config.cjs` `interpreter: process.execPath` line pins the Node for `tfm` itself at deploy time, but the systemd boot hook uses the path baked into the unit.

---

## 4. Update workflow (after a change on master)

When you merge a PR on GitHub (or push to master), the VPS is NOT auto-deployed. To deploy the latest master to the VPS:

```bash
ssh <user>@<vps>
cd /opt/tfm-restaurante
git pull
bash scripts/deploy.sh
```

That's it. `deploy.sh` re-installs, rebuilds, restarts pm2 with the existing env, runs a health check.

If `git pull` is blocked by a local modification on the VPS (e.g. an experimental `nuxt.config.ts` edit), review it with `git diff` and either commit/discard:
```bash
git diff <file>      # inspect
git checkout -- <file>   # discard if redundant (only do this if you're sure)
git pull
```

**Never commit on the VPS** — keep it a pure mirror of `master`. All real edits happen on a dev machine, go through PR review, and land via `git pull` + `deploy.sh`.

---

## 5. Health-check & operation commands

```bash
# process state
pm2 list                         # tfm should be online, 0 unstable restarts
pm2 describe tfm                 # full status, pid, cwd, interpreter used
pm2 logs tfm --err --lines 50 --nostream   # last 50 err lines, then exit
pm2 monit                        # live CPU/mem (Ctrl-C to exit)

# verify SSR works (should be 200, not 500)
curl -I http://localhost:3000/
curl -I http://localhost:3000/carta

# what Node is the tfm process actually running under?
readlink /proc/$(pm2 pid tfm)/exe
# must show: ~/.nvm/versions/node/v22.23.1/bin/node  (or whichever Node 22 is installed)

# what env did the process get?
cat /proc/$(pm2 pid tfm)/environ | tr '\0' '\n' | grep -iE 'SUPABASE|NUXT_'
```

---

## 6. Diagnosing a 500 / blank page

The most common failure modes, in order:

### 6.1 "Cannot read properties of undefined (reading 'state')" at `app:rendered`
Cause: Node <22 (the `@supabase/ssr` WebSocket guard threw, aborting the Pinia plugin cascade). Fix: pin Node 22 (`nvm use 22`, restart pm2: `pm2 kill && pm2 start ecosystem.config.cjs`); verify `readlink /proc/$(pm2 pid tfm)/exe` shows Node 22.

### 6.2 "Missing server key. Set `NUXT_SUPABASE_SECRET_KEY`" (only on `/api/cocina/**`)
Cause: `SUPABASE_SERVICE_ROLE_KEY` not set in the pm2 runtime env. Verify: `cat /proc/$(pm2 pid tfm)/environ | tr '\0' '\n' | grep SUPABASE_SERVICE_ROLE_KEY` — must be set. If missing, `pm2 kill && cd /opt/tfm-restaurante && set -a; . ./.env; set +a && pm2 start ecosystem.config.cjs && pm2 save`.

### 6.3 Routing works but admin login fails / data empty
Check Supabase RLS policies + that the anon key isn't the service_role key (an anon key leaking into a client route can read blocked rows — and vice versa).

### 6.4 How to capture an original throw that an `app:rendered` error masks
The `app:rendered` 500 is almost always a **downstream symptom** of an upstream throw in an earlier plugin. To capture the real throw:
```bash
# temporarily patch the suspect module's plugin to wrap its setup in try/catch + console.error
cd /opt/tfm-restaurante
nano node_modules/@nuxtjs/supabase/dist/runtime/plugins/supabase.server.js
# (add try { ... } catch (e) { console.error('[DBG]', e.message); throw e; } around the setup)
set -a; . ./.env; set +a; pnpm build
node .output/server/index.mjs &   # or `pm2 restart tfm`
sleep 4; curl -I http://localhost:3000/
pm2 logs tfm --err --lines 30 --nostream      # ← the actual error will be here
# undo the patch by reinstalling the module:
pnpm install --frozen-lockfile
```
**Never commit that patch.** It is diagnostic only and reverts with `pnpm install`.

---

## 7. Env-convention reference (so you don't fight Nitro again)

Nuxt's `runtimeConfig` keys map to env vars as: `NUXT_` prefix + `UPPER_SNAKE_CASE` (camelCase keys are split at word boundaries — `smsProvider` → `NUXT_SMS_PROVIDER`, `labsMobileUsername` → `NUXT_LABS_MOBILE_USERNAME`).

- `runtimeConfig.public.*` keys get the `NUXT_PUBLIC_` prefix.
- Non-public `runtimeConfig.*` keys get just `NUXT_` (e.g. `NUXT_SMS_PROVIDER`).
- The `@nuxtjs/supabase` server service role key is the exception — read directly from `process.env.SUPABASE_SERVICE_ROLE_KEY` (no `NUXT_` prefix). See `server/api/cocina/**` handlers (they use `serverSupabaseServiceRole(event)`).

`.env` is read by Nuxt at **build** time (dev/build/generate) and **NOT** at production runtime. The Node process reads `process.env` only. `scripts/deploy.sh` sources `.env` before both `pnpm build` and `pm2 start` so the vars reach both phases.

The accepted env vars (see `.env.example` for the full list):
- `NUXT_PUBLIC_SUPABASE_URL`, `NUXT_PUBLIC_SUPABASE_KEY` (anon, public)
- `SUPABASE_SERVICE_ROLE_KEY` (server-only, no `NUXT_` prefix)
- `NUXT_PUBLIC_SITE_URL`
- `NUXT_SMS_PROVIDER` (`mock` or `labsmobile`)
- `NUXT_LABS_MOBILE_USERNAME`, `NUXT_LABS_MOBILE_TOKEN`, `NUXT_LABS_MOBILE_SENDER`, `NUXT_LABS_MOBILE_TEST`
- `NITRO_PORT`, `NITRO_HOST`

---

## 8. Files that matter for deploy

| Path | Purpose |
|------|---------|
| `ecosystem.config.cjs` | pm2 process config. `interpreter: process.execPath` pins Node to whatever ran `pnpm build` (prevents the daemon-Node-mismatch trap). Reads `process.env` for runtime config values (deploy.sh sources `.env` first). |
| `scripts/deploy.sh` | The deploy recipe: nvm load + Node 22 gate + source `.env` + `pnpm install` + `pnpm build` + `pm2 startOrReload` + `pm2 save` + health check. This is THE deploy command. |
| `.env.example` | Template + documentation for the env vars (gitignored real `.env` is filled from this). |
| `.env` | **Gitignored, never committed.** Real Supabase + SMS keys. Created once per VPS, kept on the server. |
| `nuxt.config.ts` | App config — `runtimeConfig` defaults, `supabase.types` pointing at `app/types/database.types.ts`. |
| `app/types/database.types.ts` | Auto-generated Supabase types + a documented overlay of 6 CHECK-constrained literal unions (see file header for the regen convention). |

---

## 9. What to touch for common changes

| Change | File | Notes |
|--------|------|-------|
| Add an env var | `nuxt.config.ts` `runtimeConfig`, `.env.example`, then add the value on the VPS `.env` + `pm2 kill && . ./.env && pm2 start ecosystem.config.cjs` | `runtimeConfig.public.X` → `NUXT_PUBLIC_X`; `runtimeConfig.X` → `NUXT_X`. |
| Supabase schema migration | Apply via Supabase, then regenerate `app/types/database.types.ts` via `supabase gen types typescript --project-id sqtzcjcyciatagakmmcf` + re-apply the 6 CHECK-union overlays (see file header) | Don't hand-edit the structural types. |
| Update Node | `nvm install <ver>`, `nvm alias default <ver>`, `npm i -g pnpm@10 pm2`, **re-run the `pm2 startup systemd` command with the new path** (section 3) | Keep Node >=22. |
| Update pnpm | `npm i -g pnpm@10` (NEVER pull pnpm 11 via corepack or the lockfile will fail) | The repo's `pnpm-lock.yaml` is pnpm-10. |

---

## 10. Quick-reference: install on a fresh VPS (script-style)

```bash
# 1. system deps
sudo apt-get update && sudo apt-get install -y curl git build-essential

# 2. nvm + Node 22 + pnpm@10 + pm2
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh"
nvm install 22 && nvm alias default 22
npm i -g pnpm@10 pm2

# 3. clone
sudo mkdir -p /opt/tfm-restaurante && sudo chown "$USER":"$USER" /opt/tfm-restaurante
cd /opt/tfm-restaurante && git clone https://github.com/pablogarciapda/tfm-restaurante.git .

# 4. .env (fill the real Supabase keys — see .env.example)
cp .env.example .env && nano .env

# 5. first deploy
bash scripts/deploy.sh

# 6. systemd auto-start (interactive TTY, sudo password)
sudo env PATH=$PATH:$HOME/.nvm/versions/node/v22.23.1/bin \
  $HOME/.nvm/versions/node/v22.23.1/lib/node_modules/pm2/bin/pm2 startup systemd \
  -u "$USER" --hp "$HOME"
pm2 save

# 7. open port (only if ufw is on)
sudo ufw allow 3000/tcp
```

---

## 11. Update deploy after merging a PR

```bash
cd /opt/tfm-restaurante
git pull
bash scripts/deploy.sh
```

That's the entire "release" workflow. No CI/CD pipeline — `master` is the deploy target.