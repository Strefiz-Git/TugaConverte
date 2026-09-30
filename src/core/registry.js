// Decide qual motor trata cada par. `has` é assíncrono e injectado.
import { hasBin } from './bins.js';

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
  };
}
