// Onde está cada binário. `where`/`which` primeiro; se não aparecer, procuramos
// nos sítios onde os instaladores costumam pô-lo sem o pôr no PATH. No Windows
// é o caso comum: instalar o LibreOffice deixa o programa em
// `C:\Program Files\LibreOffice\program` e nunca mais lá volta.
import { execFile } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);
const probe = process.platform === 'win32'
  ? (bin) => run('where', [bin])
  : (bin) => run('which', [bin]);

const resolvidos = new Map();

// Só para o Windows: em Linux e macOS o `which` chega, e inventar caminhos
// aí seria adivinhar. Estes são os instaladores que põem o programa numa pasta
// e não a acrescentam ao PATH, o que fazia o site dizer "em falta" com o
// software instalado.

// Caminhos fixos: existe ou não, acabou.
const FIXOS = {
  soffice: [
    'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
    'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
  ],
  '7z': [
    'C:\\Program Files\\7-Zip\\7z.exe',
    'C:\\Program Files (x86)\\7-Zip\\7z.exe',
  ],
};

// Pastas com a versão no nome: ImageMagick-7.1.2-Q16-HDRI.
const COM_VERSAO = { magick: { pasta: 'C:\\Program Files', prefixo: 'imagemagick', exe: 'magick.exe' } };

function noWindows(bin) {
  for (const fixo of FIXOS[bin] || []) {
    if (existsSync(fixo)) return fixo;
  }
  const comVersao = COM_VERSAO[bin];
  if (!comVersao) return null;
  for (const entrada of safeReadDir(comVersao.pasta)) {
    if (!entrada.toLowerCase().startsWith(comVersao.prefixo)) continue;
    const completo = join(comVersao.pasta, entrada, comVersao.exe);
    if (existsSync(completo)) return completo;
  }
  return null;
}

function safeReadDir(pasta) {
  try { return readdirSync(pasta); } catch { return []; }
}

/** Caminho em cache, já resolvido no arranque. `null` se não existir. */
export function caminho(bin) {
  return resolvidos.get(bin) ?? null;
}

/**
 * Procura o binário e guarda o caminho. Chamar no arranque: devolve o caminho
 * absoluto se o encontrarmos fora do PATH, o nome se estiver no PATH, `null`
 * se não existir. O `runner` usa este valor, por isso um binário encontrado
 * fora do PATH continua a ser executável.
 */
export async function resolver(bin) {
  if (resolvidos.has(bin)) return resolvidos.get(bin);
  const noPath = await probe(bin).then(() => bin).catch(() => null);
  const achado = noPath || noWindows(bin);
  resolvidos.set(bin, achado);
  return achado;
}

/** true/false, com o caminho já em cache. */
export async function hasBin(bin) {
  return (await resolver(bin)) !== null;
}
