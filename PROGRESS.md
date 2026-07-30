# Progresso do Tretas HUB

## 2026-07-30

### Feito

- Inspeção inicial: repo Lovable com TanStack Start, React 19, Tailwind 4, shadcn/Radix, TanStack Query/Router e sem backend/Auth configurado.
- Adicionado Supabase como backend do MVP, mantendo a stack existente.
- Criada migration com tabelas `perfis`, `categorias`, `dores`, `interesses`, seeds de categorias, constraints, índices, triggers, view pública de contagem e RLS.
- Implementada tela principal com feed público, filtro por categoria, ordenação, login/cadastro, envio de dor, minhas dores, interesse único e painel admin.
- Painel admin inclui fila de curadoria com edição antes de aprovar/rejeitar, lista de usuários com promoção/rebaixamento e banimento, e visualização de categorias.
- `bun run lint` passa com avisos já existentes dos componentes shadcn.
- `bun run build` passa.

### Falta

- Conectar um projeto Supabase real com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
- Aplicar `supabase/migrations/20260730053500_tretas_hub_mvp.sql` no Supabase.
- Promover manualmente o primeiro admin no banco, por exemplo:

```sql
update public.perfis
set role = 'admin'
where email = 'email-do-admin@exemplo.com';
```

- Validar o fluxo ponta a ponta com usuários reais: cadastro, envio, aprovação, feed, interesse e bloqueio de usuário comum no admin.
