// Efeito: corre o binário. Sem shell, argumentos em array (Regra 7).
import { spawn } from 'node:child_process';

const MAX_ERR = 800;
// Espera por este tempo depois de o processo sair, para o stderr chegar.
// O LibreOffice no Windows é um caso real: `soffice.exe` deixa um processo
// filho a segurar o pipe, e esperar pelo 'close' (que só dispara quando todos
// os streams fecham) ficava à espera para sempre.
const SAIR = 150;

export function run({ cmd, args, dir, timeoutSec = 0 }) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: dir,
      stdio: ['ignore', 'ignore', 'pipe'],
      windowsHide: true,
    });

    let err = '';
    let timer = null;
    let acabou = false;

    const terminar = (code, signal) => {
      if (acabou) return;
      acabou = true;
      if (timer) clearTimeout(timer);
      setTimeout(() => {
        child.stderr.destroy();
        if (code === 0) return resolve({ err });
        const why = signal ? `terminado por ${signal}` : `código ${code}`;
        reject(new Error(`${cmd} ${why}${err ? `: ${err.trim()}` : ''}`));
      }, SAIR);
    };

    child.stderr.on('data', (chunk) => {
      if (err.length < MAX_ERR) err += chunk.toString('utf8').slice(0, MAX_ERR);
    });

    child.on('error', (e) => {
      if (!acabou) terminar(127, null);
      reject(new Error(`não consegui correr ${cmd}: ${e.message}`));
    });

    child.on('exit', terminar);

    if (timeoutSec > 0) {
      timer = setTimeout(() => child.kill('SIGKILL'), timeoutSec * 1000);
    }
  });
}
