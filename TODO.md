# TODO

## Agora

- [x] Criar a estrutura completa: servidor, 5 motores, UI, testes, Docker, AGENTS.md e 15 skills.
- [x] Fazer o `check` validar linhas, peso do front-end, sequência das regras e skills registadas.
- [x] Verificar a UI no browser: aviso sem motores, formato desconhecido, conversão, download e erro.
- [ ] Instalar os binários dos 5 motores em Windows (ffmpeg, ImageMagick, LibreOffice, Pandoc, poppler) e correr `npm test` sem skips.
- [ ] Construir a imagem Docker e converter um ficheiro de cada família (docx→pdf, png→jpg, mp3→wav, md→epub, pdf→png).
- [ ] Abrir a UI no browser e converter um ficheiro real a partir do `public/`, incluindo a mensagem "nenhum motor ativo" quando faltam binários.

## A seguir

- [ ] PDF → PNG de todas as páginas, devolvidas num ZIP.
- [ ] Conversão em lote: vários ficheiros com um formato de destino comum, descarregar tudo num ZIP.
- [ ] Motor de arquivos (zip/tar/7z) com descompactar e recomprimir.
- [ ] Notificações de fim sem polling: SSE em `/api/jobs/:id/events`.
- [ ] Opções por formato (qualidade do JPEG, páginas do PDF, bitrate do áudio).

## Depois

- [ ] `libvips` como motor de imagem em paralelo com o ImageMagick, medindo quem é mais rápido.
- [ ] `unoserver` para eliminar o arranque a frio do LibreOffice.
- [ ] Poda de formatos antigos no mesmo motor (ex.: `wma` e `aiff`).
- [ ] Rate limit opcional no servidor para quem não quer pôr proxy (desligado por omissão, Regra 6).
