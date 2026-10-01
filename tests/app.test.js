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

// O `code` é o contrato para quem programa; a mensagem é para quem lê.
// Os valores são escritos à mão de propósito: comparar com a constante
// `CODIGO` provaria que a constante é igual a si mesma, e mudar o code
// passaria o teste sem dar por isso.
test('os erros trazem code, e os de validação trazem o campo', async (t) => {
  const { app } = await setup();
  t.after(() => app.close());

  const semFicheiro = await app.inject({ method: 'POST', url: '/api/jobs?to=b', payload: new FormData() });
  assert.equal(semFicheiro.json().code, 'MISSING_FILE');
  assert.deepEqual(semFicheiro.json().campos, ['file']);

  const parFamoso = await app.inject({ method: 'POST', url: '/api/jobs?to=zzz', payload: form('x.a', 'y') });
  assert.equal(parFamoso.json().code, 'UNKNOWN_FORMAT');
  assert.deepEqual(parFamoso.json().campos, ['to']);

  const naoExiste = await app.inject({ url: '/api/jobs/nao-existe' });
  assert.equal(naoExiste.json().code, 'JOB_NOT_FOUND');

  const naoPronto = await app.inject({ url: '/api/jobs/nao-existe/download' });
  assert.equal(naoPronto.json().code, 'JOB_NOT_READY');
});

test('uma conversão que falha reporta CONVERSION_FAILED no job', async (t) => {
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
  assert.equal(job.code, 'CONVERSION_FAILED');
  // A pessoa vê uma frase; o texto cru do binário fica na consola.
  assert.match(job.error, /conversão falhou/i);
  assert.doesNotMatch(job.error, /corrompido/, 'o erro cru não é a mensagem para a pessoa');
  assert.match(job.log, /corrompido/, 'mas tem de estar no log, que é o registo do que aconteceu');
});

test('o limite do operador responde 413 com o seu code', async (t) => {
  const dataDir = await tmpDir();
  const jobs = createJobStore({ dataDir, ttlMin: 1 });
  await jobs.init();
  const app = buildApp({
    registry: await registryWith([fakeEngine()]),
    jobs, queue: createQueue(1),
    // 1 KB de limite: o ficheiro de teste é maior.
    config: { maxUploadMb: 1 / 1024, jobTimeoutSec: 0, ttlMin: 1, port: 0, host: '127.0.0.1' },
    runFn: async () => {},
  });
  await app.ready();
  t.after(() => app.close());

  const res = await app.inject({ method: 'POST', url: '/api/jobs?to=b', payload: form('grande.a', 'x'.repeat(4096)) });
  assert.equal(res.statusCode, 413);
  assert.equal(res.json().code, 'FILE_TOO_LARGE');
  assert.deepEqual(await fs.readdir(path.join(dataDir, 'jobs')), [], 'o job grande não fica no disco');
});

test('a consola mostra o comando e o que o binário disse', async (t) => {
  const dataDir = await tmpDir();
  const jobs = createJobStore({ dataDir, ttlMin: 1 });
  await jobs.init();
  const app = buildApp({
    registry: await registryWith([fakeEngine()]),
    jobs, queue: createQueue(1),
    config: { maxUploadMb: 0, jobTimeoutSec: 0, ttlMin: 1, port: 0, host: '127.0.0.1' },
    runFn: async ({ registrar }) => {
      registrar('$ falso -i entrada saida\n');
      registrar('aviso: qualidade reduzida\n');
      await fs.writeFile(path.join(path.dirname('.'), 'x'), 'x').catch(() => {});
    },
  });
  await app.ready();
  t.after(() => app.close());

  const { id } = (await app.inject({ method: 'POST', url: '/api/jobs?to=b', payload: form('foto.a', 'x') })).json();
  await settle();
  const job = (await app.inject({ url: `/api/jobs/${id}` })).json();
  assert.match(job.log, /falso -i entrada saida/, 'a linha de comando tem de aparecer');
  assert.match(job.log, /qualidade reduzida/, 'o que o binário disse tem de aparecer');
});

test('a consola nunca mostra o nome do ficheiro nem o caminho interno', async (t) => {
  const dataDir = await tmpDir();
  const jobs = createJobStore({ dataDir, ttlMin: 1 });
  await jobs.init();
  const app = buildApp({
    registry: await registryWith([fakeEngine()]),
    jobs, queue: createQueue(1),
    config: { maxUploadMb: 0, jobTimeoutSec: 0, ttlMin: 1, port: 0, host: '127.0.0.1' },
    // Binário que despeja tudo o que sabe, incluindo o caminho do job.
    runFn: async ({ dir, registrar }) => {
      registrar(`$ falso ${dir}/input.a ${dir}/output.b\n`);
      registrar(`falhou a ler ${dir}/input.a\n`);
      throw new Error(`falso falhou em ${dir}/input.a`);
    },
  });
  await app.ready();
  t.after(() => app.close());

  const { id } = (await app.inject({ method: 'POST', url: '/api/jobs?to=b', payload: form('segredo-do-utilizador.a', 'x') })).json();
  await settle();
  const job = (await app.inject({ url: `/api/jobs/${id}` })).json();
  const dados = await fs.readdir(path.join(dataDir, 'jobs'));
  const dirReal = path.join(dataDir, 'jobs', dados[0]);

  assert.doesNotMatch(job.log, /segredo-do-utilizador/, 'o nome do utilizador não pode aparecer');
  assert.doesNotMatch(job.error, /segredo-do-utilizador/);
  // O caminho do job sai como `…`, e o que fica é o nome interno input.a.
  assert.doesNotMatch(job.log, new RegExp(dirReal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(job.log, /…[\\/]input\.a/);
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
  assert.match(job.error, /conversão falhou/i, 'a pessoa vê uma frase, não a stderr');
  assert.match(job.log, /corrompido/, 'a stderr fica na consola, que é o registo');
  assert.equal((await app.inject({ url: `/api/jobs/${id}/download` })).statusCode, 404);
});

test('descarregar antes de estar pronto dá 404', async (t) => {
  const { app } = await setup({ to: ['b'] });
  t.after(() => app.close());
  assert.equal((await app.inject({ url: '/api/jobs/nao-existe/download' })).statusCode, 404);
});

test('/api/dependencias responde mesmo sem binários', async (t) => {
  const { app } = await setup();
  t.after(() => app.close());
  const res = await app.inject({ url: '/api/dependencias' });
  assert.equal(res.statusCode, 200);
  const deps = res.json();
  assert.equal(deps.completo, true, 'o motor falso tem tudo o que precisa');
  assert.equal(deps.sistemas.length, 6);
  assert.equal(deps.motores[0].id, 'falso');
});

