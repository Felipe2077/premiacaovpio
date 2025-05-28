// Definição do tipo para metadados
export interface ParameterMetadata {
  calculationMethod?: 'media3' | 'media6' | 'ultimo' | 'melhor3' | 'manual';
  adjustmentPercentage?: number;
  baseValue?: number;
  wasRounded?: boolean;
  roundingMethod?: 'nearest' | 'up' | 'down';
  roundingDecimalPlaces?: number;
}

// Atualizar o DTO de criação para incluir metadados
export interface CreateParameterDto {
  nomeParametro?: string;
  valor: string;
  dataInicioEfetivo: string; // YYYY-MM-DD
  criterionId: number;
  sectorId?: number | null;
  competitionPeriodId: number;
  justificativa: string;
  metadata?: ParameterMetadata;
}

// Atualizar o DTO de atualização para incluir metadados
export interface UpdateParameterDto {
  nomeParametro?: string;
  valor?: string;
  dataInicioEfetivo?: string; // YYYY-MM-DD
  dataFimEfetivoAnterior?: string; // YYYY-MM-DD
  justificativa: string;
  metadata?: ParameterMetadata;
}

// Novo DTO para cálculo automático
export interface CalculateParameterDto {
  criterionId: number;
  sectorId?: number | null;
  competitionPeriodId: number;
  calculationMethod: 'media3' | 'media6' | 'ultimo' | 'melhor3' | 'manual';
  adjustmentPercentage?: number;
  // Informações sobre arredondamento (apenas para registro)
  wasRounded?: boolean;
  roundingMethod?: 'nearest' | 'up' | 'down';
  roundingDecimalPlaces?: number;
  // Valor final já arredondado pelo frontend
  finalValue?: number;
  saveAsDefault?: boolean;
  justificativa: string;
  previewOnly: boolean;
  ipAddress?: string; // Opcional, para auditoria
}

// Novo DTO para configurações de critério
export interface CriterionCalculationSettingsDto {
  criterionId: number;
  calculationMethod: 'media3' | 'media6' | 'ultimo' | 'melhor3' | 'manual';
  adjustmentPercentage?: number;
  requiresRounding?: boolean;
  roundingMethod?: 'nearest' | 'up' | 'down';
  roundingDecimalPlaces?: number;
}
