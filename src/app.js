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
import { CODIGO, falha } from './core/erros.js';
import { criarZip } from './core/zip.js';
import { catalogoOpcoes, validar as validarOpcoes } from './core/opcoes.js';

const PUBLIC = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const EXT = /^[a-z0-9]{1,10}$/;
// Tecto da consola, para um binário falante não encher a memória.
const MAX_LOG = 16 * 1024;

export function buildApp({ registry, jobs, queue, runFn, config }) {
  const app = Fastify({ logger: false, requestTimeout: 0, bodyLimit: 1024 * 1024 });
  const limit = config.maxUploadMb > 0 ? config.maxUploadMb * 1024 * 1024 : Number.MAX_SAFE_INTEGER;

  app.register(compress);
  app.register(multipart, { limits: { fileSize: limit, files: 1 } });
  // `cacheControl: false` para o plugin não escrever por cima do nosso header.
  app.register(fastifyStatic, {
    root: PUBLIC,
    cacheControl: false,
    setHeaders: (res, file) => {
      // index.html nunca em cache: com `maxAge` em tudo, um deploy deixava
      // os utilizadores na página antiga. O resto pode ficar 10 minutos.
      res.setHeader('cache-control', file.endsWith('.html') ? 'no-cache' : 'public, max-age=600');
    },
  });

  app.get('/api/formats', async (_req, reply) => {
    reply.header('cache-control', 'public, max-age=30');
    return registry.formats();
  });

  app.get('/api/catalogo', async (_req, reply) => {
    reply.header('cache-control', 'public, max-age=30');
    return registry.catalogo();
  });

  // Porque é que isto não converte? Responde por motor, com o comando.
  app.get('/api/dependencias', async (_req, reply) => {
    reply.header('cache-control', 'public, max-age=30');
    return registry.dependencias();
  });

  // O que se pode ajustar em cada destino, com os valores por omissão. É o
  // que a UI lê para mostrar os controlos certos e nada mais.
  app.get('/api/opcoes', async (_req, reply) => {
    reply.header('cache-control', 'public, max-age=300');
    return catalogoOpcoes();
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
    if (!file) return falha(reply, 400, CODIGO.FICHEIRO_EM_FALTA, 'Falta o ficheiro.', ['file']);

    const name = file.filename || 'ficheiro';
    const from = path.extname(name).slice(1).toLowerCase();
    const engine = EXT.test(from) && EXT.test(to) ? registry.find(from, to) : null;
    if (!engine) {
      file.file.resume();
      return falha(reply, 400, CODIGO.FORMATO_DESCONHECIDO,
        `Não sei converter .${from || '?'} para .${to || '?'}.`, ['to']);
    }

    const job = await jobs.create({ from, to, name });
    // As opções vão validadas e limitadas: `q=500` dá 100, não um erro.
    job.opcoes = validarOpcoes(to, req.query);
    await pipeline(file.file, fs.createWriteStream(path.join(job.dir, `input.${from}`)));

    if (file.file.truncated) {
      await jobs.remove(job.id);
      return falha(reply, 413, CODIGO.FICHEIRO_ACIMA_DO_LIMITE,
        'Ficheiro acima do limite definido pelo operador.');
    }

    queue.push(async () => {
      job.status = 'running';
      job.percentagem = null;
      // O log não cresce sem limite: um binário que despeja erros não pode
      // encher a memória do servidor.
      const registrar = (texto) => {
        if (job.log.join('').length < MAX_LOG) job.log.push(texto.split(job.dir).join('…'));
      };
      // A percentagem só existe se o binário a der; sem ela, a barra fica
      // indeterminada em vez de inventar números.
      const progresso = (p) => { job.percentagem = p; };
      try {
        const out = await convert({
          engine, runFn, dir: job.dir, from, to, opcoes: job.opcoes,
          timeoutSec: config.jobTimeoutSec, registrar, progresso,
        });
        job.size = (await fs.promises.stat(out)).size;
        job.status = 'done';
      } catch (err) {
        job.status = 'error';
        job.code = CODIGO.CONVERSAO_FALHOU;
        // Só sai o caminho do job, nunca o nome do utilizador.
        job.error = err.message.split(job.dir).join('…');
      }
    });

    return reply.code(202).send({ id: job.id, status: job.status });
  });

  app.get('/api/jobs/:id', async (req, reply) => {
    const job = jobs.get(req.params.id);
    if (!job) return falha(reply, 404, CODIGO.JOB_DESCONHECIDO, 'Job não encontrado.');
    return {
      id: job.id,
      status: job.status,
      size: job.size,
      error: job.error,
      code: job.code,
      // null quando o binário não sabe dizer quanto já vai (LibreOffice,
      // Pandoc, poppler). A UI mostra uma barra indeterminada nesse caso.
      percentagem: job.percentagem,
      // A consola: a linha de comando e o que o binário disse. É a prova
      // visível de que o servidor não está a fazer nada por trás.
      log: job.log.join(''),
    };
  });

  app.get('/api/jobs/:id/download', async (req, reply) => {
    const job = jobs.get(req.params.id);
    // 404 e não 409: é o mesmo "não há nada para dar", e não vale a pena
    // confirmar a quem é o job.
    if (!job || job.status !== 'done') {
      return falha(reply, 404, CODIGO.JOB_NAO_PRONTO, 'Ainda não está pronto.');
    }
    const base = path.basename(job.name, path.extname(job.name)) || 'ficheiro';
    reply.header('content-length', job.size);
    reply.header('content-type', 'application/octet-stream');
    reply.header('content-disposition', `attachment; filename*=UTF-8''${encodeURIComponent(`${base}.${job.to}`)}`);
    return reply.send(fs.createReadStream(path.join(job.dir, `output.${job.to}`)));
  });

  // Vários resultados num ZIP. Conhecer os UUID é a credencial (Regra 8), como
  // no download de um job; aqui são vários.
  app.get('/api/jobs/zip', async (req, reply) => {
    const pedidos = String(req.query.ids || '').split(',').map((s) => s.trim()).filter(Boolean);
    if (!pedidos.length) {
      return falha(reply, 400, CODIGO.FICHEIRO_EM_FALTA, 'Indica os jobs com ?ids=id1,id2.');
    }
    if (pedidos.length > 500) {
      return falha(reply, 400, CODIGO.FICHEIRO_ACIMA_DO_LIMITE, 'Demasiados jobs num só ZIP.');
    }

    const entradas = [];
    for (const id of pedidos) {
      const job = jobs.get(id);
      if (!job) return falha(reply, 404, CODIGO.JOB_DESCONHECIDO, `Job ${id} não existe.`);
      if (job.status !== 'done') {
        return falha(reply, 409, CODIGO.JOB_NAO_PRONTO, `O job ${id} ainda não está pronto.`);
      }
      const base = path.basename(job.name, path.extname(job.name)) || 'ficheiro';
      const ficheiro = path.join(job.dir, `output.${job.to}`);
      entradas.push({ nome: base, ext: job.to, dados: await fs.promises.readFile(ficheiro) });
    }

    const zip = criarZip(entradas);
    reply.header('content-length', zip.length);
    reply.header('content-type', 'application/zip');
    reply.header('content-disposition', `attachment; filename*=UTF-8''conversoes.zip`);
    return reply.send(zip);
  });

  app.delete('/api/jobs/:id', async (req, reply) => {
    const ok = await jobs.remove(req.params.id);
    return reply.code(ok ? 204 : 404).send();
  });

  return app;
}
