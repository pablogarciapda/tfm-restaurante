// PM2 ecosystem config for La Zíngara (Nuxt 4 production server).
//
// Nuxt reads .env at BUILD time (dev/build/generate) but NOT at production runtime —
// the Node process must receive these vars via its environment. Run via scripts/deploy.sh,
// which sources the gitignored .env before starting pm2 so process.env is populated and
// this config can read it.
//
// REQUIRED: Node >= 22. @supabase/ssr's createServerClient validates globalThis.WebSocket
// and throws "Node.js 20 detected without native WebSocket support" on Node <22 (WebSocket
// becomes a global in Node 22). That throw aborts the SSR plugin cascade — Pinia never
// initialises, its pre-registered app:rendered hook then reads $pinia.state.value on
// undefined → 500 on every SSR route. scripts/deploy.sh pins nvm to Node 22 and refuses
// to deploy on older versions; keep that gate intact.
//
// Vars (see .env.example): NUXT_PUBLIC_SUPABASE_URL, NUXT_PUBLIC_SUPABASE_KEY,
// SUPABASE_SERVICE_ROLE_KEY (server-only), NUXT_PUBLIC_SITE_URL, NUXT_SMS_PROVIDER.

module.exports = {
  apps: [
    {
      name: 'tfm',
      script: '.output/server/index.mjs',
      cwd: __dirname,
      exec_mode: 'fork',
      instances: 1,
      max_memory_restart: '512M',
      // Explicit interpreter ensures pm2 runs the .mjs with the Node 22 binary even if the
      // pm2 daemon was started under a different default. `process.execPath` resolves at
      // ecosystem evaluation time (when deploy.sh has already run `nvm use 22`), so this is
      // the same Node that ran the build.
      interpreter: process.execPath,
      env: {
        NODE_ENV: 'production',
        // Supabase (required — server plugin + SSR data fetches need these at runtime)
        NUXT_PUBLIC_SUPABASE_URL: process.env.NUXT_PUBLIC_SUPABASE_URL,
        NUXT_PUBLIC_SUPABASE_KEY: process.env.NUXT_PUBLIC_SUPABASE_KEY,
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
        // App (runtimeConfig.public)
        NUXT_PUBLIC_SITE_URL: process.env.NUXT_PUBLIC_SITE_URL || 'https://www.lazingara.es',
        // SMS (set NUXT_SMS_PROVIDER=labsmobile + creds to enable real SMS)
        NUXT_SMS_PROVIDER: process.env.NUXT_SMS_PROVIDER || 'labsmobile',
        NUXT_LABS_MOBILE_USERNAME: process.env.NUXT_LABS_MOBILE_USERNAME,
        NUXT_LABS_MOBILE_TOKEN: process.env.NUXT_LABS_MOBILE_TOKEN,
        NUXT_LABS_MOBILE_SENDER: process.env.NUXT_LABS_MOBILE_SENDER,
        NUXT_LABS_MOBILE_TEST: process.env.NUXT_LABS_MOBILE_TEST,
      },
    },
  ],
}
