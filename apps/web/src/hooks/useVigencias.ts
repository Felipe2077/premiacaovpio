// apps/web/src/hooks/useVigencias.ts - CORRIGIDO COM AUTENTICAÇÃO
'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// Tipos baseados no sistema existente
interface CompetitionPeriod {
  id: number;
  mesAno: string;
  dataInicio: string;
  dataFim: string;
  status: 'PLANEJAMENTO' | 'ATIVA' | 'PRE_FECHADA' | 'FECHADA';
  setorVencedorId?: number;
  oficializadaPorUserId?: number;
  oficializadaEm?: string;
  createdAt: string;
  updatedAt: string;
}

interface SectorForRanking {
  id: number;
  nome: string;
  pontuacao: number;
  rank: number;
  SETOR: string;
  PONTUACAO: number;
  RANK: number;
}

interface TieAnalysis {
  hasGlobalTies: boolean;
  winnerTieGroup?: {
    pontuacao: number;
    sectors: SectorForRanking[];
  };
  tiedGroups: Array<{
    pontuacao: number;
    sectors: SectorForRanking[];
  }>;
}

interface RankingAnalysis {
  period: CompetitionPeriod;
  ranking: SectorForRanking[];
  tieAnalysis: TieAnalysis;
  metadata: {
    requiresDirectorDecision: boolean;
    totalSectors: number;
    calculatedAt: string;
  };
}

interface OfficializePayload {
  winnerSectorId: number;
  tieResolvedBy?: 'DIRECTOR_DECISION' | 'RANKING_CRITERIA';
  justification?: string;
}

interface PendingOfficialization {
  periods: CompetitionPeriod[];
  count: number;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// 🎯 CORREÇÃO: APIs que integram com o sistema de autenticação existente
const vigenciasAPI = {
  // Buscar períodos pendentes de oficialização
  fetchPendingOfficialization: async (): Promise<PendingOfficialization> => {
    const response = await fetch(
      `${API_BASE_URL}/api/periods/pending-officialization`,
      {
        credentials: 'include', // Para cookies httpOnly
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (!response.ok) {
      throw new Error(`Erro ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    // 🎯 CORREÇÃO: API retorna wrapper {success, data, message, timestamp}
    if (!result.success) {
      throw new Error(result.message || 'Erro na resposta da API');
    }

    return result.data; // Retorna apenas os dados
  },

  // Oficializar período
  officializePeriod: async (
    periodId: number,
    payload: OfficializePayload
  ): Promise<CompetitionPeriod> => {
    const response = await fetch(
      `${API_BASE_URL}/api/periods/${periodId}/officialize`,
      {
        method: 'POST',
        credentials: 'include', // Para cookies httpOnly
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || `Erro ${response.status}: ${response.statusText}`
      );
    }

    const result = await response.json();

    // 🎯 CORREÇÃO: API retorna wrapper
    if (!result.success) {
      throw new Error(result.message || 'Erro ao oficializar período');
    }

    return result.data;
  },

  // Buscar todos os períodos
  fetchPeriods: async (params?: {
    status?: string;
    limit?: number;
  }): Promise<CompetitionPeriod[]> => {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const response = await fetch(
      `${API_BASE_URL}/api/periods?${queryParams.toString()}`,
      {
        credentials: 'include', // Para cookies httpOnly
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (!response.ok) {
      throw new Error(`Erro ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    // 🎯 CORREÇÃO: Verificar se API retorna wrapper ou dados diretos
    // Para listagem de períodos, pode ser que retorne direto
    if (Array.isArray(result)) {
      return result; // Retorno direto
    } else if (result.success && result.data) {
      return result.data; // Retorno com wrapper
    } else {
      return result; // Fallback para compatibilidade
    }
  },

  // Iniciar período
  startPeriod: async (periodId: number): Promise<CompetitionPeriod> => {
    const response = await fetch(
      `${API_BASE_URL}/api/periods/${periodId}/start`,
      {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || `Erro ${response.status}: ${response.statusText}`
      );
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || 'Erro ao iniciar período');
    }

    return result.data;
  },
};

// Hook principal para gestão de vigências
export function useVigencias() {
  const queryClient = useQueryClient();

  // Query: Períodos pendentes de oficialização
  const {
    data: pendingData,
    isLoading: isLoadingPending,
    error: pendingError,
    refetch: refetchPending,
  } = useQuery({
    queryKey: ['periods', 'pending-officialization'],
    queryFn: vigenciasAPI.fetchPendingOfficialization,
    staleTime: 2 * 60 * 1000, // 2 minutos
    retry: 2,
  });

  // Query: Todos os períodos (para dashboard)
  const {
    data: allPeriods,
    isLoading: isLoadingAll,
    error: allPeriodsError,
  } = useQuery({
    queryKey: ['periods', 'all'],
    queryFn: () => vigenciasAPI.fetchPeriods({ limit: 20 }),
    staleTime: 5 * 60 * 1000, // 5 minutos
    retry: 2,
  });

  // Mutation: Oficializar período
  const officializeMutation = useMutation({
    mutationFn: ({
      periodId,
      payload,
    }: {
      periodId: number;
      payload: OfficializePayload;
    }) => vigenciasAPI.officializePeriod(periodId, payload),
    onSuccess: (data, variables) => {
      toast.success(`Período ${data.mesAno} oficializado com sucesso!`);

      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['periods'] });
      queryClient.invalidateQueries({ queryKey: ['rankings'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
    onError: (error: Error) => {
      toast.error(`Erro na oficialização: ${error.message}`);
    },
  });

  // Mutation: Iniciar período
  const startMutation = useMutation({
    mutationFn: (periodId: number) => vigenciasAPI.startPeriod(periodId),
    onSuccess: (data) => {
      toast.success(`Período ${data.mesAno} iniciado com sucesso!`);

      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['periods'] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao iniciar período: ${error.message}`);
    },
  });

  return {
    // Dados corrigidos
    pendingPeriods: pendingData?.periods || [],
    pendingCount: pendingData?.count || 0,
    allPeriods: allPeriods || [],

    // Estados de loading
    isLoadingPending,
    isLoadingAll,
    isOfficializing: officializeMutation.isPending,
    isStarting: startMutation.isPending,

    // Erros
    pendingError,
    allPeriodsError,

    // Ações
    refetchPending,
    officializePeriod: officializeMutation.mutate,
    startPeriod: startMutation.mutate,

    // Status de mutations
    officializeError: officializeMutation.error,
    startError: startMutation.error,
  };
}

// Hook para análise de ranking de um período específico
export function usePeriodRankingAnalysis(periodId: number) {
  return useQuery({
    queryKey: ['period', periodId, 'ranking-analysis'],
    queryFn: async (): Promise<RankingAnalysis> => {
      const response = await fetch(
        `${API_BASE_URL}/api/periods/${periodId}/ranking-analysis`,
        {
          credentials: 'include', // Para cookies httpOnly
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      // 🔍 DEBUG: Log da resposta da API
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 API Response for ranking-analysis:', result);
        console.log('🔍 Result.data:', result.data);
        if (result.data?.ranking) {
          console.log('🔍 First ranking item:', result.data.ranking[0]);
        }
      }

      // 🎯 CORREÇÃO: API retorna wrapper
      if (!result.success) {
        throw new Error(result.message || 'Erro ao analisar ranking');
      }

      return result.data;
    },
    enabled: !!periodId && periodId > 0,
    staleTime: 1 * 60 * 1000, // 1 minuto
    retry: 2,
  });
}
