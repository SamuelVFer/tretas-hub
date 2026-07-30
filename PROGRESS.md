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

### Identidade visual v1

- Aplicados tokens "Sinal quente" no CSS com paleta Neblina/Nuvem/Coral/Lilás/Menta/Manteiga/Tinta Ameixa.
- Adicionadas fontes Google: Instrument Serif, Manrope e IBM Plex Mono.
- Adicionado `framer-motion` para animações de feed, hover de card, pill de abas, interesse com bounce/pulso/partículas e contador animado.
- Cards com 5+ interesses recebem halo coral com respiração suave.
- Status `pendente` pulsa suavemente e `prefers-reduced-motion` reduz animações globais.
- O arquivo `tretas-hub-preview.html` citado no briefing não foi encontrado no repo nem no VPS; a implementação seguiu os tokens e especificações textuais do briefing.
