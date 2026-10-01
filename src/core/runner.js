// Efeito: corre o binário. Sem shell, argumentos em array (Regra 7).
import { spawn } from 'node:child_process';

const MAX_ERR = 800;
// Tempo sem bytes depois de o processo sair. Não é espera fixa: cada pedaço que
// chega adia o fim, porque o último bloco de saída ainda pode estar a caminho.
// Com uma espera fixa de 150 ms perdíamos a linha `Duration` do ffmpeg uma vez
// em doze (e perdíamos também o fim da mensagem de erro dos outros).
const SILENCIO = 150;
// Tecto absoluto, para o caso de um pipe que pinga sem parar. Cinco segundos é
// muito para um binário que já saiu.
const TECTO = 5000;

export function run({ cmd, args, dir, timeoutSec = 0, registrar, leitor }) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: dir,
      // O stdout também entra no pipe: o ffmpeg escreve aí o progresso.
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    let err = '';
    let timer = null;
    let espera = null;
    let limite = null;
    let codigo = null;
    let sinal = null;
    let saiu = false;
    let resolvido = false;

    const fechar = () => {
      if (resolvido) return;
      resolvido = true;
      if (espera) clearTimeout(espera);
      if (limite) clearTimeout(limite);
      child.stderr.destroy();
      child.stdout.destroy();
      if (codigo === 0) return resolve({ err });
      const why = sinal ? `terminado por ${sinal}` : `código ${codigo}`;
      reject(new Error(`${cmd} ${why}${err ? `: ${err.trim()}` : ''}`));
    };

    // Depois de o processo sair, o 'close' é o caminho normal: só dispara quando
    // os dois pipes fecham, ou seja, quando o último pedaço já foi lido. O
    // `soffice.exe` do LibreOffice no Windows nunca fecha (deixa um processo
    // filho a segurar o pipe), por isso há a espera pelo silêncio e o tecto.
    const terminar = (code, quemMatou) => {
      codigo = code;
      sinal = quemMatou;
      saiu = true;
      if (timer) clearTimeout(timer);
      child.once('close', fechar);
      if (code !== 127) adiar();
      limite = setTimeout(fechar, TECTO);
    };

    const adiar = () => {
      if (resolvido) return;
      if (espera) clearTimeout(espera);
      espera = setTimeout(fechar, SILENCIO);
    };

    const reporta = (fonte) => (chunk) => {
      const texto = chunk.toString('utf8');
      if (fonte === 'stderr') {
        // O log vai para a consola da interface, por isso chega cada pedaço.
        if (registrar) registrar(texto);
        if (err.length < MAX_ERR) err += texto.slice(0, MAX_ERR);
      }
      // A percentagem só interessa se o binário a der.
      if (leitor) {
        const p = fonte === 'stdout' ? leitor.stdout(texto) : leitor.stderr(texto);
        if (typeof p === 'number' && leitor.aoProgitar) leitor.aoProgitar(p);
      }
      // Saiu o processo e ainda havia dados: o fim tem de esperar por eles.
      if (saiu) adiar();
    };

    child.stderr.on('data', reporta('stderr'));
    child.stdout.on('data', reporta('stdout'));

    // A linha de comando é a informação mais útil de todas: mostra exactamente
    // o que correu. Não tem nada do utilizador, porque em disco o input é
    // `input.<ext>` e o output `output.<ext>` (Regra 8).
    if (registrar) registrar(`$ ${[cmd, ...args].join(' ')}\n`);

    child.on('error', (e) => {
      if (!saiu) {
        codigo = 127;
        saiu = true;
      }
      reject(new Error(`não consegui correr ${cmd}: ${e.message}`));
    });

    child.on('exit', terminar);

    if (timeoutSec > 0) {
      timer = setTimeout(() => child.kill('SIGKILL'), timeoutSec * 1000);
    }
  });
}