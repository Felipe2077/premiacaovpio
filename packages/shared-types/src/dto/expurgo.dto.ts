// packages/shared-types/src/dto/expurgo.dto.ts (ATUALIZADO PARA NOVA ESTRUTURA)

import { ExpurgoStatus } from '../enums/expurgo-status.enum';

/**
 * DTO para criação de nova solicitação de expurgo
 */
export interface CreateExpurgoDto {
  competitionPeriodId: number;
  sectorId: number;
  criterionId: number;
  dataEvento: string; // YYYY-MM-DD
  descricaoEvento: string;
  justificativaSolicitacao: string;
  valorSolicitado: number; // 🆕 RENOMEADO: valorAjusteNumerico -> valorSolicitado

  // 🆕 CAMPOS PARA ANEXOS (opcionais na criação inicial)
  anexos?: File[]; // Para frontend
  anexoIds?: number[]; // Para casos onde anexos já foram enviados separadamente
}

/**
 * 🆕 DTO para aprovação com valor customizado
 */
export interface ApproveExpurgoDto {
  valorAprovado: number; // Valor que será efetivamente aprovado
  justificativaAprovacao: string;
  observacoes?: string; // Campo opcional para observações adicionais
}

/**
 * DTO para rejeição de expurgo
 */
export interface RejectExpurgoDto {
  justificativaRejeicao: string;
  observacoes?: string;
}

/**
 * 🆕 DTO genérico para aprovação/rejeição (para compatibilidade)
 */
export interface ApproveRejectExpurgoDto {
  justificativaAprovacaoOuRejeicao: string;
  valorAprovado?: number; // Opcional para aprovação
  observacoes?: string;
}

/**
 * DTO para busca/filtro de expurgos
 */
export interface FindExpurgosDto {
  competitionPeriodId?: number;
  sectorId?: number;
  criterionId?: number;
  status?: ExpurgoStatus;
  dataEventoInicio?: string;
  dataEventoFim?: string;
  registradoPorUserId?: number; // 🆕 Filtro por solicitante
  aprovadoPorUserId?: number; // 🆕 Filtro por aprovador
  comAnexos?: boolean; // 🆕 Filtro por expurgos com anexos
  valorMinimoSolicitado?: number; // 🆕 Filtros por valor
  valorMaximoSolicitado?: number;
}

/**
 * 🆕 DTO para dados de anexo
 */
export interface ExpurgoAttachmentDto {
  id: number;
  originalFileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: Date | string;
  uploadedBy?: {
    id: number;
    nome: string;
  };
  description?: string;
  downloadUrl?: string; // URL para download
}

/**
 * DTO de resposta completa do expurgo
 */
export interface ExpurgoResponseDto {
  id: number;
  dataEvento: string;
  descricaoEvento: string;
  justificativaSolicitacao: string;

  // 🆕 VALORES SEPARADOS
  valorSolicitado: number;
  valorAprovado?: number | null;

  status: ExpurgoStatus;

  // Relacionamentos
  competitionPeriodId: number;
  competitionPeriod?: {
    id: number;
    mesAno: string;
    status: string;
  };
  sectorId: number;
  sector?: {
    id: number;
    nome: string;
  };
  criterionId: number;
  criterion?: {
    id: number;
    nome: string;
    unidade_medida?: string;
  };

  // Auditoria
  registradoPorUserId: number;
  registradoPor?: {
    id: number;
    nome: string;
    email: string;
    role?: string; // 🆕 Campo role
  };
  aprovadoPorUserId?: number | null;
  aprovadoPor?: {
    id: number;
    nome: string;
    email: string;
    role?: string; // 🆕 Campo role
  } | null;
  aprovadoEm?: Date | string | null;
  justificativaAprovacao?: string | null;

  // 🆕 ANEXOS
  anexos?: ExpurgoAttachmentDto[];
  quantidadeAnexos?: number;

  // 🆕 CAMPOS CALCULADOS
  percentualAprovacao?: number | null;
  valorEfetivo?: number; // Valor que será aplicado no cálculo
  houveReducao?: boolean;

  // Timestamps
  createdAt: Date | string;
  updatedAt: Date | string;
}

/**
 * 🆕 DTO para upload de anexos
 */
export interface UploadExpurgoAttachmentDto {
  expurgoId: number;
  description?: string;
  file: File; // Para frontend
}

/**
 * 🆕 DTO para estatísticas de expurgos
 */
export interface ExpurgoStatisticsDto {
  periodo?: string;
  total: number;
  pendentes: number;
  aprovados: number;
  aprovadosParciais: number;
  rejeitados: number;

  // Por setor
  bySector: Record<
    string,
    {
      total: number;
      pendentes: number;
      aprovados: number;
      rejeitados: number;
      valorTotalSolicitado: number;
      valorTotalAprovado: number;
    }
  >;

  // Por critério
  byCriterion: Record<
    string,
    {
      total: number;
      valorTotalSolicitado: number;
      valorTotalAprovado: number;
    }
  >;

  // Totais financeiros
  valorTotalSolicitado: number;
  valorTotalAprovado: number;
  percentualAprovacaoGeral: number;

  // 🆕 Anexos
  totalAnexos: number;
  expurgosComAnexos: number;
}

// ============================================
// 🔧 FUNÇÕES DE VALIDAÇÃO ATUALIZADAS
// ============================================

/**
 * Valida dados para criação de expurgo
 */
export function validateCreateExpurgo(data: unknown): CreateExpurgoDto {
  if (!data || typeof data !== 'object') {
    throw new Error('Dados de entrada devem ser um objeto');
  }

  const dto = data as Record<string, unknown>;

  // Validação de campos obrigatórios
  const requiredFields = [
    'competitionPeriodId',
    'sectorId',
    'criterionId',
    'dataEvento',
    'descricaoEvento',
    'justificativaSolicitacao',
    'valorSolicitado', // 🆕 ATUALIZADO
  ];

  for (const field of requiredFields) {
    if (dto[field] === undefined || dto[field] === null || dto[field] === '') {
      throw new Error(`Campo obrigatório ausente: ${field}`);
    }
  }

  // Validações de tipo
  if (
    !Number.isInteger(dto.competitionPeriodId) ||
    (dto.competitionPeriodId as number) <= 0
  ) {
    throw new Error('competitionPeriodId deve ser um número inteiro positivo');
  }

  if (!Number.isInteger(dto.sectorId) || (dto.sectorId as number) <= 0) {
    throw new Error('sectorId deve ser um número inteiro positivo');
  }

  if (!Number.isInteger(dto.criterionId) || (dto.criterionId as number) <= 0) {
    throw new Error('criterionId deve ser um número inteiro positivo');
  }

  // Validação de data (formato YYYY-MM-DD)
  const dataEventoStr = dto.dataEvento as string;
  if (
    typeof dataEventoStr !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(dataEventoStr)
  ) {
    throw new Error('dataEvento deve estar no formato YYYY-MM-DD');
  }

  // Validar se é uma data válida
  const dataEvento = new Date(dataEventoStr);
  if (isNaN(dataEvento.getTime())) {
    throw new Error('dataEvento deve ser uma data válida');
  }

  // Validação de strings
  if (
    typeof dto.descricaoEvento !== 'string' ||
    dto.descricaoEvento.trim().length < 10
  ) {
    throw new Error('descricaoEvento deve ter pelo menos 10 caracteres');
  }

  if (
    typeof dto.justificativaSolicitacao !== 'string' ||
    dto.justificativaSolicitacao.trim().length < 20
  ) {
    throw new Error(
      'justificativaSolicitacao deve ter pelo menos 20 caracteres'
    );
  }

  // 🆕 Validação do valorSolicitado
  if (
    typeof dto.valorSolicitado !== 'number' ||
    !isFinite(dto.valorSolicitado)
  ) {
    throw new Error('valorSolicitado deve ser um número válido');
  }

  if (dto.valorSolicitado === 0) {
    throw new Error('valorSolicitado não pode ser zero');
  }

  return {
    competitionPeriodId: dto.competitionPeriodId as number,
    sectorId: dto.sectorId as number,
    criterionId: dto.criterionId as number,
    dataEvento: dataEventoStr,
    descricaoEvento: (dto.descricaoEvento as string).trim(),
    justificativaSolicitacao: (dto.justificativaSolicitacao as string).trim(),
    valorSolicitado: dto.valorSolicitado as number, // 🆕 ATUALIZADO
  };
}

/**
 * 🆕 Valida dados para aprovação com valor customizado
 */
export function validateApproveExpurgo(data: unknown): ApproveExpurgoDto {
  if (!data || typeof data !== 'object') {
    throw new Error('Dados de entrada devem ser um objeto');
  }

  const dto = data as Record<string, unknown>;

  // Validar campos obrigatórios
  if (!dto.valorAprovado || typeof dto.valorAprovado !== 'number') {
    throw new Error('valorAprovado é obrigatório e deve ser um número');
  }

  if (
    !dto.justificativaAprovacao ||
    typeof dto.justificativaAprovacao !== 'string'
  ) {
    throw new Error('justificativaAprovacao é obrigatória');
  }

  if (dto.valorAprovado === 0) {
    throw new Error('valorAprovado não pode ser zero');
  }

  if (!isFinite(dto.valorAprovado)) {
    throw new Error('valorAprovado deve ser um número válido');
  }

  const justificativa = (dto.justificativaAprovacao as string).trim();
  if (justificativa.length < 10) {
    throw new Error('justificativaAprovacao deve ter pelo menos 10 caracteres');
  }

  return {
    valorAprovado: dto.valorAprovado as number,
    justificativaAprovacao: justificativa,
    observacoes: dto.observacoes
      ? (dto.observacoes as string).trim()
      : undefined,
  };
}

/**
 * 🆕 Valida dados para rejeição
 */
export function validateRejectExpurgo(data: unknown): RejectExpurgoDto {
  if (!data || typeof data !== 'object') {
    throw new Error('Dados de entrada devem ser um objeto');
  }

  const dto = data as Record<string, unknown>;

  if (
    !dto.justificativaRejeicao ||
    typeof dto.justificativaRejeicao !== 'string'
  ) {
    throw new Error('justificativaRejeicao é obrigatória');
  }

  const justificativa = (dto.justificativaRejeicao as string).trim();
  if (justificativa.length < 10) {
    throw new Error('justificativaRejeicao deve ter pelo menos 10 caracteres');
  }

  return {
    justificativaRejeicao: justificativa,
    observacoes: dto.observacoes
      ? (dto.observacoes as string).trim()
      : undefined,
  };
}

/**
 * Valida dados para busca de expurgos (atualizada)
 */
export function validateFindExpurgos(data: unknown): FindExpurgosDto {
  if (!data) {
    return {}; // Filtros são opcionais
  }

  if (typeof data !== 'object') {
    throw new Error('Filtros devem ser um objeto');
  }

  const dto = data as Record<string, unknown>;
  const result: FindExpurgosDto = {};

  // Validações de IDs (mantidas as existentes + novas)
  if (dto.competitionPeriodId !== undefined) {
    if (
      !Number.isInteger(dto.competitionPeriodId) ||
      (dto.competitionPeriodId as number) <= 0
    ) {
      throw new Error(
        'competitionPeriodId deve ser um número inteiro positivo'
      );
    }
    result.competitionPeriodId = dto.competitionPeriodId as number;
  }

  if (dto.sectorId !== undefined) {
    if (!Number.isInteger(dto.sectorId) || (dto.sectorId as number) <= 0) {
      throw new Error('sectorId deve ser um número inteiro positivo');
    }
    result.sectorId = dto.sectorId as number;
  }

  if (dto.criterionId !== undefined) {
    if (
      !Number.isInteger(dto.criterionId) ||
      (dto.criterionId as number) <= 0
    ) {
      throw new Error('criterionId deve ser um número inteiro positivo');
    }
    result.criterionId = dto.criterionId as number;
  }

  // 🆕 Validações de novos filtros
  if (dto.registradoPorUserId !== undefined) {
    if (
      !Number.isInteger(dto.registradoPorUserId) ||
      (dto.registradoPorUserId as number) <= 0
    ) {
      throw new Error(
        'registradoPorUserId deve ser um número inteiro positivo'
      );
    }
    result.registradoPorUserId = dto.registradoPorUserId as number;
  }

  if (dto.aprovadoPorUserId !== undefined) {
    if (
      !Number.isInteger(dto.aprovadoPorUserId) ||
      (dto.aprovadoPorUserId as number) <= 0
    ) {
      throw new Error('aprovadoPorUserId deve ser um número inteiro positivo');
    }
    result.aprovadoPorUserId = dto.aprovadoPorUserId as number;
  }

  // Validar status (incluindo novo status)
  if (dto.status !== undefined) {
    if (!Object.values(ExpurgoStatus).includes(dto.status as ExpurgoStatus)) {
      throw new Error(
        `status deve ser um de: ${Object.values(ExpurgoStatus).join(', ')}`
      );
    }
    result.status = dto.status as ExpurgoStatus;
  }

  // Validações de datas (mantidas)
  if (dto.dataEventoInicio !== undefined) {
    if (
      typeof dto.dataEventoInicio !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(dto.dataEventoInicio)
    ) {
      throw new Error('dataEventoInicio deve estar no formato YYYY-MM-DD');
    }
    result.dataEventoInicio = dto.dataEventoInicio;
  }

  if (dto.dataEventoFim !== undefined) {
    if (
      typeof dto.dataEventoFim !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(dto.dataEventoFim)
    ) {
      throw new Error('dataEventoFim deve estar no formato YYYY-MM-DD');
    }
    result.dataEventoFim = dto.dataEventoFim;
  }

  return result;
}
