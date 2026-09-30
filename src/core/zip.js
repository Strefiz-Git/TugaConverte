// Um ZIP mínimo, escrito à mão, para juntar vários resultados num ficheiro.
// Porquê não uma dependência: `archiver` ou `jszip` trazem uma árvore de
// código e a superfície de ataque toda junto, e isto são 80 linhas de formato
// conhecido (Regra 12: dependência nova só com medição a justificar).
//
// Só.deflate, sem store. Sem diretórios, sem comentários, sem extras.
import { crc32, deflateRawSync } from 'node:zlib';

const LOCAL = 0x04034b50;
const CENTRAL = 0x02014b50;
const FIM = 0x06054b50;
const DEFLATE = 8;
// 1 de Janeiro de 1980: a data mais antiga que o formato ZIP representa. Fixa,
// para o mesmo conjunto dar sempre o mesmo ficheiro.
const DATA_DOS = 0x0021;
const HORA_DOS = 0;

// O nome de uma entrada vem do ficheiro do utilizador, por isso tem de ser
// arrumado: sem pastas, sem `..`, sem barras invertidas, sem nomes absurdos.
export function nomeSeguro(nome, ext) {
  const sufixo = ext ? `.${ext.replace(/[^\w]/g, '')}` : '';
  const base = String(nome || 'ficheiro')
    .split(/[\\/]/)
    .pop()                        // deitar fora qualquer caminho
    .replace(/[^\w.\- ]+/g, '_')  // só o que é seguro em qualquer sistema
    .replace(/^\.+/, '')          // `..` e `.` desaparecem
    .trim()
    // O tecto conta o nome todo, extensão incluída: cortar só a base dava
    // nomes de 84 caracteres.
    .slice(0, Math.max(1, 100 - sufixo.length)) || 'ficheiro';
  return base + sufixo;
}

function cabecalhoLocal(nome, tamanhoDados, tamanhoComprimido, crc) {
  const cab = Buffer.alloc(30);
  cab.writeUInt32LE(LOCAL, 0);
  cab.writeUInt16LE(20, 4);        // versão necessária
  cab.writeUInt16LE(0, 6);         // sem flags
  cab.writeUInt16LE(DEFLATE, 8);
  cab.writeUInt16LE(HORA_DOS, 10);
  cab.writeUInt16LE(DATA_DOS, 12);
  cab.writeUInt32LE(crc, 14);
  cab.writeUInt32LE(tamanhoComprimido, 18);
  cab.writeUInt32LE(tamanhoDados, 22);
  cab.writeUInt16LE(nome.length, 26);
  cab.writeUInt16LE(0, 28);        // sem extra
  return Buffer.concat([cab, nome]);
}

function cabecalhoCentral(nome, crc, comprimido, tamanho, deslocamento) {
  const cab = Buffer.alloc(46);
  cab.writeUInt32LE(CENTRAL, 0);
  cab.writeUInt16LE(20, 4);        // versão que fez
  cab.writeUInt16LE(20, 6);        // versão necessária
  cab.writeUInt16LE(0, 8);
  cab.writeUInt16LE(DEFLATE, 10);
  cab.writeUInt16LE(HORA_DOS, 12);
  cab.writeUInt16LE(DATA_DOS, 14);
  cab.writeUInt32LE(crc, 16);
  cab.writeUInt32LE(comprimido, 20);
  cab.writeUInt32LE(tamanho, 24);
  cab.writeUInt16LE(nome.length, 28);
  cab.writeUInt32LE(0, 38);        // atributos externos
  cab.writeUInt32LE(deslocamento, 42);
  return Buffer.concat([cab, nome]);
}

/**
 * `entradas` é [{ nome, dados }] e devolve um Buffer com o ZIP completo.
 * O nome passa por `nomeSeguro`, por isso um ficheiro chamado
 * `../../etc/passwd` entra como `etc_passwd`.
 */
export function criarZip(entradas) {
  const locais = [];
  const centrais = [];
  let deslocamento = 0;

  for (const entrada of entradas) {
    const nome = Buffer.from(nomeSeguro(entrada.nome, entrada.ext), 'utf8');
    const dados = Buffer.isBuffer(entrada.dados) ? entrada.dados : Buffer.from(entrada.dados);
    const comprimido = deflateRawSync(dados, { level: 9 });
    const crc = crc32(dados) >>> 0; // sem sinal: escrever como UINT exige

    const local = cabecalhoLocal(nome, dados.length, comprimido.length, crc);
    locais.push(local, comprimido); // o cabeçalho e os dados, pela ordem
    centrais.push(cabecalhoCentral(nome, crc, comprimido.length, dados.length, deslocamento));
    deslocamento += local.length + comprimido.length;
  }

  const directorio = Buffer.concat(centrais);
  const fim = Buffer.alloc(22);
  fim.writeUInt32LE(FIM, 0);
  fim.writeUInt16LE(entradas.length, 8);
  fim.writeUInt16LE(entradas.length, 10);
  fim.writeUInt32LE(directorio.length, 12);
  fim.writeUInt32LE(deslocamento, 16);

  return Buffer.concat([...locais, directorio, fim]);
}
