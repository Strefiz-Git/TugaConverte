// O ajuste de cada conversão: qualidade da imagem, bitrate do áudio.
//
// O que cada destino aceita vem de `/api/opcoes` (Regra 9): uma lista escrita
// à mão no browser acabaria a prometer ajustes que o servidor não faz, ou a
// esconder ajustes que ele aceita.
let catalogo = { destinos: {} };

export async function carregarOpcoes() {
  const dados = await fetch('/api/opcoes').then((r) => r.json()).catch(() => null);
  if (dados && dados.total) catalogo = dados;
}

/**
 * Mostra o ajuste que o destino escolhido pede, ou tira-o se esse destino
 * não tiver nenhum. Chamar outra vez com outro destino é o mesmo botão a
 * mudar de sítio: só há um por linha.
 */
export function ajustarOpcao(select, nomeFicheiro) {
  const existentes = select.parentElement.querySelector('.opcao-campo');
  const definicoes = catalogo.destinos[select.value] || [];
  if (!definicoes.length) {
    existentes?.remove();
    return;
  }
  const def = definicoes[0];
  const campo = existentes || document.createElement('label');
  const numero = campo.querySelector('input') || document.createElement('input');
  numero.type = 'number';
  numero.min = def.min;
  numero.max = def.max;
  numero.step = 1;
  numero.value = select.dataset[def.chave] || def.padrao;
  numero.setAttribute('aria-label', `${rotulo(def)} para ${nomeFicheiro}`);
  // O valor vive no `select`: sobrevive a mudar de destino e voltar atrás.
  select.dataset[def.chave] = numero.value;
  numero.oninput = () => { select.dataset[def.chave] = numero.value; };
  if (!existentes) {
    campo.className = 'opcao-campo';
    campo.append(document.createTextNode(rotulo(def)), numero);
    select.after(campo);
  }
}

const rotulo = (def) => (def.unidade === 'kbps' ? 'bitrate' : 'qualidade');

/** O que vai na query do POST, a partir do que está no `select`. */
export function opcoesDe(select) {
  const params = new URLSearchParams();
  for (const def of catalogo.destinos[select.value] || []) {
    const valor = select.dataset[def.chave];
    if (valor !== undefined && valor !== '') params.set(def.chave, valor);
  }
  return params.toString();
}