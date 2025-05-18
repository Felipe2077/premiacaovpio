// apps/web/src/hooks/useCompetitionData.ts
import { useParametersData } from '@/hooks/useParametersData';
import { useMemo } from 'react';

// Interfaces para os dados transformados
interface EntradaRanking {
  RANK: number;
  SETOR: string;
  PONTUACAO: number;
}

export function useCompetitionData() {
  console.log('🔍 useCompetitionData hook iniciado');

  // Usar o hook existente useParametersData
  const {
    periods,
    uniqueCriteria: originalCriteria,
    resultsBySector: originalResultsBySector,
    isLoading,
    error,
    activePeriod,
  } = useParametersData();

  console.log('🔍 Dados recebidos de useParametersData:');
  console.log('🔍 originalResultsBySector:', originalResultsBySector);
  console.log('🔍 originalCriteria:', originalCriteria);

  // Transformar os critérios para o formato esperado pelos componentes
  const uniqueCriteria = useMemo(() => {
    if (!originalCriteria || originalCriteria.length === 0) {
      // Se não temos critérios do hook, vamos extrair dos resultados
      if (
        originalResultsBySector &&
        Object.keys(originalResultsBySector).length > 0
      ) {
        const firstSector =
          originalResultsBySector[Object.keys(originalResultsBySector)[0]];
        if (firstSector && firstSector.criterios) {
          // Extrair critérios do primeiro setor
          return Object.values(firstSector.criterios).map((criterio) => ({
            id: criterio.criterioId,
            nome: criterio.criterioNome,
            name: criterio.criterioNome,
            index: criterio.criterioId, // Usando ID como índice
            sentido_melhor: 'MENOR', // Assumindo MENOR como padrão
          }));
        }
      }
      return [];
    }

    return originalCriteria.map((criterion) => ({
      id: criterion.id,
      nome: criterion.nome || criterion.name,
      name: criterion.nome || criterion.name,
      index: criterion.index || criterion.id,
      sentido_melhor: criterion.sentido_melhor || 'MENOR',
    }));
  }, [originalCriteria, originalResultsBySector]);

  // Transformar os resultados para o formato esperado pelos componentes
  const resultsBySector = useMemo(() => {
    if (
      !originalResultsBySector ||
      Object.keys(originalResultsBySector).length === 0
    ) {
      return {};
    }

    // Mapear a estrutura original para a estrutura esperada
    const transformedResults = {};

    Object.entries(originalResultsBySector).forEach(
      ([sectorId, sectorData]) => {
        if (!sectorData || !sectorData.criterios) return;

        // Mapear criterios para criteriaResults
        const criteriaResults = {};

        Object.entries(sectorData.criterios).forEach(
          ([criterioId, criterioData]) => {
            criteriaResults[criterioId] = {
              valorRealizado: criterioData.valorRealizado,
              valorMeta: criterioData.valorMeta,
              percentualAtingimento: criterioData.percentualAtingimento,
              pontos: criterioData.pontos,
            };
          }
        );

        transformedResults[sectorId] = {
          setorNome: sectorData.setorNome,
          criteriaResults: criteriaResults,
        };
      }
    );

    console.log('🔍 Resultados transformados:', transformedResults);
    return transformedResults;
  }, [originalResultsBySector]);

  // Calcular ranking baseado na soma dos pontos
  const rankingData = useMemo(() => {
    if (
      !originalResultsBySector ||
      Object.keys(originalResultsBySector).length === 0
    ) {
      return [];
    }

    const rankingEntries = Object.entries(originalResultsBySector)
      .map(([sectorId, sectorData]) => {
        // Calcular pontuação total somando os pontos de todos os critérios
        const totalPoints = Object.values(sectorData.criterios || {}).reduce(
          (sum, criterio) => sum + (criterio.pontos || 0),
          0
        );

        console.log(
          '🔍 Pontuação calculada para setor:',
          sectorData.setorNome,
          totalPoints
        );

        return {
          SETOR: sectorData.setorNome,
          PONTUACAO: totalPoints,
          RANK: 0, // Será preenchido após a ordenação
        };
      })
      .sort((a, b) => a.PONTUACAO - b.PONTUACAO); // Ordenar por pontuação (menor é melhor)

    // Atribuir posições (RANK)
    rankingEntries.forEach((entry, index) => {
      entry.RANK = index + 1;
    });

    console.log('🔍 Ranking calculado:', rankingEntries);
    return rankingEntries;
  }, [originalResultsBySector]);

  // Usar os mesmos critérios como critérios ativos
  const activeCriteria = uniqueCriteria;

  console.log('🔍 Estado final do hook:');
  console.log('🔍 isLoading:', isLoading);
  console.log('🔍 error:', error);
  console.log('🔍 rankingData.length:', rankingData?.length || 0);
  console.log('🔍 uniqueCriteria.length:', uniqueCriteria?.length || 0);
  console.log(
    '🔍 resultsBySector keys:',
    Object.keys(resultsBySector || {}).length
  );

  return {
    rankingData,
    resultsBySector,
    uniqueCriteria,
    activeCriteria,
    isLoading,
    error,
    activePeriod,
  };
}
