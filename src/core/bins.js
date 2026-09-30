// Procura de binários. Só o motor decide se está ativo, aqui só se responde.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);

const probe = process.platform === 'win32'
  ? (bin) => run('where', [bin])
  : (bin) => run('which', [bin]);

const cache = new Map();

export async function hasBin(bin) {
  if (cache.has(bin)) return cache.get(bin);
  const ok = await probe(bin).then(() => true).catch(() => false);
  cache.set(bin, ok);
  return ok;
}
