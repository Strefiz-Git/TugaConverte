// UI sem framework. Formatos vêm sempre de /api/formats (Regra 9).
const $ = (sel) => document.querySelector(sel);
const drop = $('#drop');
const picker = $('#picker');
const toSel = $('#to');
const go = $('#go');
const list = $('#list');
const aviso = $('#aviso');

let matrix = {};
let files = [];
let semMotores = false;

const ext = (name) => name.slice(name.lastIndexOf('.') + 1).toLowerCase();

function setAviso(msg) {
  aviso.textContent = msg || '';
  aviso.hidden = !msg;
}

async function loadFormats() {
  try {
    const res = await fetch('/api/formats');
    matrix = await res.json();
  } catch {
    matrix = {};
  }
}

// Sem binários no servidor, `/api/health` devolve uma lista vazia. Dizer isso
// é melhor do que deixar o utilizador à espera de um erro sem explicação.
async function checkMotores() {
  const health = await fetch('/api/health').then((r) => r.json()).catch(() => null);
  if (!health) return;
  if (health.ttlMin) $('#ttl').textContent = health.ttlMin;
  semMotores = health.engines.length === 0;
  if (semMotores) {
    setAviso('Nenhum motor ativo: este servidor não encontrou binários de conversão. '
      + 'A forma mais rápida é "docker compose up --build -d". Sem Docker, instala ffmpeg, '
      + 'ImageMagick, Pandoc, poppler e LibreOffice e reinicia o servidor.');
  }
}

function refreshTargets() {
  const common = files.map((f) => matrix[ext(f.name)] || []).filter((a) => a.length);
  const shared = common.length ? common.reduce((a, b) => a.filter((x) => b.includes(x))) : [];
  const all = new Set(Object.values(matrix).flat());

  toSel.textContent = '';
  const placeholder = new Option(files.length ? '— escolhe —' : '— escolhe um ficheiro —', '');
  toSel.append(placeholder);

  const usable = files.length === 1 ? all : shared;
  for (const t of [...usable].sort()) toSel.append(new Option(`.${t}`, t));

  toSel.disabled = usable.size === 0;
  go.disabled = usable.size === 0;
}

function addFiles(incoming) {
  const aceites = [];
  for (const file of incoming) {
    if (!matrix[ext(file.name)]) continue;
    files.push(file);
    aceites.push(file);
    const li = document.createElement('li');
    const name = document.createElement('div');
    name.className = 'name';
    const b = document.createElement('b');
    b.textContent = file.name;
    name.append(b);
    const state = document.createElement('div');
    state.className = 'state';
    state.textContent = 'à espera';
    const bar = document.createElement('progress');
    bar.max = 100;
    bar.hidden = true;
    li.append(name, state, bar);
    list.append(li);
    file._ui = { li, state, bar };
  }
  refreshTargets();

  // Ignorar um ficheiro em silêncio é a forma mais rápida de perder a confiança
  // de quem está a usar o site: dizer o que não foi aceite, e porquê.
  if (aceites.length) return;
  if (semMotores) return; // o aviso dos motores já explica tudo
  const rejeitado = incoming[0];
  if (!rejeitado) return;
  const extensao = ext(rejeitado.name);
  setAviso(extensao.length > 10 || rejeitado.name.startsWith('.')
    ? 'Esse ficheiro não tem extensão reconhecível.'
    : `Este servidor não converte ficheiros .${extensao}.`);
}

function setState(file, text, cls = '') {
  const { state } = file._ui;
  state.textContent = text;
  state.className = `state ${cls}`;
}

// XMLHttpRequest e não fetch: só o XHR dá progresso de envio.
function upload(file) {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('file', file);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/api/jobs?to=${encodeURIComponent(toSel.value)}`);
    xhr.upload.onprogress = (e) => {
      if (!e.lengthComputable) return;
      file._ui.bar.hidden = false;
      file._ui.bar.value = (e.loaded / e.total) * 100;
      setState(file, `a enviar ${Math.round((e.loaded / e.total) * 100)}%`);
    };
    xhr.onload = () => {
      let body = {};
      try { body = JSON.parse(xhr.responseText); } catch { /* resposta não-JSON */ }
      if (xhr.status === 202) resolve(body.id);
      else reject(new Error(body.error || `erro ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error('falha de rede'));
    xhr.send(form);
  });
}

async function poll(file, id) {
  for (;;) {
    const res = await fetch(`/api/jobs/${encodeURIComponent(id)}`);
    const job = await res.json();
    if (job.status === 'done' || job.status === 'error') return job;
    await new Promise((r) => setTimeout(r, 700));
  }
}

// O job só pode ser apagado depois de descarregado: apagar aqui fazia o link
// devolver 404 no clique seguinte.
function link(file, id) {
  const url = `/api/jobs/${encodeURIComponent(id)}`;
  const limpar = () => fetch(url, { method: 'DELETE' }).catch(() => {});

  const a = document.createElement('a');
  a.className = 'dl';
  a.href = `${url}/download`;
  a.textContent = 'descarregar';
  a.addEventListener('click', () => {
    a.textContent = 'a descarregar…';
    // Tempo para o browser pegar no ficheiro antes de o servidor o apagar.
    setTimeout(limpar, 30_000);
  });
  file._ui.li.append(a);

  const btn = document.createElement('button');
  btn.className = 'limpar';
  btn.type = 'button';
  btn.textContent = 'apagar';
  btn.title = 'Apagar este ficheiro do servidor';
  btn.addEventListener('click', () => { limpar(); btn.remove(); a.remove(); });
  file._ui.li.append(btn);
}

async function run(file) {
  try {
    setState(file, 'a converter');
    const id = await upload(file);
    const job = await poll(file, id);
    if (job.status === 'error') throw new Error(job.error || 'conversão falhou');
    setState(file, `pronto · ${fmt(job.size)}`, 'ok');
    link(file, id);
  } catch (err) {
    setState(file, err.message, 'err');
  }
}

function fmt(bytes) {
  if (!bytes) return '';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** i).toFixed(i ? 1 : 0)} ${units[i]}`;
}

go.addEventListener('click', () => {
  if (!toSel.value) return;
  go.disabled = true;
  for (const file of files) run(file);
  setTimeout(() => { go.disabled = false; }, 500);
});

drop.addEventListener('click', () => picker.click());
drop.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); picker.click(); }
});
picker.addEventListener('change', () => addFiles([...picker.files]));

['dragenter', 'dragover'].forEach((ev) =>
  drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
['dragleave', 'drop'].forEach((ev) =>
  drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
drop.addEventListener('drop', (e) => addFiles([...(e.dataTransfer?.files || [])]));

await loadFormats();
await checkMotores();
