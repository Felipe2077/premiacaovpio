// packages/shared-types/src/dto/history.dto.ts
export interface HistoryEntryDto {
  id: number;
  periodo: string;
  valorMeta: number | null;
  valorRealizado: number | null;
  percentualAtingimento: number | null;
  rank: number | null;
  pontos: number | null;
  status: 'ATIVA' | 'EXPIRADA' | 'FUTURA';
  criadoPor: string;
  justificativa: string;
  dataCriacao: string;
  dataInicioEfetivo: string;
  dataFimEfetivo: string | null;
  versao: number;
  metadata?: {
    calculationMethod?: string;
    adjustmentPercentage?: number;
    baseValue?: number;
  };
}

export interface HistorySummaryDto {
  avgAttainment: number;
  bestPeriod: { period: string; attainment: number; rank?: number };
  worstPeriod: { period: string; attainment: number; rank?: number };
  totalVersions: number;
  timeSpan: string;
  currentStreak?: { type: 'positive' | 'negative'; count: number };
}

export interface HistoryDataDto {
  summary: HistorySummaryDto;
  timeline: HistoryEntryDto[];
  criterion: {
    id: number;
    nome: string;
    unidade_medida: string;
    sentido_melhor: string;
  };
  sector: {
    id: number;
    nome: string;
  };
}
