# progresso

Diário do projeto, mais recente em cima. Escrever com a skill `progresso`.

## 2026-09-30 · LibreOffice instalado: dois bugs reais do Windows

**Feito**
`src/core/bins.js` passou a resolver o caminho de cada binário, em vez de só dizer se existe. `convert.js` usa o caminho resolvido. O engine do LibreOffice passa o perfil como URL `file://` bem formado, com `pathToFileURL`. O `runner.js` passou a resolver no `exit` em vez de esperar pelo `close`.

**Verificado**
`npm test`: **32 passam, 0 falham, 0 saltam** — os 7 testes com binários reais agora correm. Conversões reais de ponta a ponta pelo browser, contra o servidor com os 5 motores: `txt → pdf` pelo LibreOffice (12,3 KB), `png → webp` pelo ImageMagick (96 B), e três ficheiros largados de uma vez, todos "pronto". O catálogo real mostra 47 formatos em 7 categorias, e a secção Dependências esconde-se — que é o ramo que no diário anterior ficou marcado como não verificado.

**Os três bugs, e porque nenhum era visível antes**
1. **O instalador do LibreOffice no Windows não põe o `soffice` no PATH.** O software estava instalado e o site dizia "LibreOffice em falta". Agora, quando o PATH não tem, procuramos em `C:\Program Files\LibreOffice\program` e, para o ImageMagick, na pasta com a versão no nome.
2. **`-env:UserInstallation=file://C:\Users\...`** — o motor montava o URL com barras invertidas e só duas barras. No Linux estava certo por acaso; no Windows o LibreOffice não o parseia e **ficava à espera de um perfil que nunca chegava: o job bloqueava para sempre**, sem timeout. Só se descobre com um binário real e um timeout de 5 minutos.
3. **O `runner` esperava pelo `close`, que só dispara quando todos os streams fecham.** O `soffice.exe` no Windows deixa um processo filho a segurar o pipe do stderr. Passou a resolver no `exit`, com 150 ms para o stderr chegar.

**Erros meus**
Ao escrever o `runner.js` deixei `ifacabou = true` sem o espaço, o que o `check` não apanha (é sintaxe válida) e o teste apanhou logo a seguir. E durante o diagnóstico passei dois scripts de teste com imports que não resolviam a partir de `TEMP`, o que me custou uma volta.

**Nota sobre o teste que bloqueou**
O `real.test.js` deixou de dar saída durante 10 minutos quando o job do LibreOffice bloqueou. O runner do `node --test` tem limite por omissão, mas o `check`/commit não bloqueou porque não chegou a correr. Um `JOB_TIMEOUT_SEC` ligado por omissão nos testes localmente evitaria a próxima hora de diagnóstico.

## 2026-09-30 · Binários reais instalados: os testes deixaram de saltar

## 2026-09-30 · Binários reais instalados: os testes deixaram de saltar

**Feito**
Instalados com winget nesta máquina: FFmpeg (Gyan.FFmpeg), Pandoc 3.12, poppler (oschwartz10612.Poppler) e ImageMagick 7.1.2. O `tests/real.test.js` deixou de ser uma lista de skips. Corrigido o teste `txt -> md`, que era uma mentira minha, e acrescentado `md -> txt`.

**Verificado**
`npm test` nesta máquina, com o PATH de máquina e de utilizador: **31 passam, 0 falham, 1 salta** (o LibreOffice, cuja instalação ainda corria). Os testes com binários reais que agora passam: png→jpg e png→webp (magic bytes), md→html (`<html`), md→txt, wav→mp3 (magic bytes ID3), pdf→png (magic bytes PNG). Comprovaram que os argumentos de cada motor são os correctos — era a maior lacuna do projecto e está fechada para estes motores.

**Não verificado**
O LibreOffice ainda não estava instalado quando isto correu, por isso `txt -> pdf` continua por provar. A imagem Docker nunca foi construída; os binários vieram do winget, não do `Dockerfile`, portanto **o Dockerfile continua por testar** — é um caminho de código completamente diferente.

**Descobertas**
`txt -> md` não existe e não pode existir com as ferramentas actuais: o Pandoc não tem formato de entrada de texto simples (`pandoc --list-input-formats` mostra `markdown`, `html`, `docx`, mas não `plain`) e o LibreOffice não escreve Markdown. A minha decisão foi NÃO inventar a conversão: o site nunca a prometeu, o `/api/formats` não a oferece, e a UI não a pode escolher. O teste passou a ser uma guarda (`registry.find('txt','md') === null`) para ninguém "consertar" isto e passar a oferecer uma conversão que não está lá. Está escrito nas limitações do README.

**Erros meus**
Escrevi `txt -> md` num teste sem confirmar que algum motor fazia isso — passei a sessão inteira a construir coisas com um teste que affirmava uma capacidade inexistente. E o `md -> txt` que escrevi para o substituir foi à procura de "três" numa fixture que diz "Teste". Os dois apanhei porque o teste correu contra o binário a sério, que é precisamente para isso que ele existe.

## 2026-09-30 · Ajuda a instalar as dependências, pelo site

## 2026-09-30 · Ajuda a instalar as dependências, pelo site

**Feito**
`src/deps.js` com os seis sistemas suportados (Debian/Ubuntu, Fedora/RHEL, Arch, Alpine, macOS, Windows) e o comando de instalação de cada um dos cinco binários. `registry.dependencias()` e `GET /api/dependencias` dizem, por motor, o que falta e como instalar. `public/deps.js` desenha a secção **Dependências** no fundo da página, com selector de sistema e botão de copiar, que só aparece quando falta alguma coisa. O `check` falha se um motor declarar um binário sem instruções, ou com algum dos seis sistemas em falta. O `check` passou também a vigiar o nome do projeto (`TugaConverte` na página, `tugaconverte` no npm e no Docker, que é a convenção dos dois).

**Verificado**
`npm run check` e `npm test` (24 passam, 7 saltados). No browser contra o servidor real desta máquina, sem binários: a secção aparece, diz "Faltam binários em 5 motores", detecta o Windows sozinho, e mostra `winget install ...` para cada um. Trocando o sistema, aparecem os comandos de apt, apk e brew certos. O botão de copiar responde "seleciona à mão" porque o browser não dá permissão de área de transferência, e o comando fica sempre à vista — que era o ponto.

**Não verificado**
O caminho de "tudo instalado" (a secção esconder-se e o aviso dizer que nada falta) não foi visto: exige os cinco binários presentes, que esta máquina não tem. O `check` garante que não há buraco nos dados, mas o render desse ramo ficou por ver.

**Decisões**
O front-end passou dos 30 KB brutos que a Regra 12 fixava quando eram 9 KB. Em vez de-facturar o CSS ou de relaxar o número às cegas, o `check` passou a medir o **comprimido**, que é o que trava o carregamento, mantendo um teto bruto mais alto só para apanhar desvios: 32,0 KB brutos, 11,5 KB comprimidos, teto de 12 KB comprimidos. O número é impresso em todas as execuções. Instalar pelo site ficou de fora, e o porquê está escrito em `ideias.md`: exigiria root no contentor, e pedir `curl | sh` a quem quer converter uma imagem não é coerente.

**Erro meu**
`dependencias()` referia `motores` em vez de `motors`, que o `check` não apanha (não corre testes) e o browser também não, porque o erro só aparece em runtime dentro da função. Foi o teste que o apanhou.

## 2026-09-30 · Catálogo de formatos por categoria

## 2026-09-30 · Catálogo de formatos por categoria

**Feito**
`src/catalogo.js` com as 7 famílias e os nomes legíveis (`docx` → Word, `jpg` → JPEG). `registry.catalogo()` devolve `{ total, categorias }` contando **só os motores ativos neste servidor**. `GET /api/catalogo`. `public/catalogo.js` desenha as contagens, filtra por categoria e deixa clicar num formato para o pôr como entrada. O `check` falha se um motor declarar um formato sem família no catálogo. O `app.js` passou as 250 linhas ao crescer, por isso a parte de rede foi para `public/api.js` e o mapa de códigos para `public/erros-ui.js`.

**Verificado**
`npm run check` (26,4 KB / 30 KB, 51 formatos declarados) e `npm test` (21 passam, 7 saltados). O guard do `check` morde: com `heic` no motor e fora do catálogo, dá "formato sem família no catálogo → imagemagick: heic". No browser, contra o servidor descartável: resumo "9 formatos em 3 categorias", filtro Imagens mostra só as 3 imagens, `aria-pressed` acompanha, e clicar em `.flac` põe FLAC como entrada com `accept=".flac"`.

**Não verificado**
A linha "Áudio" no catálogo de teste saiu sem acento: é a categoria do meu servidor descartável, não o catálogo real. O catálogo real nunca foi visto no browser porque esta máquina não tem nenhum binário e, sem motores, a secção esconde-se de propósito. As contagens reais (51 formatos, 7 categorias) só serão vistas depois de instalado.

**Erro meu**
Duas vezes nesta unidade: escrevi `Pintar` em maiúsculas no return de `mostrarCatalogo` (a UI rebentava com `Pintar is not defined`, apanhado no browser e não pelo `check`, porque `node --check` só valida sintaxe), e na primeira tentativa de provar o guard do `check` pus o formato mutado dentro do próprio catálogo, o que anulava o teste. Nenhuma das duas chegou ao commit.

## 2026-09-30 · Erros da API com `code`, e um teste que não mordia

## 2026-09-30 · Erros da API com `code`, e um teste que não mordia

**Feito**
`src/core/erros.js` com os seis códigos e o helper `falha(reply, status, code, mensagem, campos)`. Todas as rotas de erro passaram a devolver `{ error, code }` e, quando é validação, `campos`. O job guarda o `code` e `/api/jobs/:id` devolve-o. A UI mapeia três códigos para mensagens próprias e cai na mensagem do servidor para o resto. README com a tabela de erros. 3 testes novos.

**Verificado**
`npm run check` (front-end 19,7 KB) e `npm test` (18 passam, 7 saltados). O teste do `code` só passou a morder depois de corrigido: com `CONVERSION_FAILED` mutado para `..._MUTADO` dava 1 falha, como deve dar. A mutação foi reposta.

**Não verificado**
A UI com a mensagem nova para `FILE_TOO_LARGE` e `UNKNOWN_FORMAT` não foi observada no browser: para isso era preciso um servidor com `MAX_UPLOAD_MB` ligado e um par impossível, e o caminho de upload que os dispara na UI é raro. O `CONVERSION_FAILED` foi visto no browser antes desta mudança, com a mensagem do servidor.

**Decisões**
Os `code` são em inglês (`MISSING_FILE`, `UNKNOWN_FORMAT`) como os do CloudConvert e como os HTTP: são para máquinas e não devem mudar de idioma. As mensagens continuam em português. Um teste de contrato escreve o valor à mão em vez de comparar com a constante `CODIGO` — comparar com a constante provaria que a constante é igual a si mesma.

## 2026-09-30 · ffmpeg.wasm registado como não-caminho

**Feito**
Nada no código. A ideia em `ideias.md` passou a explicar porque é que o `@ffmpeg/ffmpeg` do npm não serve: é ffmpeg em WebAssembly a correr no browser (módulos de ~30 MB, `SharedArrayBuffer`, headers COOP/COEP), não um ffmpeg para Node. Três razões: já usamos o ffmpeg nativo em `src/engines/ffmpeg.js`; a memória do WASM tem tecto de 4 GB e rebenta com ficheiros grandes, o que quebra a promessa de "sem limites" (Regra 6); e custaria 30 MB por visitante contra um `spawn` de um binário já instalado, contra a Regra 12. O que resta de útil é um modo opcional de converter no navegador de quem está, que é um produto diferente.

**Decisões**
Registado como não-caminho para não voltar a ser discutido. O modo "converter no meu computador" fica como ideia com o preço escrito: perder ficheiros grandes.

## 2026-09-30 · Estudo do CloudConvert: HTML da página e documentação da API

**Feito**
Nada no código: foi estudo, e as conclusões ficaram em `ideias.md` com um caderno de promote. Duas ideias promovidas a tarefa por o utilizador as ter pedido: o catálogo de formatos por categoria e os `code` nos erros.

O que a página e os docs mostram e que muda o nosso desenho: os formatos são escolhidos **antes** do ficheiro (já implementado nesta sessão); o botão do meio é um menu de operação; os jobs são cadeias de `import` → `convert` → `export` e podem ter várias conversões e vários exports no mesmo job; existem operações muito além de converter (optimize, watermarks, thumbnails, merge, archives, metadata, **execute commands**); os erros trazem `code` para a máquina e `message` para a pessoa; há engines com versões fixáveis e um endpoint de capacidades por tipo de tarefa; há sandbox, regiões, webhooks, socket e signed URLs.

**Decisões**
Duas divergências deliberadas, registadas para não voltarmos a discuti-las: **não** fazemos import de Google Drive/Dropbox/OneDrive com OAuth, porque a promessa é sem contas; e **não** fazemos `execute-commands`, porque execução arbitrária no servidor não é conversão de ficheiros e é uma superfície de ataque que o contentor sem rede não torna aceitável.

**Verificado**
Nada foi executado: foi leitura de material externo. Nenhuma conclusão foi tratada como verdade do nosso lado sem medição.

**Não verificado**
As páginas `Operations`, `Tasks` e `Import/Export` da documentação não foram lidas. A forma exacta de cada tarefa (`operation`, `options`) está por confirmar se e quando o pipeline de jobs subir a tarefa.

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
