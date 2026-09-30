# ideias

Hipóteses. Não implementado enquanto não houver medição (Regra 2).

- **libvips em vez de ImageMagick.** Way mais rápido em imagens grandes. Medir antes de trocar: converter o mesmo PNG de 4000×3000 nos dois, 20 vezes, e comparar tempo total e memória.
- **unoserver para o LibreOffice.** O arranque a frio custa segundos por job; um processo persistente corta isso. Medir: tempo de docx→pdf no primeiro job e no décimo.
- **Motor de arquivos.** Descompactar zip e transformar em imagens/PDF, e o contrário. Mesmo `7z` serve; atenção a zip bombs.
- **Descarregar tudo num ZIP.** Provider `/api/jobs/zip` que junta vários resultados num stream. Medir: 20 PNGs de 2 MB, ZIP vs 20 downloads.
- **SSE em vez de polling.** Eventos de estado em vez de pedidos a cada 700 ms. Ganho só com muitos jobs ao mesmo tempo; medir com autocannon.
- **Opções por formato.** Qualidade do JPEG, páginas do PDF, bitrate do áudio. Cada opção é um `options` opcional no `build` do motor, não código novo na UI.
- **Fila persistente em disco.** Hoje a fila morre com o processo. Só vale a pena se houver deploys frequentes com trabalho em curso.
- **WebAssembly no browser (ffmpeg.wasm).** Conversão local sem servidor. Muda a promessa de privacidade: o ficheiro já não sai da máquina do utilizador, o que é melhor, mas o tamanho dos módulos é grande.

## Descartadas

_(nada ainda)_
