---
name: codigo-modular
description: Usa ao criar ou alterar código em src/, public/ ou scripts/. Ficheiros pequenos, módulos com uma responsabilidade, funções puras.
---

# Código modular

## Regras (Regra 5)

- Máximo **250 linhas** por ficheiro. O `check` falha acima disso.
- Um módulo, uma responsabilidade. Se o nome precisa de "e" ("jobs e queue"), são dois.
- Decidir é puro, fazer é na borda. `registry.find()` é puro; `runner.run()` é o efeito.
- Dependências injetadas (`buildApp({ registry, runFn })`), para testar sem binários.

## Mapa

| Pasta | Responsabilidade |
|---|---|
| `src/engines/` | declarar o que cada binário faz (dados + `build`) |
| `src/core/` | registry, fila, jobs, runner, procura de binários |
| `src/app.js` | rotas HTTP, nada de lógica de conversão |
| `public/` | UI, sem framework |

## Motor = dados

Um motor é `{ id, bins, from, to, supports?, build }`. O `build` devolve `{ cmd?, args, produced? }` e **não corre nada**. Assim é trivial de testar (Regra 10).

## Antes de acrescentar código

1. Já existe algo parecido? Reutilizar.
2. Vai crescer um ficheiro além de 200 linhas? Partir agora.
3. Está a misturar decisão e efeito? Separar.

## Não fazer

- Dependências novas por conveniência. Cada uma pesa no arranque e na superfície de ataque.
- Estado global além do que `buildApp` cria.
- Comentários a repetir o código; comentar o **porquê**.
