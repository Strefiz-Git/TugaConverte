// Falar com a API. Só isto: nada de DOM, nada de estado de ecrã.

// Como os `code` da API viram português. Têm de bater certo com
// `src/core/erros.js`: este mapa é o ponto a mexer quando um código nasce.
const POR_CODE = {
  FILE_TOO_LARGE: 'O ficheiro é maior do que este servidor aceita.',
  UNKNOWN_FORMAT: 'Este servidor não faz essa conversão.',
  CONVERSION_FAILED: 'A conversão falhou. O ficheiro pode estar corrompido.',
  MISSING_FILE: 'Não recebi ficheiro nenhum.',
  JOB_NOT_FOUND: 'Este job já não existe.',
  JOB_NOT_READY: 'O ficheiro ainda não está pronto.',
};

function explicar(err) {
  // O `code` permite uma mensagem própria; o texto do servidor é o último
  // recurso, para nunca se perder um erro que ainda não sabemos prever.
  return (err.code && POR_CODE[err.code]) || err.message;
}

// O URL de um pedido de conversão: o destino vai sempre, os ajustes só quando
// existem. Função pura de propósito — é o que os testes apertam, porque aqui uma
// linha trocada só se vê no browser, e o browser não avisa ninguém.
export function urlDeJob(destino, opcoes = '') {
  return `/api/jobs?to=${encodeURIComponent(destino)}${opcoes ? `&${opcoes}` : ''}`;
}

// XMLHttpRequest e não fetch: só o XHR dá progresso de envio.
// `opcoes` é a query que o servidor valida e limita (ver `src/core/opcoes.js`).
export function criarJob(ficheiro, destino, opcoes, aoProgitar) {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('file', ficheiro);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', urlDeJob(destino, opcoes));
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

// Espera o fim do job. A cada passagem chama `aoVer`, para a consola ir
// aparecendo enquanto a conversão corre — não só no fim.
export async function esperar(id, aoVer) {
  for (;;) {
    const job = await fetch(`/api/jobs/${encodeURIComponent(id)}`).then((r) => r.json());
    if (aoVer) aoVer(job);
    if (job.status === 'done' || job.status === 'error') return job;
    await new Promise((r) => setTimeout(r, 700));
  }
}

export function explicarErro(err) {
  return explicar(err);
}
