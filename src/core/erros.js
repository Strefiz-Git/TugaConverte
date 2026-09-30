// Erros da API: uma mensagem em português para a pessoa e um `code` estável
// para quem programa. Sem o `code`, um cliente só pode comparar texto e muda
// de comportamento à sorte.
export const CODIGO = {
  FICHEIRO_EM_FALTA: 'MISSING_FILE',
  FORMATO_DESCONHECIDO: 'UNKNOWN_FORMAT',
  FICHEIRO_ACIMA_DO_LIMITE: 'FILE_TOO_LARGE',
  JOB_DESCONHECIDO: 'JOB_NOT_FOUND',
  JOB_NAO_PRONTO: 'JOB_NOT_READY',
  CONVERSAO_FALHOU: 'CONVERSION_FAILED',
};

// `campos` aponta o campo culpado, como o `errors` por campo do CloudConvert.
export function falha(reply, status, code, mensagem, campos) {
  const corpo = { error: mensagem, code };
  if (campos) corpo.campos = campos;
  return reply.code(status).send(corpo);
}
