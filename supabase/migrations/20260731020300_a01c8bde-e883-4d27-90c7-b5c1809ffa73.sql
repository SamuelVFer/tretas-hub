ALTER TABLE public.dores
  ADD COLUMN IF NOT EXISTS arquivada_em timestamptz,
  ADD COLUMN IF NOT EXISTS arquivado_por uuid;

CREATE OR REPLACE VIEW public.dores_publicas AS
SELECT d.id,
    d.titulo,
    d.descricao,
    d.empresa_contexto,
    d.status,
    d.criado_em,
    d.aprovado_em,
    d.categoria_id,
    c.nome AS categoria_nome,
    d.autor_id,
    COALESCE(count(i.id), 0::bigint)::integer AS interesse_count
   FROM public.dores d
     JOIN public.categorias c ON c.id = d.categoria_id
     LEFT JOIN public.interesses i ON i.dor_id = d.id
  WHERE d.status = 'aprovada'::dor_status AND d.arquivada_em IS NULL
  GROUP BY d.id, c.id;

DROP POLICY IF EXISTS "Admins removem dores" ON public.dores;
REVOKE DELETE ON public.dores FROM anon, authenticated;

DROP POLICY IF EXISTS "Qualquer pessoa le dores aprovadas" ON public.dores;
CREATE POLICY "Qualquer pessoa le dores aprovadas"
ON public.dores FOR SELECT
USING (
  (status = 'aprovada'::dor_status AND arquivada_em IS NULL)
  OR autor_id = auth.uid()
  OR private.is_admin()
);