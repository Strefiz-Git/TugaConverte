---
name: todo
description: Usa para ler, priorizar, acrescentar ou fechar tarefas em TODO.md.
---

# TODO.md

Trabalho **decidido**. Hipóteses vão para `ideias.md`.

## Estrutura

Secções `Agora`, `A seguir`, `Depois`. Checkbox por tarefa: `- [ ]` / `- [x]`.

## Boas tarefas

- Uma frase, verbo no infinitivo, resultado verificável: "PDF → PNG de todas as páginas (zip)".
- Cabe numa sessão. Se não cabe, parte-se em duas.
- Se é verificação de algo não provado, diz-se: "correr o motor X com binário real".

## Fluxo

1. Início de sessão: escolher a **primeira** de `Agora`, salvo pedido explícito do utilizador.
2. Ao terminar: `[x]` e entrada em `progresso.md` (mesmo commit).
3. Tarefa nova descoberta: acrescentar, não fazer (Regra 2).
4. `[x]` com mais de 2 semanas: apagar do TODO (fica no `progresso.md`).

## Prioridade

1. Coisas que estão a mentir ao utilizador (formato anunciado que falha).
2. Verificações de coisas não provadas.
3. Funcionalidades novas.
