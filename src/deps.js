// Como instalar cada binário, por sistema. É a resposta honesta à primeira
// coisa que trava quem instala: não basta dizer "instala o ffmpeg", é dizer
// como, no sistema que essa pessoa tem.
//
// O `check` falha se um motor declarar um binário que não esteja aqui, para o
// site nunca mandar alguém atrás de um pacote que não existe em lado nenhum.
export const SISTEMAS = [
  { id: 'debian', nome: 'Debian / Ubuntu', detector: ['linux', 'debian'] },
  { id: 'fedora', nome: 'Fedora / RHEL', detector: ['linux', 'fedora'] },
  { id: 'arch', nome: 'Arch / Manjaro', detector: ['linux', 'arch'] },
  { id: 'alpine', nome: 'Alpine', detector: ['linux', 'alpine'] },
  { id: 'macos', nome: 'macOS', detector: ['darwin'] },
  { id: 'windows', nome: 'Windows', detector: ['win32'] },
];

export const BINARIOS = {
  ffmpeg: {
    nome: 'FFmpeg',
    para: 'áudio e vídeo',
    comandos: {
      debian: 'sudo apt install ffmpeg',
      fedora: 'sudo dnf install ffmpeg',
      arch: 'sudo pacman -S ffmpeg',
      alpine: 'sudo apk add ffmpeg',
      macos: 'brew install ffmpeg',
      windows: 'winget install Gyan.FFmpeg',
    },
  },
  convert: {
    nome: 'ImageMagick',
    para: 'imagens',
    comandos: {
      debian: 'sudo apt install imagemagick',
      fedora: 'sudo dnf install ImageMagick',
      arch: 'sudo pacman -S imagemagick',
      alpine: 'sudo apk add imagemagick',
      macos: 'brew install imagemagick',
      windows: 'winget install ImageMagick.ImageMagick',
    },
  },
  // No Windows o executável chama-se `magick`; nos outros, `convert`.
  magick: {
    nome: 'ImageMagick',
    para: 'imagens',
    comandos: {
      debian: 'sudo apt install imagemagick',
      fedora: 'sudo dnf install ImageMagick',
      arch: 'sudo pacman -S imagemagick',
      alpine: 'sudo apk add imagemagick',
      macos: 'brew install imagemagick',
      windows: 'winget install ImageMagick.ImageMagick',
    },
  },
  soffice: {
    nome: 'LibreOffice',
    para: 'documentos, folhas de cálculo e apresentações',
    comandos: {
      debian: 'sudo apt install libreoffice-writer libreoffice-calc libreoffice-impress',
      fedora: 'sudo dnf install libreoffice-writer libreoffice-calc libreoffice-impress',
      arch: 'sudo pacman -S libreoffice-fresh',
      alpine: 'sudo apk add libreoffice',
      macos: 'brew install --cask libreoffice',
      windows: 'winget install TheDocumentFoundation.LibreOffice',
    },
  },
  pandoc: {
    nome: 'Pandoc',
    para: 'documentos de texto e livros eletrónicos',
    comandos: {
      debian: 'sudo apt install pandoc',
      fedora: 'sudo dnf install pandoc',
      arch: 'sudo pacman -S pandoc',
      alpine: 'sudo apk add pandoc',
      macos: 'brew install pandoc',
      windows: 'winget install JohnMacFarlane.Pandoc',
    },
  },
  pdftoppm: {
    nome: 'poppler',
    para: 'PDF para imagem',
    comandos: {
      debian: 'sudo apt install poppler-utils',
      fedora: 'sudo dnf install poppler-utils',
      arch: 'sudo pacman -S poppler',
      alpine: 'sudo apk add poppler-utils',
      macos: 'brew install poppler',
      windows: 'winget install oschwartz10612.Poppler',
    },
  },
  '7z': {
    nome: '7-Zip',
    para: 'juntar as páginas de um PDF num ZIP',
    comandos: {
      debian: 'sudo apt install p7zip-full',
      fedora: 'sudo dnf install p7zip-full',
      arch: 'sudo pacman -S p7zip',
      alpine: 'sudo apk add p7zip',
      macos: 'brew install p7zip',
      windows: 'winget install 7zip.7zip',
    },
  },
};

export function instrucao(bin) {
  return BINARIOS[bin] || null;
}
