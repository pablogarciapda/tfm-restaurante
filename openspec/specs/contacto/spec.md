# contacto Specification

## Purpose

Contact page at `/contacto`. Displays restaurant hours, address with interactive map embed, phone, email, and a contact form that mock-submits to a Nitro endpoint.

## Requirements

| ID | Requirement | RFC 2119 | Test Layer |
|----|------------|----------|------------|
| CO-001 | Business hours visible: "Lunes a Domingo: 13:00–16:00 y 20:00–23:00" (or per mock config). Format as table or list. | MUST | Unit |
| CO-002 | Interactive map embed: Google Maps or OpenStreetMap iframe at restaurant address. Lazy-load on scroll into view. | MUST | Unit |
| CO-003 | Phone number (clickable tel: link) and email (mailto: link) prominently displayed. | MUST | Unit |
| CO-004 | Contact form: nombre (required), email (required, format validated), mensaje (required, max 500 chars). Mock submits to POST /api/contacto. | MUST | Integration |

### Requirement: CO-001 — Business Hours

The system MUST display restaurant hours in a readable format. Spanish labels: "Horario". Hours MUST be configurable via mock data. Default: "Lunes a Domingo: 13:00–16:00 y 20:00–23:00".

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Hours visible | Page loads at `/contacto` | Inspect "Horario" section | Days and times displayed in Spanish |
| Split shift format | Lunch + dinner times | Render | "13:00–16:00" and "20:00–23:00" on separate or same line |

### Requirement: CO-002 — Interactive Map

The system MUST embed an interactive map showing the restaurant location (Santa María del Páramo, León). The iframe MUST lazy-load (load when scrolled into view via IntersectionObserver or `loading="lazy"`). Map provider: Google Maps embed or OpenStreetMap iframe.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Map renders | Page loads, map section in viewport | Scroll to map section | Interactive map iframe visible |
| Lazy load | Map section below fold | Page loads | No iframe in initial HTML; loads on scroll into view |
| Fallback on block | Map iframe blocked by adblocker | Page loads | Static address text still visible; no broken UI |

### Requirement: CO-003 — Phone and Email

The system MUST display the restaurant phone as a clickable `<a href="tel:+34...">` link and email as `<a href="mailto:...">`. Both MUST be prominently visible above or alongside the contact form.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Phone clickable | Page loads | Click phone number | Device opens dialer (mobile) or tel: handler |
| Email clickable | Page loads | Click email | Opens mail client via mailto: |

### Requirement: CO-004 — Contact Form

The system MUST render a form with: `nombre` (text, required), `email` (email, required, format validated), `mensaje` (textarea, required, max 500 chars). On valid submit, POST to `/api/contacto`. On success, show "Mensaje enviado. Gracias." confirmation. On error, show error message.

**Mock endpoint**: `POST /api/contacto` receives `{ nombre, email, mensaje }`, returns `200 { success: true }`.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Valid submit | All fields filled correctly | Click "Enviar" | POST /api/contacto → 200; "Mensaje enviado" shown |
| Missing name | nombre empty | Click "Enviar" | Error: "El nombre es obligatorio" |
| Invalid email | email = "bad" | Blur email field | Error: "Email no válido" |
| Message too long | mensaje = 501 chars | Type in textarea | Counter shows 500/500; cannot type more |
| Server error | Mock endpoint returns 500 | Submit | Error: "Error al enviar. Inténtelo de nuevo." |

## Edge Cases

- **Map embed**: use `loading="lazy"` on iframe to defer until visible; provide `title` attribute for accessibility
- **Form double-submit**: disable submit button after first click until response received
- **Empty message**: mensaje only whitespace → treated as empty, validation fails
- **XSS in form**: form fields rendered as text, not HTML; no v-html on user input
- **SSR**: form renders empty on server; client hydrates with empty state
