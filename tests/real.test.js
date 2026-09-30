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

test('txt -> pdf', skip('soffice'), async () => {
  const { data } = await realConvert(registry, 'txt', 'pdf');
  assert.ok(startsWith(data, '25504446'), 'tem de ser PDF');
});
