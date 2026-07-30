create extension if not exists pgcrypto with schema extensions;

alter table public.perfis disable trigger user;

do $$
declare
  admin_email text := 'admin@tretashub.com';
  admin_password text := '12345';
  admin_user_id uuid;
begin
  select id
    into admin_user_id
  from auth.users
  where lower(email) = lower(admin_email)
  limit 1;

  if admin_user_id is null then
    admin_user_id := gen_random_uuid();

    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      confirmation_token,
      recovery_token,
      email_change,
      email_change_token_new,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    )
    values (
      '00000000-0000-0000-0000-000000000000',
      admin_user_id,
      'authenticated',
      'authenticated',
      admin_email,
      extensions.crypt(admin_password, extensions.gen_salt('bf')),
      now(),
      '',
      '',
      '',
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"nome":"Admin Tretas HUB"}'::jsonb,
      now(),
      now()
    );
  else
    update auth.users
      set encrypted_password = extensions.crypt(admin_password, extensions.gen_salt('bf')),
          email_confirmed_at = coalesce(email_confirmed_at, now()),
          raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
          raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || '{"nome":"Admin Tretas HUB"}'::jsonb,
          updated_at = now()
    where id = admin_user_id;
  end if;

  insert into auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  )
  select
    gen_random_uuid()::text,
    admin_user_id,
    admin_user_id::text,
    jsonb_build_object('sub', admin_user_id::text, 'email', admin_email),
    'email',
    now(),
    now(),
    now()
  where not exists (
    select 1
    from auth.identities
    where user_id = admin_user_id
      and provider = 'email'
  );

  insert into public.perfis (id, nome, email, role, banido)
  values (admin_user_id, 'Admin Tretas HUB', admin_email, 'admin', false)
  on conflict (id) do update
    set nome = excluded.nome,
        email = excluded.email,
        role = 'admin',
        banido = false;
end $$;

alter table public.perfis enable trigger user;
