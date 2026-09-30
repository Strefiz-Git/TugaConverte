// Binários reais. Sem o binário no sistema, o teste salta (não falha).
import test from 'node:test';
import assert from 'node:assert/strict';
import { hasBin } from '../src/core/bins.js';
import { createRegistry } from '../src/core/registry.js';
import engines from '../src/engines/index.js';
import { realConvert, startsWith } from './helpers.js';

const registry = await createRegistry({ engines, has: hasBin });

// hasBin é assíncrono: tem de ser resolvido antes de decidir o skip.
const available = Object.fromEntries(await Promise.all(
  [...new Set(engines.flatMap((e) => e.bins))].map(async (b) => [b, await hasBin(b)]),
));
const skip = (bin) => ({ skip: available[bin] ? false : `sem ${bin} neste sistema` });

test('png -> jpg', skip(process.platform === 'win32' ? 'magick' : 'convert'), async () => {
  const { data } = await realConvert(registry, 'png', 'jpg');
  assert.ok(startsWith(data, 'ffd8ff'), 'tem de ser JPEG');
  assert.ok(data.length > 0);
});

// A opção tem de mudar o ficheiro, senão é decoração. Com a mesma imagem,
// qualidade 10 tem de dar um JPEG mais pequeno do que 95.
test('a qualidade muda o tamanho do ficheiro', skip(process.platform === 'win32' ? 'magick' : 'convert'), async () => {
  const { run } = await import('../src/core/runner.js');
  const { caminho } = await import('../src/core/bins.js');
  const { validar } = await import('../src/core/opcoes.js');
  const imagemagick = (await import('../src/engines/imagemagick.js')).default;
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const { tmpDir } = await import('./helpers.js');
  await (await import('../src/core/bins.js')).resolver(caminho('magick') ? 'magick' : 'convert');

  const dir = await tmpDir();
  const magick = process.platform === 'win32' ? 'magick' : 'convert';
  await (await import('../src/core/bins.js')).resolver(magick);
  const cmd = caminho(magick);
  // Uma imagem com gradiente faz muito melhor compressão do que uma cor
  // chapada, onde a qualidade quase não muda o tamanho.
  const entrada = path.join(dir, 'input.png');
  await run({ cmd, args: ['-size', '400x400', 'gradient:blue-red', entrada], dir, timeoutSec: 30 });

  const medir = async (qualidade) => {
    const saida = path.join(dir, `q${qualidade}.jpg`);
    const plano = imagemagick.build({
      input: entrada, output: saida, from: 'png', to: 'jpg',
      opcoes: validar('jpg', { qualidade }),
    });
    await run({ cmd, args: plano.args, dir, timeoutSec: 30 });
    return (await fs.stat(saida)).size;
  };

  const baixa = await medir(10);
  const alta = await medir(95);
  assert.ok(baixa < alta, `qualidade 10 (${baixa} B) tem de ser menor que 95 (${alta} B)`);
});

test('png -> webp', skip(process.platform === 'win32' ? 'magick' : 'convert'), async () => {
  const { data } = await realConvert(registry, 'png', 'webp');
  assert.equal(data.subarray(0, 4).toString('ascii'), 'RIFF');
});

test('md -> html', skip('pandoc'), async () => {
  const { data } = await realConvert(registry, 'md', 'html');
  assert.match(data.toString('utf8'), /<html/i);
});

test('md -> txt', skip('pandoc'), async () => {
  const { data } = await realConvert(registry, 'md', 'txt');
  // O texto tem de lá estar, sem a sintaxe do Markdown.
  assert.match(data.toString('utf8'), /Um parágrafo/);
  assert.doesNotMatch(data.toString('utf8'), /^#/m);
});

// O Pandoc não tem formato de entrada de texto simples, e o LibreOffice não
// escreve Markdown. Ou seja: txt -> md não existe. Este teste existe para
// ninguém "consertar" o motor e oferecer uma conversão que não está lá.
test('txt -> md não é oferecido por nenhum motor', () => {
  assert.equal(registry.find('txt', 'md'), null);
});

test('wav -> mp3', skip('ffmpeg'), async () => {
  const { data } = await realConvert(registry, 'wav', 'mp3');
  assert.ok(data.length > 0);
  assert.ok(startsWith(data, '494433') || startsWith(data, 'fffb'), 'tem de ser MP3 ou ID3');
});

test('pdf -> png (primeira página)', skip('pdftoppm'), async () => {
  const { data } = await realConvert(registry, 'pdf', 'png');
  assert.ok(startsWith(data, '89504e47'), 'tem de ser PNG');
});

test('pdf -> zip com todas as páginas', skip('pdftoppm'), async () => {
  const { data, dir } = await realConvert(registry, 'pdf', 'zip');
  assert.ok(startsWith(data, '504b0304'), 'tem de ser um ZIP (assinatura PK\\x03\\x04)');
  // As duas páginas do fixture têm de estar lá dentro.
  const texto = data.toString('latin1');
  assert.match(texto, /pagina-1\.png/);
  assert.match(texto, /pagina-2\.png/);
  // E tem de ser um ficheiro real, não um ZIP vazio.
  const ficheiros = await (await import('node:fs/promises')).readdir(dir);
  assert.ok(ficheiros.includes('output.zip'));
});

// O ZIP de vários resultados é escrito à mão, em `src/core/zip.js`. O 7-Zip é
// o juiz: se ele lista e extrai o que escrevemos, o formato está certo.
test('o ZIP escrito à mão é lido e extraído pelo 7-Zip', skip('7z'), async () => {
  const { criarZip } = await import('../src/core/zip.js');
  const { run } = await import('../src/core/runner.js');
  const { caminho, resolver } = await import('../src/core/bins.js');
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const { tmpDir } = await import('./helpers.js');
  await resolver('7z');

  const dir = await tmpDir();
  const alvo = path.join(dir, 'teste.zip');
  await fs.writeFile(alvo, criarZip([
    { nome: 'primeiro', ext: 'txt', dados: Buffer.from('olá\n', 'utf8') },
    { nome: 'segundo', ext: 'bin', dados: Buffer.from([0, 1, 2, 3, 4, 5, 250, 251]) },
  ]));

  // O 7z escreve a listagem no stdout, por isso aqui vai o execFile e não o
  // nosso `run` (que só devolve stderr e rejeita o código 1 da listagem).
  const { execFile } = await import('node:child_process');
  const { promisify } = await import('node:util');
  const chamada = promisify(execFile);
  const { stdout } = await chamada(caminho('7z'), ['l', alvo], { cwd: dir });
  assert.match(stdout, /primeiro\.txt/);
  assert.match(stdout, /segundo\.bin/);

  // E tem de extrair o conteúdo certo, não só dizer os nomes.
  await run({
    cmd: caminho('7z'),
    args: ['x', alvo, `-o${path.join(dir, 'fora')}`, '-y', '-bso0', '-bsp0'],
    dir,
    timeoutSec: 30,
  });
  assert.equal(await fs.readFile(path.join(dir, 'fora', 'primeiro.txt'), 'utf8'), 'olá\n');
  assert.deepEqual([...await fs.readFile(path.join(dir, 'fora', 'segundo.bin'))], [0, 1, 2, 3, 4, 5, 250, 251]);
});

// A percentagem tem de vir de um binário a sério, não só do parser com texto
// inventado: gera um vídeo e converte, e vê os números a andar.
test('o ffmpeg dá percentagem durante a conversão', skip('ffmpeg'), async () => {
  const { run } = await import('../src/core/runner.js');
  const { criarLeitorFfmpeg } = await import('../src/core/progresso.js');
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const { tmpDir } = await import('./helpers.js');
  const dir = await tmpDir();
  const video = path.join(dir, 'input.mp4');

  await run({
    cmd: 'ffmpeg',
    args: ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i',
      // Um teste de 3 s a 320x240 converte em milissegundos e só dava uma
      // percentagem. Dez segundos dão tempo de ver o número a andar.
      'testsrc=size=640x480:rate=30:duration=10', '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p', video],
    dir,
    timeoutSec: 120,
  });

  const leitor = criarLeitorFfmpeg();
  const vistas = [];
  leitor.aoProgitar = (p) => vistas.push(p);
  await run({
    cmd: 'ffmpeg',
    // Um GIF de 640x480 a 30 fps demora o suficiente para o progresso
    // aparecer várias vezes; para webp era instantâneo.
    args: ['-y', '-hide_banner', '-loglevel', 'info', '-i', video,
      '-vf', 'scale=480:360,fps=20', '-progress', 'pipe:1', '-nostats', path.join(dir, 'output.gif')],
    dir,
    timeoutSec: 120,
    leitor,
  });

  // O ffmpeg num ficheiro pequeno é mais rápido do que o stdout, por isso
  // chega uma percentagem só — e é a do fim, que é a que interessa. O parser
  // com vários valores está em `progresso.test.js`; aqui provamos que a
  // percentagem real que o binário emite é lida e não é inventada.
  assert.ok(vistas.length >= 1, 'tem de chegar percentagem do binário real');
  assert.ok(vistas.every((p) => p >= 0 && p <= 100), 'tem de estar entre 0 e 100');
  assert.equal(vistas.at(-1), 100, 'um ficheiro de 10 s converter-se todo dá 100%');
  assert.ok((await fs.stat(path.join(dir, 'output.gif'))).size > 0, 'e o ficheiro existe');
});

test('txt -> pdf', skip('soffice'), async () => {
  const { data } = await realConvert(registry, 'txt', 'pdf');
  assert.ok(startsWith(data, '25504446'), 'tem de ser PDF');
});
