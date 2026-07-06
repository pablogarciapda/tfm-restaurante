# Guía de uso — Panel de Gestión La Zíngara

> Para el personal del restaurante y administración del sistema.
>
> **Acceso:** `www.lazingara.es/cocina`

---

## 1. Primeros pasos

### Acceder al panel

1. Abre `www.lazingara.es/cocina` en tu navegador.
2. Introduce tu **email** y **contraseña** (te los da el administrador).
3. Pulsa **Entrar**.

> ¿No tienes acceso? Pide al administrador que cree tu usuario desde la sección _Usuarios_.

### Qué ves al entrar

El **Dashboard** muestra un resumen rápido:

| Indicador | Qué significa |
|-----------|---------------|
| Platos en carta | Número de platos disponibles hoy |
| Reservas hoy | Cuántas reservas hay para el día de hoy |
| Eventos activos | Próximos eventos programados |

### Menú lateral

A la izquierda tienes la navegación. Las secciones que veas dependen de tu **rol y permisos**:

| Sección | Quién puede verla |
|---------|------------------|
| Dashboard | Todos |
| Carta | Todos |
| Menú Diario | Todos |
| Eventos | Todos |
| Reservas | Solo quien tenga permiso |
| Configuración | Solo administradores |
| Usuarios | Solo administradores |

---

## 2. Gestión de Carta

> ¿Dónde está? _Menú lateral → **Carta**_

Aquí gestionas todos los platos del restaurante, tanto los de carta como los de menú.

### Listado de platos

La tabla muestra todos los platos con:

| Columna | Qué puedes hacer |
|---------|-----------------|
| Nombre | Ordenar alfabéticamente |
| Categoría | Filtrar por categoría real (Carnes, Pescados, etc.) |
| Precio | Ordenar de menor a mayor |
| Disponible | Marcar/desmarcar si se sirve hoy |
| Recomendado | Pulsa ★ para marcar como recomendado, ☆ para quitarlo |
| Acciones | Editar o eliminar el plato |

### Añadir un plato

1. Pulsa **Añadir Plato** (botón superior, siempre visible).
2. Rellena:
   - **Nombre** (obligatorio)
   - **Descripción** (opcional)
   - **Precio** (obligatorio)
   - **Categoría** — selecciona de la lista (CARNES, PESCADOS, etc.)
   - **Tipo** — "Carta", "Menú", o ambos
   - **Disponible** — marcado por defecto
   - **Recomendado** — si quieres que aparezca en la sección destacada de la web
   - **Calorías** e **imagen** (opcional)
   - **Alérgenos** — selecciona los que aplican
3. Pulsa **Guardar**.

### Editar un plato

Pulsa el icono ✏️ en la fila del plato. Se abre el mismo formulario con los datos cargados.

### Reordenar platos por categoría (drag & drop)

1. Selecciona una **categoría** en el filtro (ej: "CARNES").
2. Al lado de cada plato aparece un handle **⠿**.
3. Una barra ámbar te indica que estás en modo reorden.
4. **Arrastra** el plato arriba o abajo dentro de esa categoría.
5. Al soltar, el orden se guarda automáticamente.
6. La web pública refleja el nuevo orden al instante.

> 💡 El modo reorden solo se activa cuando filtras por una categoría. Con el filtro "Todas las categorías" puedes ordenar por columnas (nombre, precio).

---

## 3. Menú Diario

> ¿Dónde está? _Menú lateral → **Menú Diario**_

Configura el menú del día para cada día de la semana.

### Cómo funciona

- Cada día de la semana (lunes a domingo) tiene una configuración independiente.
- El **precio** se configura en _Configuración → Precio menú diario / Precio menú sábado_.
- Los items del menú se dividen en secciones: Primeros, Segundos, Postres, Bebida, Pan.

### Crear un menú para un día

1. Busca el día que quieres configurar.
2. Si el día está vacío, pulsa **Crear menú**.
3. Rellena las secciones:
   - **Primeros** — añade los platos de primero
   - **Segundos** — platos de segundo
   - **Postres**
   - **Bebida** y **Pan** si aplica
4. Marca **Activo** para que se muestre en la web.
5. Pulsa **Guardar**.

### Reordenar platos por sección (drag & drop)

Dentro de cada sección (Primer Plato, Segundo Plato, etc.), puedes reordenar los platos arrastrándolos:

1. Sitúa el ratón sobre el handle **⠿** a la izquierda del plato.
2. **Arrastra** el plato arriba o abajo dentro de la misma sección.
3. Al soltar, el orden se guarda automáticamente.

### Activar/desactivar secciones

Cada sección del menú tiene un **checkbox** a la izquierda del título:

- ☑ **Activado** — la sección se muestra en la web (ej: "Primer Plato")
- ☐ **Desactivado** — la sección no aparece en la web (los platos siguen guardados)

Útil para ocultar "Bebida" o "Pan" si no aplican ese día, sin perder los datos.

### Personalizar títulos de secciones

Puedes cambiar el nombre de cualquier sección:

1. Haz **doble clic** sobre el título, o pulsa el botón **✏️**.
2. Aparecerá un campo de texto. Escribe el nuevo nombre.
3. Pulsa **Enter** o haz clic fuera para guardar.
4. Pulsa **Escape** para cancelar.

> 💡 El identificador interno de la sección (ej: `primer`, `segundo`) se muestra en gris a la derecha del título.

---

## 4. Eventos

> ¿Dónde está? _Menú lateral → **Eventos**_

Gestiona los eventos especiales del restaurante (espectáculos, festivos, etc.).

### Añadir un evento

1. Pulsa **Añadir Evento**.
2. Rellena:
   - **Título** del evento
   - **Descripción** (opcional)
   - **Fecha y hora**
   - **Categoría** — selecciona de la lista (Festivo, Espectáculo, o las que hayas creado)
   - **Capacidad** (número de personas, opcional)
   - **Imagen** (opcional)
3. Pulsa **Guardar**.

El evento aparecerá automáticamente en la sección pública de la web.

> 📝 Las categorías de eventos se gestionan desde _Configuración → Categorías de Eventos_. Puedes crear las que necesites (catas, cenas temáticas, etc.).

### Desactivar un evento

Los eventos se pueden **desactivar** sin borrarlos. Cambia su estado a "inactivo" desde la tabla de eventos.

---

## 5. Configuración del Sistema

> ¿Dónde está? _Menú lateral → **Configuración**_
>
> 🔒 Solo visible para administradores.

### Ajustes generales

| Opción | Qué hace |
|--------|----------|
| Capacidad total del local | Aforo máximo del restaurante (1–999) |
| Modo de ocupación | Automático (calcula según reservas) o Manual (introducir ocupación a mano) |
| Ocupación manual | Solo si el modo es "Manual" |
| Cliente elige mesa | Si activado, los clientes pueden seleccionar mesa al reservar online |

### Precios

| Opción | Qué hace |
|--------|----------|
| Precio menú diario | Precio para el menú de lunes a viernes |
| Precio menú sábado | Precio especial para los sábados |

### Recomendados

| Opción | Qué hace |
|--------|----------|
| Mostrar recomendados | Activa o desactiva la sección "Nuestras Recomendaciones" en la carta web |
| Título recomendados | Personaliza el título de esa sección (ej: "Los Favoritos de la Casa") |

### Categorías de platos

Aquí puedes gestionar las categorías que aparecen en la carta:

- **Añadir categoría** — escribe el nombre (se guarda automáticamente en mayúsculas)
- **Reordenar** — arrastra el handle **⠿** arriba o abajo para cambiar el orden
- **Eliminar** — solo se puede eliminar si no tiene platos asociados

### Categorías de eventos

Gestiona las categorías que se usan en los eventos (Festivo, Espectáculo, y las que crees):

- **Añadir categoría** — escribe el nombre
- **Reordenar** — arrastra el handle **⠿** para cambiar el orden
- **Eliminar** — al eliminar, los eventos de esa categoría se quedan sin categoría asignada

> 💡 Al guardar cualquier cambio verás un mensaje verde de confirmación. Si algo falla, verás un mensaje rojo.

---

## 6. Gestión de Usuarios

> ¿Dónde está? _Menú lateral → **Usuarios**_
>
> 🔒 Solo visible para administradores.

### Roles

| Rol | Acceso |
|-----|--------|
| **Admin** | Acceso completo a todas las secciones |
| **Editor** | Acceso limitado según permisos configurables |

### Añadir un usuario

1. Pulsa **Añadir Usuario**.
2. Introduce el **email** del usuario.
3. Selecciona el **rol** (Admin o Editor).
4. Si es Editor, marca los permisos que quieras concederle:
   - Gestión de carta
   - Gestión de eventos
   - Gestión de menú diario
   - Gestión de reservas
   - Gestión de configuración
   - Gestión de usuarios
5. Pulsa **Guardar**.

> El usuario recibirá un email de invitación de Supabase para establecer su contraseña.

---

## 7. Preguntas frecuentes

| Pregunta | Respuesta |
|----------|-----------|
| ¿Cómo recupero mi contraseña? | Pide al administrador que te restablezca el acceso |
| ¿Por qué no veo algunas secciones? | Tu usuario tiene permisos limitados. Habla con el administrador |
| ¿Los cambios en la carta se ven al instante en la web? | Sí, los cambios son en tiempo real |
| ¿Puedo tener el menú diario de la semana entera ya preparado? | Sí, cada día se configura independientemente y se activa cuando quieras |
| ¿Qué pasa si borro una categoría con platos? | No te dejará: primero debes reasignar los platos a otra categoría |
| ¿Cómo reordeno los platos en la carta? | Filtra por categoría y arrastra los platos con el handle ⠿ |
| ¿Puedo ocultar una sección del menú diario? | Sí, desmarca el checkbox de esa sección en el editor de menú |
| ¿Puedo cambiar el nombre de "Postre" a "Dulces"? | Sí, doble clic en el título de la sección y escríbelo |
| ¿Cómo marco un plato como recomendado sin abrir el formulario? | Pulsa la estrella ★/☆ directamente en la tabla de platos |
| ¿Por qué un plato muestra "Consultar" en la web? | Porque su precio está a 0. Así lo ves en la carta pública |
| ¿Las categorías de eventos son solo "Festivo" y "Espectáculo"? | No, puedes crear las que quieras desde Configuración |
| ¿Cómo reordeno las categorías en Configuración? | Arrástralas con el handle ⠿ y pulsa Guardar |

---

## 8. Soporte

¿Problemas con el panel? Contacta con el administrador del sistema o el desarrollador.

---

> **Documento v1.2** — Última actualización: Julio 2026. Añadido: estrella recomendado clicable, precio 0 = "Consultar", categorías dinámicas de eventos, drag & drop en configuración.
