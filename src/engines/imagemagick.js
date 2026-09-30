// Imagens e SVG. PDF NÃO entra aqui: o ImageMagick bloqueia PDF por política.
const IMG = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'tiff', 'tif', 'ico'];
const FLAT = ['jpg', 'jpeg', 'bmp']; // sem canal alfa

export default {
  id: 'imagemagick',
  bins: process.platform === 'win32' ? ['magick'] : ['convert'],
  from: [...IMG, 'svg'],
  to: IMG,

  build({ input, output, from, to }) {
    // GIF animado só dá o 1.º fotograma, salvo se o destino também for GIF.
    const src = from === 'gif' && to !== 'gif' ? `${input}[0]` : input;
    const args = [src];
    if (FLAT.includes(to)) args.push('-background', 'white', '-alpha', 'remove', '-alpha', 'off');
    if (to === 'ico') args.push('-resize', '256x256>');
    return { args: [...args, output] };
  },
};
