alter table public.perfis disable trigger user;
update public.perfis set role = 'admin' where email = 'samuelvf.working@gmail.com';
alter table public.perfis enable trigger user;