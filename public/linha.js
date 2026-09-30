// O que aparece no fim de cada ficheiro: link de download, botão de apagar e
// a consola com o comando que o servidor correu. E, quando há dois ou mais
// resultados, o link para os levar todos num ZIP.
//
// Tudo isto vive junto porque partilha a mesma regra: o job só pode ser
// apagado depois de descarregado, e é essa acção que alimenta o ZIP de lote.

export function setEstado(ficheiro, texto, classe = '') {
  const { estado } = ficheiro._ui;
  estado.textContent = texto;
  estado.className = `estado ${classe}`;
}

// Um `<progress>` sem `value` fica indeterminada: é o que se quer quando o
// binário não diz quanto já vai. Com percentagem, é uma barra a sério.
export function pintarBarra(ficheiro, percentagem, indeterminada = false) {
  const { barra } = ficheiro._ui;
  barra.hidden = false;
  if (indeterminada && (percentagem === null || percentagem === undefined)) {
    barra.removeAttribute('value');
    return;
  }
  barra.value = percentagem;
}

export function tamanho(bytes) {
  if (!bytes) return '';
  const u = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(u.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** i).toFixed(i ? 1 : 0)} ${u[i]}`;
}

function consola(ficheiro) {
  const { li } = ficheiro._ui;
  if (li.querySelector('.consola')) return li.querySelector('.consola pre');

  const detalhes = document.createElement('details');
  detalhes.className = 'consola';
  const resumo = document.createElement('summary');
  resumo.textContent = 'ver o que o servidor correu';
  const saida = document.createElement('pre');
  detalhes.append(resumo, saida);
  li.append(detalhes);
  return saida;
}

export function pintarConsola(ficheiro, log) {
  if (!log) return;
  const alvo = consola(ficheiro);
  if (alvo.textContent === log) return;
  alvo.textContent = log;
  // Com o painel aberto, descer sozinho evita ter de arrastar a barra.
  if (alvo.parentElement.open) alvo.scrollTop = alvo.scrollHeight;
}

// O link de lote só faz sentido a partir de dois resultados. A fonte de
// verdade são os `data-job` que cada linha pronta põe em si.
function zipLote() {
  const alvo = document.querySelector('#zip-lote-zona');
  if (!alvo) return;

  const ids = [...document.querySelectorAll('#list li')]
    .map((li) => li.dataset.job)
    .filter(Boolean);

  if (ids.length < 2) {
    alvo.hidden = true;
    alvo.textContent = '';
    return;
  }

  alvo.hidden = false;
  alvo.textContent = '';
  const link = document.createElement('a');
  link.className = 'dl';
  link.textContent = `descarregar os ${ids.length} resultados num ZIP`;
  link.title = 'Junta todos os resultados convertidos num único ZIP';
  link.href = `/api/jobs/zip?ids=${ids.join(',')}`;
  alvo.append(link);
}

export function ligacoes(ficheiro, id) {
  const url = `/api/jobs/${encodeURIComponent(id)}`;
  const limpar = () => fetch(url, { method: 'DELETE' }).catch(() => {});
  const semJob = () => { delete ficheiro._ui.li.dataset.job; zipLote(); };

  const link = document.createElement('a');
  link.className = 'dl';
  link.href = `${url}/download`;
  link.textContent = 'descarregar';
  link.addEventListener('click', () => {
    link.textContent = 'a descarregar…';
    // Tempo para o browser pegar no ficheiro antes de o servidor o apagar.
    setTimeout(() => { limpar(); semJob(); }, 30_000);
  });
  ficheiro._ui.li.append(link);

  const botao = document.createElement('button');
  botao.className = 'limpar';
  botao.type = 'button';
  botao.textContent = 'apagar';
  botao.title = 'Apagar este ficheiro do servidor';
  botao.addEventListener('click', () => {
    limpar();
    botao.remove();
    link.remove();
    semJob();
  });
  ficheiro._ui.li.append(botao);

  ficheiro._ui.li.dataset.job = id;
  zipLote();
}
