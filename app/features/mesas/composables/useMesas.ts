/**
 * useMesas.ts — CRUD for the mesas table (MCA-003, MCA-007)
 *
 * Provides loadMesas (fetch all), createMesa, updateMesa, deleteMesa.
 * Uses useSupabaseClient() (Nuxt auto-import) and the Pinia canvas store.
 *
 * NOTE: No Realtime subscription — this is a single-user admin panel and
 * every mutation already updates the Pinia store synchronously.
 *
 * NOTE: useSupabaseClient is a Nuxt auto-import from @nuxtjs/supabase.
 * DO NOT import it — tests mock it on globalThis before module load.
 */
import { useCanvasStore } from '../stores/canvas-store'
import type { Mesa } from '#shared/contracts/mesas.contract'

/** Data required to create a new mesa (minus DB-generated fields) */
export interface MesaCreateData {
  numero_mesa: number
  capacidad_base: number
  posicion_x: number
  posicion_y: number
  ancho: number
  alto: number
  rotacion: number
  zona: Mesa['zona']
  forma: Mesa['forma']
}

export function useMesas() {
  const client = useSupabaseClient()
  const store = useCanvasStore()

  // ---------------------------------------------------------------------------
  // loadMesas — fetch all mesas from DB, populate store
  // ---------------------------------------------------------------------------

  async function loadMesas(): Promise<void> {
    const { data, error } = await client
      .from('mesas')
      .select('*')
      .order('numero_mesa')

    if (error) throw error
    store.setMesas((data as Mesa[]) ?? [])
  }

  // ---------------------------------------------------------------------------
  // createMesa — INSERT and push to store
  // ---------------------------------------------------------------------------

  async function createMesa(data: MesaCreateData): Promise<void> {
    const { data: created, error } = await client
      .from('mesas')
      .insert({
        numero_mesa: data.numero_mesa,
        capacidad_base: data.capacidad_base,
        posicion_x: data.posicion_x,
        posicion_y: data.posicion_y,
        ancho: data.ancho,
        alto: data.alto,
        rotacion: data.rotacion,
        zona: data.zona,
        forma: data.forma ?? 'rectangular',
        capacidad_actual: data.capacidad_base,
      })
      .select()
      .single()

    if (error) throw error
    if (created) {
      store.addMesa(created as unknown as Mesa)
    }
  }

  // ---------------------------------------------------------------------------
  // updateMesa — UPDATE in DB and patch store
  // ---------------------------------------------------------------------------

  async function updateMesa(id: string, data: Partial<Mesa>): Promise<void> {
    const { error } = await client
      .from('mesas')
      .update(data)
      .eq('id', id)

    if (error) throw error
    store.updateMesa(id, data)
  }

  // ---------------------------------------------------------------------------
  // deleteMesa — DELETE from DB and remove from store
  // ---------------------------------------------------------------------------

  async function deleteMesa(id: string): Promise<void> {
    const { error } = await client.from('mesas').delete().eq('id', id)

    if (error) throw error
    store.deleteMesa(id)
  }

  return {
    loadMesas,
    createMesa,
    updateMesa,
    deleteMesa,
  }
}
