---
name: deploy
description: Usa para construir a imagem Docker, correr em produção, configurar variáveis, proxy reverso ou volumes.
---

# Deploy

## Construir e correr

```bash
docker compose up --build -d
docker compose logs -f
curl localhost:3000/api/health      # motores ativos + fila
```

`/api/health` deve listar os 5 motores (libreoffice, pandoc, poppler, imagemagick, ffmpeg). Se faltar algum, o binário não está na imagem.

## Antes de dizer que funciona (Regra 15)

Converter, na imagem construída, **um ficheiro de cada família**: docx→pdf, png→jpg, mp3→wav, md→epub, pdf→png. A imagem ainda não foi construída nesta máquina (ver `TODO.md`).

## Produção

- Proxy reverso (Caddy/nginx) com TLS **e** rate limit por IP. Sem isto, "sem limites" é um convite ao abuso.
- Proxy sem limite de corpo (`client_max_body_size 0` no nginx) e com `proxy_request_buffering off` para fazer stream.
- Volume em `/data`, de preferência em disco rápido. É só temporário.
- Contentor sem privilégios (já usa `USER node`); o compose já traz `read_only: true` + `tmpfs`.
- Memória/CPU: definir limites do contentor e `CONCURRENCY` ≤ CPUs disponíveis.

## Variáveis

Ver README e `.env.example`. Nunca commitar `.env` (Regra 16).

## Privacidade (Regra 13)

Sem analytics. Logs de acesso do proxy sem query string com nomes. `TTL_MIN` curto.
