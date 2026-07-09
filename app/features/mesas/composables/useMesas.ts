/**
 * useMesas.ts — CRUD + Realtime subscription for the mesas table (MCA-003, MCA-007)
 *
 * Provides loadMesas (fetch all), createMesa, updateMesa, deleteMesa,
 * and Realtime channel lifecycle (subscribeRealtime, unsubscribeRealtime).
 * Uses useSupabaseClient() (Nuxt auto-import) and the Pinia canvas store.
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let channelRef: any = null

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

  // ---------------------------------------------------------------------------
  // Realtime subscription
  // ---------------------------------------------------------------------------

  function subscribeRealtime(): void {
    channelRef = client.channel('mesas-realtime')
    channelRef
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mesas' },
        (payload: { eventType: string; new?: Record<string, unknown>; old?: Record<string, unknown> }) => {
          if (payload.eventType === 'INSERT' && payload.new) {
            store.addMesa(payload.new as unknown as Mesa)
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            store.updateMesa(
              (payload.new as Record<string, unknown>).id as string,
              payload.new as unknown as Partial<Mesa>,
            )
          } else if (payload.eventType === 'DELETE' && payload.old) {
            store.deleteMesa((payload.old as Record<string, unknown>).id as string)
          }
        },
      )
      .subscribe()
  }

  function unsubscribeRealtime(): void {
    if (channelRef) {
      client.removeChannel(channelRef)
      channelRef = null
    }
  }

  return {
    loadMesas,
    createMesa,
    updateMesa,
    deleteMesa,
    subscribeRealtime,
    unsubscribeRealtime,
  }
}
