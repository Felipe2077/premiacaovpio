#!/bin/bash

echo "🔧 Adicionando funções de validação ao shared-types..."

cd packages/shared-types

# 1. Fazer backup do arquivo atual
cp src/dto/expurgo.dto.ts src/dto/expurgo.dto.ts.backup

# 2. Adicionar as funções de validação ao arquivo expurgo.dto.ts
echo "📝 Atualizando expurgo.dto.ts com funções de validação..."

# Primeiro vamos verificar o conteúdo atual
echo "📄 Conteúdo atual do expurgo.dto.ts:"
cat src/dto/expurgo.dto.ts

echo -e "\n🔧 Adicionando funções de validação..."

# Criar nova versão com validações
cat > src/dto/expurgo.dto.ts << 'EOF'
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
  dataEventoInicio?: string;
  dataEventoFim?: string;
}

export interface ExpurgoResponseDto {
  id: number;
  dataEvento: string;
  descricaoEvento: string;
  justificativaSolicitacao: string;
  valorAjusteNumerico: number;
  status: ExpurgoStatus;
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
  registradoPorUserId: number;
  registradoPor?: {
    id: number;
    nome: string;
    email: string;
  };
  aprovadoPorUserId?: number | null;
  aprovadoPor?: {
    id: number;
    nome: string;
    email: string;
  } | null;
  aprovadoEm?: Date | string | null;
  justificativaAprovacao?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// ============================================
// 🔧 FUNÇÕES DE VALIDAÇÃO
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
    'valorAjusteNumerico'
  ];

  for (const field of requiredFields) {
    if (dto[field] === undefined || dto[field] === null || dto[field] === '') {
      throw new Error(`Campo obrigatório ausente: ${field}`);
    }
  }

  // Validações de tipo
  if (!Number.isInteger(dto.competitionPeriodId) || (dto.competitionPeriodId as number) <= 0) {
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
  if (typeof dataEventoStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dataEventoStr)) {
    throw new Error('dataEvento deve estar no formato YYYY-MM-DD');
  }

  // Validar se é uma data válida
  const dataEvento = new Date(dataEventoStr);
  if (isNaN(dataEvento.getTime())) {
    throw new Error('dataEvento deve ser uma data válida');
  }

  // Validação de strings
  if (typeof dto.descricaoEvento !== 'string' || dto.descricaoEvento.trim().length < 10) {
    throw new Error('descricaoEvento deve ter pelo menos 10 caracteres');
  }

  if (typeof dto.justificativaSolicitacao !== 'string' || dto.justificativaSolicitacao.trim().length < 20) {
    throw new Error('justificativaSolicitacao deve ter pelo menos 20 caracteres');
  }

  // Validação de valor numérico
  if (typeof dto.valorAjusteNumerico !== 'number' || !isFinite(dto.valorAjusteNumerico)) {
    throw new Error('valorAjusteNumerico deve ser um número válido');
  }

  if (dto.valorAjusteNumerico === 0) {
    throw new Error('valorAjusteNumerico não pode ser zero');
  }

  return {
    competitionPeriodId: dto.competitionPeriodId as number,
    sectorId: dto.sectorId as number,
    criterionId: dto.criterionId as number,
    dataEvento: dataEventoStr,
    descricaoEvento: (dto.descricaoEvento as string).trim(),
    justificativaSolicitacao: (dto.justificativaSolicitacao as string).trim(),
    valorAjusteNumerico: dto.valorAjusteNumerico as number,
  };
}

/**
 * Valida dados para aprovação/rejeição de expurgo
 */
export function validateApproveRejectExpurgo(data: unknown): ApproveRejectExpurgoDto {
  if (!data || typeof data !== 'object') {
    throw new Error('Dados de entrada devem ser um objeto');
  }

  const dto = data as Record<string, unknown>;

  // Validar campo obrigatório
  if (!dto.justificativaAprovacaoOuRejeicao || dto.justificativaAprovacaoOuRejeicao === '') {
    throw new Error('Campo obrigatório ausente: justificativaAprovacaoOuRejeicao');
  }

  // Validar tipo e tamanho
  if (typeof dto.justificativaAprovacaoOuRejeicao !== 'string') {
    throw new Error('justificativaAprovacaoOuRejeicao deve ser uma string');
  }

  const justificativa = dto.justificativaAprovacaoOuRejeicao.trim();
  if (justificativa.length < 10) {
    throw new Error('justificativaAprovacaoOuRejeicao deve ter pelo menos 10 caracteres');
  }

  if (justificativa.length > 1000) {
    throw new Error('justificativaAprovacaoOuRejeicao não pode exceder 1000 caracteres');
  }

  return {
    justificativaAprovacaoOuRejeicao: justificativa,
  };
}

/**
 * Valida dados para busca de expurgos
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

  // Validar IDs opcionais
  if (dto.competitionPeriodId !== undefined) {
    if (!Number.isInteger(dto.competitionPeriodId) || (dto.competitionPeriodId as number) <= 0) {
      throw new Error('competitionPeriodId deve ser um número inteiro positivo');
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
    if (!Number.isInteger(dto.criterionId) || (dto.criterionId as number) <= 0) {
      throw new Error('criterionId deve ser um número inteiro positivo');
    }
    result.criterionId = dto.criterionId as number;
  }

  // Validar status
  if (dto.status !== undefined) {
    if (!Object.values(ExpurgoStatus).includes(dto.status as ExpurgoStatus)) {
      throw new Error(`status deve ser um de: ${Object.values(ExpurgoStatus).join(', ')}`);
    }
    result.status = dto.status as ExpurgoStatus;
  }

  // Validar datas opcionais
  if (dto.dataEventoInicio !== undefined) {
    if (typeof dto.dataEventoInicio !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dto.dataEventoInicio)) {
      throw new Error('dataEventoInicio deve estar no formato YYYY-MM-DD');
    }
    result.dataEventoInicio = dto.dataEventoInicio;
  }

  if (dto.dataEventoFim !== undefined) {
    if (typeof dto.dataEventoFim !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dto.dataEventoFim)) {
      throw new Error('dataEventoFim deve estar no formato YYYY-MM-DD');
    }
    result.dataEventoFim = dto.dataEventoFim;
  }

  return result;
}
EOF

# 3. Atualizar index.ts para exportar as funções
echo "📝 Atualizando index.ts..."
cat > src/index.ts << 'EOF'
// === ENUMS ===
export * from './enums/expurgo-status.enum';

// === DTOs E INTERFACES ===
export * from './dto/expurgo.dto';
export * from './dto/parameter.dto';

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
EOF

# 4. Recompilar
echo "🔨 Recompilando shared-types..."
pnpm run build

if [ $? -eq 0 ]; then
  echo "✅ Compilação bem-sucedida!"
  
  echo "🔍 Verificando exports no index.d.ts:"
  grep -A 5 -B 5 "validate" dist/index.d.ts || echo "Funções validate não encontradas no .d.ts"
  
  # 5. Voltar para API e reinstalar
  echo "🔄 Atualizando dependências da API..."
  cd ../../apps/api
  pnpm install
  
  echo "🧪 Testando importação das funções de validação..."
  cat > test-validation.ts << 'EOF'
import { 
  validateCreateExpurgo,
  validateApproveRejectExpurgo,
  ExpurgoStatus 
} from '@sistema-premiacao/shared-types';

console.log('✅ Funções de validação importadas com sucesso!');

// Teste básico
try {
  const validData = {
    competitionPeriodId: 1,
    sectorId: 1,
    criterionId: 1,
    dataEvento: '2025-06-07',
    descricaoEvento: 'Teste de validação com descrição adequada',
    justificativaSolicitacao: 'Justificativa de teste com texto suficiente para validação',
    valorAjusteNumerico: -1
  };
  
  const result = validateCreateExpurgo(validData);
  console.log('✅ Validação funcionando:', result.dataEvento);
} catch (error) {
  console.error('❌ Erro na validação:', error);
}
EOF

  npx tsc --noEmit test-validation.ts
  
  if [ $? -eq 0 ]; then
    echo "🎉 Teste de validação passou!"
    rm test-validation.ts
    echo ""
    echo "✅ FUNÇÕES DE VALIDAÇÃO ADICIONADAS!"
    echo "🎯 Agora você pode usar:"
    echo "   - validateCreateExpurgo()"
    echo "   - validateApproveRejectExpurgo()"
    echo "   - validateFindExpurgos()"
  else
    echo "⚠️ Ainda há problemas na importação"
    rm test-validation.ts
  fi
  
else
  echo "❌ Erro na compilação"
  echo "Restaurando backup..."
  cp src/dto/expurgo.dto.ts.backup src/dto/expurgo.dto.ts
fi

echo "🎯 Funções de validação configuradas!"