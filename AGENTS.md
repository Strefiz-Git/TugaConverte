# AGENTS.md

Regras do TugaConverte. Lê isto antes de tocar em seja o que for.

## Regras

A próxima regra é a 19.

### Regra 1 — Ler antes de escrever
No início de uma sessão, ler este ficheiro, as últimas 3 entradas de `progresso.md` e o `TODO.md`. Sem o estado anterior, Decisions repetem-se e o trabalho anterior perde-se.

### Regra 2 — Uma tarefa de cada vez
Escolhe uma tarefa do `TODO.md` e acaba-a. Trabalho lateral descoberto vai para o `TODO.md` ou `ideias.md`, nunca para o commit atual. Duas tarefas a meio é zero tarefas acabadas.

### Regra 3 — Código, testes e notas no mesmo commit
O código, os testes, a entrada de `progresso.md` e o `TODO.md` atualizado entram juntos. Um commit que muda comportamento sem explicar porquê obriga a reconstruir a história a partir do código.

### Regra 4 — Editar o AGENTS.md à mão
Alterações pequenas com a ferramenta de edição. Nunca reescrever o ficheiro inteiro, nunca por script. Um `AGENTS.md` gerado por script deixa de ser lido com atenção.

### Regra 5 — Ficheiros pequenos, uma responsabilidade
Máximo 250 linhas por ficheiro; o `npm run check` falha acima. Um módulo faz uma coisa. Dependências injetadas, para testar sem binários.

### Regra 6 — Sem limites por omissão
Tamanho de upload, número de ficheiros, tempo por job: `0` é ilimitado e é o valor por omissão. Limites só existem se o operador os ligar por variável de ambiente. É esta a diferença em relação ao CloudConvert.

### Regra 7 — Nunca shell
Os processos externos correm com `spawn(cmd, [args])`. Nunca `exec`, nunca `shell: true`. Um nome de ficheiro vindo da internet num comando de shell é execução remota de código.

### Regra 8 — O nome do utilizador nunca toca no disco
Entrada `input.<ext>`, saída `output.<ext>`, dentro de `jobs/<uuid>/`. A extensão vai validada contra o catálogo. Só o nome original volta no cabeçalho de download, codificado.

### Regra 9 — A UI descobre os formatos pela API
A lista de formatos vem de `/api/formats`. Nunca hardcode de formatos no JavaScript do browser, ou a UI passa a prometer conversões que o servidor não faz.

### Regra 10 — O motor é dados
Um motor é `{ id, bins, from, to, supports?, build }` e o `build` devolve argumentos sem correr nada. Assim os argumentos são testáveis e o `runner` é o único sítio que executa processos.

### Regra 11 — Um teste tem de morder
Depois de escrever um teste, estraga o código que ele protege, vê-o falhar e repor. Um teste que passa sempre não protege nada.

### Regra 12 — Velocidade é funcionalidade
Orçamento de 12 KB comprimidos no front-end, zero requests externos, uploads e downloads em stream, concorrência limitada aos CPUs. Antes de acrescentar uma dependência, medir.

### Regra 13 — Nada fica no disco para sempre
Cada job tem TTL (`TTL_MIN`), limpeza no arranque e o diretório apagado por inteiro quando o ficheiro expira. Isto é privacidade, não é quota.

### Regra 14 — Numeração de regras estável
Uma regra nova usa o número seguinte e nunca renumera as antigas. Revogar uma regra deixa o número no sítio, com a data e o porquê. O `check` valida a sequência.

### Regra 15 — "Verificado" é o que correu nesta sessão
Não escrever que algo funciona sem o ter corrido. Se não foi verificado, diz-se que não foi. Um relatório otimista é pior que nenhum.

### Regra 16 — Segredos e artefatos fora do git
`.env`, `data/`, `node_modules/`, zips e binários nunca são commitados. O script de commit tira do stage o que for grande ou binário.

### Regra 17 — O README é escrito para quem nunca viu o projeto
Nem decisões internas, nem histórico, nem regras de trabalho. O que é, como se corre, o que converte, como se configura, a API.

### Regra 18 — Uma unidade de trabalho acabada entra no git de imediato
Terminar o trabalho sem o commitar é o mesmo de o não ter feito: passa-se um dia, o `git checkout` apaga-o e ninguém descobre o quê. Logo que o `check` e os testes passem, corre `npm run commit -- "mensagem"`, que faz check, testes, commit e **push** num comando só. Se o push falhar, não se segue para a próxima tarefa: ou resolve-se, ou avisa-se o utilizador.

## Índice das regras

| # | Regra |
|---|---|
| 1 | Ler antes de escrever |
| 2 | Uma tarefa de cada vez |
| 3 | Código, testes e notas no mesmo commit |
| 4 | Editar o AGENTS.md à mão |
| 5 | Ficheiros pequenos, uma responsabilidade |
| 6 | Sem limites por omissão |
| 7 | Nunca shell |
| 8 | O nome do utilizador nunca toca no disco |
| 9 | A UI descobre os formatos pela API |
| 10 | O motor é dados |
| 11 | Um teste tem de morder |
| 12 | Velocidade é funcionalidade |
| 13 | Nada fica no disco para sempre |
| 14 | Numeração de regras estável |
| 15 | "Verificado" é o que correu nesta sessão |
| 16 | Segredos e artefatos fora do git |
| 17 | O README é para quem nunca viu o projeto |
| 18 | Uma unidade de trabalho acabada entra no git de imediato |

## Skills

Vêm em `.opencode/skill/<nome>/SKILL.md`.

| Skill | Para quê |
|---|---|
| `sessao-de-trabalho` | Ordem de arranque e de fecho de uma sessão |
| `agents-md` | Acrescentar, alterar ou revogar uma regra |
| `progresso` | Escrever a entrada do diário e decidir quando nasce uma regra |
| `todo` | Ler, priorizar e fechar tarefas |
| `ideias` | Guardar hipóteses e promovê-las a tarefa |
| `readme` | Manter o README verdadeiro e útil |
| `git-auto-commit-push` | Commit e push no fim de uma unidade de trabalho (Regra 18) |
| `codigo-modular` | Ficheiros pequenos, funções puras, dependências injetadas |
| `testes` | Que testes correr, e como garantir que mordem |
| `novo-conversor` | Acrescentar um formato ou um motor |
| `seguranca` | Uploads, downloads, processos e limpeza |
| `performance` | Medir e melhorar a velocidade |
| `frontend` | A UI em `public/`, leve e acessível |
| `sem-limites` | Não pôr limites sem o operador pedir |
| `deploy` | Docker, produção, proxy e variáveis |

## Comandos

| Comando | O que faz |
|---|---|
| `npm start` | Corre o servidor |
| `npm run check` | Regras do projeto (linhas, pesos, skills, motores) |
| `npm test` | Testes sem binários + testes com binários reais |
| `npm run commit -- "msg"` | check + testes + commit + **push** (Regra 18) |
| `npm run commit -- "msg" --no-push` | Igual, mas sem push |
