// Falar com a API. Só isto: nada de DOM, nada de estado de ecrã.
import { POR_CODE } from './erros-ui.js';

function explicar(err) {
  // O `code` permite uma mensagem própria; o texto do servidor é o último
  // recurso, para nunca se perder um erro que ainda não sabemos prever.
  return (err.code && POR_CODE[err.code]) || err.message;
}

// XMLHttpRequest e não fetch: só o XHR dá progresso de envio.
export function criarJob(ficheiro, destino, aoProgitar) {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('file', ficheiro);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/api/jobs?to=${encodeURIComponent(destino)}`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) aoProgitar(e.loaded / e.total);
    };
    xhr.onload = () => {
      let corpo = {};
      try { corpo = JSON.parse(xhr.responseText); } catch { /* resposta não-JSON */ }
      if (xhr.status === 202) return resolve(corpo.id);
      const erro = new Error(corpo.error || `erro ${xhr.status}`);
      erro.code = corpo.code || null;
      reject(erro);
    };
    xhr.onerror = () => reject(new Error('falha de rede'));
    xhr.send(form);
  });
}

export async function esperar(id) {
  for (;;) {
    const job = await fetch(`/api/jobs/${encodeURIComponent(id)}`).then((r) => r.json());
    if (job.status === 'done' || job.status === 'error') return job;
    await new Promise((r) => setTimeout(r, 700));
  }
}

export function explicarErro(err) {
  return explicar(err);
}
