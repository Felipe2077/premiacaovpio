import { RegrasAplicadasPadrao } from './ranking.dto';

/**
 * Interface para dados históricos de performance
 */
export interface HistoricalPerformanceDataItem {
  /** Período no formato YYYY-MM */
  periodo: string;
  
  /** Valor realizado no período */
  valorRealizado: number | null;
  
  /** Meta definida para o período */
  valorMeta: number | null;
}

/**
 * Output do serviço de dados para células de planejamento
 */
export interface PlanningCellOutput {
  /** Meta proposta automaticamente pelo sistema */
  metaPropostaPadrao: number | null;
  
  /** Valor da meta do período anterior */
  metaAnteriorValor: number | null;
  
  /** Período da meta anterior (YYYY-MM) */
  metaAnteriorPeriodo: string | null;
  
  /** Regras aplicadas no cálculo da meta proposta */
  regrasAplicadasPadrao: RegrasAplicadasPadrao | null;
  
  /** Valor da meta definida manualmente (se houver) */
  metaDefinidaValor: number | null;
  
  /** Indica se existe meta definida manualmente */
  isMetaDefinida: boolean;
  
  /** ID da meta definida no banco (se houver) */
  idMetaDefinida?: number | null;
}

/**
 * DTO para requisição de dados de planejamento
 */
export interface GetPlanningDataDto {
  /** ID do critério */
  criterionId: number;
  
  /** ID do setor (null para meta geral) */
  sectorId: number | null;
  
  /** Período de planejamento (YYYY-MM) */
  planningPeriod: string;
  
  /** Incluir dados históricos detalhados */
  includeHistoricalData?: boolean;
  
  /** Número de períodos históricos para análise */
  historicalPeriodsCount?: number;
}

/**
 * DTO para parâmetros de cálculo de meta proposta
 */
export interface CalculateProposedMetaDto {
  /** Dados históricos para cálculo */
  historicalData: HistoricalPerformanceDataItem[];
  
  /** Método de cálculo (media3, ultimo, melhor3, etc.) */
  calculationMethod: string;
  
  /** Percentual de ajuste (-5, +10, etc.) */
  adjustmentPercentage: string | number;
  
  /** Método de arredondamento */
  roundingMethod: string;
  
  /** Número de casas decimais */
  decimalPlaces: string | number;
  
  /** Direção de melhoria do critério */
  criterionBetterDirection?: 'MAIOR' | 'MENOR';
}

/**
 * DTO de resposta para cálculo de meta proposta
 */
export interface ProposedMetaResponseDto {
  /** Valor da meta proposta */
  proposedValue: number | null;
  
  /** Detalhes do cálculo realizado */
  calculationDetails: {
    /** Valor base antes de ajustes */
    baseValue: number;
    
    /** Percentual aplicado */
    adjustmentApplied: number;
    
    /** Valor após ajuste mas antes do arredondamento */
    valueAfterAdjustment: number;
    
    /** Valor final após arredondamento */
    finalValue: number;
    
    /** Houve arredondamento */
    wasRounded: boolean;
  };
  
  /** Regras aplicadas no cálculo */
  rulesApplied: RegrasAplicadasPadrao;
  
  /** Dados históricos utilizados */
  historicalDataUsed: HistoricalPerformanceDataItem[];
}
