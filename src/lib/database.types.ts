export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.15";
  };
  public: {
    Tables: {
      categorias: {
        Row: {
          id: string;
          nome: string;
          criado_em: string;
        };
        Insert: {
          id?: string;
          nome: string;
          criado_em?: string;
        };
        Update: {
          id?: string;
          nome?: string;
          criado_em?: string;
        };
      };
      dores: {
        Row: {
          id: string;
          titulo: string;
          descricao: string;
          categoria_id: string;
          empresa_contexto: string | null;
          autor_id: string;
          status: "pendente" | "aprovada" | "rejeitada";
          motivo_rejeicao: string | null;
          criado_em: string;
          aprovado_em: string | null;
          atualizado_em: string;
        };
        Insert: {
          id?: string;
          titulo: string;
          descricao: string;
          categoria_id: string;
          empresa_contexto?: string | null;
          autor_id: string;
          status?: "pendente" | "aprovada" | "rejeitada";
          motivo_rejeicao?: string | null;
          criado_em?: string;
          aprovado_em?: string | null;
          atualizado_em?: string;
        };
        Update: {
          id?: string;
          titulo?: string;
          descricao?: string;
          categoria_id?: string;
          empresa_contexto?: string | null;
          autor_id?: string;
          status?: "pendente" | "aprovada" | "rejeitada";
          motivo_rejeicao?: string | null;
          criado_em?: string;
          aprovado_em?: string | null;
          atualizado_em?: string;
        };
      };
      interesses: {
        Row: {
          id: string;
          dor_id: string;
          usuario_id: string;
          criado_em: string;
        };
        Insert: {
          id?: string;
          dor_id: string;
          usuario_id: string;
          criado_em?: string;
        };
        Update: {
          id?: string;
          dor_id?: string;
          usuario_id?: string;
          criado_em?: string;
        };
      };
      perfis: {
        Row: {
          id: string;
          nome: string;
          email: string;
          role: "user" | "admin";
          banido: boolean;
          criado_em: string;
        };
        Insert: {
          id: string;
          nome?: string;
          email?: string;
          role?: "user" | "admin";
          banido?: boolean;
          criado_em?: string;
        };
        Update: {
          id?: string;
          nome?: string;
          email?: string;
          role?: "user" | "admin";
          banido?: boolean;
          criado_em?: string;
        };
      };
    };
    Views: {
      dores_publicas: {
        Row: {
          id: string;
          titulo: string;
          descricao: string;
          empresa_contexto: string | null;
          status: "aprovada";
          criado_em: string;
          aprovado_em: string | null;
          categoria_id: string;
          categoria_nome: string;
          autor_id: string;
          interesse_count: number;
        };
      };
    };
    Functions: {
      is_admin: {
        Args: { user_id?: string };
        Returns: boolean;
      };
      is_banned: {
        Args: { user_id?: string };
        Returns: boolean;
      };
    };
    Enums: {
      dor_status: "pendente" | "aprovada" | "rejeitada";
      user_role: "user" | "admin";
    };
    CompositeTypes: Record<string, never>;
  };
};

export type Categoria = Database["public"]["Tables"]["categorias"]["Row"];
export type Dor = Database["public"]["Tables"]["dores"]["Row"];
export type DorPublica = Database["public"]["Views"]["dores_publicas"]["Row"];
export type Perfil = Database["public"]["Tables"]["perfis"]["Row"];
