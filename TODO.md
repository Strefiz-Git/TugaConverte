# TODO

## Agora

- [x] Criar a estrutura completa: servidor, 5 motores, UI, testes, Docker, AGENTS.md e 15 skills.
- [x] Fazer o `check` validar linhas, peso do front-end, sequência das regras e skills registadas.
- [x] Verificar a UI no browser: aviso sem motores, formato desconhecido, conversão, download e erro.
- [ ] Instalar os binários dos 5 motores em Windows (ffmpeg, ImageMagick, LibreOffice, Pandoc, poppler) e correr `npm test` sem skips.
- [ ] Construir a imagem Docker e converter um ficheiro de cada família (docx→pdf, png→jpg, mp3→wav, md→epub, pdf→png).
- [x] Escolher os formatos antes do ficheiro, com botão de troca e diálogo com filtro.
- [x] Erros da API com `code` para além da mensagem (`{ error, code, campos? }`).
- [x] Catálogo de formatos por categoria, com contagens, alimentado por dados do servidor (categorias declaradas nos motores, nunca escritas à mão no `public/`).
- [ ] Ajudar a instalar as dependências: página de diagnóstico que diz, por motor, que binários faltam e o comando exacto para o sistema onde o servidor corre, com botão de copiar. Preferir pelo site a um ficheiro solto, e dizer sempre qual é o ficheiro.

## A seguir

- [ ] PDF → PNG de todas as páginas, devolvidas num ZIP.
- [ ] Conversão em lote: vários ficheiros com um formato de destino comum, descarregar tudo num ZIP.
- [ ] Motor de arquivos (zip/tar/7z) com descompactar e recomprimir.
- [ ] Notificações de fim sem polling: SSE em `/api/jobs/:id/events`.
- [ ] Opções por formato (qualidade do JPEG, páginas do PDF, bitrate do áudio).
- [ ] Endpoint de capacidades por motor: que operações, versões e opções existem (como o deles).

## Depois

- [ ] `libvips` como motor de imagem em paralelo com o ImageMagick, medindo quem é mais rápido.
- [ ] `unoserver` para eliminar o arranque a frio do LibreOffice.
- [ ] Poda de formatos antigos no mesmo motor (ex.: `wma` e `aiff`).
- [ ] Rate limit opcional no servidor para quem não quer pôr proxy (desligado por omissão, Regra 6).
- [ ] Jobs como cadeia de tarefas (`import` → `convert` → `export`), com import por URL e export para URL.
- [ ] Juntar ficheiros (merge) e thumbnails como operações ownas, em vez de motores à parte.
- [ ] Signed URLs para download, com prazo, em vez do UUID ser a única credencial.
