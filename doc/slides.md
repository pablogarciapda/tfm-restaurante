# Prompts para presentación Canva — TFM Restaurante La Zíngara

> Instrucciones: copiar cada prompt y pegarlo en Canva para generar las slides una por una.

---

## Sección 1: Origen del Proyecto (3 slides)

### Prompt 1.1 — Génesis del Proyecto

> Create a professional presentation slide for a university Master's thesis defense. Title: "Génesis del Proyecto".
>
> Show a vertical timeline with 3 phases, each with technical details:
>
> **Fase 1 — MVP Usuario (4 semanas)**
> - Frontend público con SSR para SEO local (Google "restaurante Santa María del Páramo")
> - Carta dinámica con filtros por alérgenos y información calórica
> - Sistema de reservas con slot grid de 15 minutos, verificación SMS, consentimiento GDPR
> - Menú del día con actualización en tiempo real (platos agotados via WebSockets)
> - Eventos y contacto con mapa embebido
>
> **Fase 2 — Panel de Administración (3 semanas)**
> - Autenticación Supabase Auth con roles (admin/editor) y permisos granulares
> - CRUD completo: platos, eventos, clientes, usuarios
> - Configuración del sistema: horarios, zonas, precios, SMTP, datos multi-tenant
> - Drag & drop nativo para reorden de platos y categorías
>
> **Fase 3 — Motor de Mesas (3 semanas)**
> - Canvas 2D interactivo con Konva.js a 60 FPS
> - Fusión lógica de mesas con capacidad recalculada (fórmula: 2 mesas=sum-2, 3=sum-4, 4+=sum-6)
> - Sincronización en tiempo real vía Postgres Changes (WebSockets)
> - Editor de plano con zoom, formas de mesa, imagen de fondo por zona
>
> Style: dark background (#1a1a2e), terracotta accent (#C75B39), clean modern university thesis aesthetic. Include subtle phase icons. All text in Spanish.

### Prompt 1.2 — Stack Tecnológico

> Create a presentation slide titled "Arquitectura del Sistema". Show a layered architecture diagram with 4 levels and technical details:
>
> **Nivel 1 — Presentación (Frontend)**
> - Nuxt 4.4.8 con Vue 3 Composition API + TypeScript
> - SSR público (SEO) + SPA admin (routeRules ssr:false)
> - Tailwind CSS utility-first
> - Konva.js + vue-konva: Canvas 2D interactivo, 60 FPS, drag & drop, resize, rotate
>
> **Nivel 2 — Lógica de Negocio (Composables + Stores)**
> - Pinia stores: canvas-store (mesas, selección, zonas)
> - Composables: useMesas, useMesasFusion, useAuth, useMenuDiario
> - Shared contracts: TypeScript interfaces entre client y server (mesas.contract.ts, reservation.contract.ts)
> - Fusion math: pure functions para capacidad, posiciones, estados
>
> **Nivel 3 — API y Seguridad (Server)**
> - Nitro server routes (Nuxt 4)
> - Supabase Auth: JWT tokens, role-based access control
> - Row Level Security (RLS) en TODAS las tablas PostgreSQL
> - Rate limiting SMS (1 req/phone/min, 5 req/IP/min)
> - HTTP security headers (X-Frame-Options, CSP, etc.)
>
> **Nivel 4 — Datos (Supabase BaaS)**
> - PostgreSQL 15 con 15+ tablas
> - Realtime: Postgres Changes vía WebSockets
> - Storage: imágenes con compresión WebP client-side
> - Migraciones controladas vía Supabase CLI
>
> Show arrows connecting each level. Style: dark background (#1a1a2e), terracotta accent (#C75B39), technical architecture diagram. Spanish labels.

### Prompt 1.3 — Decisiones de Arquitectura

> Create a presentation slide titled "Decisiones de Arquitectura". Show a 2x3 grid with 6 key decisions:
>
> **1. Contratos compartidos en `shared/`**
> Interfaces TypeScript auto-importadas en cliente y servidor. Un contrato, dos contextos. Cero duplicación de tipos.
>
> **2. SSR + SPA en un mismo proyecto**
> Nuxt routeRules permite SSR para páginas públicas (SEO) y SPA para /cocina (auth). Sin dos apps separadas.
>
> **3. Supabase como BaaS**
> PostgreSQL + Auth + Storage + Realtime. Sin backend propio. RLS en cada tabla como capa de seguridad.
>
> **4. Canvas 2D con Konva.js**
> Drag & drop, resize, rotación, fusión de mesas a 60 FPS. Imposible con DOM puro.
>
> **5. Fusión con capacidad realista**
> 2×4=6, 3×4=8, 4×4=10. No es suma aritmética — es capacidad real de servicio.
>
> **6. TDD como práctica**
> Tests antes o junto con la implementación. 960+ tests. Los tests son especificación ejecutable.
>
> Style: dark background (#1a1a2e), terracotta accent (#C75B39), cards layout with icons. Spanish text.

---

## Sección 2: El Problema que Resuelve (2 slides)

### Prompt 2.1 — Problema

> Create a presentation slide titled "El Problema". Show a list of pain points with icons:
>
> **Hostelería rural en España**
> - Gestión de reservas manual: papel, WhatsApp, llamadas telefónicas
> - Carta impresa que se desactualiza cada pocos meses
> - Sin información de alérgenos ni información calórica
> - Plano de mesas en papel — sin control de aforo en tiempo real
> - Procesos desconectados: reserva, cocina, eventos, clientes
> - Sin presencia digital — pérdida de clientes que buscan "restaurante cerca de mí"
> - Reservas por teléfono sin confirmación, sin recordatorios, sin cancelación organizada
>
> Use a vertical list with warning icons (⚠️). Red/orange tones for problems. Dark background (#1a1a2e). Spanish text. Clean, professional layout.

### Prompt 2.2 — Solución

> Create a presentation slide titled "La Solución". Show the same pain points but solved:
>
> **Plataforma web integral La Zíngara**
> - Reservas online con slot grid de 15min, selección de zona/mesa, verificación SMS
> - Carta dinámica con categorías, subcategorías, filtros, precio configurable
> - Menú del día actualizado en tiempo real (platos agotados al instante via WebSockets)
> - Panel de administración con plano interactivo de mesas (Konva.js Canvas 2D)
> - Fusión lógica de mesas con control de aforo
> - Sincronización en vivo entre dispositivos
> - SEO local optimizado para búsquedas geolocalizadas
> - GDPR compliance, rate limiting SMS, seguridad OWASP Top 10
>
> Use a vertical list with checkmark icons (✅). Green/terracotta tones for solutions. Dark background (#1a1a2e). Spanish text. Match layout with the "Problema" slide.

---

## Sección 3: Cómo Funciona (web pública + admin)

### Prompt 3.1 — Web Pública

> Create a presentation slide titled "Web Pública — Experiencia del Cliente". Show 5 sections with 3-4 bullet points each:
>
> **Inicio**
> - Hero con filosofía y estilo de cocina
> - Accesos directos a carta, menú, reservas, eventos
> - Footer con datos de contacto y redes sociales
>
> **Carta**
> - Platos organizados por categorías con orden configurable
> - Sección "Recomendados" editable desde admin
> - Subcategorías (familias) con scroll horizontal
> - Precio 0 muestra "Consultar"
>
> **Menú del Día**
> - Precio configurable (lun-vie, sábado, domingo/festivos)
> - Platos agotados en tiempo real via WebSockets
> - Soporte para festivos entre semana
>
> **Reservas**
> - Slot grid de 15 minutos en horarios configurables
> - Selector de zona/mesa, consentimiento GDPR
> - Verificación SMS opcional, cancelación por token
>
> **Eventos y Contacto**
> - Cartelera de eventos con categorías
> - Formulario de contacto con mapa embebido
> - Horarios y ubicación del restaurante
> - Teléfono, email, Instagram, Facebook
>
> Style: dark background (#1a1a2e), terracotta accent (#C75B39). Spanish text. Clean layout with small icons per section.

### Prompt 3.2 — Panel de Administración (resumen)

> Create a presentation slide titled "Panel de Administración — Cocina". Show a dashboard wireframe with sidebar navigation and these sections:
>
> **Dashboard**
> - Métricas de ocupación en tiempo real
> - Aforo actual: automático (suma de mesas) o manual (override)
> - Reservas del día con estado (pendiente/confirmada/completada)
> - Gráfico de reservas por día
>
> **Carta**
> - CRUD completo de platos: nombre, descripción, precio, categoría, tipo (carta/menú), alérgenos, calorías
> - Drag & drop nativo para reordenar platos por categoría
> - Estrella recomendado clicable ★/☆ (sin abrir formulario)
> - Upload de imágenes con compresión WebP client-side (Canvas API)
> - Selector de familia/subcategoría (ej: Vinos D.O. León)
> - Precio 0 muestra "Consultar" en carta pública
>
> **Menú Diario**
> - Editor por día de la semana: primer plato, segundo, postre, bebida, pan
> - Toggle agotado en vivo via WebSockets (Realtime Postgres Changes)
> - Precio desde configuración (lun-vie / sábado / domingo)
> - Secciones activas configurables con títulos personalizados
>
> **Reservas**
> - Lista con filtro por fecha + columna mesa + referencia legible (LN4F-28JUN)
> - Modal reasignar: cambiar zona/mesa con motivo obligatorio
> - Modal confirmar: asignación opcional de mesa + notificación (email/sms/ambos)
> - Reservas pasadas bloqueadas para editar/cancelar/reasignar
> - Bypass SMS/CAPTCHA para reservas creadas desde panel (flag admin_created)
> - StandbyBanner para reservas pendientes de reasignación por fusión
>
> **Motor de Mesas (Canvas Konva.js)**
> - Canvas 2D interactivo a 60 FPS con zoom (0.3x–2.0x)
> - Formas: rectangular, cuadrada, redonda, ovalada
> - Fusión lógica: capacidad recalculada (2=sum-2, 3=sum-4, 4+=sum-6)
> - Input ocupación forzada opcional al fusionar
> - Estado derivado: Libre #22C55E / Reservada #F59E0B / Ocupada #EF4444
> - Fallback a diseño original cuando no hay layout guardado
> - Sincronización Realtime entre pestañas/dispositivos
>
> **Editor de Plano (/cocina/diseno)**
> - Modo diseño: dibujo de líneas, imagen de fondo por zona
> - Zoom, pestañas por zona, guardar posiciones con feedback
> - Dimensiones del canvas configurables (default 1400×900)
>
> **Configuración**
> - Datos restaurante multi-tenant: nombre, dirección, teléfono, email, redes sociales, logo
> - Horarios configurables: comida/cena con intervalo (15/30 min)
> - Zonas editables: nombre, capacidad, enable/disable
> - Días bloqueados: individuales, recurrentes (MM-DD), rangos
> - Precios: menú diario, sábado, domingo/festivos
> - SMTP: servidor, puerto, TLS/STARTTLS, password write-only
> - CAPTCHA Cloudflare Turnstile toggle
> - Categorías CRUD inline con drag & drop reorder
>
> **Gestión de Usuarios**
> - Roles: admin, editor
> - Permisos granulares (fusionar, configurar, etc.)
> - Crear/editar/desactivar usuarios
> - Restablecer contraseña vía email
>
> Style: dark background (#1a1a2e), terracotta accent (#C75B39), professional dashboard UI wireframe. Spanish text. Include small icons for each section.

---

## Sección 4: Slide final con datos personales

### Prompt 4.1 — Cierre

> Create a closing presentation slide with centered layout. Title: "Gracias por su atención". Subtitle: "¿Preguntas?".
>
> Below, show personal information:
>
> **Pablo García Fernández**
> Máster en Desarrollo de Software con IA — BIGSchool
>
> Restaurante **La Zíngara**
> Santa María del Páramo, León
> www.lazingara.es
>
> Style: dark background (#1a1a2e), terracotta accent (#C75B39), elegant and minimal. Include subtle decorative elements. Spanish text.
