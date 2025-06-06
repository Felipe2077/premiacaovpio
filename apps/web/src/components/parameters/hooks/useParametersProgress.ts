import { useMemo } from 'react';

export interface SectorProgress {
  setorNome: string;
  definidas: number;
  total: number;
  percentual: number;
}

export interface ParametersProgressData {
  [setorNome: string]: SectorProgress;
}

// Tipagem baseada na sua estrutura real do ParametersMatrix
interface ResultsBySector {
  [sectorId: string]: {
    setorNome: string;
    criterios: {
      [criterioId: string]: {
        isMetaDefinida: boolean;
        // outros campos de EntradaResultadoDetalhado...
      };
    };
  };
}

interface FullCriterionType {
  id: number;
  nome: string;
  // outros campos...
}

export const useParametersProgress = (
  resultsBySector: ResultsBySector | undefined,
  uniqueCriteria: FullCriterionType[] | undefined
) => {
  const progressData = useMemo(() => {
    if (!resultsBySector || !uniqueCriteria || uniqueCriteria.length === 0) {
      return {};
    }

    const progressBySetor: ParametersProgressData = {};

    // Iterar por cada setor no resultsBySector
    Object.entries(resultsBySector).forEach(([sectorId, sectorData]) => {
      const setorNome = sectorData.setorNome;

      if (!progressBySetor[setorNome]) {
        progressBySetor[setorNome] = {
          setorNome,
          definidas: 0,
          total: uniqueCriteria.length, // Total é sempre o número de critérios
          percentual: 0,
        };
      }

      // Contar quantos critérios têm meta definida neste setor
      if (sectorData.criterios) {
        Object.entries(sectorData.criterios).forEach(
          ([criterioId, cellData]) => {
            if (cellData && cellData.isMetaDefinida) {
              progressBySetor[setorNome].definidas += 1;
            }
          }
        );
      }

      // Calcular percentual
      const setor = progressBySetor[setorNome];
      setor.percentual =
        setor.total > 0 ? (setor.definidas / setor.total) * 100 : 0;
    });

    return progressBySetor;
  }, [resultsBySector, uniqueCriteria]);

  const totalProgress = useMemo(() => {
    const sectors = Object.values(progressData);
    const totalDefinidas = sectors.reduce(
      (sum, setor) => sum + setor.definidas,
      0
    );
    const totalMetas = sectors.reduce((sum, setor) => sum + setor.total, 0);

    return {
      definidas: totalDefinidas,
      total: totalMetas,
      percentual: totalMetas > 0 ? (totalDefinidas / totalMetas) * 100 : 0,
    };
  }, [progressData]);

  return {
    progressData,
    totalProgress,
    isLoading: !resultsBySector || !uniqueCriteria,
  };
};
