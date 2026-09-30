// PDF -> TODAS as páginas, uma imagem por página, dentro de um ZIP.
// São dois binários em cadeia: o poppler desenha, o 7-Zip junta. Por isso é um
// motor à parte do `poppler`: exigir o 7-Zip só a quem quer o ZIP.
import path from 'node:path';

const PREFIXO = 'pagina';

export default {
  id: 'pdfzip',
  bins: ['pdftoppm', '7z'],
  from: ['pdf'],
  to: ['zip'],

  build({ input, dir }) {
    const prefixo = path.join(dir, PREFIXO);
    const zip = path.join(dir, 'output.zip');
    return {
      steps: [
        // Sem `-singlefile`: escreve pagina-1.png, pagina-2.png, …
        { bin: 'pdftoppm', args: ['-png', '-r', '150', input, prefixo] },
        // O glob é do próprio 7-Zip, por isso não precisamos de shell (Regra 7).
        // -bso0 -bsp0 cala a saída: o stderr vai para o log, não para a cara do
        // utilizador, que quer o ficheiro e não o barulho.
        { bin: '7z', args: ['a', '-tzip', '-bso0', '-bsp0', zip, `${PREFIXO}-*.png`] },
      ],
    };
  },
};
