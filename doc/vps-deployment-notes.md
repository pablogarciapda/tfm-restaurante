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

## A tener en cuenta

- `ecosystem.config.cjs` pasa un subconjunto de vars de entorno al proceso Node. Si se añade una nueva variable runtime, hay que añadirla también a `ecosystem.config.cjs` en la sección `env`.
- `NUXT_PUBLIC_SUPABASE_COOKIE_SECURE` se usa en `nuxt.config.ts` en build time, no necesita estar en `ecosystem.config.cjs` porque ya queda inlineada en el build.
