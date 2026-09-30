// UI sem framework. Os formatos vêm sempre de /api/formats (Regra 9).
import { createFormatos } from '/formatos.js';
import { mostrarCatalogo } from '/catalogo.js';
import { mostrarDependencias } from '/deps.js';
import { criarJob, esperar, explicarErro } from '/api.js';
import { ligacoes, pintarConsola } from '/linha.js';

const $ = (s) => document.querySelector(s);
const drop = $('#drop');
const picker = $('#picker');
const list = $('#list');
const aviso = $('#aviso');
const tituloDrop = $('#dropTitulo');
const subDrop = $('#dropSub');
const zonaCatalogo = $('#catalogo-zona');
const zonaDeps = $('#deps-zona');

let matrix = {};
let ficheiros = [];
let semMotores = false;
let formatos;
let catalogo;

const ext = (nome) => nome.slice(nome.lastIndexOf('.') + 1).toLowerCase();

function dizer(msg) {
  aviso.textContent = msg || '';
  aviso.hidden = !msg;
}

async function carregarFormatos() {
  try {
    matrix = await (await fetch('/api/formats')).json();
  } catch {
    matrix = {};
  }
}

// Sem binários no servidor, `/api/health` devolve uma lista vazia. Dizer isso
// é melhor do que deixar o utilizador à espera de um erro sem explicação.
async function estado() {
  const health = await fetch('/api/health').then((r) => r.json()).catch(() => null);
  if (!health) return;
  if (health.ttlMin) $('#ttl').textContent = health.ttlMin;
  semMotores = health.engines.length === 0;
  if (semMotores) {
    dizer('Nenhum motor ativo: este servidor não encontrou binários de conversão. '
      + 'A forma mais rápida é "docker compose up --build -d". Sem Docker, instala ffmpeg, '
      + 'ImageMagick, Pandoc, poppler e LibreOffice e reinicia o servidor.');
  }
}

function rotular() {
  const { entrada, saida } = formatos.get();
  if (!entrada) {
    tituloDrop.textContent = 'Escolhe o formato de entrada';
    subDrop.textContent = 'e depois larga o ficheiro';
    return;
  }
  // O accept vai para o filtro nativo do seletor de ficheiros: menos cliques.
  picker.accept = `.${entrada}`;
  tituloDrop.textContent = `Larga o ficheiro .${entrada}`;
  subDrop.textContent = saida
    ? `e convertemos para .${saida}`
    : 'escolhe agora o formato de saída';
}

function linha(ficheiro) {
  const li = document.createElement('li');
  const nome = document.createElement('div');
  nome.className = 'nome';
  const forte = document.createElement('b');
  forte.textContent = ficheiro.name; // nome do utilizador: só textContent
  nome.append(forte);
  const estado = document.createElement('div');
  estado.className = 'estado';
  estado.textContent = 'à espera';
  const barra = document.createElement('progress');
  barra.max = 100;
  barra.hidden = true;
  li.append(nome, estado, barra);
  list.append(li);
  ficheiro._ui = { li, estado, barra };
}

function setEstado(ficheiro, texto, classe = '') {
  const { estado } = ficheiro._ui;
  estado.textContent = texto;
  estado.className = `estado ${classe}`;
}
function aceitar(recebidos) {
  const { entrada: esperada } = formatos.get();
  let aceites = 0;

  for (const ficheiro of recebidos) {
    const format = ext(ficheiro.name);
    // Com os formatos escolhidos à frente, o ficheiro tem de ser do formato
    // pedido. Só se nenhum foi escolhido é que basta ser um formato conhecido.
    const serve = esperada ? format === esperada : Boolean(matrix[format]);
    if (!serve) continue;
    ficheiros.push(ficheiro);
    linha(ficheiro);
    aceites += 1;
  }

  // Ignorar um ficheiro em silêncio é a forma mais rápida de perder a confiança
  // de quem está a usar o site: dizer o que não foi aceite, e porquê.
  if (aceites) return;
  if (semMotores) return; // o aviso dos motores já explica tudo
  const rejeitado = recebidos[0];
  if (!rejeitado) return;
  const format = ext(rejeitado.name);
  if (!format || format === rejeitado.name) {
    dizer('Esse ficheiro não tem extensão reconhecível.');
  } else if (esperada) {
    dizer(`Espera-se um ficheiro .${esperada}, não .${format}.`);
  } else {
    dizer(`Este servidor não converte ficheiros .${format}.`);
  }
}

async function converter(ficheiro, destino) {
  try {
    setEstado(ficheiro, 'a converter');
    const job = await esperar(await criarJob(ficheiro, destino, (fraccao) => {
      ficheiro._ui.barra.hidden = false;
      ficheiro._ui.barra.value = fracao * 100;
      setEstado(ficheiro, `a enviar ${Math.round(fraccao * 100)}%`);
    }), (visto) => pintarConsola(ficheiro, visto.log));
    if (job.status === 'error') throw new Error(job.error || 'conversão falhou');
    setEstado(ficheiro, `pronto · ${tamanho(job.size)}`, 'ok');
    ligacoes(ficheiro, job.id);
  } catch (err) {
    setEstado(ficheiro, explicarErro(err), 'err');
  }
}

function tamanho(bytes) {
  if (!bytes) return '';
  const unidades = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(unidades.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** i).toFixed(i ? 1 : 0)} ${unidades[i]}`;
}

function converterTodos(entrada) {
  const { saida } = formatos.get();
  if (!saida) {
    dizer('Escolhe primeiro o formato de saída.');
    return;
  }
  aceitar(entrada);
  // A lista é reiniciada a cada conversão: os ficheiros anteriores já partiram.
  const novos = ficheiros.splice(0);
  for (const ficheiro of novos) converter(ficheiro, saida);
}

drop.addEventListener('click', () => picker.click());
drop.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); picker.click(); }
});
picker.addEventListener('change', () => converterTodos([...picker.files]));

['dragenter', 'dragover'].forEach((ev) =>
  drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
['dragleave', 'drop'].forEach((ev) =>
  drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
drop.addEventListener('drop', (e) => converterTodos([...(e.dataTransfer?.files || [])]));

// Arranque: formatos, saúde do servidor, catálogo e dependências.
async function arrancar() {
  await Promise.all([carregarFormatos(), estado()]);
  formatos = createFormatos({ matrix, onChange: rotular });
  rotular();

  catalogo = mostrarCatalogo({
    raiz: $('#catalogo'),
    aoEscolher: (ext) => formatos.escolher('entrada', ext),
  });
  const dados = await fetch('/api/catalogo').then((r) => r.json()).catch(() => null);
  // Com zero motores ativos um catálogo vazio é só barulho: escondemos a secção.
  if (dados && dados.total) {
    zonaCatalogo.hidden = false;
    catalogo.definir(dados);
  }

  // As dependências mostram-se só quando falta alguma coisa.
  const deps = await fetch('/api/dependencias').then((r) => r.json()).catch(() => null);
  if (deps && !deps.completo) {
    zonaDeps.hidden = false;
    mostrarDependencias({ raiz: $('#deps'), aviso: null }).definir(deps);
  }
}

await arrancar();
