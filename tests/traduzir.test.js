// As traduções das mensagens dos binários. As mensagens aqui dentro são as que
// os binários escreveram de facto nesta máquina: se um binário mudar a
// mensagem, o teste tem de mudar com ela (Regra 15).
import test from 'node:test';
import assert from 'node:assert/strict';
import { traduzir, mensagemDeErro } from '../src/core/traduzir.js';

// Mensagens apanhadas com binários reais, com o caminho já limpo.
const FFMPEG_SEM_AUDIO = [
  'ffmpeg código 4294967274: Input #0, mov,mp4,m4a,3gp,3g2,mj2, from `…\\input.mp4`:',
  'Output #0, mp3, to `…\\output.mp3`:',
  '[out#0/mp3 @ 0000023026bf1e00] Output file does not contain any stream',
].join('\n');

const MAGICK_CORTADO = "magick código 1: magick: unexpected end-of-file `…\\input.png' @ error/png.c/MagickPNGError/1308.";

const MAGICK_CABECALHO = "magick código 1: magick: improper image header `…\\input.png' @ error/png.c/ReadPNGImage/3956.";

const POPPLER_NAO_PDF = [
  'pdftoppm código 1: Syntax Warning: May not be a PDF file (continuing anyway)',
  'Syntax Error: Couldn\'t find trailer dictionary',
].join('\n');

test('um vídeo sem áudio para mp3 diz que não tem áudio', () => {
  assert.equal(traduzir(FFMPEG_SEM_AUDIO, { from: 'mp4', to: 'mp3' }), 'Este ficheiro não tem áudio.');
});

test('o mesmo ffmpeg, para vídeo, diz outra coisa — e não a mesma frase', () => {
  const paraVideo = traduzir(FFMPEG_SEM_AUDIO, { from: 'mp4', to: 'webm' });
  assert.ok(paraVideo, 'tem de haver tradução');
  assert.notEqual(paraVideo, 'Este ficheiro não tem áudio.');
  assert.match(paraVideo, /destino pedido/);
});

test('o nome do formato vem do par, não do texto do binário', () => {
  assert.equal(traduzir('Invalid data found when processing input', { from: 'mp4' }), 'O ficheiro não parece vídeo MP4.');
  assert.equal(traduzir('Invalid data found when processing input', { from: 'naoexiste' }), 'O ficheiro não parece ficheiro.');
});

test('uma imagem cortada e uma imagem que não é imagem', () => {
  assert.equal(traduzir(MAGICK_CORTADO, { from: 'png', to: 'jpg' }), 'O ficheiro parece estar cortado a meio.');
  assert.equal(traduzir(MAGICK_CABECALHO, { from: 'png', to: 'jpg' }), 'O ficheiro não é imagem PNG válido.');
});

test('um PDF que não é PDF', () => {
  assert.equal(traduzir(POPPLER_NAO_PDF, { from: 'pdf', to: 'png' }), 'O ficheiro não é um PDF válido.');
});

test('problemas do servidor não se confundem com ficheiros maus', () => {
  assert.equal(traduzir('Error: ENOSPC: no space left on device'), 'O servidor ficou sem espaço em disco.');
  assert.equal(traduzir('Error: EACCES: permission denied, open `x\''), 'O servidor não teve permissão para escrever o resultado.');
  assert.equal(traduzir('convert: código 1: ficheiro corrompido'), null,
    'isto não é um erro conhecido: o chamador tem de saber que não reconheceu');
});

test('o que ninguém reconhece diz onde ir ver, e nada mais', () => {
  const msg = mensagemDeErro('ffmpeg código 1: qualquer coisa nova', { from: 'mp4', to: 'mp3' });
  assert.equal(msg, 'A conversão falhou. Abre "ver o que o servidor correu" para saber porquê.');
  assert.doesNotMatch(msg, /ffmpeg|código|\\|C:/, 'nem binário, nem código, nem caminho');
});

test('o caminho do servidor nunca passa para a mensagem', () => {
  const msg = mensagemDeErro(
    "soffice código 1: source file could not be loaded `C:\\Users\\alguem\\data\\jobs\\abc\\input.docx'",
    { from: 'docx', to: 'pdf' },
  );
  assert.equal(msg, 'O LibreOffice não conseguiu abrir este ficheiro.');
  assert.doesNotMatch(msg, /C:/);
});