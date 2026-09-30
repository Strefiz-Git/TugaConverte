# progresso

Diário do projeto, mais recente em cima. Escrever com a skill `progresso`.

## 2026-10-01 · Verificar tudo, e dois bugs que só o browser apanhou

**O que fiz**
Passei o site inteiro a sério, não por partes: cada motor pelo browser, cada download aberto e confrontado com a assinatura do ficheiro, o ZIP de lote aberto pelo 7-Zip de verdade, o diálogo de formatos pelo teclado, os controlos todos com nome. E converti 13 pares de uma vez para ver o que saía.

**Dois bugs meus, ambos reais, ambos invisíveis aos testes**

1. **Toda a conversão sem opções estava a ser recusada.** Escrevi a query do `POST` como `[opcoes && \`to=...\`, opcoes]`: quando não havia opções — que é o caso de quase tudo — o `to` desaparecia e o servidor respondia "não faço essa conversão". Passou-me porque só testei com um destino que *tem* opções (jpg). O `check` estava certo, os 62 testes passavam. Apanhou o clique no browser.
2. **O download de tudo o que é LibreOffice rebentava.** O LibreOffice não escreve `output.pdf`: deriva o nome do input e escreve `input.pdf`. O download e o ZIP de lote tinham `output.<ext>` escrito à mão, e rebentavam com ENOENT. A interface dizia "pronto · 11,1 KB" e o ficheiro não baixava. **Toda a família do escritório** (doc, docx, odt, rtf, txt, html, xls, xlsx, ods, csv, ppt, pptx, odp) estava assim desde o início, e eu tinha dito que estava verificado porque o job chegava a `done`. Não estava.

**Como ficou**
O job guarda o nome que o motor deixou (`job.produced`), e o download e o ZIP vão buscá-lo. `tests/produzido.test.js` cobre os dois caminhos com um motor que escreve `input.pdf`, como o LibreOffice. Para o URL, `urlDeJob` saiu de dentro do `criarJob` para uma função pura, com três testes.

**A regra que saiu disto**
"Verificado" (Regra 15) tinha ficado a significar "o job chegou a `done`". Não chega: um job pode ficar pronto e o ficheiro não existe. A verificação de um fluxo de conversão tem de acabar com os **bytes do ficheiro final**, abertos e conferidos. Da próxima vez que um fluxo conte como verificado, é assim que se escreve no diário.

**Verificado agora, com os bytes**
- 13 conversões de 6 motores, todas com ficheiro final não vazio e a assinatura certa: `%PDF`, `PK`, `ffd8ffe0`, `RIFF`, `BM`, `II*`, `ID3`, `GIF8`, `1a45dfa3` (matroska/webm), `<!DO`.
- O bitrate muda mesmo o ficheiro: wav para mp3 a 64 kbps dá 48 KB, a 320 kbps dá 242 KB. E `bitrate=9999` dá exactamente o mesmo que 320, `bitrate=abc` dá o mesmo que o omisso.
- O ZIP de lote com 12 resultados abre no 7-Zip: 12 ficheiros, 415 KB comprimidos.
- No browser: png→jpg com qualidade 10 dá 1,3 KB e com 95 dá 14,5 KB; txt→pdf baixa 12 KB com assinatura `%PDF` e o nome `notas.pdf` no header.
- Diálogo de formato: abre, o foco vai para o filtro, `docx` dá um resultado, escolher fecha. Escolher `MD` e largar um `.md` não dá aviso; escolher `DOCX` e largar um `.png` dá aviso a dizer que ficou com outro destino.

**Duas coisas pequenas**
Dois controlos estavam sem nome acessível (o `input` de ficheiros e o campo de filtro do diálogo). Levaram `aria-label`.
O orçamento do front-end estava a 15 bytes do tecto. Em vez de o subir outra vez, encurtei comentários nos ficheiros do browser: cada byte de comentário é um byte que o browser recebe, e o `check` mede ficheiro a ficheiro como o servidor serve.

**Não verificado**
O Docker continua por construir: WSL não está instalado nesta máquina. E `mp4` sem faixa de áudio para `mp3` dá erro, que é o que deve dar — mas o texto é o do ffmpeg, em inglês e com muita informacão, em vez de "este vídeo não tem áudio". Fica anotado.

## 2026-10-01 · Opções por conversão

**Feito**
`src/core/opcoes.js` declara o que cada destino aceita: qualidade (jpg, jpeg, webp, 1-100, omisso 92) e bitrate de áudio (mp3, m4a, aac, ogg, opus, 32-320 kbps, omisso 128). A query do `POST /api/jobs` passa os valores; `GET /api/opcoes` publica o catálogo; `public/opcoes.js` mostra um campo por linha, só quando o destino escolhido tem algo ajustável. O ImageMagick recebe `-quality`, o ffmpeg `-b:a`. Um valor fora do intervalo é limitado, não recusado: `qualidade=500` dá 100. E um destino sem opções não ganha nenhuma.

**Verificado**
`npm test`: **57 passam, 0 falham** (8 novos). Um teste com o binário a sério converte a mesma imagem com qualidade 10 e 95 e prova que a primeira é menor. No browser, com um gradiente desenhado no próprio browser: **qualidade 10 dá 1.3 KB e qualidade 95 dá 14.5 KB**, e a consola mostra `magick ... -quality 10 ...`. O campo desaparece quando o destino passa a png e volta quando volta a jpg.

**Erro meu, e o buraco que ele mostrou**
Escrevi `from'/linha.js'` sem espaço depois do `from`. O Node diz que isso é sintaxe válida e o `check` passava; o browser é que falhava, com um erro que não punha a culpa no sítio certo — a página ficava sem uma única linha na lista e ninguém percebia porquê. Acrescentei ao `check` a conferência de `import { x }` contra os `export` do ficheiro alvo, e **estraguei o import à mão para ver se mordia**: o `check` apanhou. Uma falha que só aparece no browser, com mensagem errada, é o pior tipo de falha que há; a defesa é o `check` a cobrir o que só o browser apanha.

**Não verificado**
Não medi a diferença de qualidade visual entre 10 e 95 — o que provei é que o tamanho muda e o comando leva o valor. Codec e resolução ficaram de fora de propósito: o codec depende do que o binário tem compilado, que muda de máquina para máquina, e oferecer uma lista seria prometer o que não se pode garantir.

## 2026-09-30 · Barra de progresso a sério

**Feito**
`src/core/progresso.js` com leitores de percentagem. O ffmpeg dá `out_time_us` no stdout e a `Duration` no stderr; o ImageMagick dá `N% complete` no stderr com `-monitor`. O `runner` passou a canalizar o stdout (o ffmpeg escreve aí) e a reportar a percentagem; o job guarda-a e `/api/jobs/:id` devolve-a. A UI usa-a: barra verdadeira quando existe, **indeterminada quando não** — os motores que não sabem (LibreOffice, Pandoc, poppler) deixam a percentagem a `null` e a barra a rodar sem número, em vez de inventar. O ffmpeg ganhou `-progress pipe:1 -nostats` e `-loglevel info` (precisa da linha `Duration`).

**Verificado**
`npm test`: **49 passam, 0 falham, 0 saltam** (7 novos de progresso). O parser tem testes para a duração com horas, o tecto de 100, a ausência de duração (não inventa) e os motores que não declaram progresso. O teste de integração confirma que a percentagem do job vem do leitor. Com o binário real, convertendo um vídeo, a percentagem corre: **36% → 100% → done**. Um GIF de 3,5 MB para mp4 deu 99% e terminou.

**Não verificado**
A percentagem do ImageMagick não foi vista com o binário real a correr (o parser tem testes, mas o `-monitor` numa imagem grande não chegou a ser visto no browser). E o número de actualizações por conversão depende de quão rápido o binário é: num ficheiro pequeno o ffmpeg entrega o progresso de uma vez. A barra acerta, mas pode dar só um salto.

**Descoberta**
Escrevi `if (registar)` (sem o `r` final) na condição do destructuring `registrar`, e o Node só o deu como erro em runtime, dentro de um callback de stream. O `check` não apanha (é sintaxe válida), o `node --check` não apanha, e o grep lia o código certo — só a execução o mostrou. Foi o teste real que o apanhou, outra vez. **Erros de nome dentro de callbacks só aparecem quando o callback corre** — a lição é que uma referência a uma variável que não existe tem de ser testada com o caminho que a executa, não lida.

## 2026-09-30 · Destino por ficheiro: converter tipos diferentes ao mesmo tempo

## 2026-09-30 · Destino por ficheiro: converter tipos diferentes ao mesmo tempo

**Feito**
Cada linha da lista tem o seu próprio `<select>` de destino, com as opções que o servidor aceita para a extensão daquele ficheiro. Largar ficheiros deixa de estar preso ao par escolhido nas cartas: qualquer formato conhecido entra, e o par passa a ser só sugestão para as linhas em que o utilizador ainda não mexeu. Largar já não arranca conversões por si; o botão "converter" arranca cada ficheiro com o destino da sua linha, e o texto do botão diz "converter 3 ficheiros". A aceitação do ficheiro foi simplificada: só recusa o que o servidor não conhece de todo. `linha.js` ganhou o `selectDestino` por causa disto.

**Verificado**
`npm run check` (36,9 KB brutos, 13,2 KB comprimidos, dentro do tecto de 14) e `npm test` (41 passam, 0 falham, 0 saltam). No browser, com três ficheiros de tipos diferentes na mesma lista (`.png`, `.mp3`, `.svg`) e um `.xyz` rejeitado: cada linha mostrou só os destinos válidos para si, o botão contou os três, e depois de escolher `webp`/`wav`/`png` converteram os três. O `.svg → png` deu 315 B pelo ImageMagick, o `.png → webp` 96 B, e o `.mp3` — cujo teste era lixo — mostrou o erro real do ffmpeg, que é a consola a fazer exactamente o que se pede. O ZIP de lote juntou os dois que deram certo.

**Descoberta**
O `ffmpeg` mensagem de erro do ficheiro de teste ficou exposta tal e qual no estado, com o caminho do job limpo e o nome do ficheiro do utilizador intacto — o que é exactamente a promessa: a pessoa vê o que o servidor fez e porquê falhou, sem a identificar. Foi a primeira vez que um binário real falha à frente de uma pessoa, e o resultado é o que se queria.

## 2026-09-30 · ZIP de vários resultados, escrito à mão

## 2026-09-30 · ZIP de vários resultados, escrito à mão

**Feito**
`src/core/zip.js`: escritor de ZIP mínimo, só deflate, sem dependências. `GET /api/jobs/zip?ids=...` junta vários resultados num ficheiro, com os nomes de cada ficheiro. A UI mostra "descarregar os N resultados num ZIP" a partir de dois resultados prontos, e o link some quando um deles é apagado. A consola e as ligações de cada linha foram para `public/linha.js`, e os testes do ZIP para `tests/zip.test.js`.

**Verificado**
`npm test`: **41 passam, 0 falham, 0 saltam**. O teste de integração deixa o 7-Zip real ler e extrair o ZIP que escrevemos à mão, e compara os bytes. No browser: três PNG convertidos, link de ZIP, 596 bytes, e esse ZIP pasado ao 7-Zip dá "3 files" sem erros, com `primeira.webp`, `segunda.webp` e `terceira.webp`. O `nomeSeguro` tem testes para `..`, barras, controlos, nome vazio e nome de 300 caracteres.

**Dois bugs meus no ZIP, os dois apanhados pelo 7-Zip**
1. Eu empilhava os cabeçalhos e os dados em duas listas e nunca juntava os dados comprimidos: o ficheiro saía com o tamanho comprimido a zero. O sintoma era enganador — os nomes apareciam na listagem, o que fazia o ZIP parecer correcto, e só a extracção falhava.
2. Passava o `Buffer` comprimido a uma função que esperava o comprimento, e escrevia `0` no cabeçalho. Pior: a primeira tentativa de corrigir foi **medir o gzip de todos os ficheiros juntos**, o que dava um número mais simpático e estava errado, porque o servidor serve cada ficheiro como uma resposta separada.

**Sobre o orçamento, e uma lição**
Dividir o `app.js` em quatro módulos para cumprir o tecto de 250 linhas fez o total comprimido **subir** de 12,3 para 12,9 KB: cada módulo é uma resposta HTTP com o seu cabeçalho e o seu dicionário gzip. Voltei a juntar, e o tecto subiu de 12 para 13 KB — que é o custo honesto de escolher formatos, catálogo, dependências, consola e ZIP de lote, e continua a ser uma fracção dos 200 KB de JavaScript que o CloudConvert serve. A lição ficou na skill `performance`: primeiro junta, depois divide, e mede.

## 2026-09-30 · Consola: ver o comando que correu

## 2026-09-30 · Consola: ver o comando que correu

**Feito**
O `runner` passa a receber um `registar` e escreve nele a linha de comando e o que o binário disse. O job guarda o log, `/api/jobs/:id` devolve-o, e cada linha da lista tem um painel "ver o que o servidor correu" que se actualiza com o polling que já existia. Nada de SSE: para a primeira versão o polling chega, e o SSE continua no TODO para quando o ganho importar. `erros-ui.js` fundiu-se em `api.js` (400 bytes e um pedido HTTP a menos). As rotas de leitura e a fila foram para `tests/rotas.test.js`, porque `app.test.js` tinha 296 linhas.

**Verificado**
`npm test`: **35 passam, 0 falham, 0 saltam**. A guarda de segurança morde: sem a limpeza do caminho do job, o teste que manda um binário despejar o caminho falha. No browser, um PDF de duas páginas para ZIP mostra:
`$ pdftoppm -png -r 150 …\input.pdf …\pagina` e depois o aviso do poppler e o comando do 7-Zip. O ficheiro chamava-se `meu-secreto.pdf` e o nome não aparece nem no log nem no erro.

**A segurança disto é real, e é verificável**
Mostrar a linha de comando não é mostrar o ficheiro: em disco o input é `input.<ext>` e o output `output.<ext>` (Regra 8), por isso o comando só tem o caminho do job, que sai limpo como `…`. Isto é a prova visível de que o servidor não está a fazer nada por trás — que é a mesma promessa que o CloudConvert faz sobre dados, mostrada em vez de afirmada.

**Sobre o orçamento**
A consola levou o front-end dos 11,5 para os 12,1 KB comprimidos, acima do tecto de 12. A primeira tentação foi medir tudo junto num gzip só, o que dava um número mais simpático — e estava errado, porque o servidor serve cada ficheiro como uma resposta separada, com o seu próprio dicionário. Revertido. O que resolveu foi fundir o `erros-ui.js` no `api.js` e dizer cada regra CSS uma vez: 11,9 KB, dentro do tecto, sem mexer no número. Ordem de COMMITS: a regra não se mexeu para a regra me deixar passar.

## 2026-09-30 · PDF → todas as páginas num ZIP, e o contrato de vários passos

## 2026-09-30 · PDF → todas as páginas num ZIP, e o contrato de vários passos

**Feito**
`convert.js` passou a aceitar um plano com vários passos (`steps`), que correm por ordem. Novo motor `pdfzip` (`pdftoppm` + `7z`): o poppler desenha todas as páginas e o 7-Zip junta-as num ZIP, com o glob do próprio 7-Zip para não precisar de shell. `poppler` ficou só com a primeira página, e é um motor à parte para que o PDF→PNG não exija o 7-Zip. Novo formato `zip` na categoria "Arquivos", instruções de instalação do `7z` nos seis sistemas, e `p7zip-full` no `Dockerfile`. O `7z` entrou nos caminhos de recurso do Windows.

**Verificado**
`npm test`: **33 passam, 0 falham, 0 saltam**. O teste novo cria um PDF de duas páginas e prova que o ZIP traz `pagina-1.png` e `pagina-2.png`, com a assinatura `PK\x03\x04` e o ficheiro no disco. Também verifiquei por fora os nove pacotes do `Dockerfile` contra o índice do Debian bookworm pela API madison — todos existem, e um pacote inventado devolve lista vazia, o que prova que a verificação serve para alguma coisa.

**O que esta unidade desbloqueia**
Um job deixou de estar preso a um binário. O caminho para descompactar um ZIP e converter o conteúdo é o mesmo que o `steps` abriu, com a diferença de que a saída passa a ser vários ficheiros.

**Sobre o Docker**
Não é possível aqui: o WSL não está instalado nesta máquina e o Docker Desktop precisa dele, com reinício. Não tentei à força. O que fiz em vez de construir a imagem foi verificar a parte que mais falha — os nomes dos pacotes — contra a fonte do Debian, e juntar o `p7zip-full` que o motor novo precisa. A imagem continua por construir, e isso está escrito no `TODO.md` com a razão.

**Descoberta**
O `7z` já estava instalado nesta máquina e o `Get-Command` dizia que não estava: `C:\Program Files\7-Zip\7z.exe` sem estar no PATH, exactamente o caso do LibreOffice. Terceiro instalador com o mesmo defeito, o que confirma que o caminho de recurso em `bins.js` não é um remendo para o LibreOffice mas um caso geral do Windows.

## 2026-09-30 · LibreOffice instalado: dois bugs reais do Windows

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
