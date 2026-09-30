---
name: sessao-de-trabalho
description: Usa no início e no fim de QUALQUER sessão neste projeto. Define a ordem exata de arranque e de fecho.
---

# Sessão de trabalho

Manda na **ordem**. Os detalhes de cada passo estão nas outras skills.

## Início

1. Ler `AGENTS.md` (Regra 1), as últimas 3 entradas de `progresso.md` e o `TODO.md`.
2. `git status` e `git log -5 --oneline`: perceber se há trabalho a meio.
3. Escolher **uma** tarefa do `TODO.md` (Regra 2). Se o pedido do utilizador não estiver lá, acrescentá-lo primeiro.
4. Se toca em formatos: skill `novo-conversor`. Se toca em código: `codigo-modular`.

## Durante

- Trabalho lateral descoberto vai para o `TODO.md` ou `ideias.md`, nunca para o commit atual.
- Depois de cada mudança relevante: `npm test`.

## Fim

1. `npm run check && npm test` (Regra 15). Se falhar, não se fecha.
2. Entrada nova no topo de `progresso.md` (skill `progresso`), incluindo o que **não** foi verificado.
3. `TODO.md`: marcar `[x]` e acrescentar o que ficou por fazer.
4. Se o `README.md` ficou desatualizado: skill `readme`.
5. `npm run commit -- "mensagem"` (skill `git-auto-commit-push`). A entrada de progresso vai no MESMO commit.

## Nunca

- Reescrever o `AGENTS.md` com script (Regra 4).
- Dizer "feito" sem ter corrido o passo 1 do fecho nesta sessão.
