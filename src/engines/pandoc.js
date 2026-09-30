// Documentos de texto. As extensões do site não são as do pandoc.
const IN = { md: 'markdown', html: 'html', docx: 'docx', odt: 'odt', epub: 'epub', rst: 'rst', tex: 'latex' };
const OUT = { md: 'markdown', html: 'html5', docx: 'docx', odt: 'odt', epub: 'epub', rst: 'rst', tex: 'latex', txt: 'plain' };

export default {
  id: 'pandoc',
  bins: ['pandoc'],
  from: Object.keys(IN),
  to: Object.keys(OUT),

  build({ input, output, from, to }) {
    const args = ['-f', IN[from], '-t', OUT[to], '-o', output];
    // Documentos completos: sem isto o HTML/epub sai sem esqueleto.
    if (to === 'html' || to === 'epub') args.push('-s');
    return { args: [...args, input] };
  },
};
