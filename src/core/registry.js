// Decide qual motor trata cada par. `has` é assíncrono e injectado.
import { hasBin } from './bins.js';
import { CATEGORIAS, familia, nome } from '../catalogo.js';
import { SISTEMAS, instrucao } from '../deps.js';

export async function createRegistry({ engines, has = hasBin, plataforma = process.platform } = {}) {
  const active = [];
  const presentes = {};
  for (const engine of engines) {
    // Sem await, uma Promise é sempre truthy e todos os motores ficariam ativos.
    const checks = await Promise.all(engine.bins.map((bin) => has(bin)));
    engine.bins.forEach((bin, i) => { presentes[bin] = checks[i]; });
    if (checks.every(Boolean)) active.push(engine);
  }

  const supports = (engine, from, to) =>
    engine.supports ? engine.supports(from, to) : from !== to;

  return {
    engines: active,

    find(from, to) {
      if (!from || !to || from === to) return null;
      return active.find((e) =>
        e.from.includes(from) && e.to.includes(to) && supports(e, from, to)) || null;
    },

    // Matriz para a UI: que destinos existem a partir de cada origem.
    formats() {
      const matrix = {};
      for (const engine of active) {
        for (const from of engine.from) {
          const targets = matrix[from] || (matrix[from] = []);
          for (const to of engine.to) {
            if (supports(engine, from, to) && !targets.includes(to)) targets.push(to);
          }
        }
      }
      return matrix;
    },

    // Catálogo por família, só com o que este servidor consegue mesmo fazer:
    // um motor sem binário não entra, senão a contagem é uma mentira.
    catalogo() {
      const porFamilia = new Map();
      const add = (extension) => {
        const f = familia(extension);
        if (!f) return;
        if (!porFamilia.has(f)) porFamilia.set(f, new Set());
        porFamilia.get(f).add(extension);
      };
      for (const engine of active) engine.from.forEach(add);

      const categorias = CATEGORIAS
        .filter((c) => porFamilia.has(c.id))
        .map((c) => {
          const extensoes = [...porFamilia.get(c.id)].sort();
          return {
            id: c.id,
            nome: c.nome,
            total: extensoes.length,
            extensoes: extensoes.map((e) => ({ ext: e, nome: nome(e) })),
          };
        });

      return { total: categorias.reduce((s, c) => s + c.total, 0), categorias };
    },

    // O que falta para o servidor converter tudo o que promete: por motor, os
    // binários em falta e o comando de instalação de cada sistema suportado.
    // Isto não instala nada (exigiria root no contentor); diz o que fazer.
    dependencias() {
      const motors = engines.map((engine) => {
        const falta = engine.bins.filter((bin) => !presentes[bin]);
        return {
          id: engine.id,
          pronto: falta.length === 0,
          faltando: falta.map((bin) => {
            const info = instrucao(bin);
            return { bin, nome: info?.nome || bin, para: info?.para || '', comandos: info?.comandos || {} };
          }),
        };
      });
      return {
        completo: motors.every((m) => m.pronto),
        // O servidor só sabe a plataforma, não a distribuição. Em Linux dizemos
        // a verdade em vez de adivinhar a distribuição de quem instalou.
        plataforma,
        sistemaSugerido: plataforma === 'win32' ? 'windows' : plataforma === 'darwin' ? 'macos' : null,
        sistemas: SISTEMAS.map((s) => ({ id: s.id, nome: s.nome })),
        motores: motors,
      };
    },
  };
}
