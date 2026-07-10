# Restaurante La Zíngara — Web Platform

> Plataforma web integral del Restaurante La Zíngara (Santa María del Páramo, León, España).  
> Escaparate digital público + panel de administración con gestor interactivo de mesas.

**Dominio:** https://www.lazingara.es  
**Stack:** Nuxt 4.4 + Supabase + Konva.js + Tailwind CSS

---

## Overview

| Área | Descripción |
|------|-------------|
| **Público (SSR)** | Inicio, Carta con filtros, Menú del Día, Reservas con selección de zona/mesa, Eventos, Contacto, Cancelación por token |
| **Admin (SPA)** | `/cocina/**` — Dashboard, CRUD platos/eventos/usuarios/clientes, Editor menú diario, Configuración del sistema, Gestor de mesas Konva con fusión Realtime |

## Quick Start

```bash
# Install dependencies (pnpm only)
pnpm install

# Start dev server on http://localhost:3000
pnpm dev

# Run tests
pnpm test

# Lint & typecheck
pnpm lint
pnpm typecheck
```

## Key Features

- **Carta dinámica** con categorías reales desde DB, sección recomendados configurable, subcategorías (familias) para vinos/postres
- **Menú diario** con precio configurable por día, soporte domingo/festivos, toggle agotado en vivo vía Realtime
- **Reservas inteligentes** con slot grid de 15min, selector de zona/mesa, verificación SMS, CAPTCHA Turnstile, consentimiento GDPR
- **Cancelación por token** desde email, sin login
- **Multi-tenant** — todos los datos del restaurante configurables desde admin
- **Motor de mesas Konva.js** — canvas interactivo drag & drop, fusión de mesas, aforo, filtro por zonas
- **Subida segura de imágenes** con compresión WebP client-side, sanitización Canvas, proxy de seguridad

## Deployment

See [INSTALLATION.md](./INSTALLATION.md) for VPS deployment guide.

## Project Context

Full project documentation is in [AGENTS.md](./AGENTS.md) — maintained as the source of truth for AI agent context.
