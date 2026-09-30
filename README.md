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

Em Debian/Ubuntu:

```bash
sudo apt install ffmpeg imagemagick pandoc poppler-utils libreoffice-writer libreoffice-calc libreoffice-impress
```

Em macOS com Homebrew:

```bash
brew install ffmpeg imagemagick pandoc poppler libreoffice
```

## Motores

| Motor | Binário | Converte |
|---|---|---|
| `libreoffice` | `soffice` | doc, docx, odt, rtf, txt, html, xls, xlsx, ods, csv, ppt, pptx, odp → pdf, docx, odt, rtf, txt, html, xlsx, ods, csv, pptx, odp |
| `pandoc` | `pandoc` | md, html, docx, odt, epub, rst, tex ↔ md, html, docx, odt, epub, rst, tex, txt |
| `poppler` | `pdftoppm` | pdf → png, jpg (primeira página) |
| `imagemagick` | `convert` / `magick` | png, jpg, jpeg, webp, gif, bmp, tiff, tif, ico, svg ↔ o mesmo conjunto |
| `ffmpeg` | `ffmpeg` | mp3, wav, ogg, flac, aac, m4a, opus, aiff, wma ↔ o mesmo conjunto; vídeo em mp4, webm, mkv, avi, mov, flv, wmv, m4v; vídeo → gif |

A lista exata do que está disponível vem sempre de `/api/formats`: a UI não inventa formatos que o servidor não tem.

Limites conhecidos: o PDF só converte a imagem na primeira página; áudio não vira vídeo; o gif animado perde a animação quando muda de formato; não há conversão de arquivos (zip, rar, 7z).

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
| `GET` | `/api/health` | Motores ativos, estado da fila e `ttlMin` |
| `POST` | `/api/jobs?to=<ext>` | `multipart/form-data` com o campo `file`. Devolve `202` e `{ id }` |
| `GET` | `/api/jobs/:id` | `{ status, size, error }`, com `status` em `pending`, `running`, `done`, `error` |
| `GET` | `/api/jobs/:id/download` | O ficheiro convertido |
| `DELETE` | `/api/jobs/:id` | Apaga o job e os seus ficheiros |

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
npm run dev       # servidor com recarregamento automático
npm run commit -- "mensagem"    # check + testes + commit + push
```

Ao acrescentar um motor ou formato, vê `.opencode/skill/novo-conversor/SKILL.md`. O resto do método de trabalho está no `AGENTS.md`.

## Aviso legal

Isto converte ficheiros que lhe são enviados. Depende de binários abertos (LibreOffice, ffmpeg, ImageMagick, Pandoc, poppler), alguns com vulnerabilidades conhecidas em ficheiros maliciosos: se expor isto à internet, corra o contentor sem privilégios, sem rede e com `read_only`, e ponha um proxy com TLS e rate limit. O operador é responsável pelo uso que fazem dele e por respeitar a licença dos ficheiros enviados.
