// Fila de conversões com concorrência limitada. Os pedidos esperam, nunca são recusados.
export function createQueue(concurrency = 1) {
  const pending = [];
  let running = 0;

  function next() {
    if (running >= concurrency || pending.length === 0) return;
    const task = pending.shift();
    running += 1;
    Promise.resolve()
      .then(task)
      .catch(() => {})
      .finally(() => {
        running -= 1;
        next();
      });
  }

  return {
    push(task) {
      pending.push(task);
      next();
    },
    stats: () => ({ running, waiting: pending.length, concurrency }),
  };
}
