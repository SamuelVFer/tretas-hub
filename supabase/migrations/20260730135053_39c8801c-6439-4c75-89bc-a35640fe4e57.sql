CREATE TYPE public.audit_acao AS ENUM ('insert','update','delete','login');

CREATE TABLE public.registros_auditoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tabela text NOT NULL,
  acao public.audit_acao NOT NULL,
  registro_id uuid,
  ator_id uuid,
  ator_email text,
  dados_antigos jsonb,
  dados_novos jsonb,
  criado_em timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.registros_auditoria TO authenticated;
GRANT ALL ON public.registros_auditoria TO service_role;

ALTER TABLE public.registros_auditoria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins leem auditoria"
ON public.registros_auditoria
FOR SELECT
TO authenticated
USING (private.is_admin());

CREATE INDEX registros_auditoria_criado_em_idx ON public.registros_auditoria (criado_em DESC);

CREATE OR REPLACE FUNCTION public.registrar_auditoria()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  v_registro_id uuid;
  v_email text;
begin
  if tg_op = 'DELETE' then
    v_registro_id := (to_jsonb(old) ->> 'id')::uuid;
  else
    v_registro_id := (to_jsonb(new) ->> 'id')::uuid;
  end if;

  select email into v_email from public.perfis where id = auth.uid();

  insert into public.registros_auditoria (tabela, acao, registro_id, ator_id, ator_email, dados_antigos, dados_novos)
  values (
    tg_table_name,
    lower(tg_op)::public.audit_acao,
    v_registro_id,
    auth.uid(),
    v_email,
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) else null end
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

REVOKE EXECUTE ON FUNCTION public.registrar_auditoria() FROM anon, authenticated;

CREATE TRIGGER audit_dores
AFTER INSERT OR UPDATE OR DELETE ON public.dores
FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria();

CREATE TRIGGER audit_interesses
AFTER INSERT OR UPDATE OR DELETE ON public.interesses
FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria();

CREATE TRIGGER audit_perfis
AFTER INSERT OR UPDATE OR DELETE ON public.perfis
FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria();

CREATE OR REPLACE FUNCTION public.registrar_login()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  v_email text;
begin
  if auth.uid() is null then
    return;
  end if;

  select email into v_email from public.perfis where id = auth.uid();

  insert into public.registros_auditoria (tabela, acao, registro_id, ator_id, ator_email)
  values ('auth', 'login', auth.uid(), auth.uid(), v_email);
end;
$$;

REVOKE EXECUTE ON FUNCTION public.registrar_login() FROM anon;
GRANT EXECUTE ON FUNCTION public.registrar_login() TO authenticated;