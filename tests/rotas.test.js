// As rotas de leitura (formatos, catálogo, dependências, saúde) e a fila.
// Estão separadas de `app.test.js` porque são outra responsabilidade: não são
// o fluxo de um job, são o que o site mostra antes de haver qualquer job.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';
import { createQueue } from '../src/core/queue.js';
import { createJobStore } from '../src/core/jobs.js';
import { createRegistry } from '../src/core/registry.js';
import engines from '../src/engines/index.js';
import { fakeEngine, registryWith, tmpDir } from './helpers.js';

async function comApp(make) {
  const dataDir = await tmpDir();
  const jobs = createJobStore({ dataDir, ttlMin: 5 });
  await jobs.init();
  const app = buildApp({
    registry: await registryWith([fakeEngine()]),
    jobs,
    queue: createQueue(2),
    config: { maxUploadMb: 0, jobTimeoutSec: 0, ttlMin: 5, port: 0, host: '127.0.0.1' },
    runFn: async () => {},
  });
  if (make) await make(app);
  await app.ready();
  return app;
}

test('/api/catalogo devolve as famílias com contagens', async (t) => {
  const app = await comApp();
  t.after(() => app.close());
  const res = await app.inject({ url: '/api/catalogo' });
  assert.equal(res.statusCode, 200);
  // O motor falso diz "a" -> "b", que não estão catalogados: nada a mostrar.
  assert.deepEqual(res.json(), { total: 0, categorias: [] });
});

test('/api/formats e /api/health respondem', async (t) => {
  const app = await comApp();
  t.after(() => app.close());
  assert.deepEqual((await app.inject({ url: '/api/formats' })).json(), { a: ['b'] });
  // Um deploy não pode deixar ninguém na página antiga: o HTML não é cacheado.
  const html = await app.inject({ url: '/' });
  assert.equal(html.headers['cache-control'], 'no-cache');
  const js = await app.inject({ url: '/app.js' });
  assert.match(js.headers['cache-control'], /max-age=\d+/, 'os estáticos podem ficar em cache');

  const health = (await app.inject({ url: '/api/health' })).json();
  assert.equal(health.ok, true);
  assert.deepEqual(health.engines, ['falso']);
  assert.equal(health.queue.concurrency, 2);
  assert.equal(health.ttlMin, 5, 'a UI precisa do TTL real, não de um valor adivinhado');
});

test('sem motores ativos, o health diz-o e os formatos vêm vazios', async (t) => {
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
  assert.deepEqual((await app.inject({ url: '/api/catalogo' })).json(), { total: 0, categorias: [] });
});

test('/api/opcoes diz o que cada destino aceita', async (t) => {
  const app = await comApp();
  t.after(() => app.close());
  const res = await app.inject({ url: '/api/opcoes' });
  assert.equal(res.statusCode, 200);
  const opcoes = res.json();
  assert.ok(opcoes.total > 0);
  assert.equal(opcoes.destinos.jpg[0].chave, 'qualidade');
  assert.equal(opcoes.destinos.png, undefined, 'png não tem opções e não é anunciado');
});

test('a fila nunca passa da concorrência e esvazia', async () => {
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
  assert.equal(peak, 2, 'nunca mais do que a concorrência ao mesmo tempo');
  assert.equal(queue.stats().waiting, 0);
});
