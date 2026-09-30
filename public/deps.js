// Porquê que isto não converte? Por motor, o que falta e o comando para
// instalar no sistema que a pessoa escolhe.
//
// Não instala nada. Instalar exigiria root no contentor, e um site que pede
// `curl | sh` para converter ficheiros não está a fazer o que diz.
export function mostrarDependencias({ raiz, aviso }) {
  let dados = null;
  let sistema = null;

  const escolhido = () => dados?.sistemas.find((s) => s.id === sistema) || null;

  function zonaSistema() {
    const div = document.createElement('div');
    div.className = 'escolha-sistema';

    const rotulo = document.createElement('label');
    rotulo.textContent = 'O teu sistema';
    const select = document.createElement('select');
    for (const s of dados.sistemas) {
      const op = new Option(s.nome, s.id);
      if (s.id === sistema) op.selected = true;
      select.append(op);
    }
    select.addEventListener('change', () => { sistema = select.value; pintar(); });
    rotulo.htmlFor = select.id = 'dlgSistema';
    div.append(rotulo, select);

    if (!dados.sistemaSugerido) {
      const nota = document.createElement('p');
      nota.className = 'nota-sistema';
      nota.textContent = 'O servidor corre em Linux, mas não sabe de que distribuição '
        + 'se trata. Escolhe a tua acima para veres o comando certo.';
      div.append(nota);
    }
    return div;
  }

  function comando(texto) {
    const linha = document.createElement('div');
    linha.className = 'comando';

    const codigo = document.createElement('code');
    codigo.textContent = texto;

    const copiar = document.createElement('button');
    copiar.type = 'button';
    copiar.className = 'copiar';
    copiar.textContent = 'copiar';
    copiar.setAttribute('aria-label', 'Copiar o comando de instalação');
    copiar.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(texto);
        copiar.textContent = 'copiado';
      } catch {
        // Sem permissão de área de transferência: o texto está à vista.
        copiar.textContent = 'seleciona à mão';
      }
    });

    linha.append(codigo, copiar);
    return linha;
  }

  function motor(m) {
    const item = document.createElement('li');
    item.className = `motor${m.pronto ? ' pronto' : ''}`;

    const nome = document.createElement('div');
    nome.className = 'motor-nome';
    nome.textContent = m.pronto
      ? m.id
      : `${m.faltando.map((f) => f.nome).join(', ')} — em falta`;

    item.append(nome);

    if (m.pronto) return item;

    const para = document.createElement('p');
    para.className = 'motor-para';
    para.textContent = m.faltando.map((f) => f.para).filter(Boolean).join('; ');
    item.append(para);

    for (const bin of m.faltando) {
      const texto = bin.comandos[sistema];
      if (texto) item.append(comando(texto));
    }
    return item;
  }

  function pintar() {
    raiz.textContent = '';
    if (!dados) return;

    if (dados.completo) {
      const ok = document.createElement('p');
      ok.className = 'tudo-pronto';
      ok.textContent = `Os ${dados.motores.length} motores estão prontos. Nada a instalar.`;
      raiz.append(ok);
      return;
    }

    const avisoFalta = document.createElement('p');
    avisoFalta.className = 'resumo';
    const emFalta = dados.motores.filter((m) => !m.pronto).length;
    avisoFalta.textContent = `Faltam binários em ${emFalta} `
      + `${emFalta === 1 ? 'motor' : 'motores'}. Sem eles, esses formatos não existem.`;
    raiz.append(avisoFalta, zonaSistema());

    const lista = document.createElement('ul');
    lista.className = 'motores';
    for (const m of dados.motores) lista.append(motor(m));
    raiz.append(lista);

    const final = document.createElement('p');
    final.className = 'nota-fim';
    final.textContent = 'Depois de instalar, reinicia o servidor: os binários são procurados '
      + 'uma vez, no arranque.';
    raiz.append(final);
  }

  return {
    definir(dadosRecebidos) {
      dados = dadosRecebidos;
      sistema = dados?.sistemaSugerido || dados?.sistemas?.[0]?.id || null;
      if (aviso) aviso.textContent = 'Faltam binários de conversão. Vê o que instalar abaixo.';
      pintar();
    },
  };
}
