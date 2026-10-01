// A stderr do binário é escrita para quem sabe de binários. A pessoa que
// largou o ficheiro quer uma frase em português, sem caminhos do servidor e
// sem códigos de saída. A consola da interface continua a ter tudo, linha a
// linha: aqui só muda a frase que aparece ao lado do ficheiro.
//
// Os padrões abaixo não são inventados: são as mensagens que os binários
// desta máquina escreveram de facto, testadas em `tests/traduzir.test.js`.

const SUBSTANTIVO = {
  pdf: 'PDF', png: 'imagem PNG', jpg: 'imagem JPEG', jpeg: 'imagem JPEG',
  webp: 'imagem WebP', gif: 'imagem GIF', svg: 'imagem SVG', bmp: 'imagem BMP',
  tiff: 'imagem TIFF', tif: 'imagem TIFF', ico: 'ícone',
  mp4: 'vídeo MP4', webm: 'vídeo WebM', mkv: 'vídeo Matroska', avi: 'vídeo AVI',
  mov: 'vídeo QuickTime', flv: 'vídeo FLV', wmv: 'vídeo WMV', m4v: 'vídeo MP4',
  mp3: 'áudio MP3', wav: 'áudio WAV', ogg: 'áudio OGG', flac: 'áudio FLAC',
  aac: 'áudio AAC', m4a: 'áudio M4A', opus: 'áudio Opus', aiff: 'áudio AIFF',
  wma: 'áudio WMA',
  doc: 'documento Word', docx: 'documento Word', odt: 'documento OpenDocument',
  rtf: 'documento RTF', txt: 'texto', html: 'página HTML',
  md: 'Markdown', epub: 'livro EPUB', rst: 'reStructuredText', tex: 'LaTeX',
  xls: 'folha de cálculo', xlsx: 'folha de cálculo Excel', ods: 'folha de cálculo OpenDocument',
  csv: 'CSV', ppt: 'apresentação', pptx: 'apresentação PowerPoint',
  odp: 'apresentação OpenDocument',
};

const substantivo = (ext) => SUBSTANTIVO[ext] || 'ficheiro';

const AUDIO = ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'opus', 'aiff', 'wma'];

/**
 * Uma frase em português para o erro que o binário deu. Devolve `null` quando
 * não reconhece a causa, para o chamador decidir o fallback.
 *
 * @param {string} erro a mensagem que o `runner` compôs, stderr incluído
 * @param {{from?: string, to?: string}} contexto o par que se pedia
 */
export function traduzir(erro, { from, to } = {}) {
  const texto = String(erro || '');
  const e = (p) => p.test(texto);

  // O disco ou as permissões são do servidor, não do ficheiro da pessoa.
  if (e(/ENOSPC|No space left/i)) return 'O servidor ficou sem espaço em disco.';
  if (e(/EACCES|Permission denied/i)) return 'O servidor não teve permissão para escrever o resultado.';
  if (e(/ENOENT|No such file or directory/i)) return 'O ficheiro desapareceu do servidor antes de a conversão acabar.';
  if (e(/tempo limite|timed out|SIGKILL/i)) return 'A conversão demorou demasiado tempo e foi interrompida.';

  // ffmpeg
  if (e(/Output file does not contain any stream/i)) {
    return AUDIO.includes(to)
      ? 'Este ficheiro não tem áudio.'
      : 'Este ficheiro não tem nada que se converta para o destino pedido.';
  }
  if (e(/Stream map .* matches no streams/i)) return 'A faixa pedida não existe neste ficheiro.';
  if (e(/Invalid data found when processing input/i)) {
    return `O ficheiro não parece ${substantivo(from)}.`;
  }
  if (e(/Unknown encoder|Unknown format|Requested output format/i)) {
    return 'Este servidor não sabe escrever neste formato.';
  }

  // ImageMagick
  if (e(/unexpected end-of-file|truncated/i)) return 'O ficheiro parece estar cortado a meio.';
  if (e(/improper image header|not a PNG|not a JPEG|no decode delegate|missing an image/i)) {
    return `O ficheiro não é ${substantivo(from)} válido.`;
  }

  // poppler
  if (e(/May not be a PDF|Couldn't find trailer|Couldn't read xref|Syntax Error/i)) {
    return 'O ficheiro não é um PDF válido.';
  }

  // LibreOffice
  if (e(/source file could not be loaded|Please verify input parameters/i)) {
    return 'O LibreOffice não conseguiu abrir este ficheiro.';
  }
  if (e(/General input\/output error/i)) {
    return 'O LibreOffice não conseguiu escrever o resultado.';
  }

  // pandoc
  if (e(/Could not parse|Unknown reader|does not look like|PandocResourceNotFound/i)) {
    return 'O Pandoc não percebeu o ficheiro de entrada.';
  }

  // 7-Zip e afins
  if (e(/is not archive|End of central directory|Can not open|Unexpected end of archive/i)) {
    return 'O arquivo não pôde ser aberto.';
  }

  return null;
}

/** A frase que a pessoa vê. Curta, em português, sem caminhos do servidor. */
export function mensagemDeErro(erro, contexto) {
  return traduzir(erro, contexto)
    || 'A conversão falhou. Abre "ver o que o servidor correu" para saber porquê.';
}