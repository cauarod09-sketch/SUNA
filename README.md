# SUNA — Seu Glow Up em 21 Dias

App web mobile-first de autocuidado, organização e hábitos em 21 dias. React + TypeScript + Vite, com Supabase (login, banco e regras de segurança).

## Testar agora (modo demonstração)

```bash
cd suna-app
npm install
npm run dev
```

Abra http://localhost:5173. O arquivo `.env` local vem com `VITE_DEMO_MODE=true`: tudo fica salvo só no navegador, sem servidor. A faixa escura no topo permite avançar o relógio (+/−) para testar os 21 dias. **Não publique assim.**

## Colocar em produção

O Supabase guarda apenas as contas (cadastro e login) e os registros de cada usuária. **Não há verificação de compra nem confirmação de e-mail**: qualquer pessoa com o link consegue se cadastrar, então entregue o link só para quem comprou.

1. **Supabase** (projeto `suna`, sa-east-1 — já configurado): para recriar em outro projeto, execute `supabase/schema.sql` no SQL Editor e publique a função `signup` (`supabase functions deploy signup`).
2. **Vercel**: importe o repositório em vercel.com/new (framework Vite, já configurado em `vercel.json`). Não precisa de variáveis: a URL e a chave pública do Supabase e o link do GPT já estão em `src/config.ts` (o `.env` pode sobrescrever).
4. No painel do Supabase, **Authentication > URL Configuration**: coloque o domínio do app em *Site URL* e *Redirect URLs*.
5. **"Esqueci minha senha"** envia e-mail: para funcionar com qualquer usuária, configure um SMTP próprio em **Authentication > Emails > SMTP** (ex.: Resend, Brevo). O e-mail padrão do Supabase só envia para membros da equipe do projeto. Cadastro e login não dependem de e-mail.
6. Opcional: excluir a função antiga `purchase-webhook` em **Edge Functions** (está desativada e não faz nada).
7. Revise `public/termos.html` e `public/privacidade.html` (são modelos).

## Como os dados são protegidos

- O cadastro passa pela Edge Function `signup`, que cria a conta já ativa (sem e-mail de confirmação). Cada e-mail só cria uma conta.
- Cada usuária só lê e grava os próprios registros (RLS). Sem login, nada é lido.
- O dia liberado vem do relógio do servidor (America/Sao_Paulo). Mudar o relógio do celular não libera dias: o banco recusa gravações em dias futuros.
- A data do Dia 1 é definida pelo servidor no primeiro acesso e nunca é reiniciada.

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
| `supabase/functions/signup` | Cadastro: cria a conta já ativa |
| `public/assets/suna/` | PNGs oficiais da marca |
| `src/config.ts` | Configurações editáveis (`SUNA_CUSTOM_GPT_URL`, caminhos dos PNGs) |

## Personagem Suna

Coloque o PNG oficial da personagem em `public/assets/suna/personagem-suna.png`. Enquanto o arquivo não existir, o app mostra o ícone oficial da marca no lugar. Nenhuma imagem é gerada ou inventada.

## Salvamento

Tudo é salvo sozinho (checkbox na hora, textos ~0,7 s depois de parar de digitar), com indicador "Salvando… / Salvo / Não salvou · Tentar de novo". Alterações sem internet ficam guardadas no aparelho e são reenviadas na próxima abertura.

## Status de verificação (06/11/2026)

- `npm run build` e `npm test` (15 testes: roteiro, hábitos, calendário de meia-noite, cálculo de 84 componentes, estados dos blocos) passando.
- Conferido no navegador em 375px, modo demonstração: boas-vindas → cadastro (validações) → primeiro acesso na aba SUNA com anel amarelo → link do GPT em nova aba → Início com conversa automática, digitação e pular → revelar e concluir desafio → Rotina (bloqueio de dias futuros, checklists, anotação, salvamento) → recarregar sem perder nada → Evolução (3,6% = 3/84) → Dia 7 com conquista → Dia 21 com tela final.
- Verificado no Supabase real (07/11/2026): cadastro com qualquer e-mail cria conta ativa, login na hora, e-mail repetido recusado, Dia 1 gravado, Dia 2 recusado antes da meia-noite, sem login nada é lido.
- **Não verificado ainda**: recuperação de senha (precisa de SMTP).
