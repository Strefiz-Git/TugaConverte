---
name: novo-conversor
description: Usa para acrescentar um formato a um motor existente ou um motor novo (binário externo) ao TugaConverte.
---

# Novo formato ou motor

## Só um formato novo num motor existente

1. Acrescentar a extensão a `from` e/ou `to` em `src/engines/<motor>.js`.
2. Se o motor usa `supports()` (LibreOffice, ffmpeg), atualizar as tabelas de destinos.
3. Verificar que o **binário** o suporta mesmo: `ffmpeg -formats`, `convert -list format`, `pandoc --list-output-formats`.
4. Teste em `tests/registry.test.js` (quem resolve o par).
5. Teste real com o binário, se existir (skill `testes`).

## Motor novo

1. `src/engines/<id>.js`:

```js
export default {
  id: 'meu-motor',
  bins: ['meubinario'],          // TODOS têm de existir para o motor ativar
  from: ['abc'], to: ['xyz'],
  build({ input, output, from, to, dir }) {
    return { args: ['-i', input, output] };   // opcional: cmd, produced
  },
};
```

2. Registar em `src/engines/index.js`. **A ordem decide** quem ganha quando dois motores suportam o mesmo par.
3. Instalar o binário no `Dockerfile`.
4. Tabela de motores no `README.md` (skill `readme`) e par novo em `tests/registry.test.js`.

## Cuidados

- `build` não corre nada: devolve argumentos (Regra 7 e 10).
- O input é sempre `input.<ext>` e o output `output.<ext>` (Regra 8). Se o binário escreve noutro nome, devolver `produced`.
- Binários que partilham perfil ou estado (LibreOffice) precisam de diretório por job para correr em paralelo.
- Binários com políticas de segurança (ImageMagick + PDF) → preferir uma alternativa em vez de afrouxar a política.

## Antes de dizer "feito"

Converter um ficheiro real, abrir o resultado e confirmar que é o que se esperava (Regra 15).
