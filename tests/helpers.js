import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRegistry } from '../src/core/registry.js';
import { convert } from '../src/core/convert.js';
import engines from '../src/engines/index.js';

// Motor falso: prova o fluxo sem depender de binários.
export function fakeEngine({ id = 'falso', from = ['a'], to = ['b'] } = {}) {
  return {
    id,
    bins: ['fake'],
    from,
    to,
    build: ({ output }) => ({ args: [output] }),
  };
}

export function registryWith(list) {
  return createRegistry({ engines: list, has: async () => true });
}

export async function tmpDir(prefix = 'tuga-') {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

// Executa um motor contra binários reais, se existirem.
export async function realConvert(registry, from, to) {
  const engine = registry.find(from, to);
  if (!engine) throw new Error(`nenhum motor para ${from} -> ${to}`);
  const dir = await tmpDir();
  const { run } = await import('../src/core/runner.js');
  const input = path.join(dir, `input.${from}`);
  await fs.writeFile(input, await fixture(from));
  const out = await convert({ engine, runFn: run, dir, from, to });
  return { data: await fs.readFile(out), dir };
}
export function startsWith(buf, hex) {
  return buf.subarray(0, hex.length / 2).toString('hex') === hex;
}

// Ficheiros mínimos reais: um pixel, um comentário, um WAV silencioso.
const FIXTURES = {
  png: () => Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'),
  md: () => Buffer.from('# Teste\n\nUm parágrafo.\n', 'utf8'),
  txt: () => Buffer.from('um, dois, três\n', 'utf8'),
  wav: () => {
    const n = 8000;
    const head = Buffer.alloc(44);
    head.write('RIFF', 0);
    head.writeUInt32LE(36 + n, 4);
    head.write('WAVEfmt ', 8);
    head.writeUInt32LE(16, 16);
    head.writeUInt16LE(1, 20);
    head.writeUInt16LE(1, 22);
    head.writeUInt32LE(8000, 24);
    head.writeUInt32LE(8000, 28);
    head.writeUInt16LE(1, 32);
    head.writeUInt16LE(8, 34);
    head.write('data', 36);
    head.writeUInt32LE(n, 40);
    return Buffer.concat([head, Buffer.alloc(n, 128)]);
  },
  // Duas páginas, para o PDF -> ZIP poder provar que traz as duas.
  pdf: () => Buffer.from(
    '%PDF-1.4\n'
    + '1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n'
    + '2 0 obj<</Type/Pages/Kids[3 0 R 4 0 R]/Count 2>>endobj\n'
    + '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 99 99]>>endobj\n'
    + '4 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 99 99]>>endobj\n'
    + 'trailer<</Root 1 0 R>>',
    'utf8'),
};

function fixture(ext) {
  const make = FIXTURES[ext];
  if (!make) throw new Error(`sem fixture para .${ext}`);
  return make();
}

export { engines };
