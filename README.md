# SUNA — Seu Glow Up em 21 Dias

App web mobile-first de autocuidado, organização e hábitos em 21 dias. React + TypeScript + Vite, com Supabase (login, banco e regras de segurança).

## Testar agora (modo demonstração)

```bash
cd suna-app
npm install
npm run dev
```

Abra http://localhost:5173. O arquivo `.env` local vem com `VITE_DEMO_MODE=true`: tudo fica salvo no navegador e **não há validação de compra**. A faixa escura no topo permite avançar o relógio (+/−) para testar os 21 dias. **Não publique assim.**

## Colocar em produção

1. **Supabase**: crie um projeto, abra o SQL Editor e execute `supabase/schema.sql`.
2. **Autenticação** (Authentication > Providers > Email): mantenha **Confirm email ligado** — é o que prova que o e-mail é da compradora. Em URL Configuration, coloque o domínio do app em *Site URL* e *Redirect URLs*.
3. **Webhook de compra**: publique `supabase/functions/purchase-webhook` (`supabase functions deploy purchase-webhook`) e configure um dos segredos:
   - Hotmart: `HOTMART_HOTTOK` (o hottok da sua conta). URL do webhook: `https://<projeto>.supabase.co/functions/v1/purchase-webhook`
   - Kiwify: `KIWIFY_TOKEN` (token do webhook). A Kiwify envia `?signature=` e o app confere.
   - Outra plataforma: `SUNA_WEBHOOK_TOKEN` + header `x-suna-token`, corpo `{ "email", "order_id", "status": "approved" | "refunded" | "chargeback" | "canceled" }`.
   - Opcional: `SUNA_PRODUCT_IDS` para aceitar só o produto SUNA.
   - Liberar manualmente: `insert into public.purchases (email, source) values ('cliente@exemplo.com', 'manual');`
4. **`.env` de produção** (veja `.env.example`): `VITE_DEMO_MODE=false`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` e `VITE_SUNA_CUSTOM_GPT_URL` (link do seu GPT personalizado).
5. `npm run build` e publique a pasta `dist/` (Vercel, Netlify etc.), com HTTPS.
6. Revise `public/termos.html` e `public/privacidade.html` (são modelos) com seus dados e assessoria jurídica.

## Como o acesso é protegido

- O cadastro só é aceito se o e-mail tiver compra **aprovada** (gatilho no banco). Digitar o e-mail de outra pessoa não basta: o acesso só abre depois que o link de confirmação enviado para aquele e-mail é clicado.
- Reembolso/chargeback recebido pelo webhook bloqueia o acesso na próxima abertura.
- Cada usuária só lê e grava os próprios registros (RLS).
- O dia liberado vem do relógio do servidor (America/Sao_Paulo). Mudar o relógio do celular não libera dias: o banco recusa gravações em dias futuros.

## Organização

| Caminho | O que é |
|---|---|
| `src/content/days.ts` | As 21 conversas e os 21 desafios (roteiro fixo) |
| `src/content/habits.ts` | Hábitos acumulativos (Dias 3, 4, 5, 6, 8, 13, 15) |
| `src/lib/time.ts` | Calendário em America/Sao_Paulo |
| `src/lib/progress.ts` | Cálculo da evolução (4 componentes × 21 dias = 84) |
| `src/lib/api.ts` | Supabase e modo demonstração |
| `src/lib/store.tsx` | Estado, salvamento automático e virada de dia à meia-noite |
| `src/lib/pdf.ts` | Planner A4 em PDF (em branco e preenchido) |
| `src/screens/` | Boas-vindas/cadastro/login, Início, Rotina, SUNA, Evolução |
| `supabase/schema.sql` | Tabelas, RLS e funções |
| `supabase/functions/purchase-webhook` | Recebe compras da plataforma de pagamento |
| `public/assets/suna/` | PNGs oficiais da marca |
| `src/config.ts` | Configurações editáveis (`SUNA_CUSTOM_GPT_URL`, caminhos dos PNGs) |

## Personagem Suna

Coloque o PNG oficial da personagem em `public/assets/suna/personagem-suna.png`. Enquanto o arquivo não existir, o app mostra o ícone oficial da marca no lugar. Nenhuma imagem é gerada ou inventada.

## Salvamento

Tudo é salvo sozinho (checkbox na hora, textos ~0,7 s depois de parar de digitar), com indicador "Salvando… / Salvo / Não salvou · Tentar de novo". Alterações sem internet ficam guardadas no aparelho e são reenviadas na próxima abertura.

## Status de verificação (06/11/2026)

- `npm run build` e `npm test` (15 testes: roteiro, hábitos, calendário de meia-noite, cálculo de 84 componentes, estados dos blocos) passando.
- Conferido no navegador em 375px, modo demonstração: boas-vindas → cadastro (validações) → primeiro acesso na aba SUNA com anel amarelo → link do GPT em nova aba → Início com conversa automática, digitação e pular → revelar e concluir desafio → Rotina (bloqueio de dias futuros, checklists, anotação, salvamento) → recarregar sem perder nada → Evolução (3,6% = 3/84) → Dia 7 com conquista → Dia 21 com tela final.
- **Não verificado ainda** (exige Supabase real): cadastro com compra, confirmação de e-mail, recuperação de senha, RLS e webhook de pagamento.
