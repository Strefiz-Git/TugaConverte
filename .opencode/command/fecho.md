---
description: Fecha a sessão (verifica, atualiza progresso e TODO, commit e push)
---

Fecha a sessão de trabalho seguindo a skill `sessao-de-trabalho` (secção Fim):

1. Corre `npm run check && npm test` e mostra o resultado.
2. Escreve a entrada no topo de `progresso.md` (skill `progresso`), com "Verificado" e "Não verificado" honestos.
3. Atualiza o `TODO.md` (skill `todo`) e, se for preciso, o `README.md` (skill `readme`).
4. Corre `npm run commit -- "mensagem"` com uma mensagem no formato da skill `git-auto-commit-push`.

Contexto extra do utilizador: $ARGUMENTS
