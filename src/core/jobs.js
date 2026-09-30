// Estado dos jobs em memória + diretório por job em disco (Regra 8, Regra 13).
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export function createJobStore({ dataDir, ttlMin = 120 }) {
  const jobs = new Map();
  const root = path.resolve(dataDir, 'jobs');

  return {
    async init() {
      await fs.mkdir(root, { recursive: true });
    },

    async create({ from, to, name }) {
      const id = randomUUID();
      const dir = path.join(root, id);
      await fs.mkdir(dir, { recursive: true });
      const job = { id, dir, from, to, name, status: 'pending', size: 0, error: null, at: Date.now() };
      jobs.set(id, job);
      return job;
    },

    get: (id) => jobs.get(id),

    async remove(id) {
      const job = jobs.get(id);
      if (!job) return false;
      jobs.delete(id);
      await fs.rm(job.dir, { recursive: true, force: true });
      return true;
    },

    // TTL é privacidade, não quota (Regra 6 + Regra 13).
    async sweep() {
      const deadline = Date.now() - ttlMin * 60_000;
      for (const [id, job] of jobs) {
        if (job.at < deadline) await this.remove(id);
      }
    },
  };
}
