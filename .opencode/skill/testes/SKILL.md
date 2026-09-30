---
name: testes
description: Usa para decidir que testes correr ou escrever para cada tipo de mudança, e para garantir que um teste realmente falha quando deve.
---

# Testes

Runner: `node --test tests/` (`npm test`). Sem framework.

## O que correr

| Mudança | Correr |
|---|---|
| Qualquer coisa | `npm run check && npm test` |
| Motor novo ou pares novos | `tests/registry.test.js` + `tests/real.test.js` |
| Rotas, jobs, fila | `tests/app.test.js` |
| Skills, AGENTS.md | `npm run check` |
| `public/` | abrir no browser e converter um ficheiro; o `check` mede o peso |

## Os dois níveis

1. **Motor falso** (`tests/app.test.js`): prova o fluxo enviar → fila → conversão → download → limpeza, sem binários.
2. **Binário real** (`tests/real.test.js`): prova que os **argumentos** de cada motor funcionam. Só corre se o binário existir (`hasBin`), senão salta. Ao registar em `progresso.md`, dizer quais correram e quais foram saltados.

## Um teste tem de morder (Regra 11)

Depois de escrever:

1. Estragar o código protegido (trocar um argumento, remover um `if`).
2. Ver o teste falhar.
3. Repor.

Um teste que passa sempre não protege nada.

## Teste de motor real (modelo)

```js
import { hasBin } from '../src/core/bins.js';
import { realConvert, startsWith } from './helpers.js';

const skip = (bin) => ({ skip: hasBin(bin) ? false : `sem ${bin} neste sistema` });

test('png → jpg', skip('convert'), async () => {
  const { data } = await realConvert(registry, 'png', 'jpg');
  assert.ok(startsWith(data, 'ffd8ff'));   // magic bytes
});
```

Verificar o **resultado** (magic bytes, tamanho > 0), não só o código de saída 0.

## Não fazer

- Afirmar que um motor funciona sem o ter corrido (Regra 15).
- Testes que dependem da rede.
