// packages/shared-types/src/enums/expurgo-status.enum.ts (ATUALIZADO)

/**
 * Status possíveis para um expurgo no workflow de aprovação
 */
export enum ExpurgoStatus {
  /** Expurgo foi solicitado e aguarda análise */
  PENDENTE = 'PENDENTE',

  /** Expurgo foi analisado e aprovado integralmente - valor total será aplicado */
  APROVADO = 'APROVADO',

  /** 🆕 Expurgo foi aprovado parcialmente - valor menor que solicitado será aplicado */
  APROVADO_PARCIAL = 'APROVADO_PARCIAL',

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
      return 'Aprovado integralmente';
    case ExpurgoStatus.APROVADO_PARCIAL:
      return 'Aprovado parcialmente';
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
    case ExpurgoStatus.APROVADO_PARCIAL:
      return 'blue';
    case ExpurgoStatus.REJEITADO:
      return 'red';
    default:
      return 'gray';
  }
}

/**
 * 🆕 Retorna ícone para exibição no frontend
 */
export function getExpurgoStatusIcon(status: ExpurgoStatus): string {
  switch (status) {
    case ExpurgoStatus.PENDENTE:
      return 'Clock';
    case ExpurgoStatus.APROVADO:
      return 'CheckCircle';
    case ExpurgoStatus.APROVADO_PARCIAL:
      return 'CheckCircle2';
    case ExpurgoStatus.REJEITADO:
      return 'XCircle';
    default:
      return 'HelpCircle';
  }
}

/**
 * 🆕 Verifica se o status indica aprovação (total ou parcial)
 */
export function isStatusAprovado(status: ExpurgoStatus): boolean {
  return (
    status === ExpurgoStatus.APROVADO ||
    status === ExpurgoStatus.APROVADO_PARCIAL
  );
}

/**
 * 🆕 Verifica se o status permite edição
 */
export function statusPermiteEdicao(status: ExpurgoStatus): boolean {
  return status === ExpurgoStatus.PENDENTE;
}

/**
 * 🆕 Retorna próximos status possíveis
 */
export function getNextPossibleStatuses(
  currentStatus: ExpurgoStatus
): ExpurgoStatus[] {
  switch (currentStatus) {
    case ExpurgoStatus.PENDENTE:
      return [
        ExpurgoStatus.APROVADO,
        ExpurgoStatus.APROVADO_PARCIAL,
        ExpurgoStatus.REJEITADO,
      ];
    case ExpurgoStatus.APROVADO:
    case ExpurgoStatus.APROVADO_PARCIAL:
    case ExpurgoStatus.REJEITADO:
      return []; // Status finais não podem ser alterados
    default:
      return [];
  }
}
