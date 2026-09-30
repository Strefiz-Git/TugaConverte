---
name: performance
description: Usa para medir ou melhorar a velocidade do site (carregamento, uploads, conversões, memória) ou antes de acrescentar uma dependência.
---

# Performance

Velocidade é funcionalidade (Regra 12). **Medir antes de mexer.**

## Orçamento

- Front-end: **≤ 14 KB comprimidos** (o que trava o carregamento) e ≤ 40 KB brutos (para apanhar desvios). O `npm run check` imprime os dois números em cada execução.
- **Menos ficheiros, maiores.** Cada módulo é uma resposta HTTP com o seu cabeçalho e o seu dicionário gzip. Dividir `app.js` em quatro para cumprir o tecto de linhas fez o total *subir*. Primeiro junta, depois divide — e mede.
- O orçamento mede o comprimido, não o ficheiro. Um CSS de 8 KB que comprime para 1 KB não custa nada ao utilizador.
- Zero requests externos (sem CDN, sem fontes web, sem analytics).
- Uma dependência de runtime nova só com medição a justificar.

## Servidor

- Uploads: `pipeline(file.file, createWriteStream)`, nunca `toBuffer()`.
- Downloads: `createReadStream` com `content-length`.
- Estáticos: `@fastify/compress` e `maxAge`. `/api/formats` com cache curto.
- `requestTimeout: 0` para não cortar uploads grandes.
- Concorrência = CPUs − 1 por omissão; conversões são CPU-bound, mais paralelismo só piora.

## Onde está o tempo

Quase todo dentro dos binários. Ordem de ganhos prováveis:

1. Escolher o motor certo (libvips em vez de ImageMagick, ver `ideias.md`).
2. Evitar arranque a frio: o LibreOffice demora segundos a abrir → considerar processo persistente (`unoserver`).
3. Passar cópias em vez de recodificar quando o codec já serve (`ffmpeg -c copy`).
4. Só depois, micro-otimizar o Node.

## Como medir

```bash
npx autocannon -c 50 -d 10 http://localhost:3000/api/formats   # camada web
time curl -F file=@teste.docx "http://localhost:3000/api/jobs?to=pdf"   # ponta a ponta
```

Registar o número no `progresso.md`, com a máquina. Nada de "ficou mais rápido" sem número (Regra 15).
