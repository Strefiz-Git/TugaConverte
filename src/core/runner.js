// Efeito: corre o binário. Sem shell, argumentos em array (Regra 7).
import { spawn } from 'node:child_process';

const MAX_ERR = 800;

export function run({ cmd, args, dir, timeoutSec = 0 }) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: dir,
      stdio: ['ignore', 'ignore', 'pipe'],
      windowsHide: true,
    });

    let err = '';
    let timer = null;

    child.stderr.on('data', (chunk) => {
      if (err.length < MAX_ERR) err += chunk.toString('utf8').slice(0, MAX_ERR);
    });

    child.on('error', (e) => reject(new Error(`não consegui correr ${cmd}: ${e.message}`)));

    child.on('close', (code, signal) => {
      if (timer) clearTimeout(timer);
      if (code === 0) return resolve({ err });
      const why = signal ? `terminado por ${signal}` : `código ${code}`;
      reject(new Error(`${cmd} ${why}${err ? `: ${err.trim()}` : ''}`));
    });

    if (timeoutSec > 0) {
      timer = setTimeout(() => child.kill('SIGKILL'), timeoutSec * 1000);
    }
  });
}
