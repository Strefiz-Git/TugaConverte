---
name: sem-limites
description: Usa sempre que estiveres tentado a pôr um limite (tamanho, quantidade, tempo, quota) ou quando o utilizador pedir para limitar. Garante que "sem limites" continua verdade por omissão.
---

# Sem limites

A razão de existir do projeto: ao contrário do CloudConvert, não há quotas nem tamanho máximo.

## Regra (Regra 6)

- Tamanho de upload, nº de ficheiros, tempo por job, conversões por dia: `0` = ilimitado, **por omissão**.
- Limites só existem se o operador os ligar por variável de ambiente (`MAX_UPLOAD_MB`, `JOB_TIMEOUT_SEC`).
- Nenhum limite "temporário" no código.

## O que "sem limites" NÃO quer dizer

- Sem limpeza: os ficheiros continuam a expirar (`TTL_MIN`). É privacidade, não quota.
- Sem fila: a concorrência é limitada aos CPUs, senão o servidor morre. Os pedidos esperam, não são recusados.
- Sem proteção contra abuso: quem expõe à internet deve pôr rate limit no proxy (ver README).

## Se precisares de proteger o servidor

1. Preferir **esperar** (fila) a **recusar**.
2. Se tiver mesmo de recusar, tem de vir de uma variável de ambiente, desligada por omissão, e ser documentada no README e no `.env.example`.

## Alterações que exigem cuidado

Qualquer `limits`, `maxSize`, `timeout` ou `setTimeout(kill)` novo. Perguntar: o valor por omissão é 0?
