// hooks/useParametersData.ts - VERSÃO CORRIGIDA
import {
  Criterio as Criterion,
  RegrasAplicadasPadrao,
} from '@sistema-premiacao/shared-types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

export interface Period {
  id: number;
  mesAno: string;
  status: 'ATIVA' | 'FECHADA' | 'PLANEJAMENTO';
  dataInicio: string;
  dataFim: string;
}

export interface Sector {
  id: number;
  nome: string;
  ativo: boolean;
}

export interface ResultData {
  setorId: number;
  setorNome: string;
  criterioId: number;
  criterioNome: string;
  periodo: string;
  valorRealizado: number | null;
  valorMeta: number | null;
  percentualAtingimento: number | null;
  pontos: number | null;
  metaPropostaPadrao: number | null;
  metaAnteriorValor: number | null;
  metaAnteriorPeriodo: number | null;
  regrasAplicadasPadrao: RegrasAplicadasPadrao | null;
  metaDefinidaValor: number | null;
  isMetaDefinida: boolean;
}

const API_BASE_URL = 'http://localhost:3001';

export function useParametersData() {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [results, setResults] = useState<ResultData[]>([]);

  // ✅ ESTADOS DE LOADING SIMPLIFICADOS
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ FETCH FUNCTIONS - SEM TIMESTAMPS DESNECESSÁRIOS
  const fetchPeriods = useCallback(async (): Promise<Period[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/periods`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Falha ao buscar períodos');
      const data = await response.json();
      setPeriods(data);
      return data;
    } catch (error) {
      console.error('Erro ao buscar períodos:', error);
      throw error;
    }
  }, []);

  const fetchCriteria = useCallback(async (): Promise<Criterion[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/criteria/active`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Falha ao buscar critérios');
      const data = await response.json();

      setCriteria(data);
      return data;
    } catch (error) {
      console.error('Erro ao buscar critérios:', error);
      throw error;
    }
  }, []);

  const fetchSectors = useCallback(async (): Promise<Sector[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/sectors/active`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Falha ao buscar setores');
      const data = await response.json();
      setSectors(data);
      return data;
    } catch (error) {
      console.error('Erro ao buscar setores:', error);
      throw error;
    }
  }, []);

  // ✅ FETCH RESULTS - FUNÇÃO ISOLADA E OTIMIZADA
  const fetchResults = useCallback(
    async (period: string): Promise<ResultData[]> => {
      if (!period) return [];

      setIsLoadingResults(true);
      setError(null);

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/results/by-period?period=${period}`,
          {
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Erro ${response.status}`);
        }

        const data = await response.json();
        setResults(data);
        return data;
      } catch (error: any) {
        const errorMessage = error.message || 'Falha ao carregar resultados';
        setError(errorMessage);
        toast.error(`Erro: ${errorMessage}`);
        setResults([]);
        return [];
      } finally {
        setIsLoadingResults(false);
      }
    },
    []
  );

  // ✅ FETCH INICIAL - APENAS UMA VEZ
  const fetchInitialData = useCallback(async (): Promise<Period[]> => {
    setIsLoadingInitial(true);
    setError(null);

    try {
      // Buscar dados estáticos em paralelo
      const [periodsData, criteriaData, sectorsData] = await Promise.all([
        fetchPeriods(),
        fetchCriteria(),
        fetchSectors(),
      ]);

      return periodsData;
    } catch (error: any) {
      const errorMessage = 'Falha ao carregar dados iniciais';
      setError(errorMessage);
      toast.error(errorMessage);
      return [];
    } finally {
      setIsLoadingInitial(false);
    }
  }, [fetchPeriods, fetchCriteria, fetchSectors]);

  // ✅ FUNÇÕES AUXILIARES MEMOIZADAS
  const getPeriodById = useCallback(
    (id: number): Period | undefined => periods.find((p) => p.id === id),
    [periods]
  );

  const getPeriodByMesAno = useCallback(
    (mesAno: string): Period | undefined =>
      periods.find((p) => p.mesAno === mesAno),
    [periods]
  );

  // ✅ COMPUTED VALUES MEMOIZADOS
  const resultsBySector = useMemo(() => {
    if (!results.length) return {};

    return results.reduce(
      (acc, result) => {
        const sectorId = String(result.setorId);
        const criterioId = String(result.criterioId);

        if (!acc[sectorId]) {
          acc[sectorId] = {
            setorId: result.setorId,
            setorNome: result.setorNome,
            criterios: {},
          };
        }

        acc[sectorId].criterios[criterioId] = result;
        return acc;
      },
      {} as Record<string, any>
    );
  }, [results]);

  const uniqueCriteria = useMemo(() => {
    if (!criteria.length) return [];

    return criteria
      .filter((c) => c.ativo)
      .sort((a, b) => {
        if (a.index !== undefined && b.index !== undefined) {
          return a.index - b.index;
        }
        return a.id - b.id;
      });
  }, [criteria]);

  // ✅ EFFECT ÚNICO PARA CARREGAMENTO INICIAL
  useEffect(() => {
    fetchInitialData();
  }, []); // Só executa uma vez

  // ✅ FETCHPARAMETERBYCRITERIASECTOR SIMPLIFICADO
  const fetchParameterByCriteriaSector = useCallback(
    async (criterionId: number, sectorId: number, periodId: number) => {
      try {
        const period = getPeriodById(periodId);
        if (!period) return null;

        const response = await fetch(
          `${API_BASE_URL}/api/parameters?period=${period.mesAno}&criterionId=${criterionId}&sectorId=${sectorId}`,
          {
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
          }
        );

        if (!response.ok) return null;
        const data = await response.json();
        return Array.isArray(data) && data.length > 0 ? data[0] : null;
      } catch (error) {
        console.error('Erro ao buscar parâmetro específico:', error);
        return null;
      }
    },
    [getPeriodById]
  );

  // ✅ FETCHCRITERIONCALCULATIONSETTINGS SIMPLIFICADO
  const fetchCriterionCalculationSettings = useCallback(
    async (criterionId: number) => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/criteria/${criterionId}/calculation-settings`,
          {
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
          }
        );

        if (response.status === 404) {
          return {
            criterionId,
            calculationMethod: 'media3',
            adjustmentPercentage: 0,
            requiresRounding: true,
            roundingMethod: 'nearest',
            roundingDecimalPlaces: 0,
          };
        }

        if (!response.ok) throw new Error(`Erro ${response.status}`);

        const data = await response.json();
        return data.defaultSettings || data;
      } catch (error) {
        console.error('Erro ao buscar configurações:', error);
        return {
          criterionId,
          calculationMethod: 'media3',
          adjustmentPercentage: 0,
          requiresRounding: true,
          roundingMethod: 'nearest',
          roundingDecimalPlaces: 0,
        };
      }
    },
    []
  );

  // ✅ REFETCH SIMPLIFICADO
  const refetchResults = useCallback(
    async (period: string) => {
      return await fetchResults(period);
    },
    [fetchResults]
  );

  // ✅ FETCHALLDATA SIMPLIFICADO (para compatibility)
  const fetchAllData = useCallback(
    async (period?: string) => {
      if (period) {
        await fetchResults(period);
      }
    },
    [fetchResults]
  );

  return {
    // Data
    periods,
    criteria,
    sectors,
    results,
    resultsBySector,
    uniqueCriteria,

    // Loading states
    isLoading: isLoadingInitial,
    isLoadingResults,
    error,

    // Functions
    fetchResults,
    fetchAllData, // Para compatibility
    refetchResults,
    getPeriodById,
    getPeriodByMesAno,
    fetchParameterByCriteriaSector,
    fetchCriterionCalculationSettings,
  };
}
