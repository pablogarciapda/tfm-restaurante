// PM2 ecosystem config for La Zíngara (Nuxt 4 production server).
//
// Nuxt reads .env at BUILD time (dev/build/generate) but NOT at production runtime —
// the Node process must receive these vars via its environment. Run via scripts/deploy.sh,
// which sources the gitignored .env before starting pm2 so process.env is populated and
// this config can read it.
//
// Required vars (see .env.example): NUXT_PUBLIC_SUPABASE_URL, NUXT_PUBLIC_SUPABASE_KEY,
// SUPABASE_SERVICE_ROLE_KEY, NUXT_PUBLIC_SITE_URL. Without them the @nuxtjs/supabase
// server plugin throws createServerClient(undefined, ...) at boot, which aborts the
// subsequent Pinia plugin (its app:rendered hook then reads $pinia.state.value on
// undefined) and 500s every SSR route.

module.exports = {
  apps: [
    {
      name: 'tfm',
      script: '.output/server/index.mjs',
      cwd: __dirname,
      exec_mode: 'fork',
      instances: 1,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        // Supabase (required — server plugin + SSR data fetches need these at runtime)
        NUXT_PUBLIC_SUPABASE_URL: process.env.NUXT_PUBLIC_SUPABASE_URL,
        NUXT_PUBLIC_SUPABASE_KEY: process.env.NUXT_PUBLIC_SUPABASE_KEY,
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
        // App (runtimeConfig.public)
        NUXT_PUBLIC_SITE_URL: process.env.NUXT_PUBLIC_SITE_URL || 'https://www.lazingara.es',
        // SMS (defaults to mock — set NUXT_SMS_PROVIDER=labsmobile + creds to enable real SMS)
        NUXT_SMS_PROVIDER: process.env.NUXT_SMS_PROVIDER || 'mock',
        NUXT_LABS_MOBILE_USERNAME: process.env.NUXT_LABS_MOBILE_USERNAME,
        NUXT_LABS_MOBILE_TOKEN: process.env.NUXT_LABS_MOBILE_TOKEN,
        NUXT_LABS_MOBILE_SENDER: process.env.NUXT_LABS_MOBILE_SENDER,
        NUXT_LABS_MOBILE_TEST: process.env.NUXT_LABS_MOBILE_TEST,
      },
    },
  ],
}
