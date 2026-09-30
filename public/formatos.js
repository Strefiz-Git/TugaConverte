// Escolha de formatos antes do ficheiro, como no CloudConvert.
// A lista de formatos vem do servidor (Regra 9): aqui não há formatos escritos à mão.
export function createFormatos({ matrix, onChange }) {
  const el = {
    entrada: document.querySelector('#entrada'),
    saida: document.querySelector('#saida'),
    trocar: document.querySelector('#trocar'),
    entradaExt: document.querySelector('#entradaExt'),
    saidaExt: document.querySelector('#saidaExt'),
    dlg: document.querySelector('#dlg'),
    titulo: document.querySelector('#dlgTitulo'),
    filtro: document.querySelector('#dlgFiltro'),
    lista: document.querySelector('#dlgLista'),
    fechar: document.querySelector('#dlgFechar'),
  };

  let lado = 'entrada';
  let entrada = '';
  let saida = '';
  let proposta = [];

  const origens = () => Object.keys(matrix).sort();
  const destinos = () => (entrada ? [...(matrix[entrada] || [])].sort() : []);
  // Trocar só faz sentido se o par inverso existir; senão o botão fica desativado.
  const podeTrocar = () => Boolean(saida && (matrix[saida] || []).includes(entrada));

  // A primeira pintura não notifica: `onChange` lê o módulo antes de ele existir.
  function pintar(notificar = true) {
    el.entradaExt.textContent = entrada ? entrada.toUpperCase() : '…';
    el.saidaExt.textContent = saida ? saida.toUpperCase() : '…';
    el.entrada.disabled = origens().length === 0;
    el.saida.disabled = !entrada;
    el.trocar.disabled = !podeTrocar();
    el.trocar.title = podeTrocar()
      ? 'Trocar entrada e saída'
      : 'A troca não é possível: este servidor não converte o par inverso';
    if (notificar) onChange({ entrada, saida });
  }

  function desenhar() {
    const termo = el.filtro.value.trim().toLowerCase();
    const visiveis = proposta.filter((e) => e.startsWith(termo)).slice(0, 80);
    el.lista.textContent = '';

    if (!visiveis.length) {
      const li = document.createElement('li');
      li.className = 'vazio';
      li.textContent = 'Nenhum formato com esse nome.';
      el.lista.append(li);
      return;
    }

    for (const format of visiveis) {
      const li = document.createElement('li');
      const botao = document.createElement('button');
      botao.type = 'button';
      botao.className = 'opcao';
      botao.textContent = format.toUpperCase();
      botao.addEventListener('click', () => escolher(format));
      li.append(botao);
      el.lista.append(li);
    }
  }

  function abrir(qual) {
    lado = qual;
    proposta = qual === 'entrada' ? origens() : destinos();
    el.titulo.textContent = qual === 'entrada' ? 'Formato de entrada' : 'Converter para';
    el.filtro.value = '';
    desenhar();
    el.dlg.showModal();
    el.filtro.focus();
  }

  function escolher(format) {
    if (lado === 'entrada') {
      if (format === entrada) return;
      entrada = format;
      // Um destino que já não sirva para a nova entrada tem de mudar.
      if (!destinos().includes(saida)) saida = '';
    } else {
      saida = format;
    }
    el.dlg.close();
    pintar();
  }

  function trocar() {
    [entrada, saida] = [saida, entrada];
    pintar();
  }

  el.entrada.addEventListener('click', () => abrir('entrada'));
  el.saida.addEventListener('click', () => abrir('saida'));
  el.trocar.addEventListener('click', trocar);
  el.filtro.addEventListener('input', desenhar);
  el.filtro.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    el.lista.querySelector('button')?.click();
  });
  el.fechar.addEventListener('click', () => el.dlg.close());
  el.dlg.addEventListener('close', () => { el.filtro.value = ''; });

  pintar(false);

  return {
    get: () => ({ entrada, saida }),
    pronto: () => Boolean(entrada && saida),
    trocar,
    podeTrocar,
  };
}
