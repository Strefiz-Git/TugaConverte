---
name: frontend
description: Usa ao alterar a interface em public/ (HTML, CSS, JS do browser). Mantém a UI leve, acessível e sem framework.
---

# Frontend

Inspiração: CloudConvert. Um ecrã, uma ação: largar ficheiros → escolher formato → converter → descarregar.

## Restrições

- HTML + CSS + JS puro, ES modules, sem bundler nem framework (Regra 12). Total ≤ 30 KB.
- Formatos vêm de `/api/formats` (Regra 9). Nunca hardcode de listas de formatos no JS.
- Nomes de ficheiros só com `textContent` (skill `seguranca`).
- Upload com `XMLHttpRequest` (o `fetch` não dá progresso de envio).
- Polling a 700 ms até `done`/`error` (SSE está no TODO).

## Estado por linha

`escolher → a enviar (%) → a converter → pronto | erro`. Erros mostram a mensagem da API e permitem tentar de novo.

## Acessibilidade

- A zona de largar é focável e abre com Enter/Espaço.
- Cores por variáveis CSS, com modo escuro via `prefers-color-scheme`.
- Botões com texto; ícones só com `title`.
- Contraste mínimo AA.

## Ao acrescentar uma funcionalidade

1. Cabe no orçamento de 30 KB? `npm run check`.
2. Funciona só com teclado?
3. Funciona num ecrã de 360 px?
4. Testar no browser com um ficheiro real, não só ler o código.

## Ideias de UI

Ver `ideias.md`: pré-visualização, "descarregar tudo" em ZIP, opções por formato.
