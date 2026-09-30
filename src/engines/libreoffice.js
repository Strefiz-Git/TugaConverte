// Escritório. Um perfil por job, senão o LibreOffice bloqueia o paralelismo.
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const TEXT = ['doc', 'docx', 'odt', 'rtf', 'txt', 'html'];
const SHEET = ['xls', 'xlsx', 'ods', 'csv'];
const SLIDE = ['ppt', 'pptx', 'odp'];

const TARGETS = {
  text: ['pdf', 'docx', 'odt', 'rtf', 'txt', 'html'],
  sheet: ['pdf', 'xlsx', 'ods', 'csv', 'html'],
  slide: ['pdf', 'pptx', 'odp'],
};

const family = (ext) =>
  TEXT.includes(ext) ? 'text' : SHEET.includes(ext) ? 'sheet' : SLIDE.includes(ext) ? 'slide' : null;

export default {
  id: 'libreoffice',
  bins: ['soffice'],
  from: [...TEXT, ...SHEET, ...SLIDE],
  to: [...new Set(Object.values(TARGETS).flat())],

  supports: (from, to) => (TARGETS[family(from)] || []).includes(to) && from !== to,

  build({ input, to, dir }) {
    // O perfil tem de ser um URL file:// bem formado. Com `file://${dir}` o
    // Windows produz `file://C:\Users\...`, que o LibreOffice não percebe e
    // fica à espera de um perfil que nunca chega: o job bloqueia para sempre.
    const perfil = pathToFileURL(join(dir, 'profile')).href;
    return {
      args: [
        '--headless', '--norestore', '--invisible',
        `-env:UserInstallation=${perfil}`,
        '--convert-to', to, '--outdir', dir, input,
      ],
      // O LibreOffice deriva o nome do input, não escreve output.ext.
      produced: `input.${to}`,
    };
  },
};
