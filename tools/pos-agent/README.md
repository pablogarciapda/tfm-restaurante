# POS Agent — Impresión de reservas en Epson TM-T20III (M267D)

Agente que imprime en la impresora POS del restaurante cada **reserva nueva
hecha por internet** (o desde el panel). Conexión ESC/POS por TCP al puerto
9100.

## Arquitectura

```
Cliente web → POST /api/reservas (VPS)
                    │
                    ▼
        Supabase Realtime (INSERT en reservas)
                    │
                    ▼
   PC/RPi del restaurante (este agente, en la LAN)
                    │  socket TCP :9100 (ESC/POS raw)
                    ▼
        Epson TM-T20III M267D (Ethernet)
```

El agente corre en una máquina **dentro de la red del restaurante** (PC del
bar o Raspberry Pi). El VPS no puede alcanzar la impresora; esta es la razón
del agente local.

## Requisitos previos

1. **Aplicar la migración** `shared/db/migrations/008-enable-realtime-reservas.sql`
   en el proyecto Supabase (SQL Editor). Añade `reservas` a la publicación
   `supabase_realtime` para que el agente reciba los INSERT.
2. **Conocer la IP de la impresora** en la LAN (imprime una config page con la
   utilidad de Epson o revisa el DHCP del router).

## Instalación

```bash
cd tools/pos-agent
pnpm install
```

Crear `.env` en esta carpeta:

```env
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
PRINTER_HOST=192.168.1.87
PRINTER_PORT=9100
```

⚠️ La service role key no pasa por RLS. Este `.env` vive **solo** en la
máquina del restaurante, nunca en el VPS ni en el repositorio.

## Ejecutar

```bash
pnpm start
```

Deja corriendo en sesión persistente (systemd, PM2 o `tmux`). Al arrancar
muestra `Realtime pos-printer-agent: SUBSCRIBED`. Cada reserva nueva
(estado `pendiente` o `confirmada`) imprime un ticket con referencia,
fecha/hora local, pax, cliente, teléfono y mesa/zona.

## Solución de problemas

| Síntoma | Causa probable |
|---------|----------------|
| `Realtime: CHANNEL_ERROR` | Migración 008 sin aplicar, o keys mal copiadas |
| `printer timeout` | Impresora apagada, IP distinta, o puerto bloqueado |
| Ticket sin acentos | Intencional: transliteración para el charset térmico |
| No imprime nada | El estado de la reserva no es `pendiente`/`confirmada` |
