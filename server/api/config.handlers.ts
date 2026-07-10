/**
 * Config API — Pure Handler Functions (CFG-API)
 *
 * handleGetConfig: reads config, redacts smtp_password
 * handleUpdateConfig: upserts config, password write-only logic,
 *                    validates horarios_config + zonas_config with Zod
 *
 * Uses serverSupabaseServiceRole for all DB access.
 * AD-10: service_role key NEVER exposed to client.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'
import { horarioConfigSchema, zonasConfigSchema } from '../utils/validation'

type SupabaseServerClient = SupabaseClient<Database>
type HandlerResult = { status: number; body: Record<string, unknown> }

export async function handleGetConfig(
  supabase: SupabaseServerClient,
): Promise<HandlerResult> {
  const { data, error } = await supabase
    .from('configuracion')
    .select('*')
    .limit(1)
    .single()

  if (error) {
    return {
      status: 500,
      body: { error: error.message },
    }
  }

  if (!data) {
    return {
      status: 404,
      body: { error: 'Configuración no encontrada' },
    }
  }

  // NEVER expose smtp_password to the client
  const { smtp_password: _, ...safeConfig } = data

  return {
    status: 200,
    body: safeConfig as unknown as Record<string, unknown>,
  }
}

export async function handleUpdateConfig(
  supabase: SupabaseServerClient,
  body: Record<string, unknown>,
): Promise<HandlerResult> {
  // Get current config row (for upsert)
  const { data: current } = await supabase
    .from('configuracion')
    .select('id, smtp_password')
    .limit(1)
    .single()

  // Build update payload
  const updateData: Record<string, unknown> = { ...body }
  console.log('[config] server received:', { diario: updateData.precio_menu_diario, sabado: updateData.precio_menu_sabado, domingo: updateData.precio_menu_domingo })
  delete updateData.id // never allow id override

  // Validate horarios_config with Zod if provided
  if ('horarios_config' in updateData && updateData.horarios_config !== null) {
    const parsed = horarioConfigSchema.safeParse(updateData.horarios_config)
    if (!parsed.success) {
      const fieldErrors = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`)
      return {
        status: 400,
        body: { error: 'Horarios inválidos', fields: fieldErrors },
      }
    }
    updateData.horarios_config = parsed.data
  }

  // Validate zonas_config with Zod if provided
  if ('zonas_config' in updateData && updateData.zonas_config !== null) {
    const parsed = zonasConfigSchema.safeParse(updateData.zonas_config)
    if (!parsed.success) {
      const fieldErrors = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`)
      return {
        status: 400,
        body: { error: 'Zonas inválidas', fields: fieldErrors },
      }
    }
    updateData.zonas_config = parsed.data
  }

  // Password write-only logic
  if ('smtp_password' in updateData) {
    const pw = (updateData.smtp_password as string) || ''
    if (pw === '' || pw === '••••••••') {
      // Preserve existing password
      delete updateData.smtp_password
    }
    // else: real password value — keep it in updateData
  }

  // Upsert
  if (current?.id) {
    const { error: updateError } = await supabase
      .from('configuracion')
      .update(updateData as any)
      .eq('id', current.id)
    if (updateError) {
      console.error('[config] update error:', updateError)
      return { status: 500, body: { error: updateError.message } }
    }
  } else {
    await supabase.from('configuracion').insert(updateData as any)
  }
  console.log('[config] update success, fetching fresh config...')

  // Return redacted updated config
  return handleGetConfig(supabase)
}
