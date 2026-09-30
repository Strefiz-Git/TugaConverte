// Opções por conversão. O motor declara o que aceita; a API valida e passa.
//
// Um valor fora do intervalo não é erro: é limitado ao que o motor sabe fazer.
// E um cliente que não sabe das opções continua a funcionar com os valores por
// omissão. Errar aqui seria chatear quem converte um ficheiro só porque mandou
// `q=500`.
export const QUALIDADE = [{ chave: 'qualidade', min: 1, max: 100, padrao: 92 }];
export const BITRATE = [{ chave: 'bitrate', min: 32, max: 320, padrao: 128, unidade: 'kbps' }];

// Só para destinos que fazem sentido. Um `png` não tem qualidade de JPEG, e
// oferecer uma seria a mesma mentira que oferece um formato que não converter.
export const OPCOES = {
  jpg: QUALIDADE,
  jpeg: QUALIDADE,
  webp: QUALIDADE,
  mp3: BITRATE,
  m4a: BITRATE,
  aac: BITRATE,
  ogg: BITRATE,
  opus: BITRATE,
};

export function opcoesDe(destino) {
  return (OPCOES[destino] || []).map((o) => ({ ...o }));
}

/** Catálogo, para a UI saber o que mostrar e quando. */
export function catalogoOpcoes() {
  const destinos = {};
  for (const destino of Object.keys(OPCOES)) destinos[destino] = opcoesDe(destino);
  return { total: Object.keys(OPCOES).length, destinos };
}

/**
 * Valida o que veio na query e devolve só as opções do destino pedido, já
 * limitadas. Um destino sem opções devolve um objecto vazio, não adivinha.
 */
export function validar(destino, query = {}) {
  const saida = {};
  for (const opcao of OPCOES[destino] || []) {
    const bruto = query[opcao.chave];
    const numero = Number(bruto);
    saida[opcao.chave] = bruto === undefined || bruto === '' || !Number.isFinite(numero)
      ? opcao.padrao
      : Math.min(opcao.max, Math.max(opcao.min, Math.round(numero)));
  }
  return saida;
}
