// PDF -> imagem, primeira página. O que serve para um preview rápido.
import path from 'node:path';

export default {
  id: 'poppler',
  bins: ['pdftoppm'],
  from: ['pdf'],
  to: ['png', 'jpg'],

  build({ input, to, dir }) {
    const prefixo = path.join(dir, 'pagina');
    return {
      // -singlefile escreve exactamente o prefixo, sem índice de página.
      args: [`-${to === 'jpg' ? 'jpeg' : 'png'}`, '-r', '150', '-singlefile', input, prefixo],
      produced: `pagina.${to}`,
    };
  },
};
