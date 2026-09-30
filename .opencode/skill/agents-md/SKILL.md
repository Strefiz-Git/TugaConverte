---
name: agents-md
description: Usa quando for preciso acrescentar, alterar ou revogar uma regra do AGENTS.md, ou atualizar o seu índice.
---

# Editar o AGENTS.md

O `AGENTS.md` é lei. Cresce com cuidado ou deixa de ser lido.

## Acrescentar uma regra

1. Confirmar que é mesmo uma regra: algo que, esquecido, cause um erro repetido. Se é um procedimento, é uma **skill**, não uma regra.
2. Usar o número seguinte (a linha "A próxima regra é a N"). Nunca reutilizar nem renumerar (Regra 14).
3. Formato: `### Regra N — Título curto` e um parágrafo com **o quê** e **porquê**.
4. Acrescentar a linha na tabela do índice.
5. Atualizar "A próxima regra é a N+1".
6. `npm run check` valida a sequência.

## Alterar ou revogar

- Alterar: editar o texto, manter o número.
- Revogar: substituir o corpo por `Revogada em AAAA-MM-DD: <porquê>`. O número fica.

## Como editar

Com a ferramenta de edição, em alterações pequenas (Regra 4). Nunca reescrever o ficheiro todo, nunca por script. Sem TABs.

## Mais de 300 linhas?

Não encolher as regras. Mover o **procedimento** para uma skill e deixar na regra só a lei e o porquê.

## Cada skill nova

Tem de aparecer no `AGENTS.md`, entre crases (`nome`), na tabela do índice e na lista de skills. O `check` falha se faltar.
