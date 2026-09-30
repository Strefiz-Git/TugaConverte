import test from 'node:test';
import assert from 'node:assert/strict';
import { createRegistry } from '../src/core/registry.js';
import engines from '../src/engines/index.js';
import { fakeEngine, registryWith } from './helpers.js';

const all = await createRegistry({ engines, has: async () => true });

test('a ordem decide: pandoc ganha md -> html contra libreoffice', () => {
  assert.equal(all.find('md', 'html')?.id, 'pandoc');
});

test('encontra os pares principais de cada motor', () => {
  const expected = {
    'docx|pdf': 'libreoffice',
    'xlsx|csv': 'libreoffice',
    'pptx|pdf': 'libreoffice',
    'md|epub': 'pandoc',
    'html|txt': 'libreoffice',
    'html|md': 'pandoc',
    'pdf|png': 'poppler',
    'png|jpg': 'imagemagick',
    'svg|webp': 'imagemagick',
    'mp3|wav': 'ffmpeg',
    'mp4|gif': 'ffmpeg',
    'mkv|webm': 'ffmpeg',
  };
  for (const [pair, id] of Object.entries(expected)) {
    const [from, to] = pair.split('|');
    assert.equal(all.find(from, to)?.id, id, `${pair} devia resolver para ${id}`);
  }
});

test('recusa pares absurdos ou iguais', () => {
  assert.equal(all.find('png', 'png'), null);
  assert.equal(all.find('mp3', 'mp4'), null, 'áudio não vira vídeo');
  assert.equal(all.find('mp3', 'docx'), null);
  assert.equal(all.find('', 'pdf'), null);
  assert.equal(all.find('xyz', 'pdf'), null);
});

test('um motor sem os seus binários fica inativo', async () => {
  const registry = await createRegistry({ engines, has: async (b) => b !== 'pandoc' });
  assert.equal(registry.find('md', 'epub'), null);
  assert.ok(!registry.engines.some((e) => e.id === 'pandoc'));
});

test('a procura de binários é assíncrona: sem await, tudo pareceria ativo', async () => {
  const registry = await createRegistry({ engines, has: async () => false });
  assert.deepEqual(registry.engines, [], 'nenhum binário existe, nenhum motor pode estar ativo');
  assert.deepEqual(registry.formats(), {});
});

test('formats() só oferece destinos que existem para a origem', () => {
  const matrix = all.formats();
  assert.ok(matrix.png.includes('webp'));
  assert.ok(!matrix.mp3.includes('mp4'), 'mp3 não oferece mp4');
  assert.ok(matrix.docx.includes('pdf'));
});

test('o catálogo conta por família e só o que está ativo', async () => {
  const catalogo = all.catalogo();
  assert.equal(catalogo.total, catalogo.categorias.reduce((s, c) => s + c.total, 0));

  const imagem = catalogo.categorias.find((c) => c.id === 'imagem');
  assert.equal(imagem.nome, 'Imagens');
  assert.ok(imagem.total >= 9);
  const extensoes = imagem.extensoes.map((f) => f.ext);
  assert.ok(extensoes.includes('png') && extensoes.includes('svg'));
  // Nomes legíveis onde valem a pena, e nada inventado.
  assert.equal(imagem.extensoes.find((f) => f.ext === 'jpg').nome, 'JPEG');
  assert.equal(imagem.extensoes.find((f) => f.ext === 'png').nome, 'PNG');

  // Um motor sem binário não pode entrar no catálogo: a contagem seria mentira.
  const soImagem = await createRegistry({ engines, has: async (b) => b === 'convert' || b === 'magick' });
  const parcial = soImagem.catalogo();
  assert.deepEqual(parcial.categorias.map((c) => c.id), ['imagem']);
  assert.equal(parcial.total, 10);
});

test('um formato sem família não aparece no catálogo', async () => {
  const registry = await registryWith([fakeEngine({ from: ['x'], to: ['y'] })]);
  assert.deepEqual(registry.catalogo(), { total: 0, categorias: [] });
});

test('suporta() do motor falso decide', async () => {
  const engine = fakeEngine({ from: ['x'], to: ['y', 'z'] });
  const registry = await registryWith([engine]);
  assert.equal(registry.find('x', 'z')?.id, 'falso');
  assert.equal(registry.find('x', 'w'), null);
});
