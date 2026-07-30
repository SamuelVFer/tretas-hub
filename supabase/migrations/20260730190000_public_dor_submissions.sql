alter table public.dores
  alter column autor_id drop not null;

drop policy if exists "Usuarios criam dores pendentes" on public.dores;

create policy "Qualquer pessoa cria dores pendentes"
  on public.dores for insert
  to anon, authenticated
  with check (
    autor_id is null
    and status = 'pendente'::public.dor_status
    and motivo_rejeicao is null
    and aprovado_em is null
  );

grant insert on public.dores to anon;
