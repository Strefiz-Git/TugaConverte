// Progresso de conversão, quando o binário o sabe dizer.
//
// Nem todos os binários falam: o ffmpeg dá o tempo processado no stdout e a
// duração no stderr, e o ImageMagick dá percentagem no stderr com `-monitor`.
// O LibreOffice, o Pandoc e o poppler não dizem nada, e o motor declara isso
// com `progresso: false` — a barra fica indeterminada em vez de inventar
// números. Um motor que não sabe nunca finge que sabe.

// ffmpeg: `out_time_us=1866667` no stdout, e `Duration: 00:00:02.00` no stderr.
function duracaoDe(texto) {
  const achado = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(texto);
  if (!achado) return null;
  return Number(achado[1]) * 3600 + Number(achado[2]) * 60 + Number(achado[3]);
}

export function criarLeitorFfmpeg() {
  let duracao = null;
  let micro = 0;
  return {
    // O stderr chega primeiro (a duração é anunciada no arranque).
    stderr(texto) {
      const d = duracaoDe(texto);
      if (d) duracao = d;
      return null;
    },
    stdout(texto) {
      for (const linha of texto.split('\n')) {
        const m = /^out_time_us=(\d+)/.exec(linha.trim());
        if (m) micro = Number(m[1]);
      }
      if (!duracao || micro <= 0) return null;
      return Math.min(100, Math.round((micro / 1e6 / duracao) * 100));
    },
  };
}

// ImageMagick: `resize image[...]: 42 of 200, 21% complete` no stderr.
export function criarLeitorImagemMagick() {
  let ultimo = null;
  return {
    stderr(texto) {
      const m = /(\d+)% complete/.exec(texto);
      if (m) ultimo = Math.min(100, Number(m[1]));
      return ultimo;
    },
    stdout() { return ultimo; },
  };
}

/** Escolhe o leitor a partir da declaração do motor. */
export function criarLeitor(motor) {
  if (!motor.progresso) return null;
  return motor.progresso === 'ffmpeg' ? criarLeitorFfmpeg() : criarLeitorImagemMagick();
}
