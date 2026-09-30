// O motor devolve um plano; aqui o plano torna-se um ficheiro no disco.
import path from 'node:path';
import { caminho } from './bins.js';

/**
 * Um motor pode precisar de mais do que um binário (o PDF para ZIP usa o
 * poppler e o 7-Zip), por isso o plano pode ser um passo só ou vários. Com
 * um passo é o que sempre foi; com vários, correm por ordem e o job só
 * termina quando todos acabarem.
 */
export async function convert({ engine, runFn, dir, from, to, timeoutSec = 0 }) {
  const input = path.join(dir, `input.${from}`);
  const output = path.join(dir, `output.${to}`);
  const plan = engine.build({ input, output, from, to, dir });
  const passos = plan.steps || [plan];

  for (const passo of passos) {
    // O caminho resolvido no arranque, para um binário encontrado fora do PATH
    // continuar a ser executável (LibreOffice e 7-Zip no Windows são casos reais).
    const cmd = passo.cmd || caminho(passo.bin || engine.bins[0]) || passo.bin || engine.bins[0];
    await runFn({ cmd, args: passo.args, dir, timeoutSec });
  }

  return path.join(dir, plan.produced || `output.${to}`);
}
