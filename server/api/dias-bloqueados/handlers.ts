/**
 * dias-bloqueados API — Pure Handler Functions (BLO-004)
 *
 * handleListDiasBloqueados: returns all blocked days ordered by fecha ASC
 * handleCreateDiaBloqueado: creates a blocked day (validates not past, Zod schema)
 * handleDeleteDiaBloqueado: deletes a blocked day by id
 *
 * Uses serverSupabaseServiceRole for all DB access.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'
import { createDiaBloqueadoSchema } from '../../utils/validation'

type SupabaseServerClient = SupabaseClient<Database>
type HandlerResult = { status: number; body: Record<string, unknown> | unknown[] }

export async function handleListDiasBloqueados(
  supabase: SupabaseServerClient,
): Promise<HandlerResult> {
  const { data, error } = await supabase
    .from('dias_bloqueados')
    .select('*')
    .order('fecha', { ascending: true })

  if (error) {
    return { status: 500, body: { error: error.message } }
  }

  return { status: 200, body: (data || []) as unknown[] }
}

export async function handleCreateDiaBloqueado(
  supabase: SupabaseServerClient,
  body: Record<string, unknown>,
): Promise<HandlerResult> {
  // Validate with Zod
  const parsed = createDiaBloqueadoSchema.safeParse(body)
  if (!parsed.success) {
    const fieldErrors = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`)
    return {
      status: 400,
      body: { error: 'Validation failed', fields: fieldErrors },
    }
  }

  const { fecha, recurrente, fecha_fin, motivo } = parsed.data

  // Validate not past
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const bloqueoDate = new Date(fecha + 'T00:00:00')
  if (bloqueoDate < today && !recurrente) {
    return {
      status: 400,
      body: { error: 'No se pueden bloquear fechas pasadas' },
    }
  }

  const { data, error } = await supabase
    .from('dias_bloqueados')
    .insert({
      fecha,
      recurrente: recurrente ?? false,
      fecha_fin: fecha_fin ?? null,
      motivo: motivo ?? null,
    })
    .select('*')
    .single()

  if (error) {
    return { status: 500, body: { error: error.message } }
  }

  return { status: 201, body: data as unknown as Record<string, unknown> }
}

export async function handleDeleteDiaBloqueado(
  supabase: SupabaseServerClient,
  id: string,
): Promise<HandlerResult> {
  if (!id) {
    return { status: 400, body: { error: 'ID es requerido' } }
  }

  const { error, count } = await supabase
    .from('dias_bloqueados')
    .delete({ count: 'exact' })
    .eq('id', id)

  if (error) {
    return { status: 500, body: { error: error.message } }
  }

  if (count === 0) {
    return { status: 404, body: { error: 'Día bloqueado no encontrado' } }
  }

  return { status: 200, body: { success: true } }
}
