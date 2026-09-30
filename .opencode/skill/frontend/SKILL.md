---
name: frontend
description: Usa ao alterar a interface em public/ (HTML, CSS, JS do browser). Mantém a UI leve, acessível e sem framework.
---

# Frontend

Inspiração: CloudConvert. Um ecrã, uma ação: largar ficheiros → escolher formato → converter → descarregar.

## Restrições

- HTML + CSS + JS puro, ES modules, sem bundler nem framework (Regra 12).
- Formatos vêm de `/api/formats` (Regra 9). Nunca hardcode de listas de formatos no JS.
- Nomes de ficheiros só com `textContent` (skill `seguranca`).
- Upload com `XMLHttpRequest` (o `fetch` não dá progresso de envio).
- Polling a 700 ms até `done`/`error` (SSE está no TODO).

## Estado por linha

`escolher → a enviar (%) → a converter → pronto | erro`. Erros mostram a mensagem da API e permitem tentar de novo.

## Calar-se é um defeito

Três coisas caladas já custaram tempo: o rodapé dizer que o ficheiro foi processado por binários que não existem, um ficheiro ser ignorado sem explicação, e `/api/health` não devolver o TTL que a UI lia. Regras:

1. Se `/api/health` não trouxer motores, a UI diz isso e diz como resolver.
2. Um ficheiro rejeitado diz porquê, em vez de desaparecer.
3. A UI só inventa um valor quando a API não o fornece de todo; se fornece, usa o que veio.

## Nunca apagar o job antes de o utilizador o descarregar

O link de download e a limpeza não podem depender um do outro pela ordem errada. Apagar ao mostrar o link faz o clique seguinte dar 404. O botão "apagar" é explícito; se o download for acionado, a limpeza só acontece depois de um intervalo.

## Acessibilidade

- A zona de largar é focável e abre com Enter/Espaço.
- Cores por variáveis CSS, com modo escuro via `prefers-color-scheme`.
- Botões com texto; ícones só com `title`.
- Contraste mínimo AA.

## Ao acrescentar uma funcionalidade

1. Cabe no orçamento? `npm run check` imprime os KB brutos e os comprimidos.
2. Funciona só com teclado?
3. Funciona num ecrã de 360 px?
4. Testar no browser com um ficheiro real, não só ler o código.

## Como testar a UI sem binários

Arrancar um servidor descartável **fora do repositório** com `buildApp` e um motor falso: dá para exercitar largar ficheiro, escolher destino, converter, descarregar e o caminho de erro, sem tocar no projeto. Faz o `runFn` falhar para um destino e vê a mensagem na linha. Nunca deixar esse ficheiro no repositório.

## Ideias de UI

Ver `ideias.md`: pré-visualização, "descarregar tudo" em ZIP, opções por formato.
