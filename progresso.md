# progresso

Diário do projeto, mais recente em cima. Escrever com a skill `progresso`.

## 2026-09-30 · UI verificada no browser: três defeitos apanhados

**Feito**
`public/`: aviso visível quando `/api/health` não devolve motores, aviso quando um ficheiro é rejeitado por formato desconhecido, e o job deixou de ser apagado antes do download (passou a haver botão "apagar" e limpeza 30 s depois do clique). `src/app.js`: `/api/health` devolve agora `ttlMin`, que a UI lia e recebia `undefined`. `tests/app.test.js`: 2 testes novos (TTL no health; download sobrevive a leituras repetidas) e o fluxo completo reforçado com 3 download seguidos antes do DELETE.

**Verificado**
`npm run check` (front-end 11,2 KB / 30 KB, 18 regras, 15 skills) e `npm test` (15 passam, 7 saltados). No browser, contra um servidor descartável com motor falso (fora do repositório, já removido): sem motores aparece o aviso com a solução; `.xyz` dá "Este servidor não converte ficheiros .xyz."; ficheiro sem extensão dá a mensagem própria; conversão mostra "pronto · 26 B"; o download devolve HTTP 200 com `content-disposition: attachment; filename*=UTF-8''minha%20foto.jpg`; o botão "apagar" leva o download a 404, como esperado; uma conversão que falha mostra a mensagem do binário em vermelho (`state err`) e nenhum link. Enter na zona de largar abre o seletor. Os testes de TTL mordem: com `ttlMin: 999` o teste falha.

**Não verificado**
- Não há binários reais nesta máquina, por isso nenhum motor foi exercitado de facto. A conversão "a sério" continua por provar.
- A travessia com Tab não pôde ser observada: a automação do browser não avança o foco além de `body`. O foco visível depende de `:focus-visible` do browser, que não devolve `true` quando o foco vem de script.
- A imagem Docker continua por construir.

**Decisões**
Nenhuma regra nova. Os três defeitos eram todos da mesma família — a UI calava-se onde devia explicar-se — e ficaram resolvidos com testes no servidor, não com testes de browser, porque o `node --test` não corre DOM.

## 2026-09-30 · Regra 18: commit e push no fim de cada unidade de trabalho

**Feito**
Nova Regra 18 no `AGENTS.md`: uma unidade de trabalho acabada entra no git de imediato, com `npm run commit -- "mensagem"` a fazer check, testes, commit e push num só comando, e sem passar à tarefa seguinte se o push falhar. Índice das regras, "A próxima regra é a 19" e tabela de comandos atualizados.

**Verificado**
`npm run check` com 18 regras e 15 skills. O check falharia se a numeração estivesse errada.

**Não verificado**
A Regra 18 foi escrita no commit anterior, por isso só a partir deste commit é que passa a valer.

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
