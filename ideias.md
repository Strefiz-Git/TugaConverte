# ideias

Hipóteses. Não implementado enquanto não houver medição (Regra 2).

## Estudo do CloudConvert (2026-09-30)

O que está no HTML da página deles e o que muda o nosso desenho:

- **Os formatos vêm antes do ficheiro.** Duas cartas (DOCX → PDF) com um botão de operação no meio, e só depois a zona de largar. A pessoa chega a saber "quero DOCX, quero PDF"; o site mostra-lhe o ficheiro. O nosso faz ao contrário — primeiro o ficheiro, depois o destino — obriga a decidir o destino já com o ficheiro carregado, e a lista de destinos muda a cada ficheiro. **Implementado**: `public/formatos.js`, com `<dialog>` nativo para o teclado e o foco de graça.
- **O botão do meio é um menu de operação** (`aria-haspopup="menu"`, desativado sem operação válida). Nós não temos operações alternativas: só converter. Passou a ser "trocar", ativo apenas quando o par inverso existe no catálogo — se não, desativado com a razão no `title`.
- **Os selectores de formato são popover com procura e virtualização** (`ComboboxVirtualizer`, `useTypeahead`, `useFilter`). Com 212 formatos a lista plana não chega; nós filtered acima.
- **O job é uma cadeia de tarefas, não uma conversão** — `POST /v2/jobs` com `tasks: { import-1, convert-1, export-1 }` e operações `import/url`, `convert`, `export/url`. É a ideia mais forte deles e a maior lacuna nossa: dava import por URL, export para o teu armazenamento, e jobs de vários passos com uma só noção de estado. Ver abaixo.
- **Import de Google Drive, Dropbox e OneDrive** com OAuth. Nós **não** fazemos isto de propósito: a promessa do TugaConverte é sem contas e sem OAuth. É uma divergência deliberada, não uma falta.
- **Opções por conversão** que mudam com a operação: codec, bitrate, resolução, qualidade. Já está no TODO como `options` opcional no `build` do motor.
- **Catálogo por categoria com contagens** (11 categorias, 212 formatos) e uma página por formato para SEO. Os dados vem do servidor; do nosso lado `/api/formats` devolve só a matriz, sem categorias nem nomes legíveis.
- **Escolher a origem do ficheiro** (nuvem ou computador) num menu ao lado do botão. Versão sem OAuth: aceitar arrastar de uma pasta de ficheiros do sistema.

## Ideias

- **Jobs como cadeia de tarefas.** `POST /api/jobs` com `tasks: [{ operation: 'import' | 'convert' | 'export', ... }]`. Ganhos: import por URL e por FTP/SFTP, export para um URL teu (webhook), e pipelines de vários passos. Custo: o estado de um job passa a ser uma lista de passos, e a UI mostra qual está a correr. Medir: converter um ficheiro e ver quanto do trabalho é o pipeline, ou se é o `convert` quase sempre a resposta certa.
- **Categorias e nomes legíveis no catálogo.** Os motores declaram `categoria: 'imagem'` e o `/api/formats` devolve `[{ ext, nome, categoria }]`. Serve para a página de catálogo e para icons sem FontAwesome. Medir: a lista com 60 extensões é legível; com 200 deixa de ser, e o filtro por categoria passa a ser preciso.
- **Motor de arquivos com descompactar e recomprimir.** Já no TODO; o CloudConvert tem 39 formatos de arquivo, é a maior categoria depois das imagens.

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
