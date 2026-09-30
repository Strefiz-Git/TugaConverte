// Decide qual motor trata cada par. `has` é assíncrono e injectado.
import { hasBin } from './bins.js';
import { CATEGORIAS, familia, nome } from '../catalogo.js';

export async function createRegistry({ engines, has = hasBin } = {}) {
  const active = [];
  for (const engine of engines) {
    // Sem await, uma Promise é sempre truthy e todos os motores ficariam ativos.
    const checks = await Promise.all(engine.bins.map((bin) => has(bin)));
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
  };
}
