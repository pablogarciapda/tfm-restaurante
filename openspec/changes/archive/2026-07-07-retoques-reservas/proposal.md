# SDD Proposal — retoques-reservas

## Change Summary
Multiple improvements to the reservation system for La Zíngara restaurant.

## Deliverables

### 1. clientes-model (New)
- Table `clientes`: id (uuid PK), nombre, telefono (UNIQUE), email, created_at, updated_at
- Modify `reservas`: add `cliente_id` FK, drop `nombre_cliente`/`telefono`/`email`
- Migrate existing data

### 2. gdpr-consent (New)
- Scrollable modal popup before SMS step
- Text from `configuracion.texto_proteccion_datos`
- Accept button enabled only at scroll end; Reject returns to form with data intact

### 3. email-service (New)
- SMTP config in `configuracion`: host, port, user, from_email, smtp_password (write-only)
- Port-based TLS: 465→SSL, 587→STARTTLS
- Send confirmation email on reservation confirmed
- Test email button in admin

### 4. modo-reserva (New)
- `configuracion.modo_reserva`: 'automatica' | 'verificada'
- Automatica: SMS OK → confirmed; Verificada: SMS OK → pending → manual confirm

### 5. panel-clientes (New)
- `/cocina/clientes` CRUD page with reservation history

### 6. reservas-flow (Modified)
- Remove E.164 validation, accept Spanish mobile format
- Add GDPR popup step
- Rewrite POST /api/reservas: real Supabase writes, create cliente if needed

### 7. panel-configuracion (Modified)
- Reorganize by sections: General, Elección de mesa, Precios, Recomendados, Imágenes, Correo saliente, Protección de datos, Reservas
- New SMTP fields, texto_proteccion_datos, modo_reserva

### 8. api-config (New)
- GET /api/config (excludes smtp_password), POST /api/config (password write-only)

### 9. panel-permissions (Modified)
- Add 'clientes' permission to defaults

## Database Changes
- `configuracion`: +smtp_host, smtp_port, smtp_user, smtp_from_email, smtp_password, texto_proteccion_datos, modo_reserva
- New `clientes` table
- `reservas`: +cliente_id FK, drop nombre_cliente/telefono/email

## API Endpoints
- GET/POST /api/config, POST /api/reservas (real), CRUD /api/cocina/clientes, POST /api/cocina/reservas/confirmar, POST /api/cocina/smtp/test
