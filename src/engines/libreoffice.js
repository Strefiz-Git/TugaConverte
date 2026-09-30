// Escritório. Um perfil por job, senão o LibreOffice bloqueia o paralelismo.
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
    return {
      args: [
        '--headless', '--norestore', '--invisible',
        `-env:UserInstallation=file://${dir}/profile`,
        '--convert-to', to, '--outdir', dir, input,
      ],
      // O LibreOffice deriva o nome do input, não escreve output.ext.
      produced: `input.${to}`,
    };
  },
};
