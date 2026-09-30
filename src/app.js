// Só rotas HTTP. Toda a lógica de conversão vem injetada (Regra 5).
import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import compress from '@fastify/compress';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { convert } from './core/convert.js';

const PUBLIC = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const EXT = /^[a-z0-9]{1,10}$/;

export function buildApp({ registry, jobs, queue, runFn, config }) {
  const app = Fastify({ logger: false, requestTimeout: 0, bodyLimit: 1024 * 1024 });
  const limit = config.maxUploadMb > 0 ? config.maxUploadMb * 1024 * 1024 : Number.MAX_SAFE_INTEGER;

  app.register(compress);
  app.register(multipart, { limits: { fileSize: limit, files: 1 } });
  // Os estáticos podem ficar em cache, o HTML não: com `maxAge` em tudo, um
  // deploy deixava os utilizadores na página antiga durante 10 minutos.
  // `cacheControl: false` para o plugin não escrever por cima do nosso header.
  app.register(fastifyStatic, {
    root: PUBLIC,
    cacheControl: false,
    setHeaders: (res, file) => {
      res.setHeader('cache-control', file.endsWith('.html') ? 'no-cache' : 'public, max-age=600');
    },
  });

  app.get('/api/formats', async (_req, reply) => {
    reply.header('cache-control', 'public, max-age=30');
    return registry.formats();
  });

  app.get('/api/health', async () => ({
    ok: true,
    engines: registry.engines.map((e) => e.id),
    queue: queue.stats(),
    // A UI mostra este número em vez de adivinhar o TTL.
    ttlMin: config.ttlMin,
  }));

  app.post('/api/jobs', async (req, reply) => {
    const to = String(req.query.to || '').toLowerCase();
    const file = await req.file();
    if (!file) return reply.code(400).send({ error: 'Falta o ficheiro.' });

    const name = file.filename || 'ficheiro';
    const from = path.extname(name).slice(1).toLowerCase();
    const engine = EXT.test(from) && EXT.test(to) ? registry.find(from, to) : null;
    if (!engine) {
      file.file.resume();
      return reply.code(400).send({ error: `Não sei converter .${from || '?'} para .${to || '?'}.` });
    }

    const job = await jobs.create({ from, to, name });
    await pipeline(file.file, fs.createWriteStream(path.join(job.dir, `input.${from}`)));

    if (file.file.truncated) {
      await jobs.remove(job.id);
      return reply.code(413).send({ error: 'Ficheiro acima do limite definido pelo operador.' });
    }

    queue.push(async () => {
      job.status = 'running';
      try {
        const out = await convert({ engine, runFn, dir: job.dir, from, to, timeoutSec: config.jobTimeoutSec });
        job.size = (await fs.promises.stat(out)).size;
        job.status = 'done';
      } catch (err) {
        job.status = 'error';
        // Só sai o caminho do job, nunca o nome do utilizador.
        job.error = err.message.split(job.dir).join('…');
      }
    });

    return reply.code(202).send({ id: job.id, status: job.status });
  });

  app.get('/api/jobs/:id', async (req, reply) => {
    const job = jobs.get(req.params.id);
    if (!job) return reply.code(404).send({ error: 'Job não encontrado.' });
    return { id: job.id, status: job.status, size: job.size, error: job.error };
  });

  app.get('/api/jobs/:id/download', async (req, reply) => {
    const job = jobs.get(req.params.id);
    if (!job || job.status !== 'done') return reply.code(404).send({ error: 'Ainda não está pronto.' });
    const base = path.basename(job.name, path.extname(job.name)) || 'ficheiro';
    reply.header('content-length', job.size);
    reply.header('content-type', 'application/octet-stream');
    reply.header('content-disposition', `attachment; filename*=UTF-8''${encodeURIComponent(`${base}.${job.to}`)}`);
    return reply.send(fs.createReadStream(path.join(job.dir, `output.${job.to}`)));
  });

  app.delete('/api/jobs/:id', async (req, reply) => {
    const ok = await jobs.remove(req.params.id);
    return reply.code(ok ? 204 : 404).send();
  });

  return app;
}
