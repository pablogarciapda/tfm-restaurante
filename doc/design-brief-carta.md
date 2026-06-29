# Contexto del Proyecto: Módulo de Carta para "La Zíngara" (Nuxt + Tailwind CSS)

Necesito diseñar e implementar la interfaz de usuario para la sección de la **Carta** del restaurante. El objetivo es estructurar un sistema de navegación fluido, limpio y altamente intuitivo tanto para móviles como para ordenadores.

Para la maquetación nos inspiraremos en los patrones visuales observados en las siguientes referencias:
1. `Captura de pantalla 2026-06-26 a las 9.40.05.jpg`: Sistema de pestañas superiores minimalistas con rejilla (grid) limpia de tarjetas inferiores.
2. `Captura de pantalla 2026-06-26 a las 17.54.49.jpg`: Menú superior fijo (*sticky*) con scroll vertical infinito indexado por el título de la categoría.
3. `Captura de pantalla 2026-06-29 a las 13.15.40.jpg` y `Captura de pantalla 2026-06-29 a las 13.15.57.jpg`: Barra horizontal interactiva con iconos estilizados y carrusel (*scroll horizontal*) mediante flechas para navegar entre categorías, mostrando los productos abajo en una cuadrícula.

---

## 1. Arquitectura de UI y Componentes Requeridos

Quiero que el diseño se modularice en los siguientes componentes dentro de Nuxt:

### A. Componente: `CategorySelector.vue` (Navegación Superior)
* **Comportamiento:** Debe ser una barra horizontal con *scroll* dinámico (`overflow-x-auto whitespace-nowrap scrollbar-hide`). 
* **Desktop:** En pantallas grandes, si las categorías exceden el ancho de la pantalla, debe incluir botones/flechas laterales de navegación (izquierda/derecha) para desplazar el menú de forma fluida (estilo *carousel*).
* **Móviles:** Desplazamiento táctil nativo sin barras de scroll visibles.
* **Estado Activo:** La categoría seleccionada debe tener un indicador visual claro (un subrayado animado o un cambio de color de fondo/icono).

### B. Componente: `ProductGrid.vue` (Contenedor de Productos)
* **Estructura:** Queremos un diseño híbrido y eficiente. El usuario podrá navegar pulsando en la barra superior de categorías, pero al hacer scroll vertical en la página, las tarjetas de los productos se mostrarán agrupadas bajo el título de su respectiva categoría.
* **Layout:** Implementar un CSS Grid responsivo usando Tailwind CSS:
  * Móviles: 1 o 2 columnas (según el tamaño de la tarjeta).
  * Tablets: 2 o 3 columnas.
  * Desktop: 3 o 4 columnas.

### C. Componente: `ProductCard.vue` (Tarjeta de Producto Individual)
Cada tarjeta debe ser limpia y con bordes estilizados, conteniendo:
* Imagen del plato en la parte superior (relación de aspecto fija, ej. `aspect-video` u `aspect-square`, con `object-cover` para evitar deformaciones).
* Nombre del plato.
* Descripción de ingredientes (truncada si es muy larga).
* Fila inferior con el precio formateado e iconos flotantes o discretos para Alérgenos (sin recargar la tarjeta).

---

## 2. Requerimientos Técnicos y Behovior de UX

* **Intersección Dinámica (Scroll Spy):** Al hacer scroll hacia abajo en la página, la barra superior de categorías (`CategorySelector`) debe actualizar de manera automática su estado activo para marcar la categoría que el usuario está visualizando en ese momento en el *grid* vertical.
* **Menú Fijo (Sticky):** El selector de categorías debe quedarse fijado en la parte superior de la pantalla (`sticky top-0 z-50`) una vez que el usuario pase el banner principal de "Nuestra Carta", facilitando el cambio de sección en cualquier momento.
* **Rendimiento:** Las imágenes deben utilizar el módulo `@nuxt/image` (si está disponible) o lazy-loading nativo (`loading="lazy"`) para asegurar una carga ultra rápida.

---

## Datos de prueba (mockData)

Campos requeridos: `id`, `nombre`, `precio`, `categoria`, `descripcion`, `imagen_url`, `alergenos`, `calorias`.