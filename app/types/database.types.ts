// Supabase database types — auto-generated from schema
// Project: sqtzcjcyciatagakmmcf (La Zíngara)
// Generated: 2026-07-02

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: 'admin' | 'editor'
          permissions: Json
          activo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          role?: 'admin' | 'editor'
          permissions?: Json
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          role?: 'admin' | 'editor'
          permissions?: Json
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
      }

      platos: {
        Row: {
          id: string
          nombre: string
          descripcion: string | null
          precio: number
          categoria: string
          tipo_menu: string | null
          imagen_url: string | null
          disponible: boolean | null
          calorias: number | null
          alergenos: string[] | null
          puesto: number | null
          recomendado: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nombre: string
          descripcion?: string | null
          precio: number
          categoria: string
          tipo_menu?: string | null
          imagen_url?: string | null
          disponible?: boolean | null
          calorias?: number | null
          alergenos?: string[] | null
          puesto?: number | null
          recomendado?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          descripcion?: string | null
          precio?: number
          categoria?: string
          tipo_menu?: string | null
          imagen_url?: string | null
          disponible?: boolean | null
          calorias?: number | null
          alergenos?: string[] | null
          puesto?: number | null
          recomendado?: boolean
          created_at?: string
          updated_at?: string
        }
      }

      eventos: {
        Row: {
          id: string
          titulo: string
          descripcion: string | null
          fecha: string
          categoria: 'festivo' | 'espectaculo'
          imagen_url: string | null
          capacidad: number | null
          estado: string | null
          activo: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          titulo: string
          descripcion?: string | null
          fecha: string
          categoria: 'festivo' | 'espectaculo'
          imagen_url?: string | null
          capacidad?: number | null
          estado?: string | null
          activo?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          titulo?: string
          descripcion?: string | null
          fecha?: string
          categoria?: 'festivo' | 'espectaculo'
          imagen_url?: string | null
          capacidad?: number | null
          estado?: string | null
          activo?: boolean | null
          created_at?: string
          updated_at?: string
        }
      }

      menu_diario_config: {
        Row: {
          id: string
          day_of_week: number
          precio: string
          activo: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          day_of_week: number
          precio: string
          activo?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          day_of_week?: number
          precio?: string
          activo?: boolean | null
          created_at?: string
          updated_at?: string
        }
      }

      menu_diario_items: {
        Row: {
          id: string
          config_id: string
          seccion: 'primer' | 'segundo' | 'postre' | 'bebida' | 'pan'
          plato_nombre: string
          descripcion: string | null
          puesto: number | null
        }
        Insert: {
          id?: string
          config_id: string
          seccion: 'primer' | 'segundo' | 'postre' | 'bebida' | 'pan'
          plato_nombre: string
          descripcion?: string | null
          puesto?: number | null
        }
        Update: {
          id?: string
          config_id?: string
          seccion?: 'primer' | 'segundo' | 'postre' | 'bebida' | 'pan'
          plato_nombre?: string
          descripcion?: string | null
          puesto?: number | null
        }
      }

      configuracion: {
        Row: {
          id: string
          cliente_elige_mesa: boolean | null
          capacidad_total_local: number | null
          created_at: string
          updated_at: string
          modo_ocupacion: 'auto' | 'manual'
          ocupacion_manual: number
        }
        Insert: {
          id?: string
          cliente_elige_mesa?: boolean | null
          capacidad_total_local?: number | null
          created_at?: string
          updated_at?: string
          modo_ocupacion?: 'auto' | 'manual'
          ocupacion_manual?: number
        }
        Update: {
          id?: string
          cliente_elige_mesa?: boolean | null
          capacidad_total_local?: number | null
          created_at?: string
          updated_at?: string
          modo_ocupacion?: 'auto' | 'manual'
          ocupacion_manual?: number
        }
      }

      reservas: {
        Row: {
          id: string
          nombre_cliente: string
          telefono: string | null
          email: string | null
          fecha_hora: string
          numero_comensales: number | null
          estado: 'pendiente' | 'confirmada' | 'cancelada' | 'completada' | 'standby' | null
          mesa_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          nombre_cliente: string
          telefono?: string | null
          email?: string | null
          fecha_hora: string
          numero_comensales?: number | null
          estado?: 'pendiente' | 'confirmada' | 'cancelada' | 'completada' | 'standby' | null
          mesa_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          nombre_cliente?: string
          telefono?: string | null
          email?: string | null
          fecha_hora?: string
          numero_comensales?: number | null
          estado?: 'pendiente' | 'confirmada' | 'cancelada' | 'completada' | 'standby' | null
          mesa_id?: string | null
          created_at?: string
        }
      }

      mesas: {
        Row: {
          id: string
          numero_mesa: number
          capacidad_base: number
          posicion_x: number | null
          posicion_y: number | null
          ancho: number | null
          alto: number | null
          rotacion: number | null
          zona: 'Principal' | 'Zingaro' | 'Privado' | 'Terraza' | 'Bar'
          mesa_padre_id: string | null
          id_fusion: string | null
          capacidad_actual: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          numero_mesa: number
          capacidad_base: number
          posicion_x?: number | null
          posicion_y?: number | null
          ancho?: number | null
          alto?: number | null
          rotacion?: number | null
          zona: 'Principal' | 'Zingaro' | 'Privado' | 'Terraza' | 'Bar'
          mesa_padre_id?: string | null
          id_fusion?: string | null
          capacidad_actual?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          numero_mesa?: number
          capacidad_base?: number
          posicion_x?: number | null
          posicion_y?: number | null
          ancho?: number | null
          alto?: number | null
          rotacion?: number | null
          zona?: 'Principal' | 'Zingaro' | 'Privado' | 'Terraza' | 'Bar'
          mesa_padre_id?: string | null
          id_fusion?: string | null
          capacidad_actual?: number
          created_at?: string
          updated_at?: string
        }
      }
    }

    Views: Record<string, never>

    Functions: {
      can_write: {
        Args: { resource: string }
        Returns: boolean
      }
      handle_new_user: {
        Args: Record<string, never>
        Returns: undefined
      }
    }

    Enums: Record<string, never>
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]
export type Row<T extends keyof Database['public']['Tables']> = Tables<T>['Row']
export type Insert<T extends keyof Database['public']['Tables']> = Tables<T>['Insert']
export type Update<T extends keyof Database['public']['Tables']> = Tables<T>['Update']
