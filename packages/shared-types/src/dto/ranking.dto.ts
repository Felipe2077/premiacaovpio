/**
 * Entrada do ranking geral (resultado final da premiação)
 */
export interface EntradaRanking {
  /** Posição no ranking (1º, 2º, 3º, etc.) */
  RANK: number;
  
  /** Nome do setor/filial */
  SETOR: string;
  
  /** Pontuação total acumulada (menor é melhor) */
  PONTUACAO: number;
}

/**
 * Entrada detalhada dos resultados por critério e setor
 */
export interface EntradaResultadoDetalhado {
  /** ID do setor */
  setorId: number;
  
  /** Nome do setor */
  setorNome: string;
  
  /** ID do critério */
  criterioId: number;
  
  /** Nome do critério */
  criterioNome: string;
  
  /** Período de referência (YYYY-MM) */
  periodo: string;
  
  /** Valor realizado pelo setor no critério */
  valorRealizado: number | null;
  
  /** Meta definida para o setor/critério */
  valorMeta: number | null;
  
  /** Percentual de atingimento da meta (valorRealizado / valorMeta) */
  percentualAtingimento: number | null;
  
  /** Pontos atribuídos baseado no ranking do critério */
  pontos: number | null;
  
  // === CAMPOS PARA MODO PLANEJAMENTO ===
  
  /** Meta proposta pelo sistema baseada em cálculos automáticos */
  metaPropostaPadrao?: number | null;
  
  /** Valor da meta do período anterior */
  metaAnteriorValor?: number | null;
  
  /** Período da meta anterior (YYYY-MM) */
  metaAnteriorPeriodo?: string | null;
  
  /** Regras aplicadas no cálculo automático da meta */
  regrasAplicadasPadrao?: RegrasAplicadasPadrao | null;
  
  /** Valor da meta definida manualmente (se houver) */
  metaDefinidaValor?: number | null;
  
  /** Indica se existe meta definida manualmente */
  isMetaDefinida?: boolean;
}
/**
 * Regras aplicadas no cálculo automático de metas
 * Interface flexível que suporta diferentes nomes de campos para compatibilidade
 */
export interface RegrasAplicadasPadrao {
  // === CAMPOS PRINCIPAIS ===
  
  /** Método de cálculo utilizado (ex: 'media3', 'ultimo', 'melhor3') */
  metodoCalculo?: string;
  
  /** Método de cálculo utilizado (alias para compatibilidade) */
  calculationMethod?: string;
  
  /** Label descritivo do método de cálculo (ex: 'Média dos 3 últimos períodos') */
  calculationMethodLabel?: string;
  
  // === AJUSTES E PERCENTUAIS ===
  
  /** Percentual de ajuste aplicado (ex: -5 para reduzir 5%) */
  percentualAjuste?: number;
  
  /** Percentual de ajuste aplicado (alias para compatibilidade) */
  adjustmentPercentage?: number;
  
  // === VALORES BASE ===
  
  /** Valor base calculado antes dos ajustes */
  valorBase?: number;
  
  /** Valor base calculado (alias para compatibilidade) */
  baseValue?: number;
  
  // === ARREDONDAMENTO ===
  
  /** Indica se houve arredondamento */
  houveArredondamento?: boolean;
  
  /** Indica se houve arredondamento (alias para compatibilidade) */
  wasRounded?: boolean;
  
  /** Método de arredondamento aplicado */
  metodoArredondamento?: 'up' | 'down' | 'nearest' | 'none';
  
  /** Método de arredondamento (alias para compatibilidade) */
  roundingMethod?: 'up' | 'down' | 'nearest' | 'none';
  
  /** Número de casas decimais para arredondamento */
  casasDecimaisArredondamento?: number;
  
  /** Número de casas decimais (alias para compatibilidade) */
  roundingDecimalPlaces?: number;
  
  // === DADOS HISTÓRICOS ===
  
  /** Períodos utilizados no cálculo histórico */
  periodosUtilizados?: string[];
  
  /** Observações sobre o cálculo */
  observacoes?: string;
  
  // === CAMPOS ADICIONAIS PARA COMPATIBILIDADE ===
  
  /** Direção de melhoria do critério */
  criterionBetterDirection?: 'MAIOR' | 'MENOR';
  
  /** Dados históricos utilizados no cálculo */
  historicalDataUsed?: Array<{
    periodo: string;
    valorRealizado: number | null;
    valorMeta: number | null;
  }>;
  
  /** Timestamp do cálculo */
  calculatedAt?: Date | string;
  
  /** Versão do algoritmo de cálculo utilizado */
  algorithmVersion?: string;
}

/**
 * DTO para requisições de ranking
 */
export interface GetRankingDto {
  /** Período para buscar o ranking (YYYY-MM) */
  period?: string;
  
  /** Incluir detalhes por critério */
  includeDetails?: boolean;
}

/**
 * DTO para requisições de resultados detalhados
 */
export interface GetResultsDto {
  /** Período para buscar resultados (YYYY-MM) */
  period?: string;
  
  /** Data específica para busca (YYYY-MM-DD) */
  targetDate?: string;
  
  /** Filtrar por setor específico */
  sectorId?: number;
  
  /** Filtrar por critério específico */
  criterionId?: number;
}

/**
 * DTO de resposta para ranking com metadados
 */
export interface RankingResponseDto {
  /** Lista do ranking ordenado */
  ranking: EntradaRanking[];
  
  /** Metadados da consulta */
  metadata: {
    /** Período consultado */
    period: string;
    
    /** Data de geração do ranking */
    generatedAt: Date | string;
    
    /** Número total de setores no ranking */
    totalSectors: number;
    
    /** Status do período (PLANEJAMENTO, ATIVA, FECHADA) */
    periodStatus: string;
  };
}

/**
 * DTO de resposta para resultados detalhados com metadados
 */
export interface DetailedResultsResponseDto {
  /** Lista de resultados detalhados */
  results: EntradaResultadoDetalhado[];
  
  /** Metadados da consulta */
  metadata: {
    /** Período consultado */
    period: string;
    
    /** Data alvo utilizada */
    targetDate: string;
    
    /** Estratégia de busca utilizada */
    searchStrategy: string;
    
    /** Número total de resultados */
    totalResults: number;
    
    /** Status do período */
    periodStatus: string;
  };
}
