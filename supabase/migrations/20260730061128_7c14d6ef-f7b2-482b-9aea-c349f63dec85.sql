create schema if not exists private;
grant usage on schema private to anon, authenticated, service_role;

create or replace function private.is_admin(user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.perfis where id = user_id and role = 'admin' and banido = false);
$$;

create or replace function private.is_banned(user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.perfis where id = user_id and banido = true);
$$;

revoke all on function private.is_admin(uuid) from public;
revoke all on function private.is_banned(uuid) from public;
grant execute on function private.is_admin(uuid) to anon, authenticated, service_role;
grant execute on function private.is_banned(uuid) to anon, authenticated, service_role;

-- categorias
drop policy if exists "Admins gerenciam categorias" on public.categorias;
create policy "Admins gerenciam categorias" on public.categorias for all using (private.is_admin()) with check (private.is_admin());

-- dores
drop policy if exists "Admins alteram dores" on public.dores;
create policy "Admins alteram dores" on public.dores for update using (private.is_admin()) with check (private.is_admin());
drop policy if exists "Admins removem dores" on public.dores;
create policy "Admins removem dores" on public.dores for delete using (private.is_admin());
drop policy if exists "Qualquer pessoa le dores aprovadas" on public.dores;
create policy "Qualquer pessoa le dores aprovadas" on public.dores for select using ((status = 'aprovada'::dor_status) or (autor_id = auth.uid()) or private.is_admin());
drop policy if exists "Usuarios criam dores pendentes" on public.dores;
create policy "Usuarios criam dores pendentes" on public.dores for insert with check ((auth.uid() is not null) and (autor_id = auth.uid()) and (status = 'pendente'::dor_status) and (motivo_rejeicao is null) and (aprovado_em is null) and (not private.is_banned()));

-- interesses
drop policy if exists "Usuarios criam interesse em dores aprovadas" on public.interesses;
create policy "Usuarios criam interesse em dores aprovadas" on public.interesses for insert with check ((auth.uid() is not null) and (usuario_id = auth.uid()) and (not private.is_banned()) and (exists (select 1 from public.dores where dores.id = interesses.dor_id and dores.status = 'aprovada'::dor_status)));
drop policy if exists "Usuarios leem os proprios interesses" on public.interesses;
create policy "Usuarios leem os proprios interesses" on public.interesses for select using ((usuario_id = auth.uid()) or private.is_admin());
drop policy if exists "Usuarios removem proprio interesse" on public.interesses;
create policy "Usuarios removem proprio interesse" on public.interesses for delete using ((usuario_id = auth.uid()) and (not private.is_banned()));

-- perfis
drop policy if exists "Admins atualizam perfis" on public.perfis;
create policy "Admins atualizam perfis" on public.perfis for update using (private.is_admin()) with check (private.is_admin());
drop policy if exists "Usuarios atualizam proprio perfil basico" on public.perfis;
create policy "Usuarios atualizam proprio perfil basico" on public.perfis for update using ((id = auth.uid()) and (not private.is_banned())) with check ((id = auth.uid()) and (not private.is_banned()));
drop policy if exists "Usuarios leem proprio perfil" on public.perfis;
create policy "Usuarios leem proprio perfil" on public.perfis for select using ((id = auth.uid()) or private.is_admin());

-- trigger function
create or replace function public.prevent_profile_privilege_escalation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (new.role is distinct from old.role or new.banido is distinct from old.banido)
    and not private.is_admin(auth.uid()) then
    raise exception 'Somente admins podem alterar role ou banimento';
  end if;
  return new;
end;
$$;

drop function if exists public.is_admin(uuid);
drop function if exists public.is_banned(uuid);