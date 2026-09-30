// As opções por conversão: o que aceitamos, o que limitamos e o que o motor
// faz com isso. O teste com binário real prova que a opção muda o resultado.
import test from 'node:test';
import assert from 'node:assert/strict';
import { validar, catalogoOpcoes, opcoesDe } from '../src/core/opcoes.js';
import imagemagick from '../src/engines/imagemagick.js';
import ffmpeg from '../src/engines/ffmpeg.js';

const base = { input: 'C:/x/input.png', output: 'C:/x/output.jpg', dir: 'C:/x' };

test('as opções por omissão são as do motor', () => {
  assert.deepEqual(validar('jpg', {}), { qualidade: 92 });
  assert.deepEqual(validar('mp3', {}), { bitrate: 128 });
  assert.deepEqual(validar('txt', {}), {}, 'txt não tem opções, e não se inventa');
  assert.deepEqual(validar('wav', {}), {}, 'wav é sem perdas: um bitrate seria mentira');
});

test('um valor fora do intervalo é limitado, não recusado', () => {
  assert.deepEqual(validar('jpg', { qualidade: '500' }), { qualidade: 100 });
  assert.deepEqual(validar('jpg', { qualidade: '0' }), { qualidade: 1 });
  assert.deepEqual(validar('mp3', { bitrate: '8' }), { bitrate: 32 });
  assert.deepEqual(validar('mp3', { bitrate: '9999' }), { bitrate: 320 });
});

test('um valor que não é número fica no omisso, e há arredondamento', () => {
  assert.deepEqual(validar('jpg', { qualidade: 'alta' }), { qualidade: 92 });
  assert.deepEqual(validar('jpg', { qualidade: '' }), { qualidade: 92 });
  assert.deepEqual(validar('jpg', { qualidade: '55.6' }), { qualidade: 56 });
  assert.deepEqual(validar('jpg', { qualidade: 'lixo' }), { qualidade: 92 });
});

test('o catálogo diz à UI o que cada destino aceita', () => {
  const catalogo = catalogoOpcoes();
  assert.ok(catalogo.total > 0);
  assert.deepEqual(catalogo.destinos.jpg[0], { chave: 'qualidade', min: 1, max: 100, padrao: 92 });
  assert.equal(catalogo.destinos.png, undefined, 'png não tem qualidade, e não aparece');
  assert.deepEqual(opcoesDe('jpg'), opcoesDe('jpg'), 'devolve cópias, não o original');
});

test('o ImageMagick passa a qualidade só onde ela existe', () => {
  const comOpcoes = imagemagick.build({ ...base, from: 'png', to: 'jpg', opcoes: { qualidade: 30 } });
  assert.ok(comOpcoes.args.includes('-quality'), 'tem de passar a qualidade');
  assert.equal(comOpcoes.args[comOpcoes.args.indexOf('-quality') + 1], '30');

  const semOpcoes = imagemagick.build({ ...base, from: 'png', to: 'png' });
  assert.ok(!semOpcoes.args.includes('-quality'), 'para png não há qualidade');

  // Um `.jpg` com qualidade não pode perder o `-alpha` que se pedia antes.
  const paraJpeg = imagemagick.build({ ...base, from: 'png', to: 'jpeg', opcoes: { qualidade: 80 } });
  assert.ok(paraJpeg.args.includes('-alpha'), 'o flatten continua a acontecer');
});

test('o ffmpeg passa o bitrate só em áudio com perdas', () => {
  const wav = ffmpeg.build({ ...base, to: 'wav', opcoes: { bitrate: 200 } });
  assert.ok(!wav.args.includes('-b:a'), 'wav é sem perdas, o bitrate não se aplica');

  const mp3 = ffmpeg.build({ ...base, to: 'mp3', opcoes: { bitrate: 192 } });
  const i = mp3.args.indexOf('-b:a');
  assert.ok(i > -1, 'o mp3 tem bitrate');
  assert.equal(mp3.args[i + 1], '192k');
  assert.ok(mp3.args.includes('-vn'), 'e continua a ser só áudio');
});
