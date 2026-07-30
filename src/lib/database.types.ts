export type { Json, Database } from "@/integrations/supabase/types";

import type { Tables } from "@/integrations/supabase/types";

export type Categoria = Tables<"categorias">;
export type Dor = Tables<"dores">;
export type Perfil = Tables<"perfis">;

// A view `dores_publicas` só devolve dores aprovadas, então as colunas são
// sempre preenchidas mesmo que o Postgres as marque como anuláveis.
export type DorPublica = {
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
