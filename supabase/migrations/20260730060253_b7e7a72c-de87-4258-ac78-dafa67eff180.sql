ALTER TABLE public.perfis DISABLE TRIGGER USER;
UPDATE public.perfis SET role = 'admin' WHERE email = 'samuelvf.working@gmail.com';
ALTER TABLE public.perfis ENABLE TRIGGER USER;