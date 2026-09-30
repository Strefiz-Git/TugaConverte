// Configuração lida do ambiente. 0 = ilimitado em tudo (Regra 6).
import os from 'node:os';

const num = (v, def) => {
  const n = Number.parseInt(v ?? '', 10);
  return Number.isFinite(n) && n >= 0 ? n : def;
};

export function loadConfig(env = process.env) {
  const cpus = os.availableParallelism?.() ?? os.cpus().length ?? 1;
  return {
    host: env.HOST || '0.0.0.0',
    port: num(env.PORT, 3000),
    dataDir: env.DATA_DIR || 'data',
    // Conversões são CPU-bound: mais paralelismo que CPUs só piora (Regra 12).
    concurrency: num(env.CONCURRENCY, Math.max(1, cpus - 1)),
    maxUploadMb: num(env.MAX_UPLOAD_MB, 0),
    jobTimeoutSec: num(env.JOB_TIMEOUT_SEC, 0),
    ttlMin: num(env.TTL_MIN, 120),
  };
}
