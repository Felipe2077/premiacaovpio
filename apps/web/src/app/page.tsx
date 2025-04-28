// apps/web/src/app/page.tsx (VERSÃO REFATORADA COM HOOK)
'use client';

import FilterControls from '@/components/filters/FilterControls';
import { TooltipProvider } from '@/components/ui/tooltip';

import PerformanceTable from '@/components/competition/PerformanceTable';
import PointsTable from '@/components/competition/PointsTable';
import RankingTable from '@/components/competition/RankingTable';
import { useCompetitionData } from '@/hooks/useCompetitionData'; // <-- IMPORTAR HOOK

export default function HomePage() {
  const {
    rankingData,
    // detailedResults, // Não precisamos passar para DetailedResultsTable se ele já está em resultsBySector
    activeCriteria,
    resultsBySector,
    uniqueCriteria,
    isLoading, // Estado de loading combinado
    error, // Estado de erro combinado
  } = useCompetitionData();

  // As funções de formatação e estilo agora estão em lib/utils ou dentro de DetailedResultsTable

  return (
    <TooltipProvider>
      <main className='container mx-auto px-4 lg:px-6 flex flex-col gap-8 flex-1'>
        {/* Exibição de Erro Geral (vindo do hook) */}
        {error && (
          <p className='text-red-500 text-center font-semibold mb-4'>
            Erro ao carregar dados:
            {error instanceof Error ? error.message : 'Erro desconhecido'}
          </p>
        )}

        <section>
          <div className='flex justify-between mt-4 mb-2 items-center'>
            <div>
              <h2 className='text-2xl font-semibold my-1'>🏆 Ranking Atual</h2>
              <p className='text-sm text-gray-600 dark:text-gray-400 italic mb-3'>
                Classificação final baseada na soma dos pontos por critério
                (Menor pontuação = Melhor posição).
              </p>
            </div>

            <FilterControls />
          </div>

          {/* Passa os dados e estados do hook para o componente */}
          <RankingTable
            data={rankingData}
            isLoading={isLoading} // Usa isLoading combinado
            error={error} // Passa o erro combinado (componente pode decidir não mostrar)
          />
        </section>

        {/* --- NOVA SEÇÃO: Desempenho vs Meta --- */}
        <section>
          <h2 className='text-2xl font-semibold mb-3'>📈 Desempenho vs Meta</h2>
          <PerformanceTable
            resultsBySector={resultsBySector}
            uniqueCriteria={uniqueCriteria}
            activeCriteria={activeCriteria} // Passa activeCriteria para a lógica de progresso/cor
            isLoading={isLoading}
            error={error}
          />
        </section>
        {/* --------------------------------------- */}
        {/* Seção Detalhes por Critério */}
        <section>
          <h2 className='text-2xl font-semibold mb-3'>
            📊 Desempenho Detalhado por Critério
          </h2>
          {/* Passa os dados e estados do hook para o componente */}
          <PointsTable
            resultsBySector={resultsBySector}
            uniqueCriteria={uniqueCriteria}
            activeCriteria={activeCriteria} // Passa critérios ativos para lógica de cor
            isLoading={isLoading} // Usa isLoading combinado
            error={error} // Passa erro combinado
          />
        </section>

        {/* Link admin */}
        <div className='mt-10 text-center'></div>
      </main>
    </TooltipProvider>
  );
}
