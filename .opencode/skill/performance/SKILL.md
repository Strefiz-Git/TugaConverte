---
name: performance
description: Usa para medir ou melhorar a velocidade do site (carregamento, uploads, conversões, memória) ou antes de acrescentar uma dependência.
---

# Performance

Velocidade é funcionalidade (Regra 12). **Medir antes de mexer.**

## Orçamento

- Front-end total (HTML + CSS + JS): **≤ 30 KB**. O `npm run check` falha acima.
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
