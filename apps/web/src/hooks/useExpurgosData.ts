// apps/web/src/hooks/useExpurgosData.ts (CORRIGIDO COMPLETO)
'use client';

import { useQuery } from '@tanstack/react-query';

// Tipos atualizados para refletir o backend
interface ExpurgoResponseDto {
  id: number;
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
  dataEvento: string;
  descricaoEvento: string;
  justificativaSolicitacao: string;
  status: 'PENDENTE' | 'APROVADO' | 'APROVADO_PARCIAL' | 'REJEITADO';

  // Valores separados
  valorSolicitado: number;
  valorAprovado?: number | null;

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
  aprovadoEm?: string | null;
  justificativaAprovacao?: string | null;

  // Dados de anexos
  anexos?: Array<{
    id: number;
    originalFileName: string;
    fileSize: number;
    mimeType: string;
    uploadedAt: string;
    uploadedBy?: {
      id: number;
      nome: string;
    };
    description?: string;
    downloadUrl: string;
  }>;
  quantidadeAnexos?: number;

  // Campos calculados
  percentualAprovacao?: number | null;
  valorEfetivo?: number;
  houveReducao?: boolean;

  createdAt: string;
  updatedAt: string;
}

interface Criterio {
  id: number;
  nome: string;
  unidade_medida?: string;
  sentido_melhor?: 'MAIOR' | 'MENOR';
}

interface Setor {
  id: number;
  nome: string;
}

// Filtros para busca de expurgos
interface ExpurgoFilters {
  competitionPeriodId?: number;
  sectorId?: number;
  criterionId?: number;
  status?: 'PENDENTE' | 'APROVADO' | 'APROVADO_PARCIAL' | 'REJEITADO';
  dataEventoInicio?: string;
  dataEventoFim?: string;
  periodMesAno?: string;
  registradoPorUserId?: number;
  aprovadoPorUserId?: number;
  comAnexos?: boolean;
  valorMinimoSolicitado?: number;
  valorMaximoSolicitado?: number;
}

// 🎯 FUNÇÃO CORRIGIDA 1: fetchExpurgos
const fetchExpurgos = async (
  filters: ExpurgoFilters = {}
): Promise<ExpurgoResponseDto[]> => {
  const searchParams = new URLSearchParams();

  // Adicionar filtros aos parâmetros da URL
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });

  const url = `http://localhost:3001/api/expurgos?${searchParams.toString()}`;

  const response = await fetch(url, {
    // ✅ CORREÇÃO: Adicionar credentials para autenticação
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Erro ${response.status} ao buscar expurgos`
    );
  }

  const data = await response.json();
  return Array.isArray(data) ? data : [];
};

// 🎯 FUNÇÃO CORRIGIDA 2: fetchActiveCriteriaSimple
const fetchActiveCriteriaSimple = async (): Promise<Criterio[]> => {
  const url = 'http://localhost:3001/api/criteria/active';
  const response = await fetch(url, {
    // ✅ CORREÇÃO: Adicionar credentials para autenticação
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Erro ${response.status} ao buscar critérios ativos`);
  }
  const data = await response.json();
  return Array.isArray(data) ? data : [];
};

// 🎯 FUNÇÃO CORRIGIDA 3: fetchActiveSectorsSimple
const fetchActiveSectorsSimple = async (): Promise<Setor[]> => {
  const url = 'http://localhost:3001/api/sectors/active';
  const response = await fetch(url, {
    // ✅ CORREÇÃO: Adicionar credentials para autenticação
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Erro ${response.status} ao buscar setores ativos`);
  }
  const data = await response.json();
  return Array.isArray(data) ? data : [];
};

// 🎯 FUNÇÃO CORRIGIDA 4: fetchExpurgoById
const fetchExpurgoById = async (id: number): Promise<ExpurgoResponseDto> => {
  const url = `http://localhost:3001/api/expurgos/${id}`;
  const response = await fetch(url, {
    // ✅ CORREÇÃO: Adicionar credentials para autenticação
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Erro ${response.status} ao buscar expurgo`
    );
  }
  return response.json();
};

// Hook principal para dados de expurgos (MANTIDO INTACTO)
export function useExpurgosData(filters: ExpurgoFilters = {}) {
  const expurgos = useQuery({
    queryKey: ['expurgos', filters],
    queryFn: () => fetchExpurgos(filters),
    staleTime: 30000, // 30 segundos
    retry: 2,
  });

  const criterios = useQuery({
    queryKey: ['activeCriteriaSimple'],
    queryFn: fetchActiveCriteriaSimple,
    staleTime: Infinity, // Dados raramente mudam
  });

  const setores = useQuery({
    queryKey: ['activeSectorsSimple'],
    queryFn: fetchActiveSectorsSimple,
    staleTime: Infinity, // Dados raramente mudam
  });

  return {
    // Dados
    expurgos: expurgos.data,
    criterios: criterios.data,
    setores: setores.data,

    // Estados de loading
    isLoadingExpurgos: expurgos.isLoading,
    isLoadingCriterios: criterios.isLoading,
    isLoadingSetores: setores.isLoading,
    isLoading: expurgos.isLoading || criterios.isLoading || setores.isLoading,

    // Estados de erro
    errorExpurgos: expurgos.error,
    errorCriterios: criterios.error,
    errorSetores: setores.error,
    hasError: !!expurgos.error || !!criterios.error || !!setores.error,

    // Estados de fetching (para atualizações em background)
    isFetchingExpurgos: expurgos.isFetching,

    // Funções de refetch
    refetchExpurgos: expurgos.refetch,
    refetchCriterios: criterios.refetch,
    refetchSetores: setores.refetch,
  };
}

// Hook para buscar um expurgo específico (MANTIDO INTACTO)
export function useExpurgoById(id: number) {
  return useQuery({
    queryKey: ['expurgo', id],
    queryFn: () => fetchExpurgoById(id),
    enabled: !!id,
    staleTime: 60000, // 1 minuto
  });
}

// Hook para filtros comuns (MANTIDO INTACTO)
export function useExpurgoFilters() {
  // Status disponíveis
  const statusOptions = [
    { value: 'PENDENTE', label: '⏳ Pendente' },
    { value: 'APROVADO', label: '✅ Aprovado' },
    { value: 'APROVADO_PARCIAL', label: '🔄 Aprovado Parcial' },
    { value: 'REJEITADO', label: '❌ Rejeitado' },
  ];

  return {
    statusOptions,
  };
}

// 🎯 HOOK CORRIGIDO 5: useExpurgoStatistics
export function useExpurgoStatistics(periodMesAno?: string) {
  return useQuery({
    queryKey: ['expurgo-statistics', periodMesAno],
    queryFn: async () => {
      const url = periodMesAno
        ? `http://localhost:3001/api/expurgos/statistics/advanced?period=${periodMesAno}`
        : 'http://localhost:3001/api/expurgos/statistics/advanced';

      const response = await fetch(url, {
        // ✅ CORREÇÃO: Adicionar credentials para autenticação
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Erro ao buscar estatísticas');
      }
      return response.json();
    },
    staleTime: 60000, // 1 minuto
  });
}

// 🎯 HOOK CORRIGIDO 6: useExpurgosWithSummary
export function useExpurgosWithSummary(filters: ExpurgoFilters = {}) {
  return useQuery({
    queryKey: ['expurgos-with-summary', filters],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, String(value));
        }
      });

      const url = `http://localhost:3001/api/expurgos/with-summary?${searchParams.toString()}`;
      const response = await fetch(url, {
        // ✅ CORREÇÃO: Adicionar credentials para autenticação
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Erro ao buscar expurgos com resumo');
      }
      return response.json();
    },
    staleTime: 30000,
  });
}
