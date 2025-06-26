// Arquivo: src/app/page.tsx

'use client';

import FilterControls from '@/components/filters/FilterControls';
import { TooltipProvider } from '@/components/ui/tooltip';

import PerformanceTable from '@/components/competition/PerformanceTable';
import PointsTable from '@/components/competition/PointsTable';
import Header from '@/components/home/Header';
import { useCompetitionData } from '@/hooks/useCompetitionData';

export default function HomePage() {
  const {
    rankingData,
    activeCriteria,
    resultsBySector,
    uniqueCriteria,
    isLoading,
    error,
    periods,
    activePeriod,
    setActivePeriod,
  } = useCompetitionData();

  function getDataAtual() {
    const hoje = new Date();
    const dia = String(hoje.getDate()).padStart(2, '0');
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const ano = hoje.getFullYear();
    return `${dia}/${mes}/${ano}`;
  }

  return (
    <TooltipProvider>
      <Header />
      <main className='w-full flex flex-col gap-8 p-4 sm:p-6'>
        {error && (
          <p className='text-red-500 text-center font-semibold w-full'>
            Erro ao carregar dados:
            {error instanceof Error ? error.message : 'Erro desconhecido'}
          </p>
        )}

        <div className='flex flex-col lg:flex-row gap-6'>
          <div className='flex-1 min-w-0'>
            <section>
              <div className='flex justify-between items-center mb-3 flex-wrap gap-4'>
                <h2 className='text-2xl font-semibold'>
                  📈 Desempenho vs Meta
                </h2>
                <FilterControls
                  periods={periods}
                  activePeriod={activePeriod}
                  onPeriodChange={setActivePeriod}
                />
              </div>
              <PerformanceTable
                resultsBySector={resultsBySector}
                uniqueCriteria={uniqueCriteria}
                activeCriteria={activeCriteria}
                isLoading={isLoading}
                error={error}
              />
            </section>
          </div>
        </div>

        <section>
          <h2 className='text-2xl font-semibold mb-3'>
            📊 Desempenho Detalhado por Critério
          </h2>
          <PointsTable
            resultsBySector={resultsBySector}
            uniqueCriteria={uniqueCriteria}
            activeCriteria={activeCriteria}
            isLoading={isLoading}
            error={error}
          />
        </section>
      </main>
    </TooltipProvider>
  );
}
