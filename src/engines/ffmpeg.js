// Áudio e vídeo. `build` devolve argumentos, não corre nada (Regra 7).
const AUDIO = ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'opus', 'aiff', 'wma'];
const VIDEO = ['mp4', 'webm', 'mkv', 'avi', 'mov', 'flv', 'wmv', 'm4v', 'mpeg', '3gp'];
const VIDEO_OUT = ['mp4', 'webm', 'mkv', 'avi', 'mov', 'flv', 'wmv', 'm4v'];

export default {
  id: 'ffmpeg',
  bins: ['ffmpeg'],
  from: [...AUDIO, ...VIDEO, 'gif'],
  to: [...AUDIO, ...VIDEO_OUT, 'gif'],

  // Áudio nunca vira vídeo; GIF só sai de vídeo.
  supports(from, to) {
    if (AUDIO.includes(from)) return AUDIO.includes(to) && to !== from;
    if (to === 'gif') return VIDEO.includes(from);
    return to !== from;
  },

  build({ input, output, to }) {
    const args = ['-y', '-hide_banner', '-loglevel', 'error', '-i', input];
    if (AUDIO.includes(to)) args.push('-vn');
    if (to === 'gif') args.push('-vf', 'fps=12,scale=480:-1:flags=lanczos');
    if (to === 'mp4' || to === 'mov') {
      // yuv420p + dimensões pares: senão muitos leitores recusam o ficheiro.
      args.push('-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-vf', 'pad=ceil(iw/2)*2:ceil(ih/2)*2');
    }
    return { args: [...args, output] };
  },
};
