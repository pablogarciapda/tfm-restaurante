# Guía para Generar Presentación del TFM — Restaurante La Zíngara

> **Propósito de este documento:** Guía estructurada para que una IA genere una presentación de slides profesional y completa para la defensa del TFM "Plataforma Web Integral para Restaurante La Zíngara". Cada sección corresponde a una o más diapositivas. Incluye contenido textual, notas sobre qué incluir visualmente, y la estructura narrativa recomendada.

---

## Instrucciones para la IA generadora de slides

Genera una presentación en formato Markdown compatible con Marp (o PowerPoint si se solicita). Usa un diseño profesional, sobrio y moderno. La presentación debe durar aproximadamente 20-25 minutos de exposición (15-20 slides aproximadamente).

**Tono:** Técnico pero accesible. Es un TFM de máster, el tribunal espera rigor técnico, pero también claridad y capacidad de síntesis.

**Formato de salida:** Slides en Markdown con separador `---` entre diapositivas. Incluir notas del orador donde sea relevante.

**Tema visual sugerido:** Colores corporativos del restaurante (cálidos, tierra/ocre/naranja suave), tipografía limpia, diagramas de arquitectura donde se indique.

---

## Índice de Slides (Orden Recomendado)

| # | Slide | Duración |
|---|-------|----------|
| 1 | Portada | 30s |
| 2 | Índice | 30s |
| 3 | Contexto y Motivación | 2min |
| 4 | Objetivos del Proyecto | 1.5min |
| 5 | Arquitectura General | 2min |
| 6 | Stack Tecnológico | 1.5min |
| 7 | Fase 1 — Escaparate Digital | 2min |
| 8 | Fase 2 — Panel de Gestión | 2min |
| 9 | Fase 3 — Motor de Mesas Interactivo | 3min |
| 10 | Modelo de Datos | 1.5min |
| 11 | Decisiones Técnicas Clave | 2min |
| 12 | Seguridad y Calidad | 1.5min |
| 13 | Testing | 1.5min |
| 14 | Demo Guiada | 2min |
| 15 | Conclusiones | 1min |
| 16 | Trabajo Futuro | 1min |
| 17 | Cierre | 30s |

---

## Slide 1 — Portada

**Contenido textual:**

```
Plataforma Web Integral para Restaurante La Zíngara

Trabajo Final de Máster
Pablo García Fernández

Máster en Desarrollo con IA E.II en BIGSchool

Tutor: Mouredev
```

**Visual:**
- Logo del restaurante (si existe) o isotipo
- Foto amable del restaurante o del pueblo (Santa María del Páramo, León)
- Fondo con los colores corporativos del restaurante
- Fecha de la defensa

---

## Slide 2 — Índice

**Contenido textual:**

```
1. Contexto y Motivación
2. Objetivos
3. Arquitectura del Sistema
4. Stack Tecnológico
5. Funcionalidades por Fase
   - Fase 1: Escaparate Digital
   - Fase 2: Panel de Gestión
   - Fase 3: Motor de Mesas Interactivo
6. Modelo de Datos
7. Decisiones Técnicas
8. Seguridad y Calidad
9. Testing
10. Demo
11. Conclusiones y Trabajo Futuro
```

**Visual:**
- Diseño limpio con índice numerado
- Iconos pequeños al lado de cada punto

---

## Slide 3 — Contexto y Motivación

**Contenido textual:**

```
La Zíngara — Restaurante en Santa María del Páramo (León)

PROBLEMA DETECTADO:
- Gestión de reservas manual (papel/teléfono)
- Sin presencia digital actualizada
- Carta y menú del día en PDF estático
- Plano de mesas en papel — sin control de aforo en tiempo real
- Procesos desconectados: reserva, cocina, eventos

OPORTUNIDAD:
- Digitalizar la experiencia completa del cliente
- Unificar frontend público + backend de gestión
- Diferenciación competitiva en hostelería rural
```

**Notas del orador:**
> "El restaurante La Zíngara, en Santa María del Páramo, León, operaba completamente en analógico. Las reservas se apuntaban en papel, la carta se actualizaba cada varios meses porque implicaba reimprimir, y el control del aforo era completamente manual. Este proyecto nace de la necesidad de digitalizar la operación completa."

**Visual:**
- Foto del restaurante (fachada o interior)
- Diagrama del "antes" (caos de papeles, procesos manuales) vs "después" (todo digital)
- Mapa pequeño de ubicación (León, Santa María del Páramo)

---

## Slide 4 — Objetivos del Proyecto

**Contenido textual:**

```
OBJETIVO GENERAL:
Desarrollar una plataforma web integral para la gestión completa
del restaurante, tanto para clientes como para el equipo interno

OBJETIVOS ESPECÍFICOS:
1. Escaparate digital público con carta, menú diario y eventos
2. Sistema de reservas online con selección de zona/mesa
3. Panel de administración para gestión de contenido
4. Editor interactivo de plano de mesas con Canvas (Konva.js)
5. Fusión inteligente de mesas y control de aforo en tiempo real
6. Sincronización en vivo vía WebSockets (Supabase Realtime)
```

**Notas del orador:**
> "El objetivo no era solo tener una web — eso es trivial hoy en día. El objetivo era construir un ecosistema completo donde la experiencia del cliente y la gestión interna estuvieran unificadas en una misma plataforma."

**Visual:**
- Diagrama de objetivo central con 6 burbujas alrededor
- Iconos representativos (carta, calendario, engranaje, mesas, WiFi)

---

## Slide 5 — Arquitectura General

**Contenido textual:**

```
ARQUITECTURA DEL SISTEMA

[Frontend] Nuxt 4 (SSR público + SPA admin)
    ↕ HTTP / WebSockets
[Backend as a Service] Supabase
    ├── PostgreSQL (datos + RLS)
    ├── Auth (Supabase Auth)
    ├── Storage (imágenes)
    └── Realtime (WebSockets)
    ↕
[Cliente Navegador] → Konva.js Canvas 2D (60 FPS)

FLUJO SSR:
  Páginas públicas (carta, menú, eventos) → Render en servidor → SEO
FLUJO SPA:
  Panel /cocina → SPA protegido por Auth → JavaScript del lado cliente
```

**Visual:**
- Diagrama de cajas: Navegador → Nuxt SSR → Supabase (PostgreSQL, Auth, Storage, Realtime)
- Flechas que muestran SSR vs SPA
- Badges: "SSR Público" / "SPA Protegido"

**Notas del orador:**
> "La arquitectura es deliberadamente simple pero potente. Nuxt 4 nos da SSR para las páginas públicas (SEO para el restaurante) y modo SPA para el panel de administración. Supabase actúa como BaaS cubriendo base de datos, autenticación, almacenamiento y WebSockets. No hay backend propio — todo el poder de PostgreSQL con RLS para seguridad."

---

## Slide 6 — Stack Tecnológico

**Contenido textual:**

```
STACK TECNOLÓGICO

Frontend          Nuxt 4 (Vue 3 + TypeScript + Composition API)
Estilos           Tailwind CSS
Canvas 2D         Konva.js + vue-konva
Backend           Supabase (PostgreSQL)
Testing           Vitest (unit) + Playwright (e2e)
Despliegue        VPS dedicado (Node persistente)
Package manager   pnpm

DECISIONES CLAVE:
• Nuxt 4 con srcDir = app/ (estructura modular)
• Supabase como BaaS — sin servidor backend propio
• Konva.js para plano interactivo (60 FPS en Canvas)
• Composition API + <script setup> — cero Options API
```

**Notas del orador:**
> "Cada tecnología fue elegida por una razón concreta. Nuxt 4 porque necesitábamos SSR para SEO y SPA para el panel sin cambiar de framework. Konva.js porque manejar mesas con drag & drop, rotación y fusión en DOM puro habría sido inviable. Supabase porque nos da PostgreSQL, Auth, Storage y Realtime sin gestionar infraestructura."

**Visual:**
- Logos de cada tecnología: Nuxt, Vue, TypeScript, Tailwind, Konva, Supabase, Vitest
- Tabla de decisión con 2 columnas: "Tecnología" / "Por qué"

---

## Slide 7 — Fase 1: Escaparate Digital

**Contenido textual:**

```
FASE 1 — MVP USUARIO (Completada ✅)

PÁGINAS PÚBLICAS (SSR):
• Inicio — filosofía del restaurante, accesos directos
• Carta — platos con filtro por alérgenos, calorías,
         sección recomendados configurable, subcategorías (familias)
• Menú diario — dinámico desde BBDD, precio configurable,
         agotado en vivo con Realtime, menú dominical
• Reservas — formulario con slot grid de 15min,
         selector de zona/mesa, consentimiento GDPR, verificación SMS
• Eventos — cartelera con categorías dinámicas
• Contacto — mapa, formulario, datos del restaurante
• Cancelar — cancelación por token único sin login
```

**Notas del orador:**
> "La primera fase cubre todo lo que ve el cliente: la carta con filtros inteligentes, el menú del día que se actualiza en tiempo real (si el cocinero marca un plato como agotado, el cliente lo ve al instante), el sistema de reservas con selección de mesa, y hasta cancelación por token desde el email."

**Visual:**
- 3-4 capturas de pantalla reales de la web pública
- Mockup de móvil + tablet + escritorio (responsive)
- Flecha animada mostrando el flujo de reserva

---

## Slide 8 — Fase 2: Panel de Gestión

**Contenido textual:**

```
FASE 2 — PANEL y AUTH (Completada ✅)

RUTA /cocina (SPA protegido por Supabase Auth):
• Dashboard — métricas, aforo actual
• Carta Admin — CRUD platos con sticky layout,
         reorden drag-and-drop por categoría, estrella Recomendado ★
• Menú diario Editor — crear/editar por día, secciones por JSONB
• Eventos Admin — CRUD con categorías dinámicas desde DB
• Clientes — CRUD completo con historial de reservas
• Configuración — 30+ ajustes: precios, horarios, zonas,
         días bloqueados, SMTP, datos del restaurante, GDPR
• Usuarios — roles y permisos granulares (admin/editor)
```

**Notas del orador:**
> "El panel de administración es donde el restaurante vive realmente. Cualquier persona del equipo puede gestionar la carta sin saber de tecnología — drag-and-drop para reordenar platos, un click para marcar recomendado, editor visual del menú del día. La configuración tiene más de 30 parámetros que permiten adaptar el sistema al día a día del restaurante."

**Visual:**
- Captura del panel con sidebar y contenido
- Detalle del editor de carta (sticky toolbar, estrella recomendado)
- Detalle de la pantalla de configuración (secciones colapsables)

---

## Slide 9 — Fase 3: Motor de Mesas Interactivo

**Contenido textual:**

```
FASE 3 — MOTOR DE MESAS (Completada ✅)

DOS MODOS:
• Modo Diseño (/cocina/diseno)
  - Editor del plano: crear, mover, rotar, redimensionar mesas
  - Formas: rectangular, cuadrada, redonda, ovalada
  - Pestañas por zona, imagen de fondo, dibujo de líneas
  - Zoom y guardado con feedback

• Modo Operación (/cocina/reservas)
  - Plano interactivo con estado de mesas en tiempo real:
    🟢 Libre / 🔴 Ocupada / 🟡 Reservada
  - Fusión lógica de mesas (2 mesas de 4 = capacidad 6, no 8)
  - Rotación rígida de grupos fusionados como bloque
  - Control de aforo: alertas al superar capacidad
  - Reservas pasadas bloqueadas para edición
```

**Notas del orador:**
> "El motor de mesas es el componente técnicamente más complejo. Konva.js renderiza un canvas 2D a 60 FPS con cientos de mesas. Cada mesa se puede arrastrar, rotar, fusionar con otras. La fusión no es una suma aritmética — dos mesas de 4 juntas alojan 6 comensales, no 8, aplicando una regla de capacidad realista. Y todo se sincroniza en tiempo real via WebSockets: si alguien hace una reserva desde el frontend público, la mesa aparece ocupada al instante en el panel."

**Visual:**
- Captura del canvas con mesas de colores (verde/rojo/amarillo)
- Ejemplo de fusión: 2 mesas separadas → 1 grupo fusionado
- Diagrama de la rotación rígida de grupo
- Tooltip flotante sobre una mesa

---

## Slide 10 — Modelo de Datos

**Contenido textual:**

```
MODELO DE DATOS (PostgreSQL + Supabase)

TABLAS PRINCIPALES (14 tablas):
• configuracion       — Ajustes del sistema (JSONB para horarios, zonas, config pública)
• platos              — Carta + menú (con alérgenos, calorías, familia_id)
• categorias          — Categorías con orden (uppercase, normalizadas)
• familias            — Subcategorías (ej: TINTOS D.O. LEÓN) con FK → categorias
• menu_diario_config  — Config por día (secciones JSONB, precio desde configuracion)
• menu_diario_items   — Platos del menú (con columna agotado en vivo)
• mesas               — Mesa con forma, posición, rotación, fusión (autorreferencial)
• reservas            — FK a clientes y mesas, token de cancelación único
• clientes            — Con GDPR tracking (aceptado + fecha)
• eventos             — FK a categorias_eventos
• categorias_eventos   — Categorías dinámicas
• dias_bloqueados     — Individuales, recurrentes, rangos
• profiles            — Roles y permisos (FK a auth.users)
```

**Notas del orador:**
> "El modelo tiene 14 tablas bien normalizadas. Destaco dos decisiones: las zonas y horarios viven en JSONB dentro de configuración porque su estructura es variable y no justifican tablas propias. Y mesa_padre_id con id_fusion permite la fusión lógica de mesas con una autorreferencia limpia."

**Visual:**
- Diagrama entidad-relación simplificado con las tablas principales
- Flechas de FK entre tablas clave (reservas → clientes, mesas; platos → categorias, familias)
- Destacar JSONB (zonas_config, horarios_config, secciones_config)

---

## Slide 11 — Decisiones Técnicas Clave

**Contenido textual:**

```
DECISIONES TÉCNICAS CLAVE

1. CONTRATOS EN SHARED/
   Interfaces y tipos en shared/ — auto-importados en cliente y servidor
   → Un contrato, dos contextos. Cero duplicación.

2. KONVA CON ROTACIÓN CONTRAROTADA
   Texto de mesa siempre legible: rotación = -mesa.rotacion
   → El número de mesa se lee derecho a cualquier ángulo.

3. FUSIÓN CON CAPACIDAD REALISTA
   No es suma aritmética: fusión-math.ts calcula capacidad
   con reglas de ocupación real (2×4 = 6, no 8).

4. REALTIME EN VIVO
   WebSockets (Supabase Realtime) para:
   → Agotado en menú → cliente lo ve al instante
   → Nueva reserva → mesa cambia de color en canvas
   → Modificación de carta → actualización inmediata

5. CANVAS PARA SUBIR IMÁGENES
   Re-encode vía Canvas: sanitiza SVG, elimina metadatos EXIF,
   comprime a WebP con calidad configurable
```

**Notas del orador:**
> "Seleccioné las 5 decisiones que más impacto tuvieron. Los contratos compartidos eliminaron la duplicación de tipos entre cliente y servidor. La rotación contrarrotada fue un detalle de UX crucial — cuando rotas una mesa 90°, el texto del número se contrarrota para que siempre se lea derecho. La fusión aplica matemáticas realistas, no una simple suma. Y el upload de imágenes re-encodea todo a WebP vía Canvas, eliminando metadatos EXIF y bloqueando SVG malicioso."

**Visual:**
- Cada decisión con un icono + texto breve
- Antes/después visual para la rotación contrarrotada
- Fragmento de código de fusión-math.ts (opcional)

---

## Slide 12 — Seguridad y Calidad

**Contenido textual:**

```
SEGURIDAD (OWASP Top 10 2025)

• RLS (Row Level Security) activo en TODAS las tablas de Supabase
• Rutas /cocina protegidas por middleware Nuxt + Supabase Auth
• Cabeceras HTTP de seguridad via Nitro hook (CSP, X-Frame-Options, etc.)
• SMTP password: write-only, nunca expuesto en GET /api/config
• Rate limiting SMS: 1 req/phone/min + 5 req/IP/min
• Upload de imágenes: Canvas re-encode sanitiza SVG y metadatos
• Service role key NUNCA en cliente
• CAPTCHA Cloudflare Turnstile configurable

CALIDAD

• TDD: tests escritos antes o junto con la implementación
• Arquitectura modular con SRP y contratos en shared/
• 920+ tests unitarios (Vitest) + tests e2e (Playwright)
• Strict TypeScript — cero any implícitos
```

**Notas del orador:**
> "Seguridad desde el diseño. RLS en cada tabla — incluso si alguien obtiene la anon key, no puede acceder a datos que no le corresponden. El password SMTP es write-only: nunca viaja en la respuesta GET, solo se puede escribir. Las imágenes se re-encodean eliminando metadatos EXIF (geolocalización, modelos de cámara) y bloqueando SVG maliciosos. Y 920+ tests garantizan que no rompemos nada al añadir funcionalidad."

**Visual:**
- Escudo de seguridad con checkmarks
- Badges: "RLS ✓", "Rate Limiting ✓", "CSP ✓", "920+ tests ✓"
- Diagrama del pipeline de seguridad en upload de imágenes

---

## Slide 13 — Testing

**Contenido textual:**

```
ESTRATEGIA DE TESTING

UNITARIOS (Vitest) — 920+ tests
• Utilidades compartidas: fusion-math, mesa-estado, slots, referencia
• Componibles: usePlatos, useMesasFusion, useMenuDiario
• Contratos y tipos: validación de interfaces shared/
• Stores Pinia: lógica de estado

E2E (Playwright)
• Flujos críticos: reserva completa, CRUD platos, gestión mesas
• Integración con Supabase (entorno de pruebas)

TDD COMO PRÁCTICA
• Test → código → refactor
• Los tests son especificación ejecutable
• Cobertura en módulos críticos (motor de mesas, reservas)
```

**Notas del orador:**
> "Más de 920 tests unitarios con Vitest cubren las utilidades compartidas, los composables y las stores. El enfoque TDD significa que los tests no son un añadido posterior — son la especificación ejecutable del sistema. Playwright cubre los flujos e2e críticos como el ciclo completo de reserva o la fusión de mesas."

**Visual:**
- Terminal con test runner (tests pasando en verde)
- Gráfico de cobertura por módulo
- Icono de TDD cycle (red → green → refactor)

---

## Slide 14 — Demo Guiada

**Contenido textual:**

```
DEMO EN VIVO (10 min)

FLUJO COMPLETO:

1. PÁGINA PÚBLICA
   → Navegar carta con filtros
   → Ver menú del día con precios
   → Hacer una reserva con selección de zona

2. PANEL DE ADMINISTRACIÓN
   → Login en /cocina
   → Dashboard con aforo actual
   → Ver la reserva recién creada aparecer en tiempo real
   → Mesa cambia de libre a ocupada en el canvas

3. GESTIÓN DE MESAS
   → Fusión de dos mesas
   → Rotación del grupo fusionado
   → Asignar la reserva a la mesa fusionada

4. CONFIGURACIÓN
   → Cambiar precio del menú
   → Bloquear un día festivo
   → Ver cambios reflejados al instante
```

**Visual:**
- Timeline visual del flujo de demo
- Cada paso con icono + tiempo estimado
- Nota: "Preparar datos de prueba antes de la defensa"

**Notas del orador:**
> "La demo cubre el ciclo completo: un cliente hace una reserva desde la web pública, y en tiempo real el panel de administración muestra la mesa ocupada. Luego fusionamos mesas para un grupo grande, rotamos el grupo, asignamos la reserva. Todo sincronizado. Recomiendo tener datos de prueba preparados — platos en la carta, un par de reservas, mesas colocadas en el plano."

---

## Slide 15 — Conclusiones

**Contenido textual:**

```
CONCLUSIONES

✓ Se ha desarrollado una plataforma web integral funcional
✓ Tres fases completadas con entregables verificables
✓ Arquitectura modular, extensible y mantenible
✓ 14 tablas en PostgreSQL, 920+ tests, todo con TypeScript
✓ Integración completa: público + admin en un mismo sistema
✓ Tiempo real vía WebSockets para sincronización inmediata

APRENDIZAJES:
• La fusión de mesas no es trivial — requiere matemáticas de centroide
• SSR + SPA en el mismo proyecto es viable con Nuxt routeRules
• Supabase como BaaS reduce drásticamente la infraestructura
• TDD no ralentiza: evita regresiones y documenta el sistema
```

**Notas del orador:**
> "El proyecto demuestra que es posible construir una plataforma completa con un stack moderno y minimalista. Lo más valioso fue aprender que la complejidad real no está en el framework o la base de datos, sino en modelar correctamente el dominio — la fusión de mesas, la capacidad realista, la sincronización en vivo. El TDD, lejos de ralentizar, evitó regresiones constantes en un sistema con tantas partes interconectadas."

**Visual:**
- Checkmarks grandes con los logros
- Fondo neutral, diseño limpio
- Cita destacada si procede

---

## Slide 16 — Trabajo Futuro

**Contenido textual:**

```
TRABAJO FUTURO

CORTO PLAZO:
• Corregir bug de bloqueo de mesa por turno completo
  (actualmente bloquea todos los slots del turno,
   no solo la hora reservada)

MEDIO PLAZO:
• Módulo de facturación / TPV integrado
• App móvil (PWA o nativa) para camareros
• Integración con pasarela de pago (señal de reserva)
• Panel de analytics y reporting (platos más vendidos,
  horas punta, rotación de mesas)

LARGO PLAZO:
• Sistema de fidelización con puntos
• Integración con delivery (Glovo, UberEats)
• Multi-idioma (inglés para turismo en el Camino de Santiago)
  — León está en el Camino Francés
```

**Notas del orador:**
> "El proyecto tiene camino por delante. A corto plazo hay un bug conocido que corregir — las reservas bloquean la mesa para todo el turno en lugar de solo para la hora reservada. A medio plazo, integrar facturación convertiría esto en un sistema casi completo de gestión hostelera. Y a largo plazo, el inglés abre una oportunidad real porque Santa María del Páramo está en el Camino de Santiago Francés."

**Visual:**
- Timeline con 3 horizontes (corto/medio/largo)
- Iconos de cada funcionalidad futura
- Mapa del Camino de Santiago marcando León

---

## Slide 17 — Cierre

**Contenido textual:**

```
Gracias por su atención

¿Preguntas?

[Nombre del Autor]
[Email de contacto]
[LinkedIn / GitHub — opcional]

Restaurante La Zíngara
Santa María del Páramo, León
www.lazingara.es
```

**Visual:**
- Mismo diseño que portada
- Logo del restaurante
- QR que lleve a la web (opcional pero impactante)
- Foto del restaurante o del pueblo

---

## Apéndice A: Consejos para la Defensa

1. **Demo frágil → graba un vídeo de respaldo.** Si la base de datos no responde o el Wi-Fi falla, tener un vídeo grabado de los 10 minutos de demo te salva la defensa.

2. **No leas las diapositivas.** El tribunal lee más rápido de lo que tú hablas. Usa las diapositivas como apoyo visual, no como guión.

3. **Prepárate para preguntas técnicas:**
   - "¿Por qué Supabase y no Firebase?" → PostgreSQL, RLS, self-hostable, SQL nativo
   - "¿Por qué Konva y no HTML/CSS?" → 60 FPS con cientos de elementos, canvas nativo
   - "¿Escalabilidad?" → Supabase escala verticalmente, Nuxt puede ir a serverless
   - "¿Seguridad?" → RLS en cada tabla, rate limiting, sanitización de imágenes
   - "¿Por qué SSR + SPA?" → SEO para páginas públicas + interacción rica en admin

4. **Tiempo: ensaya con cronómetro.** 20-25 minutos de exposición dejan 5-10 para preguntas.

5. **Demo con datos reales.** Pon platos de verdad, mesas colocadas como en el restaurante real. Un escenario familiar demuestra que entiendes el dominio.

## Apéndice B: Enlaces y Referencias

- [Nuxt 4](https://nuxt.com/)
- [Supabase](https://supabase.com/)
- [Konva.js](https://konvajs.org/)
- [vue-konva](https://github.com/konvajs/vue-konva)
- [Vitest](https://vitest.dev/)
- [Playwright](https://playwright.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Documentación del proyecto](https://github.com/[usuario]/tfm-restaurant)