#!/bin/bash

echo "🔧 Adicionando tipos de ranking ao shared-types..."

cd packages/shared-types

# 1. Criar arquivo ranking.dto.ts
echo "📝 Criando ranking.dto.ts..."
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

/**
 * Regras aplicadas no cálculo automático de metas
 */
export interface RegrasAplicadasPadrao {
  /** Método de cálculo utilizado (ex: 'media3', 'ultimo', 'melhor3') */
  metodoCalculo: string;
  
  /** Percentual de ajuste aplicado (ex: -5 para reduzir 5%) */
  percentualAjuste?: number;
  
  /** Valor base calculado antes dos ajustes */
  valorBase?: number;
  
  /** Indica se houve arredondamento */
  houveArredondamento?: boolean;
  
  /** Método de arredondamento aplicado */
  metodoArredondamento?: 'up' | 'down' | 'nearest';
  
  /** Número de casas decimais para arredondamento */
  casasDecimaisArredondamento?: number;
  
  /** Períodos utilizados no cálculo histórico */
  periodosUtilizados?: string[];
  
  /** Observações sobre o cálculo */
  observacoes?: string;
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
EOF

# 2. Atualizar index.ts
echo "📝 Atualizando index.ts..."
cat > src/index.ts << 'EOF'
// === ENUMS ===
export * from './enums/expurgo-status.enum';

// === DTOs E INTERFACES ===
export * from './dto/expurgo.dto';
export * from './dto/parameter.dto';
export * from './dto/ranking.dto';

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
EOF

# 3. Recompilar
echo "🔨 Recompilando shared-types..."
pnpm run build

if [ $? -eq 0 ]; then
  echo "✅ Compilação bem-sucedida!"
  
  echo "🔍 Verificando exports de ranking..."
  grep -E "(EntradaRanking|EntradaResultadoDetalhado|RegrasAplicadasPadrao)" dist/index.d.ts || echo "⚠️ Tipos não encontrados no .d.ts"
  
  # 4. Voltar para API e testar
  echo "🔄 Testando na API..."
  cd ../../apps/api
  
  echo "🧪 Verificando importação..."
  cat > test-ranking-types.ts << 'EOF'
import { 
  EntradaRanking,
  EntradaResultadoDetalhado,
  RegrasAplicadasPadrao
} from '@sistema-premiacao/shared-types';

console.log('✅ Tipos de ranking importados com sucesso!');

// Teste de tipagem
const testRanking: EntradaRanking = {
  RANK: 1,
  SETOR: 'GAMA',
  PONTUACAO: 5.5
};

const testResultado: EntradaResultadoDetalhado = {
  setorId: 1,
  setorNome: 'GAMA',
  criterioId: 1,
  criterioNome: 'ATRASO',
  periodo: '2025-06',
  valorRealizado: 10,
  valorMeta: 15,
  percentualAtingimento: 0.67,
  pontos: 1.5
};

console.log('✅ Tipagem dos rankings funcionando!');
EOF

  npx tsc --noEmit test-ranking-types.ts
  
  if [ $? -eq 0 ]; then
    echo "🎉 Tipos de ranking funcionando!"
    rm test-ranking-types.ts
    
    echo "🚀 Testando servidor..."
    timeout 10s pnpm dev || echo "⏱️ Timeout (normal para teste)"
    
  else
    echo "❌ Ainda há problemas com os tipos"
    rm test-ranking-types.ts
  fi
  
else
  echo "❌ Erro na compilação do shared-types"
fi

echo ""
echo "🎯 TIPOS DE RANKING ADICIONADOS:"
echo "✅ EntradaRanking"
echo "✅ EntradaResultadoDetalhado" 
echo "✅ RegrasAplicadasPadrao"
echo "✅ DTOs auxiliares para requests/responses"