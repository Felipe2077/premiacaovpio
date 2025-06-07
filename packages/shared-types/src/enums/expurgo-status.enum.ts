// packages/shared-types/src/enums/expurgo-status.enum.ts

/**
 * Status possíveis para um expurgo no workflow de aprovação
 */
export enum ExpurgoStatus {
  /** Expurgo foi solicitado e aguarda análise */
  PENDENTE = 'PENDENTE',

  /** Expurgo foi analisado e aprovado - será aplicado no cálculo */
  APROVADO = 'APROVADO',

  /** Expurgo foi analisado e rejeitado - não será aplicado */
  REJEITADO = 'REJEITADO',
}

/**
 * Verifica se um status é válido
 */
export function isValidExpurgoStatus(status: string): status is ExpurgoStatus {
  return Object.values(ExpurgoStatus).includes(status as ExpurgoStatus);
}

/**
 * Retorna descrição amigável do status
 */
export function getExpurgoStatusDescription(status: ExpurgoStatus): string {
  switch (status) {
    case ExpurgoStatus.PENDENTE:
      return 'Aguardando aprovação';
    case ExpurgoStatus.APROVADO:
      return 'Aprovado';
    case ExpurgoStatus.REJEITADO:
      return 'Rejeitado';
    default:
      return 'Status desconhecido';
  }
}

/**
 * Retorna cor para exibição no frontend
 */
export function getExpurgoStatusColor(status: ExpurgoStatus): string {
  switch (status) {
    case ExpurgoStatus.PENDENTE:
      return 'orange';
    case ExpurgoStatus.APROVADO:
      return 'green';
    case ExpurgoStatus.REJEITADO:
      return 'red';
    default:
      return 'gray';
  }
}
