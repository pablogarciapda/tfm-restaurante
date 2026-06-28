# AGENTS.md — La Zíngara

> Instrucciones y contexto del proyecto para agentes IA. Mantener actualizado conforme evoluciona el código.

## 1. Proyecto

- **Nombre:** Restaurante La Zíngara
- **Ubicación:** Santa María del Páramo, León, España
- **Dominio:** www.lazingara.es
- **Propósito:** Plataforma web integral del Restaurante La Zíngara: escaparate digital para clientes (carta, menú, reservas, eventos) + sistema de gestión interna (`/cocina`) con plano interactivo de mesas.

## 2. Stack Tecnológico

| Capa           | Tecnología                                       |
| -------------- | ------------------------------------------------ |
| Frontend       | Nuxt 4 (4.4.8) — SSR público, SPA admin (`/cocina/**`) |
| Estilos        | Tailwind CSS                                     |
| Motor gráfico  | `konva` + `vue-konva` (Canvas 2D, 60 FPS)         |
| BaaS           | Supabase (PostgreSQL, Realtime, Auth, Storage)   |
| Despliegue     | VPS dedicado, Nuxt en modo Node persistente      |

### Convenciones del stack

- **Package manager:** pnpm (obligatorio; NO usar npm ni yarn). Lock `pnpm-lock.yaml` como fuente única de verdad.
- **Vue 3:** Composition API con `<script setup>` + TypeScript. NO usar Options API.
- **Nuxt 4:** `srcDir` = `app/` (app/pages, app/components, app/composables, app/layouts, app/middleware, app/plugins, app/utils, app/assets, app/app.vue). Root conserva `server/`, `public/`, `shared/`, `nuxt.config.ts`. Rutas basadas en ficheros; `/cocina/**` es middleware-protegido (configurado vía `routeRules: { ssr: false }` para modo SPA).
- **Tailwind:** utilidades first; evitar CSS custom salvo casos justificados.
- **Supabase:** acceso vía `@supabase/supabase-js`; nunca exponer la service role key en el cliente.

## 3. Requerimientos No Funcionales (OBLIGATORIOS)

- **Arquitectura modular:** diseño por módulos independientes, responsabilidad única (SRP) y bajo acoplamiento. Ningún módulo depende de la implementación interna de otro. Toda interacción entre módulos se realiza mediante interfaces, contratos o eventos — NUNCA mediante referencias internas. Los contratos viven en `shared/` (auto-importado ambos lados en Nuxt 4).
- **Seguridad:** OWASP Top 10 (2025). RLS en TODAS las tablas de Supabase. Protección de rutas admin en Nuxt middleware. HTTPS obligatorio.
- **Calidad:** TDD (Test Driven Development). Escribir tests antes o junto con la implementación.
- **Rendimiento gráfico:** Canvas HTML5 acelerado por hardware, 60 FPS en el gestor de mesas.

## 4. Modelo de Datos (PostgreSQL / Supabase)

- **configuracion** (`id`, `cliente_elige_mesa`, `capacidad_total_local`)
- **platos** (`id`, `nombre`, `descripcion`, `precio`, `categoria`, `tipo_menu`, `imagen_url`, `disponible`, `calorias`, `alergenos` text[])
- **mesas** (`id`, `numero_mesa`, `capacidad_base`, `posicion_x`, `posicion_y`, `ancho`, `alto`, `rotacion`, `zona`, `mesa_padre_id` FK, `id_fusion`, `capacidad_actual`)
- **reservas** (`id`, `nombre_cliente`, `telefono`, `email`, `fecha_hora`, `numero_comensales`, `estado`, `mesa_id` FK)

### Lógica de fusión de mesas

- Dos o más mesas se unen lógicamente -> generan `id_fusion` compartido y `mesa_padre_id`.
- La capacidad recalculada NO es la suma literal: dos mesas de 4 fusionadas alojan 6 (no 8). Aplicar la regla de capacidad realista en el cálculo.
- La ocupación resta del `capacidad_total_local` configurable.

## 5. Rutas

### Públicas (SSR, SEO)

- `/` -> Inicio
- `/carta` -> Carta (filtro por alérgenos + info calórica)
- `/menu-diario` -> Menú del Día
- `/reservas` -> Formulario / selección de mesa (según `configuracion.cliente_elige_mesa`)
- `/eventos` -> Eventos
- `/contacto` -> Contacto

### Administración (SPA, protegidas tras login en `/cocina`)

- `/cocina` -> Login ciego (Supabase Auth)
- `/cocina/dashboard` -> Métricas y aforo actual
- `/cocina/carta` -> CRUD platos y menús
- `/cocina/reservas` -> Mapa interactivo Konva + fusiones + sync Realtime
- `/cocina/configuracion` -> Ajustes del sistema

## 6. Funcionalidades Clave

### Vista pública

- Home con filosofía y accesos directos.
- Carta con filtros de alérgenos y calorías.
- Menú diario dinámico.
- Reservas inteligentes: modo "cliente elige mesa" (selector sobre plano) o "reserva estándar" (resta aforo).
- Eventos en cartelera.
- Contacto con mapa y formulario.

### Panel `/cocina`

- Dashboard con menú lateral.
- CRUDs: platos (carta/menú), alérgenos, calorías, eventos.
- **Gestor Canvas (Konva.js):**
  - Drag & drop, rotación y redimensión de mesas.
  - **Modo Fusión:** unión lógica con `id_fusion`, recalculo de capacidad, ID de mesa unida.
  - Resta automática del aforo total del restaurante.
  - Sincronización Realtime vía WebSockets.

## 7. Roadmap / MVP

- **Fase 1 — MVP Usuario:** maquetación frontend pública, SEO local, lectura de carta/menú, reservas por formulario.
- **Fase 2 — Panel & Auth:** ruta ciega `/cocina`, Supabase Auth, menús de navegación, CRUDs de platos y eventos.
- **Fase 3 — Motor de Mesas:** plano Konva.js, lógica de fusiones en BD, sincronización Realtime.

## 8. Reglas para agentes IA

- **Idioma de artefactos técnicos:** inglés por defecto (código, identificadores, comments). UI copy en español (es-ES, neutro) salvo指示 explícito.
- **Idioma de conversación:** matching el del usuario.
- **Testing:** TDD. Detectar runner antes de empezar (`mem_search` "sdd-init/tfm-restaurant"). Si no hay tests, proponer setup antes de implementar.
- **DB:** toda migración vía Supabase migration tool; nunca hardcodear IDs generados.
- **RLS:** revisar `supabase_get_advisors` type=security después de cambios de schema.
- **No crear archivos de documentación** salvo petición explícita.
- **Commits:** conventional commits, sin atribución AI.

## 9. Estructura de carpetas (a definir conforme avanza el proyecto)

```
tfm-restaurant/
├── AGENTS.md              # este archivo
├── doc/                   # documentación de referencia
├── capturas web/          # assets de diseño
└── (aplicación Nuxt)      # bootstrap en Fase 1
```