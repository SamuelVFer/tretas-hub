export type { Json, Database } from "@/integrations/supabase/types";

import type { Tables } from "@/integrations/supabase/types";

export type Categoria = Tables<"categorias">;
export type Dor = Tables<"dores">;
export type DorPublica = Tables<"dores_publicas">;
export type Perfil = Tables<"perfis">;
