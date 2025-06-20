// apps/web/src/app/page.tsx (COM FILTROS REPOSICIONADOS)
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
        {/* Exibição de Erro Geral */}
        {error && (
          <p className='text-red-500 text-center font-semibold w-full'>
            Erro ao carregar dados:
            {error instanceof Error ? error.message : 'Erro desconhecido'}
          </p>
        )}

        {/* --- LINHA 1: Contém as duas primeiras colunas --- */}
        <div className='flex flex-col lg:flex-row gap-6'>
          {/* COLUNA 1.1 (Ranking) */}
          {/* <div className='lg:w-[400px] flex-shrink-0'>
            <section>
              <div className='mb-2'>
                <h2 className='text-2xl font-semibold my-1'>
                  🏆 Ranking Atual
                </h2>
                <p className='text-sm text-gray-600 dark:text-gray-400 italic'>
                  Atualizado em: {getDataAtual()}
                </p>
              </div>
              <p className='text-sm text-gray-600 dark:text-gray-400 italic mb-3'>
                Menor pontuação = Melhor posição.
              </p>
              <RankingTable
                data={rankingData}
                isLoading={isLoading}
                error={error}
              />
            </section>
          </div> */}

          {/* COLUNA 1.2 (Desempenho vs Meta) */}
          <div className='flex-1 min-w-0'>
            <section>
              {/* Cabeçalho da Seção com Título à esquerda e Filtros à direita */}
              <div className='flex justify-between items-center mb-3'>
                <h2 className='text-2xl font-semibold'>
                  📈 Desempenho vs Meta
                </h2>
                {/* Filtros agora estão aqui */}
                <FilterControls />
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

        {/* --- LINHA 2: Seção de largura total para a tabela de pontos --- */}
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
