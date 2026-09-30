# progresso

Diário do projeto, mais recente em cima. Escrever com a skill `progresso`.

## 2026-09-30 · Bug: os motores apareciam ativos sem binário nenhum

**Feito**
`createRegistry` passou a ser assíncrono e a aguardar `has(bin)`. O servidor, os testes e os helpers foram atualizados. Novo teste em `tests/registry.test.js`: com `has` a devolver sempre `false`, `engines` tem de ser vazio e `formats()` devolve `{}`.

**Verificado**
Bug reproduzido antes da correção: `/api/health` devolvia `motores=libreoffice,pandoc,poppler,imagemagick,ffmpeg` e `/api/formats` uma matriz completa, nesta máquina sem nenhum binário instalado. Depois da correção, com o servidor a correr: `motores=[]` e `formats={}`. `npm run check` ok; `npm test` com 14 a passar e 7 saltados. Sintaxe de `public/app.js` validada com `node --check`.

**Não verificado**
A UI com a matriz vazia não foi aberta num browser; só se confirmou que o HTML e o JS são servidos (HTTP 200) e que o JS é sintaticamente válido.

**Decisões**
Guarda: `hasBin` é assíncrono, e um `Promise` é sempre truthy. Qualquer Motor novo que registre sem `await` volta a anunciar conversões que não existem. Se `has` voltar a ser síncrono, tem de ficar um teste que o use com `async`.

## 2026-09-30 · Esqueleto completo do TugaConverte

**Feito**
Estrutura do projeto de raiz: `src/core/` (bins, registry, queue, jobs, runner, convert), cinco motores em `src/engines/` (libreoffice, pandoc, poppler, imagemagick, ffmpeg), `src/app.js` com as rotas e `src/server.js`; `public/` com HTML, CSS e JS puros; `tests/` com registry, app e binários reais; `scripts/check.mjs` e `scripts/auto-commit.mjs`; `Dockerfile` e `docker-compose.yml`; `AGENTS.md` com 17 regras, 15 skills e 3 comandos; README, TODO e ideias.

**Verificado**
Nesta máquina: `npm run check` (linhas ≤ 250 em todos os ficheiros, front-end dentro dos 30 KB, sequência das regras, skills registadas) e `npm test` (18 testes de registry e app). A máquina é Windows e **não tem nenhum dos binários**: ffmpeg, ImageMagick, LibreOffice, Pandoc e poppler estão ausentes, por isso os 7 testes de `real.test.js` foram saltados, não passados.

**Não verificado**
- Os argumentos de cada motor nunca correram contra os binários reais. Só estão provados por leitura e por testes de resolução de pares.
- A imagem Docker nunca foi construída; os pacotes e a forma de correr não foram testados.
- A UI nunca foi aberta num browser; não há confirmação de upload, progresso nem download.
- `soffice` e `magick` no Windows têm outros nomes (`soffice.exe`, `magick.exe`); o motor do LibreOffice não foi testado aí.

**Decisões**
- Node.js em vez de Python: o trabalho pesado está nos binários, o servidor só faz streaming e filas, e o `node --test` evita dependências de teste. Em Python seria o mesmo plano com uma stdlib mais rica e menos uniformidade entre máquinas.
- PDF→imagem com poppler e não com o ImageMagick: a política do ImageMagick bloqueia PDF e afrouxá-la é abrir uma porta que não é nossa.
- `imagemagick.js` escolhe `magick` no Windows e `convert` nos outros, porque no Windows o `convert.exe` do sistema não é o ImageMagick.
- O script de commit é Node em vez de shell, para funcionar igual em Windows, macOS e Linux.
