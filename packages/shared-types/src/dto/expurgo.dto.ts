// packages/shared-types/src/dto/expurgo.dto.ts
import { ExpurgoStatus } from '../enums/expurgo-status.enum'; // Criaremos este enum

export interface CreateExpurgoDto {
  competitionPeriodId: number;
  sectorId: number;
  criterionId: number;
  dataEvento: string; // YYYY-MM-DD
  descricaoEvento: string;
  justificativaSolicitacao: string;
  valorAjusteNumerico: number; // O valor a ser expurgado (ex: -1 para uma quebra, ou o KM para KM Ociosa)
}

export interface ApproveRejectExpurgoDto {
  justificativaAprovacaoOuRejeicao: string;
}

export interface FindExpurgosDto {
  competitionPeriodId?: number;
  sectorId?: number;
  criterionId?: number;
  status?: ExpurgoStatus;
  // Adicionar paginação no futuro
  // page?: number;
  // limit?: number;
}
