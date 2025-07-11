// src/hooks/useDashboardData.ts - CORRIGIDO COM LÓGICA CORRETA

import {
  Criterio as Criterion,
  RegrasAplicadasPadrao,
} from '@sistema-premiacao/shared-types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

export interface Period {
  id: number;
  mesAno: string;
  status: 'ATIVA' | 'FECHADA' | 'PLANEJAMENTO' | 'PRE_FECHADA';
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

/**
 * Seleciona o período padrão baseado nas regras de negócio:
 * 1. ATIVA (sempre prioridade máxima)
 * 2. PRE_FECHADA (mais recente)
 * 3. FECHADA (mais recente)
 * 4. PLANEJAMENTO (só como última opção)
 */
function selectDefaultPeriod(periods: Period[]): Period | null {
  if (!periods || periods.length === 0) return null;

  // 1º: Procurar período ATIVO (sempre prioridade)
  const active = periods.find((p) => p.status === 'ATIVA');
  if (active) return active;

  // 2º: Procurar períodos PRE_FECHADA (mais recente)
  const preClosed = periods
    .filter((p) => p.status === 'PRE_FECHADA')
    .sort(
      (a, b) =>
        new Date(b.dataInicio).getTime() - new Date(a.dataInicio).getTime()
    )[0];
  if (preClosed) return preClosed;

  // 3º: Procurar períodos FECHADA (mais recente)
  const closed = periods
    .filter((p) => p.status === 'FECHADA')
    .sort(
      (a, b) =>
        new Date(b.dataInicio).getTime() - new Date(a.dataInicio).getTime()
    )[0];
  if (closed) return closed;

  // 4º: PLANEJAMENTO como última opção (só se não houver nada)
  const planning = periods.find((p) => p.status === 'PLANEJAMENTO');
  return planning || null;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

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

      // 🎯 CORREÇÃO: Aplicar a regra correta de seleção
      const defaultPeriod = selectDefaultPeriod(periodsData);

      console.log(
        '🔍 Períodos disponíveis:',
        periodsData.map((p) => ({ mesAno: p.mesAno, status: p.status }))
      );
      console.log(
        '🎯 Período selecionado:',
        defaultPeriod
          ? { mesAno: defaultPeriod.mesAno, status: defaultPeriod.status }
          : 'nenhum'
      );

      if (defaultPeriod) {
        setActivePeriod(defaultPeriod.mesAno);
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
