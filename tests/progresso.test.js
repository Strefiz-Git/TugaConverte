// A percentagem que cada binário sabe (ou não sabe) dar: o parser, e o que a
// rota devolve quando o motor sabe e quando não sabe.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { buildApp } from '../src/app.js';
import { createQueue } from '../src/core/queue.js';
import { createJobStore } from '../src/core/jobs.js';
import { criarLeitorFfmpeg, criarLeitorImagemMagick, criarLeitor } from '../src/core/progresso.js';
import { fakeEngine, registryWith, tmpDir } from './helpers.js';

const settle = () => new Promise((r) => setTimeout(r, 60));

test('ffmpeg: percentagem a partir da duração e do tempo processado', () => {
  const leitor = criarLeitorFfmpeg();
  // A duração vem no stderr, no arranque.
  assert.equal(leitor.stderr('  Duration: 00:00:04.00, start: 0.0, bitrate: 500 kb/s\n'), null);
  assert.equal(leitor.stdout('out_time_us=1000000\n'), 25, '1 s de 4 s são 25%');
  assert.equal(leitor.stdout('out_time_us=2000000\nout_time_ms=2000000\n'), 50);
  assert.equal(leitor.stdout('out_time_us=4000000\n'), 100);
});

test('ffmpeg: sem duração não há percentagem, e nunca passa de 100', () => {
  const semDuracao = criarLeitorFfmpeg();
  assert.equal(semDuracao.stdout('out_time_us=2000000\n'), null,
    'sem a duração, inventar um número seria mentir');

  const leitor = criarLeitorFfmpeg();
  leitor.stderr('Duration: 00:00:02.00, start: 0.0\n');
  assert.equal(leitor.stdout('out_time_us=9999000000\n'), 100, 'o tecto é 100');
});

test('ffmpeg: a duração com horas', () => {
  const leitor = criarLeitorFfmpeg();
  leitor.stderr('Duration: 01:00:00.00, start: 0.0\n');
  assert.equal(leitor.stdout('out_time_us=1800000000\n'), 50, '30 min de 1 h são 50%');
});

test('ImageMagick: percentagem do stderr', () => {
  const leitor = criarLeitorImagemMagick();
  assert.equal(leitor.stderr('resize image[a.png]: 1 of 200, 00% complete\n'), 0);
  assert.equal(leitor.stderr('resize image[a.png]: 84 of 200, 42% complete\n'), 42);
  assert.equal(leitor.stderr('alguma coisa sem percentagem\n'), 42, 'mantém o último');
  assert.equal(leitor.stdout(''), 42);
});

test('ffmpeg: a ordem em que chegam não muda o resultado', () => {
  // O Node entrega o stderr e o stdout como calhar. Se o progresso chegar
  // primeiro, é a leitura do stderr que tem de fechar a conta.
  const primeiroProgresso = criarLeitorFfmpeg();
  assert.equal(primeiroProgresso.stdout('out_time_us=1000000\n'), null, 'sem duração ainda não há nada');
  assert.equal(primeiroProgresso.stderr('Duration: 00:00:04.00, start: 0.0\n'), 25,
    'a duração que chega depois ainda entrega a percentagem');

  const primeiroStderr = criarLeitorFfmpeg();
  primeiroStderr.stderr('Duration: 00:00:04.00\n');
  assert.equal(primeiroStderr.stdout('out_time_us=3000000\n'), 75);
});

test('ffmpeg: uma linha partida entre dois pedaços é a mesma linha', () => {
  // Isto acontece mesmo: o ffmpeg escreve `Duration:` numa escrita e
  // `00:00:04.00, start: 0.0` na seguinte. O pipe corta onde lhe apetece.
  const leitor = criarLeitorFfmpeg();
  leitor.stderr("Input #0, mov,mp4, from 'input.mp4':\n  Duration:");
  assert.equal(leitor.stdout('out_time_us=1000000\n'), null, 'ainda não há duração');
  assert.equal(leitor.stderr(' 00:00:04.00, start: 0.0, bitrate: 55 kb/s\n'), 25,
    'a linha partida tem de contar como a linha inteira');

  // O bloco de progresso também chega cortado a meio, a meio de uma chave.
const meio = criarLeitorFfmpeg();
  meio.stderr('Duration: 00:00:10.00\n');
  assert.equal(meio.stdout('frame=200\nout_time_us=3000000\nout_time_'), 30);
  assert.equal(meio.stdout('ms=3000000\nprogress=continue\n'), 30,
    'a segunda metade da linha não muda nada, mas também não perde o resto');
});

test('ImageMagick: a percentagem partida também conta', () => {
  const leitor = criarLeitorImagemMagick();
  assert.equal(leitor.stderr('resize image[a.png]: 84 of 200, 4'), null);
  assert.equal(leitor.stderr('2% complete\n'), 42);
});

test('um motor que não declara progresso não recebe leitor', () => {
  assert.equal(criarLeitor({ id: 'libreoffice' }), null);
  assert.equal(criarLeitor({ id: 'ffmpeg', progresso: 'ffmpeg' }).stdout('x'), null);
});

function form(name, body) {
  const fd = new FormData();
  fd.set('file', new Blob([body]), name);
  return fd;
}

test('a percentagem chega ao job quando o binário a dá', async (t) => {
  const dataDir = await tmpDir();
  const jobs = createJobStore({ dataDir, ttlMin: 1 });
  await jobs.init();
  const app = buildApp({
    registry: await registryWith([{ ...fakeEngine(), progresso: 'ffmpeg' }]),
    jobs, queue: createQueue(1),
    config: { maxUploadMb: 0, jobTimeoutSec: 0, ttlMin: 1, port: 0, host: '127.0.0.1' },
    runFn: async ({ args, leitor }) => {
      leitor.stderr('Duration: 00:00:04.00, start: 0.0\n');
      leitor.aoProgitar(leitor.stdout('out_time_us=1000000\n'));
      await fs.writeFile(args[0], 'x');
    },
  });
  await app.ready();
  t.after(() => app.close());

  const { id } = (await app.inject({ method: 'POST', url: '/api/jobs?to=b', payload: form('x.a', 'y') })).json();
  await settle();
  const job = (await app.inject({ url: `/api/jobs/${id}` })).json();
  assert.equal(job.percentagem, 25, '1 s de 4 s são 25%');
});

test('um motor sem progresso dá percentagem nula, não zero', async (t) => {
  const dataDir = await tmpDir();
  const jobs = createJobStore({ dataDir, ttlMin: 1 });
  await jobs.init();
  const app = buildApp({
    registry: await registryWith([fakeEngine()]),
    jobs, queue: createQueue(1),
    config: { maxUploadMb: 0, jobTimeoutSec: 0, ttlMin: 1, port: 0, host: '127.0.0.1' },
    runFn: async ({ args }) => fs.writeFile(args[0], 'x'),
  });
  await app.ready();
  t.after(() => app.close());

  const { id } = (await app.inject({ method: 'POST', url: '/api/jobs?to=b', payload: form('x.a', 'y') })).json();
  await settle();
  const job = (await app.inject({ url: `/api/jobs/${id}` })).json();
  // null é "não sei"; 0 seria "não comecei", que é uma mentira diferente.
  assert.equal(job.percentagem, null);
});
