// hooks/useParametersData.ts
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

// Interfaces
export interface CompetitionPeriod {
  id: number;
  mesAno: string;
  status: string;
  dataInicio?: string;
  dataFim?: string;
}

export interface ResultData {
  setorId: number;
  setorNome: string;
  criterioId: number;
  criterioNome: string;
  periodo: string;
  valorRealizado: number;
  valorMeta: number;
  percentualAtingimento: number;
  pontos: number;
}

export interface Criterion {
  id: number;
  nome: string;
  active?: boolean;
}

export interface Sector {
  id: number;
  nome: string;
  active?: boolean;
}

// Funções de fetch
const fetchPeriods = async (): Promise<CompetitionPeriod[]> => {
  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  console.log('Buscando períodos da API...');
  const res = await fetch(`${API_BASE_URL}/api/periods`);
  if (!res.ok) {
    throw new Error(`Erro ${res.status} ao buscar períodos`);
  }
  const data = await res.json();
  console.log('Períodos recebidos:', data);
  return data;
};

const fetchResults = async (periodMesAno: string): Promise<ResultData[]> => {
  if (!periodMesAno) return [];

  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  console.log(`Buscando resultados para o período ${periodMesAno}...`);
  const url = `${API_BASE_URL}/api/results?period=${periodMesAno}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Erro ${res.status} ao buscar resultados`);
  }
  const data = await res.json();
  console.log(`Resultados recebidos para o período ${periodMesAno}:`, data);
  return data;
};

const fetchCriteria = async (): Promise<Criterion[]> => {
  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  console.log('Buscando critérios...');
  const url = `${API_BASE_URL}/api/criteria/active`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Erro ${res.status} ao buscar critérios`);
  }
  const data = await res.json();
  console.log('Critérios recebidos:', data);
  return data;
};

const fetchSectors = async (): Promise<Sector[]> => {
  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  console.log('Buscando setores...');
  const url = `${API_BASE_URL}/api/sectors/active`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Erro ${res.status} ao buscar setores`);
  }
  const data = await res.json();
  console.log('Setores recebidos:', data);
  return data;
};

// Hook principal
export function useParametersData(selectedPeriod: string) {
  // Buscar períodos
  const periodsQuery = useQuery({
    queryKey: ['periods'],
    queryFn: fetchPeriods,
    staleTime: 1000 * 60 * 15, // 15 minutos
  });

  // Buscar resultados
  const resultsQuery = useQuery({
    queryKey: ['results', selectedPeriod],
    queryFn: () => fetchResults(selectedPeriod),
    enabled: !!selectedPeriod, // Só executa se tiver um período selecionado
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  // Buscar critérios
  const criteriaQuery = useQuery({
    queryKey: ['criteria'],
    queryFn: fetchCriteria,
    staleTime: Infinity, // Não muda com frequência
  });

  // Buscar setores
  const sectorsQuery = useQuery({
    queryKey: ['sectors'],
    queryFn: fetchSectors,
    staleTime: Infinity, // Não muda com frequência
  });

  // Processar dados para exibição
  const processedData = useMemo(() => {
    const results = resultsQuery.data || [];

    // Extrair critérios únicos
    const criteriaMap = new Map();
    results.forEach((result) => {
      if (!criteriaMap.has(result.criterioId)) {
        criteriaMap.set(result.criterioId, {
          id: result.criterioId,
          name: result.criterioNome,
        });
      }
    });
    const uniqueCriteria = Array.from(criteriaMap.values());

    // Organizar resultados por setor
    const resultsBySector = {};
    results.forEach((result) => {
      if (!resultsBySector[result.setorId]) {
        resultsBySector[result.setorId] = {
          setorNome: result.setorNome,
          criteriaResults: {},
        };
      }
      resultsBySector[result.setorId].criteriaResults[result.criterioId] =
        result;
    });

    // Organizar resultados por critério
    const resultsByCriterion = {};
    results.forEach((result) => {
      if (!resultsByCriterion[result.criterioId]) {
        resultsByCriterion[result.criterioId] = {
          criterioNome: result.criterioNome,
          sectorResults: {},
        };
      }
      resultsByCriterion[result.criterioId].sectorResults[result.setorId] =
        result;
    });

    return { uniqueCriteria, resultsBySector, resultsByCriterion };
  }, [resultsQuery.data]);

  return {
    periods: periodsQuery.data || [],
    results: resultsQuery.data || [],
    criteria: criteriaQuery.data || [],
    sectors: sectorsQuery.data || [],
    ...processedData,
    isLoading:
      periodsQuery.isLoading ||
      resultsQuery.isLoading ||
      criteriaQuery.isLoading ||
      sectorsQuery.isLoading,
    error:
      periodsQuery.error ||
      resultsQuery.error ||
      criteriaQuery.error ||
      sectorsQuery.error,
    refetchResults: resultsQuery.refetch,
  };
}
