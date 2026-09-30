// Como os `code` da API viram português na interface. As chaves têm de
// bater certo com `src/core/erros.js`; o `check` não valida ficheiros do
// browser, por isso este mapa é o ponto a mexer quando um código nasce.
export const POR_CODE = {
  FILE_TOO_LARGE: 'O ficheiro é maior do que este servidor aceita.',
  UNKNOWN_FORMAT: 'Este servidor não faz essa conversão.',
  CONVERSION_FAILED: 'A conversão falhou. O ficheiro pode estar corrompido.',
  MISSING_FILE: 'Não recebi ficheiro nenhum.',
  JOB_NOT_FOUND: 'Este job já não existe.',
  JOB_NOT_READY: 'O ficheiro ainda não está pronto.',
};
