import libreoffice from './libreoffice.js';
import pandoc from './pandoc.js';
import pdfzip from './pdfzip.js';
import poppler from './poppler.js';
import imagemagick from './imagemagick.js';
import ffmpeg from './ffmpeg.js';

// A ORDEM DECIDE: o primeiro motor que suporta o par ganha.
export default [libreoffice, pandoc, pdfzip, poppler, imagemagick, ffmpeg];
