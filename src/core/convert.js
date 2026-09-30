// O motor devolve argumentos; aqui eles tornam-se um ficheiro no disco.
import path from 'node:path';
import { caminho } from './bins.js';

export async function convert({ engine, runFn, dir, from, to, timeoutSec = 0 }) {
  const input = path.join(dir, `input.${from}`);
  const output = path.join(dir, `output.${to}`);
  const plan = engine.build({ input, output, from, to, dir });
  // O caminho resolvido no arranque, para um binário encontrado fora do PATH
  // continuar a ser executável (LibreOffice no Windows é o caso real).
  const cmd = plan.cmd || caminho(engine.bins[0]) || engine.bins[0];
  await runFn({ cmd, args: plan.args, dir, timeoutSec });
  return path.join(dir, plan.produced || `output.${to}`);
}
