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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      categorias: {
        Row: {
          criado_em: string
          id: string
          nome: string
        }
        Insert: {
          criado_em?: string
          id?: string
          nome: string
        }
        Update: {
          criado_em?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      dores: {
        Row: {
          aprovado_em: string | null
          arquivada_em: string | null
          arquivado_por: string | null
          atualizado_em: string
          autor_id: string | null
          categoria_id: string
          criado_em: string
          descricao: string
          empresa_contexto: string | null
          id: string
          motivo_rejeicao: string | null
          status: Database["public"]["Enums"]["dor_status"]
          titulo: string
        }
        Insert: {
          aprovado_em?: string | null
          arquivada_em?: string | null
          arquivado_por?: string | null
          atualizado_em?: string
          autor_id?: string | null
          categoria_id: string
          criado_em?: string
          descricao: string
          empresa_contexto?: string | null
          id?: string
          motivo_rejeicao?: string | null
          status?: Database["public"]["Enums"]["dor_status"]
          titulo: string
        }
        Update: {
          aprovado_em?: string | null
          arquivada_em?: string | null
          arquivado_por?: string | null
          atualizado_em?: string
          autor_id?: string | null
          categoria_id?: string
          criado_em?: string
          descricao?: string
          empresa_contexto?: string | null
          id?: string
          motivo_rejeicao?: string | null
          status?: Database["public"]["Enums"]["dor_status"]
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "dores_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dores_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
        ]
      }
      interesses: {
        Row: {
          criado_em: string
          dor_id: string
          id: string
          usuario_id: string
        }
        Insert: {
          criado_em?: string
          dor_id: string
          id?: string
          usuario_id: string
        }
        Update: {
          criado_em?: string
          dor_id?: string
          id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interesses_dor_id_fkey"
            columns: ["dor_id"]
            isOneToOne: false
            referencedRelation: "dores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interesses_dor_id_fkey"
            columns: ["dor_id"]
            isOneToOne: false
            referencedRelation: "dores_publicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interesses_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
        ]
      }
      perfis: {
        Row: {
          banido: boolean
          criado_em: string
          email: string
          id: string
          nome: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          banido?: boolean
          criado_em?: string
          email?: string
          id: string
          nome?: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          banido?: boolean
          criado_em?: string
          email?: string
          id?: string
          nome?: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
      registros_auditoria: {
        Row: {
          acao: Database["public"]["Enums"]["audit_acao"]
          ator_email: string | null
          ator_id: string | null
          criado_em: string
          dados_antigos: Json | null
          dados_novos: Json | null
          id: string
          registro_id: string | null
          tabela: string
        }
        Insert: {
          acao: Database["public"]["Enums"]["audit_acao"]
          ator_email?: string | null
          ator_id?: string | null
          criado_em?: string
          dados_antigos?: Json | null
          dados_novos?: Json | null
          id?: string
          registro_id?: string | null
          tabela: string
        }
        Update: {
          acao?: Database["public"]["Enums"]["audit_acao"]
          ator_email?: string | null
          ator_id?: string | null
          criado_em?: string
          dados_antigos?: Json | null
          dados_novos?: Json | null
          id?: string
          registro_id?: string | null
          tabela?: string
        }
        Relationships: []
      }
    }
    Views: {
      dores_publicas: {
        Row: {
          aprovado_em: string | null
          autor_id: string | null
          categoria_id: string | null
          categoria_nome: string | null
          criado_em: string | null
          descricao: string | null
          empresa_contexto: string | null
          id: string | null
          interesse_count: number | null
          status: Database["public"]["Enums"]["dor_status"] | null
          titulo: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dores_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dores_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      audit_acao: "insert" | "update" | "delete" | "login"
      dor_status: "pendente" | "aprovada" | "rejeitada"
      user_role: "user" | "admin"
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
    Enums: {
      audit_acao: ["insert", "update", "delete", "login"],
      dor_status: ["pendente", "aprovada", "rejeitada"],
      user_role: ["user", "admin"],
    },
  },
} as const
