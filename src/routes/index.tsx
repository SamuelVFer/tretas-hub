import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  BarChart3,
  Check,
  CircleUserRound,
  Flame,
  Eye,
  Heart,
  Loader2,
  LogOut,
  Plus,
  ScrollText,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Trash2,
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
  atualizarCategoria,
  atualizarDorAdmin,
  atualizarUsuarioAdmin,
  criarCategoria,
  criarDor,
  excluirCategoria,
  excluirDor,
  getAuthState,
  listarAuditoria,
  listarCategorias,
  listarCategoriasAdmin,
  listarDoresAdmin,
  listarFeed,
  listarMeusInteresses,
  listarMinhasDores,
  listarPendentesAdmin,
  listarUsuariosAdmin,
  marcarInteresse,
  moverDoresDeCategoria,
  registrarLogin,
  rejeitarDor,
  removerInteresse,
  signIn,
  signOut,
} from "@/lib/tretas-api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  component: Index,
});

type View = "feed" | "enviar" | "minhas" | "admin";

const MotionCard = motion(Card);

const feedListVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.06,
    },
  },
};

const feedCardVariants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
};

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
    if (view === "minhas" && !session) setView("feed");
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

  const statsQuery = useQuery({
    queryKey: ["feed-stats"],
    queryFn: () => listarFeed("todas", "recentes"),
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
  const stats = useMemo(() => {
    const dores = statsQuery.data ?? [];
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);

    return {
      aprovadas: dores.length,
      semana: dores.filter((dor) => new Date(dor.criado_em) >= weekStart).length,
      interesses: dores.reduce((total, dor) => total + dor.interesse_count, 0),
    };
  }, [statsQuery.data]);

  return (
    <main className="signal-shell min-h-screen bg-background text-[var(--ink)]">
      <section className="signal-content border-b border-[var(--border-hairline)] bg-[rgb(255_252_247_/_78%)] backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <header className="min-w-0">
              <div className="flex items-end gap-3">
                <h1 className="font-display text-6xl leading-none tracking-normal text-[var(--ink)] sm:text-7xl">
                  Tretas HUB
                </h1>
                <span
                  className="mb-2 size-3 rounded-full bg-[var(--accent-orange)] shadow-[0_0_24px_rgb(255_151_54_/_54%)]"
                  aria-hidden="true"
                />
              </div>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--ink-soft)] sm:text-base">
                Dores reais, curadas e públicas para encontrar oportunidades com sinal de interesse.
              </p>
            </header>
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

          <StatsStrip
            isLoading={statsQuery.isLoading}
            stats={[
              {
                icon: BarChart3,
                label: "Dores validadas",
                value: stats.aprovadas,
              },
              {
                icon: Sparkles,
                label: "Aprovadas na semana",
                value: stats.semana,
              },
              {
                icon: Heart,
                label: "Sinais de interesse",
                value: stats.interesses,
              },
            ]}
          />

          <nav className="relative flex max-w-full flex-wrap items-center gap-6 border-t border-[var(--border-hairline)] pt-4">
            <NavButton active={view === "feed"} groupId="main" onClick={() => setView("feed")}>
              Feed público
            </NavButton>
            <NavButton active={view === "enviar"} groupId="main" onClick={() => setView("enviar")}>
              Enviar dor
            </NavButton>
            <NavButton
              active={view === "minhas"}
              disabled={!session}
              groupId="main"
              onClick={() => setView("minhas")}
            >
              Minhas dores
            </NavButton>
            {isAdmin ? (
              <NavButton active={view === "admin"} groupId="main" onClick={() => setView("admin")}>
                Painel admin
              </NavButton>
            ) : null}
          </nav>
        </div>
      </section>

      <section className="signal-content mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
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

        {view === "enviar" ? <EnviarDorPanel categorias={categorias} /> : null}

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
    <div className="signal-card flex items-start gap-3 border border-[rgb(255_151_54_/_28%)] bg-[var(--accent-orange-tint)] p-4 text-sm">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
      <div>
        <p className="font-medium text-foreground">
          Supabase ainda não configurado neste ambiente.
        </p>
        <p className="mt-1 text-[var(--ink-soft)]">
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
  groupId = "tabs",
  onClick,
}: {
  active: boolean;
  children: string;
  disabled?: boolean;
  groupId?: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "relative h-auto overflow-visible rounded-none border-0 bg-transparent px-0 py-1 font-bold text-[var(--ink-soft)] shadow-none hover:bg-transparent hover:text-[var(--ink)]",
        active && "text-[var(--ink)]",
      )}
    >
      {active ? (
        <motion.span
          layoutId={`active-nav-underline-${groupId}`}
          className="absolute -bottom-2 left-0 h-0.5 w-full rounded-full bg-[var(--accent-orange)]"
          transition={{ type: "spring", stiffness: 420, damping: 32 }}
        />
      ) : null}
      <span className="relative z-10">{children}</span>
    </Button>
  );
}

function StatsStrip({
  isLoading,
  stats,
}: {
  isLoading: boolean;
  stats: { icon: typeof BarChart3; label: string; value: number }[];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className="signal-card flex items-center gap-3 border bg-white/82 px-4 py-3 backdrop-blur-xl"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--accent-orange-tint)] text-[var(--accent-orange-deep)]">
              <Icon className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="font-data text-2xl font-bold leading-none text-[var(--accent-orange-deep)]">
                {isLoading ? "..." : <CountUp value={stat.value} />}
              </p>
              <p className="mt-1 truncate text-xs font-bold uppercase text-[var(--ink-faint)]">
                {stat.label}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CountUp({ value }: { value: number }) {
  const prefersReducedMotion = useReducedMotion();
  const [display, setDisplay] = useState(prefersReducedMotion ? value : 0);

  useEffect(() => {
    if (prefersReducedMotion) {
      setDisplay(value);
      return;
    }

    let frame = 0;
    const frames = 28;
    setDisplay(0);
    const timer = window.setInterval(() => {
      frame += 1;
      const progress = 1 - Math.pow(1 - frame / frames, 3);
      setDisplay(Math.round(value * progress));
      if (frame >= frames) window.clearInterval(timer);
    }, 24);

    return () => window.clearInterval(timer);
  }, [prefersReducedMotion, value]);

  return display.toLocaleString("pt-BR");
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
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const queryClient = useQueryClient();

  const authMutation = useMutation({
    mutationFn: () => signIn(email, password),
    onSuccess: async () => {
      toast.success("Login realizado");
      setPassword("");
      setIsOpen(false);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user.id) await registrarLogin(session.user.id);
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
      <div className="signal-card flex items-center gap-2 border bg-white/72 px-3 py-2 text-sm text-[var(--ink-soft)]">
        <Loader2 className="size-4 animate-spin" />
        Carregando sessão
      </div>
    );
  }

  if (perfil) {
    return (
      <div className="signal-card flex flex-wrap items-center gap-3 border bg-white/76 px-3 py-2 backdrop-blur-xl">
        <div className="text-right text-sm">
          <div className="flex items-center justify-end gap-2 font-medium">
            {perfil.role === "admin" ? (
              <Shield className="size-4 text-[var(--accent-orange-deep)]" />
            ) : (
              <CircleUserRound className="size-4" />
            )}
            {perfil.nome || perfil.email}
          </div>
          <p className="font-data text-xs text-[var(--ink-soft)]">
            {perfil.role === "admin" ? "Admin" : "Sessão ativa"}
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
    <div className="relative flex justify-end">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen((value) => !value)}
        className="rounded-full border border-[var(--border-hairline)] bg-white/68 px-3 text-[var(--ink-soft)] shadow-[var(--shadow-soft)] hover:text-[var(--accent-orange-deep)]"
        title="Acesso admin"
        aria-label="Acesso admin"
      >
        <Shield className="size-4" />
      </Button>
      {isOpen ? (
        <Card className="signal-card absolute right-0 top-11 z-20 w-[min(22rem,calc(100vw-2rem))] border bg-[var(--surface-card)]">
          <CardHeader className="p-4 pb-0">
            <CardTitle className="flex items-center gap-2 text-base tracking-normal text-[var(--ink)]">
              <Shield className="size-4 text-[var(--accent-orange-deep)]" />
              Acesso admin
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <form
              className="grid gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                authMutation.mutate();
              }}
            >
              <Field label="Email admin">
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
                  minLength={5}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </Field>
              <Button type="submit" disabled={authMutation.isPending || !isSupabaseConfigured}>
                {authMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                Entrar como admin
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
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
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-display text-4xl tracking-normal text-[var(--ink)]">Feed público</h2>
          <p className="mt-1 text-sm text-[var(--ink-soft)]">Dores aprovadas pela curadoria.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-data text-xs uppercase text-[var(--ink-faint)]">Ordenar</span>
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

      <div className="flex flex-wrap gap-2">
        <CategoryChip
          active={categoriaFiltro === "todas"}
          label="Todas categorias"
          onClick={() => onCategoriaChange("todas")}
        />
        {categorias.map((categoria) => (
          <CategoryChip
            key={categoria.id}
            active={categoriaFiltro === categoria.id}
            label={categoria.nome}
            onClick={() => onCategoriaChange(categoria.id)}
          />
        ))}
      </div>

      {error ? <ErrorBox error={error} /> : null}
      {isLoading ? <LoadingRows /> : null}

      {!isLoading && dores.length === 0 ? (
        <EmptyState
          title="Nenhuma dor aprovada ainda"
          text="Assim que a curadoria aprovar uma dor, ela aparece aqui."
        />
      ) : null}

      <motion.div
        variants={feedListVariants}
        initial="hidden"
        animate="show"
        className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
      >
        {dores.map((dor) => (
          <DorCard
            key={dor.id}
            dor={dor}
            interessado={interesses.has(dor.id)}
            sessionUserId={sessionUserId}
          />
        ))}
      </motion.div>
    </div>
  );
}

function CategoryChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-bold text-[var(--ink-soft)] shadow-sm transition hover:border-[rgb(255_151_54_/_36%)] hover:text-[var(--accent-orange-deep)]",
        active
          ? "border-[rgb(255_151_54_/_38%)] bg-[var(--accent-orange-tint)] text-[var(--accent-orange-deep)]"
          : "border-[var(--border-hairline)] bg-white/76",
      )}
    >
      {label}
    </button>
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
  const prefersReducedMotion = useReducedMotion();
  const [burstKey, setBurstKey] = useState(0);
  const interestMutation = useMutation({
    mutationFn: async () => {
      if (!interessado) setBurstKey((value) => value + 1);
      return interessado
        ? removerInteresse(dor.id, sessionUserId ?? "")
        : marcarInteresse(dor.id, sessionUserId ?? "");
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["feed"] }),
        queryClient.invalidateQueries({ queryKey: ["meus-interesses"] }),
      ]);
    },
    onError: (error) => toast.error(readableError(error)),
  });

  const resumo = dor.descricao.length > 190 ? `${dor.descricao.slice(0, 187)}...` : dor.descricao;
  const isHot = dor.interesse_count >= 5;

  return (
    <MotionCard
      variants={feedCardVariants}
      whileHover={
        prefersReducedMotion
          ? undefined
          : {
              y: -4,
              scale: 1.01,
              boxShadow: "var(--shadow-elevated)",
              transition: { duration: 0.25, ease: "easeOut" },
            }
      }
      className={cn(
        "signal-card flex min-h-[292px] flex-col border bg-[var(--surface-card)]",
        isHot && "signal-halo",
      )}
    >
      <CardHeader className="space-y-3 p-5 pb-2">
        <div className="flex items-start justify-between gap-3">
          <span className="font-data text-[11px] font-bold uppercase tracking-normal text-[var(--ink-faint)]">
            {dor.categoria_nome}
          </span>
          {isHot ? (
            <Badge className="chip-orange rounded-full border-0 font-data">
              <Flame className="size-3" />
              em alta
            </Badge>
          ) : null}
        </div>
        <CardTitle className="text-xl leading-7 tracking-normal text-[var(--ink)]">
          {dor.titulo}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4 p-5 pt-0">
        <p className="line-clamp-5 text-sm leading-6 text-[var(--ink-soft)]">{resumo}</p>
        {dor.empresa_contexto ? (
          <p className="font-data text-xs text-[var(--ink-soft)]">
            Contexto: {dor.empresa_contexto}
          </p>
        ) : null}
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-[var(--border-hairline)] pt-4">
          <span className="whitespace-nowrap font-data text-xs text-[var(--ink-faint)]">
            {formatDate(dor.criado_em)}
          </span>
          <div className="flex items-center gap-2 text-sm font-medium">
            <motion.span
              key={`heart-${burstKey}`}
              className="relative grid size-8 place-items-center rounded-full bg-[var(--accent-orange-tint)] text-[var(--accent-orange-deep)]"
              animate={
                burstKey > 0 && !prefersReducedMotion ? { scale: [1, 1.3, 1] } : { scale: 1 }
              }
              transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
            >
              <Heart className={cn("size-4", interessado ? "fill-current" : "")} />
              <AnimatePresence>
                {burstKey > 0 && !prefersReducedMotion ? (
                  <motion.span
                    key={`ring-${burstKey}`}
                    className="interest-ring"
                    initial={{ scale: 0.65, opacity: 0.5 }}
                    animate={{ scale: 1.9, opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                  />
                ) : null}
              </AnimatePresence>
              <InterestParticles burstKey={burstKey} />
            </motion.span>
            <div className="flex items-center gap-2">
              <motion.span
                key={dor.interesse_count}
                className="font-data text-[var(--ink)]"
                initial={
                  prefersReducedMotion ? false : { scale: 1.14, color: "var(--accent-orange-deep)" }
                }
                animate={{ scale: 1, color: "var(--ink)" }}
                transition={{ duration: 0.35 }}
              >
                {dor.interesse_count}
              </motion.span>
              <span className="hidden text-[var(--ink-soft)] sm:inline">interessados</span>
            </div>
            <Button
              type="button"
              size="sm"
              variant={interessado ? "secondary" : "outline"}
              disabled={!sessionUserId || interestMutation.isPending}
              onClick={() => interestMutation.mutate()}
              title={!sessionUserId ? "Entre para marcar interesse" : undefined}
              className={cn("rounded-full", interessado && "border border-[rgb(255_151_54_/_38%)]")}
            >
              {interestMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Heart className={cn("size-4", interessado ? "fill-current" : "")} />
              )}
              {interessado ? "Marcado" : "Tenho interesse"}
            </Button>
          </div>
        </div>
      </CardContent>
    </MotionCard>
  );
}

function InterestParticles({ burstKey }: { burstKey: number }) {
  const prefersReducedMotion = useReducedMotion();
  if (burstKey === 0 || prefersReducedMotion) return null;

  const particles = [
    { x: -28, y: -24, rotate: 210 },
    { x: 22, y: -34, rotate: 300 },
    { x: -36, y: 5, rotate: 170 },
    { x: 32, y: 4, rotate: 18 },
    { x: -5, y: -42, rotate: 270 },
  ];

  return (
    <AnimatePresence>
      {particles.map((particle, index) => (
        <motion.span
          key={`${burstKey}-${index}`}
          className="sun-ray"
          initial={{ x: "-50%", y: "-50%", scaleX: 0.2, opacity: 0, rotate: particle.rotate }}
          animate={{
            x: `calc(-50% + ${particle.x}px)`,
            y: `calc(-50% + ${particle.y}px)`,
            scaleX: [0.2, 1, 0.15],
            opacity: [0, 0.95, 0],
            rotate: particle.rotate,
          }}
          transition={{ duration: 0.7, delay: index * 0.035, ease: [0.16, 1, 0.3, 1] }}
        />
      ))}
    </AnimatePresence>
  );
}

function EnviarDorPanel({ categorias }: { categorias: { id: string; nome: string }[] }) {
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
    <div className="mx-auto grid max-w-3xl gap-4">
      <div>
        <h2 className="font-display text-4xl tracking-normal text-[var(--ink)]">Enviar uma dor</h2>
        <p className="mt-1 text-sm text-[var(--ink-soft)]">
          A curadoria revisa o envio antes de aparecer no feed público.
        </p>
      </div>
      <Card className="signal-card border bg-[var(--surface-card)]">
        <CardContent className="p-5 sm:p-6">
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
            <div className="flex justify-end border-t border-[var(--border-hairline)] pt-4">
              <Button type="submit" disabled={submitMutation.isPending || !categoriaId}>
                {submitMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Check className="size-4" />
                )}
                Enviar para curadoria
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function MinhasDoresPanel({ dores, isLoading }: { dores: Dor[]; isLoading: boolean }) {
  if (isLoading) return <LoadingRows />;

  return (
    <div className="grid gap-4">
      <div>
        <h2 className="font-display text-3xl tracking-normal text-[var(--ink)]">Minhas dores</h2>
        <p className="text-sm text-[var(--ink-soft)]">Acompanhe o status do que você enviou.</p>
      </div>
      {dores.length === 0 ? (
        <EmptyState title="Nada enviado ainda" text="Envie a primeira dor para curadoria." />
      ) : null}
      {dores.map((dor) => (
        <Card key={dor.id} className="signal-card border bg-[var(--surface-card)]">
          <CardContent className="grid gap-3 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold tracking-normal text-[var(--ink)]">{dor.titulo}</h3>
              <StatusBadge status={dor.status} />
            </div>
            <p className="text-sm leading-6 text-[var(--ink-soft)]">{dor.descricao}</p>
            {dor.motivo_rejeicao ? (
              <p className="rounded-lg bg-[var(--status-rejeitada-tint)] p-3 text-sm text-[var(--status-rejeitada)]">
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
  const [tab, setTab] = useState<"curadoria" | "dores" | "usuarios" | "categorias" | "auditoria">(
    "curadoria",
  );
  const pendentesQuery = useQuery({
    queryKey: ["admin-pendentes"],
    queryFn: listarPendentesAdmin,
  });
  const usuariosQuery = useQuery({
    queryKey: ["admin-usuarios"],
    queryFn: listarUsuariosAdmin,
  });

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-display flex items-center gap-2 text-4xl tracking-normal text-[var(--ink)]">
            <Shield className="size-5 text-[var(--accent-orange-deep)]" />
            Painel admin
          </h2>
          <p className="text-sm text-[var(--ink-soft)]">
            Curadoria, dores publicadas, categorias, usuários e auditoria.
          </p>
        </div>
        <div className="flex flex-wrap gap-5 border-t border-[var(--border-hairline)] pt-3 md:border-t-0 md:pt-0">
          <NavButton
            active={tab === "curadoria"}
            groupId="admin"
            onClick={() => setTab("curadoria")}
          >
            Curadoria
          </NavButton>
          <NavButton active={tab === "dores"} groupId="admin" onClick={() => setTab("dores")}>
            Todas as dores
          </NavButton>
          <NavButton active={tab === "usuarios"} groupId="admin" onClick={() => setTab("usuarios")}>
            Usuários
          </NavButton>
          <NavButton
            active={tab === "categorias"}
            groupId="admin"
            onClick={() => setTab("categorias")}
          >
            Categorias
          </NavButton>
          <NavButton
            active={tab === "auditoria"}
            groupId="admin"
            onClick={() => setTab("auditoria")}
          >
            Auditoria
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

      {tab === "dores" ? <DoresAdmin categorias={categorias} /> : null}

      {tab === "usuarios" ? (
        <UsuariosAdmin
          usuarios={usuariosQuery.data ?? []}
          isLoading={usuariosQuery.isLoading}
          error={usuariosQuery.error}
        />
      ) : null}

      {tab === "categorias" ? <CategoriasAdmin categorias={categorias} /> : null}

      {tab === "auditoria" ? <AuditoriaAdmin /> : null}
    </div>
  );
}

function DoresAdmin({ categorias }: { categorias: { id: string; nome: string }[] }) {
  const queryClient = useQueryClient();
  const [filtro, setFiltro] = useState<"todas" | "pendente" | "aprovada" | "rejeitada">("aprovada");
  const [categoriaFiltro, setCategoriaFiltro] = useState("todas");
  const doresQuery = useQuery({
    queryKey: ["admin-dores", filtro, categoriaFiltro],
    queryFn: () => listarDoresAdmin(filtro, categoriaFiltro),
  });

  const excluirMutation = useMutation({
    mutationFn: excluirDor,
    onSuccess: async () => {
      toast.success("Dor excluída");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-dores"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-pendentes"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-auditoria"] }),
        queryClient.invalidateQueries({ queryKey: ["feed"] }),
      ]);
    },
    onError: (error) => toast.error(readableError(error)),
  });

  return (
    <div className="grid gap-4">
      <div className="signal-card flex flex-wrap items-end gap-3 border bg-white/76 p-3">
        <Field label="Status">
          <Select
            ariaLabel="Filtrar status"
            value={filtro}
            onChange={(value) => setFiltro(value as typeof filtro)}
            options={[
              { value: "aprovada", label: "Aprovadas" },
              { value: "pendente", label: "Pendentes" },
              { value: "rejeitada", label: "Rejeitadas" },
              { value: "todas", label: "Todas" },
            ]}
          />
        </Field>
        <Field label="Categoria">
          <Select
            ariaLabel="Filtrar categoria"
            value={categoriaFiltro}
            onChange={setCategoriaFiltro}
            options={[
              { value: "todas", label: "Todas categorias" },
              ...categorias.map((categoria) => ({ value: categoria.id, label: categoria.nome })),
            ]}
          />
        </Field>
      </div>

      {doresQuery.error ? <ErrorBox error={doresQuery.error} /> : null}
      {doresQuery.isLoading ? <LoadingRows /> : null}
      {!doresQuery.isLoading && (doresQuery.data ?? []).length === 0 ? (
        <EmptyState title="Nada por aqui" text="Nenhuma dor com esse status." />
      ) : null}

      {(doresQuery.data ?? []).map((dor) => (
        <DorAdminCard
          key={dor.id}
          categorias={categorias}
          dor={dor}
          deleting={excluirMutation.isPending}
          onDelete={() => excluirMutation.mutate(dor.id)}
        />
      ))}
    </div>
  );
}

function DorAdminCard({
  categorias,
  deleting,
  dor,
  onDelete,
}: {
  categorias: { id: string; nome: string }[];
  deleting: boolean;
  dor: Awaited<ReturnType<typeof listarDoresAdmin>>[number];
  onDelete: () => void;
}) {
  const queryClient = useQueryClient();
  const [titulo, setTitulo] = useState(dor.titulo);
  const [descricao, setDescricao] = useState(dor.descricao);
  const [categoriaId, setCategoriaId] = useState(dor.categoria_id);
  const [empresaContexto, setEmpresaContexto] = useState(dor.empresa_contexto ?? "");
  const [status, setStatus] = useState(dor.status);
  const [motivo, setMotivo] = useState(dor.motivo_rejeicao ?? "");

  const saveMutation = useMutation({
    mutationFn: () =>
      atualizarDorAdmin({
        id: dor.id,
        titulo,
        descricao,
        categoriaId,
        empresaContexto,
        status,
        motivoRejeicao: motivo,
      }),
    onSuccess: async () => {
      toast.success("Dor atualizada");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-dores"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-pendentes"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-categorias"] }),
        queryClient.invalidateQueries({ queryKey: ["feed"] }),
      ]);
    },
    onError: (error) => toast.error(readableError(error)),
  });

  const busy = saveMutation.isPending || deleting;

  return (
    <Card className="signal-card border bg-[var(--surface-card)]">
      <CardContent className="grid gap-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={dor.status} />
            <Badge className="chip-soft rounded-full border-0 font-data">
              {dor.categorias?.nome ?? "Sem categoria"}
            </Badge>
            <span className="font-data text-xs text-[var(--ink-soft)]">
              {formatDate(dor.criado_em)}
            </span>
          </div>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={busy}
            onClick={() => {
              if (window.confirm(`Excluir definitivamente "${dor.titulo}"?`)) onDelete();
            }}
          >
            <Trash2 className="size-4" />
            Excluir
          </Button>
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
        <div className="grid gap-4 md:grid-cols-3">
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
          <Field label="Status">
            <Select
              ariaLabel="Status"
              value={status}
              onChange={(value) => setStatus(value as typeof status)}
              options={[
                { value: "pendente", label: "Pendente" },
                { value: "aprovada", label: "Aprovada" },
                { value: "rejeitada", label: "Rejeitada" },
              ]}
            />
          </Field>
          <Field label="Empresa ou contexto">
            <Input
              value={empresaContexto}
              onChange={(event) => setEmpresaContexto(event.target.value)}
            />
          </Field>
        </div>
        {status === "rejeitada" ? (
          <Field label="Motivo de rejeição">
            <Input value={motivo} onChange={(event) => setMotivo(event.target.value)} />
          </Field>
        ) : null}
        <div className="flex justify-end border-t border-[var(--border-hairline)] pt-4">
          <Button type="button" disabled={busy} onClick={() => saveMutation.mutate()}>
            {saveMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <SlidersHorizontal className="size-4" />
            )}
            Salvar ajustes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

const ACAO_LABEL: Record<string, string> = {
  insert: "Criação",
  update: "Edição",
  delete: "Exclusão",
  login: "Login",
};

function AuditoriaAdmin() {
  const auditoriaQuery = useQuery({
    queryKey: ["admin-auditoria"],
    queryFn: listarAuditoria,
  });

  if (auditoriaQuery.isLoading) return <LoadingRows />;
  if (auditoriaQuery.error) return <ErrorBox error={auditoriaQuery.error} />;

  const registros = auditoriaQuery.data ?? [];
  if (registros.length === 0) {
    return <EmptyState title="Sem registros" text="Nenhum evento auditado até agora." />;
  }

  return (
    <Card className="signal-card border bg-[var(--surface-card)]">
      <CardHeader className="p-5 pb-0">
        <CardTitle className="flex items-center gap-2 text-lg tracking-normal text-[var(--ink)]">
          <ScrollText className="size-4" />
          Log de auditoria
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="font-data text-xs uppercase text-[var(--ink-soft)]">
              <tr>
                <th className="py-2 pr-3">Data e hora</th>
                <th className="py-2 pr-3">Ação</th>
                <th className="py-2 pr-3">Tabela</th>
                <th className="py-2 pr-3">Registro</th>
                <th className="py-2">Autor</th>
              </tr>
            </thead>
            <tbody>
              {registros.map((registro) => (
                <tr key={registro.id} className="border-t border-[var(--border-hairline)]">
                  <td className="py-2 pr-3 font-data text-xs whitespace-nowrap text-[var(--ink-soft)]">
                    {new Date(registro.criado_em).toLocaleString("pt-BR")}
                  </td>
                  <td className="py-2 pr-3">
                    <Badge className="chip-orange rounded-full border-0 font-data">
                      {ACAO_LABEL[registro.acao] ?? registro.acao}
                    </Badge>
                  </td>
                  <td className="py-2 pr-3 font-data text-xs text-[var(--ink)]">
                    {registro.tabela}
                  </td>
                  <td className="py-2 pr-3 font-data text-xs text-[var(--ink-soft)]">
                    {registro.registro_id?.slice(0, 8) ?? "—"}
                  </td>
                  <td className="py-2 text-xs text-[var(--ink-soft)]">
                    {registro.ator_email ?? registro.ator_id?.slice(0, 8) ?? "sistema"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
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
    <Card className="signal-card border bg-[var(--surface-card)]">
      <CardContent className="grid gap-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge className="chip-soft rounded-full border-0 font-data">
            {dor.categorias?.nome ?? "Sem categoria"}
          </Badge>
          <span className="font-data text-xs text-[var(--ink-soft)]">
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
        <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--border-hairline)] pt-4">
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
        <Card key={usuario.id} className="signal-card border bg-[var(--surface-card)]">
          <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <p className="truncate font-medium">{usuario.nome || usuario.email}</p>
              <p className="truncate text-sm text-[var(--ink-soft)]">{usuario.email}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                className={cn(
                  "rounded-full border-0 font-data",
                  usuario.role === "admin" ? "chip-orange" : "chip-success",
                )}
              >
                {usuario.role}
              </Badge>
              {usuario.banido ? (
                <Badge className="chip-danger rounded-full border-0 font-data">banido</Badge>
              ) : null}
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
  const queryClient = useQueryClient();
  const [nome, setNome] = useState("");
  const categoriasQuery = useQuery({
    queryKey: ["admin-categorias"],
    queryFn: listarCategoriasAdmin,
  });

  const refreshCategorias = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["categorias"] }),
      queryClient.invalidateQueries({ queryKey: ["admin-categorias"] }),
      queryClient.invalidateQueries({ queryKey: ["admin-dores"] }),
      queryClient.invalidateQueries({ queryKey: ["admin-pendentes"] }),
      queryClient.invalidateQueries({ queryKey: ["feed"] }),
    ]);
  };

  const createMutation = useMutation({
    mutationFn: () => criarCategoria(nome),
    onSuccess: async () => {
      toast.success("Categoria criada");
      setNome("");
      await refreshCategorias();
    },
    onError: (error) => toast.error(readableError(error)),
  });

  if (categoriasQuery.isLoading) return <LoadingRows />;
  if (categoriasQuery.error) return <ErrorBox error={categoriasQuery.error} />;

  const categoriasAdmin = categoriasQuery.data ?? [];

  return (
    <div className="grid gap-4">
      <Card className="signal-card border bg-[var(--surface-card)]">
        <CardContent className="p-5">
          <form
            className="grid gap-3 md:grid-cols-[1fr_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              createMutation.mutate();
            }}
          >
            <Field label="Nova categoria">
              <Input value={nome} onChange={(event) => setNome(event.target.value)} required />
            </Field>
            <Button
              type="submit"
              disabled={createMutation.isPending || nome.trim().length === 0}
              className="self-end"
            >
              {createMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              Adicionar
            </Button>
          </form>
        </CardContent>
      </Card>

      {categoriasAdmin.map((categoria) => (
        <CategoriaAdminCard
          key={categoria.id}
          categoria={categoria}
          categorias={categorias}
          onChanged={refreshCategorias}
        />
      ))}
    </div>
  );
}

function CategoriaAdminCard({
  categoria,
  categorias,
  onChanged,
}: {
  categoria: Awaited<ReturnType<typeof listarCategoriasAdmin>>[number];
  categorias: { id: string; nome: string }[];
  onChanged: () => Promise<void>;
}) {
  const [nome, setNome] = useState(categoria.nome);
  const [destinoId, setDestinoId] = useState("");
  const destinos = categorias.filter((item) => item.id !== categoria.id);

  useEffect(() => {
    setNome(categoria.nome);
  }, [categoria.nome]);

  useEffect(() => {
    if (!destinoId && destinos[0]) setDestinoId(destinos[0].id);
  }, [destinoId, destinos]);

  const updateMutation = useMutation({
    mutationFn: () => atualizarCategoria(categoria.id, nome),
    onSuccess: async () => {
      toast.success("Categoria atualizada");
      await onChanged();
    },
    onError: (error) => toast.error(readableError(error)),
  });

  const moveMutation = useMutation({
    mutationFn: () => moverDoresDeCategoria(categoria.id, destinoId),
    onSuccess: async () => {
      toast.success("Dores movidas");
      await onChanged();
    },
    onError: (error) => toast.error(readableError(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: () => excluirCategoria(categoria.id),
    onSuccess: async () => {
      toast.success("Categoria excluída");
      await onChanged();
    },
    onError: (error) => toast.error(readableError(error)),
  });

  const busy = updateMutation.isPending || moveMutation.isPending || deleteMutation.isPending;
  const hasDores = categoria.dores_count > 0;

  return (
    <Card className="signal-card border bg-[var(--surface-card)]">
      <CardContent className="grid gap-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Badge className="chip-soft rounded-full border-0 font-data">{categoria.nome}</Badge>
          <span className="font-data text-xs text-[var(--ink-soft)]">
            {categoria.dores_count} dores
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <Field label="Nome">
            <Input value={nome} onChange={(event) => setNome(event.target.value)} />
          </Field>
          <Button
            type="button"
            variant="outline"
            disabled={busy || nome.trim().length === 0 || nome.trim() === categoria.nome}
            onClick={() => updateMutation.mutate()}
            className="self-end"
          >
            {updateMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <SlidersHorizontal className="size-4" />
            )}
            Renomear
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
          <Field label="Mover dores para">
            <Select
              ariaLabel="Mover dores para"
              value={destinoId}
              onChange={setDestinoId}
              options={destinos.map((item) => ({ value: item.id, label: item.nome }))}
            />
          </Field>
          <Button
            type="button"
            variant="outline"
            disabled={busy || !hasDores || !destinoId}
            onClick={() => moveMutation.mutate()}
            className="self-end"
          >
            {moveMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <SlidersHorizontal className="size-4" />
            )}
            Mover dores
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={busy || hasDores}
            title={hasDores ? "Mova as dores antes de excluir" : undefined}
            onClick={() => {
              if (window.confirm(`Excluir categoria "${categoria.nome}"?`)) {
                deleteMutation.mutate();
              }
            }}
            className="self-end"
          >
            {deleteMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
            Excluir
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  const id = useMemo(() => label.toLowerCase().replace(/\s+/g, "-"), [label]);

  return (
    <div className="grid gap-2">
      <Label htmlFor={id} className="text-xs font-bold uppercase text-[var(--ink-soft)]">
        {label}
      </Label>
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
      className="h-9 rounded-full border border-[var(--border-hairline)] bg-white/82 px-3 font-data text-sm text-[var(--ink)] shadow-[var(--shadow-soft)] outline-none transition focus-visible:border-[rgb(255_151_54_/_44%)] focus-visible:ring-1 focus-visible:ring-ring"
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
  if (status === "aprovada") {
    return <Badge className="chip-success rounded-full border-0 font-data">Aprovada</Badge>;
  }
  if (status === "rejeitada") {
    return <Badge className="chip-danger rounded-full border-0 font-data">Rejeitada</Badge>;
  }
  return (
    <Badge className="chip-pending pending-breathe rounded-full border-0 font-data">Pendente</Badge>
  );
}

function LoadingRows() {
  return (
    <div className="grid gap-3">
      {[0, 1, 2].map((item) => (
        <div
          key={item}
          className="h-24 animate-pulse rounded-lg border border-[var(--border-hairline)] bg-white/55"
        />
      ))}
    </div>
  );
}

function EmptyState({ text, title }: { text: string; title: string }) {
  return (
    <div className="signal-card border border-dashed border-[var(--border-hairline)] bg-white/62 p-8 text-center">
      <Eye className="mx-auto mb-3 size-5 text-[var(--ink-soft)]" />
      <p className="font-medium text-[var(--ink)]">{title}</p>
      <p className="mt-1 text-sm text-[var(--ink-soft)]">{text}</p>
    </div>
  );
}

function ErrorBox({ error }: { error: unknown }) {
  return (
    <div className="signal-card border border-[rgb(255_151_54_/_28%)] bg-[var(--accent-orange-tint)] p-4 text-sm text-[var(--accent-orange-deep)]">
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
