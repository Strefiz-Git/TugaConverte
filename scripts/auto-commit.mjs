// check -> test -> add -> commit -> push. Se check ou testes falham, não commita.
// Cross-platform de propósito: o projeto corre em Windows, macOS e Linux.
import { spawnSync } from 'node:child_process';
import { statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MAX_BYTES = 5 * 1024 * 1024;
const BIG_IN_ROOT = /\.(zip|7z|pdf|png|jpe?g|gif|mp4|exe|msi)$/i;

const [message, ...flags] = process.argv.slice(2);
if (!message) {
  console.error('uso: npm run commit -- "mensagem" [--no-push]');
  process.exit(1);
}
const noPush = flags.includes('--no-push');

const git = (...args) => spawnSync('git', args, { cwd: ROOT, stdio: 'inherit', shell: false });
const run = (cmd, args) => spawnSync(cmd, args, { cwd: ROOT, stdio: 'inherit', shell: false });

if (git('rev-parse', '--git-dir').status !== 0) {
  console.error('isto não é um repositório git');
  process.exit(1);
}

for (const [label, cmd, args] of [
  ['check', process.execPath, ['scripts/check.mjs']],
  ['testes', process.execPath, ['--test', 'tests/registry.test.js', 'tests/app.test.js', 'tests/real.test.js']],
]) {
  console.log(`\n=== ${label} ===`);
  if (run(cmd, args).status !== 0) {
    console.error(`${label} falhou. Nada foi commitado.`);
    process.exit(1);
  }
}

git('add', '-A');

// Fora do stage: ficheiros grandes e artefactos (Regra 16).
const staged = spawnSync('git', ['diff', '--cached', '--name-only'], { cwd: ROOT, encoding: 'utf8' });
for (const rel of (staged.stdout || '').split('\n').filter(Boolean)) {
  const big = BIG_IN_ROOT.test(rel) || safeSize(rel) > MAX_BYTES;
  if (big) {
    console.log(`fora do stage: ${rel}`);
    git('rm', '--cached', '-r', '--quiet', '--', rel);
  }
}

git('commit', '-m', message);
if (noPush) {
  console.log('commit feito (--no-push)');
  process.exit(0);
}

if (!git('remote').stdout || !String(git('remote').stdout || '').includes('origin')) {
  console.log('sem remote "origin": commit feito, push saltado');
  process.exit(0);
}

if (git('push', 'origin', 'HEAD').status === 0) process.exit(0);

// Push recusado: pode ser rebase, não repetir às cegas (skill git-auto-commit-push).
const remote = git('rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}');
if (remote.status !== 0) {
  console.error('push falhou e o branch não tem upstream. Configura com: git push -u origin HEAD');
  process.exit(1);
}
if (git('pull', '--rebase').status !== 0) {
  console.error('rebase com conflito. Resolve à mão; o script não o faz por ti.');
  process.exit(1);
}
process.exit(git('push', 'origin', 'HEAD').status);

function safeSize(rel) {
  try { return statSync(path.join(ROOT, rel)).size; } catch { return 0; }
}
