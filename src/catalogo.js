// O catálogo é a única fonte de verdade sobre o que é um formato e de que
// família é. Os motores não repetem esta informação: o `check` garante que
// nenhum formato fica sem família, em vez de os dois lados divergirem.
export const CATEGORIAS = [
  { id: 'documento', nome: 'Documentos' },
  { id: 'livro', nome: 'Livros eletrónicos' },
  { id: 'folha', nome: 'Folhas de cálculo' },
  { id: 'apresentacao', nome: 'Apresentações' },
  { id: 'imagem', nome: 'Imagens' },
  { id: 'audio', nome: 'Áudio' },
  { id: 'video', nome: 'Vídeo' },
];

const FAMILIA = {
  // Documentos
  doc: 'documento', docx: 'documento', odt: 'documento', rtf: 'documento',
  txt: 'documento', html: 'documento', md: 'documento', rst: 'documento',
  tex: 'documento', pdf: 'documento',
  // Livros eletrónicos
  epub: 'livro',
  // Folhas de cálculo
  xls: 'folha', xlsx: 'folha', ods: 'folha', csv: 'folha',
  // Apresentações
  ppt: 'apresentacao', pptx: 'apresentacao', odp: 'apresentacao',
  // Imagens
  png: 'imagem', jpg: 'imagem', jpeg: 'imagem', webp: 'imagem', gif: 'imagem',
  bmp: 'imagem', tiff: 'imagem', tif: 'imagem', ico: 'imagem', svg: 'imagem',
  // Áudio
  mp3: 'audio', wav: 'audio', ogg: 'audio', flac: 'audio', aac: 'audio',
  m4a: 'audio', opus: 'audio', aiff: 'audio', wma: 'audio',
  // Vídeo
  mp4: 'video', webm: 'video', mkv: 'video', avi: 'video', mov: 'video',
  flv: 'video', wmv: 'video', m4v: 'video', mpeg: 'video', '3gp': 'video',
};

// Só os formatos em que o nome próprio vale mais que a extensão em maiúsculas.
const NOMES = {
  docx: 'Word', xlsx: 'Excel', pptx: 'PowerPoint', odt: 'OpenDocument',
  html: 'HTML', tex: 'LaTeX', rst: 'reStructuredText', svg: 'SVG',
  jpg: 'JPEG', jpeg: 'JPEG', tiff: 'TIFF', tif: 'TIFF', md: 'Markdown',
  mp3: 'MP3', wav: 'WAV', aac: 'AAC', m4a: 'M4A', aiff: 'AIFF', wma: 'WMA',
  mp4: 'MP4', mpeg: 'MPEG', '3gp': '3GP',
};

const CATEGORIAS_VALIDAS = new Set(CATEGORIAS.map((c) => c.id));

export function familia(extension) {
  const f = FAMILIA[extension];
  return CATEGORIAS_VALIDAS.has(f) ? f : null;
}

export function nome(extension) {
  return NOMES[extension] || extension.toUpperCase();
}
