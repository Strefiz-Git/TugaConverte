// O ZIP de vários resultados: a rota, o escritor e os nomes de ficheiro.
// Está à parte de `app.test.js` porque é outra responsabilidade — juntar o
// que já foi convertido, em vez de converter.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { buildApp } from '../src/app.js';
import { createQueue } from '../src/core/queue.js';
import { createJobStore } from '../src/core/jobs.js';
import { fakeEngine, registryWith, tmpDir } from './helpers.js';

const settle = () => new Promise((r) => setTimeout(r, 60));

async function setup() {
  const dataDir = await tmpDir();
  const jobs = createJobStore({ dataDir, ttlMin: 1 });
  await jobs.init();
  const app = buildApp({
    registry: await registryWith([fakeEngine()]),
    jobs,
    queue: createQueue(2),
    config: { maxUploadMb: 0, jobTimeoutSec: 0, ttlMin: 1, port: 0, host: '127.0.0.1' },
    runFn: async ({ args }) => fs.writeFile(args[0], 'resultado'),
  });
  await app.ready();
  return app;
}

function form(name, body) {
  const fd = new FormData();
  fd.set('file', new Blob([body]), name);
  return fd;
}

async function converte(app, nome) {
  const res = await app.inject({ method: 'POST', url: '/api/jobs?to=b', payload: form(nome, 'conteudo') });
  assert.ok(res.json().id, `o upload de ${nome} tem de ser aceite`);
  return res.json().id;
}

test('vários resultados num ZIP', async (t) => {
  const app = await setup();
  t.after(() => app.close());

  const ids = [];
  for (const nome of ['primeiro', 'segundo']) ids.push(await converte(app, `${nome}.a`));
  await settle();

  const res = await app.inject({ url: `/api/jobs/zip?ids=${ids.join(',')}` });
  assert.equal(res.statusCode, 200, 'a rota /api/jobs/zip não pode ser capturada por /api/jobs/:id');
  assert.equal(res.headers['content-type'], 'application/zip');
  assert.equal(res.headers['content-disposition'], "attachment; filename*=UTF-8''conversoes.zip");

  const bruto = res.rawPayload;
  assert.equal(bruto.subarray(0, 4).toString('hex'), '504b0304', 'assinatura de ZIP');
  const texto = bruto.toString('utf8');
  assert.match(texto, /primeiro\.b/);
  assert.match(texto, /segundo\.b/);
});

test('o ZIP recusa o que não está pronto ou não existe', async (t) => {
  const app = await setup();
  t.after(() => app.close());

  const vazio = await app.inject({ url: '/api/jobs/zip' });
  assert.equal(vazio.statusCode, 400);

  const fantasma = await app.inject({ url: '/api/jobs/zip?ids=nao-existe' });
  assert.equal(fantasma.statusCode, 404);
  assert.equal(fantasma.json().code, 'JOB_NOT_FOUND');
});

// Um job ainda em fila não entra no ZIP: meio convertido é pior que nada.
test('um job por acabar não entra no ZIP', async (t) => {
  const app = await setup();
  t.after(() => app.close());
  const id = await converte(app, 'lento.a');
  const res = await app.inject({ url: `/api/jobs/zip?ids=${id}` });
  assert.equal(res.statusCode, 409);
  assert.equal(res.json().code, 'JOB_NOT_READY');
});

// O multipart recorta o caminho e fica só com o nome, mas o ZIP não pode
// reintroduzir caminho nenhum quando escreve as entradas.
test('um nome de ficheiro hostil não escapa do ZIP', async (t) => {
  const app = await setup();
  t.after(() => app.close());
  const id = await converte(app, '..\\..\\etc\\passwd.a');
  await settle();

  const zip = await app.inject({ url: `/api/jobs/zip?ids=${id}` });
  assert.equal(zip.statusCode, 200);
  const texto = zip.rawPayload.toString('utf8');
  assert.doesNotMatch(texto, /\.\.\//, 'não pode haver caminho a subir');
  assert.match(texto, /passwd\.b/, 'o nome entra, mas só como nome');
});

test('nomeSeguro não deixa caminho, barras nem controlos', async (t) => {
  const { nomeSeguro } = await import('../src/core/zip.js');
  assert.equal(nomeSeguro('../../etc/passwd', 'txt'), 'passwd.txt');
  assert.equal(nomeSeguro('C:\\Users\\Strefiz\\foto.png', 'jpg'), 'foto.png.jpg');
  assert.equal(nomeSeguro('', 'txt'), 'ficheiro.txt');
  assert.equal(nomeSeguro('...'), 'ficheiro');
  assert.equal(nomeSeguro('a\0b', 'txt'), 'a_b.txt');
  assert.doesNotMatch(nomeSeguro('x'.repeat(300), 'txt'), /.{101,}/, 'o nome não pode ser infinito');
});
