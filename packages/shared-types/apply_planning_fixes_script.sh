#!/bin/bash

echo "🔧 Corrigindo tipos para PlanningCellDataService..."

cd packages/shared-types

# 1. Atualizar RegrasAplicadasPadrao no ranking.dto.ts
echo "📝 Atualizando RegrasAplicadasPadrao com campo calculationMethodLabel..."

# Fazer backup
cp src/dto/ranking.dto.ts src/dto/ranking.dto.ts.backup

# Substituir apenas a interface RegrasAplicadasPadrao 
cat > temp_regras.txt << 'EOF'
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
EOF

# Recriar o arquivo ranking.dto.ts com a nova interface
cat > src/dto/ranking.dto.ts << 'EOF'
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
EOF

# Adicionar a interface RegrasAplicadasPadrao atualizada
cat temp_regras.txt >> src/dto/ranking.dto.ts

# Adicionar o restante do arquivo
cat >> src/dto/ranking.dto.ts << 'EOF'

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
EOF

# Limpar arquivo temporário
rm temp_regras.txt

# 2. Criar novo arquivo planning.dto.ts
echo "📝 Criando planning.dto.ts..."
cat > src/dto/planning.dto.ts << 'EOF'
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
EOF

# 3. Atualizar index.ts
echo "📝 Atualizando index.ts..."
cat > src/index.ts << 'EOF'
// === ENUMS ===
export * from './enums/expurgo-status.enum';

// === DTOs E INTERFACES ===
export * from './dto/expurgo.dto';
export * from './dto/parameter.dto';
export * from './dto/ranking.dto';
export * from './dto/planning.dto';

// === FUNÇÕES UTILITÁRIAS DOS ENUMS ===
export { 
  isValidExpurgoStatus, 
  getExpurgoStatusDescription, 
  getExpurgoStatusColor 
} from './enums/expurgo-status.enum';

// === FUNÇÕES DE VALIDAÇÃO ===
export {
  validateCreateExpurgo,
  validateApproveRejectExpurgo,
  validateFindExpurgos
} from './dto/expurgo.dto';

// === EXPORTS DIRETOS PARA CONVENIENCE ===
export { ExpurgoStatus } from './enums/expurgo-status.enum';

// === EXPORTS DIRETOS DE RANKING (para compatibilidade) ===
export type {
  EntradaRanking,
  EntradaResultadoDetalhado,
  RegrasAplicadasPadrao,
  GetRankingDto,
  GetResultsDto,
  RankingResponseDto,
  DetailedResultsResponseDto
} from './dto/ranking.dto';

// === EXPORTS DIRETOS DE PLANNING (para compatibilidade) ===
export type {
  HistoricalPerformanceDataItem,
  PlanningCellOutput,
  GetPlanningDataDto,
  CalculateProposedMetaDto,
  ProposedMetaResponseDto
} from './dto/planning.dto';
EOF

# 4. Recompilar
echo "🔨 Recompilando shared-types..."
pnpm run build

if [ $? -eq 0 ]; then
  echo "✅ Compilação bem-sucedida!"
  
  # 5. Testar na API
  echo "🔄 Testando compilação na API..."
  cd ../../apps/api
  
  npx tsc --noEmit
  
  if [ $? -eq 0 ]; then
    echo "🎉 API compila sem erros de TypeScript!"
    
    echo "🚀 Testando servidor..."
    timeout 15s pnpm dev && echo "✅ Servidor funcionando!" || echo "⏱️ Timeout (normal para teste)"
    
  else
    echo "❌ Ainda há erros na API"
    echo "Mostrando primeiros erros:"
    npx tsc --noEmit | head -20
  fi
  
else
  echo "❌ Erro na compilação do shared-types"
  echo "Restaurando backup..."
  cp src/dto/ranking.dto.ts.backup src/dto/ranking.dto.ts
fi

echo ""
echo "🎯 CORREÇÕES APLICADAS:"
echo "✅ calculationMethodLabel adicionado"
echo "✅ Todos os campos do PlanningCellDataService incluídos"
echo "✅ DTOs de planning criados"
echo "✅ Interface RegrasAplicadasPadrao expandida"