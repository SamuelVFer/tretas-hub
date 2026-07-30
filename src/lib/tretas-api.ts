import type { Session } from "@supabase/supabase-js";

import type { Categoria, Dor, DorPublica, Perfil } from "./database.types";
import { supabase } from "./supabase";

export type AuthState = {
  session: Session | null;
  perfil: Perfil | null;
};

export type NovaDorInput = {
  titulo: string;
  descricao: string;
  categoriaId: string;
  empresaContexto?: string;
  autorId: string;
};

export type EditarDorInput = {
  id: string;
  titulo: string;
  descricao: string;
  categoriaId: string;
  empresaContexto?: string | null;
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
  const { error } = await supabase.from("dores").insert({
    titulo: input.titulo.trim(),
    descricao: input.descricao.trim(),
    categoria_id: input.categoriaId,
    empresa_contexto: input.empresaContexto?.trim() || null,
    autor_id: input.autorId,
    status: "pendente",
  });

  if (error) throw error;
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
  const { error } = await supabase
    .from("dores")
    .update({
      titulo: input.titulo.trim(),
      descricao: input.descricao.trim(),
      categoria_id: input.categoriaId,
      empresa_contexto: input.empresaContexto?.trim() || null,
    })
    .eq("id", input.id);

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
