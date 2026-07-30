alter table public.perfis disable trigger user;

do $$
declare
  target_email text := 'samuelvf.working@gmail.com';
  target_user_id uuid;
  target_name text;
begin
  select id, coalesce(raw_user_meta_data->>'nome', raw_user_meta_data->>'name', 'Samuel')
    into target_user_id, target_name
  from auth.users
  where lower(email) = lower(target_email)
  limit 1;

  if target_user_id is not null then
    insert into public.perfis (id, nome, email, role, banido)
    values (target_user_id, target_name, target_email, 'admin', false)
    on conflict (id) do update
      set email = excluded.email,
          role = 'admin',
          banido = false;
  end if;

  update public.perfis
    set role = 'admin',
        banido = false
  where lower(email) = lower(target_email);
end $$;

alter table public.perfis enable trigger user;
