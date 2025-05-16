// apps/web/src/hooks/useCompetitionData.ts (VERSÃO CORRIGIDA)
import {
  Criterio,
  EntradaRanking,
  EntradaResultadoDetalhado,
} from '@sistema-premiacao/shared-types';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

// --- Funções de Fetch ---

const fetchRankingData = async (): Promise<EntradaRanking[]> => {
  const res = await fetch('http://localhost:3001/api/ranking');
  if (!res.ok) {
    const errorText = await res
      .text()
      .catch(() => 'Erro ao ler corpo da resposta');
    console.log(
      'API Response Status (Ranking):',
      res.status,
      res.statusText,
      errorText
    );
    throw new Error(`Erro ${res.status} ao buscar ranking`);
  }
  try {
    return await res.json();
  } catch (e) {
    throw new Error('Resposta inválida da API de ranking' + e);
  }
};

const fetchDetailedResults = async (): Promise<EntradaResultadoDetalhado[]> => {
  const res = await fetch('http://localhost:3001/api/results');
  if (!res.ok) {
    const errorText = await res
      .text()
      .catch(() => 'Erro ao ler corpo da resposta');
    console.log(
      'API Response Status (Results):',
      res.status,
      res.statusText,
      errorText
    );
    throw new Error(`Erro ${res.status} ao buscar resultados detalhados`);
  }
  try {
    return await res.json();
  } catch (e) {
    throw new Error('Resposta inválida da API de resultados.' + e);
  }
};

// !! Depende do endpoint /api/criteria/active no backend !!
const fetchActiveCriteria = async (): Promise<
  Pick<Criterio, 'id' | 'nome' | 'index'>[]
> => {
  const res = await fetch('http://localhost:3001/api/criteria/active');
  if (!res.ok) {
    const errorText = await res
      .text()
      .catch(() => 'Erro ao ler corpo da resposta');
    console.log(
      'API Response Status (Criteria):',
      res.status,
      res.statusText,
      errorText
    );
    throw new Error(`Erro ${res.status} ao buscar critérios ativos`);
  }
  try {
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('Formato inválido');
    // Validar estrutura mínima
    if (
      !data.every(
        (item) =>
          typeof item.id === 'number' &&
          typeof item.nome === 'string' &&
          (typeof item.index === 'number' || item.index === null)
      )
    ) {
      console.log('Formato inesperado recebido de /api/criteria/active:', data);
      throw new Error('Resposta inválida da API de critérios.');
    }
    return data;
  } catch (e) {
    throw new Error('Resposta inválida da API de critérios.' + e);
  }
};

// --- Tipos Auxiliares Locais ---
interface CriterionResultMap {
  [criterionId: number]: EntradaResultadoDetalhado | undefined;
}
interface SectorData {
  setorNome: string; // <- Nome correto
  criteriaResults: CriterionResultMap;
}
// Não precisamos de SimpleSector se não retornarmos uniqueSectors

// --- O Hook Customizado ---
export function useCompetitionData() {
  // Buscar Ranking
  const {
    data: rankingData,
    isLoading: isLoadingRanking,
    error: errorRanking,
  } = useQuery<EntradaRanking[]>({
    queryKey: ['rankingData'],
    queryFn: fetchRankingData,
  });

  // Buscar Resultados Detalhados
  const {
    data: detailedResults,
    isLoading: isLoadingDetails,
    error: errorDetails,
  } = useQuery<EntradaResultadoDetalhado[]>({
    queryKey: ['detailedResults'],
    queryFn: fetchDetailedResults,
  });

  // Buscar Critérios Ativos
  const {
    data: activeCriteria,
    isLoading: isLoadingCriteria,
    error: errorCriteria,
  } = useQuery({
    queryKey: ['activeCriteria'],
    queryFn: fetchActiveCriteria,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // --- Processamento/Transformação dos Dados Detalhados ---
  const { resultsBySector, uniqueCriteria } = useMemo(() => {
    // Define o tipo de retorno default corretamente
    const defaultReturn = {
      resultsBySector: {} as Record<number, SectorData>,
      uniqueCriteria: [] as Pick<Criterio, 'id' | 'nome'>[],
    };
    if (!detailedResults) return defaultReturn;

    // Tipar sectorsData explicitamente
    const sectorsData: Record<number, SectorData> = {};
    const criteriaMap = new Map<number, Pick<Criterio, 'id' | 'nome'>>();

    detailedResults.forEach((result) => {
      // Usa nomes em português ao desestruturar ou acessar result
      const { setorId, setorNome, criterioId, criterioNome } = result;

      // Cria a entrada para o setor se não existir, usando 'setorNome'
      if (!sectorsData[setorId]) {
        sectorsData[setorId] = { setorNome: setorNome, criteriaResults: {} }; // <- CORRIGIDO AQUI
      }
      // Cria a entrada para o critério único se não existir
      if (!criteriaMap.has(criterioId)) {
        criteriaMap.set(criterioId, { id: criterioId, name: criterioNome }); // Usa 'name' internamente no map, ok
      }
      // Adiciona o resultado ao critério/setor correto
      sectorsData[setorId].criteriaResults[criterioId] = result;
    });

    const criteriaArray = Array.from(criteriaMap.values()).sort(
      (a, b) => a.id - b.id
    );

    return { resultsBySector: sectorsData, uniqueCriteria: criteriaArray };
  }, [detailedResults]);
  // -----------------------------------------------------

  // Combina estados de loading e erro
  const isLoading = isLoadingRanking || isLoadingDetails || isLoadingCriteria;
  const error = errorRanking || errorDetails || errorCriteria;

  // Retorna um objeto com todos os dados e estados que a página precisa
  return {
    rankingData,
    activeCriteria,
    resultsBySector, // Contém 'setorNome' corretamente agora
    uniqueCriteria,
    isLoading,
    error,
    // Não retorna detailedResults brutos, pois já processamos
  };
}

// Exportar como default se preferir
// export default useCompetitionData;
