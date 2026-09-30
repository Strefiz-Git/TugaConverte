// O nome do ficheiro que o motor deixou.
//
// O LibreOffice não escreve `output.pdf`: deriva o nome do input e escreve
// `input.pdf`. O download e o ZIP de lote tinham `output.<ext>` escrito à mão e
// rebentavam com ENOENT em toda a família do escritório — ficheiros que a
// interface dava como prontos e que não baixavam. Estes testes existem para
// isso não voltar.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { buildApp } from '../src/app.js';
import { createQueue } from '../src/core/queue.js';
import { createJobStore } from '../src/core/jobs.js';
import { registryWith, tmpDir } from './helpers.js';

const settle = () => new Promise((r) => setTimeout(r, 60));

// Um motor que, como o LibreOffice, escreve com o nome do input.
function motorComNome() {
  return {
    id: 'soffice',
    bins: ['soffice'],
    from: ['txt'],
    to: ['pdf'],
    build: ({ input }) => ({ args: ['--convert-to', 'pdf'], produced: 'input.pdf' }),
  };
}

async function comMotor(motor, runFn) {
  const jobs = createJobStore({ dataDir: await tmpDir(), ttlMin: 1 });
  await jobs.init();
  const app = buildApp({
    registry: await registryWith([motor]),
    jobs, queue: createQueue(1),
    config: { maxUploadMb: 0, jobTimeoutSec: 0, ttlMin: 1, port: 0, host: '127.0.0.1' },
    runFn,
  });
  await app.ready();
  return app;
}

const form = (nome, corpo) => {
  const fd = new FormData();
  fd.set('file', new Blob([corpo]), nome);
  return fd;
};

test('descarrega o ficheiro que o motor produziu, não o que se previa', async (t) => {
  const app = await comMotor(motorComNome(), async ({ dir }) => {
    const { join } = await import('node:path');
    await fs.writeFile(join(dir, 'input.pdf'), 'conteudo do pdf');
  });
  t.after(() => app.close());

  const { id } = (await app.inject({ method: 'POST', url: '/api/jobs?to=pdf', payload: form('nota.txt', 'ola') })).json();
  await settle();
  const job = (await app.inject({ url: `/api/jobs/${id}` })).json();
  assert.equal(job.status, 'done', 'o job tem de ficar pronto');

  const dl = await app.inject({ url: `/api/jobs/${id}/download` });
  assert.equal(dl.statusCode, 200, 'o download não pode rebentar');
  assert.equal(dl.body, 'conteudo do pdf');
  assert.match(dl.headers['content-disposition'], /nota\.pdf/, 'o nome do utilizador volta no header');
});

test('o ZIP de lote também usa o ficheiro que o motor produziu', async (t) => {
  const app = await comMotor(motorComNome(), async ({ dir }) => {
    const { join } = await import('node:path');
    await fs.writeFile(join(dir, 'input.pdf'), 'pdf do job');
  });
  t.after(() => app.close());

  const ids = [];
  for (const nome of ['a.txt', 'b.txt']) {
    const { id } = (await app.inject({ method: 'POST', url: '/api/jobs?to=pdf', payload: form(nome, 'ola') })).json();
    ids.push(id);
  }
  await settle();

  const res = await app.inject({ url: `/api/jobs/zip?ids=${ids.join(',')}` });
  assert.equal(res.statusCode, 200, 'o ZIP de lote não pode rebentar');
  assert.equal(res.headers['content-type'], 'application/zip');
  assert.equal(res.rawPayload.subarray(0, 2).toString(), 'PK');
  assert.ok(res.rawPayload.length > 100, `o ZIP tem de ter conteúdo, veio ${res.rawPayload.length} bytes`);
  // Os dois nomes originais dentro do ZIP, para se poder distinguir.
  assert.ok(res.body.includes('a.pdf'), 'o ZIP traz o nome original do primeiro');
  assert.ok(res.body.includes('b.pdf'), 'e o do segundo');
});