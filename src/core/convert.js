// O motor devolve argumentos; aqui eles tornam-se um ficheiro no disco.
import path from 'node:path';

export async function convert({ engine, runFn, dir, from, to, timeoutSec = 0 }) {
  const input = path.join(dir, `input.${from}`);
  const output = path.join(dir, `output.${to}`);
  const plan = engine.build({ input, output, from, to, dir });
  await runFn({ cmd: plan.cmd || engine.bins[0], args: plan.args, dir, timeoutSec });
  return path.join(dir, plan.produced || `output.${to}`);
}
