// Progresso de conversão, quando o binário o sabe dizer.
//
// Nem todos os binários falam: o ffmpeg dá o tempo processado no stdout e a
// duração no stderr, e o ImageMagick dá percentagem no stderr com `-monitor`.
// O LibreOffice, o Pandoc e o poppler não dizem nada, e o motor declara isso
// com `progresso: false` — a barra fica indeterminada em vez de inventar
// números. Um motor que não sabe nunca finge que sabe.

// O que chega do binário vem em pedaços que podem cortar uma linha ao meio:
// stdout e stderr são pipes, não terminais. O ffmpeg announce a duração em
// duas escritas (`Duration:` numa, `00:00:10.00` na seguinte) e sem isto a
// percentagem falhava uma conversão em cada doze — a mesma, sempre a que o
// pipe cortou a linha. Por isso guardamos o bocado que ficou pela frente e
// juntamo-lo ao pedaço seguinte.
function linhas() {
  let resto = '';
  return (texto) => {
    const junto = resto + texto;
    const corte = junto.lastIndexOf('\n');
    resto = corte < 0 ? junto : junto.slice(corte + 1);
    return junto;
  };
}

// ffmpeg: `out_time_us=1866667` no stdout, e `Duration: 00:00:02.00` no stderr.
function duracaoDe(texto) {
  const achado = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(texto);
  if (!achado) return null;
  return Number(achado[1]) * 3600 + Number(achado[2]) * 60 + Number(achado[3]);
}

export function criarLeitorFfmpeg() {
  let duracao = null;
  let micro = 0;
  const stderr = linhas();
  const stdout = linhas();
  // A percentagem depende das duas coisas, e a ordem em que chegam não é
  // garantida: o ffmpeg escreve a duração no stderr e o progresso no stdout, e
  // o Node entrega-os como calhar. Por isso cada um recalcula a partir do que
  // já sabe, e o último a chegar entrega o número.
  const percentagem = () => (duracao && micro > 0
    ? Math.min(100, Math.round((micro / 1e6 / duracao) * 100))
    : null);
  return {
    stderr(texto) {
      const d = duracaoDe(stderr(texto));
      if (d) duracao = d;
      return percentagem();
    },
    stdout(texto) {
      for (const linha of stdout(texto).split('\n')) {
        const m = /^out_time_us=(\d+)/.exec(linha.trim());
        if (m) micro = Number(m[1]);
      }
      return percentagem();
    },
  };
}

// ImageMagick: `resize image[...]: 42 of 200, 21% complete` no stderr.
export function criarLeitorImagemMagick() {
  let ultimo = null;
  const stderr = linhas();
  return {
    stderr(texto) {
      const m = /(\d+)% complete/.exec(stderr(texto));
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