grant insert, update, delete on public.categorias to authenticated;

drop trigger if exists audit_categorias on public.categorias;

create trigger audit_categorias
after insert or update or delete on public.categorias
for each row execute function private.registrar_auditoria();
