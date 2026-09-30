---
name: git-auto-commit-push
description: Usa para fazer commit e push automáticos no fim de uma unidade de trabalho, com scripts/auto-commit.mjs. Define quando commitar e como escrever a mensagem.
---

# Auto commit + auto push

## Comando

```bash
npm run commit -- "Título curto no imperativo

Corpo: porquê, não o quê."
npm run commit -- "mensagem" --no-push   # só commit
```

O script: `check` → testes → `git add -A` → tira do stage o que tem >5 MB ou é binário → commit → push (com `pull --rebase` se o push for recusado). Se o check ou os testes falharem, **não commita**.

## Quando commitar

Ao fim de cada unidade de trabalho que passa nos testes: uma tarefa do TODO, um motor novo, uma correção. Nunca a meio de algo partido. Um assunto por commit.

## Sempre no mesmo commit

O código + os testes + a entrada de `progresso.md` + o `TODO.md` atualizado (Regra 3).

## Mensagem

- Português, imperativo, primeira linha até 72 caracteres.
- Corpo (se houver): o porquê e o que foi/não foi verificado.
- Sem "wip", "fix stuff", "updates".

## Nunca

- `--no-verify`, `push --force`, ou saltar o check.
- Commitar `.env`, `data/`, `node_modules/`, `.zip` (Regra 16).
- Reescrever histórico já publicado.

## Primeira vez

Se não há repositório: `git init -b main`, e depois `git remote add origin <url>`. Sem `origin` o script faz commit e avisa que saltou o push.

## Se o push falhar

Ler o erro. Autenticação: avisar o utilizador, não contornar. Rebase com conflito: parar e pedir ajuda em vez de resolver às cegas.
