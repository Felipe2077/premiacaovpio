// // apps/web/src/hooks/useExpurgosData.ts - SUBSTITUINDO O HOOK ORIGINAL

'use client';

import { useAuth } from '@/components/providers/AuthProvider';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// 🎯 FUNÇÃO COM FILTROS DE SEGURANÇA
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

  const url = `${API_BASE_URL}/api/expurgos?${searchParams.toString()}`;

  console.log('🔍 Fazendo requisição para:', url); // Debug

  const response = await fetch(url, {
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
  console.log('📦 Dados recebidos:', data.length, 'expurgos'); // Debug
  return Array.isArray(data) ? data : [];
};

const fetchActiveCriteriaSimple = async (): Promise<Criterio[]> => {
  const url = `${API_BASE_URL}/api/criteria/active`;
  const response = await fetch(url, {
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

const fetchActiveSectorsSimple = async (): Promise<Setor[]> => {
  const url = `${API_BASE_URL}/api/sectors/active`;
  const response = await fetch(url, {
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

const fetchExpurgoById = async (id: number): Promise<ExpurgoResponseDto> => {
  const url = `${API_BASE_URL}/api/expurgos/${id}`;
  const response = await fetch(url, {
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

// 🎯 HOOK PRINCIPAL COM FILTROS DE SEGURANÇA AUTOMÁTICOS
export function useExpurgosData(additionalFilters: ExpurgoFilters = {}) {
  const { user, isAuthenticated } = useAuth();

  // 1. Aplica os filtros de segurança do usuário sobre os filtros do componente
  const secureFilters = useMemo(() => {
    const filters = { ...additionalFilters };
    const isManager = user?.roles?.includes('GERENTE');

    if (isManager && user.sectorId != null) {
      filters.sectorId = user.sectorId;
    }
    return filters;
  }, [user, additionalFilters]);

  // 2. 🎯 CORREÇÃO FINAL: A query só pode executar se TUDO estiver pronto
  const shouldEnableQueries = useMemo(() => {
    // Condição 1: Usuário deve estar autenticado e carregado
    if (!isAuthenticated || !user) {
      return false;
    }

    // Condição 2: O filtro de período DEVE ter sido recebido do componente
    if (!additionalFilters.periodMesAno) {
      return false;
    }

    // Condição 3: Se for gerente, o sectorId deve existir
    const isManager = user.roles?.includes('GERENTE');
    if (isManager) {
      return user.sectorId != null;
    }

    // Se todas as condições passarem, pode executar
    return true;
  }, [isAuthenticated, user, additionalFilters.periodMesAno]);

  // 3. Execução das queries controlada pela flag 'enabled'
  const expurgosQuery = useQuery({
    queryKey: ['expurgos', secureFilters],
    queryFn: () => fetchExpurgos(secureFilters),
    enabled: shouldEnableQueries, // A chave de tudo está aqui
  });

  const criteriosQuery = useQuery({
    queryKey: ['activeCriteriaSimple'],
    queryFn: fetchActiveCriteriaSimple,
    staleTime: Infinity,
    enabled: shouldEnableQueries,
  });

  const setoresQuery = useQuery({
    queryKey: ['activeSectorsSimple'],
    queryFn: fetchActiveSectorsSimple,
    staleTime: Infinity,
    enabled: shouldEnableQueries,
  });

  return {
    // Dados
    expurgos: expurgosQuery.data,
    criterios: criteriosQuery.data,
    setores: setoresQuery.data,
    // Estados de loading
    isLoadingExpurgos: expurgosQuery.isLoading,
    isLoadingCriterios: criteriosQuery.isLoading,
    isLoadingSetores: setoresQuery.isLoading,
    isLoading:
      expurgosQuery.isLoading ||
      criteriosQuery.isLoading ||
      setoresQuery.isLoading,
    // Estados de erro
    errorExpurgos: expurgosQuery.error,
    errorCriterios: criteriosQuery.error,
    errorSetores: setoresQuery.error,
    hasError:
      !!expurgosQuery.error || !!criteriosQuery.error || !!setoresQuery.error,
    // Funções de refetch
    refetchExpurgos: expurgosQuery.refetch,
    refetchCriterios: criteriosQuery.refetch,
    refetchSetores: setoresQuery.refetch,
  };
}

// Hook para buscar um expurgo específico
export function useExpurgoById(id: number) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['expurgo', id],
    queryFn: () => fetchExpurgoById(id),
    enabled: !!id && !!user,
    staleTime: 60000, // 1 minuto
  });
}

// Hook para filtros comuns
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

// Hook para estatísticas (com filtros de segurança)
export function useExpurgoStatistics(periodMesAno?: string) {
  const { user } = useAuth();

  // Aplicar filtros de segurança para estatísticas também
  const secureParams = useMemo(() => {
    const isManager = user?.roles?.includes('GERENTE');
    const params = new URLSearchParams();

    if (periodMesAno) {
      params.append('period', periodMesAno);
    }

    // Gerentes só veem estatísticas do seu setor
    if (isManager && user?.sectorId) {
      params.append('sectorId', user.sectorId.toString());
    }

    return params.toString();
  }, [user, periodMesAno]);

  return useQuery({
    queryKey: ['expurgo-statistics', periodMesAno, user?.sectorId],
    queryFn: async () => {
      const url = `${API_BASE_URL}/api/expurgos/statistics/advanced?${secureParams}`;

      const response = await fetch(url, {
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
    enabled: !!user,
  });
}

// Hook para expurgos com resumo (com filtros de segurança)
export function useExpurgosWithSummary(additionalFilters: ExpurgoFilters = {}) {
  const { user } = useAuth();

  // Aplicar os mesmos filtros de segurança
  const secureFilters = useMemo(() => {
    const isManager = user?.roles?.includes('GERENTE');
    let filters = { ...additionalFilters };

    if (isManager && user?.sectorId) {
      filters.sectorId = user.sectorId;
    }

    return filters;
  }, [user, additionalFilters]);

  return useQuery({
    queryKey: ['expurgos-with-summary', secureFilters],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      Object.entries(secureFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, String(value));
        }
      });

      const url = `${API_BASE_URL}/api/expurgos/with-summary?${searchParams.toString()}`;
      const response = await fetch(url, {
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
    enabled: !!user,
  });
}
