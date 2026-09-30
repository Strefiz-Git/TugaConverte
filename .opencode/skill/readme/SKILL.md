---
name: readme
description: Usa quando o README.md ficou desatualizado (motor novo, variável nova, endpoint novo) ou for preciso reescrever partes dele.
---

# README.md

Escrito para quem **nunca viu** o projeto (Regra 17).

## Tem de ter, por esta ordem

1. Uma frase do que é e do que o distingue (sem limites).
2. Como correr (Docker primeiro, depois local).
3. Tabela de motores e o que cada um converte.
4. Configuração (tabela igual ao `.env.example`).
5. API.
6. Porquê Node.js.
7. Desenvolvimento e aviso legal/abuso.

## Sincronizar quando muda

| Mudou | Atualizar |
|---|---|
| `src/engines/*` | tabela de motores |
| `src/config.js` / `.env.example` | tabela de configuração |
| rotas em `src/app.js` | secção API |
| scripts do `package.json` | secção Desenvolvimento |

## Não pôr aqui

Decisões internas, histórico, regras de trabalho. Isso vive no `AGENTS.md` e no `progresso.md`.

## Verdade

Não prometer formatos que o catálogo não tem. Se algo não foi testado com binário real, o README não o apresenta como garantido.
