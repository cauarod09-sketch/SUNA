# SUNA — regras para o Claude Code

App web mobile-first **SUNA — Seu Glow Up em 21 Dias**. React + TypeScript + Vite + Supabase. Português do Brasil.
A especificação de referência é o "Prompt Mestre Final" (nov/2026). Antes de mudar comportamento, confira `README.md`.

## Regras que não podem ser alteradas

- Exatamente quatro abas, nesta ordem: **Início, Rotina, SUNA, Evolução**. Nenhuma aba extra (nem de desafios).
- Sem diagnóstico inicial, sem treinos internos, sem dietas internas, sem IA generativa dentro do app.
- A personagem Suna só fala o roteiro fixo de `src/content/days.ts` (21 conversas, 3 opções fixas A/B/C, 21 desafios). Não editar textos do roteiro sem pedido.
- Orientação de treino/alimentação = GPT externo, link em `VITE_SUNA_CUSTOM_GPT_URL` (abre em nova aba). Nunca inventar o endereço.
- Primeiro acesso cai na aba SUNA com "COMECE POR AQUI" e anel amarelo animado; o anel some após o primeiro clique.
- Três checklists por dia (alimentação, atividade, grupo pessoal) + desafio = 4 componentes de 25%. Progresso = concluídos / 84.
- Dias liberados à meia-noite de America/Sao_Paulo pelo relógio do **servidor**; dias futuros bloqueados também no banco (RLS). Ausência nunca reinicia a jornada.
- Usar só os PNGs oficiais (`public/assets/suna/`). Não redesenhar logo nem gerar personagem com IA.
- Nenhum botão de fachada: tudo precisa funcionar de verdade.

## Segurança

- Acesso = compra aprovada em `purchases` (só servidor escreve) + e-mail confirmado. Não desativar RLS. Nunca expor a service role no frontend.
- `VITE_DEMO_MODE=true` é só para teste local (sem compra, dados no navegador). Nunca publicar assim.

## Antes de dizer que terminou

`npm run build` e `npm test` precisam passar. Teste no navegador em 375px.
