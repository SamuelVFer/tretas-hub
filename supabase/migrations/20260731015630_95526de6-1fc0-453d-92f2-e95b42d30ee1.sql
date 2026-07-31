alter table public.dores alter column autor_id drop not null;

grant insert on public.dores to anon;

drop policy if exists "Usuarios criam dores pendentes" on public.dores;

create policy "Qualquer pessoa cria dores pendentes"
on public.dores
for insert
to anon, authenticated
with check (
  status = 'pendente'
  and motivo_rejeicao is null
  and aprovado_em is null
  and (
    (auth.uid() is null and autor_id is null)
    or (auth.uid() is not null and autor_id = auth.uid() and not private.is_banned())
  )
);