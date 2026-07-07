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
      categorias_eventos: {
        Row: {
          created_at: string | null
          id: string
          nombre: string
          puesto: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          nombre: string
          puesto?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          nombre?: string
          puesto?: number
        }
        Relationships: []
      }
      clientes: {
        Row: {
          apellidos: string | null
          created_at: string | null
          email: string | null
          id: string
          nombre: string
          telefono: string
          updated_at: string | null
        }
        Insert: {
          apellidos?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          nombre: string
          telefono: string
          updated_at?: string | null
        }
        Update: {
          apellidos?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          nombre?: string
          telefono?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      configuracion: {
        Row: {
          auto_comprimir_imagen: boolean
          calidad_imagen: number
          capacidad_total_local: number | null
          cliente_elige_mesa: boolean | null
          cliente_elige_zona: string
          created_at: string
          horarios_config: Json
          id: string
          max_ancho_imagen: number
          max_peso_imagen: number
          modo_ocupacion: string
          modo_reserva: string | null
          mostrar_recomendados: boolean | null
          ocupacion_manual: number
          precio_menu_diario: number | null
          precio_menu_sabado: number | null
          public_config: Json
          smtp_from_email: string | null
          smtp_host: string | null
          smtp_password: string | null
          smtp_port: number | null
          smtp_user: string | null
          texto_proteccion_datos: string | null
          titulo_recomendados: string | null
          updated_at: string
          zonas_config: Json
        }
        Insert: {
          auto_comprimir_imagen?: boolean
          calidad_imagen?: number
          capacidad_total_local?: number | null
          cliente_elige_mesa?: boolean | null
          cliente_elige_zona?: string
          created_at?: string
          horarios_config?: Json
          id?: string
          max_ancho_imagen?: number
          max_peso_imagen?: number
          modo_ocupacion?: string
          modo_reserva?: string | null
          mostrar_recomendados?: boolean | null
          ocupacion_manual?: number
          precio_menu_diario?: number | null
          precio_menu_sabado?: number | null
          public_config?: Json
          smtp_from_email?: string | null
          smtp_host?: string | null
          smtp_password?: string | null
          smtp_port?: number | null
          smtp_user?: string | null
          texto_proteccion_datos?: string | null
          titulo_recomendados?: string | null
          updated_at?: string
          zonas_config?: Json
        }
        Update: {
          auto_comprimir_imagen?: boolean
          calidad_imagen?: number
          capacidad_total_local?: number | null
          cliente_elige_mesa?: boolean | null
          cliente_elige_zona?: string
          created_at?: string
          horarios_config?: Json
          id?: string
          max_ancho_imagen?: number
          max_peso_imagen?: number
          modo_ocupacion?: string
          modo_reserva?: string | null
          mostrar_recomendados?: boolean | null
          ocupacion_manual?: number
          precio_menu_diario?: number | null
          precio_menu_sabado?: number | null
          public_config?: Json
          smtp_from_email?: string | null
          smtp_host?: string | null
          smtp_password?: string | null
          smtp_port?: number | null
          smtp_user?: string | null
          texto_proteccion_datos?: string | null
          titulo_recomendados?: string | null
          updated_at?: string
          zonas_config?: Json
        }
        Relationships: []
      }
      dias_bloqueados: {
        Row: {
          created_at: string
          fecha: string
          fecha_fin: string | null
          id: string
          motivo: string | null
          recurrente: boolean
        }
        Insert: {
          created_at?: string
          fecha: string
          fecha_fin?: string | null
          id?: string
          motivo?: string | null
          recurrente?: boolean
        }
        Update: {
          created_at?: string
          fecha?: string
          fecha_fin?: string | null
          id?: string
          motivo?: string | null
          recurrente?: boolean
        }
        Relationships: []
      }
      eventos: {
        Row: {
          activo: boolean | null
          capacidad: number | null
          categoria_id: string | null
          created_at: string
          crop_focus_x: number
          crop_focus_y: number
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
          categoria_id?: string | null
          created_at?: string
          crop_focus_x?: number
          crop_focus_y?: number
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
          categoria_id?: string | null
          created_at?: string
          crop_focus_x?: number
          crop_focus_y?: number
          descripcion?: string | null
          estado?: string | null
          fecha?: string
          id?: string
          imagen_url?: string | null
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "eventos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_eventos"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_diario_config: {
        Row: {
          activo: boolean | null
          created_at: string
          day_of_week: number
          fecha: string | null
          id: string
          precio: string
          secciones_config: Json | null
          updated_at: string
        }
        Insert: {
          activo?: boolean | null
          created_at?: string
          day_of_week: number
          fecha?: string | null
          id?: string
          precio: string
          secciones_config?: Json | null
          updated_at?: string
        }
        Update: {
          activo?: boolean | null
          created_at?: string
          day_of_week?: number
          fecha?: string | null
          id?: string
          precio?: string
          secciones_config?: Json | null
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
          seccion: string
        }
        Insert: {
          config_id: string
          descripcion?: string | null
          id?: string
          plato_nombre: string
          puesto?: number | null
          seccion: string
        }
        Update: {
          config_id?: string
          descripcion?: string | null
          id?: string
          plato_nombre?: string
          puesto?: number | null
          seccion?: string
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
          zona: string
          zona_nombre: string | null
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
          zona: string
          zona_nombre?: string | null
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
          zona?: string
          zona_nombre?: string | null
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
          role: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          id: string
          permissions?: Json
          role?: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          id?: string
          permissions?: Json
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      reservas: {
        Row: {
          cliente_id: string | null
          created_at: string
          estado: string | null
          fecha_hora: string
          id: string
          mesa_id: string | null
          numero_comensales: number | null
          zona_id: string | null
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          estado?: string | null
          fecha_hora: string
          id?: string
          mesa_id?: string | null
          numero_comensales?: number | null
          zona_id?: string | null
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          estado?: string | null
          fecha_hora?: string
          id?: string
          mesa_id?: string | null
          numero_comensales?: number | null
          zona_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
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
