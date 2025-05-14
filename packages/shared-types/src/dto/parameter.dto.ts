export interface CreateParameterDto {
  nomeParametro?: string;
  valor: string;
  dataInicioEfetivo: string; // YYYY-MM-DD
  criterionId: number;
  sectorId?: number | null;
  competitionPeriodId: number;
  justificativa: string;
}

export interface UpdateParameterDto {
  nomeParametro?: string;
  valor?: string;
  dataInicioEfetivo?: string; // YYYY-MM-DD
  dataFimEfetivoAnterior?: string; // YYYY-MM-DD
  justificativa: string;
}
