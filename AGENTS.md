# AGENTS.md — La Zíngara

> Instrucciones y contexto del proyecto para agentes IA. Mantener actualizado conforme evoluciona el código.

## 1. Proyecto

- **Nombre:** Restaurante La Zíngara
- **Ubicación:** Santa María del Páramo, León, España
- **Dominio:** www.lazingara.es
- **Propósito:** Plataforma web integral del Restaurante La Zíngara: escaparate digital para clientes (carta, menú, reservas, eventos) + sistema de gestión interna (`/cocina`) con plano interactivo de mesas.

## 2. Stack Tecnológico

| Capa          | Tecnología                                             |
| ------------- | ------------------------------------------------------ |
| Frontend      | Nuxt 4 (4.4.8) — SSR público, SPA admin (`/cocina/**`) |
| Estilos       | Tailwind CSS                                           |
| Motor gráfico | `konva` + `vue-konva` (Canvas 2D, 60 FPS)              |
| BaaS          | Supabase (PostgreSQL, Realtime, Auth, Storage)         |
| Testing       | Vitest (unit) + Playwright (e2e)                       |
| Despliegue    | VPS dedicado, Nuxt en modo Node persistente            |

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

### `configuracion`
| Columna | Tipo | Default | Notas |
|---------|------|---------|-------|
| `id` | `uuid` | gen_random_uuid() | PK |
| `cliente_elige_mesa` | `boolean` | false | |
| `capacidad_total_local` | `integer` | null | Check 1..999. Deprecated — usar zonas_config |
| `modo_ocupacion` | `text` | 'auto' | 'auto' \| 'manual' |
| `ocupacion_manual` | `integer` | 0 | >= 0 |
| `precio_menu_diario` | `numeric` | null | Precio menú diario (lun-vie) |
| `precio_menu_sabado` | `numeric` | null | Precio menú sábado |
| `precio_menu_domingo` | `numeric` | null | Precio menú domingo/festivos. Si null/0, no hay menú dominical |
| `mostrar_recomendados` | `boolean` | true | Muestra sección recomendados en carta |
| `titulo_recomendados` | `varchar` | 'Nuestras Recomendaciones' | Título personalizable |
| `max_ancho_imagen` | `integer` | 1200 | Check 200..4096. Ancho máximo compresión imágenes |
| `calidad_imagen` | `integer` | 80 | Check 10..100. Calidad WebP |
| `max_peso_imagen` | `integer` | 5 | Check 1..20. Peso máximo en MB |
| `auto_comprimir_imagen` | `boolean` | true | Comprimir automáticamente al subir |
| `smtp_host` | `text` | null | Servidor SMTP |
| `smtp_port` | `integer` | null | Puerto SMTP |
| `smtp_user` | `text` | null | Usuario SMTP |
| `smtp_from_email` | `text` | null | Email remitente |
| `smtp_password` | `text` | null | Write-only desde admin, nunca se expone en API |
| `smtp_security` | `text` | 'auto' | 'auto' \| 'tls' \| 'starttls' |
| `smtp_from_name` | `text` | 'Restaurante La Zíngara' | Nombre remitente emails |
| `texto_proteccion_datos` | `text` | null | Texto GDPR para formulario reservas |
| `modo_reserva` | `text` | 'automatica' | 'automatica' \| 'verificada' |
| `cliente_elige_zona` | `text` | 'none' | 'none' \| 'zona' \| 'zona_mesa' |
| `captcha_habilitado` | `boolean` | false | Cloudflare Turnstile toggle |
| `sms_verificacion` | `boolean` | false | Requerir verificación SMS independiente |
| `notificacion_reserva` | `text` | 'email' | 'email' \| 'sms' \| 'ambos' |
| `horarios_config` | `jsonb` | '{}' | Horarios apertura (comida/cena, intervalo) |
| `zonas_config` | `jsonb` | '{}' | Zonas del local (nombre, capacidad, enabled) |
| `public_config` | `jsonb` | '{}' | Cache de datos públicos (horarios, zonas, GDPR) |
| `restaurant_nombre` | `text` | 'La Zíngara' | Nombre del restaurante (multi-tenant) |
| `restaurant_direccion` | `text` | 'Plaza Mayor...' | Dirección completa |
| `restaurant_telefono` | `text` | '987 123 456' | Teléfono de contacto |
| `restaurant_maps_url` | `text` | '(Google Maps URL)' | URL Google Maps |
| `restaurant_logo_url` | `text` | null | Logo del restaurante |
| `restaurant_icon_url` | `text` | null | Favicon/icono |
| `site_url` | `text` | null | Dominio público (ej: https://www.lazingara.es). Usado en emails |
| `restaurant_email` | `text` | null | Email público de contacto |
| `restaurant_instagram_url` | `text` | null | URL perfil Instagram |
| `restaurant_facebook_url` | `text` | null | URL página Facebook |
| `poblacion` | `text` | null | Localidad para subtítulos |

### `platos`
| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | `uuid` | PK |
| `nombre` | `text` | Unique |
| `descripcion` | `text` | Nullable |
| `precio` | `numeric` | |
| `categoria` | `text` | Se normaliza a mayúsculas |
| `tipo_menu` | `text` | 'carta' \| 'menu' \| null |
| `imagen_url` | `text` | Nullable |
| `disponible` | `boolean` | Default true |
| `calorias` | `integer` | Nullable |
| `alergenos` | `text[]` | Nullable |
| `puesto` | `integer` | Orden dentro de categoría |
| `recomendado` | `boolean` | Default false |
| `familia_id` | `uuid` | Nullable, FK → familias. Subcategoría (ej: D.O. vino) |
| `created_at` / `updated_at` | `timestamptz` | |

### `categorias`
| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | `uuid` | PK |
| `nombre` | `text` | Unique, uppercase |
| `puesto` | `integer` | Orden de aparición en carta |
| `created_at` | `timestamptz` | |

### `categorias_eventos`
| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | `uuid` | PK |
| `nombre` | `text` | Unique |
| `puesto` | `integer` | Orden de aparición |
| `created_at` | `timestamptz` | |

### `familias`
| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | `uuid` | PK |
| `nombre` | `text` | Nombre de la familia (ej: TINTOS D.O. LEÓN) |
| `categoria_id` | `uuid` | FK → categorias. Categoría padre |
| `puesto` | `integer` | Orden de aparición |
| `created_at` | `timestamptz` | |

### `menu_diario_config`
| Columna | Tipo | Default | Notas |
|---------|------|---------|-------|
| `id` | `uuid` | gen_random_uuid() | PK |
| `day_of_week` | `integer` | | 0-6, unique |
| `precio` | `text` | | Precio desde `configuracion` |
| `activo` | `boolean` | false | |
| `fecha` | `date` | null | Nullable |
| `secciones_config` | `jsonb` | '{}' | Activación por sección + títulos personalizados |
| `es_festivo` | `boolean` | false | Usa precio_menu_domingo aunque no sea domingo |
| `created_at` / `updated_at` | `timestamptz` | | |

### `menu_diario_items`
| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | `uuid` | PK |
| `config_id` | `uuid` | FK → menu_diario_config |
| `seccion` | `text` | 'primer' \| 'segundo' \| 'postre' \| 'bebida' \| 'pan' |
| `plato_nombre` | `text` | |
| `descripcion` | `text` | Nullable |
| `puesto` | `integer` | Orden dentro de sección |
| `agotado` | `boolean` | Default false. Marcar plato como agotado del día |

### `mesas`
| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | `uuid` | PK |
| `numero_mesa` | `integer` | |
| `capacidad_base` | `integer` | Check 1..20 |
| `posicion_x/y` | `numeric` | Default 0 |
| `ancho/alto` | `numeric` | Min 40 |
| `rotacion` | `numeric` | Default 0 |
| `zona` | `text` | 'Principal' \| 'Zingaro' \| 'Privado' \| 'Terraza' \| 'Bar' |
| `zona_nombre` | `text` | Nullable, nombre de zona editable |
| `forma` | `text` | 'rectangular' \| 'cuadrada' \| 'redonda' \| 'ovalada' |
| `mesa_padre_id` | `uuid` | FK → mesas (autoreferencial, para fusiones) |
| `id_fusion` | `uuid` | Nullable, grupo de fusión |
| `capacidad_actual` | `integer` | >= 0 |

### `reservas`
| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | `uuid` | PK |
| `fecha_hora` | `timestamptz` | |
| `numero_comensales` | `integer` | Nullable |
| `estado` | `text` | 'pendiente' \| 'confirmada' \| 'cancelada' \| 'completada' \| 'standby' |
| `mesa_id` | `uuid` | FK → mesas, nullable |
| `cliente_id` | `uuid` | FK → clientes, nullable |
| `zona_id` | `text` | Nullable, id de zona desde zonas_config |
| `cancel_token` | `uuid` | Nullable, unique. Token para cancelación sin auth |
| `cancelado_en` | `timestamptz` | Nullable, momento de la cancelación |
| `created_at` | `timestamptz` | Default now() |

### `clientes`
| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | `uuid` | PK, gen_random_uuid() |
| `nombre` | `text` | |
| `apellidos` | `text` | Nullable |
| `telefono` | `text` | Unique |
| `email` | `text` | Nullable |
| `gdpr_aceptado` | `boolean` | Default false |
| `gdpr_aceptado_at` | `timestamptz` | Nullable |
| `created_at` / `updated_at` | `timestamptz` | Default now() |

### `dias_bloqueados`
| Columna | Tipo | Default | Notas |
|---------|------|---------|-------|
| `id` | `uuid` | gen_random_uuid() | PK |
| `fecha` | `date` | | Unique, día bloqueado |
| `recurrente` | `boolean` | false | Se repite cada año (ej: Navidad) |
| `fecha_fin` | `date` | null | Para rangos de fechas |
| `motivo` | `text` | null | Razón del bloqueo |
| `created_at` | `timestamptz` | now() | |

### `eventos`
| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | `uuid` | PK |
| `titulo` | `text` | |
| `descripcion` | `text` | Nullable |
| `fecha` | `timestamptz` | |
| `categoria_id` | `uuid` | FK → categorias_eventos, nullable |
| `imagen_url` | `text` | Nullable |
| `capacidad` | `integer` | Nullable |
| `estado` | `text` | Default 'programado' |
| `activo` | `boolean` | Default true |

### `profiles`
| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | `uuid` | PK, FK → auth.users |
| `role` | `text` | 'admin' \| 'editor' |
| `permissions` | `jsonb` | Permisos granulares |
| `activo` | `boolean` | Default true |

### Lógica de fusión de mesas

- Dos o más mesas se unen lógicamente -> generan `id_fusion` compartido y `mesa_padre_id`.
- La capacidad recalculada NO es la suma literal: dos mesas de 4 fusionadas alojan 6 (no 8). Aplicar la regla de capacidad realista en el cálculo.
- La ocupación resta del `capacidad_total_local` configurable.

## 5. Rutas

### Públicas (SSR, SEO)

- `/` -> Inicio
- `/carta` -> Carta con filtro por alérgenos, info calórica, sección recomendados configurable, subcategorías (familias)
- `/menu-diario` -> Menú del Día (precio desde Configuración, agotado toggle en vivo via Realtime)
- `/reservas` -> Formulario con slot grid (15min), selector de zona/mesa según `configuracion`, GDPR, verificación SMS
- `/eventos` -> Eventos
- `/contacto` -> Contacto
- `/cancelar` -> Cancelación de reserva por token (sin auth, desde email)

### Administración (SPA, protegidas tras login en `/cocina`)

- `/cocina` -> Login ciego (Supabase Auth)
- `/cocina/dashboard` -> Métricas y aforo actual
- `/cocina/carta` -> CRUD platos con sticky layout, filtro por categorías reales (tabla `categorias`), columna recomendado
- `/cocina/menu-diario` -> Editor menú diario (crear/editar config por día, precio desde `configuracion`, fecha read-only)
- `/cocina/eventos` -> CRUD eventos (categorías dinámicas desde DB)
- `/cocina/reservas` -> Mapa interactivo Konva + fusiones + sync Realtime + lista de reservas + modal reasignar zona/mesa
- `/cocina/clientes` -> CRUD clientes con historial de reservas
- `/cocina/configuracion` -> Ajustes del sistema (precios, capacidad, recomendados, horarios, zonas, días bloqueados, categorías CRUD, SMTP, datos restaurante multi-tenant, precio menú domingo) con toast de confirmación
- `/cocina/usuarios` -> Gestión de usuarios y permisos

## 6. Funcionalidades Clave

### Vista pública

- Home con filosofía y accesos directos.
- Carta con filtros de alérgenos y calorías, categorías ordenadas por `categorias.puesto`, sección recomendados configurable (título + toggle desde admin), subcategorías (familias) con FamilySelector horizontal scroll.
- Menú diario dinámico (precio desde Configuración), con Realtime para toggle agotado en vivo, soporte domingo/festivos.
- Reservas inteligentes: modo "cliente elige mesa" (selector sobre plano) o "reserva estándar" (resta aforo). Incluye step de consentimiento GDPR, verificación SMS opcional (según `modo_reserva`), selector de zona/mesa según `cliente_elige_zona`, y slot grid de 15 minutos basado en horarios configurables. Detecta días bloqueados automáticamente.
- Eventos en cartelera.
- Contacto con mapa y formulario.
- Cancelación de reservas: página `/cancelar` con token único desde email, preview de datos, confirmación antes de cancelar.

### Panel `/cocina`

- Dashboard con menú lateral.
- CRUDs: platos (carta/menú), alérgenos, calorías, eventos.
- **Gestor Canvas (Konva.js):**
  - Drag & drop, rotación y redimensión de mesas.
  - **Modo Fusión:** unión lógica con `id_fusion`, recalculo de capacidad, ID de mesa unida.
  - Resta automática del aforo total del restaurante.
  - Sincronización Realtime vía WebSockets.
  - Formas de mesa configurables (rectangular, cuadrada, redonda, ovalada).
  - Filtro por zonas con ZoneSection y AforoIndicator.
  - StandbyBanner para reservas pendientes de reasignación por fusión.
  - FusionConfirmDialog para manejar reservas afectadas por fusión.
- **Configuración:** Toast de confirmación al guardar, CRUD inline de categorías con drag-and-drop reorder, modo ocupación, precios menú diario y sábado, precio menú domingo, CRUD categorías de eventos, **horarios configurables** (comida/cena, intervalo), **zonas editables** (nombre, capacidad, enable/disable), **días bloqueados** (individuales + recurrentes + rangos), configuración SMTP (write-only password), **datos restaurante multi-tenant** (nombre, dirección, teléfono, email, redes sociales, logo).
- **Carta Admin:** Layout sticky (toolbar fuera de scroll), drag-and-drop reorder por categoría, columna "Recomendado" con estrella clicable (★/☆), selector de familia/subcategoría, upload de imágenes con compresión WebP y ImageLightbox.
- **Eventos Admin:** Formulario con categorías dinámicas desde `categorias_eventos`, tabla con labels desde DB.
- **Clientes Admin:** CRUD completo con tabla, formulario de creación/edición, historial de reservas por cliente.
- **Reservas Admin:** Lista de reservas con filtro por fecha + modal de reasignación (cambiar zona/mesa en una reserva existente con motivo obligatorio) + modal de confirmación de reservas pendientes con notificación configurable.

## 7. Roadmap / MVP — Estado Actual

| Fase | Estado | Descripción |
|------|--------|-------------|
| **Fase 1 — MVP Usuario** | ✅ **Completado** | Maquetación frontend pública, SEO local, carta/menú dinámicos, reservas por formulario, eventos, contacto |
| **Fase 2 — Panel & Auth** | ✅ **Completado** | Ruta `/cocina`, Supabase Auth, CRUDs platos/eventos/usuarios, configuración del sistema con notificaciones, sticky layout, categorías reales, sección recomendados configurable |
| **Fase 3 — Motor de Mesas** | 🔄 **En Progreso (Parcial)** | Plano Konva.js (TableCanvas, TableToolbar), formas de mesa, fusión lógica con FusionConfirmDialog, StandbyBanner para reservas standby, AforoIndicator, sincronización Realtime, filtro por zonas |

### Detalle de lo completado en Fase 2

- Autenticación Supabase con rutas protegidas
- CRUD completo de platos con sticky layout, orden por puesto, filtro por categorías reales
- Editor menú diario con precio desde Configuración, fecha read-only, crear/editar por día
- **CRUD eventos con categorías dinámicas:** tabla `categorias_eventos` con relaciones FK, formulario carga categorías desde DB, gestión de categorías desde Configuración
- Gestión de usuarios y permisos (roles, permisos granulares)
- **Configuración del sistema:** precios menú, capacidad, modo ocupación, categorías CRUD inline con auto-uppercase y orden, toggle recomendados + título personalizable, categorías de eventos CRUD, notificaciones toast con auto-dismiss
- **Drag & drop en carta admin:** reorden de platos por categoría vía HTML5 DnD
- **Drag & drop en menú diario:** reorden independiente por sección (primer/segundo/postre/bebida/pan)
- **Menú diario secciones:** configuración por sección (checkbox activo + título editable) vía JSONB
- **Estrella recomendado clicable:** ★/☆ toggle directo sin abrir formulario
- **Precio 0 → "Consultar":** en carta pública cuando el precio es 0
- **Correcciones SSR:** hydration mismatches resueltos en carta pública (activeCategory, key groups, v-else → div)
- 28 platos reasignados de "NUESTRAS RECOMENDACIONES" a categorías reales
- 767 tests unitarios pasando (6 pre-existing failures en test/unit/layouts/cocina.test.ts + nuxt smoke tests; 41 adicionales por refactor de ConfiguracionForm.vue y slots.ts)
- **Reserva con GDPR, SMS y slot grid:** formulario con step de consentimiento, verificación SMS opcional, selector de zona/mesa, slots de 15 minutos en horarios configurables
- **GDPR tracking:** consentimiento explícito registrado en `clientes.gdpr_aceptado` + `gdpr_aceptado_at`. Sincronización automática de datos del cliente (nombre/apellidos/email) desde el formulario de reserva
- **SMS toggle independiente:** `sms_verificacion` separado de `modo_reserva`. Control independiente para requerir verificación SMS
- **Notificación configurable:** `notificacion_reserva` soporta `email` | `sms` | `ambos`. Se aplica tanto en reservas públicas como en confirmación desde admin
- **Admin confirmar reserva:** modal para confirmar reservas pendientes con asignación opcional de mesa y envío de notificación según configuración
- **Referencia legible:** función `generarReferencia(uuid, fecha)` en `shared/utils/referencia.ts` para mostrar al cliente
- **CAPTCHA Turnstile:** integración Cloudflare Turnstile con toggle en configuración
- **SMTP security:** selector TLS/STARTTLS para conexión SMTP
- **CRUD clientes:** tabla `clientes` con FK en reservas, 4 endpoints API, formulario con historial de reservas
- **Configuración SMTP:** campos write-only, servidor/puerto/configurables, test endpoint
- **GET /api/config -> admin-only:** seguridad hardening, nunca expone smtp_password
- **GET /api/public-config:** endpoint público con horarios, zonas enabled, GDPR text, modo_reserva
- **Horarios configurables:** comida/cena con horario de inicio/fin e intervalo (15/30min)
- **Zonas editables:** JSONB array con nombre, capacidad, enabled. Capacidad total deducida de zonas habilitadas (264: Principal=70, Reservado=14, Zíngaro=60, Terraza=100, Bar=20)
- **Días bloqueados:** tabla `dias_bloqueados` con soporte para fecha única, recurrente (MM-DD) y rangos
- **Rate limiting SMS:** 1 request/phone/min + 5 request/IP/min
- **Phone normalization:** shared/utils/phone.ts (disponible client+server)
- **Multi-tenant (Datos Restaurante):** Todos los datos del restaurante (nombre, dirección, teléfono, email, redes sociales, logo) son configurables desde admin via `useRestaurantConfig` + `RestaurantConfig` contract en `shared/`. Header y footer públicos leen estos datos dinámicamente.
- **Realtime Carta:** Subscripción Realtime en `onMounted` para actualizar platos en vivo (INSERT/UPDATE/DELETE). También escucha cambios en `categorias` y `familias`.
- **Realtime Menú Diario:** Subscripción Realtime para actualizar platos del menú y precio en vivo cuando admin marca items como `agotado`.
- **D.O. Vinos/Subcategorías (familias):** Tabla `familias` con FK → `categorias`. `platos.familia_id` permite asignar plato a subcategoría. `FamilySelector` como segundo scroll horizontal en carta pública. `PlatoForm` carga familias dinámicamente según categoría seleccionada.
- **Cancelación por token:** Página `/cancelar` con token UUID único por reserva. Endpoints GET `/api/reservas/cancelar-info` y POST `/api/reservas/cancelar`. Preview de datos antes de confirmar. Token se envía en email de confirmación.
- **Precio menú domingo:** `configuracion.precio_menu_domingo` para menú dominical. Si null/0, no hay menú los domingos. `menu_diario_config.es_festivo` permite aplicar precio dominical a festivos entre semana.
- **Agotado en menú diario:** Columna `agotado` en `menu_diario_items`. Toggle en vivo desde admin. Se muestra visualmente (tachado + indicador rojo) en front público en tiempo real via Realtime.
- **useImageUpload:** Composable de subida de imágenes con compresión client-side WebP vía Canvas (strips metadatos, sanitiza SVG). Subida a Supabase Storage via proxy URL. Soporta upload desde file y desde URL externa.
- **ImageLightbox:** Modal de previsualización de imagen ampliada en PlatoForm.
- **Configuración restauante multi-tenant:** Sección "Datos del Restaurante" en Configuración con nombre, dirección, teléfono, URL mapa, email, Instagram, Facebook, logo, site_url, población. Todos configurables y persistidos en `configuracion` row.
- **HTTP security headers:** Cabeceras de seguridad vía Nitro hook en `server/plugins/security-headers.ts`.

## 8. Reglas para agentes IA

- **Idioma de artefactos técnicos:** inglés por defecto (código, identificadores, comments). UI copy en español (es-ES, neutro) salvo指示 explícito.
- **Idioma de conversación:** matching el del usuario.
- **Testing:** TDD. Detectar runner antes de empezar (`mem_search` "sdd-init/tfm-restaurant"). Si no hay tests, proponer setup antes de implementar.
- **DB:** toda migración vía Supabase migration tool; nunca hardcodear IDs generados.
- **RLS:** revisar `supabase_get_advisors` type=security después de cambios de schema.
- **No crear archivos de documentación** salvo petición explícita.
- **Commits:** conventional commits, sin atribución AI.

## 9. Estructura de carpetas

```
tfm-restaurant/
├── AGENTS.md                  # Este archivo — contexto del proyecto
├── app/                       # Nuxt srcDir (SSR público + SPA admin)
│   ├── app.vue                # Entry point Nuxt
│   ├── assets/                # Imágenes, estilos globales
│   ├── components/            # 29 componentes (ver listado abajo)
│   ├── composables/           # useAuth, usePlatos, useMenuDiario, useEventos, useRestaurantConfig, useImageUpload
│   ├── features/              # Módulos feature
│   │   └── mesas/             # Motor de mesas (stores, components, composables)
│   ├── layouts/               # Layouts Nuxt
│   ├── middleware/             # Protección rutas admin
│   ├── pages/                 # 7 páginas (ver rutas sección 5)
│   │   └── cocina/            # 9 páginas admin
│   ├── plugins/               # Plugins Nuxt (Supabase, Konva, etc.)
│   ├── stores/                # Pinia stores
│   ├── types/                 # database.types.ts (generado desde Supabase)
│   └── utils/                 # Utilidades
├── capturas web/              # Assets de diseño (referencia visual)
├── doc/                       # Documentación de referencia
├── nuxt.config.ts             # Config Nuxt 4
├── openspec/                  # Artefactos SDD (especificaciones)
├── public/                    # Estáticos (favicon, robots.txt, etc.)
├── scripts/                   # Scripts auxiliares
├── server/                    # API routes, plugins, middleware server-side
│   ├── api/                   # Endpoints Nitro
│   │   ├── admin/             # Admin reasignar zona/mesa
│   │   ├── cocina/clientes/   # CRUD clientes + historial reservas
│   │   ├── cocina/reservas/   # Confirmar reserva manual
│   │   ├── cocina/smtp/       # Test conexión SMTP
│   │   ├── cocina/usuarios/   # Gestión usuarios
│   │   ├── dias-bloqueados/   # CRUD días bloqueados
│   │   ├── reservas/          # Cancelación por token (cancelar-info.get, cancelar.post)
│   │   ├── config.get.ts      # GET /api/config (admin-only)
│   │   ├── config.post.ts     # POST /api/config (admin)
│   │   ├── config.handlers.ts # Lógica compartida config
│   │   ├── public-config.get.ts # GET /api/public-config (público)
│   │   ├── reservas.handlers.ts # Lógica compartida reservas
│   │   ├── images/[...path].get.ts # Proxy de imágenes Supabase Storage
│   │   ├── fetch-image.get.ts # Proxy para descargar imágenes externas
│   │   └── ...                # Endpoints existentes
│   ├── plugins/               # Hooks server (Supabase admin client, security-headers, etc.)
│   ├── sms/                   # Lógica SMS (verificación)
│   └── utils/                 # email.ts, rate-limit.ts, validation.ts, sms-*.ts, image-security.ts
├── shared/                    # Contratos, tipos, utilidades compartidas (ambos lados)
│   ├── contracts/             # mesas.contract.ts, reservation.contract.ts, sms.contract.ts
│   ├── db/                    # Acceso a base de datos (compartido)
│   ├── fixtures/              # Datos de prueba
│   ├── types/                 # Tipos compartidos
│   └── utils/                 # phone.ts, slots.ts, fusion-math.ts, referencia.ts
├── test/                      # Tests
│   ├── __fixtures__/          # Fixtures de prueba
│   ├── e2e/                   # Tests Playwright
│   ├── nuxt/                  # Tests de integración Nuxt
│   ├── unit/                  # Tests unitarios Vitest
│   └── utils/                 # Utilidades de test
├── vitest.config.ts
├── playwright.config.ts
├── nuxt.config.ts
├── tsconfig.json
├── package.json
├── pnpm-lock.yaml
└── pnpm-workspace.yaml
```

### Componentes (app/components/)

| Componente | Propósito |
|-----------|-----------|
| `AdminSidebar` | Menú lateral admin |
| `AppFooter` | Footer público |
| `AppHeader` | Header público |
| `BaseButton` | Botón base reutilizable |
| `BaseCard` | Card base |
| `CategorySelector` | Selector de categorías |
| `ClienteForm` | CRUD formulario clientes |
| `ClientesTable` | Tabla clientes admin |
| `ConfiguracionForm` | Formulario configuración sistema (precios, capacidad, categorías CRUD, horarios, zonas, días bloqueados, SMTP, datos restaurante) |
| `ContactForm` | Formulario de contacto |
| `EventCard` | Card de evento público |
| `EventoForm` | CRUD formulario eventos |
| `EventosTable` | Tabla eventos admin |
| `FamilySelector` | Scroll horizontal segundo nivel para subcategorías (familias) |
| `GdprConsentModal` | Modal consentimiento GDPR para reservas |
| `MapEmbed` | Mapa embebido contacto |
| `MenuDiarioEditor` | Editor menú diario admin |
| `MetricCard` | Card métrica dashboard |
| `PageHero` | Hero sección pública |
| `PermissionsEditor` | Editor permisos usuarios |
| `PlatoForm` | CRUD formulario platos (con familias, ImageLightbox, upload imágenes) |
| `PlatosTable` | Tabla platos admin (sticky, Recom solo ★, columna familia) |
| `ProductCard` | Card plato público |
| `ProductGrid` | Grid platos público |
| `ReservationForm` | Formulario reservas con slot grid + selector zona/mesa |
| `SectionDivider` | Divisor de secciones |
| `SmsVerificationStep` | Paso verificación SMS |
| `UsuarioForm` | CRUD formulario usuarios |
| `UsuariosTable` | Tabla usuarios admin |

## 10. Decisiones de Arquitectura y Patrones

| Decisión | Contexto | Resolución |
|----------|----------|------------|
| **Precio menú diario** | El precio estaba hardcodeado en `menu_diario_config` | Leer siempre de `configuracion.precio_menu_diario` / `precio_menu_sabado` |
| **Categorías** | `platos.categoria` tenía duplicados por casing y sin orden | Tabla `categorias` con `puesto` de ordenación, auto-uppercase |
| **Recomendados** | Sección hardcodeada como "NUESTRAS RECOMENDACIONES" | Grupo sintético construido de `platos.recomendado=true`, título y visibilidad configurables |
| **SSR Hydration** | Mismatches entre server y cliente por `activeCategory` inicial | Computed fallback a primera categoría desde SSR data |
| **Sticky layout admin** | Toolbar scrolleaba con los productos | Toolbar fuera del scroll container, solo productos scrolleables |
| **Toast feedback** | Sin feedback visual al guardar configuración | Sistema de toast verde/rojo con auto-dismiss 3s |
| **Date menú diario** | Fecha modificable en editor | Fecha read-only, se gestiona vía day_of_week + activo |
| **Drag & drop nativo** | Reorden de categorías y platos en admin | HTML5 Drag & Drop nativo en vez de librerías externas (sortablejs/vuedraggable) |
| **Categorías eventos** | Categorías hardcodeadas 'festivo'/'espectaculo' | Tabla `categorias_eventos` con FK, CRUD desde Configuración |
| **Estrella recomendado** | Sin toggle visual directo en tabla admin | Estrella clicable ★/☆ sin abrir formulario de edición |
| **Precio 0** | Mostraba 0,00€ o vacío en carta pública | Muestra "Consultar" cuando precio es 0 o null |
| **SMTP write-only** | smtp_password no debe exponerse en API | Solo escritura desde admin, nunca en GET /api/config; "••••••••" preserva valor existente |
| **GET /api/config admin-only** | Endpoint expuesto públicamente | Se añadió `requireUserSession` — solo usuarios autenticados. Nuevo GET /api/public-config para datos públicos |
| **Horarios configurables** | Horarios hardcodeados para comida/cena | JSONB en configuracion con comida_inicio/fin, cena_inicio/fin, intervalo_minutos (15/30) |
| **Zonas editables** | Zonas fijas via CHECK constraint en mesas.zona | JSONB array en configuracion.zonas_config con id/nombre/capacidad/enabled. Admin puede crear/renombrar/deshabilitar zonas libremente |
| **Capacidad desde zonas** | capacidad_total_local (default 80) no reflejaba el local real | Capacidad deducida de zonas habilitadas. 5 zonas = 264 capacidad total. Deprecado capacidad_total_local |
| **Días bloqueados** | Sin soporte para cerrar el restaurante en fechas específicas | Tabla `dias_bloqueados` con fecha única, recurrente (MM-DD) y rangos (fecha_fin) |
| **Slot grid en reservas** | Datetime-local obligaba a escribir hora manualmente | Date picker + botones de slot de 15min. Slots generados desde horarios_config, excluye pasados y días bloqueados |
| **Rate limiting SMS** | Endpoint SMS sin protección contra abuso | Token bucket: 1 request/phone/min + 5 request/IP/min, devuelve 429 |
| **Phone normalization compartida** | Duplicado en server/utils/phone.ts | Movido a shared/utils/phone.ts, importable ambos lados vía `#shared/utils/phone` |
| **GDPR tracking** | Consentimiento GDPR no se persistía | `clientes.gdpr_aceptado` + `gdpr_aceptado_at`. Se marca al hacer reserva. Datos del cliente se sincronizan desde el formulario |
| **SMS toggle vs modo_reserva** | `sms_verificacion` estaba acoplado a `modo_reserva` (automatica=sin SMS, verificada=con SMS) | `sms_verificacion` es un booleano independiente en config. `modo_reserva` queda para futuros modos de confirmación |
| **Notificación configurable** | La notificación siempre era email, sin opción SMS | `notificacion_reserva`: `email` | `sms` | `ambos`. Se usa tanto en create como en confirmación admin |
| **Referencia legible** | Mostrar UUID completo en la confirmación era ilegible | `generarReferencia(uuid, fecha)` en `shared/utils/referencia.ts` — formato legible tipo `LN4F-28JUN` |
| **SMTP Security** | Sin control de tipo de conexión SMTP | Selector TLS/STARTTLS en configuración, se pasa directo a nodemailer |
| **CAPTCHA Turnstile** | Sin protección contra bots en formulario público | Cloudflare Turnstile, toggle en config, invisible por defecto, fallback a checkbox si bloquea |
| **Admin confirm reservation** | Admin no podía confirmar reservas pendientes desde el panel | Modal en `/cocina/reservas` con asignación opcional de mesa, envía notificación según config |
| **useState for hydration safety** | useRestaurantConfig needed server & client to return the same initial HTML | useState with fallback + Object.assign in SSR render; client defers to onMounted to avoid mismatch |
| **Realtime via onMounted** | Suscripciones Postgres Changes en SSR no funcionan (WebSocket no disponible) | Canal se subscribe en onMounted, se unsubscribe en onUnmounted. Payload modifica el ref directamente; NO llamar a refreshNuxtData |
| **Multi-tenant desde configuracion** | Nombre, logo, dirección hardcodeados en layout | `useRestaurantConfig` composable + `RestaurantConfig` contract en shared. GET /api/public-config expone datos. Admin los edita en ConfiguracionForm |
| **Image upload security** | Subir imágenes con riesgo de SVG malicioso, metadatos EXIF, polyglot | Canvas re-encode pipeline: validate → drawImage strips metadata → toBlob WebP → upload. SVG bloqueado por drawImage SecurityError |
| **Cancelación por token** | Cliente necesita cancelar sin login | UUID único por reserva (cancel_token). GET preview + POST confirm. Endpoints públicos con service role. Token en email de confirmación |
| **Plato familia/subcategoría** | Vinos y postres necesitaban agrupación secundaria | Tabla `familias` con FK → categorias. `platos.familia_id`. FamilySelector como segundo scroll horizontal. PlatoForm carga familias por categoría |
| **Agotado en menú diario** | Admin necesita marcar platos no disponibles en el día sin borrarlos | Columna `agotado` en menu_diario_items. Toggle visual en vivo desde admin. Realtime actualiza front público (tachado + indicador rojo) |
| **HTTP security headers** | Cabeceras de seguridad faltantes (X-Frame-Options, CSP, etc.) | Nitro hook en `server/plugins/security-headers.ts` que añade headers a todas las respuestas |
