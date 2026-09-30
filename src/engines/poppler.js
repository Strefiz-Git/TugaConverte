// PDF -> imagem com poppler. Só a 1.ª página; "todas as páginas em ZIP" está no TODO.
import path from 'node:path';

export default {
  id: 'poppler',
  bins: ['pdftoppm'],
  from: ['pdf'],
  to: ['png', 'jpg'],

  build({ input, to, dir }) {
    const kind = to === 'jpg' ? '-jpeg' : '-png';
    return {
      // -singlefile escreve exatamente o prefixo indicado, sem índice de página.
      args: [kind, '-r', '150', '-singlefile', input, path.join(dir, 'output')],
      produced: `output.${to}`,
    };
  },
};
