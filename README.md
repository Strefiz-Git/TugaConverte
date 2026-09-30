# TugaConverte

Conversor de ficheiros **sem limites**. Inspirado no CloudConvert, ao contrário dele: sem quotas, sem limite de tamanho, sem contas, sem analytics.

Se tens um ficheiro e precisas dele noutro formato, mandas e recebes. Só isso.

## Como correr

### Docker (recomendado)

Traz os cinco motores já instalados.

```bash
docker compose up --build -d
```

Abre <http://localhost:3000>. Confirmar que os binários estão na imagem:

```bash
curl localhost:3000/api/health
```

### Local

Precisas de Node.js 20.6+ e dos binários dos motores que quiseres usar. Um motor só fica ativo se os seus binários existirem no `PATH` — os que faltam simplesmente não aparecem.

```bash
npm install
npm start
```

**Não encontrares os binários?** O próprio site diz quais faltam e dá o comando de instalação para o teu sistema: abre <http://localhost:3000> e olha para a secção **Dependências**, no fundo da página. O mesmo está em `/api/dependencias`.

| Sistema | Comando |
|---|---|
| Debian / Ubuntu | `sudo apt install ffmpeg imagemagick pandoc poppler-utils p7zip-full libreoffice-writer libreoffice-calc libreoffice-impress` |
| Fedora / RHEL | `sudo dnf install ffmpeg ImageMagick pandoc poppler-utils p7zip-full libreoffice-writer libreoffice-calc libreoffice-impress` |
| Arch / Manjaro | `sudo pacman -S ffmpeg imagemagick pandoc poppler p7zip libreoffice-fresh` |
| Alpine | `sudo apk add ffmpeg imagemagick pandoc poppler-utils p7zip libreoffice` |
| macOS | `brew install ffmpeg imagemagick pandoc poppler p7zip && brew install --cask libreoffice` |
| Windows | `winget install Gyan.FFmpeg ImageMagick.ImageMagick JohnMacFarlane.Pandoc oschwartz10612.Poppler 7zip.7zip TheDocumentFoundation.LibreOffice` |

Depois de instalar, reinicia o servidor: os binários são procurados uma vez, no arranque.

## Motores

| Motor | Binário | Converte |
|---|---|---|
| `libreoffice` | `soffice` | doc, docx, odt, rtf, txt, html, xls, xlsx, ods, csv, ppt, pptx, odp → pdf, docx, odt, rtf, txt, html, xlsx, ods, csv, pptx, odp |
| `pandoc` | `pandoc` | md, html, docx, odt, epub, rst, tex ↔ md, html, docx, odt, epub, rst, tex, txt |
| `poppler` | `pdftoppm` | pdf → png, jpg (primeira página) |
| `pdfzip` | `pdftoppm` + `7z` | pdf → zip, com **todas** as páginas |
| `imagemagick` | `convert` / `magick` | png, jpg, jpeg, webp, gif, bmp, tiff, tif, ico, svg ↔ o mesmo conjunto |
| `ffmpeg` | `ffmpeg` | mp3, wav, ogg, flac, aac, m4a, opus, aiff, wma ↔ o mesmo conjunto; vídeo em mp4, webm, mkv, avi, mov, flv, wmv, m4v; vídeo → gif |

A lista exata do que está disponível vem sempre de `/api/formats`: a UI não inventa formatos que o servidor não tem.

Limites conhecidos: o PDF para imagem/png dá só a primeira página (use `pdf → zip` para todas); áudio não vira vídeo; o gif animado perde a animação quando muda de formato; **txt → md não existe** (o Pandoc não lê texto simples e o LibreOffice não escreve Markdown); ainda não há descompactar nem recomprimir arquivos.

## Configuração

Todas as variáveis são opcionais. `0` significa **ilimitado**.

| Variável | Omissão | O que faz |
|---|---|---|
| `PORT` | `3000` | Porto do servidor |
| `HOST` | `0.0.0.0` | Interface |
| `DATA_DIR` | `data` | Onde ficam os ficheiros temporários |
| `CONCURRENCY` | CPUs − 1 | Conversões em paralelo |
| `MAX_UPLOAD_MB` | `0` (sem limite) | Tamanho máximo por ficheiro |
| `JOB_TIMEOUT_SEC` | `0` (sem timeout) | Tempo máximo por conversão |
| `TTL_MIN` | `120` | Minutos até um ficheiro ser apagado |

Copiar `.env.example` para `.env` não é preciso: o servidor funciona sem nenhuma delas. O TTL não é uma quota, é para os ficheiros não ficarem no disco.

## API

| Método | Rota | O que faz |
|---|---|---|
| `GET` | `/api/formats` | Matriz `{ origem: [destinos] }` |
| `GET` | `/api/catalogo` | Formatos por família, com contagens, só dos motores ativos |
| `GET` | `/api/dependencias` | Por motor: o que falta e o comando de instalação de cada sistema |
| `GET` | `/api/health` | Motores ativos, estado da fila e `ttlMin` |
| `POST` | `/api/jobs?to=<ext>` | `multipart/form-data` com o campo `file`. Devolve `202` e `{ id }` |
| `GET` | `/api/jobs/:id` | `{ status, size, error }`, com `status` em `pending`, `running`, `done`, `error` |
| `GET` | `/api/jobs/:id/download` | O ficheiro convertido |
| `DELETE` | `/api/jobs/:id` | Apaga o job e os seus ficheiros |

### Erros

Toda a resposta de erro traz `error` (mensagem em português, para mostrar) e `code` (estável, para programar). Erros de validação trazem também `campos` com o campo culpado.

| HTTP | `code` | Quando |
|---|---|---|
| 400 | `MISSING_FILE` | O pedido não tinha ficheiro |
| 400 | `UNKNOWN_FORMAT` | Não há motor para esse par, ou a extensão não é válida |
| 404 | `JOB_NOT_FOUND` | Job inexistente |
| 404 | `JOB_NOT_READY` | O job ainda não terminou (ou já foi apagado) |
| 413 | `FILE_TOO_LARGE` | Acima de `MAX_UPLOAD_MB`, se o operador o ligou |
| — | `CONVERSION_FAILED` | O job terminou em erro; a causa está em `error` |

```bash
ID=$(curl -s -F file=@foto.png "http://localhost:3000/api/jobs?to=jpg" | sed 's/.*"id":"\([^"]*\)".*/\1/')
curl -s "http://localhost:3000/api/jobs/$ID"          # {"status":"done",...}
curl -s -o foto.jpg "http://localhost:3000/api/jobs/$ID/download"
```

O `id` é um UUID: quem o tem é quem pode descarregar. Os ficheiros são apagados `TTL_MIN` minutos depois. A UI mostra um botão "apagar" por linha, que apaga o ficheiro de imediato.

## Porquê Node.js

O trabalho pesado está nos binários (ffmpeg, LibreOffice, ImageMagick), não no servidor. O servidor é uma fila pequena em torno deles. Node resolve isso com o mínimo de código:

- **Streaming de_upload e download** sem carregar o ficheiro em memória (`pipeline` + `createReadStream`).
- **`spawn` com array de argumentos**, sem shell — é a forma mais direta de não executar código remoto por um nome de ficheiro.
- **`node --test`**, sem framework de testes, e módulos ES nativos.
- **Mesma mentalidade nos três sistemas**: `scripts/auto-commit.mjs` corre igual no Windows, macOS e Linux, ao contrário de um script de shell.

Python seria uma boa escolha também, mas exigiria um servidor ASGI e dependências de teste para o mesmo resultado. Node chega aqui com menos peças.

## Desenvolvimento

```bash
npm run check     # regras do projeto: tamanho dos ficheiros, pesos, skills, motores
npm test          # testes sem binários + testes com binários reais (saltam se faltarem)

# Se um binário travar o teste, com um limite de tempo:
JOB_TIMEOUT_SEC=60 npm test
npm run dev       # servidor com recarregamento automático
npm run commit -- "mensagem"    # check + testes + commit + push
```

Ao acrescentar um motor ou formato, vê `.opencode/skill/novo-conversor/SKILL.md`. O resto do método de trabalho está no `AGENTS.md`.

## Aviso legal

Isto converte ficheiros que lhe são enviados. Depende de binários abertos (LibreOffice, ffmpeg, ImageMagick, Pandoc, poppler), alguns com vulnerabilidades conhecidas em ficheiros maliciosos: se expor isto à internet, corra o contentor sem privilégios, sem rede e com `read_only`, e ponha um proxy com TLS e rate limit. O operador é responsável pelo uso que fazem dele e por respeitar a licença dos ficheiros enviados.
