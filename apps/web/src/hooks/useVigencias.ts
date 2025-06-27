// apps/web/src/hooks/useVigencias.ts
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
  tieResolvedBy?: number;
  justification: string;
}

interface SectorValidation {
  sectorName: string;
  validation: {
    isEligible: boolean;
    reason: string;
  };
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Serviços de API
const vigenciasAPI = {
  // Buscar períodos pendentes de oficialização (Diretores + Gerentes)
  fetchPendingOfficialization: async (): Promise<{
    periods: CompetitionPeriod[];
    count: number;
  }> => {
    const response = await fetch(
      `${API_BASE_URL}/api/periods/pending-officialization`,
      {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (!response.ok) {
      throw new Error(`Erro ${response.status}: ${response.statusText}`);
    }

    return response.json();
  },

  // Análise detalhada de ranking para um período (Diretores + Gerentes)
  fetchRankingAnalysis: async (periodId: number): Promise<RankingAnalysis> => {
    const response = await fetch(
      `${API_BASE_URL}/api/periods/${periodId}/ranking-analysis`,
      {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (!response.ok) {
      throw new Error(`Erro ${response.status}: ${response.statusText}`);
    }

    return response.json();
  },

  // Validar elegibilidade de setor para empate (Diretores + Gerentes)
  validateSectorForTie: async (
    periodId: number,
    sectorName: string
  ): Promise<SectorValidation> => {
    const response = await fetch(
      `${API_BASE_URL}/api/periods/${periodId}/tie-validation/${encodeURIComponent(sectorName)}`,
      {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (!response.ok) {
      throw new Error(`Erro ${response.status}: ${response.statusText}`);
    }

    return response.json();
  },

  // Oficializar período (APENAS DIRETOR)
  officializePeriod: async (
    periodId: number,
    payload: OfficializePayload
  ): Promise<CompetitionPeriod> => {
    const response = await fetch(
      `${API_BASE_URL}/api/periods/${periodId}/officialize`,
      {
        method: 'POST',
        credentials: 'include',
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

    return response.json();
  },

  // Buscar todos os períodos com filtros (para dashboard)
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
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (!response.ok) {
      throw new Error(`Erro ${response.status}: ${response.statusText}`);
    }

    return response.json();
  },
};

// Hook principal para gestão de vigências
export function useVigencias() {
  const queryClient = useQueryClient();

  // Query: Períodos pendentes de oficialização
  const {
    data: pendingPeriods,
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

  return {
    // Dados
    pendingPeriods: pendingPeriods?.periods || [],
    pendingCount: pendingPeriods?.count || 0,
    allPeriods: allPeriods || [],

    // Estados de loading
    isLoadingPending,
    isLoadingAll,
    isOfficializing: officializeMutation.isPending,

    // Erros
    pendingError,
    allPeriodsError,
    officializeError: officializeMutation.error,

    // Ações
    refetchPending,
    officializePeriod: officializeMutation.mutate,

    // Queries condicionais (para usar em componentes específicos)
    fetchRankingAnalysis: (periodId: number) =>
      queryClient.fetchQuery({
        queryKey: ['periods', periodId, 'ranking-analysis'],
        queryFn: () => vigenciasAPI.fetchRankingAnalysis(periodId),
        staleTime: 1 * 60 * 1000, // 1 minuto para dados críticos
      }),

    validateSectorForTie: (periodId: number, sectorName: string) =>
      queryClient.fetchQuery({
        queryKey: ['periods', periodId, 'tie-validation', sectorName],
        queryFn: () => vigenciasAPI.validateSectorForTie(periodId, sectorName),
        staleTime: 30 * 1000, // 30 segundos
      }),
  };
}

// Hook específico para análise de ranking de um período
export function usePeriodRankingAnalysis(periodId: number | null) {
  return useQuery({
    queryKey: ['periods', periodId, 'ranking-analysis'],
    queryFn: () => vigenciasAPI.fetchRankingAnalysis(periodId!),
    enabled: !!periodId,
    staleTime: 1 * 60 * 1000, // 1 minuto
    retry: 2,
  });
}

// Hook para validação de setor em caso de empate
export function useSectorTieValidation(
  periodId: number | null,
  sectorName: string | null
) {
  return useQuery({
    queryKey: ['periods', periodId, 'tie-validation', sectorName],
    queryFn: () => vigenciasAPI.validateSectorForTie(periodId!, sectorName!),
    enabled: !!periodId && !!sectorName,
    staleTime: 30 * 1000, // 30 segundos
    retry: 1,
  });
}
