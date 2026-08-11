# VPS Deployment Notes — La Zíngara

## Conexión SSH

```bash
ssh ovh_odoo
cd /opt/tfm-restaurante
```

## Cookie Secure en VPS HTTP (⚠️ OBLIGATORIO)

El `@nuxtjs/supabase` por defecto marca las cookies con `Secure: true`. Esto funciona en HTTPS, pero en el VPS el app se sirve por HTTP (puerto 3000 directo, sin nginx reverse proxy con SSL).

**Síntoma:** El login parece funcionar, pero redirige en bucle al dashboard → login. Las cookies de Supabase (`sb-access-token`, `sb-refresh-token`) no se almacenan porque el navegador ignora cookies `Secure` en HTTP.

**Solución en `.env`:**

```env
NUXT_PUBLIC_SUPABASE_COOKIE_SECURE=false
```

**Importante:** Esta variable se evalúa en **build time** (`nuxt.config.ts`). No basta con ponerla en `.env` y reiniciar pm2 — hay que hacer rebuild:

```bash
bash scripts/deploy.sh   # Lee .env, build, y reinicia pm2
```

O manualmente:

```bash
set -a; source .env; set +a
pnpm build
pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save
```

**¿Por qué funciona en localhost sin esta variable?** Los navegadores eximen `localhost` de la regla `Secure`. En cualquier otra IP/dominio HTTP, las cookies Secure se descartan.

## Automatic Supabase Auth URL Sync

When an administrator saves `configuracion.site_url` in `/cocina/configuracion`, the server persists the database value and synchronizes the Supabase Auth project URL configuration. The configured public URL becomes the Auth `site_url`; its recovery redirect is added while existing allowed redirect URLs are preserved.

### Required server variables

Add these values to the gitignored `.env` on the deployment host:

```env
NUXT_SUPABASE_PROJECT_REF=<supabase-project-ref>
NUXT_SUPABASE_MANAGEMENT_TOKEN=<supabase-personal-access-token>
```

- Create the PAT in **Supabase Account > Access Tokens**.
- A PAT is an account-level Management API credential. It is not a publishable project API key and not a secret project API key.
- Keep the PAT server-only. Never commit `.env`, print the token in logs, or expose it through any `NUXT_PUBLIC_*` variable.

### Deploy and verify

The variables must be present when Nuxt builds and when PM2 starts the server so `runtimeConfig` is available in both phases:

```bash
bash scripts/deploy.sh
```

If deploying manually, source the environment before building and reload PM2 with the updated environment:

```bash
set -a; source .env; set +a
pnpm build
pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save
```

1. Save the public domain in `/cocina/configuracion`.
2. Generate a **new** recovery email and follow it. Do not reuse one-time recovery tokens from before the sync.
3. If Auth synchronization fails, the database configuration may still persist while the API returns `502`. Check server logs for the sync error without printing or exposing the PAT.

### Multi-tenant deployment caveat

Supabase Auth URL configuration is project-level, not tenant-level. This automation assumes one deployment and tenant per Supabase project. Shared multi-tenant projects must preserve the existing redirect allowlist, and their operational policy for Auth URL ownership must be reviewed before enabling this workflow.

## A tener en cuenta

- `ecosystem.config.cjs` pasa un subconjunto de vars de entorno al proceso Node. Si se añade una nueva variable runtime, hay que añadirla también a `ecosystem.config.cjs` en la sección `env`.
- `NUXT_PUBLIC_SUPABASE_COOKIE_SECURE` se usa en `nuxt.config.ts` en build time, no necesita estar en `ecosystem.config.cjs` porque ya queda inlineada en el build.
