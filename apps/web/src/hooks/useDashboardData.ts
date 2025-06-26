// Arquivo: src/hooks/useDashboardData.ts (NOVO ARQUIVO)

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

export function useDashboardData() {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [results, setResults] = useState<ResultData[]>([]);
  const [activePeriod, setActivePeriod] = useState<string | null>(null);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const fetchInitialData = useCallback(async () => {
    setIsLoadingInitial(true);
    setError(null);
    try {
      const [periodsData] = await Promise.all([
        fetchPeriods(),
        fetchCriteria(),
        fetchSectors(),
      ]);

      const active = periodsData.find((p) => p.status === 'ATIVA');
      const defaultPeriod = active
        ? active.mesAno
        : periodsData[0]?.mesAno || null;

      if (defaultPeriod) {
        setActivePeriod(defaultPeriod);
      }
    } catch (error: any) {
      const errorMessage = 'Falha ao carregar dados iniciais';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoadingInitial(false);
    }
  }, [fetchPeriods, fetchCriteria, fetchSectors]);

  useEffect(() => {
    if (activePeriod) {
      fetchResults(activePeriod);
    }
  }, [activePeriod, fetchResults]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

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

  return {
    periods,
    criteria,
    sectors,
    results,
    resultsBySector,
    uniqueCriteria,
    activePeriod,
    setActivePeriod,
    isLoading: isLoadingInitial || isLoadingResults,
    isLoadingInitial,
    isLoadingResults,
    error,
    fetchResults,
  };
}
