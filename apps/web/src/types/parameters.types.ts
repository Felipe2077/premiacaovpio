// src/types/parameters.types.ts
export interface CompetitionPeriod {
  id: number;
  mesAno: string;
  status: 'ATIVA' | 'FECHADA' | 'PLANEJAMENTO';
  startDate: Date | string;
  dataInicio?: Date | string; // Alias para startDate se necessário
}

export interface Sector {
  id: number;
  nome: string;
}

export interface EditData {
  criterionId: number;
  criterioNome: string;
  setorId: number | null;
  setorNome: string;
}

export interface CreateData extends EditData {
  competitionPeriodId: number;
}

export interface CalculateData {
  criterioId: number;
  criterioNome: string;
  setorId: number | null;
  setorNome: string;
  competitionPeriodId: number;
  competitionPeriodDate: Date | string | number;
}

export interface HistoricalDataItem {
  periodo: string;
  valorRealizado: number | null;
  valorMeta: number | null;
  status: 'FECHADO' | 'ABERTO_OU_SEM_DADOS';
}

export interface CalculationSettings {
  calculationMethod: string;
  calculationAdjustment: string;
  roundingMethod: string;
  decimalPlaces: string;
  saveAsDefault: boolean;
}
