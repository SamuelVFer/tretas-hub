DROP TRIGGER audit_dores ON public.dores;
DROP TRIGGER audit_interesses ON public.interesses;
DROP TRIGGER audit_perfis ON public.perfis;
DROP FUNCTION public.registrar_auditoria();
DROP FUNCTION public.registrar_login();

CREATE OR REPLACE FUNCTION private.registrar_auditoria()
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

CREATE TRIGGER audit_dores
AFTER INSERT OR UPDATE OR DELETE ON public.dores
FOR EACH ROW EXECUTE FUNCTION private.registrar_auditoria();

CREATE TRIGGER audit_interesses
AFTER INSERT OR UPDATE OR DELETE ON public.interesses
FOR EACH ROW EXECUTE FUNCTION private.registrar_auditoria();

CREATE TRIGGER audit_perfis
AFTER INSERT OR UPDATE OR DELETE ON public.perfis
FOR EACH ROW EXECUTE FUNCTION private.registrar_auditoria();

CREATE OR REPLACE FUNCTION private.normalizar_login_auditoria()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
begin
  if new.acao = 'login' then
    new.tabela := 'auth';
    new.registro_id := auth.uid();
    new.ator_id := auth.uid();
    new.dados_antigos := null;
    new.dados_novos := null;
    select email into new.ator_email from public.perfis where id = auth.uid();
  end if;
  return new;
end;
$$;

CREATE TRIGGER normalizar_login_auditoria
BEFORE INSERT ON public.registros_auditoria
FOR EACH ROW EXECUTE FUNCTION private.normalizar_login_auditoria();

GRANT INSERT ON public.registros_auditoria TO authenticated;

CREATE POLICY "Usuarios registram proprio login"
ON public.registros_auditoria
FOR INSERT
TO authenticated
WITH CHECK (acao = 'login' AND ator_id = auth.uid());