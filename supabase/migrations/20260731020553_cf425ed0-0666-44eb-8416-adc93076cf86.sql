CREATE POLICY "Usuarios leem propria auditoria"
ON public.registros_auditoria FOR SELECT
TO authenticated
USING (ator_id = auth.uid());