// apps/web/src/app/page.tsx (Seu Código Base + Refinamentos Visuais)
'use client';

import RankingTable from '@/components/competition/RankingTable';

import { TooltipProvider } from '@/components/ui/tooltip';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link'; // <-- Importar Link que faltava no seu base
import { useMemo } from 'react'; // <-- React importado (boa prática)
// Importar nossos tipos compartilhados
import DetailedResultsTable from '@/components/competition/DetailedResultsTable';
import {
  Criterio,
  EntradaRanking,
  EntradaResultadoDetalhado,
} from '@sistema-premiacao/shared-types';

// --- Funções de Fetch ---

const fetchRankingData = async (): Promise<EntradaRanking[]> => {
  const res = await fetch('http://localhost:3001/api/ranking');
  if (!res.ok) {
    const errorText = await res
      .text()
      .catch(() => 'Erro ao ler corpo da resposta');
    console.error(
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
    console.error(
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

const fetchActiveCriteria = async (): Promise<
  Pick<Criterio, 'id' | 'nome' | 'index'>[]
> => {
  const res = await fetch('http://localhost:3001/api/criteria/active');
  if (!res.ok) {
    const errorText = await res
      .text()
      .catch(() => 'Erro ao ler corpo da resposta');
    console.error(
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
      console.error(
        'Formato inesperado recebido de /api/criteria/active:',
        data
      );
      throw new Error('Resposta inválida da API de critérios.');
    }
    return data;
  } catch (e) {
    throw new Error('Resposta inválida da API de critérios.' + e);
  }
};

// --- Componente da Página ---

export default function HomePage() {
  // Buscar Ranking
  const {
    data: rankingData,
    isLoading: isLoadingRanking,
    error: errorRanking,
  } = useQuery<EntradaRanking[]>({
    // Tipagem explícita
    queryKey: ['rankingData'],
    queryFn: fetchRankingData,
  });

  // Buscar Resultados Detalhados
  const {
    data: detailedResults,
    isLoading: isLoadingDetails,
    error: errorDetails,
  } = useQuery<EntradaResultadoDetalhado[]>({
    // Tipagem explícita
    queryKey: ['detailedResults'],
    queryFn: fetchDetailedResults,
  });

  // **NOVO:** Buscar Critérios Ativos
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

  // --- Processamento/Transformação dos Dados Detalhados --- (Seu código base aqui estava ótimo!)
  interface SimpleSector {
    id: number;
    name: string;
  } // Definindo localmente
  interface CriterionResultMap {
    [criterionId: number]: EntradaResultadoDetalhado | undefined;
  } // Tipo para clareza
  interface SectorData {
    sectorName: string;
    criteriaResults: CriterionResultMap;
  }

  const { resultsBySector, uniqueSectors, uniqueCriteria } = useMemo(() => {
    if (!detailedResults)
      return {
        resultsBySector: {},
        uniqueSectors: [] as SimpleSector[],
        uniqueCriteria: [] as Pick<Criterio, 'id' | 'nome'>[],
      }; // <-- Tipo de retorno ajustado

    const sectorsMap = new Map<number, SimpleSector>();
    const criteriaMap = new Map<number, Pick<Criterio, 'id' | 'nome'>>();
    const sectorsData: Record<number, SectorData> = {};

    detailedResults.forEach((result) => {
      const { setorId, setorNome, criterioId, criterioNome } = result;
      if (!sectorsMap.has(setorId)) {
        sectorsMap.set(setorId, { id: setorId, name: setorNome });
      }
      if (!criteriaMap.has(criterioId)) {
        criteriaMap.set(criterioId, { id: criterioId, name: criterioNome });
      }
      if (!sectorsData[setorId]) {
        sectorsData[setorId] = { sectorName: setorNome, criteriaResults: {} };
      }
      sectorsData[setorId].criteriaResults[criterioId] = result;
    });

    const criteriaArray = Array.from(criteriaMap.values()).sort(
      (a, b) => a.id - b.id
    );
    const sectorsArray = Array.from(sectorsMap.values()).sort(
      (a, b) => a.id - b.id
    );

    // --- GARANTA QUE O RETURN ESTEJA ASSIM ---
    return {
      resultsBySector: sectorsData,
      uniqueSectors: sectorsArray,
      uniqueCriteria: criteriaArray,
    };
    // ----------------------------------------
  }, [detailedResults]);
  // -----------------------------------------------------

  // **NOVO:** Função para definir estilo da célula de pontos (requer activeCriteria)
  const getPointsCellStyle = (
    points: number | null | undefined,
    criterionId: number | null | undefined
  ): string => {
    if (points === null || points === undefined)
      return 'text-gray-400 dark:text-gray-500';
    if (!activeCriteria || criterionId === null || criterionId === undefined)
      return 'text-foreground'; // Usa cor padrão se não puder determinar

    const criterionIndex =
      activeCriteria.find((c) => c.id === criterionId)?.index ?? null;
    const useInvertedScale = criterionIndex === 10 || criterionIndex === 11;
    const baseStyle = 'font-semibold px-2 py-1 rounded text-xs sm:text-sm '; // Ajustado padding/tamanho

    const isBestPoints = useInvertedScale ? points === 2.5 : points === 1.0;
    const isGoodPoints = useInvertedScale ? points === 2.0 : points === 1.5;
    const isBadPoints = useInvertedScale ? points === 1.5 : points === 2.0;
    const isWorstPoints = useInvertedScale ? points === 1.0 : points === 2.5;

    // Usando cores um pouco mais fortes e com dark mode
    if (isBestPoints)
      return (
        baseStyle +
        'bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-300'
      );
    if (isGoodPoints)
      return (
        baseStyle +
        'bg-yellow-100 text-yellow-800 dark:bg-yellow-800/30 dark:text-yellow-300'
      );
    if (isBadPoints)
      return (
        baseStyle +
        'bg-orange-100 text-orange-800 dark:bg-orange-800/30 dark:text-orange-300'
      );
    if (isWorstPoints)
      return (
        baseStyle +
        'bg-red-100 text-red-800 dark:bg-red-800/30 dark:text-red-300'
      );

    return 'text-foreground'; // Fallback para cor padrão do tema
  };
  // --------------------------------------

  // Combina estados de loading e erro (incluindo o dos critérios)
  const isLoading = isLoadingRanking || isLoadingDetails || isLoadingCriteria;
  const error = errorRanking || errorDetails || errorCriteria;

  return (
    <TooltipProvider>
      <main className='mx-auto p-4 lg:p-6 space-y-8'>
        <h1 className='text-3xl font-bold mb-6 text-center'>
          Premiação Filiais - Desempenho
        </h1>

        {/* Exibição de Erro Geral */}
        {error && (
          <p className='text-red-500 text-center font-semibold mb-4'>
            Erro ao carregar dados:
            {error instanceof Error ? error.message : 'Erro desconhecido'}
          </p>
        )}

        {/* Seção Ranking Final */}
        <section>
          <h2 className='text-2xl font-semibold mb-1'>🏆 Ranking Atual</h2>
          <p className='text-sm text-gray-600 dark:text-gray-400 italic mb-3'>
            Classificação final baseada na soma dos pontos por critério (Menor
            pontuação = Melhor posição).
          </p>
          <RankingTable
            data={rankingData}
            isLoading={isLoadingRanking}
            error={errorRanking}
          />
        </section>

        {/* Seção Detalhes por Critério */}
        <section>
          <h2 className='text-2xl font-semibold mb-3'>
            📊 Desempenho Detalhado por Critério
          </h2>
          <DetailedResultsTable
            resultsBySector={resultsBySector}
            uniqueCriteria={uniqueCriteria}
            activeCriteria={activeCriteria} // Passa os critérios ativos para a lógica de cor
            isLoading={isLoadingDetails || isLoadingCriteria} // Passa estado de loading combinado relevante
            error={errorDetails || errorCriteria} // Passa erro combinado relevante
          />
        </section>

        {/* Link admin */}
        <div className='mt-10 text-center'>
          <Link
            href='/admin'
            className='text-sm text-blue-600 dark:text-blue-400 hover:underline'
          >
            Acessar Painel Gerencial (Conceitual)
          </Link>
        </div>
      </main>
    </TooltipProvider>
  );
}
