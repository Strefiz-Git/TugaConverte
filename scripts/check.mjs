// O porteiro do projeto. Se falha aqui, o commit não sai (Regra 15).
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MAX_LINES = 250;
// O que trava o carregamento é o que viaja na rede, com compressão. O tecto
// bruto existe só para apanhar um ficheiro descontrolado a encher o pacote.
// 13 KB comprimidos: era 12 quando o site tinha metade das funcionalidades
// (escolher formatos, catálogo, dependências, consola, ZIP de lote). Ainda é
// minúsculo ao lado dos 200 KB de JavaScript que o CloudConvert serve.
const MAX_UI_BYTES = 40 * 1024;
const MAX_UI_GZIP = 13 * 1024;

const problems = [];
const fail = (msg) => problems.push(msg);
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const walk = (rel, ext) => {
  const out = [];
  for (const entry of fs.readdirSync(path.join(ROOT, rel), { withFileTypes: true })) {
    const child = path.join(rel, entry.name);
    if (entry.isDirectory()) out.push(...walk(child, ext));
    else if (child.endsWith(ext)) out.push(child);
  }
  return out;
};

const codeFiles = ['src', 'scripts', 'tests', 'public'].flatMap((d) => walk(d, '.js'));

// Regra 5: ficheiros pequenos.
for (const file of codeFiles) {
  const lines = read(file).split('\n').length;
  if (lines > MAX_LINES) fail(`${file}: ${lines} linhas, o máximo é ${MAX_LINES}`);
}

// Regra 12: front-end no orçamento. Mede o comprimido, que é o que viaja.
// Ficheiro a ficheiro, como o servidor serve: cada um é uma resposta
// separada, com o seu próprio dicionário. Comprimir tudo junto dava um
// número optimista que ninguém vive.
const uiFiles = walk('public', '.js').concat(walk('public', '.css')).concat(walk('public', '.html'));
const uiBytes = uiFiles.reduce((sum, f) => sum + fs.statSync(path.join(ROOT, f)).size, 0);
const uiGzip = uiFiles.reduce((sum, f) => {
  const bruto = fs.readFileSync(path.join(ROOT, f));
  return sum + zlib.gzipSync(bruto, { level: 9 }).length;
}, 0);
if (uiBytes > MAX_UI_BYTES) fail(`public/: ${(uiBytes / 1024).toFixed(1)} KB, o máximo é ${MAX_UI_BYTES / 1024} KB`);
if (uiGzip > MAX_UI_GZIP) fail(`public/: ${(uiGzip / 1024).toFixed(1)} KB comprimidos, o máximo é ${MAX_UI_GZIP / 1024} KB`);
console.log(`front-end: ${(uiBytes / 1024).toFixed(1)} KB, ${(uiGzip / 1024).toFixed(1)} KB comprimidos`);

// Regra 14: numeração das regras sem saltos nem repetições.
const agents = read('AGENTS.md');
const numbers = [...agents.matchAll(/^### Regra (\d+) — /gm)].map((m) => Number(m[1]));
numbers.forEach((n, i) => {
  if (n !== i + 1) fail(`AGENTS.md: regra ${n} fora de sequência (esperado ${i + 1})`);
});
const next = agents.match(/A próxima regra é a (\d+)/)?.[1];
if (next && Number(next) !== numbers.length + 1) {
  fail(`AGENTS.md: "A próxima regra é a ${next}" mas há ${numbers.length} regras`);
}
console.log(`regras: ${numbers.length}`);

// Cada skill tem de estar registada no AGENTS.md.
const skillDir = path.join(ROOT, '.opencode', 'skill');
if (fs.existsSync(skillDir)) {
  for (const name of fs.readdirSync(skillDir)) {
    if (!agents.includes('`' + name + '`')) fail(`AGENTS.md não menciona a skill \`${name}\``);
  }
  console.log(`skills: ${fs.readdirSync(skillDir).length}`);
}

// Cada motor tem a forma correta.
const index = read('src/engines/index.js');
for (const m of index.matchAll(/from '\.\/(\w+)\.js'/g)) {
  const file = `src/engines/${m[1]}.js`;
  const src = read(file);
  for (const field of ['id:', 'bins:', 'from:', 'to:', 'build(']) {
    if (!src.includes(field)) fail(`${file} não tem \`${field}\``);
  }
  if (/\bexec\(|shell:\s*true/.test(src)) fail(`${file} usa shell: proibido (Regra 7)`);
}

// Nenhum formato pode ficar sem família no catálogo, senão a página de catálogo
// esconde um formato que o servidor aceita (Regra 9).
const { familia } = await import(new URL('../src/catalogo.js', import.meta.url));
const { default: engines } = await import(new URL('../src/engines/index.js', import.meta.url));
const semFamilia = new Set();
for (const motor of engines) {
  for (const ext of [...motor.from, ...motor.to]) {
    if (!familia(ext)) semFamilia.add(`${motor.id}: ${ext}`);
  }
}
for (const caso of semFamilia) fail(`formato sem família no catálogo → ${caso}`);
console.log(`catálogo: ${engines.reduce((s, m) => s + m.from.length, 0)} formatos declarados`);

// Nenhum binário pode ficar sem instrução de instalação, senão a página de
// diagnóstico manda alguém atrás de nada.
const { SISTEMAS, instrucao } = await import(new URL('../src/deps.js', import.meta.url));
for (const motor of engines) {
  for (const bin of motor.bins) {
    const info = instrucao(bin);
    if (!info) fail(`${motor.id}: sem instruções de instalação para "${bin}"`);
    for (const sistema of SISTEMAS) {
      if (!info?.comandos?.[sistema.id]) {
        fail(`${motor.id}: "${bin}" não tem comando para ${sistema.nome}`);
      }
    }
  }
}
console.log(`dependências: ${engines.length} motores, ${new Set(engines.flatMap((m) => m.bins)).size} binários`);

// O nome do projeto é TugaConverte. O npm e o Docker exigem minúsculas, por isso
// nesses dois sítios é `tugaconverte`; noutros, o nome escrito.
const NOME = 'TugaConverte';
const minusculo = NOME.toLowerCase();
const pkg = read('package.json');
if (!pkg.includes(`"name": "${minusculo}"`)) fail(`package.json tem de se chamar "${minusculo}"`);
if (!read('docker-compose.yml').includes(`  ${minusculo}:`)) fail(`docker-compose.yml tem de ter o serviço "${minusculo}"`);
if (!read('public/index.html').includes(`<h1>${NOME}</h1>`)) fail(`a página não diz ${NOME}`);
console.log(`nome: ${NOME} (${minusculo} no npm e no Docker)`);

if (problems.length) {
  console.error(`\ncheck falhou (${problems.length}):`);
  for (const p of problems) console.error(`  · ${p}`);
  process.exit(1);
}
console.log('check ok');
