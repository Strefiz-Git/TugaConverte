---
name: seguranca
description: Usa ao mexer em uploads, downloads, nomes de ficheiros, processos externos, limpeza de ficheiros ou qualquer coisa exposta à internet.
---

# Segurança

O servidor recebe ficheiros arbitrários de desconhecidos e passa-os a binários enormes. Tratar tudo como hostil.

## Invariantes

- **Sem shell** (Regra 7): `spawn(cmd, [args])`. Sem `exec`, sem `shell: true`.
- **Nome do utilizador nunca no disco** (Regra 8): `input.<ext>` / `output.<ext>` em `jobs/<uuid>/`, extensão validada contra o catálogo.
- **ID de job = UUID v4**: não adivinhável, é a única credencial de download.
- **Cabeçalho de download**: `filename*=UTF-8''` com `encodeURIComponent`. Nunca injetar o nome cru.
- **UI**: `textContent`, nunca `innerHTML` com nomes de ficheiros.
- **Limpeza** (Regra 13): TTL, limpeza no arranque, diretório do job apagado por inteiro.
- **Stderr dos binários** é truncado e nunca mostra o caminho do utilizador (só o do job, que sai como `…`).

## Superfície conhecida

- Ficheiros maliciosos a explorar ImageMagick/ffmpeg/LibreOffice. Mitigação: contentor sem privilégios (`USER node`), sem rede, `--read-only` + `tmpfs`.
- Zip bombs e ficheiros gigantes: "sem limites" (Regra 6) deixa a decisão ao operador; documentar `MAX_UPLOAD_MB` e `JOB_TIMEOUT_SEC`.
- Abuso público: rate limit no proxy à frente (skill `deploy`).

## Checklist ao acrescentar uma rota

1. Aceita algo do utilizador? Onde é validado?
2. Escreve no disco? Só em `jobs/<uuid>/`?
3. Chama um processo? Só com array de argumentos?
4. Devolve dados de outro job? Só com o UUID exato?

## Não fazer

- Afrouxar o `policy.xml` do ImageMagick para "fazer funcionar" PDF.
- Logar nomes de ficheiros.
- Servir `data/` como estático.
