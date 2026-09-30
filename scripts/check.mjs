// O porteiro do projeto. Se falha aqui, o commit não sai (Regra 15).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MAX_LINES = 250;
const MAX_UI_BYTES = 30 * 1024;

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

// Regra 12: front-end no orçamento.
const uiBytes = walk('public', '.js').concat(walk('public', '.css'))
  .concat(walk('public', '.html'))
  .reduce((sum, f) => sum + fs.statSync(path.join(ROOT, f)).size, 0);
if (uiBytes > MAX_UI_BYTES) fail(`public/: ${(uiBytes / 1024).toFixed(1)} KB, o máximo é 30 KB`);
console.log(`front-end: ${(uiBytes / 1024).toFixed(1)} KB / 30 KB`);

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

if (problems.length) {
  console.error(`\ncheck falhou (${problems.length}):`);
  for (const p of problems) console.error(`  · ${p}`);
  process.exit(1);
}
console.log('check ok');
