import type { Session } from "@supabase/supabase-js";
import { createServerFn } from "@tanstack/react-start";

import type { Tables } from "@/integrations/supabase/types";

import type { Categoria, Dor, DorPublica, Perfil } from "./database.types";
import { supabase } from "./supabase";

export type DorStatus = "pendente" | "aprovada" | "rejeitada";

export type AuthState = {
  session: Session | null;
  perfil: Perfil | null;
};

export type NovaDorInput = {
  titulo: string;
  descricao: string;
  categoriaId: string;
  empresaContexto?: string;
};

const criarDorPublicaServer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: NovaDorInput) => input)
  .handler(async ({ data: input, context }) => {
    const { error } = await context.supabase.from("dores").insert({
      titulo: input.titulo.trim(),
      descricao: input.descricao.trim(),
      categoria_id: input.categoriaId,
      empresa_contexto: input.empresaContexto?.trim() || null,
      status: "pendente",
      autor_id: context.userId,
    });

    if (error) throw error;
  });

export type EditarDorInput = {
  id: string;
  titulo: string;
  descricao: string;
  categoriaId: string;
  empresaContexto?: string | null;
  status?: DorStatus;
  motivoRejeicao?: string | null;
};

export async function getAuthState(): Promise<AuthState> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) throw sessionError;
  if (!session) return { session: null, perfil: null };

  const { data: perfil, error: perfilError } = await supabase
    .from("perfis")
    .select("*")
    .eq("id", session.user.id)
    .maybeSingle();

  if (perfilError) throw perfilError;
  return { session, perfil };
}

export async function signIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signUp(nome: string, email: string, password: string) {
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { nome } },
  });
  if (error) throw error;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function listarCategorias(): Promise<Categoria[]> {
  const { data, error } = await supabase.from("categorias").select("*").order("nome");
  if (error) throw error;
  return data ?? [];
}

export type CategoriaAdmin = Categoria & {
  dores_count: number;
};

export async function listarCategoriasAdmin(): Promise<CategoriaAdmin[]> {
  const [{ data: categorias, error: categoriasError }, { data: dores, error: doresError }] =
    await Promise.all([
      supabase.from("categorias").select("*").order("nome"),
      supabase.from("dores").select("categoria_id"),
    ]);

  if (categoriasError) throw categoriasError;
  if (doresError) throw doresError;

  const counts = new Map<string, number>();
  for (const dor of dores ?? []) {
    counts.set(dor.categoria_id, (counts.get(dor.categoria_id) ?? 0) + 1);
  }

  return (categorias ?? []).map((categoria) => ({
    ...categoria,
    dores_count: counts.get(categoria.id) ?? 0,
  }));
}

export async function criarCategoria(nome: string) {
  const { error } = await supabase.from("categorias").insert({ nome: nome.trim() });
  if (error) throw error;
}

export async function atualizarCategoria(id: string, nome: string) {
  const { error } = await supabase.from("categorias").update({ nome: nome.trim() }).eq("id", id);
  if (error) throw error;
}

export async function excluirCategoria(id: string) {
  const { error } = await supabase.from("categorias").delete().eq("id", id);
  if (error) throw error;
}

export async function moverDoresDeCategoria(origemId: string, destinoId: string) {
  const { error } = await supabase
    .from("dores")
    .update({ categoria_id: destinoId })
    .eq("categoria_id", origemId);

  if (error) throw error;
}

export async function listarFeed(
  categoriaId?: string,
  ordenacao: "recentes" | "interesse" = "recentes",
) {
  let query = supabase.from("dores_publicas").select("*");

  if (categoriaId && categoriaId !== "todas") {
    query = query.eq("categoria_id", categoriaId);
  }

  const { data, error } =
    ordenacao === "interesse"
      ? await query.order("interesse_count", { ascending: false }).order("criado_em", {
          ascending: false,
        })
      : await query.order("criado_em", { ascending: false });

  if (error) throw error;
  return (data ?? []) as DorPublica[];
}

export async function listarMeusInteresses(usuarioId?: string): Promise<Set<string>> {
  if (!usuarioId) return new Set();

  const { data, error } = await supabase
    .from("interesses")
    .select("dor_id")
    .eq("usuario_id", usuarioId);

  if (error) throw error;
  return new Set((data ?? []).map((item) => item.dor_id));
}

export async function criarDor(input: NovaDorInput) {
  await criarDorPublicaServer({ data: input });
}

export async function marcarInteresse(dorId: string, usuarioId: string) {
  const { error } = await supabase.from("interesses").insert({
    dor_id: dorId,
    usuario_id: usuarioId,
  });

  if (error && error.code !== "23505") throw error;
}

export async function removerInteresse(dorId: string, usuarioId: string) {
  const { error } = await supabase
    .from("interesses")
    .delete()
    .eq("dor_id", dorId)
    .eq("usuario_id", usuarioId);

  if (error) throw error;
}

export async function listarMinhasDores(usuarioId?: string): Promise<Dor[]> {
  if (!usuarioId) return [];

  const { data, error } = await supabase
    .from("dores")
    .select("*")
    .eq("autor_id", usuarioId)
    .order("criado_em", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function listarPendentesAdmin(): Promise<
  (Dor & { categorias: { nome: string } | null })[]
> {
  const { data, error } = await supabase
    .from("dores")
    .select("*, categorias(nome)")
    .eq("status", "pendente")
    .order("criado_em", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function atualizarDorAdmin(input: EditarDorInput) {
  const updates: Partial<Tables<"dores">> = {
    titulo: input.titulo.trim(),
    descricao: input.descricao.trim(),
    categoria_id: input.categoriaId,
    empresa_contexto: input.empresaContexto?.trim() || null,
  };

  if (input.status) {
    updates.status = input.status;
    updates.motivo_rejeicao =
      input.status === "rejeitada" ? input.motivoRejeicao?.trim() || null : null;
  }

  const { error } = await supabase.from("dores").update(updates).eq("id", input.id);

  if (error) throw error;
}

export async function aprovarDor(id: string) {
  const { error } = await supabase
    .from("dores")
    .update({ status: "aprovada", motivo_rejeicao: null })
    .eq("id", id);

  if (error) throw error;
}

export async function rejeitarDor(id: string, motivo: string) {
  const { error } = await supabase
    .from("dores")
    .update({ status: "rejeitada", motivo_rejeicao: motivo.trim() || null })
    .eq("id", id);

  if (error) throw error;
}

export async function listarUsuariosAdmin(): Promise<Perfil[]> {
  const { data, error } = await supabase.from("perfis").select("*").order("criado_em", {
    ascending: false,
  });

  if (error) throw error;
  return data ?? [];
}

export async function atualizarUsuarioAdmin(id: string, updates: Pick<Perfil, "role" | "banido">) {
  const { error } = await supabase.from("perfis").update(updates).eq("id", id);
  if (error) throw error;
}

export type RegistroAuditoria = Tables<"registros_auditoria">;

export async function registrarLogin(usuarioId: string) {
  const { error } = await supabase
    .from("registros_auditoria")
    .insert({ tabela: "auth", acao: "login", ator_id: usuarioId });

  if (error) console.warn("Falha ao registrar login na auditoria", error.message);
}

export async function listarAuditoria(): Promise<RegistroAuditoria[]> {
  const { data, error } = await supabase
    .from("registros_auditoria")
    .select("*")
    .order("criado_em", { ascending: false })
    .limit(200);

  if (error) throw error;
  return data ?? [];
}

export async function listarDoresAdmin(
  status: "todas" | "pendente" | "aprovada" | "rejeitada" = "todas",
  categoriaId = "todas",
): Promise<(Dor & { categorias: { nome: string } | null })[]> {
  let query = supabase.from("dores").select("*, categorias(nome)");
  if (status !== "todas") query = query.eq("status", status);
  if (categoriaId !== "todas") query = query.eq("categoria_id", categoriaId);

  const { data, error } = await query.order("criado_em", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function excluirDor(id: string) {
  const { error } = await supabase.from("dores").delete().eq("id", id);
  if (error) throw error;
}
