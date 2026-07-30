create type public.user_role as enum ('user', 'admin');
create type public.dor_status as enum ('pendente', 'aprovada', 'rejeitada');

create table public.perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null default '',
  email text not null default '',
  role public.user_role not null default 'user',
  banido boolean not null default false,
  criado_em timestamptz not null default now()
);

create table public.categorias (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  criado_em timestamptz not null default now()
);

create table public.dores (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text not null,
  categoria_id uuid not null references public.categorias(id),
  empresa_contexto text,
  autor_id uuid not null references public.perfis(id) on delete cascade,
  status public.dor_status not null default 'pendente',
  motivo_rejeicao text,
  criado_em timestamptz not null default now(),
  aprovado_em timestamptz,
  atualizado_em timestamptz not null default now(),
  constraint dores_titulo_len check (char_length(trim(titulo)) between 6 and 140),
  constraint dores_descricao_len check (char_length(trim(descricao)) between 20 and 4000),
  constraint dores_empresa_contexto_len check (
    empresa_contexto is null or char_length(trim(empresa_contexto)) <= 140
  ),
  constraint dores_motivo_rejeicao_len check (
    motivo_rejeicao is null or char_length(trim(motivo_rejeicao)) <= 500
  )
);

create table public.interesses (
  id uuid primary key default gen_random_uuid(),
  dor_id uuid not null references public.dores(id) on delete cascade,
  usuario_id uuid not null references public.perfis(id) on delete cascade,
  criado_em timestamptz not null default now(),
  unique (dor_id, usuario_id)
);

create index dores_status_criado_em_idx on public.dores (status, criado_em desc);
create index dores_categoria_status_idx on public.dores (categoria_id, status);
create index dores_autor_status_idx on public.dores (autor_id, status);
create index interesses_dor_id_idx on public.interesses (dor_id);
create index interesses_usuario_id_idx on public.interesses (usuario_id);

create or replace function public.is_admin(user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.perfis
    where id = user_id
      and role = 'admin'
      and banido = false
  );
$$;

create or replace function public.is_banned(user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.perfis
    where id = user_id
      and banido = true
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.perfis (id, nome, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', split_part(new.email, '@', 1), ''),
    coalesce(new.email, '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_dores_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = now();

  if new.status = 'aprovada' and old.status is distinct from 'aprovada' then
    new.aprovado_em = now();
    new.motivo_rejeicao = null;
  elsif new.status != 'aprovada' then
    new.aprovado_em = null;
  end if;

  return new;
end;
$$;

create trigger dores_touch_atualizado_em
  before update on public.dores
  for each row execute function public.touch_dores_atualizado_em();

create or replace function public.prevent_profile_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.role is distinct from old.role or new.banido is distinct from old.banido)
    and not public.is_admin(auth.uid()) then
    raise exception 'Somente admins podem alterar role ou banimento';
  end if;

  return new;
end;
$$;

create trigger perfis_prevent_privilege_escalation
  before update on public.perfis
  for each row execute function public.prevent_profile_privilege_escalation();

create view public.dores_publicas as
select
  d.id,
  d.titulo,
  d.descricao,
  d.empresa_contexto,
  d.status,
  d.criado_em,
  d.aprovado_em,
  d.categoria_id,
  c.nome as categoria_nome,
  d.autor_id,
  coalesce(count(i.id), 0)::int as interesse_count
from public.dores d
join public.categorias c on c.id = d.categoria_id
left join public.interesses i on i.dor_id = d.id
where d.status = 'aprovada'
group by d.id, c.id;

insert into public.categorias (nome)
values
  ('Varejo'),
  ('Serviços'),
  ('Tecnologia'),
  ('Saúde'),
  ('Educação'),
  ('Financeiro'),
  ('Outro')
on conflict (nome) do nothing;

alter table public.perfis enable row level security;
alter table public.categorias enable row level security;
alter table public.dores enable row level security;
alter table public.interesses enable row level security;

create policy "Qualquer pessoa le categorias"
  on public.categorias for select
  using (true);

create policy "Admins gerenciam categorias"
  on public.categorias for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "Usuarios leem proprio perfil"
  on public.perfis for select
  using (id = auth.uid() or public.is_admin());

create policy "Usuarios atualizam proprio perfil basico"
  on public.perfis for update
  using (id = auth.uid() and not public.is_banned())
  with check (id = auth.uid() and not public.is_banned());

create policy "Admins atualizam perfis"
  on public.perfis for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "Qualquer pessoa le dores aprovadas"
  on public.dores for select
  using (status = 'aprovada' or autor_id = auth.uid() or public.is_admin());

create policy "Usuarios criam dores pendentes"
  on public.dores for insert
  with check (
    auth.uid() is not null
    and autor_id = auth.uid()
    and status = 'pendente'
    and motivo_rejeicao is null
    and aprovado_em is null
    and not public.is_banned()
  );

create policy "Admins alteram dores"
  on public.dores for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins removem dores"
  on public.dores for delete
  using (public.is_admin());

create policy "Usuarios leem os proprios interesses"
  on public.interesses for select
  using (usuario_id = auth.uid() or public.is_admin());

create policy "Usuarios criam interesse em dores aprovadas"
  on public.interesses for insert
  with check (
    auth.uid() is not null
    and usuario_id = auth.uid()
    and not public.is_banned()
    and exists (
      select 1
      from public.dores
      where dores.id = dor_id
        and dores.status = 'aprovada'
    )
  );

create policy "Usuarios removem proprio interesse"
  on public.interesses for delete
  using (usuario_id = auth.uid() and not public.is_banned());

grant usage on schema public to anon, authenticated;
grant select on public.categorias to anon, authenticated;
grant select on public.dores to anon, authenticated;
grant select on public.dores_publicas to anon, authenticated;
grant select, insert, update on public.perfis to authenticated;
grant insert, update, delete on public.dores to authenticated;
grant select, insert, delete on public.interesses to authenticated;
