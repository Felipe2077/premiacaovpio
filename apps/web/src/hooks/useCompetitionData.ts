// Arquivo: src/hooks/useCompetitionData.ts (VERSÃO ATUALIZADA)

import { useDashboardData } from '@/hooks/useDashboardData'; // ALTERADO
import { EntradaRanking } from '@sistema-premiacao/shared-types';
import { useMemo } from 'react';

export function useCompetitionData() {
  const {
    periods,
    activePeriod,
    setActivePeriod,
    uniqueCriteria: originalCriteria,
    resultsBySector: originalResultsBySector,
    isLoading,
    error,
  } = useDashboardData(); // ALTERADO

  const uniqueCriteria = useMemo(() => {
    if (originalCriteria && originalCriteria.length > 0) {
      return originalCriteria.map((criterion) => ({
        id: criterion.id,
        nome: criterion.nome || (criterion as any).name,
        name: criterion.nome || (criterion as any).name,
        index: criterion.index || criterion.id,
        sentido_melhor: (criterion as any).sentido_melhor || 'MENOR',
      }));
    }

    if (
      originalResultsBySector &&
      Object.keys(originalResultsBySector).length > 0
    ) {
      const firstSectorKey = Object.keys(originalResultsBySector)[0];
      const firstSector = originalResultsBySector[firstSectorKey];

      if (firstSector && firstSector.criterios) {
        const criteriaSet = new Map();
        Object.values(originalResultsBySector).forEach((sector: any) => {
          if (sector && sector.criterios) {
            Object.values(sector.criterios).forEach((criterio: any) => {
              if (!criteriaSet.has(criterio.criterioId)) {
                criteriaSet.set(criterio.criterioId, {
                  id: criterio.criterioId,
                  nome: criterio.criterioNome,
                  name: criterio.criterioNome,
                  index: criterio.criterioId,
                  sentido_melhor: 'MENOR',
                });
              }
            });
          }
        });
        return Array.from(criteriaSet.values());
      }
    }
    return [];
  }, [originalCriteria, originalResultsBySector]);

  const resultsBySector = useMemo(() => {
    if (
      !originalResultsBySector ||
      Object.keys(originalResultsBySector).length === 0
    ) {
      return {};
    }

    const transformedResults: Record<string, any> = {};

    Object.entries(originalResultsBySector).forEach(
      ([sectorId, sectorData]: [string, any]) => {
        if (!sectorData || !sectorData.criterios) return;

        const criteriaResults: Record<string, any> = {};

        Object.entries(sectorData.criterios).forEach(
          ([criterioId, criterioData]: [string, any]) => {
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

    return transformedResults;
  }, [originalResultsBySector]);

  const rankingData = useMemo(() => {
    if (
      !originalResultsBySector ||
      Object.keys(originalResultsBySector).length === 0
    ) {
      return [];
    }
    const rankingEntries: EntradaRanking[] = Object.values(
      originalResultsBySector as any
    )
      .map((sectorData: any) => {
        const totalPoints = Object.values(sectorData.criterios || {}).reduce(
          (sum: number, criterio: any) => sum + (criterio.pontos || 0),
          0
        );
        return {
          SETOR: sectorData.setorNome,
          PONTUACAO: totalPoints,
          RANK: 0,
        };
      })
      .sort((a, b) => a.PONTUACAO - b.PONTUACAO);

    rankingEntries.forEach((entry, index) => {
      entry.RANK = index + 1;
    });

    return rankingEntries;
  }, [originalResultsBySector]);

  const activeCriteria = uniqueCriteria;

  return {
    rankingData,
    resultsBySector,
    uniqueCriteria,
    activeCriteria,
    isLoading,
    error,
    periods,
    activePeriod,
    setActivePeriod,
  };
}
