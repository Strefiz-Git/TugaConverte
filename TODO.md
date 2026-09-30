# TODO

## Agora

- [x] Criar a estrutura completa: servidor, 5 motores, UI, testes, Docker, AGENTS.md e 15 skills.
- [x] Fazer o `check` validar linhas, peso do front-end, sequência das regras e skills registadas.
- [x] Verificar a UI no browser: aviso sem motores, formato desconhecido, conversão, download e erro.
- [x] Escolher os formatos antes do ficheiro, com botão de troca e diálogo com filtro.
- [x] Erros da API com `code` para além da mensagem (`{ error, code, campos? }`).
- [x] Catálogo de formatos por categoria, com contagens, alimentado por dados do servidor (categorias declaradas nos motores, nunca escritas à mão no `public/`).
- [x] Ajudar a instalar as dependências: página de diagnóstico que diz, por motor, que binários faltam e o comando exacto para o sistema onde o servidor corre, com botão de copiar.
- [x] Instalar os binários nesta máquina e correr `npm test` sem skips: os 5 instalados, 32 testes a passar, 0 a saltar.
- [x] Converter ficheiros reais de ponta a ponta pelo browser: txt→pdf, png→webp e vários ficheiros de uma vez.
- [ ] Construir a imagem Docker e converter um ficheiro de cada família: o `Dockerfile` ainda não foi testado, e nada do que corremos o prova. WSL não está instalado nesta máquina, e o Docker Desktop precisa dele.
- [x] PDF → todas as páginas num ZIP, em dois passos (poppler desenha, 7-Zip junta).
- [x] Consola por ficheiro: a linha de comando e o que o binário disse, a aparecer enquanto converte.
- [x] Descarregar vários resultados num ZIP, com o escritor de ZIP em Node e sem dependências.
- [x] Converter ficheiros de tipos diferentes ao mesmo tempo, cada um com o seu destino.
- [x] Barra de progresso verdadeira nos motores que sabem dizer quanto já vão (ffmpeg, ImageMagick); indeterminada nos outros.

## A seguir

- [ ] Descompactar um ZIP: extrair e converter o conteúdo, o que precisa de saída com vários ficheiros.
- [ ] Escolher o destino por ficheiro — feito; falta escolher também o *formato de entrada* por ficheiro (hoje o input é escolhido na carta e o destino por linha).
- [ ] Motor de arquivos (zip/tar/7z) com descompactar e recomprimir.
- [ ] Notificações de fim sem polling: SSE em `/api/jobs/:id/events`.
- [x] Opções por conversão: qualidade (jpg, jpeg, webp) e bitrate (mp3, m4a, aac, ogg, opus), com campo por linha na interface e `GET /api/opcoes`.
- [ ] Opções por formato que ainda não existem: páginas do PDF a extrair, resolución do vídeo.
- [ ] Endpoint de capacidades por motor: que operações, versões e opções existem (como o deles). `/api/opcoes` já cobre as opções por destino; falta o resto.

## Depois

- [ ] `libvips` como motor de imagem em paralelo com o ImageMagick, medindo quem é mais rápido.
- [ ] `unoserver` para eliminar o arranque a frio do LibreOffice.
- [ ] Poda de formatos antigos no mesmo motor (ex.: `wma` e `aiff`).
- [ ] Rate limit opcional no servidor para quem não quer pôr proxy (desligado por omissão, Regra 6).
- [ ] Jobs como cadeia de tarefas (`import` → `convert` → `export`), com import por URL e export para URL.
- [ ] Juntar ficheiros (merge) e thumbnails como operações ownas, em vez de motores à parte.
- [ ] Signed URLs para download, com prazo, em vez do UUID ser a única credencial.
