// UI sem framework. Os formatos vêm sempre de /api/formats (Regra 9).
import { createFormatos } from '/formatos.js';
import { mostrarCatalogo } from '/catalogo.js';
import { mostrarDependencias } from '/deps.js';
import { criarJob, esperar, explicarErro } from '/api.js';
import { ligacoes, pintarConsola, setEstado, pintarBarra, tamanho } from '/linha.js';
import { carregarOpcoes, ajustarOpcao, opcoesDe } from '/opcoes.js';

const $ = (s) => document.querySelector(s);
const drop = $('#drop');
const picker = $('#picker');
const list = $('#list');
const aviso = $('#aviso');
const tituloDrop = $('#dropTitulo');
const subDrop = $('#dropSub');
const zonaCatalogo = $('#catalogo-zona');
const zonaDeps = $('#deps-zona');
const go = $('#go');

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

// Sem binários, `/api/health` devolve uma lista vazia. Dizer isso é melhor do
// que deixar à espera de um erro sem explicação.
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
  // O accept lista tudo o que o servidor converte: um ficheiro de outro
  // formato é aceite e fica com o seu próprio destino.
  picker.accept = [...Object.keys(matrix)].map((e) => `.${e}`).join(',');
  tituloDrop.textContent = 'Larga os ficheiros aqui';
  subDrop.textContent = saida
    ? `por omissão, para .${saida} — ou muda o destino de cada ficheiro`
    : 'escolhe o destino de cada ficheiro';
  // O par escolhido passa a ser o destino sugerido de cada linha.
  aplicarSugestao(saida);
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
  const destino = selectDestino(ficheiro);
  li.append(nome, destino, estado, barra);
  list.append(li);
  ficheiro._ui = { li, estado, barra, destino, escolhido: false };
  ajustarOpcao(destino, ficheiro.name);
}

// O destino de cada ficheiro, com os ajustes que o servidor aceita para ele.
// Sem isto, converter ficheiros de tipos diferentes ao mesmo tempo era impossível.
function selectDestino(ficheiro) {
  const select = document.createElement('select');
  select.className = 'destino';
  select.setAttribute('aria-label', `Converter ${ficheiro.name} para`);
  const alvos = matrix[ext(ficheiro.name)] || [];
  for (const formato of [...alvos].sort()) select.append(new Option(`.${formato}`, formato));
  const { saida } = formatos.get();
  if (saida && alvos.includes(saida)) select.value = saida;
  // O ajuste só aparece quando o destino escolhido tem algo ajustável.
  select.addEventListener('change', () => ajustarOpcao(select, ficheiro.name));
  return select;
}

// O par das cartas passa a ser sugestão, não imposição: só muda as linhas
// em que o utilizador ainda não mexeu.
function aplicarSugestao(saida) {
  for (const ficheiro of ficheiros) {
    const select = ficheiro._ui.destino;
    if (ficheiro._ui.escolhido || !saida) continue;
    if (select.querySelector(`option[value="${saida}"]`)) {
      select.value = saida;
      ajustarOpcao(select, ficheiro.name);
    }
  }
}

function aceitar(recebidos) {
  let aceites = 0;
  const foraDoPar = [];

  for (const ficheiro of recebidos) {
    // Qualquer formato que o servidor saiba converter entra na lista; o
    // destino escolhe-se por linha. Só o que não existe de todo é recusado.
    const formato = ext(ficheiro.name);
    if (!matrix[formato]) continue;
    const { entrada } = formatos.get();
    if (entrada && formato !== entrada) foraDoPar.push(formato);
    ficheiros.push(ficheiro);
    linha(ficheiro);
    aceites += 1;
  }

  // Ignorar um ficheiro em silêncio é a forma mais rápida de perder a confiança
  // de quem está a usar o site: dizer o que não foi aceite.
  if (aceites) {
    const { saida } = formatos.get();
    aplicarSugestao(saida);
    // Escolheste DOCX → PDF e largaste um PNG: ele entra na mesma, com
    // destino próprio, mas é bom dizer que o par escolhido não lhe serve.
    if (foraDoPar.length) {
      dizer(`${foraDoPar.map((f) => '.' + f).join(', ')} não é o formato escolhido, `
        + 'por isso ficou com outro destino. Podes mudá-lo na linha.');
    }
    return;
  }
  if (semMotores) return; // o aviso dos motores já explica tudo
  const rejeitado = recebidos[0];
  if (!rejeitado) return;
  const format = ext(rejeitado.name);
  dizer(!format || format === rejeitado.name
    ? 'Esse ficheiro não tem extensão reconhecível.'
    : `Este servidor não converte ficheiros .${format}.`);
}

async function converter(ficheiro) {
  const destino = ficheiro._ui.destino;
  ficheiro._ui.escolhido = true;
  // Uma vez convertido, o destino já não muda: muda-se para um novo ficheiro.
  destino.disabled = true;
  const ajustes = opcoesDe(destino);
  const campo = destino.parentElement.querySelector('.opcao-campo');
  if (campo) campo.querySelector('input').disabled = true;
  try {
    setEstado(ficheiro, 'a converter');
    const job = await esperar(await criarJob(ficheiro, destino.value, ajustes, (fraccao) => {
      // Durante o envio a percentagem é exacta: é o que o browser mediu.
      pintarBarra(ficheiro, fracao * 100);
      setEstado(ficheiro, `a enviar ${Math.round(fraccao * 100)}%`);
    }), (visto) => {
      pintarConsola(ficheiro, visto.log);
      if (visto.status === 'running') {
        // Com percentagem do servidor a barra é verdadeira; sem ela, fica
        // indeterminada: preferimos honesto a número inventado.
        const p = visto.percentagem;
        pintarBarra(ficheiro, p, true);
        setEstado(ficheiro, p === null || p === undefined ? 'a converter' : `a converter · ${p}%`);
      }
    });
    if (job.status === 'error') throw new Error(job.error || 'conversão falhou');
    pintarBarra(ficheiro, 100);
    setEstado(ficheiro, `pronto · ${tamanho(job.size)}`, 'ok');
    ligacoes(ficheiro, job.id);
  } catch (err) {
    setEstado(ficheiro, explicarErro(err), 'err');
  }
}

// Largar ficheiros só os põe na lista; o botão "Converter" arranca cada um
// com o destino que ficou escolhido na sua linha.
function largar(entrada) {
  aceitar(entrada);
  atualizarBotao();
}

function atualizarBotao() {
  const porConverter = ficheiros.filter((f) => !f._ui.escolhido).length;
  go.disabled = porConverter === 0;
  go.textContent = porConverter > 1 ? `converter ${porConverter} ficheiros` : 'converter';
}

go.addEventListener('click', () => {
  const novos = ficheiros.filter((f) => !f._ui.escolhido);
  for (const ficheiro of novos) converter(ficheiro);
  atualizarBotao();
});

drop.addEventListener('click', () => picker.click());
drop.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); picker.click(); }
});
picker.addEventListener('change', () => { largar([...picker.files]); picker.value = ''; });

['dragenter', 'dragover'].forEach((ev) =>
  drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
['dragleave', 'drop'].forEach((ev) =>
  drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
drop.addEventListener('drop', (e) => largar([...(e.dataTransfer?.files || [])]));

// Arranque: formatos, saúde do servidor, catálogo e dependências.
async function arrancar() {
  await Promise.all([carregarFormatos(), carregarOpcoes(), estado()]);
  formatos = createFormatos({ matrix, onChange: rotular });
  rotular();

  catalogo = mostrarCatalogo({
    raiz: $('#catalogo'),
    aoEscolher: (ext) => formatos.escolher('entrada', ext),
  });
  const dados = await fetch('/api/catalogo').then((r) => r.json()).catch(() => null);
  // Sem motores ativos o catálogo é barulho: escondemos a secção.
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
