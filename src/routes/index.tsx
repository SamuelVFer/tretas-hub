import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  Check,
  CircleUserRound,
  Eye,
  Heart,
  Loader2,
  LogOut,
  Shield,
  SlidersHorizontal,
  UserPlus,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Dor, Perfil } from "@/lib/database.types";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import {
  aprovarDor,
  atualizarDorAdmin,
  atualizarUsuarioAdmin,
  criarDor,
  getAuthState,
  listarCategorias,
  listarFeed,
  listarMeusInteresses,
  listarMinhasDores,
  listarPendentesAdmin,
  listarUsuariosAdmin,
  marcarInteresse,
  rejeitarDor,
  removerInteresse,
  signIn,
  signOut,
  signUp,
} from "@/lib/tretas-api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  component: Index,
});

type View = "feed" | "enviar" | "minhas" | "admin";
type AuthMode = "login" | "cadastro";

function Index() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<View>("feed");
  const [categoriaFiltro, setCategoriaFiltro] = useState("todas");
  const [ordenacao, setOrdenacao] = useState<"recentes" | "interesse">("recentes");

  const authQuery = useQuery({
    queryKey: ["auth-state"],
    queryFn: getAuthState,
    enabled: isSupabaseConfigured,
  });
  const session = authQuery.data?.session ?? null;
  const perfil = authQuery.data?.perfil ?? null;
  const isAdmin = perfil?.role === "admin" && !perfil.banido;

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void queryClient.invalidateQueries({ queryKey: ["auth-state"] });
      void queryClient.invalidateQueries({ queryKey: ["meus-interesses"] });
      void queryClient.invalidateQueries({ queryKey: ["minhas-dores"] });
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);

  useEffect(() => {
    if (view === "admin" && !isAdmin) setView("feed");
    if ((view === "enviar" || view === "minhas") && !session) setView("feed");
  }, [isAdmin, session, view]);

  const categoriasQuery = useQuery({
    queryKey: ["categorias"],
    queryFn: listarCategorias,
    enabled: isSupabaseConfigured,
  });

  const feedQuery = useQuery({
    queryKey: ["feed", categoriaFiltro, ordenacao],
    queryFn: () => listarFeed(categoriaFiltro, ordenacao),
    enabled: isSupabaseConfigured,
  });

  const interessesQuery = useQuery({
    queryKey: ["meus-interesses", session?.user.id],
    queryFn: () => listarMeusInteresses(session?.user.id),
    enabled: isSupabaseConfigured && Boolean(session),
  });

  const minhasDoresQuery = useQuery({
    queryKey: ["minhas-dores", session?.user.id],
    queryFn: () => listarMinhasDores(session?.user.id),
    enabled: isSupabaseConfigured && Boolean(session),
  });

  const categorias = categoriasQuery.data ?? [];

  return (
    <main className="min-h-screen bg-background">
      <section className="border-b bg-card">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-semibold tracking-normal text-foreground">
                  Tretas HUB
                </h1>
                <Badge variant="secondary">MVP</Badge>
              </div>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Dores reais, curadas e públicas para encontrar oportunidades com sinal de interesse.
              </p>
            </div>
            <AuthBox
              perfil={perfil}
              loading={authQuery.isLoading}
              onSignedOut={() => {
                setView("feed");
                void queryClient.invalidateQueries();
              }}
            />
          </div>

          {!isSupabaseConfigured ? <SetupBanner /> : null}

          <nav className="flex flex-wrap gap-2">
            <NavButton active={view === "feed"} onClick={() => setView("feed")}>
              Feed público
            </NavButton>
            <NavButton
              active={view === "enviar"}
              disabled={!session}
              onClick={() => setView("enviar")}
            >
              Enviar dor
            </NavButton>
            <NavButton
              active={view === "minhas"}
              disabled={!session}
              onClick={() => setView("minhas")}
            >
              Minhas dores
            </NavButton>
            {isAdmin ? (
              <NavButton active={view === "admin"} onClick={() => setView("admin")}>
                Painel admin
              </NavButton>
            ) : null}
          </nav>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {view === "feed" ? (
          <FeedPanel
            categoriaFiltro={categoriaFiltro}
            categorias={categorias}
            error={feedQuery.error}
            interesses={interessesQuery.data ?? new Set()}
            isLoading={feedQuery.isLoading}
            ordenacao={ordenacao}
            sessionUserId={session?.user.id}
            dores={feedQuery.data ?? []}
            onCategoriaChange={setCategoriaFiltro}
            onOrdenacaoChange={setOrdenacao}
          />
        ) : null}

        {view === "enviar" && session ? (
          <EnviarDorPanel autorId={session.user.id} categorias={categorias} />
        ) : null}

        {view === "minhas" && session ? (
          <MinhasDoresPanel
            dores={minhasDoresQuery.data ?? []}
            isLoading={minhasDoresQuery.isLoading}
          />
        ) : null}

        {view === "admin" && isAdmin ? <AdminPanel categorias={categorias} /> : null}
      </section>
    </main>
  );
}

function SetupBanner() {
  return (
    <div className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
      <div>
        <p className="font-medium text-foreground">
          Supabase ainda não configurado neste ambiente.
        </p>
        <p className="mt-1 text-muted-foreground">
          Defina <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code>, depois
          aplique a migration em <code>supabase/migrations</code>.
        </p>
      </div>
    </div>
  );
}

function NavButton({
  active,
  children,
  disabled,
  onClick,
}: {
  active: boolean;
  children: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant={active ? "default" : "outline"}
      size="sm"
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function AuthBox({
  loading,
  perfil,
  onSignedOut,
}: {
  loading: boolean;
  perfil: Perfil | null;
  onSignedOut: () => void;
}) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const queryClient = useQueryClient();

  const authMutation = useMutation({
    mutationFn: async () => {
      if (mode === "cadastro") await signUp(nome, email, password);
      else await signIn(email, password);
    },
    onSuccess: async () => {
      toast.success(mode === "cadastro" ? "Conta criada" : "Login realizado");
      setPassword("");
      await queryClient.invalidateQueries({ queryKey: ["auth-state"] });
    },
    onError: (error) => toast.error(readableError(error)),
  });

  const signOutMutation = useMutation({
    mutationFn: signOut,
    onSuccess: onSignedOut,
    onError: (error) => toast.error(readableError(error)),
  });

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Carregando sessão
      </div>
    );
  }

  if (perfil) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <div className="text-right text-sm">
          <div className="flex items-center justify-end gap-2 font-medium">
            {perfil.role === "admin" ? (
              <Shield className="size-4" />
            ) : (
              <CircleUserRound className="size-4" />
            )}
            {perfil.nome || perfil.email}
          </div>
          <p className="text-xs text-muted-foreground">
            {perfil.role === "admin" ? "Admin" : "Usuário"}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={signOutMutation.isPending}
          onClick={() => signOutMutation.mutate()}
        >
          <LogOut className="size-4" />
          Sair
        </Button>
      </div>
    );
  }

  return (
    <Card className="w-full max-w-md rounded-md shadow-sm md:w-[430px]">
      <CardContent className="p-4">
        <div className="mb-3 flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={mode === "login" ? "default" : "outline"}
            onClick={() => setMode("login")}
          >
            Entrar
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === "cadastro" ? "default" : "outline"}
            onClick={() => setMode("cadastro")}
          >
            <UserPlus className="size-4" />
            Criar conta
          </Button>
        </div>
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            authMutation.mutate();
          }}
        >
          {mode === "cadastro" ? (
            <Field label="Nome">
              <Input value={nome} onChange={(event) => setNome(event.target.value)} required />
            </Field>
          ) : null}
          <Field label="Email">
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </Field>
          <Field label="Senha">
            <Input
              type="password"
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </Field>
          <Button type="submit" disabled={authMutation.isPending || !isSupabaseConfigured}>
            {authMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {mode === "cadastro" ? "Cadastrar" : "Entrar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function FeedPanel({
  categoriaFiltro,
  categorias,
  dores,
  error,
  interesses,
  isLoading,
  ordenacao,
  sessionUserId,
  onCategoriaChange,
  onOrdenacaoChange,
}: {
  categoriaFiltro: string;
  categorias: { id: string; nome: string }[];
  dores: Awaited<ReturnType<typeof listarFeed>>;
  error: unknown;
  interesses: Set<string>;
  isLoading: boolean;
  ordenacao: "recentes" | "interesse";
  sessionUserId?: string;
  onCategoriaChange: (value: string) => void;
  onOrdenacaoChange: (value: "recentes" | "interesse") => void;
}) {
  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-normal">Feed público</h2>
          <p className="text-sm text-muted-foreground">Dores aprovadas pela curadoria.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select
            ariaLabel="Filtrar categoria"
            value={categoriaFiltro}
            onChange={onCategoriaChange}
            options={[
              { value: "todas", label: "Todas categorias" },
              ...categorias.map((categoria) => ({ value: categoria.id, label: categoria.nome })),
            ]}
          />
          <Select
            ariaLabel="Ordenar feed"
            value={ordenacao}
            onChange={(value) => onOrdenacaoChange(value as "recentes" | "interesse")}
            options={[
              { value: "recentes", label: "Mais recentes" },
              { value: "interesse", label: "Mais interesse" },
            ]}
          />
        </div>
      </div>

      {error ? <ErrorBox error={error} /> : null}
      {isLoading ? <LoadingRows /> : null}

      {!isLoading && dores.length === 0 ? (
        <EmptyState
          title="Nenhuma dor aprovada ainda"
          text="Assim que a curadoria aprovar uma dor, ela aparece aqui."
        />
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {dores.map((dor) => (
          <DorCard
            key={dor.id}
            dor={dor}
            interessado={interesses.has(dor.id)}
            sessionUserId={sessionUserId}
          />
        ))}
      </div>
    </div>
  );
}

function DorCard({
  dor,
  interessado,
  sessionUserId,
}: {
  dor: Awaited<ReturnType<typeof listarFeed>>[number];
  interessado: boolean;
  sessionUserId?: string;
}) {
  const queryClient = useQueryClient();
  const interestMutation = useMutation({
    mutationFn: () =>
      interessado
        ? removerInteresse(dor.id, sessionUserId ?? "")
        : marcarInteresse(dor.id, sessionUserId ?? ""),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["feed"] }),
        queryClient.invalidateQueries({ queryKey: ["meus-interesses"] }),
      ]);
    },
    onError: (error) => toast.error(readableError(error)),
  });

  const resumo = dor.descricao.length > 190 ? `${dor.descricao.slice(0, 187)}...` : dor.descricao;

  return (
    <Card className="flex min-h-[260px] flex-col rounded-md shadow-sm">
      <CardHeader className="space-y-3 p-5 pb-3">
        <div className="flex items-start justify-between gap-3">
          <Badge variant="secondary">{dor.categoria_nome}</Badge>
          <span className="whitespace-nowrap text-xs text-muted-foreground">
            {formatDate(dor.criado_em)}
          </span>
        </div>
        <CardTitle className="text-lg leading-6 tracking-normal">{dor.titulo}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4 p-5 pt-0">
        <p className="line-clamp-5 text-sm leading-6 text-muted-foreground">{resumo}</p>
        {dor.empresa_contexto ? (
          <p className="text-xs text-muted-foreground">Contexto: {dor.empresa_contexto}</p>
        ) : null}
        <div className="mt-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Heart className={cn("size-4", interessado ? "fill-current text-destructive" : "")} />
            {dor.interesse_count} interessados
          </div>
          <Button
            type="button"
            size="sm"
            variant={interessado ? "secondary" : "default"}
            disabled={!sessionUserId || interestMutation.isPending}
            onClick={() => interestMutation.mutate()}
            title={!sessionUserId ? "Entre para marcar interesse" : undefined}
          >
            {interestMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Heart className="size-4" />
            )}
            {interessado ? "Marcado" : "Tenho interesse"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function EnviarDorPanel({
  autorId,
  categorias,
}: {
  autorId: string;
  categorias: { id: string; nome: string }[];
}) {
  const queryClient = useQueryClient();
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [empresaContexto, setEmpresaContexto] = useState("");

  useEffect(() => {
    if (!categoriaId && categorias[0]) setCategoriaId(categorias[0].id);
  }, [categoriaId, categorias]);

  const submitMutation = useMutation({
    mutationFn: () =>
      criarDor({
        titulo,
        descricao,
        categoriaId,
        empresaContexto,
        autorId,
      }),
    onSuccess: async () => {
      toast.success("Dor enviada para curadoria");
      setTitulo("");
      setDescricao("");
      setEmpresaContexto("");
      await queryClient.invalidateQueries({ queryKey: ["minhas-dores"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-pendentes"] });
    },
    onError: (error) => toast.error(readableError(error)),
  });

  return (
    <Card className="mx-auto max-w-3xl rounded-md shadow-sm">
      <CardHeader>
        <CardTitle className="tracking-normal">Enviar uma dor</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            submitMutation.mutate();
          }}
        >
          <Field label="Título da dor">
            <Input
              minLength={6}
              maxLength={140}
              value={titulo}
              onChange={(event) => setTitulo(event.target.value)}
              required
            />
          </Field>
          <Field label="Descrição detalhada">
            <Textarea
              minLength={20}
              maxLength={4000}
              rows={7}
              value={descricao}
              onChange={(event) => setDescricao(event.target.value)}
              required
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Categoria">
              <Select
                ariaLabel="Categoria"
                value={categoriaId}
                onChange={setCategoriaId}
                options={categorias.map((categoria) => ({
                  value: categoria.id,
                  label: categoria.nome,
                }))}
              />
            </Field>
            <Field label="Empresa ou contexto">
              <Input
                maxLength={140}
                value={empresaContexto}
                onChange={(event) => setEmpresaContexto(event.target.value)}
                placeholder="Opcional"
              />
            </Field>
          </div>
          <Button type="submit" disabled={submitMutation.isPending || !categoriaId}>
            {submitMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Check className="size-4" />
            )}
            Enviar para curadoria
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function MinhasDoresPanel({ dores, isLoading }: { dores: Dor[]; isLoading: boolean }) {
  if (isLoading) return <LoadingRows />;

  return (
    <div className="grid gap-4">
      <div>
        <h2 className="text-xl font-semibold tracking-normal">Minhas dores</h2>
        <p className="text-sm text-muted-foreground">Acompanhe o status do que você enviou.</p>
      </div>
      {dores.length === 0 ? (
        <EmptyState title="Nada enviado ainda" text="Envie a primeira dor para curadoria." />
      ) : null}
      {dores.map((dor) => (
        <Card key={dor.id} className="rounded-md shadow-sm">
          <CardContent className="grid gap-3 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold tracking-normal">{dor.titulo}</h3>
              <StatusBadge status={dor.status} />
            </div>
            <p className="text-sm leading-6 text-muted-foreground">{dor.descricao}</p>
            {dor.motivo_rejeicao ? (
              <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                Motivo da rejeição: {dor.motivo_rejeicao}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function AdminPanel({ categorias }: { categorias: { id: string; nome: string }[] }) {
  const [tab, setTab] = useState<"curadoria" | "usuarios" | "categorias">("curadoria");
  const pendentesQuery = useQuery({
    queryKey: ["admin-pendentes"],
    queryFn: listarPendentesAdmin,
  });
  const usuariosQuery = useQuery({
    queryKey: ["admin-usuarios"],
    queryFn: listarUsuariosAdmin,
  });

  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold tracking-normal">
            <Shield className="size-5" />
            Painel admin
          </h2>
          <p className="text-sm text-muted-foreground">Curadoria, categorias e usuários.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <NavButton active={tab === "curadoria"} onClick={() => setTab("curadoria")}>
            Curadoria
          </NavButton>
          <NavButton active={tab === "usuarios"} onClick={() => setTab("usuarios")}>
            Usuários
          </NavButton>
          <NavButton active={tab === "categorias"} onClick={() => setTab("categorias")}>
            Categorias
          </NavButton>
        </div>
      </div>

      {tab === "curadoria" ? (
        <CuradoriaAdmin
          categorias={categorias}
          dores={pendentesQuery.data ?? []}
          isLoading={pendentesQuery.isLoading}
          error={pendentesQuery.error}
        />
      ) : null}

      {tab === "usuarios" ? (
        <UsuariosAdmin
          usuarios={usuariosQuery.data ?? []}
          isLoading={usuariosQuery.isLoading}
          error={usuariosQuery.error}
        />
      ) : null}

      {tab === "categorias" ? <CategoriasAdmin categorias={categorias} /> : null}
    </div>
  );
}

function CuradoriaAdmin({
  categorias,
  dores,
  error,
  isLoading,
}: {
  categorias: { id: string; nome: string }[];
  dores: Awaited<ReturnType<typeof listarPendentesAdmin>>;
  error: unknown;
  isLoading: boolean;
}) {
  if (isLoading) return <LoadingRows />;
  if (error) return <ErrorBox error={error} />;
  if (dores.length === 0)
    return <EmptyState title="Fila vazia" text="Não há dores pendentes agora." />;

  return (
    <div className="grid gap-4">
      {dores.map((dor) => (
        <CuradoriaCard key={dor.id} dor={dor} categorias={categorias} />
      ))}
    </div>
  );
}

function CuradoriaCard({
  categorias,
  dor,
}: {
  categorias: { id: string; nome: string }[];
  dor: Awaited<ReturnType<typeof listarPendentesAdmin>>[number];
}) {
  const queryClient = useQueryClient();
  const [titulo, setTitulo] = useState(dor.titulo);
  const [descricao, setDescricao] = useState(dor.descricao);
  const [categoriaId, setCategoriaId] = useState(dor.categoria_id);
  const [empresaContexto, setEmpresaContexto] = useState(dor.empresa_contexto ?? "");
  const [motivo, setMotivo] = useState("");

  const refreshAdmin = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin-pendentes"] }),
      queryClient.invalidateQueries({ queryKey: ["feed"] }),
    ]);
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      atualizarDorAdmin({
        id: dor.id,
        titulo,
        descricao,
        categoriaId,
        empresaContexto,
      }),
    onSuccess: async () => {
      toast.success("Texto salvo");
      await refreshAdmin();
    },
    onError: (error) => toast.error(readableError(error)),
  });
  const approveMutation = useMutation({
    mutationFn: async () => {
      await atualizarDorAdmin({ id: dor.id, titulo, descricao, categoriaId, empresaContexto });
      await aprovarDor(dor.id);
    },
    onSuccess: async () => {
      toast.success("Dor aprovada");
      await refreshAdmin();
    },
    onError: (error) => toast.error(readableError(error)),
  });
  const rejectMutation = useMutation({
    mutationFn: () => rejeitarDor(dor.id, motivo),
    onSuccess: async () => {
      toast.success("Dor rejeitada");
      await refreshAdmin();
    },
    onError: (error) => toast.error(readableError(error)),
  });

  const busy = saveMutation.isPending || approveMutation.isPending || rejectMutation.isPending;

  return (
    <Card className="rounded-md shadow-sm">
      <CardContent className="grid gap-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge variant="secondary">{dor.categorias?.nome ?? "Sem categoria"}</Badge>
          <span className="text-xs text-muted-foreground">
            Enviada em {formatDate(dor.criado_em)}
          </span>
        </div>
        <Field label="Título">
          <Input value={titulo} onChange={(event) => setTitulo(event.target.value)} />
        </Field>
        <Field label="Descrição">
          <Textarea
            rows={5}
            value={descricao}
            onChange={(event) => setDescricao(event.target.value)}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Categoria">
            <Select
              ariaLabel="Categoria"
              value={categoriaId}
              onChange={setCategoriaId}
              options={categorias.map((categoria) => ({
                value: categoria.id,
                label: categoria.nome,
              }))}
            />
          </Field>
          <Field label="Empresa ou contexto">
            <Input
              value={empresaContexto}
              onChange={(event) => setEmpresaContexto(event.target.value)}
            />
          </Field>
        </div>
        <Field label="Motivo de rejeição">
          <Input
            value={motivo}
            onChange={(event) => setMotivo(event.target.value)}
            placeholder="Opcional"
          />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => saveMutation.mutate()}
          >
            <SlidersHorizontal className="size-4" />
            Salvar texto
          </Button>
          <Button type="button" disabled={busy} onClick={() => approveMutation.mutate()}>
            <Check className="size-4" />
            Aprovar
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={busy}
            onClick={() => rejectMutation.mutate()}
          >
            <X className="size-4" />
            Rejeitar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function UsuariosAdmin({
  usuarios,
  error,
  isLoading,
}: {
  usuarios: Perfil[];
  error: unknown;
  isLoading: boolean;
}) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ id, role, banido }: Pick<Perfil, "id" | "role" | "banido">) =>
      atualizarUsuarioAdmin(id, { role, banido }),
    onSuccess: async () => {
      toast.success("Usuário atualizado");
      await queryClient.invalidateQueries({ queryKey: ["admin-usuarios"] });
      await queryClient.invalidateQueries({ queryKey: ["auth-state"] });
    },
    onError: (error) => toast.error(readableError(error)),
  });

  if (isLoading) return <LoadingRows />;
  if (error) return <ErrorBox error={error} />;
  if (usuarios.length === 0)
    return <EmptyState title="Sem usuários" text="Usuários aparecem aqui após cadastro." />;

  return (
    <div className="grid gap-3">
      {usuarios.map((usuario) => (
        <Card key={usuario.id} className="rounded-md shadow-sm">
          <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <p className="truncate font-medium">{usuario.nome || usuario.email}</p>
              <p className="truncate text-sm text-muted-foreground">{usuario.email}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={usuario.role === "admin" ? "default" : "secondary"}>
                {usuario.role}
              </Badge>
              {usuario.banido ? <Badge variant="destructive">banido</Badge> : null}
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={mutation.isPending}
                onClick={() =>
                  mutation.mutate({
                    id: usuario.id,
                    role: usuario.role === "admin" ? "user" : "admin",
                    banido: usuario.banido,
                  })
                }
              >
                {usuario.role === "admin" ? "Rebaixar" : "Promover"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={usuario.banido ? "secondary" : "destructive"}
                disabled={mutation.isPending}
                onClick={() =>
                  mutation.mutate({
                    id: usuario.id,
                    role: usuario.role,
                    banido: !usuario.banido,
                  })
                }
              >
                {usuario.banido ? "Desbanir" : "Banir"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function CategoriasAdmin({ categorias }: { categorias: { id: string; nome: string }[] }) {
  return (
    <Card className="rounded-md shadow-sm">
      <CardContent className="grid gap-3 p-5">
        <div className="flex flex-wrap gap-2">
          {categorias.map((categoria) => (
            <Badge key={categoria.id} variant="secondary">
              {categoria.nome}
            </Badge>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          O MVP já inclui gerenciamento seguro no banco. A edição visual de categorias fica limitada
          nesta primeira versão para evitar expandir escopo além da curadoria essencial.
        </p>
      </CardContent>
    </Card>
  );
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  const id = useMemo(() => label.toLowerCase().replace(/\s+/g, "-"), [label]);

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function Select({
  ariaLabel,
  onChange,
  options,
  value,
}: {
  ariaLabel: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  value: string;
}) {
  return (
    <select
      aria-label={ariaLabel}
      className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function StatusBadge({ status }: { status: Dor["status"] }) {
  if (status === "aprovada") return <Badge>Aprovada</Badge>;
  if (status === "rejeitada") return <Badge variant="destructive">Rejeitada</Badge>;
  return <Badge variant="secondary">Pendente</Badge>;
}

function LoadingRows() {
  return (
    <div className="grid gap-3">
      {[0, 1, 2].map((item) => (
        <div key={item} className="h-24 animate-pulse rounded-md border bg-muted/40" />
      ))}
    </div>
  );
}

function EmptyState({ text, title }: { text: string; title: string }) {
  return (
    <div className="rounded-md border border-dashed p-8 text-center">
      <Eye className="mx-auto mb-3 size-5 text-muted-foreground" />
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function ErrorBox({ error }: { error: unknown }) {
  return (
    <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
      {readableError(error)}
    </div>
  );
}

function readableError(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "Não foi possível concluir a ação.";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}
