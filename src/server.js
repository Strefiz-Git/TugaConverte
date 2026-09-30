// Arranque: config -> dependências -> app. É o único sítio com efeitos globais.
import { loadConfig } from './config.js';
import { buildApp } from './app.js';
import { hasBin } from './core/bins.js';
import { createRegistry } from './core/registry.js';
import { createQueue } from './core/queue.js';
import { createJobStore } from './core/jobs.js';
import { run } from './core/runner.js';
import engines from './engines/index.js';

const config = loadConfig();
const registry = await createRegistry({ engines, has: hasBin });
const jobs = createJobStore({ dataDir: config.dataDir, ttlMin: config.ttlMin });
const queue = createQueue(config.concurrency);

await jobs.init();
setInterval(() => jobs.sweep().catch(() => {}), 60_000).unref();

const app = buildApp({ registry, jobs, queue, runFn: run, config });
await app.listen({ port: config.port, host: config.host });

const ids = registry.engines.map((e) => e.id).join(', ') || 'nenhum';
console.log(`TugaConverte em http://localhost:${config.port} · motores: ${ids}`);
