// Supabase database types — auto-generated from the live DB schema.
// Project: sqtzcjcyciatagakmmcf (La Zíngara)
// Generated: 2026-07-03 via supabase-zingara_generate_typescript_types (MCP)
//
// REGENERATION CONVENTION (IMPORTANT):
//   1. Regenerate structural types via the MCP tool supabase-zingara_generate_typescript_types
//      (or CLI: `supabase gen types typescript --project-id sqtzcjcyciatagakmmcf`).
//   2. RE-APPLY the CHECK-constrained literal unions listed below. supabase gen types
//      infers real Postgres enums but NOT text columns with CHECK constraints — these
//      are narrowed here to literal unions for compile-time type-safety. If a CHECK
//      constraint changes, update the union here too.
//        profiles.role             -> 'admin' | 'editor'
//        eventos.categoria          -> 'festivo' | 'espectaculo'
//        configuracion.modo_ocupacion -> 'auto' | 'manual'
//        mesas.zona                -> 'Principal' | 'Zingaro' | 'Privado' | 'Terraza' | 'Bar'
//        reservas.estado           -> 'pendiente' | 'confirmada' | 'cancelada' | 'completada' | 'standby' | null
//        menu_diario_items.seccion  -> 'primer' | 'segundo' | 'postre' | 'bebida' | 'pan'
//   Do NOT hand-edit any other part of this file. Only the 7 overlay rules above (6 + categorias text) are a manual overlay.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      categorias: {
        Row: {
          created_at: string
          id: string
          nombre: string
          puesto: number
        }
        Insert: {
          created_at?: string
          id?: string
          nombre: string
          puesto?: number
        }
        Update: {
          created_at?: string
          id?: string
          nombre?: string
          puesto?: number
        }
        Relationships: []
      }
      configuracion: {
        Row: {
          capacidad_total_local: number | null
          cliente_elige_mesa: boolean | null
          created_at: string
          id: string
          modo_ocupacion: 'auto' | 'manual'
          ocupacion_manual: number
          precio_menu_diario: number | null
          precio_menu_sabado: number | null
          updated_at: string
        }
        Insert: {
          capacidad_total_local?: number | null
          cliente_elige_mesa?: boolean | null
          created_at?: string
          id?: string
          modo_ocupacion?: 'auto' | 'manual'
          ocupacion_manual?: number
          precio_menu_diario?: number | null
          precio_menu_sabado?: number | null
          updated_at?: string
        }
        Update: {
          capacidad_total_local?: number | null
          cliente_elige_mesa?: boolean | null
          created_at?: string
          id?: string
          modo_ocupacion?: 'auto' | 'manual'
          ocupacion_manual?: number
          precio_menu_diario?: number | null
          precio_menu_sabado?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      eventos: {
        Row: {
          activo: boolean | null
          capacidad: number | null
          categoria: 'festivo' | 'espectaculo'
          created_at: string
          descripcion: string | null
          estado: string | null
          fecha: string
          id: string
          imagen_url: string | null
          titulo: string
          updated_at: string
        }
        Insert: {
          activo?: boolean | null
          capacidad?: number | null
          categoria: 'festivo' | 'espectaculo'
          created_at?: string
          descripcion?: string | null
          estado?: string | null
          fecha: string
          id?: string
          imagen_url?: string | null
          titulo: string
          updated_at?: string
        }
        Update: {
          activo?: boolean | null
          capacidad?: number | null
          categoria?: 'festivo' | 'espectaculo'
          created_at?: string
          descripcion?: string | null
          estado?: string | null
          fecha?: string
          id?: string
          imagen_url?: string | null
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      menu_diario_config: {
        Row: {
          activo: boolean | null
          created_at: string
          day_of_week: number
          fecha: string | null
          id: string
          precio: string
          updated_at: string
        }
        Insert: {
          activo?: boolean | null
          created_at?: string
          day_of_week: number
          fecha?: string | null
          id?: string
          precio: string
          updated_at?: string
        }
        Update: {
          activo?: boolean | null
          created_at?: string
          day_of_week?: number
          fecha?: string | null
          id?: string
          precio?: string
          updated_at?: string
        }
        Relationships: []
      }
      menu_diario_items: {
        Row: {
          config_id: string
          descripcion: string | null
          id: string
          plato_nombre: string
          puesto: number | null
          seccion: 'primer' | 'segundo' | 'postre' | 'bebida' | 'pan'
        }
        Insert: {
          config_id: string
          descripcion?: string | null
          id?: string
          plato_nombre: string
          puesto?: number | null
          seccion: 'primer' | 'segundo' | 'postre' | 'bebida' | 'pan'
        }
        Update: {
          config_id?: string
          descripcion?: string | null
          id?: string
          plato_nombre?: string
          puesto?: number | null
          seccion?: 'primer' | 'segundo' | 'postre' | 'bebida' | 'pan'
        }
        Relationships: [
          {
            foreignKeyName: "menu_diario_items_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "menu_diario_config"
            referencedColumns: ["id"]
          },
        ]
      }
      mesas: {
        Row: {
          alto: number | null
          ancho: number | null
          capacidad_actual: number
          capacidad_base: number
          created_at: string
          id: string
          id_fusion: string | null
          mesa_padre_id: string | null
          numero_mesa: number
          posicion_x: number | null
          posicion_y: number | null
          rotacion: number | null
          updated_at: string
          zona: 'Principal' | 'Zingaro' | 'Privado' | 'Terraza' | 'Bar'
        }
        Insert: {
          alto?: number | null
          ancho?: number | null
          capacidad_actual?: number
          capacidad_base: number
          created_at?: string
          id?: string
          id_fusion?: string | null
          mesa_padre_id?: string | null
          numero_mesa: number
          posicion_x?: number | null
          posicion_y?: number | null
          rotacion?: number | null
          updated_at?: string
          zona: 'Principal' | 'Zingaro' | 'Privado' | 'Terraza' | 'Bar'
        }
        Update: {
          alto?: number | null
          ancho?: number | null
          capacidad_actual?: number
          capacidad_base?: number
          created_at?: string
          id?: string
          id_fusion?: string | null
          mesa_padre_id?: string | null
          numero_mesa?: number
          posicion_x?: number | null
          posicion_y?: number | null
          rotacion?: number | null
          updated_at?: string
          zona?: 'Principal' | 'Zingaro' | 'Privado' | 'Terraza' | 'Bar'
        }
        Relationships: [
          {
            foreignKeyName: "mesas_mesa_padre_id_fkey"
            columns: ["mesa_padre_id"]
            isOneToOne: false
            referencedRelation: "mesas"
            referencedColumns: ["id"]
          },
        ]
      }
      platos: {
        Row: {
          alergenos: string[] | null
          calorias: number | null
          categoria: string
          created_at: string
          descripcion: string | null
          disponible: boolean | null
          id: string
          imagen_url: string | null
          nombre: string
          precio: number
          puesto: number | null
          recomendado: boolean
          tipo_menu: string | null
          updated_at: string
        }
        Insert: {
          alergenos?: string[] | null
          calorias?: number | null
          categoria: string
          created_at?: string
          descripcion?: string | null
          disponible?: boolean | null
          id?: string
          imagen_url?: string | null
          nombre: string
          precio: number
          puesto?: number | null
          recomendado?: boolean
          tipo_menu?: string | null
          updated_at?: string
        }
        Update: {
          alergenos?: string[] | null
          calorias?: number | null
          categoria?: string
          created_at?: string
          descripcion?: string | null
          disponible?: boolean | null
          id?: string
          imagen_url?: string | null
          nombre?: string
          precio?: number
          puesto?: number | null
          recomendado?: boolean
          tipo_menu?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          activo: boolean
          created_at: string
          id: string
          permissions: Json
          role: 'admin' | 'editor'
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          id: string
          permissions?: Json
          role?: 'admin' | 'editor'
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          id?: string
          permissions?: Json
          role?: 'admin' | 'editor'
          updated_at?: string
        }
        Relationships: []
      }
      reservas: {
        Row: {
          created_at: string
          email: string | null
          estado: 'pendiente' | 'confirmada' | 'cancelada' | 'completada' | 'standby' | null
          fecha_hora: string
          id: string
          mesa_id: string | null
          nombre_cliente: string
          numero_comensales: number | null
          telefono: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          estado?: 'pendiente' | 'confirmada' | 'cancelada' | 'completada' | 'standby' | null
          fecha_hora: string
          id?: string
          mesa_id?: string | null
          nombre_cliente: string
          numero_comensales?: number | null
          telefono?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          estado?: 'pendiente' | 'confirmada' | 'cancelada' | 'completada' | 'standby' | null
          fecha_hora?: string
          id?: string
          mesa_id?: string | null
          nombre_cliente?: string
          numero_comensales?: number | null
          telefono?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservas_mesa_id_fkey"
            columns: ["mesa_id"]
            isOneToOne: false
            referencedRelation: "mesas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_write: { Args: { resource: string }; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
