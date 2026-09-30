// O motor devolve um plano; aqui o plano torna-se um ficheiro no disco.
import path from 'node:path';
import { caminho } from './bins.js';
import { criarLeitor } from './progresso.js';

/**
 * Um motor pode precisar de mais do que um binário (o PDF para ZIP usa o
 * poppler e o 7-Zip), por isso o plano pode ser um passo só ou vários. Com
 * um passo é o que sempre foi; com vários, correm por ordem e o job só
 * termina quando todos acabarem.
 */
export async function convert({ engine, runFn, dir, from, to, timeoutSec = 0, registrar, progresso, opcoes }) {
  const input = path.join(dir, `input.${from}`);
  const output = path.join(dir, `output.${to}`);
  const plan = engine.build({ input, output, from, to, dir, opcoes });
  const passos = plan.steps || [plan];

  // Só os motores que sabem dizer quanto já vão dão percentagem; os outros
  // deixam `progresso` a null e a barra fica indeterminada.
  const leitor = criarLeitor(engine);
  if (leitor && progresso) leitor.aoProgitar = progresso;

  for (const passo of passos) {
    // O caminho resolvido no arranque, para um binário encontrado fora do PATH
    // continuar a ser executável (LibreOffice e 7-Zip no Windows são casos reais).
    const cmd = passo.cmd || caminho(passo.bin || engine.bins[0]) || passo.bin || engine.bins[0];
    await runFn({ cmd, args: passo.args, dir, timeoutSec, registrar, leitor });
  }

  return path.join(dir, plan.produced || `output.${to}`);
}
