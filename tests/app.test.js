import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { buildApp } from '../src/app.js';
import { createQueue } from '../src/core/queue.js';
import { createJobStore } from '../src/core/jobs.js';
import { createRegistry } from '../src/core/registry.js';
import engines from '../src/engines/index.js';
import { fakeEngine, registryWith, tmpDir } from './helpers.js';

async function setup({ to = ['b'] } = {}) {
  const dataDir = await tmpDir();
  const config = { maxUploadMb: 0, jobTimeoutSec: 0, ttlMin: 1, port: 0, host: '127.0.0.1' };
  const jobs = createJobStore({ dataDir, ttlMin: 1 });
  await jobs.init();
  const queue = createQueue(2);
  const seen = [];
  const app = buildApp({
    registry: await registryWith([fakeEngine({ from: ['a'], to })]),
    jobs, queue, config,
    runFn: async ({ args }) => { seen.push(args); await fs.writeFile(args[0], 'resultado'); },
  });
  await app.ready();
  return { app, dataDir, seen, config };
}

function form(name, body) {
  const fd = new FormData();
  fd.set('file', new Blob([body]), name);
  return fd;
}

const settle = () => new Promise((r) => setTimeout(r, 60));

test('fluxo completo: enviar, converter, descarregar, apagar', async (t) => {
  const { app, dataDir } = await setup();
  t.after(() => app.close());

  const created = await app.inject({ method: 'POST', url: '/api/jobs?to=b', payload: form('nota.a', 'conteudo') });
  assert.equal(created.statusCode, 202);
  const { id } = created.json();
  await settle();

  const status = await app.inject({ url: `/api/jobs/${id}` });
  assert.equal(status.json().status, 'done');
  assert.ok(status.json().size > 0);

  const download = await app.inject({ url: `/api/jobs/${id}/download` });
  assert.equal(download.body, 'resultado');
  assert.match(download.headers['content-disposition'], /filename\*=UTF-8''nota\.b/);

  // O download tem de sobreviver a polling e a outras leituras: só o DELETE apaga.
  for (let i = 0; i < 3; i += 1) {
    assert.equal((await app.inject({ url: `/api/jobs/${id}` })).statusCode, 200);
    assert.equal((await app.inject({ url: `/api/jobs/${id}/download` })).body, 'resultado');
  }

  assert.equal((await app.inject({ method: 'DELETE', url: `/api/jobs/${id}` })).statusCode, 204);
  assert.equal((await app.inject({ url: `/api/jobs/${id}` })).statusCode, 404);
  await assert.rejects(fs.stat(path.join(dataDir, 'jobs', id)));
});

test('formato desconhecido é recusado antes de escrever no disco', async (t) => {
  const { app, dataDir } = await setup();
  t.after(() => app.close());

  const res = await app.inject({ method: 'POST', url: '/api/jobs?to=zzz', payload: form('x.a', 'y') });
  assert.equal(res.statusCode, 400);
  assert.match(res.json().error, /Não sei converter/);
  assert.deepEqual(await fs.readdir(path.join(dataDir, 'jobs')), []);
});

test('sem ficheiro é erro 400', async (t) => {
  const { app } = await setup();
  t.after(() => app.close());
  const res = await app.inject({ method: 'POST', url: '/api/jobs?to=b', payload: new FormData() });
  assert.equal(res.statusCode, 400);
});

test('o binário que falha deixa o job em erro com mensagem', async (t) => {
  const dataDir = await tmpDir();
  const jobs = createJobStore({ dataDir, ttlMin: 1 });
  await jobs.init();
  const app = buildApp({
    registry: await registryWith([fakeEngine()]),
    jobs, queue: createQueue(1),
    config: { maxUploadMb: 0, jobTimeoutSec: 0, ttlMin: 1, port: 0, host: '127.0.0.1' },
    runFn: async () => { throw new Error('convert: código 1: ficheiro corrompido'); },
  });
  await app.ready();
  t.after(() => app.close());

  const { id } = (await app.inject({ method: 'POST', url: '/api/jobs?to=b', payload: form('x.a', 'y') })).json();
  await settle();
  const job = (await app.inject({ url: `/api/jobs/${id}` })).json();
  assert.equal(job.status, 'error');
  assert.match(job.error, /corrompido/);
  assert.equal((await app.inject({ url: `/api/jobs/${id}/download` })).statusCode, 404);
});

test('descarregar antes de estar pronto dá 404', async (t) => {
  const { app } = await setup({ to: ['b'] });
  t.after(() => app.close());
  assert.equal((await app.inject({ url: '/api/jobs/nao-existe/download' })).statusCode, 404);
});

test('/api/formats e /api/health respondem', async (t) => {
  const { app } = await setup();
  t.after(() => app.close());
  assert.deepEqual((await app.inject({ url: '/api/formats' })).json(), { a: ['b'] });
  const health = (await app.inject({ url: '/api/health' })).json();
  assert.equal(health.ok, true);
  assert.deepEqual(health.engines, ['falso']);
  assert.equal(health.queue.concurrency, 2);
  assert.equal(health.ttlMin, 1, 'a UI precisa do TTL real, não de um valor adivinhado');
});

test('sem motores ativos, /api/health diz-o e /api/formats vem vazio', async (t) => {
  const dataDir = await tmpDir();
  const jobs = createJobStore({ dataDir, ttlMin: 5 });
  await jobs.init();
  const app = buildApp({
    registry: await createRegistry({ engines, has: async () => false }),
    jobs, queue: createQueue(1),
    config: { maxUploadMb: 0, jobTimeoutSec: 0, ttlMin: 5, port: 0, host: '127.0.0.1' },
    runFn: async () => {},
  });
  await app.ready();
  t.after(() => app.close());

  assert.deepEqual((await app.inject({ url: '/api/health' })).json().engines, []);
  assert.deepEqual((await app.inject({ url: '/api/formats' })).json(), {});
  assert.equal((await app.inject({ method: 'POST', url: '/api/jobs?to=jpg', payload: form('a.png', 'x') })).statusCode, 400);
});

test('a fila executa a tarefas em série até à concorrência', async () => {
  const queue = createQueue(2);
  let running = 0;
  let peak = 0;
  const task = () => new Promise((resolve) => {
    running += 1;
    peak = Math.max(peak, running);
    setTimeout(() => { running -= 1; resolve(); }, 30);
  });
  for (let i = 0; i < 6; i += 1) queue.push(task);
  await new Promise((r) => setTimeout(r, 200));
  assert.equal(peak, 2);
  assert.equal(queue.stats().waiting, 0);
});
