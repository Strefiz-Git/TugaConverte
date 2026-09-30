---
name: progresso
description: Usa ao fechar uma unidade de trabalho, para escrever a entrada em progresso.md. Também para decidir quando uma descoberta vira Regra.
---

# progresso.md

Diário, mais recente **em cima**. Serve a quem chega amanhã sem memória.

## Entrada

```
## AAAA-MM-DD · Título curto

**Feito**           o que mudou, em factos
**Verificado**      que comando correu e o que deu (npm test, binário real…)
**Não verificado**  o que ficou por provar. Nunca deixar vazio se houver dúvida
**Decisões**        o que se escolheu e porquê (só se houve)
```

## Regras

- No **mesmo commit** do trabalho (Regra 3).
- Sem adjetivos. "Adicionado motor X, 3 testes" e não "melhorado muito".
- "Verificado" só leva o que correu nesta sessão (Regra 15).
- Erros próprios entram: o que correu mal e que guarda evitaria repetir.

## Quando uma descoberta vira Regra

Se o mesmo erro apareceu **duas vezes** em entradas diferentes, ou se custou horas: propor regra nova (skill `agents-md`). Uma vez só, fica no diário.

## Crescimento

Passadas ~40 entradas, mover as mais antigas para `docs/progresso-arquivo.md` com um resumo de 5 linhas no topo. Não apagar.
