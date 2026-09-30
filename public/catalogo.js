// Catálogo por família. Tudo o que aparece aqui vem de `/api/catalogo`, que
// por sua vez só conta os motores ativos neste servidor (Regra 9).
export function mostrarCatalogo({ raiz, aoEscolher }) {
  let catalogo = { total: 0, categorias: [] };
  let escolhida = null;

  function pintar() {
    raiz.textContent = '';

    if (!catalogo.total) {
      // Sem motores não há catálogo: não há nada de útil para aqui dizer.
      return;
    }

    const resumo = document.createElement('p');
    resumo.className = 'resumo';
    const n = catalogo.total;
    const c = catalogo.categorias.length;
    resumo.textContent = `Este servidor converte ${n} formatos em ${c} `
      + `${c === 1 ? 'categoria' : 'categorias'}. Escolhe uma para veres quais, `
      + 'ou clica num formato para o pôr como entrada.';
    raiz.append(resumo);

    const botoes = document.createElement('div');
    botoes.className = 'familias';
    botoes.setAttribute('role', 'group');
    botoes.setAttribute('aria-label', 'Categorias de formato');

    const botao = (texto, contagem, ativo, aoClicar) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `familia${ativo ? ' ativa' : ''}`;
      b.setAttribute('aria-pressed', String(ativo));
      const nome = document.createElement('span');
      nome.textContent = texto;
      const n = document.createElement('span');
      n.className = 'conta';
      n.textContent = contagem;
      b.append(nome, n);
      b.addEventListener('click', aoClicar);
      return b;
    };

    botoes.append(botao('Todas', catalogo.total, escolhida === null, () => {
      escolhida = null;
      pintar();
    }));

    for (const categoria of catalogo.categorias) {
      botoes.append(botao(categoria.nome, categoria.total, escolhida === categoria.id, () => {
        escolhida = escolhida === categoria.id ? null : categoria.id;
        pintar();
      }));
    }
    raiz.append(botoes);

    const visiveis = escolhida
      ? catalogo.categorias.find((c) => c.id === escolhida)
      : { nome: 'Todos os formatos', extensoes: catalogo.categorias.flatMap((c) => c.extensoes) };

    if (!visiveis) return;

    const lista = document.createElement('ul');
    lista.className = 'formatos';
    for (const formato of visiveis.extensoes) {
      const li = document.createElement('li');
      const botaoFormato = document.createElement('button');
      botaoFormato.type = 'button';
      botaoFormato.className = 'formato';
      botaoFormato.title = `Usar .${formato.ext} como formato de entrada`;
      const ext = document.createElement('b');
      ext.textContent = `.${formato.ext}`;
      const nome = document.createElement('span');
      nome.textContent = formato.nome;
      botaoFormato.append(ext, nome);
      botaoFormato.addEventListener('click', () => aoEscolher(formato.ext));
      li.append(botaoFormato);
      lista.append(li);
    }
    raiz.append(lista);
  }

  return {
    definir(dados) {
      catalogo = dados || { total: 0, categorias: [] };
      escolhida = null;
      pintar();
    },
  };
}
